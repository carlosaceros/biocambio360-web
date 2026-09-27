/**
 * POST /api/inbox/activate-agent { conversationId, scheduledAt? }
 * "Activar en este chat" from the inbox: turns the AI agent on for one conversation and makes it
 * actually DO something — right away it sends a context-aware reactivation message, instead of
 * silently waiting for the customer to write again. `scheduledAt` (ISO datetime) defers both the
 * activation and the message to that exact moment (e.g. "it's 2am, write to them at 6:30am").
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDB } from '@/lib/firebase-admin';
import { requireStaff } from '@/lib/ai-training-auth';
import { runReactivationTurn } from '@/lib/ai-order-agent';

export async function POST(req: NextRequest) {
    const user = await requireStaff(req);
    if (user instanceof NextResponse) return user;

    const { conversationId, scheduledAt } = await req.json().catch(() => ({}));
    if (!conversationId) return NextResponse.json({ error: 'Falta la conversación' }, { status: 400 });

    const convRef = getAdminDB().collection('conversations').doc(String(conversationId));
    const conv = (await convRef.get()).data();
    if (!conv) return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });
    const to = conv.contactPhone || conv.contactUserId;
    if (conv.channel !== 'whatsapp' || !to) {
        return NextResponse.json({ error: 'Solo disponible para conversaciones de WhatsApp con un contacto válido' }, { status: 400 });
    }

    // Scheduled: just store the time; the cron activates and messages at that moment
    if (scheduledAt) {
        const when = new Date(scheduledAt);
        if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() - 60000) {
            return NextResponse.json({ error: 'La fecha y hora debe ser válida y futura' }, { status: 400 });
        }
        await convRef.update({
            agentScheduledAt: when.toISOString(),
            agentScheduledBy: user.name,
            agentForced: FieldValue.delete(),
            agentForcedAt: FieldValue.delete(),
        });
        return NextResponse.json({ ok: true, scheduledAt: when.toISOString() });
    }

    // Immediate: turn it on now and send the reactivation message right away
    await convRef.update({
        agentForced: true,
        agentForcedAt: new Date().toISOString(),
        agentScheduledAt: FieldValue.delete(),
    });
    const result = await runReactivationTurn({ conversationId: convRef.id, phoneId: conv.phoneId, contactPhone: to, style: 'checkin' });
    if (!result.sent) {
        return NextResponse.json({ ok: true, activated: true, messaged: false, reason: result.reason });
    }
    return NextResponse.json({ ok: true, activated: true, messaged: true });
}

export async function DELETE(req: NextRequest) {
    const user = await requireStaff(req);
    if (user instanceof NextResponse) return user;
    const { conversationId } = await req.json().catch(() => ({}));
    if (!conversationId) return NextResponse.json({ error: 'Falta la conversación' }, { status: 400 });
    await getAdminDB().collection('conversations').doc(String(conversationId)).update({
        agentScheduledAt: FieldValue.delete(),
        agentScheduledBy: FieldValue.delete(),
    });
    return NextResponse.json({ ok: true });
}
