/**
 * API Route: POST /api/inbox/mark-sale
 * Marks a WhatsApp conversation as a closed sale and reports a Purchase event
 * to Meta's Conversions API (server-side, deduplicated separately from the browser Pixel).
 * Requires: authenticated Firebase user with mensajeria capability.
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDB, getAdminAuth } from '@/lib/firebase-admin';
import { sendCapiEvent, CapiEvent } from '@/lib/meta-capi';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

const SITE_URL = 'https://www.biocambio360.com';

export async function POST(req: NextRequest) {
    // ── Authentication ──────────────────────────────────────────────────────
    const authorization = req.headers.get('Authorization') ?? '';
    const idToken = authorization.replace('Bearer ', '');

    if (!idToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decodedToken: { uid: string; email?: string };
    try {
        decodedToken = await getAdminAuth().verifyIdToken(idToken);
    } catch {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // ── Parse body ──────────────────────────────────────────────────────────
    let body: {
        conversationId?: string;
        contactPhone?: string;
        contactName?: string;
        email?: string;
        value?: number;
        currency?: string;
        orderId?: string;
    };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { conversationId, contactPhone, contactName, email, value, currency, orderId } = body;

    if (!conversationId || !contactPhone || !value || value <= 0) {
        return NextResponse.json(
            { error: 'Missing required fields: conversationId, contactPhone, value' },
            { status: 400 }
        );
    }

    // ── Report Purchase to Meta Conversions API ───────────────────────────────
    let fn: string | undefined;
    let ln: string | undefined;
    if (contactName) {
        const parts = contactName.trim().split(/\s+/);
        fn = parts[0];
        if (parts.length > 1) ln = parts.slice(1).join(' ');
    }

    const event: CapiEvent = {
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        event_source_url: `${SITE_URL}/admin/inbox`,
        event_id: crypto.randomUUID(),
        action_source: 'other',
        user_data: {
            em: email || undefined,
            ph: contactPhone,
            fn,
            ln,
            country: 'co',
        },
        custom_data: {
            currency: currency || 'COP',
            value,
            content_name: 'Venta cerrada por WhatsApp',
            order_id: orderId || undefined,
        },
    };

    const capiResult = await sendCapiEvent([event]);

    // ── Persist to Firestore ────────────────────────────────────────────────
    try {
        const db = getAdminDB();
        const convRef = db.collection('conversations').doc(conversationId);

        const agentSnap = await db.collection('admin_users').doc(decodedToken.uid).get();
        const agentName: string = agentSnap.exists
            ? (agentSnap.data()?.nombre ?? decodedToken.email ?? 'Agente')
            : (decodedToken.email ?? 'Agente');

        const formattedValue = new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: currency || 'COP',
            maximumFractionDigits: 0,
        }).format(value);

        await convRef.collection('messages').add({
            direction: 'outbound',
            type: 'text',
            content: `✅ Venta cerrada registrada: ${formattedValue}`,
            metaMessageId: `internal_sale_${Date.now()}`,
            agentUid: decodedToken.uid,
            agentName,
            status: 'sent',
            timestamp: FieldValue.serverTimestamp(),
        });

        await convRef.update({
            lastMessage: `✅ Venta cerrada: ${formattedValue}`,
            lastMessageAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            tags: FieldValue.arrayUnion('venta-cerrada'),
            lastSaleAt: FieldValue.serverTimestamp(),
            lastSaleValue: value,
        });

        return NextResponse.json({ success: true, capiResult });
    } catch (err: any) {
        console.error('[inbox/mark-sale] Firestore error:', err.message);
        return NextResponse.json({ error: `Firestore error: ${err.message}` }, { status: 500 });
    }
}
