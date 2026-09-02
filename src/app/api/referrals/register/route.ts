import { NextResponse } from 'next/server';
import { getOrCreateReferralProfile } from '@/lib/referrals-service';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { nombre, celular, cedula, ciudad, email } = body;

        if (!nombre || !celular) {
            return NextResponse.json({ success: false, message: 'Nombre y celular son requeridos' }, { status: 400 });
        }

        const profile = await getOrCreateReferralProfile({
            nombre,
            celular,
            cedula: cedula || '000000',
            ciudad: ciudad || 'Colombia',
            email
        });

        return NextResponse.json({ success: true, profile });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
