import crypto from 'crypto';

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '1261044985153442';
const CAPI_TOKEN = process.env.META_CAPI_TOKEN || 'EAAN81ZBZBndBoBSVlH3oLDVlzTJcaiSqsnhgiYXPIPVpayBawSNz5F8iIAdJTD1puGss7bO2MsC0nBWIZAEUT3RIx72JTZAEp5Lu2kTvki49QaZAYybXvGq7MTi5awP0lADW1QsgegLwBq4yQx7g6ueayO3f9XtSWC3F0CLzMAaqBEQJFMCOpkNiQftTvjfzpmAZDZD';
const API_URL = `https://graph.facebook.com/v21.0/${PIXEL_ID}/events`;

/**
 * Normaliza y hashea en SHA-256 según el estándar de Meta.
 */
function hash(value: string): string {
    return crypto
        .createHash('sha256')
        .update(value.trim().toLowerCase())
        .digest('hex');
}

/**
 * Normaliza número de teléfono al formato internacional E.164 (para Colombia +57) antes de hashear.
 */
function normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('3')) {
        return `57${digits}`;
    }
    return digits;
}

export interface CapiUserData {
    em?: string; // Email (crudo o ya hasheado)
    ph?: string; // Teléfono (crudo o ya hasheado)
    fn?: string; // Nombre de pila
    ln?: string; // Apellido
    ct?: string; // Ciudad
    zp?: string; // Código postal
    country?: string; // País en ISO de 2 letras (ej. 'co')
    client_ip_address?: string;
    client_user_agent?: string;
    fbc?: string; // fbclid cookie
    fbp?: string; // _fbp cookie
}

export interface CapiCustomData {
    currency?: string;
    value?: number;
    content_ids?: string[];
    content_name?: string;
    content_type?: string;
    order_id?: string;
    num_items?: number;
    contents?: Array<{
        id: string;
        quantity: number;
        item_price?: number;
    }>;
}

export interface CapiEvent {
    event_name: 'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'AddPaymentInfo' | 'Purchase';
    event_time: number;
    event_source_url: string;
    event_id?: string; // Clave única de deduplicación con el Pixel del navegador
    action_source?: 'website' | 'app' | 'physical_store' | 'system_generated' | 'other';
    user_data: CapiUserData;
    custom_data?: CapiCustomData;
}

/**
 * Envía eventos a la Conversions API (CAPI) de Meta.
 */
export async function sendCapiEvent(events: CapiEvent[]) {
    if (!CAPI_TOKEN) {
        console.warn('[Meta CAPI] Warning: META_CAPI_TOKEN is not defined.');
        return { ok: false, error: 'META_CAPI_TOKEN_MISSING' };
    }

    const payload = {
        data: events.map(e => ({
            event_name: e.event_name,
            event_time: e.event_time || Math.floor(Date.now() / 1000),
            event_source_url: e.event_source_url,
            event_id: e.event_id,
            action_source: e.action_source || 'website',
            user_data: {
                ...e.user_data,
                em: e.user_data.em ? (e.user_data.em.includes('@') ? hash(e.user_data.em) : e.user_data.em) : undefined,
                ph: e.user_data.ph ? hash(normalizePhone(e.user_data.ph)) : undefined,
                fn: e.user_data.fn ? hash(e.user_data.fn) : undefined,
                ln: e.user_data.ln ? hash(e.user_data.ln) : undefined,
                ct: e.user_data.ct ? hash(e.user_data.ct) : undefined,
                country: e.user_data.country ? hash(e.user_data.country.toLowerCase()) : hash('co'),
            },
            custom_data: e.custom_data ? {
                currency: e.custom_data.currency || 'COP',
                ...e.custom_data,
            } : undefined,
        })),
        test_event_code: process.env.META_TEST_EVENT_CODE || undefined,
    };

    try {
        const res = await fetch(`${API_URL}?access_token=${CAPI_TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
            console.error('[Meta CAPI] Error response from Meta:', data);
        } else {
            console.log(`[Meta CAPI] Successfully sent ${events.length} event(s) (${events.map(ev => ev.event_name).join(', ')})`);
        }
        return data;
    } catch (err) {
        console.error('[Meta CAPI] Network error sending events:', err);
        return { ok: false, error: String(err) };
    }
}
