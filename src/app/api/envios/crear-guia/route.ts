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
        const numeroGuia = preenvio.numeroGuia || preenvio.guia || preenvio.data?.numeroGuia || preenvio.id;

        // Actualizar el pedido en Firestore si existe orderId
        if (orderId) {
            try {
                const db = getAdminDB();
                await db.collection('pedidos').doc(orderId).update({
                    numeroGuia: numeroGuia || 'GUIA-GENERADA',
                    guiaDetalle: preenvio,
                    transportadora: transportadora || 'interrapidisimo',
                    estadoGuia: 'GENERADA',
                    updatedAt: new Date().toISOString(),
                });
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
