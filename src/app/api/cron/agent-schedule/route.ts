/** Cron (every 5 min): fires "Activar en este chat" schedules that have reached their time. */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebase-admin';
import { runActivateAgentTurn } from '@/lib/ai-order-agent';

export async function GET(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = (req.headers.get('user-agent') ?? '').startsWith('vercel-cron');
    const hasSecret = !!cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`;
    if (!isVercelCron && !hasSecret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getAdminDB();
    const nowIso = new Date().toISOString();
    const snap = await db.collection('conversations').where('agentScheduledAt', '<=', nowIso).limit(50).get();
    const stats = { due: snap.size, activated: 0, messaged: 0, failed: 0 };

    for (const doc of snap.docs) {
        const conv = doc.data();
        const to = conv.contactPhone || conv.contactUserId;
        try {
            await doc.ref.update({
                agentForced: true,
                agentForcedAt: new Date().toISOString(),
                agentScheduledAt: null,
            });
            stats.activated++;
            if (to && conv.channel === 'whatsapp') {
                const result = await runActivateAgentTurn({ conversationId: doc.id, phoneId: conv.phoneId, contactPhone: to, style: 'checkin' });
                if (result.sent) stats.messaged++;
            }
        } catch (err) {
            stats.failed++;
            console.error(`[cron/agent-schedule] ${doc.id}:`, err instanceof Error ? err.message : err);
        }
    }
    console.log('[cron/agent-schedule]', JSON.stringify(stats));
    return NextResponse.json(stats);
}
