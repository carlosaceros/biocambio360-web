import { NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebase-admin';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const rawGuia = body.guiaTransportadora || body.numeroGuia || body.guia;
        const rawCarrier = body.transportadora || body.carrier || 'coordinadora';
        const { orderId, notas, adminUser, user, status } = body;

        if (!orderId || !rawGuia) {
            return NextResponse.json(
                { error: 'Se requiere orderId y numeroGuia / guiaTransportadora' },
                { status: 400 }
            );
        }

        const cleanGuia = String(rawGuia).trim();
        const carrier = String(rawCarrier).toLowerCase();
        const db = getAdminDB();

        // 1. Obtener la orden actual
        const orderRef = db.collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();

        if (!orderSnap.exists) {
            return NextResponse.json({ error: 'Pedido no encontrado en Firestore' }, { status: 404 });
        }

        const currentData = orderSnap.data() || {};
        const authorName = adminUser?.nombre || adminUser?.email || user || 'Gestor Logístico';

        // 2. Construir URL de tracking según la transportadora
        let trackingUrl = '';
        if (carrier.includes('coordinadora')) {
            trackingUrl = `https://coordinadora.com/rastreo/rastreo-de-guia/?guia=${cleanGuia}`;
        } else if (carrier.includes('servientrega')) {
            trackingUrl = `https://www.servientrega.com/wps/portal/rastreo-envio?guia=${cleanGuia}`;
        } else if (carrier.includes('envia')) {
            trackingUrl = `https://envia.co/rastreo?guia=${cleanGuia}`;
        } else {
            trackingUrl = `https://www.interrapidisimo.com/sigue-tu-envio/?guia=${cleanGuia}`;
        }

        // 3. Crear nueva nota interna
        const newInternalNote = {
            id: `note_${Date.now()}`,
            text: `Guía vinculada (${carrier.toUpperCase()} #${cleanGuia}): ${notas || 'Asignada desde reporte oficial o manual'}.`,
            createdAt: new Date().toISOString(),
            authorEmail: adminUser?.email || 'logistica@biocambio360.com',
            authorName,
            authorRole: adminUser?.role || 'logistica',
        };

        // 4. Determinar estado: si ya estaba entregado o si se indica que está entregado, conservarlo
        const targetStatus = (status === 'entregado' || currentData.status === 'entregado') ? 'entregado' : (status || currentData.status || 'en_camino');

        // 5. Crear evento en timeline
        const newTimelineEvent = {
            status: targetStatus,
            timestamp: new Date().toISOString(),
            user: authorName,
            note: `Guía ${carrier.toUpperCase()} #${cleanGuia} vinculada (${targetStatus})`,
        };

        const existingNotes = Array.isArray(currentData.notasInternas) ? currentData.notasInternas : [];
        const existingTimeline = Array.isArray(currentData.timeline) ? currentData.timeline : [];

        const updateData: any = {
            guiaTransportadora: cleanGuia,
            numeroGuia: cleanGuia,
            transportadora: carrier,
            tipoEnvio: '99envios',
            status: targetStatus,
            trackingUrl,
            notasInternas: [...existingNotes, newInternalNote],
            timeline: [...existingTimeline, newTimelineEvent],
            updatedAt: new Date().toISOString(),
        };

        await orderRef.set(updateData, { merge: true });

        // Compatibilidad con colección 'pedidos'
        await db.collection('pedidos').doc(orderId).set(updateData, { merge: true }).catch(() => {});

        return NextResponse.json({
            success: true,
            exito: true,
            orderId,
            guiaTransportadora: cleanGuia,
            numeroGuia: cleanGuia,
            transportadora: carrier,
            trackingUrl,
            status: targetStatus,
            message: `Guía #${cleanGuia} vinculada exitosamente al pedido #${orderId}`,
        });
    } catch (e: any) {
        console.error('[vincular-guia] Error:', e);
        return NextResponse.json({ error: e.message || 'Error al vincular guía' }, { status: 500 });
    }
}
