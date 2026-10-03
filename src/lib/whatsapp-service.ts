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

/** Looks a template up (by exact name) in the WhatsApp Business Account of the sending number. */
export async function findTemplate(name: string, wabaId: string = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ?? ''): Promise<Array<{ language: string; status: string }>> {
    if (!wabaId) return [];
    const res = await fetch(`${GRAPH_API_BASE}/${wabaId}/message_templates?name=${encodeURIComponent(name)}&fields=name,language,status`, {
        headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await res.json().catch(() => ({}));
    return (data?.data ?? []).filter((t: { name: string }) => t.name === name).map((t: { language: string; status: string }) => ({ language: t.language, status: t.status }));
}

/**
 * Fetches the approved BODY text (with {{1}}, {{2}}, ... placeholders, exactly as Meta approved it)
 * of a single template, for reconstructing what the customer actually saw in internal logs. Returns
 * null if the template/body isn't found so callers can fall back to a safe default.
 */
export async function getTemplateBodyText(name: string, wabaId: string = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ?? ''): Promise<string | null> {
    if (!wabaId) return null;
    try {
        const res = await fetch(`${GRAPH_API_BASE}/${wabaId}/message_templates?name=${encodeURIComponent(name)}&fields=name,components`, {
            headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json().catch(() => ({}));
        const template = (data?.data ?? []).find((t: { name: string }) => t.name === name);
        const bodyComponent = template?.components?.find((c: { type: string }) => c.type === 'BODY');
        return bodyComponent?.text ?? null;
    } catch {
        return null;
    }
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

export type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';

export interface TemplateButtonInput {
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
    text: string;
    url?: string;
    phone_number?: string;
    /** Valores de ejemplo para los {{1}} dentro de la url (Meta los exige si la url tiene variables). */
    example?: string[];
}

export interface TemplateContentInput {
    headerText?: string;
    bodyText: string;
    /** Valores de ejemplo, en orden, para los {{1}}, {{2}}... del body (formato posicional). */
    bodyExamples?: string[];
    footerText?: string;
    buttons?: TemplateButtonInput[];
}

export interface TemplateCreateInput extends TemplateContentInput {
    name: string;
    category: TemplateCategory;
    language: string;
}

/**
 * Construye el array `components` que espera la API de Meta a partir de un formulario simple.
 * Alcance deliberadamente limitado a lo que cubre la pantalla de /admin: header de solo texto
 * (no imagen/video/documento -- esos requieren subir un media handle vía el Resumable Upload API
 * aparte, que es un flujo bastante más largo) y tres tipos de botón (quick_reply/url/phone_number,
 * sin copy_code ni los botones específicos de autenticación con OTP).
 */
function buildTemplateComponents(input: TemplateContentInput): Record<string, unknown>[] {
    const components: Record<string, unknown>[] = [];

    if (input.headerText && input.headerText.trim()) {
        components.push({ type: 'HEADER', format: 'TEXT', text: input.headerText.trim() });
    }

    const bodyComponent: Record<string, unknown> = { type: 'BODY', text: input.bodyText };
    if (input.bodyExamples && input.bodyExamples.length > 0) {
        bodyComponent.example = { body_text: [input.bodyExamples] };
    }
    components.push(bodyComponent);

    if (input.footerText && input.footerText.trim()) {
        components.push({ type: 'FOOTER', text: input.footerText.trim() });
    }

    if (input.buttons && input.buttons.length > 0) {
        components.push({
            type: 'BUTTONS',
            buttons: input.buttons.map((b) => {
                if (b.type === 'URL') {
                    return {
                        type: 'URL', text: b.text, url: b.url,
                        ...(b.example && b.example.length > 0 ? { example: b.example } : {}),
                    };
                }
                if (b.type === 'PHONE_NUMBER') {
                    return { type: 'PHONE_NUMBER', text: b.text, phone_number: b.phone_number };
                }
                return { type: 'QUICK_REPLY', text: b.text };
            }),
        });
    }

    return components;
}

function templateApiErrorMessage(data: { error?: { error_user_msg?: string; message?: string } }, status: number): string {
    return data?.error?.error_user_msg || data?.error?.message || `Error de la API de Meta (HTTP ${status})`;
}

/** Lista TODAS las plantillas (cualquier estado -- a diferencia de getApprovedTemplates). */
export async function listAllTemplates(wabaId: string): Promise<unknown[]> {
    const url = `${GRAPH_API_BASE}/${wabaId}/message_templates?fields=id,name,status,category,language,components,rejected_reason,quality_score&limit=200`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(templateApiErrorMessage(data, res.status));
    return data?.data ?? [];
}

/**
 * Crea una plantilla nueva (POST /{waba-id}/message_templates). Queda en estado PENDING hasta
 * que Meta la revisa -- el webhook (message_template_status_update) actualiza el estado después.
 */
export async function createTemplate(wabaId: string, input: TemplateCreateInput): Promise<{ id: string; status: string; category: string }> {
    const res = await fetch(`${GRAPH_API_BASE}/${wabaId}/message_templates`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: input.name,
            category: input.category,
            language: input.language,
            components: buildTemplateComponents(input),
        }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(templateApiErrorMessage(data, res.status));
    return { id: data.id, status: data.status, category: data.category };
}

/**
 * Edita una plantilla existente (POST /{template-id}). Meta solo permite editar cuando el estado
 * actual es APPROVED, REJECTED o PAUSED (no mientras está PENDING), como máximo 1 vez al día y 10
 * veces al mes por plantilla, y SIEMPRE vuelve a PENDING para re-revisión. `name` e `language` no
 * son editables -- si hace falta cambiarlos, Meta exige crear una plantilla nueva.
 */
export async function editTemplate(
    templateId: string,
    input: Partial<TemplateContentInput> & { category?: TemplateCategory }
): Promise<{ success: boolean }> {
    const body: Record<string, unknown> = {};
    if (input.category) body.category = input.category;
    if (input.bodyText !== undefined) {
        body.components = buildTemplateComponents({
            bodyText: input.bodyText,
            bodyExamples: input.bodyExamples,
            headerText: input.headerText,
            footerText: input.footerText,
            buttons: input.buttons,
        });
    }

    const res = await fetch(`${GRAPH_API_BASE}/${templateId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(templateApiErrorMessage(data, res.status));
    return { success: !!data.success };
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
 * Sends a list picker whose rows have a title (max 24) and a description (max 72), e.g. one row per
 * presentation with its price. Valid within the 24h window.
 */
export async function sendRichList(
    phoneNumberId: string,
    to: string,
    bodyText: string,
    buttonLabel: string,
    rows: Array<{ id: string; title: string; description?: string }>,
    sectionTitle: string = 'Opciones'
): Promise<{ messageId: string }> {
    return sendToMeta(phoneNumberId, {
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
            type: 'list',
            body: { text: bodyText.slice(0, 1024) },
            action: {
                button: buttonLabel.slice(0, 20),
                sections: [
                    {
                        title: sectionTitle.slice(0, 24),
                        rows: rows.slice(0, 10).map(r => ({
                            id: r.id.slice(0, 200),
                            title: r.title.slice(0, 24),
                            ...(r.description ? { description: r.description.slice(0, 72) } : {}),
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
    url: string,
    headerImageUrl?: string,
    footerText?: string
): Promise<{ messageId: string }> {
    return sendToMeta(phoneNumberId, {
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
            type: 'cta_url',
            ...(headerImageUrl ? { header: { type: 'image', image: { link: headerImageUrl } } } : {}),
            body: { text: bodyText.slice(0, 1024) },
            ...(footerText ? { footer: { text: footerText.slice(0, 60) } } : {}),
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
