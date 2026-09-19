import { NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebase-admin';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { orderId, guiaTransportadora, transportadora, notas, adminUser } = body;

        if (!orderId || !guiaTransportadora) {
            return NextResponse.json(
                { error: 'Se requiere orderId y guiaTransportadora' },
                { status: 400 }
            );
        }

        const cleanGuia = String(guiaTransportadora).trim();
        const carrier = (transportadora || 'interrapidisimo').toLowerCase();
        const db = getAdminDB();

        // 1. Obtener la orden actual
        const orderRef = db.collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();

        if (!orderSnap.exists) {
            return NextResponse.json({ error: 'Pedido no encontrado en Firestore' }, { status: 404 });
        }

        const currentData = orderSnap.data() || {};
        const authorName = adminUser?.nombre || adminUser?.email || 'Gestor Logístico';

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
            text: `Guía vinculada manualmente (${carrier.toUpperCase()} #${cleanGuia}): ${notas || 'Generada directamente en 99 Envíos o portal de la transportadora'}.`,
            createdAt: new Date().toISOString(),
            authorEmail: adminUser?.email || 'logistica@biocambio360.com',
            authorName,
            authorRole: adminUser?.role || 'logistica',
        };

        // 4. Crear evento en timeline
        const newTimelineEvent = {
            status: 'en_camino',
            timestamp: new Date().toISOString(),
            user: authorName,
            note: `Guía ${carrier.toUpperCase()} #${cleanGuia} vinculada manualmente`,
        };

        const existingNotes = Array.isArray(currentData.notasInternas) ? currentData.notasInternas : [];
        const existingTimeline = Array.isArray(currentData.timeline) ? currentData.timeline : [];

        const updateData: any = {
            guiaTransportadora: cleanGuia,
            transportadora: carrier,
            tipoEnvio: '99envios',
            status: 'en_camino',
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
            orderId,
            guiaTransportadora: cleanGuia,
            transportadora: carrier,
            trackingUrl,
            message: `Guía #${cleanGuia} vinculada exitosamente al pedido #${orderId}`,
        });
    } catch (e: any) {
        console.error('[vincular-guia] Error:', e);
        return NextResponse.json({ error: e.message || 'Error al vincular guía' }, { status: 500 });
    }
}
