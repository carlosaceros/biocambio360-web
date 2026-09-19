import { NextResponse } from 'next/server';
import { sendOrderStatusCustomerEmail, sendOrderStatusUpdateEmailToAdmin } from '@/lib/email-service';
import { OrderStatus } from '@/types/order';

/**
 * POST /api/notifications/order-status
 * Endpoint seguro para disparar correos de actualización de estado y tracking de transportadoras
 * sin importar nodemailer en los bundles de componentes de cliente.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            orderId,
            cliente,
            customerEmail,
            estadoAnterior,
            nuevoEstado,
            total,
            shippingCarrier,
            trackingNumber,
            items
        } = body;

        if (!orderId || !nuevoEstado) {
            return NextResponse.json({ error: 'Faltan parámetros requeridos (orderId, nuevoEstado)' }, { status: 400 });
        }

        // 1. Notificar al cliente si tiene correo y no es borrador
        if (customerEmail && nuevoEstado !== 'borrador') {
            await sendOrderStatusCustomerEmail({
                orderId,
                customerName: cliente || 'Estimado(a) Cliente',
                customerEmail,
                status: nuevoEstado as OrderStatus,
                total: Number(total) || 0,
                shippingCarrier,
                trackingNumber,
                items
            }).catch(err => console.warn('[API/OrderStatus] Error enviando email al cliente:', err));
        }

        // 2. Notificar a administradores del cambio de estado
        await sendOrderStatusUpdateEmailToAdmin({
            orderId,
            cliente: cliente || 'Cliente',
            estadoAnterior: estadoAnterior || 'previo',
            nuevoEstado,
            total: Number(total) || 0
        }).catch(err => console.warn('[API/OrderStatus] Error enviando email a admins:', err));

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[API/OrderStatus] Error en endpoint de notificación:', error);
        return NextResponse.json({ success: false, error: error?.message || 'Error al enviar notificaciones' }, { status: 500 });
    }
}
