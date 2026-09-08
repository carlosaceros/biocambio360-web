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

        const isWompi = metodoPago === 'wompi';
        const isAddi = metodoPago === 'addi';
        const isOnline = isWompi || isAddi;

        const pushTitle = isAddi
            ? '🟣 Pedido ADDI (Solicitud Iniciada)'
            : isWompi
            ? '🟡 Pedido Wompi (Checkout Iniciado)'
            : '🛒 ¡Nuevo Pedido Contraentrega!';

        const pushBody = isAddi
            ? `${customerName} · ${formattedTotal} (Pendiente de validación en Addi)`
            : isWompi
            ? `${customerName} · ${formattedTotal} (Pendiente de confirmación de pasarela)`
            : `${customerName} · ${formattedTotal} (Pago en efectivo al entregar)`;

        // 1. Push notification to admin (fire and forget)
        sendAdminPushNotification({
            title: pushTitle,
            body: pushBody,
            data: { orderId, type: isOnline ? 'payment_pending' : 'new_order' },
        }).catch(e => console.warn('[FCM] Push failed (non-fatal):', e));

        const displayPaymentMethod = isAddi
            ? 'ADDI - Pago a Cuotas (0% Interés)'
            : isWompi
            ? 'Tarjeta / Wompi'
            : 'Pago Contraentrega (Efectivo/Nequi)';

        // 2. Email confirmation to customer
        if (customerEmail) {
            try {
                await sendOrderConfirmationEmail({
                    orderId,
                    customerName,
                    customerEmail,
                    total,
                    items: productos || items || [],
                    metodoPago: displayPaymentMethod,
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
                metodoPago: displayPaymentMethod,
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
