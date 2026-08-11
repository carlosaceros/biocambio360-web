import { NextResponse } from 'next/server';
import { saveAbandonedCartSession } from '@/lib/abandoned-cart-service';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            cartToken,
            customerEmail,
            customerName,
            customerPhone,
            ciudad,
            direccion,
            items,
            subtotal,
            shippingCost,
            total,
        } = body;

        if (!cartToken || !customerEmail || !items || items.length === 0) {
            return NextResponse.json({ error: 'cartToken, customerEmail, and items are required' }, { status: 400 });
        }

        await saveAbandonedCartSession({
            cartToken,
            customerEmail,
            customerName,
            customerPhone,
            ciudad,
            direccion,
            items,
            subtotal: subtotal || 0,
            shippingCost: shippingCost || 0,
            total: total || 0,
        });

        return NextResponse.json({ status: 'ok', cartToken });
    } catch (err: any) {
        console.error('[API/AbandonedCart/Save] Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
