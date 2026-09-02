import { NextResponse } from 'next/server';
import { 
    getReferralProfileByPhone, 
    getReferralProfileByCode, 
    checkReferrerQualifiedPurchase,
    getReferralConfig 
} from '@/lib/referrals-service';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const phone = searchParams.get('phone');
        const code = searchParams.get('code');

        if (!phone && !code) {
            return NextResponse.json({ exists: false, message: 'Celular o código requerido' }, { status: 400 });
        }

        let profile = null;
        if (code) {
            profile = await getReferralProfileByCode(code);
        } else if (phone) {
            profile = await getReferralProfileByPhone(phone);
        }

        if (!profile) {
            return NextResponse.json({ exists: false, message: 'No encontrado' });
        }

        const config = await getReferralConfig();
        const minSpend = config.minReferrerSpend || 50000;
        const qualification = await checkReferrerQualifiedPurchase(profile.celular, minSpend);

        const enrichedProfile = {
            ...profile,
            hasQualifiedPurchase: qualification.qualified || profile.hasQualifiedPurchase,
            totalPersonalSpent: qualification.totalSpent,
            minReferrerSpend: minSpend
        };

        return NextResponse.json({ 
            exists: true, 
            profile: enrichedProfile,
            isQualified: enrichedProfile.hasQualifiedPurchase,
            minReferrerSpend: minSpend
        });
    } catch (error: any) {
        return NextResponse.json({ exists: false, message: error.message }, { status: 500 });
    }
}
