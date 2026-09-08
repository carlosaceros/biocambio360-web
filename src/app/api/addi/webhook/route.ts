import { NextResponse } from 'next/server';
import { validateAddiBasicAuth } from '@/lib/addi-service';
import { updateOrderStatus } from '@/lib/orders-service';
import { OrderStatus } from '@/types/order';
import { sendAdminPushNotification } from '@/lib/fcm-service';
import { sendPaymentConfirmedEmail, sendOrderStatusUpdateEmailToAdmin } from '@/lib/email-service';
import { getAdminDB } from '@/lib/firebase-admin';

interface AddiWebhookPayload {
    orderId: string;
    applicationId?: string;
    status: string; // 'APPROVED', 'REJECTED', 'DECLINED', etc.
    approvedAmount?: number;
    currency?: string;
    [key: string]: any;
}

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('authorization');

        // 1. Validar autenticación HTTP Basic
        if (!validateAddiBasicAuth(authHeader)) {
            console.error('[AddiWebhook] Intento no autorizado o credenciales inválidas');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body: AddiWebhookPayload = await request.json();
        const { orderId, applicationId, status, approvedAmount, currency } = body;

        console.log(`[AddiWebhook] Recibido evento Addi para orden ${orderId} con estado ${status}`);

        // 2. Extraer el ID base de la orden si tiene sufijo de intento (-att-...)
        let targetOrderId = orderId;
        if (orderId && orderId.includes('-att-')) {
            targetOrderId = orderId.split('-att-')[0];
        }

        const db = getAdminDB();

        // Si el documento directo no existe, buscar por attemptId
        let resolvedOrderId = targetOrderId;
        let orderDoc = await db.collection('orders').doc(targetOrderId).get();

        if (!orderDoc.exists && orderId) {
            const querySnap = await db.collection('orders')
                .where('addiTransaction.attemptId', '==', orderId)
                .limit(1)
                .get();
            if (!querySnap.empty) {
                resolvedOrderId = querySnap.docs[0].id;
                orderDoc = querySnap.docs[0];
            }
        }

        // 3. Mapear estado de Addi a estado de orden
        let newStatus: OrderStatus | null = null;
        const normalizedStatus = (status || '').toUpperCase();
        let internalNote = `Addi Webhook: Solicitud ${applicationId || ''} - Estado: ${normalizedStatus}`;

        if (normalizedStatus === 'APPROVED') {
            newStatus = 'confirmado';
        } else if (normalizedStatus === 'REJECTED' || normalizedStatus === 'DECLINED') {
            newStatus = 'cancelado';
        }

        // 4. Actualizar estado y guardar detalles en Firestore
        if (resolvedOrderId) {
            try {
                if (newStatus) {
                    await updateOrderStatus(resolvedOrderId, newStatus, internalNote);
                }

                // Guardar detalles completos de la transacción Addi
                await db.collection('orders').doc(resolvedOrderId).set({
                    addiTransaction: {
                        orderId,
                        applicationId: applicationId || null,
                        status: normalizedStatus,
                        approvedAmount: approvedAmount || null,
                        currency: currency || 'COP',
                        updatedAt: new Date().toISOString(),
                        raw: body
                    }
                }, { merge: true });

                console.log(`[AddiWebhook] Orden ${resolvedOrderId} actualizada correctamente a ${newStatus || normalizedStatus}`);

                // 5. Notificar por email y FCM si el crédito fue aprobado
                if (normalizedStatus === 'APPROVED') {
                    const orderData = orderDoc.exists ? orderDoc.data() : null;
                    const amountVal = approvedAmount || orderData?.total || 0;
                    const amountFormatted = Number(amountVal).toLocaleString('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        maximumFractionDigits: 0
                    });

                    // Notificación Push a administradores
                    sendAdminPushNotification({
                        title: '💳 ¡Crédito Addi Aprobado!',
                        body: `Pedido #${resolvedOrderId.slice(-6)} · ${amountFormatted} aprobado a cuotas`,
                        data: { orderId: resolvedOrderId, type: 'payment_confirmed' },
                    }).catch(e => console.warn('[FCM] Push Addi failed:', e));

                    // Email al administrador
                    try {
                        await sendOrderStatusUpdateEmailToAdmin({
                            orderId: resolvedOrderId,
                            cliente: orderData?.cliente?.nombre || 'Cliente Addi',
                            estadoAnterior: 'PENDIENTE',
                            nuevoEstado: 'APROBADO (ADDI)',
                            total: amountVal,
                        });
                    } catch (e) {
                        console.warn('[Email] Admin status notification failed for Addi:', e);
                    }

                    // Email de confirmación al cliente
                    if (orderData?.cliente?.email) {
                        try {
                            await sendPaymentConfirmedEmail({
                                orderId: resolvedOrderId,
                                customerName: orderData.cliente.nombre || 'Cliente',
                                customerEmail: orderData.cliente.email,
                                total: amountVal,
                            });
                        } catch (e) {
                            console.warn('[Email] Customer payment email failed for Addi:', e);
                        }
                    }
                }
            } catch (fsErr) {
                console.error(`[AddiWebhook] Error actualizando Firestore para orden ${resolvedOrderId}:`, fsErr);
            }
        } else {
            console.warn(`[AddiWebhook] No se pudo encontrar orden para orderId ${orderId}`);
        }

        // 6. Addi requiere responder HTTP 200 con el EXACTO mismo JSON recibido en el body
        return NextResponse.json(body, { status: 200 });

    } catch (error) {
        console.error('[AddiWebhook] Error procesando webhook de Addi:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
