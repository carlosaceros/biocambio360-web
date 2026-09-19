import { NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebase-admin';
import { updateOrderStatus } from '@/lib/orders-service';
import { Order, OrderStatus } from '@/types/order';

interface NinetyNineWebhookPayload {
    event?: string;
    eventType?: string;
    tipoEvento?: string;
    guia?: string;
    numeroGuia?: string;
    shippingGuide?: string;
    tracking_number?: string;
    trackingNumber?: string;
    orderId?: string;
    pedidoId?: string;
    referencia?: string;
    reference?: string;
    status?: string;
    estado?: string;
    transportadora?: string;
    carrier?: string;
    fechaEntrega?: string;
    deliveredAt?: string;
    recibidoPor?: string;
    novedad?: string;
    motivo?: string;
    raw?: any;
}

/**
 * Normaliza y extrae los campos clave de la carga útil de 99 Envíos
 */
function extractPayloadData(body: any): NinetyNineWebhookPayload {
    const data = body.data || body.payload || body;

    const guia = data.guia || data.numeroGuia || data.shippingGuide || data.tracking_number || data.trackingNumber || data.guide || body.guia || body.numeroGuia;
    const orderId = data.orderId || data.pedidoId || data.referencia || data.reference || body.orderId || body.reference;
    const status = data.status || data.estado || data.state || body.status || body.estado;
    const event = data.event || data.eventType || data.tipoEvento || body.event || body.eventType;
    const transportadora = data.transportadora || data.carrier || (data.transportadora?.nombre) || body.transportadora;
    const fechaEntrega = data.fechaEntrega || data.deliveredAt || data.fecha || body.fechaEntrega;
    const recibidoPor = data.recibidoPor || data.receptor || data.receivedBy || body.recibidoPor;
    const novedad = data.novedad || data.motivo || data.reason || data.description || body.novedad;

    return {
        guia: guia ? String(guia).trim() : undefined,
        orderId: orderId ? String(orderId).trim() : undefined,
        status: status ? String(status).toLowerCase().trim() : undefined,
        event: event ? String(event).toLowerCase().trim() : undefined,
        transportadora: transportadora ? String(transportadora).trim() : undefined,
        fechaEntrega: fechaEntrega ? String(fechaEntrega).trim() : undefined,
        recibidoPor: recibidoPor ? String(recibidoPor).trim() : undefined,
        novedad: novedad ? String(novedad).trim() : undefined,
        raw: body,
    };
}

/**
 * Endpoint de verificación GET (para validaciones de webhook por parte de 99 Envíos)
 */
export async function GET() {
    return NextResponse.json({
        service: 'Biocambio360 99 Envíos Webhook Listener',
        status: 'active',
        timestamp: new Date().toISOString(),
    });
}

/**
 * Endpoint receptor POST para confirmaciones y cambios de estado de 99 Envíos
 */
export async function POST(request: Request) {
    const startTime = Date.now();

    try {
        let rawBody: any = {};
        try {
            rawBody = await request.json();
        } catch {
            return NextResponse.json({ error: 'Cuerpo JSON inválido' }, { status: 400 });
        }

        const payload = extractPayloadData(rawBody);
        const { guia, orderId, status, event, transportadora, fechaEntrega, recibidoPor, novedad } = payload;

        if (!guia && !orderId) {
            return NextResponse.json(
                { error: 'Faltan identificadores: se requiere guia o orderId en el payload de 99 Envíos' },
                { status: 400 }
            );
        }

        const db = getAdminDB();
        let targetOrderDoc: any = null;
        let matchedOrderId: string = '';

        // 1. Buscar primero por orderId / reference directo
        if (orderId) {
            const docSnap = await db.collection('orders').doc(orderId).get();
            if (docSnap.exists) {
                targetOrderDoc = docSnap;
                matchedOrderId = docSnap.id;
            }
        }

        // 2. Si no se encontró por ID, buscar por guiaTransportadora en Firestore
        if (!targetOrderDoc && guia) {
            const querySnap = await db.collection('orders')
                .where('guiaTransportadora', '==', guia)
                .limit(1)
                .get();

            if (!querySnap.empty) {
                targetOrderDoc = querySnap.docs[0];
                matchedOrderId = targetOrderDoc.id;
            } else {
                // Búsqueda secundaria por shippingGuide si se guardó en otro campo
                const querySnap2 = await db.collection('orders')
                    .where('shippingGuide', '==', guia)
                    .limit(1)
                    .get();

                if (!querySnap2.empty) {
                    targetOrderDoc = querySnap2.docs[0];
                    matchedOrderId = targetOrderDoc.id;
                }
            }
        }

        if (!targetOrderDoc || !matchedOrderId) {
            console.warn(`[99Envios Webhook] Pedido no encontrado para guía '${guia}' o ID '${orderId}'`);
            return NextResponse.json(
                {
                    error: 'Pedido no encontrado',
                    guiaBuscada: guia,
                    orderIdBuscado: orderId,
                },
                { status: 404 }
            );
        }

        const orderData = targetOrderDoc.data() as Order;
        const currentStatus = orderData.status;

        // 3. Blindaje de Flota Propia: Si el pedido es atendido por mensajería propia, no se altera por 99 Envíos
        if (orderData.tipoEnvio === 'flota_propia') {
            return NextResponse.json({
                success: false,
                status: 'ignored',
                orderId: matchedOrderId,
                message: 'El pedido está marcado con Flota Propia de Biocambio360; su entrega se gestiona manualmente por el mensajero asignado.',
            });
        }

        // 4. Evaluar si es un evento de ENTREGA EXITOSA
        const statusStr = (status || '').toLowerCase();
        const eventStr = (event || '').toLowerCase();

        const isDeliveryEvent =
            statusStr === 'entregado' ||
            statusStr === 'delivered' ||
            statusStr === 'entrega_exitosa' ||
            statusStr === 'entregada' ||
            statusStr === 'finalizado' ||
            eventStr.includes('deliver') ||
            eventStr.includes('entregado');

        // Evaluar si es un evento de NOVEDAD / FALLIDO
        const isExceptionEvent =
            statusStr === 'no_entregado' ||
            statusStr === 'novedad' ||
            statusStr === 'fallido' ||
            statusStr === 'failed' ||
            statusStr === 'devuelto' ||
            eventStr.includes('exception') ||
            eventStr.includes('novedad');

        // 5. Procesamiento de Entrega Exitosa
        if (isDeliveryEvent) {
            // Idempotencia: Si ya está entregado, confirmamos sin duplicar
            if (currentStatus === 'entregado') {
                return NextResponse.json({
                    success: true,
                    orderId: matchedOrderId,
                    status: 'entregado',
                    message: 'El pedido ya se encontraba marcado como entregado (operación idempotente).',
                });
            }

            const transNombre = transportadora || orderData.guiaTransportadora || '99 Envíos';
            const fechaTxt = fechaEntrega || new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
            const receptorTxt = recibidoPor ? ` Recibió: ${recibidoPor}.` : '';
            
            const internalNote = `Actualización automática: 99 Envíos confirmó entrega exitosa de la guía ${guia || orderData.guiaTransportadora || 'N/A'}.${receptorTxt} Transportadora: ${transNombre}. Fecha de entrega: ${fechaTxt}`;

            // Ejecutar la actualización de estado oficial
            await updateOrderStatus(
                matchedOrderId,
                'entregado',
                internalNote,
                {
                    email: 'webhook@99envios.app',
                    nombre: 'Sistema (Webhook 99 Envíos)',
                    role: 'sistema',
                }
            );

            // Guardar detalles adicionales en la orden (prueba de entrega si vino del webhook)
            const patchPayload: Record<string, any> = {
                'timelineEntrega99': {
                    guia: guia || orderData.guiaTransportadora || null,
                    transportadora: transNombre,
                    fechaEntrega: fechaTxt,
                    recibidoPor: recibidoPor || null,
                    actualizadoAt: new Date().toISOString(),
                    origen: 'webhook_99envios',
                },
            };

            if (recibidoPor) {
                patchPayload.pruebaEntrega = {
                    recibidoPor,
                    fecha: new Date().toISOString(),
                    origen: '99envios',
                };
            }

            if (guia && !orderData.guiaTransportadora) {
                patchPayload.guiaTransportadora = guia;
            }

            await db.collection('orders').doc(matchedOrderId).set(patchPayload, { merge: true });

            console.log(`[99Envios Webhook] Pedido #${matchedOrderId} actualizado automáticamente a 'entregado'`);

            return NextResponse.json({
                success: true,
                orderId: matchedOrderId,
                previousStatus: currentStatus,
                newStatus: 'entregado',
                guia: guia || orderData.guiaTransportadora,
                message: 'Estado actualizado automáticamente a entregado por confirmación exitosa de 99 Envíos.',
                durationMs: Date.now() - startTime,
            });
        }

        // 6. Procesamiento de Novedad de Entrega
        if (isExceptionEvent) {
            const noteText = `Novedad reportada por 99 Envíos para la guía ${guia || 'N/A'}: ${novedad || statusStr}`;
            
            if (currentStatus !== 'no_entregado') {
                await updateOrderStatus(
                    matchedOrderId,
                    'no_entregado',
                    noteText,
                    {
                        email: 'webhook@99envios.app',
                        nombre: 'Sistema (Webhook 99 Envíos)',
                        role: 'sistema',
                    }
                );
            }

            return NextResponse.json({
                success: true,
                orderId: matchedOrderId,
                previousStatus: currentStatus,
                newStatus: 'no_entregado',
                message: 'Novedad registrada automáticamente desde 99 Envíos.',
            });
        }

        // 7. Otros eventos informativos (en camino, recogida, etc.)
        return NextResponse.json({
            success: true,
            orderId: matchedOrderId,
            currentStatus,
            message: `Evento '${status || event || 'desconocido'}' recibido pero no requiere transición final a entregado.`,
        });

    } catch (err: any) {
        console.error('[99Envios Webhook] Error no controlado:', err);
        return NextResponse.json(
            { error: 'Error interno del webhook', details: err?.message || String(err) },
            { status: 500 }
        );
    }
}
