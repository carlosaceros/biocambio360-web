/**
 * "Tu pedido se entrega MAÑANA" alerts.
 *
 * An order is delivered tomorrow when its `fechaProgramadaEntrega` (YYYY-MM-DD, set when a messenger
 * is assigned in the Mensajeros module) equals tomorrow's date in Bogotá and it is still active.
 * A daily cron sends the approved template from the main line (+57 324 1005353), where the templates
 * live: `alerta_api_vby43c` (with the amount to collect) for cash-on-delivery orders and
 * `api_alerta2_or83ks` for prepaid ones. Both carry "Confirmar / Modificar" buttons; the webhook
 * turns those answers (and a shared location pin) into fields of the order.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDB } from '@/lib/firebase-admin';
import { sendTemplateMessage } from '@/lib/whatsapp-service';
import { buildConversationId } from '@/lib/inbox-service';
import { toWhatsappId, toMs } from '@/lib/abandoned-cart-config';

export const DELIVERY_TEMPLATE_COD = 'alerta_api_vby43c';
export const DELIVERY_TEMPLATE_PREPAID = 'api_alerta2_or83ks';
/** The templates were created in the account of the main line */
export const DELIVERY_PHONE_ID = process.env.WHATSAPP_PHONE_ID_BIOCAMBIO || '236893662847270';

const INACTIVE = new Set(['entregado', 'cancelado', 'borrador', 'no_entregado']);

/** YYYY-MM-DD in Bogotá, `offsetDays` from today. */
export function bogotaDate(offsetDays = 0, now: Date = new Date()): string {
    const shifted = new Date(now.getTime() + offsetDays * 86400000);
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(shifted);
}

export async function isDeliveryAlertEnabled(): Promise<boolean> {
    try {
        const snap = await getAdminDB().collection('bot_config').doc('delivery_alerts').get();
        return snap.data()?.enabled === true;
    } catch {
        return false;
    }
}

export type DeliveryAlertResult = { ok: true } | { ok: false; skipped?: string; error?: string };

export function isEligibleForAlert(order: FirebaseFirestore.DocumentData): string | null {
    if (INACTIVE.has(String(order.status))) return `estado ${order.status}`;
    if (order.alertaEntregaEnviada === true) return 'ya alertado';
    if (!toWhatsappId(order.cliente?.celular)) return 'sin celular válido';
    return null;
}

export async function sendDeliveryAlert(orderId: string, order: FirebaseFirestore.DocumentData): Promise<DeliveryAlertResult> {
    const skip = isEligibleForAlert(order);
    if (skip) return { ok: false, skipped: skip };

    const to = toWhatsappId(order.cliente?.celular) as string;
    const cod = order.metodoPago === 'contraentrega';
    const template = cod ? DELIVERY_TEMPLATE_COD : DELIVERY_TEMPLATE_PREPAID;
    const total = `$${Math.round(Number(order.total) || 0).toLocaleString('es-CO')}`;

    let messageId: string;
    try {
        ({ messageId } = await sendTemplateMessage(
            DELIVERY_PHONE_ID,
            to,
            template,
            'es',
            cod ? [{ type: 'body', parameters: [{ type: 'text', text: total }] }] : undefined
        ));
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message.slice(0, 300) : String(err) };
    }

    const db = getAdminDB();
    const nowIso = new Date().toISOString();
    await db.collection('orders').doc(orderId).update({
        alertaEntregaEnviada: true,
        alertaEntregaEnviadaAt: nowIso,
        alertaEntregaEnviadaPor: 'Automático (WhatsApp)',
        alertaEntregaWa: to,
        alertaEntregaMessageId: messageId,
    });

    // Inbox: the customer's answers ("Confirmar", "Modificar", location) land in this conversation
    try {
        const convRef = db.collection('conversations').doc(buildConversationId('whatsapp', DELIVERY_PHONE_ID, to));
        const preview = `🚗 Alerta de entrega de mañana${cod ? ` · a cobrar ${total}` : ''}`;
        const existing = await convRef.get();
        if (existing.exists) {
            await convRef.update({ lastMessage: preview, lastMessageAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), tags: FieldValue.arrayUnion('entrega-manana') });
        } else {
            await convRef.set({
                channel: 'whatsapp', phoneId: DELIVERY_PHONE_ID, accountKey: 'biocambio360', contactPhone: to, contactUserId: null,
                contactName: order.cliente?.nombre || `+${to}`, lastMessage: preview, lastMessageAt: FieldValue.serverTimestamp(),
                unreadCount: 0, status: 'abierto', assignedTo: null, tags: ['entrega-manana'], createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
            });
        }
        await convRef.collection('messages').add({
            direction: 'outbound', type: 'template', content: preview, templateName: template, metaMessageId: messageId,
            agentUid: 'delivery-alerts', agentName: 'Alerta de entrega', status: 'sent', timestamp: FieldValue.serverTimestamp(),
        });
    } catch (err) {
        console.warn('[delivery-alerts] Sent but could not record it in the inbox:', err instanceof Error ? err.message : err);
    }
    return { ok: true };
}

/**
 * Customer's answer to the alert (button or location pin). Returns the text to reply with, or null
 * when the message is not part of a delivery alert (the normal flow continues).
 */
export async function handleDeliveryReply(input: {
    from: string;
    text: string;
    location?: { lat: number; lng: number; name?: string; address?: string };
    conversationId: string;
}): Promise<string | null> {
    const isConfirm = /^\s*confirmar\s*$/i.test(input.text);
    const isModify = /^\s*modificar\s*$/i.test(input.text);
    if (!isConfirm && !isModify && !input.location) return null;

    const db = getAdminDB();
    const snap = await db.collection('orders').where('alertaEntregaWa', '==', input.from).limit(10).get();
    const recent = snap.docs
        .map(d => ({ ref: d.ref, id: d.id, at: Date.parse(String(d.data().alertaEntregaEnviadaAt ?? '')) || toMs(d.data().alertaEntregaEnviadaAt) }))
        .filter(o => Date.now() - o.at < 30 * 3600 * 1000)
        .sort((a, b) => b.at - a.at)[0];
    if (!recent) return null;

    const convRef = db.collection('conversations').doc(input.conversationId);
    const now = new Date().toISOString();
    if (isConfirm) {
        await recent.ref.update({ entregaConfirmadaPorCliente: true, entregaConfirmadaAt: now });
        return '¡Gracias! Quedó confirmada tu entrega de mañana ✅ Si puedes, compártenos tu ubicación actual 📍 (clip 📎 > Ubicación) para llegar más rápido.';
    }
    if (isModify) {
        await recent.ref.update({ entregaModificacionSolicitada: true, entregaModificacionAt: now });
        await convRef.update({ tags: FieldValue.arrayUnion('modificar-entrega'), status: 'abierto' });
        return 'Entendido 🙏 Un asesor te contactará para ajustar tu entrega. ¿Qué necesitas cambiar: dirección, fecha u horario?';
    }
    if (input.location) {
        const { lat, lng, name, address } = input.location;
        await recent.ref.update({ ubicacionEntrega: { lat, lng, ...(name ? { name } : {}), ...(address ? { address } : {}), mapsUrl: `https://maps.google.com/?q=${lat},${lng}`, at: now } });
        return '¡Recibimos tu ubicación 📍! Gracias, el mensajero la tendrá para llegar a tu puerta.';
    }
    return null;
}
