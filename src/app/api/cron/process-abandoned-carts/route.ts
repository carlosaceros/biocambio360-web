import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { 
    sendContact1Email, 
    sendContact2Email, 
    sendContact3Email, 
    AbandonedCartRecord 
} from '@/lib/abandoned-cart-service';

export async function GET(request: Request) {
    try {
        const cartsRef = collection(db, 'abandoned_carts');
        const q = query(cartsRef, where('status', '==', 'abandoned'));
        const snap = await getDocs(q);

        const now = Date.now();
        let processedCount = 0;

        for (const docSnap of snap.docs) {
            const cart = docSnap.data() as AbandonedCartRecord;
            const createdAtMs = cart.createdAt?.toMillis ? cart.createdAt.toMillis() : now;
            const elapsedHours = (now - createdAtMs) / (1000 * 60 * 60);

            let sentNotification = false;
            let nextNotificationCount = cart.notificationCount || 0;

            // Contact 1: 1 hour to 23 hours after abandonment (notificationCount === 0)
            if (elapsedHours >= 1 && elapsedHours < 24 && cart.notificationCount === 0) {
                await sendContact1Email(cart);
                sentNotification = true;
                nextNotificationCount = 1;
            }
            // Contact 2: 24 hours to 47 hours after abandonment (notificationCount === 1)
            else if (elapsedHours >= 24 && elapsedHours < 48 && cart.notificationCount === 1) {
                await sendContact2Email(cart);
                sentNotification = true;
                nextNotificationCount = 2;
            }
            // Contact 3: 48 hours to 72 hours after abandonment (notificationCount === 2)
            else if (elapsedHours >= 48 && cart.notificationCount === 2) {
                await sendContact3Email(cart);
                sentNotification = true;
                nextNotificationCount = 3;
            }

            if (sentNotification) {
                processedCount++;
                await updateDoc(doc(db, 'abandoned_carts', cart.cartToken), {
                    notificationCount: nextNotificationCount,
                    lastNotifiedAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
            }
        }

        return NextResponse.json({ 
            status: 'ok', 
            processedCount, 
            checkedCount: snap.docs.length 
        });
    } catch (err: any) {
        console.error('[API/Cron/AbandonedCarts] Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
