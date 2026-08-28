import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { 
    AbandonedCartRecord 
} from '@/lib/abandoned-cart-service';
import { 
    sendContact1Email, 
    sendContact2Email, 
    sendContact3Email 
} from '@/lib/abandoned-cart-emails';

export async function GET(request: Request) {
    try {
        const cartsRef = collection(db, 'abandoned_carts');
        const q = query(cartsRef, where('status', '==', 'abandoned'));
        const snap = await getDocs(q);

        // Fetch all non-canceled orders to cross-reference and eliminate false positives
        const ordersRef = collection(db, 'orders');
        const ordersSnap = await getDocs(ordersRef);
        const activeOrders = ordersSnap.docs
            .map(d => ({ id: d.id, ...d.data() as any }))
            .filter(o => o.status !== 'cancelado');

        const now = Date.now();
        let processedCount = 0;
        let autoRecoveredCount = 0;

        for (const docSnap of snap.docs) {
            const cart = docSnap.data() as AbandonedCartRecord;

            // 1. Cross-reference with orders: If the customer completed an order, mark as recovered and NEVER email
            const cartEmail = (cart.customerEmail || '').trim().toLowerCase();
            const cartPhoneDigits = (cart.customerPhone || '').replace(/\D/g, '');

            const matchingOrder = activeOrders.find(o => {
                const orderEmail = (o.cliente?.email || '').trim().toLowerCase();
                const orderPhoneDigits = (o.cliente?.celular || o.cliente?.telefono || '').replace(/\D/g, '');
                const emailMatch = cartEmail && orderEmail && cartEmail === orderEmail;
                const phoneMatch = cartPhoneDigits && orderPhoneDigits && (
                    cartPhoneDigits === orderPhoneDigits ||
                    cartPhoneDigits.endsWith(orderPhoneDigits) ||
                    orderPhoneDigits.endsWith(cartPhoneDigits)
                );
                return emailMatch || phoneMatch;
            });

            if (matchingOrder) {
                // Customer completed an order! Mark as recovered immediately
                await updateDoc(doc(db, 'abandoned_carts', cart.cartToken), {
                    status: 'recovered',
                    recoveredOrderId: matchingOrder.id,
                    recoveredNote: `Pedido #${matchingOrder.id} completado con éxito (${matchingOrder.status})`,
                    updatedAt: serverTimestamp(),
                });
                autoRecoveredCount++;
                continue; // Do NOT send recovery email
            }

            // 2. If truly abandoned without order, process sequence
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
            autoRecoveredCount,
            checkedCount: snap.docs.length 
        });
    } catch (err: any) {
        console.error('[API/Cron/AbandonedCarts] Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
