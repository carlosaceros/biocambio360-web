/**
 * WhatsApp Cloud API Service
 * Handles outbound messages to Meta Graph API for both Biocambio360 WABA accounts.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/messages
 */

const GRAPH_API_VERSION = 'v20.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Returns the permanent system user token.
 * Requires WHATSAPP_PERMANENT_TOKEN env var.
 */
function getToken(): string {
    const token = process.env.WHATSAPP_PERMANENT_TOKEN;
    if (!token) {
        throw new Error('WHATSAPP_PERMANENT_TOKEN environment variable is not set.');
    }
    return token;
}

/**
 * Core function: sends any message payload to Meta Graph API.
 */
/** Business-scoped user ID ("CO.1234…"): contacts that use a WhatsApp username have no phone number. */
export function isBsuid(id: string): boolean {
    return /^[A-Z]{2}\.(ENT\.)?[A-Za-z0-9]{8,}$/.test(id);
}

/** True when we can reply to this id: a phone number or a BSUID. */
export function isReplyableId(id: string): boolean {
    return /^\d{7,15}$/.test(id) || isBsuid(id);
}

async function sendToMeta(phoneNumberId: string, rawPayload: Record<string, unknown>): Promise<{ messageId: string }> {
    // BSUID recipients go in `recipient` instead of `to`
    const payload = { ...rawPayload };
    if (typeof payload.to === 'string' && isBsuid(payload.to)) {
        payload.recipient = payload.to;
        delete payload.to;
    }
    const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            ...payload,
        }),
    });

    const data = await res.json();

    if (!res.ok) {
        const errMsg = data?.error?.message || JSON.stringify(data);
        console.error('[whatsapp-service] Graph API error:', errMsg);
        throw new Error(`WhatsApp API error (${res.status}): ${errMsg}`);
    }

    const messageId: string = data?.messages?.[0]?.id ?? 'unknown';
    return { messageId };
}

/**
 * Sends a plain text message to a WhatsApp number.
 * Only valid within 24h of the last inbound message (customer-initiated window).
 */
export async function sendTextMessage(
    phoneNumberId: string,
    to: string,
    text: string,
    previewUrl: boolean = false
): Promise<{ messageId: string }> {
    return sendToMeta(phoneNumberId, {
        recipient_type: 'individual',
        to,
        type: 'text',
        text: {
            preview_url: previewUrl,
            body: text,
        },
    });
}

/**
 * Sends a pre-approved template message (works outside 24h window).
 * Used for marketing/utility campaigns like "Recordatorio 1-Clic".
 */
export async function sendTemplateMessage(
    phoneNumberId: string,
    to: string,
    templateName: string,
    languageCode: string = 'es',
    components?: Array<{
        type: 'header' | 'body' | 'button';
        sub_type?: 'url' | 'quick_reply';
        index?: string;
        parameters: Array<{
            type: 'text' | 'image' | 'video' | 'document';
            text?: string;
            image?: { link: string };
        }>;
    }>
): Promise<{ messageId: string }> {
    const template: Record<string, unknown> = {
        name: templateName,
        language: { code: languageCode },
    };
    if (components && components.length > 0) {
        template.components = components;
    }

    return sendToMeta(phoneNumberId, {
        recipient_type: 'individual',
        to,
        type: 'template',
        template,
    });
}

/**
 * Sends an image by URL.
 */
export async function sendImageMessage(
    phoneNumberId: string,
    to: string,
    imageUrl: string,
    caption?: string
): Promise<{ messageId: string }> {
    const image: Record<string, unknown> = { link: imageUrl };
    if (caption) image.caption = caption;

    return sendToMeta(phoneNumberId, {
        to,
        type: 'image',
        image,
    });
}

/**
 * Sends a document by URL.
 */
export async function sendDocumentMessage(
    phoneNumberId: string,
    to: string,
    documentUrl: string,
    fileName: string,
    caption?: string
): Promise<{ messageId: string }> {
    const document: Record<string, unknown> = {
        link: documentUrl,
        filename: fileName,
    };
    if (caption) document.caption = caption;

    return sendToMeta(phoneNumberId, {
        to,
        type: 'document',
        document,
    });
}

/**
 * Marks a message as read (sends read receipt to the sender).
 */
export async function markMessageAsRead(
    phoneNumberId: string,
    messageId: string
): Promise<void> {
    const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;
    await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            status: 'read',
            message_id: messageId,
        }),
    });
}

/**
 * Fetches the list of approved templates for a WhatsApp Business Account.
 */
