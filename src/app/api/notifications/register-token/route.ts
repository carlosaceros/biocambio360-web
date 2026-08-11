import { NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebase-admin';

const ADMIN_TOKENS_COLLECTION = 'admin-fcm-tokens';

/**
 * POST /api/notifications/register-token
 * Saves an FCM token for admin push notifications.
 * Body: { token: string }
 */
export async function POST(request: Request) {
    try {
        const { token } = await request.json();

        if (!token || typeof token !== 'string') {
            return NextResponse.json({ error: 'Token is required' }, { status: 400 });
        }

        // Upsert: use last 20 chars of token as doc id to avoid duplicates for same device
        const db = getAdminDB();
        const tokenRef = db.collection(ADMIN_TOKENS_COLLECTION).doc(token.slice(-20));
        await tokenRef.set({
            token,
            updatedAt: new Date().toISOString(),
        });

        console.log('[FCM] Admin token registered:', token.slice(0, 10) + '...');

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[FCM] Error registering token:', error);
        return NextResponse.json({ error: 'Failed to register token' }, { status: 500 });
    }
}
