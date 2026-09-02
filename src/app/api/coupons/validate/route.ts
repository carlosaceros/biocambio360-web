import { NextResponse } from 'next/server';
import { validateCouponCode } from '@/lib/coupons-service';
import { validateReferralCodeForOrder } from '@/lib/referrals-service';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { code, subtotal, customerEmail, customerPhone } = body;

        if (!code) {
            return NextResponse.json({ valid: false, reason: 'El código de cupón es requerido' }, { status: 400 });
        }

        const subtotalNum = typeof subtotal === 'number' ? subtotal : parseFloat(subtotal) || 0;

        // 1. Intentar validar primero como cupón tradicional
        const couponResult = await validateCouponCode(code, subtotalNum, customerEmail, customerPhone);

        if (couponResult.valid) {
            return NextResponse.json(couponResult);
        }

        // 2. Si no es cupón regular, verificar si es un código de embajador/referido
        const refResult = await validateReferralCodeForOrder(
            code,
            { celular: customerPhone || '', email: customerEmail },
            subtotalNum
        );

        if (refResult.valid && refResult.profile) {
            const appliedCoupon = {
                code: refResult.profile.code,
                type: 'fixed_amount' as const,
                value: refResult.discountAmount,
                discountAmount: refResult.discountAmount,
                message: refResult.message
            };

            return NextResponse.json({
                valid: true,
                coupon: {
                    id: `ref_${refResult.profile.id}`,
                    code: refResult.profile.code,
                    type: 'fixed_amount',
                    value: refResult.discountAmount,
                    minSubtotal: 0,
                    isActive: true
                },
                discountAmount: refResult.discountAmount,
                appliedCoupon,
                message: refResult.message,
                isReferral: true,
                referrerPhone: refResult.profile.celular
            });
        }

        // Si falló en ambos, devolver el motivo del cupón o del referido
        return NextResponse.json({
            valid: false,
            reason: refResult.message || couponResult.reason || 'El código no es válido.'
        }, { status: 400 });

    } catch (error: any) {
        console.error('Error al validar cupón o referido:', error);
        return NextResponse.json({
            valid: false,
            reason: error.message || 'Error interno al validar el código'
        }, { status: 500 });
    }
}
