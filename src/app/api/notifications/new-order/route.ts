import { NextResponse } from 'next/server';
import { sendAdminPushNotification } from '@/lib/fcm-service';
import { sendOrderConfirmationEmail, sendNewOrderAdminEmail } from '@/lib/email-service';

/**
 * POST /api/notifications/new-order
 * Called from the checkout client-side after any order is created.
 * Sends:
 *  - Browser push notification to admin
 *  - Email confirmation to customer (if email provided)
 *  - Email alert to admin
 */
export async function POST(request: Request) {
    try {
        const {
            orderId,
            customerName,
            customerEmail,
            telefono,
            total,
            metodoPago,
            ciudad,
            direccion,
            productos,
            items,
            subtotal,
            envio,
        } = await request.json();

        if (!orderId || !customerName) {
            return NextResponse.json({ error: 'orderId and customerName are required' }, { status: 400 });
        }

        const formattedTotal = total?.toLocaleString('es-CO', {
            style: 'currency', currency: 'COP', maximumFractionDigits: 0
        }) || '';

        const isOnline = metodoPago === 'wompi';

        // 1. Push notification to admin (fire and forget)
        sendAdminPushNotification({
            title: isOnline ? '🟡 Pedido Wompi (Checkout Iniciado)' : '🛒 ¡Nuevo Pedido Contraentrega!',
            body: isOnline
                ? `${customerName} · ${formattedTotal} (Pendiente de confirmación de pasarela)`
                : `${customerName} · ${formattedTotal} (Pago en efectivo al entregar)`,
            data: { orderId, type: isOnline ? 'payment_pending' : 'new_order' },
        }).catch(e => console.warn('[FCM] Push failed (non-fatal):', e));

        // 2. Email confirmation to customer
        if (customerEmail) {
            try {
                await sendOrderConfirmationEmail({
                    orderId,
                    customerName,
                    customerEmail,
                    total,
                    items: productos || items || [],
                    metodoPago: metodoPago || 'Tarjeta / Wompi',
                    direccionEnvio: {
                        direccion: direccion || 'N/A',
                        ciudad: ciudad || 'N/A',
                    },
                });
            } catch (e) {
                console.warn('[Email] Order confirmation email failed:', e);
            }
        }

        // 3. Admin email alert
        try {
            await sendNewOrderAdminEmail({
                orderId,
                customerName,
                total,
                metodoPago,
                ciudad,
                customerEmail,
                telefono,
                direccion,
            });
        } catch (e) {
            console.warn('[Email] Admin alert email failed:', e);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Notifications] Error in new-order handler:', error);
        return NextResponse.json({ success: true, warning: 'Notifications failed, order still created' });
    }
}
