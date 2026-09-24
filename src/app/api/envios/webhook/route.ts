import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getAdminDB } from '@/lib/firebase-admin';
import { updateOrderStatus } from '@/lib/orders-service';
import { classifyShippingEvent } from '@/lib/99envios-status';
import { Order } from '@/types/order';

export const dynamic = 'force-dynamic';

interface NinetyNineWebhookPayload {
    guia?: string;
    orderId?: string;
    status?: string;
    event?: string;
    transportadora?: string;
    fechaEntrega?: string;
    recibidoPor?: string;
    novedad?: string;
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
        status: status ? String(status).trim() : undefined,
        event: event ? String(event).trim() : undefined,
        transportadora: transportadora ? String(transportadora).trim() : undefined,
        fechaEntrega: fechaEntrega ? String(fechaEntrega).trim() : undefined,
        recibidoPor: recibidoPor ? String(recibidoPor).trim() : undefined,
        novedad: novedad ? String(novedad).trim() : undefined,
        raw: body,
    };
}

/**
 * Secreto compartido opcional (NINETY_NINE_WEBHOOK_SECRET). Se acepta en `?token=`,
 * en el header `x-webhook-secret` o como `Authorization: Bearer`.
 * Si la variable no está configurada, se permite todo para no romper la integración
 * existente (se deja una advertencia en logs).
 */
function isAuthorized(request: Request): boolean {
    const secret = process.env.NINETY_NINE_WEBHOOK_SECRET;
    if (!secret) {
        console.warn('[99Envios Webhook] NINETY_NINE_WEBHOOK_SECRET no configurado: el endpoint acepta cualquier llamada.');
        return true;
    }
    const url = new URL(request.url);
    const provided =
        url.searchParams.get('token') ||
        request.headers.get('x-webhook-secret') ||
        (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!provided) return false;
    const a = Buffer.from(provided);
    const b = Buffer.from(secret);
    return a.length === b.length && timingSafeEqual(a, b);
}

type Decision = 'entregado' | 'novedad' | 'informativo' | 'ignorado' | 'no_encontrado' | 'rechazado' | 'error';

