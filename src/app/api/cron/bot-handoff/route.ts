/**
 * Cron: 6:30 a.m. (America/Bogota) hand-off of the after-hours AI agent.
 * Runs daily (11:30 UTC). For every conversation still in status "bot":
 *  - with a pre-order → auto-assign to a human advisor and tell the customer who takes it
 *  - without a pre-order → just reopen it so the team sees it
 * Idempotent: it only touches conversations whose status is "bot".
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDB } from '@/lib/firebase-admin';
import { autoAssignConversation } from '@/lib/lead-assignment-service';
import { sendTextMessage } from '@/lib/whatsapp-service';
import { AI_AGENT_ID, AI_AGENT_NAME, isAfterHoursNow } from '@/lib/ai-order-agent';

export async function GET(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = (req.headers.get('user-agent') ?? '').startsWith('vercel-cron');
    const hasSecret = !!cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`;
    if (!isVercelCron && !hasSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Never hand off while the agent is still working (e.g. a manual call at 11 p.m.)
    if (isAfterHoursNow() && req.nextUrl.searchParams.get('force') !== '1') {
        return NextResponse.json({ skipped: 'still after hours' });
    }

    const db = getAdminDB();
    const snap = await db.collection('conversations').where('status', '==', 'bot').limit(200).get();

    let assigned = 0;
    let reopened = 0;
    let failed = 0;

    for (const doc of snap.docs) {
        const conv = doc.data();
        try {
            const pre = conv.preOrder ?? {};
            const hasLead =
                (Array.isArray(pre.items) && pre.items.length > 0) || !!pre.horarioContacto || !!conv.hasPqrs;

            if (!hasLead || !conv.contactPhone) {
                await doc.ref.update({ status: 'abierto', updatedAt: FieldValue.serverTimestamp() });
                reopened++;
                continue;
            }

            const result = await autoAssignConversation(doc.id, conv.contactPhone);
            if (!result.assigned) {
                await doc.ref.update({ status: 'abierto', updatedAt: FieldValue.serverTimestamp() });
                reopened++;
                continue;
            }

            assigned++;

            const franja: Record<string, string> = { manana: 'en la mañana', tarde: 'en la tarde', '7-9pm': 'entre 7 y 9 p.m.' };
            const cuando = franja[pre.horarioContacto as string];
            const what = conv.hasPqrs ? 'tu solicitud' : 'tu pre-pedido';
            const text =
                `¡Buenos días! ☀️ Ya pasé ${what} a ${result.advisorName}, del equipo de Biocambio360.\n` +
                (cuando ? `Te contactará ${cuando}.` : 'En breve te contacta para confirmar los detalles.');
            try {
                const { messageId } = await sendTextMessage(conv.phoneId, conv.contactPhone, text);
                await doc.ref.collection('messages').add({
                    direction: 'outbound',
                    type: 'text',
                    content: text,
                    metaMessageId: messageId,
                    agentUid: AI_AGENT_ID,
                    agentName: AI_AGENT_NAME,
                    status: 'sent',
                    timestamp: FieldValue.serverTimestamp(),
                });
                await doc.ref.update({ lastMessage: text.split('\n')[0], lastMessageAt: FieldValue.serverTimestamp() });
            } catch (err) {
                console.warn(`[cron/bot-handoff] Could not notify customer of ${doc.id}:`, err);
            }
        } catch (err) {
            failed++;
            console.error(`[cron/bot-handoff] Failed for ${doc.id}:`, err);
        }
    }

    console.log(`[cron/bot-handoff] assigned=${assigned} reopened=${reopened} failed=${failed}`);
    return NextResponse.json({ assigned, reopened, failed });
}
