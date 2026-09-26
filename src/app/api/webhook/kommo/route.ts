/**
 * POST /api/webhook/kommo?key=<KOMMO_WEBHOOK_SECRET>
 * Receives Kommo "Outgoing chat message" events and stores them in the inbox conversation of that
 * customer, with the real advisor's name, so response-time KPIs include work done inside Kommo.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminDB } from '@/lib/firebase-admin';
import { buildConversationId } from '@/lib/inbox-service';
import { toWhatsappId } from '@/lib/abandoned-cart-config';
import { extractOutgoing, kommoContactPhone, kommoLeadContactId, parseBracketForm } from '@/lib/kommo';

const MAIN_PHONE_ID = process.env.WHATSAPP_PHONE_ID_BIOCAMBIO || '236893662847270';

export async function POST(req: NextRequest) {
    const secret = process.env.KOMMO_WEBHOOK_SECRET;
    if (!secret || req.nextUrl.searchParams.get('key') !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const raw = await req.text();
    let body: Record<string, unknown>;
    try {
        body = raw.trim().startsWith('{') ? JSON.parse(raw) : parseBracketForm(raw);
    } catch {
        return NextResponse.json({ error: 'Bad body' }, { status: 400 });
    }

    // A lead moved to "Closed – won" (Kommo's fixed status id 142) is a closed sale
    const statusChanges = Object.values(((body.leads as Record<string, unknown> | undefined)?.status as Record<string, Record<string, string>> | undefined) ?? {});
    for (const change of statusChanges) {
        if (String(change?.status_id) !== '142') continue;
        try {
            const contactId = await kommoLeadContactId(String(change.id));
            const waId = contactId ? toWhatsappId((await kommoContactPhone(contactId)) ?? '') : null;
            if (!waId) continue;
            const convRef = getAdminDB().collection('conversations').doc(buildConversationId('whatsapp', MAIN_PHONE_ID, waId));
            const conv = await convRef.get();
            if (!conv.exists) continue;
            const price = Number(change.price) || 0;
            await convRef.update({
                kommoWonAt: FieldValue.serverTimestamp(),
                // the manual "Marcar venta cerrada" button keeps priority
                ...(conv.data()?.lastSaleAt ? {} : { lastSaleAt: FieldValue.serverTimestamp(), lastSaleValue: price, tags: FieldValue.arrayUnion('venta-cerrada') }),
            });
        } catch (err) {
            console.error('[webhook/kommo] won-lead handling failed:', err instanceof Error ? err.message : err);
        }
    }

    const events = extractOutgoing(body);
    if (events.length === 0) return NextResponse.json({ ok: true, stored: 0 });

    const db = getAdminDB();
    let stored = 0;
    for (const ev of events) {
        try {
            const phone = await kommoContactPhone(ev.contactId);
            const waId = toWhatsappId(phone ?? '');
            if (!waId) {
                console.warn(`[webhook/kommo] Contact ${ev.contactId} has no resolvable phone (KOMMO_HOST / KOMMO_TOKEN set?)`);
                continue;
            }
            const convRef = db.collection('conversations').doc(buildConversationId('whatsapp', MAIN_PHONE_ID, waId));
            const msgRef = convRef.collection('messages').doc(`kommo_${ev.id}`);
            const when = Timestamp.fromMillis(ev.createdAt * 1000);

            const conv = await convRef.get();
            if (!conv.exists) {
                await convRef.set({
                    channel: 'whatsapp', phoneId: MAIN_PHONE_ID, accountKey: 'biocambio360', contactPhone: waId, contactUserId: null,
                    contactName: `+${waId}`, lastMessage: ev.text, lastMessageAt: when, unreadCount: 0, status: 'abierto', assignedTo: null,
                    createdAt: when, updatedAt: FieldValue.serverTimestamp(),
                });
            } else {
                await convRef.update({ lastMessage: ev.text, lastMessageAt: when, updatedAt: FieldValue.serverTimestamp() });
            }
            try {
                await msgRef.create({
                    direction: 'outbound', type: 'text', content: ev.text, metaMessageId: `kommo_${ev.id}`,
                    agentUid: `kommo:${ev.authorId || 'user'}`, agentName: ev.authorName || 'Asesor (Kommo)',
                    kommoAuthorType: ev.authorType, status: 'sent', timestamp: when,
                });
                stored++;
            } catch (err) {
                if ((err as { code?: number })?.code !== 6) throw err; // 6 = already stored (Kommo retry)
            }
        } catch (err) {
            console.error('[webhook/kommo] Failed to store a message:', err instanceof Error ? err.message : err);
        }
    }
    return NextResponse.json({ ok: true, stored });
}

// Kommo checks the URL with a GET when the webhook is saved
export async function GET() {
    return NextResponse.json({ ok: true });
}
