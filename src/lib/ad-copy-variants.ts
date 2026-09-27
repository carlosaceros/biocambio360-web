/**
 * Opening-message angles for Meta ad conversations, based on Eugene Schwartz's awareness levels and
 * Ogilvy / Isra Bravo copywriting technique. Ad clickers already saw the ad, so the four variants
 * cover "problem/solution aware" through "most aware" (level 1, total unaware, does not apply here).
 * Assignment is deterministic per conversation (stable hash), so results are comparable over time.
 * Instructions steer the MODEL's wording; the product name/price still come from the deterministic
 * catalog injection, never invented by the model.
 */

export type AdVariant = 'curiosidad' | 'beneficio' | 'directo' | 'urgencia';
export const AD_VARIANTS: AdVariant[] = ['curiosidad', 'beneficio', 'directo', 'urgencia'];

export const AD_VARIANT_LABEL: Record<AdVariant, string> = {
    curiosidad: 'Curiosidad (Isra Bravo)',
    beneficio: 'Beneficio (Ogilvy)',
    directo: 'Directo (control)',
    urgencia: 'Urgencia (cierre)',
};

export const AD_VARIANT_INSTRUCTION: Record<AdVariant, string> = {
    curiosidad:
        'Abre con un gancho de curiosidad o una pregunta corta sobre un problema cotidiano de ropa/limpieza (estilo Isra Bravo): nada de vender todavía en la primera frase. Luego, en la misma respuesta, confirma el producto del anuncio.',
    beneficio:
        'Abre como un titular (estilo Ogilvy): el beneficio más fuerte y creíble del producto en una frase corta (rendimiento, ahorro, resultado real, sin exagerar). Luego confirma el producto del anuncio.',
    directo:
        'Abre confirmando directamente el producto del anuncio y su precio, sin rodeos.',
    urgencia:
        'Abre transmitiendo que es de los productos más pedidos ahora mismo (sin inventar cifras ni plazos falsos), con calidez, invitando a decidir hoy. Luego confirma el producto del anuncio.',
};

/** Stable per-conversation assignment (same id → same variant always). */
export function pickAdVariant(seed: string): AdVariant {
    let h = 0;
    for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return AD_VARIANTS[h % AD_VARIANTS.length];
}
