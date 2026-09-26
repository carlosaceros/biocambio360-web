/**
 * Kommo → inbox bridge. Kommo webhooks post `application/x-www-form-urlencoded` bodies with bracket keys
 * (message[add][0][text]=…). Only OUTGOING chat messages are used: incoming ones already reach the
 * inbox through the Meta webhook. The contact's phone is read from the Kommo API (long-lived token).
 */

/** "message[add][0][author][name]" → { message: { add: [ { author: { name } } ] } } */
export function parseBracketForm(raw: string): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of new URLSearchParams(raw)) {
        const path = key.replace(/\]/g, '').split('[');
        let node: Record<string, unknown> = out;
        path.forEach((part, i) => {
            if (i === path.length - 1) node[part] = value;
            else node = (node[part] = (node[part] as Record<string, unknown>) ?? {}) as Record<string, unknown>;
        });
    }
    return out;
}

export interface KommoOutgoing {
    id: string;
    text: string;
    contactId: string;
    createdAt: number;
    authorId: string;
    authorName: string;
    authorType: string;
}

const list = (v: unknown): Array<Record<string, unknown>> =>
    Array.isArray(v) ? (v as Array<Record<string, unknown>>) : v && typeof v === 'object' ? Object.values(v as Record<string, Record<string, unknown>>) : [];

/** Outgoing chat messages found in a webhook body (form or JSON). */
export function extractOutgoing(body: Record<string, unknown>): KommoOutgoing[] {
    const added = list((body.message as Record<string, unknown> | undefined)?.add);
    const out: KommoOutgoing[] = [];
    for (const m of added) {
        if (String(m.type ?? '') !== 'outgoing') continue;
        const author = (m.author ?? {}) as Record<string, unknown>;
        out.push({
            id: String(m.id ?? ''),
            text: String(m.text ?? ''),
            contactId: String(m.contact_id ?? ''),
            createdAt: Number(m.created_at) || Math.floor(Date.now() / 1000),
            authorId: String(author.id ?? ''),
            authorName: String(author.name ?? ''),
            authorType: String(author.type ?? ''),
        });
    }
    return out.filter(m => m.id && m.contactId);
}

const phoneCache = new Map<string, string>();

/** Phone of a Kommo contact (needs KOMMO_HOST and KOMMO_TOKEN). */
export async function kommoContactPhone(contactId: string): Promise<string | null> {
    if (phoneCache.has(contactId)) return phoneCache.get(contactId) ?? null;
    const host = process.env.KOMMO_HOST;
    const token = process.env.KOMMO_TOKEN;
    if (!host || !token) return null;
    try {
        const res = await fetch(`https://${host}/api/v4/contacts/${encodeURIComponent(contactId)}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return null;
        const data = (await res.json()) as { custom_fields_values?: Array<{ field_code?: string; values?: Array<{ value?: string }> }> };
        const phone = data.custom_fields_values?.find(f => f.field_code === 'PHONE')?.values?.[0]?.value ?? null;
        if (phone) phoneCache.set(contactId, phone);
        return phone;
    } catch {
        return null;
    }
}

// ─── Kommo REST API helpers (private integration, long-lived token) ──────────

async function kommoGet<T>(path: string): Promise<T | null> {
    const host = process.env.KOMMO_HOST;
    const token = process.env.KOMMO_TOKEN;
    if (!host || !token) return null;
    try {
        const res = await fetch(`https://${host}${path}`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.status === 204) return null;
        if (!res.ok) {
            console.warn(`[kommo] GET ${path.split('?')[0]} → ${res.status}`);
            return null;
        }
        return (await res.json()) as T;
    } catch (err) {
        console.warn('[kommo] request failed:', err instanceof Error ? err.message : err);
        return null;
    }
}

let usersCache: { at: number; map: Map<number, string> } | null = null;

/** Kommo users (advisors): id → name, cached 30 min. */
export async function kommoUserNames(): Promise<Map<number, string>> {
    if (usersCache && Date.now() - usersCache.at < 30 * 60 * 1000) return usersCache.map;
    const data = await kommoGet<{ _embedded?: { users?: Array<{ id: number; name: string }> } }>('/api/v4/users?limit=250');
    const map = new Map<number, string>((data?._embedded?.users ?? []).map(u => [u.id, u.name]));
    if (map.size > 0) usersCache = { at: Date.now(), map };
    return map;
}

/** First contact id linked to a lead. */
export async function kommoLeadContactId(leadId: string): Promise<string | null> {
    const data = await kommoGet<{ _embedded?: { contacts?: Array<{ id: number }> } }>(`/api/v4/leads/${encodeURIComponent(leadId)}?with=contacts`);
    const id = data?._embedded?.contacts?.[0]?.id;
    return id ? String(id) : null;
}

export interface KommoChatEvent {
    id: string;
    entityId: string;
    entityType: string;
    createdBy: number;
    createdAt: number;
}

/** Outgoing chat message events since `fromSec` (unix seconds), oldest first. */
export async function kommoOutgoingEvents(fromSec: number, maxPages = 5): Promise<KommoChatEvent[]> {
    const out: KommoChatEvent[] = [];
    for (let page = 1; page <= maxPages; page++) {
        const data = await kommoGet<{ _embedded?: { events?: Array<Record<string, unknown>> } }>(
            `/api/v4/events?filter[type][]=outgoing_chat_message&filter[created_at][from]=${fromSec}&limit=100&page=${page}`
        );
        const events = data?._embedded?.events ?? [];
        for (const e of events) {
            out.push({ id: String(e.id), entityId: String(e.entity_id), entityType: String(e.entity_type), createdBy: Number(e.created_by) || 0, createdAt: Number(e.created_at) || 0 });
        }
        if (events.length < 100) break;
    }
    return out.sort((a, b) => a.createdAt - b.createdAt);
}
