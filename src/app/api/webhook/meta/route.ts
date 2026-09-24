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
export const maxDuration = 60;

import { NextRequest, NextResponse, after } from 'next/server';
import { getAdminDB } from '@/lib/firebase-admin';
import { buildConversationId } from '@/lib/inbox-service';
import type { Channel, MessageType } from '@/types/inbox';
import { FieldValue } from 'firebase-admin/firestore';
import { isAfterHoursNow, runOrderAgentTurn } from '@/lib/ai-order-agent';

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
    let body: any;
    try {
        body = await req.json();
    } catch {
        return new NextResponse('Bad Request', { status: 400 });
    }

    // Await processing: serverless functions can be frozen right after responding, which would
    // silently drop the writes. On failure return 500 so Meta retries delivery (handlers are
    // idempotent), instead of losing the message.
    try {
        await processWebhookPayload(body);
    } catch (err) {
        console.error('[webhook/meta] Processing error:', err);
        return new NextResponse('Processing error', { status: 500 });
    }

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
            const field: string = change?.field ?? '';
            const value = change?.value ?? {};

            if (field === 'messages') {
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
            } else if (field === 'smb_message_echoes' || field === 'message_echoes') {
                await handleMessageEchoes(value);
            } else if (field === 'message_template_status_update') {
                await handleTemplateStatusUpdate(value);
            } else if (field === 'message_template_quality_update') {
                await handleTemplateQualityUpdate(value);
            } else if (field === 'phone_number_quality_update') {
                await handlePhoneQualityUpdate(value);
            } else {
                console.log(`[webhook/meta] Unhandled WABA field: ${field}`);
            }
        }
    }
}

// ─── Operational alerts: templates & phone quality ───────────────────────────

function resolveAccountKeyByPhoneId(phoneNumberId?: string): string | undefined {
    if (!phoneNumberId) return undefined;
    if (phoneNumberId === process.env.WHATSAPP_PHONE_ID_BIOCAMBIO) return 'biocambio360';
    if (phoneNumberId === process.env.WHATSAPP_PHONE_ID_LIMPIEZA) return 'totalLimpieza';
    return undefined;
}

function resolveAccountKeyByPhoneNumber(displayPhoneNumber?: string): string | undefined {
    if (!displayPhoneNumber) return undefined;
    const digits = displayPhoneNumber.replace(/\D/g, '');
    if (digits.endsWith('1005353')) return 'biocambio360';
    if (digits.endsWith('6045330')) return 'totalLimpieza';
    return undefined;
}

/**
 * Messages sent from the business number by ANOTHER app (e.g. an advisor answering from Kommo or the
 * WhatsApp Business app). Meta reports them as echoes; they are stored as outbound messages so the
 * inbox shows the whole conversation. Idempotent by message id.
 */
