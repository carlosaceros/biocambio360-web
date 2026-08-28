'use client';

export const FB_PIXEL_ID = '1261044985153442';

declare global {
    interface Window {
        fbq: any;
        _fbq: any;
    }
}

/**
 * Safely dispatches a Meta Pixel standard event if window.fbq is initialized.
 */
export function trackPixelEvent(eventName: string, params?: Record<string, any>) {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
        try {
            if (params) {
                window.fbq('track', eventName, params);
            } else {
                window.fbq('track', eventName);
            }
        } catch (err) {
            console.warn(`[Meta Pixel] Error tracking ${eventName}:`, err);
        }
    }
}

/**
 * Track PageView
 */
export function trackPageView() {
    trackPixelEvent('PageView');
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
}

export function trackViewContent({
    content_ids,
    content_name,
    content_type = 'product',
    currency = 'COP',
    value = 0,
}: ViewContentParams) {
    trackPixelEvent('ViewContent', {
        content_ids,
        content_name,
        content_type,
        currency,
        value: Math.round(value),
    });
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
}

export function trackAddToCart({
    content_ids,
    content_name,
    content_type = 'product',
    currency = 'COP',
    value = 0,
    num_items = 1,
}: AddToCartParams) {
    trackPixelEvent('AddToCart', {
        content_ids,
        content_name,
        content_type,
        currency,
        value: Math.round(value),
        num_items,
    });
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
}

export function trackInitiateCheckout({
    content_ids,
    content_type = 'product',
    currency = 'COP',
    value,
    num_items,
}: InitiateCheckoutParams) {
    trackPixelEvent('InitiateCheckout', {
        content_ids,
        content_type,
        currency,
        value: Math.round(value),
        num_items,
    });
}

/**
 * Track AddPaymentInfo: Dispara cuando ingresa o selecciona datos de pago
 */
export interface AddPaymentInfoParams {
    content_ids: string[];
    content_type?: string;
    currency?: string;
    value: number;
}

export function trackAddPaymentInfo({
    content_ids,
    content_type = 'product',
    currency = 'COP',
    value,
}: AddPaymentInfoParams) {
    trackPixelEvent('AddPaymentInfo', {
        content_ids,
        content_type,
        currency,
        value: Math.round(value),
    });
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
}

export function trackPurchase({
    content_ids,
    content_type = 'product',
    currency = 'COP',
    value,
    num_items,
    order_id,
}: PurchaseParams) {
    trackPixelEvent('Purchase', {
        content_ids,
        content_type,
        currency,
        value: Math.round(value),
        num_items,
        order_id,
    });
}