export async function getApprovedTemplates(wabaId: string): Promise<unknown[]> {
    const url = `${GRAPH_API_BASE}/${wabaId}/message_templates?fields=name,status,language,components&limit=50&status=APPROVED`;
    const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${getToken()}` },
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(`Error fetching templates: ${data?.error?.message}`);
    }
    return data?.data ?? [];
}

/**
 * Sends a bulk batch of template messages with rate limiting (50 msg/min for Tier 1).
 * Returns detailed results for each recipient.
 */
export async function sendBulkTemplateMessages(
    phoneNumberId: string,
    recipients: Array<{ phone: string; components?: unknown[] }>,
    templateName: string,
    languageCode: string = 'es',
    onProgress?: (sent: number, total: number) => void
): Promise<{
    sent: number;
    failed: number;
    results: Array<{ phone: string; success: boolean; messageId?: string; error?: string }>;
}> {
    const results: Array<{ phone: string; success: boolean; messageId?: string; error?: string }> = [];
    let sent = 0;
    let failed = 0;
    const RATE_LIMIT_PER_MINUTE = 50;
    const DELAY_MS = Math.ceil(60000 / RATE_LIMIT_PER_MINUTE); // ~1200ms between messages

    for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        try {
            let messageId: string;
            try {
                ({ messageId } = await sendTemplateMessage(
                    phoneNumberId,
                    recipient.phone,
                    templateName,
                    languageCode,
                    recipient.components as any
                ));
            } catch (firstErr: any) {
                // 132000 = parameter count mismatch: the approved template has no variables, retry plain
                if (recipient.components?.length && /132000/.test(String(firstErr?.message))) {
                    // Retry without the URL button param, then without any variable
                    const bodyOnly = (recipient.components as Array<{ type: string }>).filter(c => c.type === 'body');
                    try {
                        if (bodyOnly.length === 0 || bodyOnly.length === recipient.components.length) throw firstErr;
                        ({ messageId } = await sendTemplateMessage(phoneNumberId, recipient.phone, templateName, languageCode, bodyOnly as any));
                    } catch {
                        ({ messageId } = await sendTemplateMessage(phoneNumberId, recipient.phone, templateName, languageCode));
                    }
                } else {
                    throw firstErr;
                }
            }
            results.push({ phone: recipient.phone, success: true, messageId });
            sent++;
        } catch (err: any) {
            results.push({ phone: recipient.phone, success: false, error: err.message });
            failed++;
        }

        onProgress?.(sent + failed, recipients.length);

        // Rate limiting: wait between messages (except after the last one)
        if (i < recipients.length - 1) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
    }

    return { sent, failed, results };
}

/**
 * Sends up to 3 quick-reply buttons (valid within the 24h window).
 * Button titles are limited to 20 characters by WhatsApp.
 */
export async function sendInteractiveButtons(
    phoneNumberId: string,
    to: string,
    bodyText: string,
    options: string[]
): Promise<{ messageId: string }> {
    return sendToMeta(phoneNumberId, {
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
            type: 'button',
            body: { text: bodyText },
            action: {
                buttons: options.slice(0, 3).map((title, i) => ({
                    type: 'reply',
                    reply: { id: `opt_${i + 1}`, title: title.slice(0, 20) },
                })),
            },
        },
    });
}

/**
 * Sends a list picker with up to 10 rows (valid within the 24h window).
 * Row titles are limited to 24 characters by WhatsApp.
 */
export async function sendInteractiveList(
    phoneNumberId: string,
    to: string,
    bodyText: string,
    options: string[],
    buttonLabel: string = 'Ver opciones'
): Promise<{ messageId: string }> {
    return sendToMeta(phoneNumberId, {
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
            type: 'list',
            body: { text: bodyText },
            action: {
                button: buttonLabel.slice(0, 20),
                sections: [
                    {
                        title: 'Opciones',
                        rows: options.slice(0, 10).map((title, i) => ({
                            id: `opt_${i + 1}`,
                            title: title.slice(0, 24),
                        })),
                    },
                ],
            },
        },
    });
}

/**
 * Sends a message with a single call-to-action button that opens a URL (valid within the 24h window).
 * The button label is limited to 20 characters by WhatsApp.
 */
export async function sendCtaUrlButton(
    phoneNumberId: string,
    to: string,
    bodyText: string,
    displayText: string,
    url: string
): Promise<{ messageId: string }> {
    return sendToMeta(phoneNumberId, {
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
            type: 'cta_url',
            body: { text: bodyText.slice(0, 1024) },
            action: {
                name: 'cta_url',
                parameters: { display_text: displayText.slice(0, 20), url },
            },
        },
    });
}

/**
 * Downloads a media file received from a customer (image, audio, video, document, sticker).
 * Meta serves it in two steps: resolve a short-lived URL from the media id, then fetch it with the token.
 * Media ids stay valid for about 30 days.
 */
export async function downloadMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string; fileSize: number }> {
    const meta = await fetch(`${GRAPH_API_BASE}/${encodeURIComponent(mediaId)}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
    });
    const info = await meta.json();
    if (!meta.ok || !info?.url) {
        throw new Error(`Media lookup failed (${meta.status}): ${info?.error?.message ?? 'no url'}`);
    }

    const file = await fetch(info.url, { headers: { Authorization: `Bearer ${getToken()}` } });
    if (!file.ok) throw new Error(`Media download failed (${file.status})`);

    const buffer = Buffer.from(await file.arrayBuffer());
    return { buffer, mimeType: info.mime_type ?? file.headers.get('content-type') ?? 'application/octet-stream', fileSize: buffer.length };
}
