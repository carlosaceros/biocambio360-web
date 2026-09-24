/**
 * Variables for the WhatsApp template `reabastecimiento_recordatorio`.
 *
 * Approved body (Meta template):
 *   ¡Hola {{1}}! 👋 Te escribimos de Biocambio360. Por tu consumo habitual, tu última compra ({{2}})
 *   podría estar por agotarse. ...
 *  {{1}} = customer's first name, {{2}} = main product of the last order.
 *
 * WhatsApp rejects empty parameters and parameters with line breaks/tabs or 5+ consecutive spaces,
 * so every value is sanitized and has a natural fallback.
 */

export const REMINDER_TEMPLATE_NAME = 'reabastecimiento_recordatorio';

const GENERIC_ITEMS = /^productos? de (limpieza|aseo)/i;

function clean(text: string): string {
    return text.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

const COMPANY_WORDS =
    /\b(sas|s\.a\.s|ltda|s\.a|conjunto|residencial|edificio|lavander[ií]a|hotel|restaurante|colegio|cl[ií]nica|ips|empresa|comercializadora|asociaci[oó]n|fundaci[oó]n|cooperativa|tienda|supermercado|bodega|cia|group|grupo|servicios|distribuidora|inversiones)\b/i;

export function reminderFirstName(fullName: string | undefined): string {
    const name = clean(fullName ?? '');
    const first = name.split(' ')[0] ?? '';
    const isPersonName = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,20}$/.test(first);
    if (!isPersonName || COMPANY_WORDS.test(name)) return 'cliente';
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

/** Main product of the last order: "2x Detergente X (20L), 1x Y (10L)" → "Detergente X (20L)". */
export function reminderProduct(itemsSummary: string | undefined): string {
    const summary = clean(itemsSummary ?? '');
    if (!summary || GENERIC_ITEMS.test(summary)) return 'productos de aseo';
    const first = summary.split(/,\s*(?=\d+x\s)/)[0].replace(/^\d+x\s+/, '').trim();
    if (!first) return 'productos de aseo';
    return first.length > 60 ? `${first.slice(0, 57).trimEnd()}...` : first;
}

export function reminderComponents(customerName: string | undefined, itemsSummary: string | undefined) {
    return [
        {
            type: 'body' as const,
            parameters: [
                { type: 'text' as const, text: reminderFirstName(customerName) },
                { type: 'text' as const, text: reminderProduct(itemsSummary) },
            ],
        },
    ];
}
