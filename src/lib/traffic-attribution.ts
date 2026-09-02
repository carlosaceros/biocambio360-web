/**
 * Biocambio360 Traffic Attribution & Source Tracking
 * Tracks where customers come from (Meta Ads, Instagram, Google, Direct, Referrals, etc.)
 */

export interface TrafficAttribution {
    tipo: 'pauta_meta' | 'pauta_google' | 'pauta_tiktok' | 'organico' | 'directo' | 'referido';
    fuente: string;
    etiqueta: string;
    medio?: string;
    campana?: string;
    contenido?: string;
    termino?: string;
    fbclid?: string;
    gclid?: string;
    referrer?: string;
    landingPage?: string;
    timestamp: number;
}

const STORAGE_KEY_LAST = 'biocambio_attribution_last';
const STORAGE_KEY_FIRST = 'biocambio_attribution_first';

export function captureTrafficAttribution(): TrafficAttribution | null {
    if (typeof window === 'undefined') return null;

    try {
        const url = new URL(window.location.href);
        const params = url.searchParams;

        const utmSource = params.get('utm_source');
        const utmMedium = params.get('utm_medium');
        const utmCampaign = params.get('utm_campaign');
        const utmContent = params.get('utm_content');
        const utmTerm = params.get('utm_term');

        const fbclid = params.get('fbclid');
        const gclid = params.get('gclid');
        const ttclid = params.get('ttclid');
        const refCode = params.get('ref') || params.get('referral');

        if (refCode) {
            try {
                localStorage.setItem('biocambio_referral_code', refCode.trim().toUpperCase());
            } catch (e) {}
        }

        const rawReferrer = document.referrer || '';
        let referrerHost = '';
        if (rawReferrer) {
            try {
                referrerHost = new URL(rawReferrer).hostname.toLowerCase();
            } catch (e) {}
        }

        // Ignore internal navigation
        const currentHost = window.location.hostname.toLowerCase();
        const isInternalReferrer = referrerHost === currentHost || referrerHost.includes('biocambio360');

        // Check if there is new external attribution in current URL
        const hasUtmOrClickId = !!(utmSource || utmMedium || utmCampaign || fbclid || gclid || ttclid);
        const hasExternalReferrer = !isInternalReferrer && referrerHost.length > 0;

        // If no new incoming campaign/referrer, return existing stored attribution
        if (!hasUtmOrClickId && !hasExternalReferrer) {
            return getStoredTrafficAttribution();
        }

        let tipo: TrafficAttribution['tipo'] = 'directo';
        let fuente = 'Directo';
        let etiqueta = 'Directo';

        // 1. Meta / Instagram Ads Detection (Click ID or UTMs)
        if (fbclid || (utmSource && /facebook|fb|meta|instagram|ig/i.test(utmSource) && /cpc|ad|paid|stories|feed/i.test(utmMedium || ''))) {
            tipo = 'pauta_meta';
            const isIg = /instagram|ig/i.test(utmSource || '') || (referrerHost.includes('instagram'));
            fuente = isIg ? 'Instagram Ads' : 'Meta Ads';
            etiqueta = utmCampaign 
                ? `Pauta: ${utmCampaign}` 
                : (isIg ? 'Pauta: Instagram' : 'Pauta: Meta Ads');
        } 
        // 2. Google Ads Detection
        else if (gclid || (utmSource && /google/i.test(utmSource) && /cpc|paid|ad/i.test(utmMedium || ''))) {
            tipo = 'pauta_google';
            fuente = 'Google Ads';
            etiqueta = utmCampaign ? `Pauta: Google (${utmCampaign})` : 'Pauta: Google Ads';
        }
        // 3. TikTok Ads Detection
        else if (ttclid || (utmSource && /tiktok/i.test(utmSource))) {
            tipo = 'pauta_tiktok';
            fuente = 'TikTok Ads';
            etiqueta = utmCampaign ? `Pauta: TikTok (${utmCampaign})` : 'Pauta: TikTok Ads';
        }
        // 4. Other explicit UTM Source
        else if (utmSource) {
            fuente = utmSource;
            etiqueta = `Fuente: ${utmSource}${utmCampaign ? ` (${utmCampaign})` : ''}`;
            tipo = /ad|cpc|pauta/i.test(utmMedium || '') ? 'pauta_meta' : 'referido';
        }
        // 5. Referrer Analysis (Organic & Social)
        else if (hasExternalReferrer) {
            if (referrerHost.includes('instagram.com')) {
                tipo = 'organico';
                fuente = 'Instagram';
                etiqueta = 'Fuente: Ig';
            } else if (referrerHost.includes('facebook.com') || referrerHost.includes('fb.me')) {
                tipo = 'organico';
                fuente = 'Facebook';
                etiqueta = 'Fuente: Facebook';
            } else if (referrerHost.includes('google.')) {
                tipo = 'organico';
                fuente = 'Google';
                etiqueta = 'Orgánico: Google';
            } else if (referrerHost.includes('chatgpt.com') || referrerHost.includes('openai.com')) {
                tipo = 'referido';
                fuente = 'ChatGPT';
                etiqueta = 'Fuente: Chatgpt.com';
            } else if (referrerHost.includes('bing.')) {
                tipo = 'organico';
                fuente = 'Bing';
                etiqueta = 'Orgánico: Bing';
            } else if (referrerHost.includes('tiktok.com')) {
                tipo = 'organico';
                fuente = 'TikTok';
                etiqueta = 'Fuente: TikTok';
            } else if (referrerHost.includes('wa.me') || referrerHost.includes('whatsapp.com')) {
                tipo = 'referido';
                fuente = 'WhatsApp';
                etiqueta = 'Fuente: WhatsApp';
            } else {
                tipo = 'referido';
                fuente = referrerHost.replace(/^www\./, '');
                etiqueta = `Fuente: ${fuente}`;
            }
        }

        const attribution: TrafficAttribution = {
            tipo,
            fuente,
            etiqueta,
            medio: utmMedium || undefined,
            campana: utmCampaign || undefined,
            contenido: utmContent || undefined,
            termino: utmTerm || undefined,
            fbclid: fbclid || undefined,
            gclid: gclid || undefined,
            referrer: rawReferrer || undefined,
            landingPage: window.location.pathname + window.location.search,
            timestamp: Date.now()
        };

        // Save last-touch
        localStorage.setItem(STORAGE_KEY_LAST, JSON.stringify(attribution));

        // Save first-touch if not already present
        if (!localStorage.getItem(STORAGE_KEY_FIRST)) {
            localStorage.setItem(STORAGE_KEY_FIRST, JSON.stringify(attribution));
        }

        return attribution;
    } catch (err) {
        console.warn('[TrafficAttribution] Error capturing attribution:', err);
        return null;
    }
}

export function getStoredTrafficAttribution(): TrafficAttribution | null {
    if (typeof window === 'undefined') return null;
    try {
        const last = localStorage.getItem(STORAGE_KEY_LAST);
        if (last) return JSON.parse(last);

        const first = localStorage.getItem(STORAGE_KEY_FIRST);
        if (first) return JSON.parse(first);
    } catch (e) {}

    return {
        tipo: 'directo',
        fuente: 'Directo',
        etiqueta: 'Directo',
        timestamp: Date.now()
    };
}
