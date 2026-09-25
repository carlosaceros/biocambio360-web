/**
 * Abandoned-cart automation: timing, channels and shared helpers.
 *
 * Reminder steps run relative to the customer's LAST ACTIVITY on the cart (its `updatedAt`):
 *   step 1 → 2 h, step 2 → 8 h, step 3 → 24 h.
 * Each step has a grace window so a delayed run still sends it, but a cart that is far past its
 * moment (e.g. an old cart found after a deploy) never receives a stale reminder.
 */

import { getAdminDB } from '@/lib/firebase-admin';

export const CART_STEP_HOURS = [2, 8, 24] as const;
export const CART_STEP_GRACE_HOURS = 5;
export const CART_TAG = 'carrito-abandonado';
export const CART_TEMPLATE_DEFAULT = 'carrito_abandonado';

export interface CartAutomationConfig {
    emailEnabled: boolean;
    whatsappEnabled: boolean;
    /** which steps (1-3) also go out by WhatsApp */
    whatsappSteps: number[];
    whatsappTemplate: string;
}

const DEFAULTS: CartAutomationConfig = {
    emailEnabled: true,
    whatsappEnabled: false,
    whatsappSteps: [1, 3],
    whatsappTemplate: CART_TEMPLATE_DEFAULT,
};

export async function loadCartConfig(): Promise<CartAutomationConfig> {
    try {
        const snap = await getAdminDB().collection('bot_config').doc('abandoned_cart').get();
        const d = snap.data() ?? {};
        return {
            emailEnabled: d.emailEnabled !== false,
            whatsappEnabled: d.whatsappEnabled === true,
            whatsappSteps: Array.isArray(d.whatsappSteps) ? d.whatsappSteps.map(Number).filter(n => [1, 2, 3].includes(n)) : DEFAULTS.whatsappSteps,
            whatsappTemplate: typeof d.whatsappTemplate === 'string' && d.whatsappTemplate ? d.whatsappTemplate : DEFAULTS.whatsappTemplate,
        };
    } catch {
        return DEFAULTS;
    }
}

/**
 * The reminder due for a cart (1-3) or null. `sentCount` is the highest step already processed.
 * Only one step can be due at a time: the windows [2,7), [8,13) and [24,29) hours never overlap.
 */
export function dueStep(hoursSinceActivity: number, sentCount: number): 1 | 2 | 3 | null {
    for (let i = 0; i < CART_STEP_HOURS.length; i++) {
        const start = CART_STEP_HOURS[i];
        if (hoursSinceActivity >= start && hoursSinceActivity < start + CART_STEP_GRACE_HOURS && sentCount < i + 1) {
            return (i + 1) as 1 | 2 | 3;
        }
    }
    return null;
}

/** "Detergente X (20L) y 1 producto más" (max ~60 chars for the WhatsApp variable). */
export function cartSummary(items: Array<{ nombre?: string; size?: string; cantidad?: number }>): string {
    const list = Array.isArray(items) ? items.filter(i => i?.nombre) : [];
    if (list.length === 0) return 'tus productos de aseo';
    const first = list[0];
    let main = `${first.nombre}${first.size && first.size !== 'DEFAULT' ? ` (${first.size})` : ''}`.replace(/\s{2,}/g, ' ').trim();
    if (main.length > 48) main = `${main.slice(0, 45).trimEnd()}...`;
    const more = list.length - 1;
    return more > 0 ? `${main} y ${more} producto${more > 1 ? 's' : ''} más` : main;
}

export function cartFirstName(fullName?: string): string {
    const first = String(fullName ?? '').trim().split(/\s+/)[0] ?? '';
    if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,20}$/.test(first)) return 'cliente';
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

/** Text shown in the inbox for the template message (must mirror the approved Meta template). */
export function cartTemplateText(name: string, summary: string): string {
    return `¡Hola ${name}! 👋 Dejaste tu pedido a medias en Biocambio360: ${summary}.\n\nTus datos ya están guardados: termínalo en 1 clic y te lo despachamos directo de fábrica. Si tienes dudas, responde este mensaje y te ayudamos 🙌`;
}

export function cartTemplateComponents(name: string, summary: string, token: string) {
    return [
        { type: 'body' as const, parameters: [{ type: 'text' as const, text: name }, { type: 'text' as const, text: summary }] },
        { type: 'button' as const, sub_type: 'url' as const, index: '0', parameters: [{ type: 'text' as const, text: token }] },
    ];
}

/** Customer phone → WhatsApp id ("57" + last 10 digits) or null. */
export function toWhatsappId(phone?: string): string | null {
    const digits = String(phone ?? '').replace(/\D/g, '');
    return digits.length >= 10 ? `57${digits.slice(-10)}` : null;
}

export function toMs(v: unknown): number {
    const t = v as { toMillis?: () => number; seconds?: number; _seconds?: number } | string | number | undefined | null;
    if (t && typeof t === 'object') {
        if (typeof t.toMillis === 'function') return t.toMillis();
        if (typeof t.seconds === 'number') return t.seconds * 1000;
        if (typeof t._seconds === 'number') return t._seconds * 1000;
    }
    if (typeof t === 'number') return t;
    const parsed = Date.parse(String(t ?? ''));
    return Number.isFinite(parsed) ? parsed : 0;
}
