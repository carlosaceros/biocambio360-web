import { NextResponse } from 'next/server';
import { cotizarEnvio } from '@/lib/99envios-service';
import { getAdminDB } from '@/lib/firebase-admin';
import {
    getCartPackagingAnalysis,
    isZonaLocal,
    calcularFleteLocal,
    calcularFleteNacional,
    MINIMO_DOMICILIARIO_LOCAL,
    PISO_FLETE_NACIONAL,
    TOPE_SUBSIDIO_NACIONAL,
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

        // ── ZONA LOCAL → Domicilio Bogotá y aledaños (Flota propia / mensajería local) ──
        if (esLocal) {
            const { fleteCliente, esGratis, subsidioFabrica } = calcularFleteLocal(subsidioBruto);

            const mensaje = esGratis
                ? '🚚 ¡Envío GRATIS en Bogotá y aledaños asumido por Biocambio360!'
                : `Domicilio local Bogotá: $${fleteCliente.toLocaleString('es-CO')} COP (Biocambio360 asume $${subsidioFabrica.toLocaleString('es-CO')} del costo mínimo del domiciliario de $13.000).`;

            const auditData = {
                destinoCodigo,
                destinoNombre,
                subtotal,
                totalWeightKg,
                bultos,
                subsidioBruto,
                subsidioEfectivo: subsidioFabrica,
                cotizacionBruta99: MINIMO_DOMICILIARIO_LOCAL,
                fleteCliente,
                precioFinal: fleteCliente,
                esGratis,
                esLocal: true,
                source: esGratis ? 'free_shipping' : 'local_copay',
                transportadora: 'Flota Propia Biocambio360',
                dias: '1-2',
                desgloseSubsidio: analysis.desgloseSubsidio,
                durationMs: Date.now() - startTime,
            };

            await writeAuditLog(auditData);

            return NextResponse.json({
                gratis: esGratis,
                precio: fleteCliente,
                cotizacionBruta99: MINIMO_DOMICILIARIO_LOCAL,
                subsidioBruto,
                subsidioEfectivo: subsidioFabrica,
                totalWeightKg,
                bultos,
                transportadora: 'Flota Propia Biocambio360',
                dias: '1-2',
                esLocal,
                source: esGratis ? 'free_shipping' : 'local_copay',
                mensaje,
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

        // ── SUBSIDIO NACIONAL (PISO $13.000 + TOPE $15.000) ───────────────────────
        // Regla aprobada: Piso mínimo nacional de $13.000 COP y tope de subsidio de fábrica de $15.000 COP.
        const {
            fleteCliente,
            subsidioEfectivo,
            pisoMinimoAplicado,
            topeSubsidioAplicado,
            ahorroCliente,
        } = calcularFleteNacional(costoBrutoTotal, subsidioBruto);
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
            pisoMinimoAplicado,
            topeSubsidioAplicado,
            ahorroCliente,
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
            pisoMinimoAplicado,
            topeSubsidioAplicado,
            ahorroCliente,
            totalWeightKg,
            bultos,
            transportadora: quote99.cheapest.transportadora,
            dias: quote99.cheapest.dias,
            esLocal,
            source: '99envios',
            mensaje: esGratis
                ? '¡Envío GRATIS asumido por Biocambio360!'
                : `Flete $${fleteCliente.toLocaleString('es-CO')} (${quote99.cheapest.transportadora?.toUpperCase()} · ${bultos} bulto${bultos > 1 ? 's' : ''}). Biocambio360 subsidia $${subsidioEfectivo.toLocaleString('es-CO')} de fábrica (Ahorro garantizado).`,
        });
    } catch (e: any) {
        console.error('[Cotizar API] Error:', e);
        return NextResponse.json({ error: e.message || 'Error al cotizar envío' }, { status: 500 });
    }
}
