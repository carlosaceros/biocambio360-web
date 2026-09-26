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