/** Guarda cada evento recibido para poder auditar qué envía 99 Envíos (nunca rompe el flujo). */
async function logEvent(entry: {
    decision: Decision;
    guia?: string;
    orderId?: string;
    matchedOrderId?: string;
    statusRaw?: string;
    eventRaw?: string;
    previousStatus?: string;
    detail?: string;
    payload?: unknown;
}) {
    try {
        let preview = '';
        try {
            preview = JSON.stringify(entry.payload ?? {}).slice(0, 1500);
        } catch { /* ignore */ }
        await getAdminDB().collection('envios_webhook_events').add({
            receivedAt: new Date().toISOString(),
            decision: entry.decision,
            guia: entry.guia ?? null,
            orderId: entry.orderId ?? null,
            matchedOrderId: entry.matchedOrderId ?? null,
            statusRaw: entry.statusRaw ?? null,
            eventRaw: entry.eventRaw ?? null,
            previousStatus: entry.previousStatus ?? null,
            detail: entry.detail ?? null,
            payload: preview,
        });
    } catch (e) {
        console.warn('[99Envios Webhook] No se pudo registrar el evento:', e);
    }
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
    let rawBody: any = {};

    try {
        if (!isAuthorized(request)) {
            await logEvent({ decision: 'rechazado', detail: 'Token inválido o ausente' });
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        try {
            rawBody = await request.json();
        } catch {
            return NextResponse.json({ error: 'Cuerpo JSON inválido' }, { status: 400 });
        }

        const payload = extractPayloadData(rawBody);
        const { guia, orderId, status, event, transportadora, fechaEntrega, recibidoPor, novedad } = payload;
        const base = { guia, orderId, statusRaw: status, eventRaw: event, payload: rawBody };

        if (!guia && !orderId) {
            await logEvent({ ...base, decision: 'error', detail: 'Sin guía ni orderId' });
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

        // 3. Fallback inteligente: si la guía fue creada manualmente en 99envios.app sin ID de pedido,
        // buscar por celular o cédula del destinatario entre pedidos activos de los últimos 15 días
        if (!targetOrderDoc && guia) {
            const rawDest = rawBody.destinatario || rawBody.Destinatario || rawBody.data?.destinatario || rawBody.data?.Destinatario || {};
            const rawPhone = String(rawDest.telefono || rawDest.celular || rawBody.telefono || rawBody.phone || '').replace(/\D/g, '');
            const rawCedula = String(rawDest.numeroDocumento || rawDest.cedula || rawBody.cedula || '').replace(/\D/g, '');

            if (rawPhone && rawPhone.length >= 7) {
                const phoneSnap = await db.collection('orders')
                    .where('cliente.celular', '==', rawPhone)
                    .limit(5)
                    .get();

                const candidate = phoneSnap.docs.find(d => {
                    const st = d.data()?.status;
                    return st === 'preparacion' || st === 'en_camino' || st === 'confirmado';
                }) || phoneSnap.docs[0];

                if (candidate) {
                    targetOrderDoc = candidate;
                    matchedOrderId = candidate.id;
                    // Auto-vincular la guía al pedido de inmediato
                    await candidate.ref.set({
                        guiaTransportadora: guia,
                        transportadora: transportadora || '99envios',
                        tipoEnvio: '99envios',
                        updatedAt: new Date().toISOString(),
                    }, { merge: true });
                    console.log(`[99Envios Webhook] Guía ${guia} auto-vinculada por celular ${rawPhone} al pedido #${matchedOrderId}`);
                }
            } else if (rawCedula && rawCedula.length >= 6) {
                const cedulaSnap = await db.collection('orders')
                    .where('cliente.cedula', '==', rawCedula)
                    .limit(3)
                    .get();

                const candidate = cedulaSnap.docs.find(d => {
                    const st = d.data()?.status;
                    return st === 'preparacion' || st === 'en_camino' || st === 'confirmado';
                }) || cedulaSnap.docs[0];

                if (candidate) {
                    targetOrderDoc = candidate;
                    matchedOrderId = candidate.id;
                    await candidate.ref.set({
                        guiaTransportadora: guia,
                        transportadora: transportadora || '99envios',
                        tipoEnvio: '99envios',
                        updatedAt: new Date().toISOString(),
                    }, { merge: true });
                    console.log(`[99Envios Webhook] Guía ${guia} auto-vinculada por cédula ${rawCedula} al pedido #${matchedOrderId}`);
                }
            }
        }

        if (!targetOrderDoc || !matchedOrderId) {
            console.warn(`[99Envios Webhook] Pedido no encontrado para guía '${guia}' o ID '${orderId}'`);
            await logEvent({ ...base, decision: 'no_encontrado', detail: 'No hay pedido con esa guía/ID' });
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
        const logBase = { ...base, matchedOrderId, previousStatus: currentStatus };

        // Blindaje de Flota Propia: si el pedido es atendido por mensajería propia, no se altera por 99 Envíos
        if (orderData.tipoEnvio === 'flota_propia') {
            await logEvent({ ...logBase, decision: 'ignorado', detail: 'Pedido de flota propia' });
            return NextResponse.json({
                success: false,
                status: 'ignored',
                orderId: matchedOrderId,
                message: 'El pedido está marcado con Flota Propia de Biocambio360; su entrega se gestiona manualmente por el mensajero asignado.',
            });
        }

        const kind = classifyShippingEvent(status, event);

        // Procesamiento de Entrega Exitosa
        if (kind === 'entregado') {
            // Idempotencia: Si ya está entregado, confirmamos sin duplicar
            if (currentStatus === 'entregado') {
                await logEvent({ ...logBase, decision: 'ignorado', detail: 'Ya estaba entregado' });
                return NextResponse.json({
                    success: true,
                    orderId: matchedOrderId,
                    status: 'entregado',
                    message: 'El pedido ya se encontraba marcado como entregado (operación idempotente).',
                });
            }

            // Un pedido cancelado no debe resucitar como entregado por un evento externo
            if (currentStatus === 'cancelado') {
                await logEvent({ ...logBase, decision: 'ignorado', detail: 'Pedido cancelado: no se marca entregado' });
                return NextResponse.json({
                    success: false,
                    status: 'ignored',
                    orderId: matchedOrderId,
                    message: 'El pedido está cancelado; no se marca como entregado automáticamente.',
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
            await logEvent({ ...logBase, decision: 'entregado', detail: 'Pedido marcado como entregado' });

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

        // Procesamiento de Novedad de Entrega
        if (kind === 'novedad') {
            // Un evento tardío o fuera de orden no debe revertir un pedido ya entregado o cancelado
            if (currentStatus === 'entregado' || currentStatus === 'cancelado') {
                await logEvent({ ...logBase, decision: 'ignorado', detail: `Novedad ignorada: pedido ya está '${currentStatus}'` });
                return NextResponse.json({
                    success: true,
                    orderId: matchedOrderId,
                    currentStatus,
                    message: `Novedad ignorada: el pedido ya está '${currentStatus}'.`,
                });
            }

            const noteText = `Novedad reportada por 99 Envíos para la guía ${guia || 'N/A'}: ${novedad || status || event}`;

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

            await logEvent({ ...logBase, decision: 'novedad', detail: noteText });
            return NextResponse.json({
                success: true,
                orderId: matchedOrderId,
                previousStatus: currentStatus,
                newStatus: 'no_entregado',
                message: 'Novedad registrada automáticamente desde 99 Envíos.',
            });
        }

        // Otros eventos informativos (en camino, recogida, etc.)
        await logEvent({ ...logBase, decision: 'informativo', detail: 'Evento sin transición de estado' });
        return NextResponse.json({
            success: true,
            orderId: matchedOrderId,
            currentStatus,
            message: `Evento '${status || event || 'desconocido'}' recibido pero no requiere transición final a entregado.`,
        });

    } catch (err: any) {
        console.error('[99Envios Webhook] Error no controlado:', err);
        await logEvent({ decision: 'error', detail: err?.message || String(err), payload: rawBody });
        return NextResponse.json(
            { error: 'Error interno del webhook', details: err?.message || String(err) },
            { status: 500 }
        );
    }
}
