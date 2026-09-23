/**
 * Meta Webhook — Unified handler for WhatsApp, Messenger, and Instagram Direct
 * Route: /api/webhook/meta
 *
 * GET  → Hub verification (Meta calls this to verify the endpoint)
 * POST → Inbound events (messages, statuses, reactions)
 *
 * IMPORTANT: export const runtime = 'nodejs' is REQUIRED for Firebase Admin SDK on Vercel.
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebase-admin';
import { buildConversationId } from '@/lib/inbox-service';
import type { Channel, MessageType } from '@/types/inbox';
import { FieldValue } from 'firebase-admin/firestore';

// ─── GET: Webhook verification ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === verifyToken) {
        console.log('[webhook/meta] Verification successful');
        return new NextResponse(challenge, { status: 200 });
    }

    console.warn('[webhook/meta] Verification failed — token mismatch');
    return new NextResponse('Forbidden', { status: 403 });
}

// ─── POST: Inbound event handler ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
    // CRITICAL: Return 200 ASAP to Meta — timeouts cause retries
    // We process async but respond immediately
    let body: any;
    try {
        body = await req.json();
    } catch {
        return new NextResponse('Bad Request', { status: 400 });
    }

    // Process async — don't await so we return 200 immediately
    processWebhookPayload(body).catch(err => {
        console.error('[webhook/meta] Processing error:', err);
    });

    return new NextResponse('EVENT_RECEIVED', { status: 200 });
}

// ─── Payload processing ───────────────────────────────────────────────────────

async function processWebhookPayload(body: any): Promise<void> {
    const objectType: string = body?.object ?? '';

    if (objectType === 'whatsapp_business_account') {
        await processWhatsAppPayload(body);
    } else if (objectType === 'page') {
        await processMessengerPayload(body);
    } else if (objectType === 'instagram') {
        await processInstagramPayload(body);
    } else {
        console.log('[webhook/meta] Unknown object type:', objectType);
    }
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────────

async function processWhatsAppPayload(body: any): Promise<void> {
    const entries: any[] = body?.entry ?? [];

    for (const entry of entries) {
        const changes: any[] = entry?.changes ?? [];
        for (const change of changes) {
            if (change?.field !== 'messages') continue;
            const value = change?.value ?? {};
            const phoneNumberId: string = value?.metadata?.phone_number_id ?? '';

            // Handle inbound messages
            const messages: any[] = value?.messages ?? [];
            for (const msg of messages) {
                await handleWhatsAppInboundMessage(msg, value, phoneNumberId);
            }

            // Handle status updates (sent/delivered/read)
            const statuses: any[] = value?.statuses ?? [];
            for (const status of statuses) {
                await handleWhatsAppStatusUpdate(status, phoneNumberId);
            }
        }
    }
}

async function handleWhatsAppInboundMessage(
    msg: any,
    value: any,
    phoneNumberId: string
): Promise<void> {
    const db = getAdminDB();
    const from: string = msg.from ?? '';                        // E.164 without +
    const msgId: string = msg.id ?? '';
    const timestamp = new Date(parseInt(msg.timestamp ?? '0') * 1000);

    // Resolve contact name from contacts array
    const contacts: any[] = value?.contacts ?? [];
    const contact = contacts.find((c: any) => c.wa_id === from);
    const contactName: string = contact?.profile?.name ?? `+${from}`;

    // Determine conversation ID and message type
    const conversationId = buildConversationId('whatsapp', phoneNumberId, from);
    const { type, content, mediaUrl, mimeType, fileName } = extractWhatsAppContent(msg);

    // Determine which account this is
    const accountKey = phoneNumberId === process.env.WHATSAPP_PHONE_ID_BIOCAMBIO
        ? 'biocambio360'
        : phoneNumberId === process.env.WHATSAPP_PHONE_ID_LIMPIEZA
        ? 'totalLimpieza'
        : undefined;

    const convRef = db.collection('conversations').doc(conversationId);
    const convSnap = await convRef.get();

    // Upsert conversation
    if (convSnap.exists) {
        await convRef.update({
            lastMessage: content,
            lastMessageAt: FieldValue.serverTimestamp(),
            unreadCount: FieldValue.increment(1),
            contactName,
            lastInboundAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            status: 'abierto',
        });
    } else {
        await convRef.set({
            channel: 'whatsapp' as Channel,
            phoneId: phoneNumberId,
            accountKey,
            contactPhone: from,
            contactName,
            lastMessage: content,
            lastMessageAt: FieldValue.serverTimestamp(),
            unreadCount: 1,
            status: 'abierto',
            assignedTo: null,
            lastInboundAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
    }

    // Add message to subcollection
    const messageData: Record<string, unknown> = {
        direction: 'inbound',
        type,
        content,
        metaMessageId: msgId,
        timestamp: FieldValue.serverTimestamp(),
        status: 'delivered',
    };
    if (mediaUrl) messageData.mediaUrl = mediaUrl;
    if (mimeType) messageData.mimeType = mimeType;
    if (fileName) messageData.fileName = fileName;

    await convRef.collection('messages').add(messageData);

    console.log(`[webhook/meta] WA inbound msg from ${from} → conv: ${conversationId}`);
}

function extractWhatsAppContent(msg: any): {
    type: MessageType;
    content: string;
    mediaUrl?: string;
    mimeType?: string;
    fileName?: string;
} {
    const msgType: string = msg.type ?? 'text';

    switch (msgType) {
        case 'text':
            return { type: 'text', content: msg.text?.body ?? '' };
        case 'image':
            return {
                type: 'image',
                content: msg.image?.caption ?? '📷 Imagen',
                mediaUrl: msg.image?.id,   // media ID (need to fetch URL from Graph API)
                mimeType: msg.image?.mime_type,
            };
        case 'audio':
            return {
                type: 'audio',
                content: '🎤 Nota de voz',
                mediaUrl: msg.audio?.id,
                mimeType: msg.audio?.mime_type,
            };
        case 'video':
            return {
                type: 'video',
                content: msg.video?.caption ?? '🎥 Video',
                mediaUrl: msg.video?.id,
                mimeType: msg.video?.mime_type,
            };
        case 'document':
            return {
                type: 'document',
                content: msg.document?.caption ?? `📄 ${msg.document?.filename ?? 'Documento'}`,
                mediaUrl: msg.document?.id,
                mimeType: msg.document?.mime_type,
                fileName: msg.document?.filename,
            };
        case 'location':
            return {
                type: 'text',
                content: `📍 Ubicación: lat ${msg.location?.latitude}, lng ${msg.location?.longitude}`,
            };
        case 'reaction':
            return {
                type: 'reaction',
                content: msg.reaction?.emoji ?? '👍',
            };
        case 'interactive':
            const interactiveReply = msg.interactive?.button_reply?.title
                ?? msg.interactive?.list_reply?.title
                ?? '📲 Respuesta interactiva';
            return { type: 'interactive', content: interactiveReply };
        default:
            return { type: 'text', content: `[${msgType}]` };
    }
}

async function handleWhatsAppStatusUpdate(status: any, phoneNumberId: string): Promise<void> {
    const db = getAdminDB();
    const recipientPhone: string = status.recipient_id ?? '';
    const metaMessageId: string = status.id ?? '';
    const deliveryStatus: string = status.status ?? '';

    if (!recipientPhone || !metaMessageId) return;

    const conversationId = buildConversationId('whatsapp', phoneNumberId, recipientPhone);

    // Find and update the message status
    const msgQuery = db
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .where('metaMessageId', '==', metaMessageId)
        .limit(1);

    const snap = await msgQuery.get();
    if (!snap.empty) {
        await snap.docs[0].ref.update({ status: deliveryStatus });
    }
}

// ─── Messenger ────────────────────────────────────────────────────────────────

async function processMessengerPayload(body: any): Promise<void> {
    const entries: any[] = body?.entry ?? [];

    for (const entry of entries) {
        const messaging: any[] = entry?.messaging ?? [];
        for (const event of messaging) {
            if (!event.message) continue;
            await handleMessengerInboundMessage(event, entry.id);
        }
    }
}

async function handleMessengerInboundMessage(event: any, pageId: string): Promise<void> {
    const db = getAdminDB();
    const psid: string = event.sender?.id ?? '';
    const msgId: string = event.message?.mid ?? '';
    const text: string = event.message?.text ?? '';

    if (!psid) return;

    const conversationId = buildConversationId('messenger', pageId, psid);
    const convRef = db.collection('conversations').doc(conversationId);
    const convSnap = await convRef.get();

    const content = text || '📎 Adjunto';

    if (convSnap.exists) {
        await convRef.update({
            lastMessage: content,
            lastMessageAt: FieldValue.serverTimestamp(),
            unreadCount: FieldValue.increment(1),
            lastInboundAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
    } else {
        await convRef.set({
            channel: 'messenger' as Channel,
            phoneId: pageId,
            contactPsid: psid,
            contactName: `Messenger (${psid.slice(-6)})`,
            lastMessage: content,
            lastMessageAt: FieldValue.serverTimestamp(),
            unreadCount: 1,
            status: 'abierto',
            assignedTo: null,
            lastInboundAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
    }

    await convRef.collection('messages').add({
        direction: 'inbound',
        type: 'text',
        content,
        metaMessageId: msgId,
        timestamp: FieldValue.serverTimestamp(),
        status: 'delivered',
    });

    console.log(`[webhook/meta] Messenger inbound from PSID ${psid}`);
}

// ─── Instagram ────────────────────────────────────────────────────────────────

async function processInstagramPayload(body: any): Promise<void> {
    const entries: any[] = body?.entry ?? [];

    for (const entry of entries) {
        const messaging: any[] = entry?.messaging ?? [];
        for (const event of messaging) {
            if (!event.message) continue;
            await handleInstagramInboundMessage(event, entry.id);
        }
    }
}

async function handleInstagramInboundMessage(event: any, igAccountId: string): Promise<void> {
    const db = getAdminDB();
    const psid: string = event.sender?.id ?? '';
    const msgId: string = event.message?.mid ?? '';
    const text: string = event.message?.text ?? '';

    if (!psid) return;

    const conversationId = buildConversationId('instagram', igAccountId, psid);
    const convRef = db.collection('conversations').doc(conversationId);
    const convSnap = await convRef.get();

    const content = text || '📎 Adjunto';

    if (convSnap.exists) {
        await convRef.update({
            lastMessage: content,
            lastMessageAt: FieldValue.serverTimestamp(),
            unreadCount: FieldValue.increment(1),
            lastInboundAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
    } else {
        await convRef.set({
            channel: 'instagram' as Channel,
            phoneId: igAccountId,
            contactPsid: psid,
            contactName: `Instagram (${psid.slice(-6)})`,
            lastMessage: content,
            lastMessageAt: FieldValue.serverTimestamp(),
            unreadCount: 1,
            status: 'abierto',
            assignedTo: null,
            lastInboundAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
    }

    await convRef.collection('messages').add({
        direction: 'inbound',
        type: 'text',
        content,
        metaMessageId: msgId,
        timestamp: FieldValue.serverTimestamp(),
        status: 'delivered',
    });

    console.log(`[webhook/meta] Instagram inbound from PSID ${psid}`);
}
