/**
 * Cron (every 5 min): copies the advisors' replies made INSIDE Kommo into the inbox, so response-time
 * KPIs see them. Kommo has no "outgoing message" webhook, but its Events API lists outgoing chat
 * messages (who, when, which contact). The text is not part of the event, only the fact of the reply.
 * Needs KOMMO_HOST and KOMMO_TOKEN; without them it does nothing.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminDB } from '@/lib/firebase-admin';
import { buildConversationId } from '@/lib/inbox-service';
import { toWhatsappId } from '@/lib/abandoned-cart-config';
import { kommoContactPhone, kommoLeadContactId, kommoOutgoingEvents, kommoUserNames } from '@/lib/kommo';

const MAIN_PHONE_ID = process.env.WHATSAPP_PHONE_ID_BIOCAMBIO || '236893662847270';

export async function GET(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = (req.headers.get('user-agent') ?? '').startsWith('vercel-cron');
    const hasSecret = !!cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`;
    if (!isVercelCron && !hasSecret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!process.env.KOMMO_HOST || !process.env.KOMMO_TOKEN) return NextResponse.json({ skipped: 'KOMMO_HOST / KOMMO_TOKEN not set' });

    const db = getAdminDB();
    const stateRef = db.collection('bot_config').doc('kommo_sync');
    const state = (await stateRef.get()).data() ?? {};
    // First run: look back 24 h; later runs: from the last processed event (minus a small overlap)
    const fromSec = Number(state.lastEventAt) ? Number(state.lastEventAt) - 60 : Math.floor(Date.now() / 1000) - 24 * 3600;

    const events = await kommoOutgoingEvents(fromSec);
    const users = await kommoUserNames();
    const stats = { events: events.length, stored: 0, skipped: 0 };
    let lastEventAt = Number(state.lastEventAt) || 0;
    const contactByLead = new Map<string, string | null>();

    for (const ev of events) {
        lastEventAt = Math.max(lastEventAt, ev.createdAt);
        try {
            // Automations (Salesbot, robots) have no user: they are not advisor work
            if (!ev.createdBy) {
                stats.skipped++;
                continue;
            }
            let contactId: string | null = ev.entityType === 'contact' ? ev.entityId : null;
            if (!contactId && ev.entityType === 'lead') {
                if (!contactByLead.has(ev.entityId)) contactByLead.set(ev.entityId, await kommoLeadContactId(ev.entityId));
                contactId = contactByLead.get(ev.entityId) ?? null;
            }
            const waId = contactId ? toWhatsappId((await kommoContactPhone(contactId)) ?? '') : null;
            if (!waId) {
                stats.skipped++;
                continue;
            }
            const advisor = users.get(ev.createdBy) ?? `Asesor Kommo #${ev.createdBy}`;
            const when = Timestamp.fromMillis(ev.createdAt * 1000);
            const convRef = db.collection('conversations').doc(buildConversationId('whatsapp', MAIN_PHONE_ID, waId));
            const preview = `💬 Respuesta de ${advisor} (Kommo)`;
            const conv = await convRef.get();
            if (!conv.exists) {
                await convRef.set({
                    channel: 'whatsapp', phoneId: MAIN_PHONE_ID, accountKey: 'biocambio360', contactPhone: waId, contactUserId: null,
                    contactName: `+${waId}`, lastMessage: preview, lastMessageAt: when, unreadCount: 0, status: 'abierto', assignedTo: null,
                    createdAt: when, updatedAt: FieldValue.serverTimestamp(),
                });
            } else if (toMillis(conv.data()?.lastMessageAt) < ev.createdAt * 1000) {
                await convRef.update({ lastMessage: preview, lastMessageAt: when, updatedAt: FieldValue.serverTimestamp() });
            }
            try {
                await convRef.collection('messages').doc(`kommo_ev_${ev.id}`).create({
                    direction: 'outbound', type: 'text', content: preview, metaMessageId: `kommo_ev_${ev.id}`,
                    agentUid: `kommo:${ev.createdBy}`, agentName: advisor, status: 'sent', timestamp: when,
                });
                stats.stored++;
            } catch (err) {
                if ((err as { code?: number })?.code !== 6) throw err;
            }
        } catch (err) {
            console.error('[cron/kommo-sync] event failed:', err instanceof Error ? err.message : err);
        }
    }

    if (lastEventAt) await stateRef.set({ lastEventAt, updatedAt: new Date().toISOString() }, { merge: true });
    console.log('[cron/kommo-sync]', JSON.stringify(stats));
    return NextResponse.json(stats);
}

function toMillis(v: unknown): number {
    const t = v as { toMillis?: () => number } | undefined;
    return typeof t?.toMillis === 'function' ? t.toMillis() : 0;
}
