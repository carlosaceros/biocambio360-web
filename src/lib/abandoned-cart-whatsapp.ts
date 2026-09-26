/**
 * WhatsApp reminder for an abandoned cart (approved marketing template with a dynamic checkout
 * button). The conversation is created/tagged in the inbox so replies, history and KPIs live there.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDB } from '@/lib/firebase-admin';
import { sendTemplateMessage } from '@/lib/whatsapp-service';
import { buildConversationId } from '@/lib/inbox-service';
import { isOptedOut } from '@/lib/wa-optout';
import { REMINDER_PHONE_ID } from '@/lib/whatsapp-sender';
import {
    CART_TAG,
    cartFirstName,
    cartSummary,
    cartTemplateComponents,
    cartTemplateText,
    toWhatsappId,
} from '@/lib/abandoned-cart-config';

export const CART_AUTOMATION_UID = 'cart-automation';

interface CartLike {
    cartToken: string;
    customerName?: string;
    customerPhone?: string;
    items: Array<{ nombre?: string; size?: string; cantidad?: number }>;
    total: number;
}

export type CartWhatsappResult = { ok: true; conversationId: string } | { ok: false; skipped?: string; error?: string };

export async function sendCartWhatsapp(cart: CartLike, step: number, template: string): Promise<CartWhatsappResult> {
    const to = toWhatsappId(cart.customerPhone);
    if (!to) return { ok: false, skipped: 'sin celular válido' };
    const phoneId = REMINDER_PHONE_ID;
    if (await isOptedOut(to)) return { ok: false, skipped: 'el cliente pidió no recibir promociones' };

    const name = cartFirstName(cart.customerName);
    const summary = cartSummary(cart.items);
    let messageId: string;
    try {
        ({ messageId } = await sendTemplateMessage(phoneId, to, template, 'es', cartTemplateComponents(name, summary, cart.cartToken)));
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message.slice(0, 300) : String(err) };
    }

    // Inbox: one conversation per customer, tagged so it can be segmented
    const db = getAdminDB();
    const conversationId = buildConversationId('whatsapp', phoneId, to);
    const convRef = db.collection('conversations').doc(conversationId);
    const text = cartTemplateText(name, summary);
    try {
        const existing = await convRef.get();
        const cartInfo = {
            cartToken: cart.cartToken,
            cartTotal: cart.total,
            cartSummary: summary,
            cartStep: step,
            cartSentAt: new Date().toISOString(),
        };
        if (existing.exists) {
            await convRef.update({
                tags: FieldValue.arrayUnion(CART_TAG),
                ...cartInfo,
                lastMessage: '🛒 Recordatorio de carrito enviado',
                lastMessageAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
        } else {
            await convRef.set({
                channel: 'whatsapp',
                phoneId,
                accountKey: 'totalLimpieza',
                contactPhone: to,
                contactUserId: null,
                contactName: cart.customerName || `+${to}`,
                lastMessage: '🛒 Recordatorio de carrito enviado',
                lastMessageAt: FieldValue.serverTimestamp(),
                unreadCount: 0,
                status: 'abierto',
                assignedTo: null,
                tags: [CART_TAG],
                ...cartInfo,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
        }
        await convRef.collection('messages').add({
            direction: 'outbound',
            type: 'text',
            content: text,
            metaMessageId: messageId,
            agentUid: CART_AUTOMATION_UID,
            agentName: 'Automatización de carritos',
            cta: { label: 'Terminar mi compra', url: `https://biocambio360.com/checkout?recovery_token=${cart.cartToken}` },
            status: 'sent',
            timestamp: FieldValue.serverTimestamp(),
        });
    } catch (err) {
        // The message was delivered; only the inbox record failed
        console.warn('[cart-whatsapp] Sent but could not store the conversation:', err instanceof Error ? err.message : err);
    }
    return { ok: true, conversationId };
}
