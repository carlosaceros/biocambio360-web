/**
 * Cron: hand-off of the AI agent to the human team. Runs every 10 minutes and acts only while the
 * team is online (schedule in business-hours.ts), so it fires right after each opening.
 * For every conversation still in status "bot" (except those a human switched the agent on for):
 *  - continued conversation with an advisor → back to that advisor, customer told the messages were passed on
 *  - with a pre-order → auto-assign to a human advisor and tell the customer who takes it
 *  - otherwise → just reopen it so the team sees it
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
import { AI_AGENT_ID, AI_AGENT_NAME, isForcedActive } from '@/lib/ai-order-agent';
import { isHumanOnline } from '@/lib/business-hours';

async function notifyCustomer(ref: FirebaseFirestore.DocumentReference, conv: FirebaseFirestore.DocumentData, text: string): Promise<void> {
    try {
        const { messageId } = await sendTextMessage(conv.phoneId, conv.contactPhone || conv.contactUserId, text);
        await ref.collection('messages').add({
            direction: 'outbound',
            type: 'text',
            content: text,
            metaMessageId: messageId,
            agentUid: AI_AGENT_ID,
            agentName: AI_AGENT_NAME,
            status: 'sent',
            timestamp: FieldValue.serverTimestamp(),
        });
        await ref.update({ lastMessage: text.split('\n')[0], lastMessageAt: FieldValue.serverTimestamp() });
    } catch (err) {
        console.warn(`[cron/bot-handoff] Could not notify customer of ${ref.id}:`, err);
    }
}

export async function GET(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = (req.headers.get('user-agent') ?? '').startsWith('vercel-cron');
    const hasSecret = !!cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`;
    if (!isVercelCron && !hasSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Never hand off while the agent is still the one on duty
    if (!isHumanOnline() && req.nextUrl.searchParams.get('force') !== '1') {
        return NextResponse.json({ skipped: 'team offline' });
    }
    const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Bogota', hour: '2-digit', hour12: false }).format(new Date())) % 24;
    const greeting = hour < 12 ? '¡Buenos días! ☀️' : '¡Hola! 👋';

    const db = getAdminDB();
    const snap = await db.collection('conversations').where('status', '==', 'bot').limit(200).get();

    let assigned = 0;
    let reopened = 0;
    let failed = 0;

    for (const doc of snap.docs) {
        const conv = doc.data();
        try {
            if (isForcedActive(conv)) continue;
            const contactId: string = conv.contactPhone || conv.contactUserId || '';

            const pre = conv.preOrder ?? {};
            const continued = conv.botMode === 'continuacion' && Number(conv.botTurns ?? 0) > 0;
            if (continued && conv.assignedTo && contactId) {
                await doc.ref.update({ status: 'abierto', updatedAt: FieldValue.serverTimestamp() });
                reopened++;
                const advisor = conv.assignedToName ? String(conv.assignedToName) : 'tu asesor';
                await notifyCustomer(doc.ref, conv, `${greeting} Ya le pasé tus mensajes a ${advisor}, quien te acompañaba, para continuar contigo.`);
                continue;
            }

            const hasLead =
                (Array.isArray(pre.items) && pre.items.length > 0) || !!pre.horarioContacto || !!conv.hasPqrs;

            if (!hasLead || !contactId) {
                await doc.ref.update({ status: 'abierto', updatedAt: FieldValue.serverTimestamp() });
                reopened++;
                if (continued && contactId) {
                    await notifyCustomer(doc.ref, conv, `${greeting} Ya pasé tus mensajes al equipo de Biocambio360; te responden en breve.`);
                }
                continue;
            }

            const result = await autoAssignConversation(doc.id, contactId);
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
                `${greeting} Ya pasé ${what} a ${result.advisorName}, del equipo de Biocambio360.\n` +
                (cuando ? `Te contactará ${cuando}.` : 'En breve te contacta para confirmar los detalles.');
            await notifyCustomer(doc.ref, conv, text);
        } catch (err) {
            failed++;
            console.error(`[cron/bot-handoff] Failed for ${doc.id}:`, err);
        }
    }

    console.log(`[cron/bot-handoff] assigned=${assigned} reopened=${reopened} failed=${failed}`);
    return NextResponse.json({ assigned, reopened, failed });
}
