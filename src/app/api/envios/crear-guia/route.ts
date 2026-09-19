import { NextResponse } from 'next/server';
import { crearPreenvio } from '@/lib/99envios-service';
import { getAdminDB } from '@/lib/firebase-admin';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { orderId, transportadora, destinatario, valorDeclarado, valorContrapago, pesoKg, diceContener, observaciones } = body;

        if (!destinatario || !destinatario.nombre || !destinatario.direccion || !destinatario.telefono) {
            return NextResponse.json({ error: 'Faltan datos requeridos del destinatario (nombre, dirección, teléfono)' }, { status: 400 });
        }

        const preenvio = await crearPreenvio({
            destinatario,
            valorDeclarado: valorDeclarado || 80000,
            valorContrapago: valorContrapago || 0,
            transportadora: transportadora || 'interrapidisimo',
            pesoKg: pesoKg || 5,
            diceContener: diceContener || 'Productos de aseo Biocambio360',
            observaciones: observaciones || 'FRÁGIL - LÍQUIDOS',
        });

        // Extraer número de guía generado por 99 Envíos
        const numeroGuia = String(preenvio.numeroGuia || preenvio.guia || preenvio.data?.numeroGuia || preenvio.id || '').trim();

        // Actualizar el pedido en Firestore (colección oficial 'orders')
        if (orderId && numeroGuia) {
            try {
                const db = getAdminDB();
                const trackingUrl = (transportadora || '').toLowerCase().includes('coordinadora')
                    ? `https://coordinadora.com/rastreo/rastreo-de-guia/?guia=${numeroGuia}`
                    : `https://www.interrapidisimo.com/sigue-tu-envio/?guia=${numeroGuia}`;

                const updatePayload: any = {
                    guiaTransportadora: numeroGuia,
                    transportadora: transportadora || 'interrapidisimo',
                    tipoEnvio: '99envios',
                    status: 'en_camino',
                    trackingUrl,
                    guiaDetalle: preenvio,
                    estadoGuia: 'GENERADA',
                    updatedAt: new Date().toISOString(),
                };

                // Actualizar orders
                await db.collection('orders').doc(orderId).set(updatePayload, { merge: true });
                // Compatibilidad pedidos
                await db.collection('pedidos').doc(orderId).set(updatePayload, { merge: true }).catch(() => {});
            } catch (err: any) {
                console.warn('[crear-guia] No se pudo actualizar orden en Firestore:', err.message);
            }
        }

        return NextResponse.json({
            exito: true,
            numeroGuia,
            preenvio,
        });
    } catch (e: any) {
        console.error('[crear-guia] Error:', e);
        return NextResponse.json({ error: e.message || 'Error al generar la guía' }, { status: 500 });
    }
}
