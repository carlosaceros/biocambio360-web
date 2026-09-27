/**
 * Cron (every 20 min): "muchas conversaciones mueren en visto" — an elegant, non-pushy follow-up for
 * leads the AI agent was actively working (product + qty/city question, or an ad click) who went
 * silent. Two nudges, both while the WhatsApp 24h free-text window is still open:
 *   1) ~2-6h of silence: a warm, low-pressure check-in that resumes exactly where it was left.
 *   2) ~8-20h of silence: a subtle, honest close (the chat is about to reset) — no fake scarcity.
 * Scoped to real intent (an ad click or an existing pre-order) so it never nudges idle chit-chat.
 * Toggle: bot_config/stall_recovery.enabled (default off until a director turns it on).
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebase-admin';
import { runReactivationTurn } from '@/lib/ai-order-agent';
import { isOptedOut } from '@/lib/wa-optout';
import { toWhatsappId, toMs } from '@/lib/abandoned-cart-config';

const CHECKIN_MIN_MS = 2 * 3600 * 1000;
const CHECKIN_MAX_MS = 20 * 3600 * 1000; // stays well inside the 24h reply window
const FOMO_MIN_MS = 8 * 3600 * 1000;
const FOMO_MAX_MS = 22 * 3600 * 1000;
const INBOUND_WINDOW_MS = 23 * 3600 * 1000; // never send free text once the 24h window is about to close

export async function GET(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = (req.headers.get('user-agent') ?? '').startsWith('vercel-cron');
    const hasSecret = !!cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`;
    if (!isVercelCron && !hasSecret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getAdminDB();
    const config = (await db.collection('bot_config').doc('stall_recovery').get()).data();
    if (config?.enabled !== true) return NextResponse.json({ skipped: 'stall recovery disabled' });

    const now = Date.now();
    // "bot" = the AI agent answered last; a human taking over moves status away from "bot"
    const snap = await db.collection('conversations').where('status', '==', 'bot').limit(400).get();
    const stats = { checked: snap.size, eligible: 0, sent: 0, skipped: 0, failed: 0 };

    for (const doc of snap.docs) {
        const conv = doc.data();
        const to = toWhatsappId(conv.contactPhone) || conv.contactUserId;
        if (!to || conv.channel !== 'whatsapp') continue;

        const silence = now - toMs(conv.lastMessageAt);
        const sinceInbound = now - toMs(conv.lastInboundAt);
        const hasIntent = !!conv.adReferral?.sourceId || (conv.preOrder?.items?.length ?? 0) > 0;
        const estado = conv.preOrder?.estado;
        if (!hasIntent || estado === 'listo' || estado === 'confirmado' || conv.hasPqrs || conv.lastSaleAt || sinceInbound > INBOUND_WINDOW_MS) continue;

        const nudgeCount = Number(conv.nudgeCount ?? 0);
        let style: 'checkin' | 'fomo' | null = null;
        if (nudgeCount === 0 && silence >= CHECKIN_MIN_MS && silence <= CHECKIN_MAX_MS) style = 'checkin';
        else if (nudgeCount === 1 && silence >= FOMO_MIN_MS && silence <= FOMO_MAX_MS) style = 'fomo';
        if (!style) continue;

        stats.eligible++;
        try {
            if (await isOptedOut(to)) {
                stats.skipped++;
                continue;
            }
            const result = await runReactivationTurn({ conversationId: doc.id, phoneId: conv.phoneId, contactPhone: to, style });
            if (result.sent) stats.sent++;
            else stats.skipped++;
        } catch (err) {
            stats.failed++;
            console.error(`[cron/stall-recovery] ${doc.id}:`, err instanceof Error ? err.message : err);
        }
        await new Promise(r => setTimeout(r, 400)); // stay comfortably under the sending rate limit
    }
    console.log('[cron/stall-recovery]', JSON.stringify(stats));
    return NextResponse.json(stats);
}
