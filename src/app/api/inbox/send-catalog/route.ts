/**
 * POST /api/inbox/send-catalog { conversationId } — an advisor sends the visual catalog to the customer.
 * WhatsApp: cover card + link + category picker. Messenger / Instagram: text with the link.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDB } from '@/lib/firebase-admin';
import { requireStaff } from '@/lib/ai-training-auth';
import { sendCatalogCard } from '@/lib/product-card';
import { sendSocialText } from '@/lib/meta-social-service';
import { CATALOG_URL } from '@/lib/catalog-categories';

export async function POST(req: NextRequest) {
    const user = await requireStaff(req);
    if (user instanceof NextResponse) return user;

    const { conversationId } = await req.json().catch(() => ({}));
    if (!conversationId) return NextResponse.json({ error: 'Falta la conversación' }, { status: 400 });

    const convRef = getAdminDB().collection('conversations').doc(String(conversationId));
    const conv = (await convRef.get()).data();
    if (!conv) return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });

    try {
        if (conv.channel === 'whatsapp') {
            const to = conv.contactPhone || conv.contactUserId;
            if (!to) return NextResponse.json({ error: 'El contacto no tiene número' }, { status: 400 });
            await sendCatalogCard({ phoneId: conv.phoneId, to, conversationId: convRef.id, agentUid: `staff:${user.email}`, agentName: user.name });
        } else {
            const text = `📚 Catálogo Biocambio360: toda la línea con fotos, presentaciones y precios por categorías 👉 ${CATALOG_URL}`;
            const { messageId } = await sendSocialText(conv.channel, conv.contactPsid, text);
            await convRef.collection('messages').add({ direction: 'outbound', type: 'text', content: text, metaMessageId: messageId, agentUid: `staff:${user.email}`, agentName: user.name, status: 'sent', timestamp: FieldValue.serverTimestamp() });
        }
        await convRef.update({ lastMessage: '📚 Catálogo enviado', lastMessageAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message.slice(0, 200) : 'No se pudo enviar' }, { status: 502 });
    }
}
