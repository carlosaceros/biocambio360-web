import { NextResponse } from 'next/server';
import { getAbandonedCartByToken } from '@/lib/abandoned-cart-service';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.json({ error: 'Token is required' }, { status: 400 });
        }

        const cart = await getAbandonedCartByToken(token);

        if (!cart) {
            return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
        }

        return NextResponse.json({ cart });
    } catch (err: any) {
        console.error('[API/AbandonedCart/Recover] Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
