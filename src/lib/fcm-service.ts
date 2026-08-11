import { getAdminMessaging, getAdminDB } from './firebase-admin';

const ADMIN_TOKENS_COLLECTION = 'admin-fcm-tokens';

/**
 * Send a push notification to all registered admin FCM tokens.
 * Non-fatal: if it fails, logs the error but doesn't throw.
 */
export async function sendAdminPushNotification({
    title,
    body,
    data = {},
}: {
    title: string;
    body: string;
    data?: Record<string, string>;
}): Promise<void> {
    try {
        const db = getAdminDB();
        const messaging = getAdminMessaging();

        // Fetch all registered admin tokens
        const tokensSnapshot = await db.collection(ADMIN_TOKENS_COLLECTION).get();

        if (tokensSnapshot.empty) {
            console.log('[FCM] No admin tokens registered. Skipping push notification.');
            return;
        }

        const tokens: string[] = [];
        tokensSnapshot.docs.forEach((docSnap) => {
            const token = docSnap.data().token;
            if (token) tokens.push(token as string);
        });

        if (tokens.length === 0) return;

        // Send to all admin tokens in one multicast call
        const response = await messaging.sendEachForMulticast({
            tokens,
            notification: { title, body },
            data,
            webpush: {
                notification: {
                    title,
                    body,
                    icon: 'https://www.biocambio360.com/icon.png',
                    badge: 'https://www.biocambio360.com/icon.png',
                    requireInteraction: true,
                },
                fcmOptions: {
                    link: 'https://www.biocambio360.com/admin/pedidos',
                },
            },
        });

        console.log(`[FCM] Push sent: ${response.successCount} success, ${response.failureCount} failed`);

        // Clean up invalid/expired tokens
        const invalidTokens: string[] = [];
        response.responses.forEach((res, idx) => {
            if (!res.success) {
                const errCode = res.error?.code;
                if (
                    errCode === 'messaging/invalid-registration-token' ||
                    errCode === 'messaging/registration-token-not-registered'
                ) {
                    invalidTokens.push(tokens[idx]);
                }
            }
        });

        if (invalidTokens.length > 0) {
            const batch = db.batch();
            const staleSnapshot = await db
                .collection(ADMIN_TOKENS_COLLECTION)
                .where('token', 'in', invalidTokens)
                .get();
            staleSnapshot.docs.forEach((d) => batch.delete(d.ref));
            await batch.commit();
            console.log(`[FCM] Cleaned up ${invalidTokens.length} stale tokens`);
        }
    } catch (error) {
        console.error('[FCM] Error sending push notification:', error);
        // Non-fatal: don't throw
    }
}
