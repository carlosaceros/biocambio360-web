/**
 * API Route: POST /api/inbox/send
 * Sends a message from the CRM inbox to a WhatsApp/Messenger/Instagram contact.
 * Requires: authenticated Firebase user with mensajeria capability.
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDB, getAdminAuth } from '@/lib/firebase-admin';
import {
    sendTextMessage,
    sendTemplateMessage,
    sendImageMessage,
    sendDocumentMessage,
} from '@/lib/whatsapp-service';
import { sendSocialText } from '@/lib/meta-social-service';
import type { SendMessagePayload } from '@/types/inbox';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
    // ── Authentication ──────────────────────────────────────────────────────
    const authorization = req.headers.get('Authorization') ?? '';
    const idToken = authorization.replace('Bearer ', '');

    if (!idToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decodedToken: { uid: string; email?: string; name?: string };
    try {
        decodedToken = await getAdminAuth().verifyIdToken(idToken);
    } catch {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // ── Parse body ──────────────────────────────────────────────────────────
    let payload: SendMessagePayload;
    try {
        payload = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { conversationId, channel, to, phoneId, type, text, template, mediaUrl, mimeType, fileName } = payload;

    if (!conversationId || !to || !phoneId) {
        return NextResponse.json({ error: 'Missing required fields: conversationId, to, phoneId' }, { status: 400 });
    }

    // ── Send message via Meta API ────────────────────────────────────────────
    let metaMessageId = 'unknown';
    let content = '';

    try {
        if (channel === 'whatsapp') {
            if (type === 'text' && text) {
                const result = await sendTextMessage(phoneId, to, text);
                metaMessageId = result.messageId;
                content = text;
            } else if (type === 'template' && template) {
                const result = await sendTemplateMessage(
                    phoneId,
                    to,
                    template.name,
                    template.language,
                    template.components
                );
                metaMessageId = result.messageId;
                content = `📋 Plantilla: ${template.name}`;
            } else if (type === 'image' && mediaUrl) {
                const result = await sendImageMessage(phoneId, to, mediaUrl, text);
                metaMessageId = result.messageId;
                content = text ? `📷 ${text}` : '📷 Imagen';
            } else if (type === 'document' && mediaUrl && fileName) {
                const result = await sendDocumentMessage(phoneId, to, mediaUrl, fileName, text);
                metaMessageId = result.messageId;
                content = `📄 ${fileName}`;
            } else {
                return NextResponse.json({ error: 'Invalid message type or missing content' }, { status: 400 });
            }
        } else {
            // Messenger / Instagram: text replies inside the 24h customer-initiated window
            if (!text || type !== 'text') {
                return NextResponse.json({ error: 'Por ahora solo se pueden enviar mensajes de texto en Messenger e Instagram.' }, { status: 400 });
            }
            const result = await sendSocialText(channel as 'messenger' | 'instagram', to, text);
            metaMessageId = result.messageId;
            content = text;
        }
    } catch (err: any) {
        console.error('[inbox/send] Meta API error:', err.message);
        return NextResponse.json({ error: `Meta API error: ${err.message}` }, { status: 502 });
    }

    // ── Persist to Firestore ────────────────────────────────────────────────
    try {
        const db = getAdminDB();
        const convRef = db.collection('conversations').doc(conversationId);

        // Fetch agent name from their user profile
        const agentSnap = await db.collection('admin_users').doc(decodedToken.uid).get();
        const agentName: string = agentSnap.exists
            ? (agentSnap.data()?.nombre ?? decodedToken.email ?? 'Agente')
            : (decodedToken.email ?? 'Agente');

        // Add message to subcollection
        const msgData: Record<string, unknown> = {
            direction: 'outbound',
            type,
            content,
            metaMessageId,
            agentUid: decodedToken.uid,
            agentName,
            status: 'sent',
            timestamp: FieldValue.serverTimestamp(),
        };
        if (type === 'template' && template) msgData.templateName = template.name;
        if (mediaUrl) msgData.mediaUrl = mediaUrl;
        if (mimeType) msgData.mimeType = mimeType;
        if (fileName) msgData.fileName = fileName;

        await convRef.collection('messages').add(msgData);

        // Update conversation's last message
        await convRef.update({
            lastMessage: content,
            lastMessageAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ success: true, messageId: metaMessageId });
    } catch (err: any) {
        console.error('[inbox/send] Firestore error:', err.message);
        return NextResponse.json({ error: `Firestore error: ${err.message}` }, { status: 500 });
    }
}
