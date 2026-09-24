/**
 * Facebook Messenger + Instagram Direct helpers (Graph API).
 * Uses the system-user token to obtain the Page access token, which is what Messenger and the
 * Instagram Messaging API (Instagram account linked to the Page) require.
 */

const GRAPH = 'https://graph.facebook.com/v21.0';

export type SocialChannel = 'messenger' | 'instagram';

interface PageAccess {
    pageId: string;
    token: string;
    igId?: string;
}

let cached: { at: number; value: PageAccess } | null = null;
const CACHE_MS = 30 * 60 * 1000;

function systemToken(): string {
    const token = process.env.WHATSAPP_PERMANENT_TOKEN;
    if (!token) throw new Error('WHATSAPP_PERMANENT_TOKEN is not set');
    return token;
}

/** Page id + Page access token (+ linked Instagram account id). Cached for 30 minutes. */
export async function getPageAccess(): Promise<PageAccess> {
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;

    const wanted = process.env.META_PAGE_ID;
    const res = await fetch(
        `${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account{id}&limit=20&access_token=${systemToken()}`
    );
    const data = await res.json();
    if (!res.ok) throw new Error(`Page lookup failed: ${data?.error?.message ?? res.status}`);

    const page = (data.data ?? []).find((p: { id: string }) => !wanted || p.id === wanted) ?? data.data?.[0];
    if (!page?.access_token) throw new Error('No Facebook Page available for this token');

    const value: PageAccess = { pageId: page.id, token: page.access_token, igId: page.instagram_business_account?.id };
    cached = { at: Date.now(), value };
    return value;
}

export interface SocialProfile {
    name?: string;
    username?: string;
    profilePic?: string;
}

/** Customer's public profile for a Messenger PSID / Instagram IGSID. Fails soft (empty). */
export async function fetchSocialProfile(channel: SocialChannel, id: string): Promise<SocialProfile> {
    try {
        const { token } = await getPageAccess();
        const fields = channel === 'instagram' ? 'name,username,profile_pic' : 'name,profile_pic';
        const res = await fetch(`${GRAPH}/${encodeURIComponent(id)}?fields=${fields}&access_token=${token}`, {
            signal: AbortSignal.timeout(4000),
        });
        if (!res.ok) return {};
        const d = await res.json();
        return { name: d.name, username: d.username, profilePic: d.profile_pic };
    } catch {
        return {};
    }
}

/** Sends a text reply (inside the 24h customer-initiated window). Returns Meta's message id. */
export async function sendSocialText(_channel: SocialChannel, recipientId: string, text: string): Promise<{ messageId: string }> {
    const { pageId, token } = await getPageAccess();
    const res = await fetch(`${GRAPH}/${pageId}/messages?access_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            recipient: { id: recipientId },
            messaging_type: 'RESPONSE',
            message: { text },
        }),
    });
    const data = await res.json();
    if (!res.ok) {
        const msg = data?.error?.message ?? JSON.stringify(data);
        console.error('[meta-social] Send error:', msg);
        throw new Error(`Meta API error (${res.status}): ${msg}`);
    }
    return { messageId: data.message_id ?? 'unknown' };
}
