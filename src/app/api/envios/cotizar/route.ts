import { NextResponse } from 'next/server';
import { cotizarEnvio } from '@/lib/99envios-service';
import { getAdminDB } from '@/lib/firebase-admin';
import { calcularSubsidioReal, isVeciSoacha } from '@/lib/shipping-zones';

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

        const esLocal = isVeciSoacha(destinoCodigo);
        const subsidioFabrica = calcularSubsidioReal(itemsSizes, totalWeightKg);

        if (esLocal) {
            const auditData = {
                destinoCodigo,
                destinoNombre,
                subtotal,
                totalWeightKg,
                subsidioFabrica,
                cotizacionBruta99: 0,
                fleteCliente: 0,
                esGratis: true,
                esLocal: true,
                transportadora: 'Flota Propia Pajarito',
                dias: '1-2',
                durationMs: Date.now() - startTime,
            };

            await writeAuditLog(auditData);

            return NextResponse.json({
                gratis: true,
                precio: 0,
                cotizacionBruta99: 0,
                subsidioFabrica: 0,
                transportadora: 'Flota Propia Pajarito',
                dias: '1-2',
                esLocal,
                source: 'free_shipping',
                mensaje: '🚚 Entrega gratuita con flota propia.',
            });
        }

        // 1. Cotizar en tiempo real con 99 Envíos API
        let quote99;
        try {
            quote99 = await cotizarEnvio(destinoCodigo, destinoNombre, subtotal, aplicaContrapago, totalWeightKg);
        } catch (err: any) {
            console.warn('[Cotizar] Fallback 99 Envíos API:', err.message);
            quote99 = {
                cheapest: {
                    transportadora: 'interrapidisimo',
                    valor: esLocal ? 12000 : 25000,
                    valor_contrapago: 0,
                    dias: 2,
                },
                all: {},
            };
        }

        const cotizacionBruta99 = quote99.cheapest.valor;
        const valorContrapago = aplicaContrapago ? (quote99.cheapest.valor_contrapago || 0) : 0;
        const costoBrutoTotal = cotizacionBruta99 + valorContrapago;
        
        // 2. Aplicar Fórmula Universal: Flete Cliente = (Flete + Contrapago) - Subsidio Fábrica
        const fleteCliente = Math.max(0, costoBrutoTotal - subsidioFabrica);
        const esGratis = fleteCliente === 0;

        // 3. Trazabilidad & Auditoría en Firestore
        const auditData = {
            destinoCodigo,
            destinoNombre,
            subtotal,
            totalWeightKg,
            subsidioFabrica,
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

        // Escribir log en Firestore (await obligatorio para serverless Vercel)
        await writeAuditLog(auditData);

        return NextResponse.json({
            gratis: esGratis,
            precio: fleteCliente,
            cotizacionBruta99,
            valorContrapago,
            costoBrutoTotal,
            subsidioFabrica,
            transportadora: quote99.cheapest.transportadora,
            dias: quote99.cheapest.dias,
            esLocal,
            source: '99envios',
            mensaje: esGratis
                ? '¡Envío GRATIS asumido por la fábrica!'
                : `Flete de $${fleteCliente.toLocaleString('es-CO')} (${quote99.cheapest.transportadora.toUpperCase()}). Fábrica subsidia $${subsidioFabrica.toLocaleString('es-CO')}.`,
        });
    } catch (e: any) {
        console.error('[Cotizar API] Error:', e);
        return NextResponse.json({ error: e.message || 'Error al cotizar envío' }, { status: 500 });
    }
}
