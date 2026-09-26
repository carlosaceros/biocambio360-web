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
import { extractOutgoing, kommoContactPhone, parseBracketForm } from '@/lib/kommo';

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

    const events = extractOutgoing(body);
    if (events.length === 0) {
        // Useful while connecting: see what Kommo actually sends for other event types
        console.log('[webhook/kommo] No outgoing chat message in payload:', raw.slice(0, 500));
        return NextResponse.json({ ok: true, stored: 0 });
    }

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