async function handleMessageEchoes(value: any): Promise<void> {
    const db = getAdminDB();
    const phoneNumberId: string = value?.metadata?.phone_number_id ?? '';
    const echoes: any[] = value?.message_echoes ?? [];

    for (const echo of echoes) {
        const to: string = String(echo?.to ?? '');
        const msgId: string = String(echo?.id ?? '');
        if (!to || !msgId) continue;

        const conversationId = buildConversationId('whatsapp', phoneNumberId, to);
        const convRef = db.collection('conversations').doc(conversationId);

        // Messages sent by this app were already stored when sent
        const dup = await convRef.collection('messages').where('metaMessageId', '==', msgId).limit(1).get();
        if (!dup.empty) continue;

        const { type, content, mediaUrl, mimeType, fileName } = extractWhatsAppContent(echo);
        const convSnap = await convRef.get();

        const batch = db.batch();
        const messageData: Record<string, unknown> = {
            direction: 'outbound',
            type,
            content,
            metaMessageId: msgId,
            agentUid: 'external-app',
            agentName: 'Asesor (Kommo / app externa)',
            status: 'sent',
            timestamp: FieldValue.serverTimestamp(),
        };
        if (mediaUrl) messageData.mediaUrl = mediaUrl;
        if (mimeType) messageData.mimeType = mimeType;
        if (fileName) messageData.fileName = fileName;
        batch.create(convRef.collection('messages').doc(msgId), messageData);

        if (convSnap.exists) {
            batch.update(convRef, {
                lastMessage: content,
                lastMessageAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
        } else {
            batch.set(convRef, {
                channel: 'whatsapp' as Channel,
                phoneId: phoneNumberId,
                accountKey: resolveAccountKeyByPhoneId(phoneNumberId),
                contactPhone: /^\d{7,15}$/.test(to) ? to : null,
                contactName: /^\d{7,15}$/.test(to) ? `+${to}` : 'Usuario de WhatsApp',
                lastMessage: content,
                lastMessageAt: FieldValue.serverTimestamp(),
                unreadCount: 0,
                status: 'abierto',
                assignedTo: null,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
        }

        try {
            await batch.commit();
            console.log(`[webhook/meta] Echo stored (external app) → conv: ${conversationId}`);
        } catch (err: any) {
            if (err?.code !== 6) throw err; // 6 = ALREADY_EXISTS: duplicate echo, ignore
        }
    }
}

async function createAlert(alert: {
    type: 'template_status' | 'template_quality' | 'phone_quality';
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    phoneNumberId?: string;
    accountKey?: string;
    templateName?: string;
    templateLanguage?: string;
    templateId?: string;
    event?: string;
    previousValue?: string;
    newValue?: string;
    rawPayload: Record<string, unknown>;
}): Promise<void> {
    const db = getAdminDB();
    await db.collection('whatsapp_alerts').add({
        ...alert,
        acknowledged: false,
        createdAt: FieldValue.serverTimestamp(),
    });
    console.log(`[webhook/meta] Alert created: [${alert.severity}] ${alert.title}`);
}

/**
 * message_template_status_update — fires when Meta approves/rejects/pauses/disables a template.
 * Field names confirmed against real-world implementations: event, message_template_id,
 * message_template_name, message_template_language, reason (present on REJECTED).
 */
async function handleTemplateStatusUpdate(value: any): Promise<void> {
    const event: string = value?.event ?? 'UNKNOWN';
    const templateName: string = value?.message_template_name ?? 'plantilla desconocida';
    const templateLanguage: string | undefined = value?.message_template_language;
    const templateId: string | undefined = value?.message_template_id ? String(value.message_template_id) : undefined;
    const reason: string | undefined = value?.reason;

    const severity: 'info' | 'warning' | 'critical' =
        ['REJECTED', 'DISABLED', 'PAUSED'].includes(event) ? 'critical'
        : ['PENDING', 'IN_APPEAL', 'PENDING_DELETION'].includes(event) ? 'warning'
        : 'info';

    const title = event === 'APPROVED'
        ? `Plantilla aprobada: ${templateName}`
        : event === 'REJECTED'
        ? `Plantilla RECHAZADA: ${templateName}`
        : `Plantilla "${templateName}" → ${event}`;

    const message = reason
        ? `Evento: ${event}${templateLanguage ? ` (${templateLanguage})` : ''}. Motivo: ${reason}`
        : `Evento: ${event}${templateLanguage ? ` (${templateLanguage})` : ''}.`;

    await createAlert({
        type: 'template_status',
        severity,
        title,
        message,
        templateName,
        templateLanguage,
        templateId,
        event,
        rawPayload: value,
    });
}

/**
 * message_template_quality_update — fires when a template's quality score changes.
 * Field names: new_quality_score (required), previous_quality_score (may be absent),
 * plus message_template_id/name/language.
 */
async function handleTemplateQualityUpdate(value: any): Promise<void> {
    const newScore: string = value?.new_quality_score ?? 'UNKNOWN';
    const previousScore: string | undefined = value?.previous_quality_score;
    const templateName: string = value?.message_template_name ?? 'plantilla desconocida';
    const templateLanguage: string | undefined = value?.message_template_language;
    const templateId: string | undefined = value?.message_template_id ? String(value.message_template_id) : undefined;

    const severity: 'info' | 'warning' | 'critical' =
        newScore === 'RED' ? 'critical' : newScore === 'YELLOW' ? 'warning' : 'info';

    await createAlert({
        type: 'template_quality',
        severity,
        title: `Calidad de plantilla "${templateName}": ${previousScore ? `${previousScore} → ` : ''}${newScore}`,
        message: `La calidad de la plantilla${templateLanguage ? ` (${templateLanguage})` : ''} cambió a ${newScore}.${newScore === 'RED' ? ' Meta puede pausarla si no mejora.' : ''}`,
        templateName,
        templateLanguage,
        templateId,
        previousValue: previousScore,
        newValue: newScore,
        rawPayload: value,
    });
}

/**
 * phone_number_quality_update — fires when a phone number's quality rating or messaging
 * limit changes. Field names vary slightly across Meta's docs/implementations, so we read
 * every plausible key defensively and always keep the raw payload for verification.
 */
async function handlePhoneQualityUpdate(value: any): Promise<void> {
    const displayPhoneNumber: string | undefined = value?.display_phone_number ?? value?.metadata?.display_phone_number;
    const event: string = value?.event ?? value?.current_quality_rating ?? 'UNKNOWN';
    const currentLimit: string | undefined = value?.current_limit;
    const phoneNumberId: string | undefined = value?.phone_number_id ?? value?.metadata?.phone_number_id;

    const accountKey = resolveAccountKeyByPhoneId(phoneNumberId) ?? resolveAccountKeyByPhoneNumber(displayPhoneNumber);
    const accountLabel = accountKey === 'biocambio360' ? 'Biocambio360' : accountKey === 'totalLimpieza' ? 'Total Limpieza' : (displayPhoneNumber ?? 'número desconocido');

    const eventUpper = String(event).toUpperCase();
    const severity: 'info' | 'warning' | 'critical' =
        eventUpper.includes('RED') || eventUpper.includes('FLAG') || eventUpper.includes('DOWNGRADE') ? 'critical'
        : eventUpper.includes('YELLOW') ? 'warning'
        : 'info';

    await createAlert({
        type: 'phone_quality',
        severity,
        title: `Calidad del número ${accountLabel}: ${event}`,
        message: `Evento: ${event}.${currentLimit ? ` Límite de mensajería actual: ${currentLimit}.` : ''}`,
        phoneNumberId,
        accountKey,
        event,
        newValue: currentLimit,
        rawPayload: value,
    });
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

    // Resolve the contact. Some users (WhatsApp usernames) arrive WITHOUT a phone number:
    // keep them in their own conversation instead of merging everyone under an empty id.
    const contacts: any[] = value?.contacts ?? [];
    const contact = contacts.find((c: any) => c.wa_id === from) ?? contacts[0];
    const hasPhone = /^\d{7,15}$/.test(from);
    const contactKey: string = hasPhone ? from : String(msg.from_user_id ?? contact?.user_id ?? contact?.wa_id ?? from ?? '');
    if (!contactKey) {
        console.error('[webhook/meta] Inbound message without any contact identifier:', JSON.stringify({ msg, contact }).slice(0, 1500));
        return;
    }
    if (!hasPhone) {
        console.warn('[webhook/meta] Inbound WITHOUT phone number (payload):', JSON.stringify({ msg: { ...msg, text: undefined }, contact }).slice(0, 1500));
    }
    const contactName: string =
        contact?.profile?.name ?? contact?.profile?.username ?? (hasPhone ? `+${from}` : 'Usuario de WhatsApp');

    // Determine conversation ID and message type
    const conversationId = buildConversationId('whatsapp', phoneNumberId, contactKey);
    const { type, content, mediaUrl, mimeType, fileName } = extractWhatsAppContent(msg);

    // Determine which account this is
    const accountKey = phoneNumberId === process.env.WHATSAPP_PHONE_ID_BIOCAMBIO
        ? 'biocambio360'
        : phoneNumberId === process.env.WHATSAPP_PHONE_ID_LIMPIEZA
        ? 'totalLimpieza'
        : undefined;

    const convRef = db.collection('conversations').doc(conversationId);
    const convSnap = await convRef.get();

    // Click-to-WhatsApp ad that started the chat (only present on the first message)
    const referral = msg.referral;
    const adReferral = referral
        ? {
            sourceId: referral.source_id ? String(referral.source_id) : null,
            sourceType: referral.source_type ?? null,
            sourceUrl: referral.source_url ?? null,
            headline: referral.headline ?? null,
            body: referral.body ?? null,
            mediaType: referral.media_type ?? null,
            ctwaClid: referral.ctwa_clid ?? null,
            receivedAt: new Date().toISOString(),
        }
        : null;
    if (adReferral) console.log('[webhook/meta] Ad referral:', JSON.stringify(adReferral).slice(0, 600));

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

    // Atomic + idempotent: the message doc id is Meta's wamid, so a Meta retry of an already
    // stored message fails on create() (ALREADY_EXISTS) and never double-counts unread.
    const msgRef = msgId ? convRef.collection('messages').doc(msgId) : convRef.collection('messages').doc();
    const batch = db.batch();
    batch.create(msgRef, messageData);

    if (convSnap.exists) {
        batch.update(convRef, {
            lastMessage: content,
            lastMessageAt: FieldValue.serverTimestamp(),
            unreadCount: FieldValue.increment(1),
            contactName,
            lastInboundAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            status: convSnap.data()?.status === 'bot' ? 'bot' : 'abierto',
            ...(adReferral ? { adReferral } : {}),
        });
    } else {
        batch.set(convRef, {
            channel: 'whatsapp' as Channel,
            phoneId: phoneNumberId,
            accountKey,
            contactPhone: hasPhone ? from : null,
            contactUserId: hasPhone ? null : contactKey,
            contactName,
            lastMessage: content,
            lastMessageAt: FieldValue.serverTimestamp(),
            unreadCount: 1,
            status: 'abierto',
            assignedTo: null,
            lastInboundAt: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            ...(adReferral ? { adReferral } : {}),
        });
    }

    try {
        await batch.commit();
    } catch (err: any) {
        if (err?.code === 6) {
            console.log(`[webhook/meta] Duplicate WA message ${msgId} ignored`);
            return;
        }
        throw err;
    }

    console.log(`[webhook/meta] WA inbound msg from ${contactKey} → conv: ${conversationId}`);

    if (adReferral && (adReferral.sourceId || adReferral.headline)) {
        const adDocId = adReferral.sourceId || `url_${Buffer.from(String(adReferral.sourceUrl ?? adReferral.headline)).toString('base64url').slice(0, 40)}`;
        db.collection('ad_referrals').doc(adDocId).set({
            sourceId: adReferral.sourceId,
            headline: adReferral.headline,
            body: adReferral.body,
            sourceUrl: adReferral.sourceUrl,
            mediaType: adReferral.mediaType,
            lastSeenAt: new Date().toISOString(),
            conversations: FieldValue.increment(1),
        }, { merge: true }).catch(e => console.warn('[webhook/meta] ad registry failed:', e?.message));
    }

    // After-hours AI agent: runs after the response is sent so Meta is never kept waiting.
    if (type !== 'reaction' && isAfterHoursNow()) {
        after(() => runOrderAgentTurn({ conversationId, phoneId: phoneNumberId, contactPhone: hasPhone ? from : '' }));
    }
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
        case 'sticker':
            return {
                type: 'sticker',
                content: '🖼️ Sticker',
                mediaUrl: msg.sticker?.id,
                mimeType: msg.sticker?.mime_type,
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
