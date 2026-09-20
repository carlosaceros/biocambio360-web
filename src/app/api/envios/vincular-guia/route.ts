import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
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
        const orderRef = db.collection('orders').doc(orderId);

        // 1. Intento de lectura opcional con tolerancia a agotamiento de cuota Spark
        let currentData: any = {};
        try {
            const orderSnap = await orderRef.get();
            if (orderSnap.exists) {
                currentData = orderSnap.data() || {};
            }
        } catch (readErr: any) {
            console.warn('[vincular-guia] Lectura previa omitida (cuota Spark o error):', readErr.message);
        }

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

        // 3. Crear nueva nota interna y evento de timeline
        const noteId = `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const newInternalNote = {
            id: noteId,
            text: `Guía vinculada (${carrier.toUpperCase()} #${cleanGuia}): ${notas || 'Asignada desde reporte oficial de 99 Envíos'}.`,
            createdAt: new Date().toISOString(),
            authorEmail: adminUser?.email || 'logistica@biocambio360.com',
            authorName,
            authorRole: adminUser?.role || 'logistica',
        };

        const targetStatus = (status === 'entregado' || currentData.status === 'entregado') 
            ? 'entregado' 
            : (status || currentData.status || 'en_camino');

        const newTimelineEvent = {
            status: targetStatus,
            timestamp: new Date().toISOString(),
            user: authorName,
            note: `Guía ${carrier.toUpperCase()} #${cleanGuia} vinculada (${targetStatus})`,
        };

        const updateData: any = {
            guiaTransportadora: cleanGuia,
            numeroGuia: cleanGuia,
            transportadora: carrier,
            tipoEnvio: '99envios',
            status: targetStatus,
            trackingUrl,
            updatedAt: new Date().toISOString(),
        };

        // Si se leyeron notas previas, agregamos al arreglo; de lo contrario usamos FieldValue.arrayUnion atómico
        if (Array.isArray(currentData.notasInternas) && currentData.notasInternas.length > 0) {
            updateData.notasInternas = [...currentData.notasInternas, newInternalNote];
        } else {
            updateData.notasInternas = admin.firestore.FieldValue.arrayUnion(newInternalNote);
        }

        if (Array.isArray(currentData.timeline) && currentData.timeline.length > 0) {
            updateData.timeline = [...currentData.timeline, newTimelineEvent];
        } else {
            updateData.timeline = admin.firestore.FieldValue.arrayUnion(newTimelineEvent);
        }

        // Escritura directa merge (no consume cuota de lectura)
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
