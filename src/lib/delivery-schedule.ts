/**
 * Delivery calendar of the own fleet (Bogotá and nearby towns).
 *
 * A route serves a group of zones (localidades / municipios) on certain days:
 *   - `daily`     every day,
 *   - `weekdays`  fixed weekdays (0 = Sunday … 6 = Saturday),
 *   - `dates`     an explicit list of days per month ({ "2026-09": [1, 3, 7] }).
 * `validFrom` / `validTo` limit a route to a period. Driver name and phone are INTERNAL data: nothing in
 * this file's public helpers (the ones the AI agent uses) ever exposes them.
 *
 * Pure functions only (no I/O): usable from the admin screen, the API and the agent.
 */

export type ScheduleMode = 'daily' | 'weekdays' | 'dates';

export interface DeliveryRoute {
    id: string;
    name: string;
    zones: string[];
    mode: ScheduleMode;
    weekdays?: number[];
    dates?: Record<string, number[]>;
    validFrom?: string;
    validTo?: string;
    /** Public note the agent may mention ("Facatativá: pedido mínimo…") */
    publicNote?: string;
    /** INTERNAL — never shown to customers */
    driverName?: string;
    driverPhone?: string;
    notes?: string;
    active: boolean;
}

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const weekdayName = (i: number) => WEEKDAYS[i] ?? '';
export const monthName = (i: number) => MONTHS[i] ?? '';

const pad = (n: number) => String(n).padStart(2, '0');
const utc = (ymd: string) => {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
};
export const toYmd = (dt: Date) => `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
export const addDays = (ymd: string, n: number) => toYmd(new Date(utc(ymd).getTime() + n * 86400000));

/** "viernes 25 de septiembre": the weekday is always included. */
export function formatDayEs(ymd: string): string {
    const dt = utc(ymd);
    return `${WEEKDAYS[dt.getUTCDay()]} ${dt.getUTCDate()} de ${MONTHS[dt.getUTCMonth()]}`;
}

export function routeDeliversOn(route: DeliveryRoute, ymd: string): boolean {
    if (!route.active) return false;
    if (route.validFrom && ymd < route.validFrom) return false;
    if (route.validTo && ymd > route.validTo) return false;
    if (route.mode === 'daily') return true;
    const dt = utc(ymd);
    if (route.mode === 'weekdays') return (route.weekdays ?? []).includes(dt.getUTCDay());
    return (route.dates?.[ymd.slice(0, 7)] ?? []).includes(dt.getUTCDate());
}

/** Routes that deliver on a date. */
export const routesOn = (routes: DeliveryRoute[], ymd: string) => routes.filter(r => routeDeliversOn(r, ymd));

// ─── Zone matching ────────────────────────────────────────────────────────────

export const normalizeZone = (text: string) =>
    String(text ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/\([^)]*\)/g, ' ')
        .replace(/\bcdad\b/g, 'ciudad')
        .replace(/\bpte\b/g, 'puente')
        .replace(/[^a-z0-9 ]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^(la|el|los|las) /, '');

/** Phrases that identify a zone inside free text ("rafael uribe" also matches "Rafael Uribe Uribe"). */
function zonePhrases(zone: string): string[] {
    const core = normalizeZone(zone);
    const words = core.split(' ');
    const phrases = new Set<string>([core]);
    if (words.length >= 3) phrases.add(words.slice(0, -1).join(' '));
    return [...phrases].filter(p => p.length >= 4);
}

/** Zones (of active routes) mentioned in a text. */
export function matchZones(routes: DeliveryRoute[], text: string): Array<{ zone: string; route: DeliveryRoute }> {
    const haystack = ` ${normalizeZone(text)} `.replace(/^ (la|el|los|las) /, ' ');
    const found: Array<{ zone: string; route: DeliveryRoute }> = [];
    for (const route of routes) {
        if (!route.active) continue;
        for (const zone of route.zones) {
            if (zonePhrases(zone).some(p => haystack.includes(` ${p} `))) found.push({ zone, route });
        }
    }
    return found;
}

/** Next delivery days (from `fromYmd`, inclusive) for a route. */
export function nextRouteDates(route: DeliveryRoute, fromYmd: string, count = 3, horizonDays = 75): string[] {
    const out: string[] = [];
    for (let i = 0; i <= horizonDays && out.length < count; i++) {
        const ymd = addDays(fromYmd, i);
        if (routeDeliversOn(route, ymd)) out.push(ymd);
    }
    return out;
}

/**
 * Public summary of the schedule of the zones mentioned in `text`, for the agent's context.
 * Only zone names and dates: never drivers, phones or internal notes.
 */
export function buildScheduleContext(routes: DeliveryRoute[], text: string, todayYmd: string): string {
    const matches = matchZones(routes, text);
    const header = `HOY es ${formatDayEs(todayYmd)}.`;
    if (matches.length === 0) {
        const zones = [...new Set(routes.filter(r => r.active).flatMap(r => r.zones.map(z => z.replace(/\s*\([^)]*\)/g, '').trim())))];
        return `${header} Zona del cliente sin identificar: pregúntale su localidad o municipio (no el barrio). Zonas con entregas programadas: ${zones.join(', ')}. Si está fuera de esas zonas, di que un asesor confirma.`;
    }
    const lines: string[] = [];
    const seen = new Set<string>();
    for (const { zone, route } of matches) {
        const key = `${route.id}|${zone}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const dates = nextRouteDates(route, todayYmd, 3);
        const label =
            route.mode === 'daily'
                ? `entregas todos los días. Frase modelo: "Tenemos entregas todos los días para tu zona: ${zone}."`
                : dates.length
                ? `próximas entregas: ${dates.map(formatDayEs).join('; ')}. Frase modelo: "Para el día ${formatDayEs(dates[0])} tenemos programada entrega para tu zona: ${zone}."`
                : 'sin fechas programadas por ahora (un asesor confirma)';
        lines.push(`- ${zone}: ${label}${route.publicNote ? ` (${route.publicNote})` : ''}`);
    }
    return `${header}\n${lines.join('\n')}`;
}
