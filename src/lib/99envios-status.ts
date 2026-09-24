/**
 * Classifies a shipping status/event coming from 99 Envíos into what the CRM cares about.
 * Pure function (no I/O) so it can be tested.
 *
 * Exceptions are evaluated BEFORE deliveries, otherwise "no_entregado" would match "entregado".
 * Intermediate states such as "en entrega" / "por entregar" are informational, never a delivery.
 */

export type ShippingEventKind = 'entregado' | 'novedad' | 'informativo';

function normalize(text: string): string {
    return String(text ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

const EXCEPTION =
    /\b(no entregad[oa]s?|no se entrega|no se pudo entregar|no fue entregad[oa]|fallid[oa]s?|failed|devuelt[oa]s?|devolucion|returned|rechazad[oa]s?|undeliver\w*|exception|novedad(es)?|siniestro|extraviad[oa]s?|perdid[oa]s?)\b/;

const DELIVERED =
    /\b(entregad[oa]s?|entrega exitosa|entrega efectiva|delivered|finalizad[oa]s?)\b/;

export function classifyShippingEvent(status?: string, event?: string): ShippingEventKind {
    const text = normalize(`${status ?? ''} ${event ?? ''}`);
    if (!text) return 'informativo';
    if (EXCEPTION.test(text)) return 'novedad';
    if (DELIVERED.test(text)) return 'entregado';
    return 'informativo';
}
