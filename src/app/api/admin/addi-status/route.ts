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

        return NextResponse.json({
            found: true,
            orderId,
            orderStatus: data.status,
            addiTransaction: data.addiTransaction || null,
            metodoPago: data.metodoPago
        });
    } catch (error: any) {
        console.error('[AddiStatus] Error consultando estado Addi:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
