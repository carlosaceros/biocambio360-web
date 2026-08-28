'use client';

export const FB_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '1261044985153442';

declare global {
    interface Window {
        fbq: any;
        _fbq: any;
    }
}

export interface MetaUserData {
    email?: string;
    phone?: string;
    name?: string;
    city?: string;
}

/**
 * Genera un event_id único para deduplicación entre Browser Pixel y Server CAPI.
 */
export function generateEventId(prefix: string = 'evt'): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `${prefix}_${crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Helper universal para llamar a cualquier evento con sincronización automática Browser + CAPI.
 */
export async function trackEvent(
    eventName: 'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'AddPaymentInfo' | 'Purchase' | string,
    customData?: Record<string, any>,
    emailOrUserData?: string | MetaUserData
) {
    const userData: MetaUserData = typeof emailOrUserData === 'string' 
        ? { email: emailOrUserData } 
        : (emailOrUserData || {});
    
    return trackPixelAndCapi(eventName as any, customData, userData);
}

/**
 * Envía el evento tanto al Pixel del navegador como a la API de Conversiones (CAPI) del servidor
 * utilizando el mismo event_id para deduplicación exacta.
 */
export function trackPixelAndCapi(
    eventName: 'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'AddPaymentInfo' | 'Purchase',
    params?: Record<string, any>,
    userData?: MetaUserData,
    eventId?: string
) {
    const finalEventId = eventId || (params?.order_id ? `pur_${params.order_id}` : generateEventId(eventName.toLowerCase()));

    // 1. Browser Meta Pixel
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
        try {
            if (params) {
                window.fbq('track', eventName, params, { eventID: finalEventId });
            } else {
                window.fbq('track', eventName, {}, { eventID: finalEventId });
            }
        } catch (err) {
            console.warn(`[Meta Pixel] Error tracking ${eventName}:`, err);
        }
    }

    // 2. Server-Side Meta Conversions API (CAPI)
    if (typeof window !== 'undefined') {
        try {
            fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                keepalive: true,
                body: JSON.stringify({
                    event_name: eventName,
                    custom_data: params,
                    event_id: finalEventId,
                    email: userData?.email,
                    phone: userData?.phone,
                    name: userData?.name,
                    city: userData?.city,
                    url: window.location.href,
                }),
            }).catch(e => {
                // Silently ignore background network errors on client side
            });
        } catch (e) {
            // Ignore error
        }
    }
}

/**
 * Track PageView
 */
export function trackPageView(userData?: MetaUserData) {
    trackPixelAndCapi('PageView', undefined, userData);
}

/**
 * Track ViewContent: Dispara cuando el usuario abre la página de un producto
 */
export interface ViewContentParams {
    content_ids: string[];
    content_name: string;
    content_type?: string;
    currency?: string;
    value?: number;
    userData?: MetaUserData;
}

export function trackViewContent({
    content_ids,
    content_name,
    content_type = 'product',
    currency = 'COP',
    value = 0,
    userData,
}: ViewContentParams) {
    trackPixelAndCapi(
        'ViewContent',
        {
            content_ids,
            content_name,
            content_type,
            currency,
            value: Math.round(value),
        },
        userData
    );
}

/**
 * Track AddToCart: Dispara cuando el usuario agrega al carrito
 */
export interface AddToCartParams {
    content_ids: string[];
    content_name: string;
    content_type?: string;
    currency?: string;
    value?: number;
    num_items?: number;
    userData?: MetaUserData;
}

export function trackAddToCart({
    content_ids,
    content_name,
    content_type = 'product',
    currency = 'COP',
    value = 0,
    num_items = 1,
    userData,
}: AddToCartParams) {
    trackPixelAndCapi(
        'AddToCart',
        {
            content_ids,
            content_name,
            content_type,
            currency,
            value: Math.round(value),
            num_items,
        },
        userData
    );
}

/**
 * Track InitiateCheckout: Dispara al iniciar el proceso de pago
 */
export interface InitiateCheckoutParams {
    content_ids: string[];
    content_type?: string;
    currency?: string;
    value: number;
    num_items: number;
    userData?: MetaUserData;
}

export function trackInitiateCheckout({
    content_ids,
    content_type = 'product',
    currency = 'COP',
    value,
    num_items,
    userData,
}: InitiateCheckoutParams) {
    trackPixelAndCapi(
        'InitiateCheckout',
        {
            content_ids,
            content_type,
            currency,
            value: Math.round(value),
            num_items,
        },
        userData
    );
}

/**
 * Track AddPaymentInfo: Dispara cuando ingresa o selecciona datos de pago
 */
export interface AddPaymentInfoParams {
    content_ids: string[];
    content_type?: string;
    currency?: string;
    value: number;
    userData?: MetaUserData;
}

export function trackAddPaymentInfo({
    content_ids,
    content_type = 'product',
    currency = 'COP',
    value,
    userData,
}: AddPaymentInfoParams) {
    trackPixelAndCapi(
        'AddPaymentInfo',
        {
            content_ids,
            content_type,
            currency,
            value: Math.round(value),
        },
        userData
    );
}

/**
 * Track Purchase: Dispara en la página de confirmación de orden
 */
export interface PurchaseParams {
    content_ids: string[];
    content_type?: string;
    currency?: string;
    value: number;
    num_items: number;
    order_id: string;
    userData?: MetaUserData;
}

export function trackPurchase({
    content_ids,
    content_type = 'product',
    currency = 'COP',
    value,
    num_items,
    order_id,
    userData,
}: PurchaseParams) {
    trackPixelAndCapi(
        'Purchase',
        {
            content_ids,
            content_type,
            currency,
            value: Math.round(value),
            num_items,
            order_id,
        },
        userData,
        `pur_${order_id}`
    );
}
