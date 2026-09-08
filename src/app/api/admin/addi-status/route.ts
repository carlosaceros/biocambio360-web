import { NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebase-admin';
import { rateLimit, getClientIp } from '@/lib/rate-limiter';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const orderId = searchParams.get('orderId');

        if (!orderId) {
            return NextResponse.json({ error: 'Falta orderId' }, { status: 400 });
        }

        // Rate limiting
        const clientIp = getClientIp(request);
        const rl = rateLimit(`addi_status_${clientIp}`, 40, 60 * 1000);
        if (!rl.success) {
            return NextResponse.json(
                { error: 'Demasiadas solicitudes. Por favor espera un momento.' },
                { status: 429, headers: { 'Retry-After': '60' } }
            );
        }

        const db = getAdminDB();
        const orderDoc = await db.collection('orders').doc(orderId).get();

        if (!orderDoc.exists) {
            return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
        }

        const data = orderDoc.data()!;
        const addiStatus = data.addiTransaction?.status || (data.status === 'cancelado' ? 'DECLINED' : data.status === 'confirmado' ? 'APPROVED' : 'PENDING');
        let message = 'Solicitud registrada con método de pago ADDI';

        if (addiStatus === 'APPROVED') {
            const amount = data.addiTransaction?.approvedAmount || data.total || 0;
            message = `Crédito ADDI APROBADO ($${Number(amount).toLocaleString('es-CO')})`;
        } else if (addiStatus === 'DECLINED' || addiStatus === 'REJECTED') {
            message = 'Solicitud DECLINADA o cancelada por el usuario en ADDI';
        } else if (addiStatus === 'PENDING') {
            message = 'Solicitud en trámite en ADDI (Pendiente de validación)';
        }

        return NextResponse.json({
            found: true,
            orderId,
            orderStatus: data.status,
            addiTransaction: data.addiTransaction || null,
            metodoPago: data.metodoPago || 'addi',
            message
        });
    } catch (error: any) {
        console.error('[AddiStatus] Error consultando estado Addi:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
