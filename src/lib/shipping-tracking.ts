/**
 * shipping-tracking.ts
 * Generador de URLs de rastreo directo para pedidos de Biocambio360
 * Integrado con 99 Envíos, transportadoras colombianas y Flota Propia local.
 */

export interface TrackingInfo {
    carrierName: string;
    trackingNumber: string;
    trackingUrl: string;
    isLocalFleet: boolean;
}

/**
 * Normaliza el nombre de la transportadora a una etiqueta limpia
 */
export function getCarrierDisplayName(carrierKey?: string): string {
    if (!carrierKey) return '99 Envíos';
    const clean = carrierKey.toLowerCase().trim();

    if (clean.includes('flota') || clean.includes('propia') || clean.includes('local') || clean.includes('domicilio')) {
        return 'Flota Propia Biocambio360';
    }
    if (clean.includes('inter') || clean.includes('rapidisimo')) {
        return 'Interrapidísimo';
    }
    if (clean.includes('coord') || clean.includes('coordinadora')) {
        return 'Coordinadora';
    }
    if (clean.includes('servi') || clean.includes('servientrega')) {
        return 'Servientrega';
    }
    if (clean.includes('envia')) {
        return 'Envía';
    }
    if (clean.includes('tcc')) {
        return 'TCC';
    }
    return '99 Envíos';
}

/**
 * Retorna la URL directa de seguimiento según la transportadora y número de guía
 */
export function getTrackingUrl(carrierKey?: string, trackingNumber?: string, orderId?: string): string {
    const cleanCarrier = (carrierKey || '').toLowerCase().trim();
    const cleanGuia = (trackingNumber || '').trim();

    // 1. Envíos locales por Flota Propia Biocambio360
    if (cleanCarrier.includes('flota') || cleanCarrier.includes('propia') || cleanCarrier.includes('local') || cleanCarrier.includes('domicilio')) {
        return orderId 
            ? `https://biocambio360.com/confirmacion/${orderId}`
            : 'https://biocambio360.com';
    }

    // 2. Si no hay guía aún, dirigir a la página de confirmación del pedido
    if (!cleanGuia) {
        return orderId
            ? `https://biocambio360.com/confirmacion/${orderId}`
            : 'https://biocambio360.com';
    }

    // 3. URLs directas por transportadora oficial
    if (cleanCarrier.includes('inter') || cleanCarrier.includes('rapidisimo')) {
        return `https://www.interrapidisimo.com/sigue-tu-envio/?guia=${encodeURIComponent(cleanGuia)}`;
    }
    if (cleanCarrier.includes('coord') || cleanCarrier.includes('coordinadora')) {
        return `https://coordinadora.com/rastreo/rastreo-de-guia/detalle-de-rastreo-de-guia/?guia=${encodeURIComponent(cleanGuia)}`;
    }
    if (cleanCarrier.includes('servi') || cleanCarrier.includes('servientrega')) {
        return `https://www.servientrega.com/wps/portal/rastreo-envio?guia=${encodeURIComponent(cleanGuia)}`;
    }
    if (cleanCarrier.includes('envia')) {
        return `https://envia.co/?guia=${encodeURIComponent(cleanGuia)}`;
    }
    if (cleanCarrier.includes('tcc')) {
        return `https://tcc.com.co/logistica/rastrear-envios/?guia=${encodeURIComponent(cleanGuia)}`;
    }

    // 4. Portal 99 Envíos por defecto
    return `https://99envios.app/tracking/${encodeURIComponent(cleanGuia)}`;
}
