/** Server side of the delivery calendar: loads the routes and builds the agent's public context. */

import { getAdminDB } from '@/lib/firebase-admin';
import { bogotaDate } from '@/lib/delivery-alerts';
import { buildScheduleContext, type DeliveryRoute } from '@/lib/delivery-schedule';

const CACHE_MS = 60 * 1000;
let cache: { at: number; routes: DeliveryRoute[] } | null = null;

export function invalidateDeliveryRoutesCache(): void {
    cache = null;
}

export async function loadDeliveryRoutes(): Promise<DeliveryRoute[]> {
    if (cache && Date.now() - cache.at < CACHE_MS) return cache.routes;
    try {
        const snap = await getAdminDB().collection('delivery_routes').get();
        const routes = snap.docs.map(d => ({ ...(d.data() as Omit<DeliveryRoute, 'id'>), id: d.id }) as DeliveryRoute);
        cache = { at: Date.now(), routes };
        return routes;
    } catch (err) {
        console.warn('[delivery-schedule] Could not load routes:', err instanceof Error ? err.message : err);
        return [];
    }
}

const ASKS_DELIVERY = /(entreg|env[ií]o|env[ií]an|domicilio|llega|llegar|llegan|despach|ruta|programad|cu[aá]ndo|fecha|qu[eé] d[ií]a)/i;
const ASKED_ZONE = /localidad|municipio|zona|d[oó]nde (est[aá]s|vives)|de d[oó]nde/i;

/**
 * Public delivery-schedule context for the agent, or null when the conversation is not about delivery.
 * `customerTexts` are the customer's recent messages; `lastAgentText` the agent's previous message.
 */
export async function deliveryContextFor(input: {
    lastText: string;
    customerTexts: string[];
    lastAgentText?: string;
    placeText?: string;
    orderReady?: boolean;
}): Promise<string | null> {
    const routes = await loadDeliveryRoutes();
    if (routes.length === 0) return null;
    const asks = ASKS_DELIVERY.test(input.lastText);
    const answeringZone = !!input.lastAgentText && ASKED_ZONE.test(input.lastAgentText);
    if (!asks && !answeringZone && !input.orderReady) return null;
    const text = `${input.customerTexts.join(' ')} ${input.placeText ?? ''}`;
    return buildScheduleContext(routes, text, bogotaDate(0));
}
