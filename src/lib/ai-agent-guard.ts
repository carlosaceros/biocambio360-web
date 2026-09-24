/**
 * Safety layer for the after-hours AI agent. Pure functions (no I/O).
 *
 * Defense in depth:
 *  1. The model has no tools and never receives secrets or business data, so there is nothing
 *     sensitive to leak even if it were fully jailbroken.
 *  2. Suspicious customer messages are answered with a canned reply WITHOUT calling the model.
 *  3. Every model reply is scanned for leakage before it is sent.
 *  4. Replies are split into short WhatsApp messages (max 2 lines each).
 */

export const MAX_USER_CHARS = 500;

export const REFUSAL_TEXT =
    'Solo puedo ayudarte con pedidos, información de nuestros productos y solicitudes o reclamos 🙂\n¿En qué te ayudo?';

export const AUDIO_TEXT = 'Por aquí no puedo escuchar audios 🙏\n¿Me cuentas por escrito lo que necesitas?';

/** Customer text is untrusted: trim, strip control/markup characters and cap the length. */
export function sanitizeUserText(text: string): string {
    return String(text ?? '')
        .replace(/[\u0000-\u001F\u007F]+/g, ' ')
        .replace(/[[\]<>{}`]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_USER_CHARS);
}

const INJECTION_PATTERNS: RegExp[] = [
    // "ignora tus instrucciones", "olvida las reglas"
    /(ignor|olvid|omit|salt|desactiv|anul)\w*\s+.{0,25}(instruc|regla|restric|filtro|pol[ií]tica|l[ií]mite)/i,
    // system prompt / instrucciones internas
    /(system\s*prompt|prompt\s+(del\s+)?sistema|instrucciones\s+(internas|iniciales|del\s+sistema|de\s+sistema)|tus\s+instrucciones|tus\s+reglas|tu\s+configuraci[oó]n)/i,
    // role-play / hypothetical framing
    /(imagina|supon|suponte|finge|fingir|haz\s+de\s+cuenta|hipot[eé]tic|act[uú]a\s+como|comp[oó]rtate\s+como|pretend|roleplay|juego\s+de\s+roles?)\b/i,
    /(modo\s+(desarrollador|dios|admin|administrador|debug|mantenimiento|sin\s+restricciones)|developer\s+mode|jailbreak|\bDAN\b)/i,
    // authority claims
    /(soy|eres|somos)\s+(tu|su|el|la|un|una)?\s*(creador|programador|desarrollador|due[nñ]o|administrador|admin|jefe|gerente|ceo|ingeniero\s+de\s+sistemas|soporte\s+t[eé]cnico)/i,
    // credentials / secrets
    /(dame|dime|p[aá]same|env[ií]ame|comparte|revela|mu[eé]strame|necesito|cu[aá]l\s+es|quiero)\s+.{0,40}(clave|contrase[nñ]a|password|token|api\s*key|apikey|credencial)/i,
    /(clave|contrase[nñ]a|password|token|api\s*key|apikey|credenciales?)\s+(de|del|de\s+la|para)\s+(el\s+|la\s+)?(crm|sistema|admin|panel|base|firebase|whatsapp|meta|kommo|servidor|gemini|google|vercel|correo)/i,
    // internal systems / data access
    /(acceso|entra|ingresa|conecta)\s+(al|a\s+la|a|con)\s+(crm|base\s+de\s+datos|sistema|panel|admin|servidor)/i,
    /(base\s+de\s+datos|firestore|firebase|vercel|endpoint|c[oó]digo\s+fuente|variables?\s+de\s+entorno|\.env\b|\bapi\b|\bcrm\b|kommo|wasapi)/i,
    // business-internal data requests
    /(pedidos|ventas|clientes|facturaci[oó]n|ingresos|utilidad|costos?|m[aá]rgenes?|proveedores?|n[oó]mina|empleados|asesores)\s+(de|del|en)\s+(este|el|la|los|las)?\s*(mes|a[nñ]o|d[ií]a|trimestre|semana|sistema|empresa)/i,
    /(lista|listado|dame|mu[eé]strame|env[ií]ame|exporta)\s+(de\s+)?(todos\s+)?(los\s+|las\s+)?(clientes|pedidos|usuarios|tel[eé]fonos|correos|contactos|ventas)/i,
    // prompt extraction / echo tricks
    /(repite|traduce|resume|imprime|muestra|revela|escribe)\s+.{0,30}(instrucciones|prompt|reglas|texto\s+anterior|lo\s+anterior)/i,
    /(print|reveal|show|repeat|ignore)\s+(your|the|all|previous)\s+(prompt|instructions|rules)/i,
    // fake role markers
    /<\/?\s*(system|instructions?)\s*>|\[\s*(system|inst)\s*\]|#{2,}\s*(system|instruction)/i,
];

/** True when the customer message looks like a prompt-injection / data-exfiltration attempt. */
export function looksLikeInjection(text: string): boolean {
    if (!text) return false;
    return INJECTION_PATTERNS.some(re => re.test(text));
}

const LEAK_PATTERNS: RegExp[] = [
    /EAA[A-Za-z0-9]{10,}/, // Meta tokens
    /AIza[0-9A-Za-z_-]{20,}/, // Google API keys
    /\bsk-[A-Za-z0-9]{16,}/,
    /\bBearer\s+\S{10,}/i,
    /-----BEGIN [A-Z ]+-----/,
    /(system\s*prompt|prompt\s+del\s+sistema|mis\s+instrucciones|instrucciones\s+(internas|del\s+sistema)|mi\s+configuraci[oó]n)/i,
    /(firestore|firebase|vercel|gemini|kommo|wasapi|base\s+de\s+datos|api\s*key|variables?\s+de\s+entorno|\bcrm\b|\bwebhook\b|\bendpoint\b)/i,
    /[\w.+-]+@[\w-]+\.[\w.]+/, // e-mail addresses (staff or otherwise)
];

const SECRET_ENV_KEYS = [
    'WHATSAPP_PERMANENT_TOKEN',
    'WHATSAPP_VERIFY_TOKEN',
    'GEMINI_API_KEY',
    'META_CAPI_TOKEN',
    'SERPER_API_KEY',
    'FIREBASE_SERVICE_ACCOUNT',
    'CRON_SECRET',
];

/** True when a model reply contains anything that looks like internal/secret information. */
export function leaksSensitive(reply: string): boolean {
    if (!reply) return false;
    if (LEAK_PATTERNS.some(re => re.test(reply))) return true;
    return SECRET_ENV_KEYS.some(key => {
        const value = process.env[key];
        if (!value || value.length < 12) return false;
        // Short secrets (e.g. the verify token) are compared whole so brand words never trigger it
        return reply.includes(value.length < 24 ? value : value.slice(0, 16));
    });
}

const MAX_CHARS_PER_MESSAGE = 180; // ≈ 2 lines in WhatsApp
const MAX_MESSAGES = 6;

/**
 * Splits a reply into short messages: each one at most 2 lines (~180 chars).
 * Splits on line breaks first, then sentence boundaries, then words.
 */
export function splitIntoShortMessages(text: string): string[] {
    const units: string[] = [];
    for (const line of String(text ?? '').split(/\n+/)) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.length <= MAX_CHARS_PER_MESSAGE) {
            units.push(trimmed);
            continue;
        }
        for (const sentence of trimmed.split(/(?<=[.!?…])\s+/)) {
            if (sentence.length <= MAX_CHARS_PER_MESSAGE) {
                units.push(sentence);
                continue;
            }
            let chunk = '';
            for (const word of sentence.split(/\s+/)) {
                if ((chunk + ' ' + word).trim().length > MAX_CHARS_PER_MESSAGE) {
                    if (chunk) units.push(chunk);
                    chunk = word;
                } else {
                    chunk = (chunk + ' ' + word).trim();
                }
            }
            if (chunk) units.push(chunk);
        }
    }

    // Pack units into messages of at most 2 lines / ~180 chars
    const messages: string[] = [];
    let current: string[] = [];
    let length = 0;
    for (const unit of units) {
        if (current.length > 0 && (current.length >= 2 || length + unit.length > MAX_CHARS_PER_MESSAGE)) {
            messages.push(current.join('\n'));
            current = [];
            length = 0;
        }
        current.push(unit);
        length += unit.length;
    }
    if (current.length > 0) messages.push(current.join('\n'));

    if (messages.length > MAX_MESSAGES) {
        const head = messages.slice(0, MAX_MESSAGES - 1);
        head.push(messages.slice(MAX_MESSAGES - 1).join('\n').slice(0, 600));
        return head;
    }
    return messages;
}

const PROMISE_PATTERN =
    /(devoluci|reembols|te\s+(devolvemos|reembolsamos|cambiamos|reponemos|compensamos)|cambio\s+del?\s+producto|reposici[oó]n|compensaci|indemniz|garantizamos|te\s+aseguro|(en|dentro\s+de|antes\s+de)\s+\d+\s*(horas?|d[ií]as?|minutos?)|entregamos\s+(hoy|ma[nñ]ana)|llega\s+(hoy|ma[nñ]ana))/i;

/**
 * Removes sentences that make commitments the agent must never make (refunds, exchanges,
 * compensation, delivery times). Returns null when nothing safe is left.
 */
export function stripPromises(message: string): string | null {
    const kept = String(message ?? '')
        .split(/(?<=[.!?…])\s+|\n+/)
        .map(s => s.trim())
        .filter(s => s && !PROMISE_PATTERN.test(s));
    return kept.length > 0 ? kept.join(' ') : null;
}

const SITE_URL_PATTERN = /(https?:\/\/)?(www\.)?biocambio360\.com[^\s]*/gi;

/** True when the text mentions the store website. */
export function mentionsSite(text: string): boolean {
    return /biocambio360\.com/i.test(text);
}

/** Replaces the raw URL with a natural phrase: the link is delivered as a WhatsApp button instead. */
export function stripSiteUrl(text: string): string {
    return text
        .replace(/(en|por|desde|a través de|via|vía)\s+(https?:\/\/)?(www\.)?biocambio360\.com[^\s]*/gi, '$1 nuestra web')
        .replace(SITE_URL_PATTERN, 'nuestra web')
        .replace(/nuestra web\s+nuestra web/gi, 'nuestra web')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

/**
 * Inserts the price list (one product per line, packed 2 lines per WhatsApp message) before the
 * agent's last message, so the closing question still comes last.
 */
export function injectPriceList(messages: string[], header: string, matches: string): string[] {
    const lines = matches.split('\n').map(l => l.replace(/^-\s*/, '').trim()).filter(Boolean);
    const priceMessages = splitIntoShortMessages([header, ...lines].join('\n'));
    const head = messages.length > 1 ? messages.slice(0, -1) : [];
    const tail = messages.length > 1 ? messages.slice(-1) : messages;
    return [...head, ...priceMessages, ...tail].slice(0, 9);
}
