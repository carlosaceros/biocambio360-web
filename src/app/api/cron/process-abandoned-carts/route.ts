/**
 * Cron (every 15 min): abandoned-cart reminders.
 *   step 1 → 2 h, step 2 → 8 h, step 3 → 24 h after the customer's last activity on the cart.
 * Every step goes out by email (if the cart has one); steps configured in
 * bot_config/abandoned_cart.whatsappSteps also go out by WhatsApp (template) when enabled.
 * Carts whose customer already ordered after creating the cart are marked recovered, never messaged.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDB } from '@/lib/firebase-admin';
import { sendContact1Email, sendContact2Email, sendContact3Email } from '@/lib/abandoned-cart-emails';
import { sendCartWhatsapp } from '@/lib/abandoned-cart-whatsapp';
import { CART_STEP_HOURS, CART_STEP_GRACE_HOURS, dueStep, loadCartConfig, toMs, toWhatsappId } from '@/lib/abandoned-cart-config';
import type { AbandonedCartRecord } from '@/lib/abandoned-cart-service';

type Db = FirebaseFirestore.Firestore;

/** An order placed by the same customer AFTER the cart was created (old orders do not count). */
async function findOrderAfterCart(db: Db, cart: AbandonedCartRecord, createdMs: number): Promise<{ id: string; status?: string } | null> {
    const email = (cart.customerEmail || '').trim();
    const digits = (cart.customerPhone || '').replace(/\D/g, '').slice(-10);
    const queries: Array<Promise<FirebaseFirestore.QuerySnapshot>> = [];
    if (email) {
        const variants = [...new Set([email, email.toLowerCase()])];
        queries.push(db.collection('orders').where('cliente.email', 'in', variants).limit(20).get());
    }
    if (digits.length === 10) {
        queries.push(db.collection('orders').where('cliente.celular', 'in', [digits, `57${digits}`, `+57${digits}`]).limit(20).get());
    }
    const results = await Promise.all(queries);
    for (const snap of results) {
        for (const d of snap.docs) {
            const created = toMs(d.data().createdAt);
            if (created >= createdMs - 10 * 60 * 1000) return { id: d.id, status: d.data().status };
        }
    }
    return null;
}

export async function GET(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = (req.headers.get('user-agent') ?? '').startsWith('vercel-cron');
    const hasSecret = !!cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`;
    if (!isVercelCron && !hasSecret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const db = getAdminDB();
        const cfg = await loadCartConfig();
        const now = Date.now();
        const oldest = CART_STEP_HOURS[CART_STEP_HOURS.length - 1] + CART_STEP_GRACE_HOURS + 1;
        // Only carts touched recently can still have a reminder due: keeps every run cheap
        const snap = await db.collection('abandoned_carts').where('updatedAt', '>=', new Date(now - oldest * 3600 * 1000)).get();

        const stats = { checked: snap.size, recovered: 0, emails: 0, whatsapps: 0, failed: 0 };

        for (const docSnap of snap.docs) {
            const cart = docSnap.data() as AbandonedCartRecord;
            if (cart.status !== 'abandoned') continue;

            const lastActivity = toMs(cart.updatedAt) || toMs(cart.createdAt);
            const step = dueStep((now - lastActivity) / 3600000, cart.notificationCount || 0);
            if (!step) continue;

            const order = await findOrderAfterCart(db, cart, toMs(cart.createdAt) || lastActivity);
            if (order) {
                await docSnap.ref.update({
                    status: 'recovered',
                    recoveredOrderId: order.id,
                    recoveredNote: `Pedido #${order.id} completado (${order.status ?? 'sin estado'})`,
                });
                stats.recovered++;
                continue;
            }

            // Templates go out in order (1, 2, 3): a customer who missed earlier steps starts with the first one
            const tpl = Math.min(step, (cart.notificationCount || 0) + 1);
            const sent: Record<string, unknown> = {};
            const stamp = new Date().toISOString();

            if (cfg.emailEnabled && cart.customerEmail) {
                try {
                    await [sendContact1Email, sendContact2Email, sendContact3Email][tpl - 1](cart);
                    sent[`sent.email_${tpl}`] = { at: stamp, ok: true };
                    stats.emails++;
                } catch (err) {
                    sent[`sent.email_${tpl}`] = { at: stamp, ok: false, error: String(err instanceof Error ? err.message : err).slice(0, 200) };
                    stats.failed++;
                }
            }

            if (cfg.whatsappEnabled && cfg.whatsappSteps.includes(tpl) && toWhatsappId(cart.customerPhone)) {
                const result = await sendCartWhatsapp(cart, tpl, cfg.whatsappTemplate);
                sent[`sent.wa_${tpl}`] = result.ok
                    ? { at: stamp, ok: true }
                    : { at: stamp, ok: false, ...(result.skipped ? { skipped: result.skipped } : {}), ...(result.error ? { error: result.error } : {}) };
                if (result.ok) stats.whatsapps++;
                else if (result.error) stats.failed++;
            }

            // Progress even when nothing was sendable, so the step is never retried in a loop.
            // updatedAt is NOT touched: it is the customer's last activity.
            await docSnap.ref.update({ notificationCount: step, lastNotifiedAt: FieldValue.serverTimestamp(), ...sent });
        }

        console.log('[cron/abandoned-carts]', JSON.stringify(stats));
        return NextResponse.json({ status: 'ok', ...stats });
    } catch (err) {
        console.error('[cron/abandoned-carts] Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
