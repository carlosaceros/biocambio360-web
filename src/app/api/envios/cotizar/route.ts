import { NextResponse } from 'next/server';
import { cotizarEnvio } from '@/lib/99envios-service';
import { getAdminDB } from '@/lib/firebase-admin';
import {
    getCartPackagingAnalysis,
    isZonaLocal,
    CartItemQuote,
} from '@/lib/shipping-zones';

const LOGS_COLLECTION = 'shipping_audit_logs';

async function writeAuditLog(log: Record<string, unknown>) {
    try {
        const db = getAdminDB();
        await db.collection(LOGS_COLLECTION).add({
            ...log,
            timestamp: new Date().toISOString(),
        });
    } catch (e: any) {
        console.warn('[Cotizar] No se pudo escribir log de auditoría en Firestore:', e.message);
    }
}

export async function POST(request: Request) {
    const startTime = Date.now();

    try {
        const body = await request.json();
        const {
            destinoCodigo = '11001000',
            destinoNombre = 'BOGOTA D.C.',
            subtotal = 0,
            aplicaContrapago = true,
            totalWeightKg: weightParam,
            items = [],
            itemsSizes = [],
        } = body;

        const esLocal = isZonaLocal(destinoCodigo);

        // Analizar empaque, bultos, pesos reales y subsidio de fábrica
        const rawItems: CartItemQuote[] = (items && items.length > 0) ? items : itemsSizes;
        const analysis = getCartPackagingAnalysis(rawItems);
        const totalWeightKg = analysis.totalWeightKg || weightParam || 5;
        const bultos = analysis.bultos;
        const subsidioBruto = analysis.subsidioBruto;

        // ── ZONA LOCAL → Flota propia Biocambio360, GRATIS ──────────────────────
        if (esLocal) {
            const auditData = {
                destinoCodigo,
                destinoNombre,
                subtotal,
                totalWeightKg,
                bultos,
                subsidioBruto,
                subsidioEfectivo: subsidioBruto,
                cotizacionBruta99: 0,
                fleteCliente: 0,
                esGratis: true,
                esLocal: true,
                transportadora: 'Flota Propia Biocambio360',
                dias: '1-2',
                desgloseSubsidio: analysis.desgloseSubsidio,
                durationMs: Date.now() - startTime,
            };

            await writeAuditLog(auditData);

            return NextResponse.json({
                gratis: true,
                precio: 0,
                cotizacionBruta99: 0,
                subsidioBruto,
                subsidioEfectivo: subsidioBruto,
                totalWeightKg,
                bultos,
                transportadora: 'Flota Propia Biocambio360',
                dias: '1-2',
                esLocal,
                source: 'free_shipping',
                mensaje: '🚚 Entrega gratuita con flota propia Biocambio360.',
            });
        }

        // ── ZONA NACIONAL → 99 Envíos API ────────────────────────────────────────
        let quote99;
        try {
            quote99 = await cotizarEnvio(
                destinoCodigo,
                destinoNombre,
                subtotal,
                aplicaContrapago,
                totalWeightKg,
                analysis.dimensions
            );
        } catch (err: any) {
            console.warn('[Cotizar] Fallback 99 Envíos API:', err.message);
            quote99 = {
                cheapest: {
                    transportadora: 'coordinadora',
                    valor: 35000,
                    valor_contrapago: 3500,
                    dias: 3,
                },
                all: {},
            };
        }

        const cotizacionBruta99 = quote99.cheapest.valor;
        const valorContrapago = aplicaContrapago ? (quote99.cheapest.valor_contrapago || 0) : 0;
        const costoBrutoTotal = cotizacionBruta99 + valorContrapago;

        // ── SUBSIDIO NACIONAL ────────────────────────────────────────────────────
        // El subsidio de fábrica cubre según los productos adquiridos ($12k 20L/10L, $6k 3.8L, $3k 1/2G, $1k 1L).
        // Para rutas nacionales se aplica hasta cubrir el flete bruto total.
        const subsidioEfectivo = Math.min(subsidioBruto, costoBrutoTotal);
        const fleteCliente = Math.max(0, costoBrutoTotal - subsidioEfectivo);
        const esGratis = fleteCliente === 0;

        // ── AUDITORÍA ─────────────────────────────────────────────────────────────
        const auditData = {
            destinoCodigo,
            destinoNombre,
            subtotal,
            totalWeightKg,
            bultos,
            subsidioBruto,
            subsidioEfectivo,
            cotizacionBruta99,
            valorContrapago,
            costoBrutoTotal,
            fleteCliente,
            precioFinal: fleteCliente,
            esGratis,
            esLocal,
            source: '99envios',
            transportadora: quote99.cheapest.transportadora || 'coordinadora',
            dias: quote99.cheapest.dias,
            api99Cotizaciones: quote99.all,
            desgloseSubsidio: analysis.desgloseSubsidio,
            durationMs: Date.now() - startTime,
        };

        await writeAuditLog(auditData);

        return NextResponse.json({
            gratis: esGratis,
            precio: fleteCliente,
            cotizacionBruta99,
            valorContrapago,
            costoBrutoTotal,
            subsidioBruto,
            subsidioEfectivo,
            totalWeightKg,
            bultos,
            transportadora: quote99.cheapest.transportadora,
            dias: quote99.cheapest.dias,
            esLocal,
            source: '99envios',
            mensaje: esGratis
                ? '¡Envío GRATIS asumido por Biocambio360!'
                : `Flete $${fleteCliente.toLocaleString('es-CO')} (${quote99.cheapest.transportadora?.toUpperCase()} · ${bultos} bulto${bultos > 1 ? 's' : ''}). Biocambio360 subsidia $${subsidioEfectivo.toLocaleString('es-CO')}.`,
        });
    } catch (e: any) {
        console.error('[Cotizar API] Error:', e);
        return NextResponse.json({ error: e.message || 'Error al cotizar envío' }, { status: 500 });
    }
}
