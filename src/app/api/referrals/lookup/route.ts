import { NextResponse } from 'next/server';
import { getReferralProfileByPhone } from '@/lib/referrals-service';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const phone = searchParams.get('phone');

        if (!phone) {
            return NextResponse.json({ exists: false, message: 'Celular requerido' }, { status: 400 });
        }

        const profile = await getReferralProfileByPhone(phone);

        if (!profile) {
            return NextResponse.json({ exists: false, message: 'No encontrado' });
        }

        return NextResponse.json({ exists: true, profile });
    } catch (error: any) {
        return NextResponse.json({ exists: false, message: error.message }, { status: 500 });
    }
}
