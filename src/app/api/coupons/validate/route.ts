import { NextResponse } from 'next/server';
import { validateCouponCode } from '@/lib/coupons-service';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { code, subtotal, customerEmail, customerPhone } = body;

        if (!code) {
            return NextResponse.json({ valid: false, reason: 'El código de cupón es requerido' }, { status: 400 });
        }

        const subtotalNum = typeof subtotal === 'number' ? subtotal : parseFloat(subtotal) || 0;

        const result = await validateCouponCode(code, subtotalNum, customerEmail, customerPhone);

        if (!result.valid) {
            return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error al validar cupón:', error);
        return NextResponse.json({
            valid: false,
            reason: error.message || 'Error interno al validar el cupón'
        }, { status: 500 });
    }
}
