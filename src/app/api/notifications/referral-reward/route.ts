import { NextResponse } from 'next/server';
import { sendReferralRewardPendingEmail } from '@/lib/email-service';

/**
 * POST /api/notifications/referral-reward
 * Endpoint seguro para disparar el correo de notificación al referidor (presión social de entrega)
 * sin importar nodemailer en los bundles de componentes de cliente.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { referrerEmail, referrerName, friendName, rewardAmount, orderId } = body;

        if (!referrerEmail || !referrerName || !orderId) {
            return NextResponse.json({ error: 'Faltan parámetros requeridos (referrerEmail, referrerName, orderId)' }, { status: 400 });
        }

        await sendReferralRewardPendingEmail({
            referrerEmail,
            referrerName,
            friendName: friendName || 'Un amigo',
            rewardAmount: Number(rewardAmount) || 10000,
            orderId
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[API/ReferralReward] Error enviando email de recompensa pendiente:', error);
        return NextResponse.json({ success: false, error: error?.message || 'Error al enviar email' }, { status: 500 });
    }
}
