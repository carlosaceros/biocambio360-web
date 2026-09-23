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
async function sendToMeta(phoneNumberId: string, payload: Record<string, unknown>): Promise<{ messageId: string }> {
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
            const { messageId } = await sendTemplateMessage(
                phoneNumberId,
                recipient.phone,
                templateName,
                languageCode,
                recipient.components as any
            );
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
