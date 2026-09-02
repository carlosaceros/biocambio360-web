import { NextResponse } from 'next/server';
import { redeemReferralBalanceToCoupon } from '@/lib/referrals-service';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { phone, amount } = body;

        if (!phone || !amount || amount <= 0) {
            return NextResponse.json({ success: false, message: 'Celular y monto válido requeridos' }, { status: 400 });
        }

        const result = await redeemReferralBalanceToCoupon(phone, Number(amount));

        if (!result.success) {
            return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
