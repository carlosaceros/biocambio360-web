import { NextResponse } from 'next/server';
import { cotizarEnvio } from '@/lib/99envios-service';
import { getAdminDB } from '@/lib/firebase-admin';
import {
    calcularSubsidioReal,
    isZonaLocal,
    SUBSIDIO_MAX_NACIONAL_COP,
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
            totalWeightKg = 5,
            itemsSizes = [],
        } = body;

        const esLocal = isZonaLocal(destinoCodigo);

        // Subsidio bruto (suma por item, refleja el costo real de la fábrica)
        const subsidioBruto = calcularSubsidioReal(itemsSizes, totalWeightKg);

        // ── ZONA LOCAL → Flota propia Biocambio360, GRATIS ──────────────────────
        if (esLocal) {
            const auditData = {
                destinoCodigo,
                destinoNombre,
                subtotal,
                totalWeightKg,
                subsidioBruto,
                subsidioEfectivo: subsidioBruto,   // absorbe todo el flete
                cotizacionBruta99: 0,
                fleteCliente: 0,
                esGratis: true,
                esLocal: true,
                transportadora: 'Flota Propia Biocambio360',
                dias: '1-2',
                durationMs: Date.now() - startTime,
            };

            await writeAuditLog(auditData);

            return NextResponse.json({
                gratis: true,
                precio: 0,
                cotizacionBruta99: 0,
                subsidioBruto,
                subsidioEfectivo: subsidioBruto,
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
            quote99 = await cotizarEnvio(destinoCodigo, destinoNombre, subtotal, aplicaContrapago, totalWeightKg);
        } catch (err: any) {
            console.warn('[Cotizar] Fallback 99 Envíos API:', err.message);
            quote99 = {
                cheapest: {
                    transportadora: 'interrapidisimo',
                    valor: 25000,
                    valor_contrapago: 0,
                    dias: 3,
                },
                all: {},
            };
        }

        const cotizacionBruta99 = quote99.cheapest.valor;
        const valorContrapago = aplicaContrapago ? (quote99.cheapest.valor_contrapago || 0) : 0;
        const costoBrutoTotal = cotizacionBruta99 + valorContrapago;

        // ── SUBSIDIO NACIONAL ────────────────────────────────────────────────────
        // Regla: el subsidio de fábrica para rutas nacionales tiene un TOPE FIJO
        // de SUBSIDIO_MAX_NACIONAL_COP ($15.000) sin importar el tamaño del pedido.
        // Esto evita que pedidos grandes (17 garrafas = $204.000 subsidio bruto)
        // terminen con flete $0 en ciudades como Bucaramanga o Medellín.
        // La zona local (Bogotá/Soacha) ya queda cubierta con flota propia arriba.
        const subsidioEfectivo = Math.min(subsidioBruto, SUBSIDIO_MAX_NACIONAL_COP);
        const fleteCliente = Math.max(0, costoBrutoTotal - subsidioEfectivo);
        const esGratis = fleteCliente === 0;

        // ── AUDITORÍA ─────────────────────────────────────────────────────────────
        const auditData = {
            destinoCodigo,
            destinoNombre,
            subtotal,
            totalWeightKg,
            subsidioBruto,
            subsidioEfectivo,
            subsidioMaxNacional: SUBSIDIO_MAX_NACIONAL_COP,
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
            transportadora: quote99.cheapest.transportadora,
            dias: quote99.cheapest.dias,
            esLocal,
            source: '99envios',
            mensaje: esGratis
                ? '¡Envío GRATIS asumido por Biocambio360!'
                : `Flete $${fleteCliente.toLocaleString('es-CO')} (${quote99.cheapest.transportadora?.toUpperCase()}). Biocambio360 subsidia $${subsidioEfectivo.toLocaleString('es-CO')}.`,
        });
    } catch (e: any) {
        console.error('[Cotizar API] Error:', e);
        return NextResponse.json({ error: e.message || 'Error al cotizar envío' }, { status: 500 });
    }
}
