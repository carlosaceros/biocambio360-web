/**
 * Product knowledge for the AI agent — token-efficient by design:
 *  - a compact catalog (name + sizes/prices) is always in the (cacheable) system prompt;
 *  - the detailed technical sheet is added ONLY for the 1-3 products the customer is asking about.
 *
 * Only public product information is used (description, benefits, pH, dilution, usage, warnings, FAQs).
 * Internal production data (recipes/BOM, costs, suppliers, lots, stock) is intentionally never included.
 */

import { createHash } from 'crypto';
import { adminGetAllProducts } from '@/lib/products-admin';
import { PRODUCTOS, isDisallowedSize, type Product } from '@/lib/products';

const CACHE_TTL_MS = 10 * 60 * 1000;

const money = (n: number) => `$${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
const SIZE_LABEL: Record<string, string> = { '1/2G': '1/2 galón', '3.8L': 'galón', '10L': '10L', '20L': '20L', COMBO: 'combo', DEFAULT: 'única' };
const sizeLabel = (size: string) => SIZE_LABEL[size] ?? size;

let cache: { at: number; products: Product[]; catalog: string } | null = null;

function isSellable(p: Product): boolean {
    if (p.isDeleted) return false;
    if (p.status && p.status !== 'active') return false;
    return Object.entries(p.precios ?? {}).some(([size, price]) => !isDisallowedSize(size) && Number(price) > 0);
}

async function load(): Promise<{ products: Product[]; catalog: string }> {
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache;

    let source: Product[] = PRODUCTOS;
    try {
        const live = await adminGetAllProducts();
        if (live.length > 0) source = live;
    } catch {
        /* fall back to the static catalog */
    }

    const products = source.filter(isSellable);
    const catalog = products
        .map(p => {
            const sizes = Object.entries(p.precios ?? {})
                .filter(([size, price]) => !isDisallowedSize(size) && Number(price) > 0)
                .map(([size, price]) => `${size} ${money(Number(price))}`)
                .join(' | ');
            return `${p.nombre}: ${sizes}`;
        })
        .join('\n');

    cache = { at: Date.now(), products, catalog };
    return cache;
}

export async function getCompactCatalog(): Promise<string> {
    return (await load()).catalog;
}

/** Short hash of the catalog (names + prices): changes whenever a price or product changes. */
export async function getCatalogHash(): Promise<string> {
    return createHash('sha256').update((await load()).catalog).digest('hex').slice(0, 12);
}

// ─── Relevant technical sheets ────────────────────────────────────────────────

const STOPWORDS = new Set([
    'necesito', 'quiero', 'quisiera', 'para', 'tiene', 'tienen', 'tenemos', 'litros', 'litro', 'galon', 'galones',
    'garrafa', 'garrafas', 'pimpina', 'cuanto', 'cuesta', 'precio', 'precios', 'hola', 'gracias', 'buenas', 'buenos',
    'noches', 'favor', 'pedido', 'pedir', 'comprar', 'cotizar', 'ayuda', 'informacion', 'como', 'sirve', 'este',
    'esta', 'ese', 'esa', 'unas', 'unos', 'para', 'sobre', 'entre', 'desde', 'hasta', 'donde', 'cual', 'cuales',
    'entrega', 'envio', 'pago', 'bogota', 'soacha', 'mañana', 'tarde', 'tardes', 'dias', 'dia', 'noche', 'saludos', 'quiero', 'busco', 'tienen', 'venden', 'manejan', 'vale', 'valor', 'cuestan', 'medios', 'confirmar',
]);

function normalize(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
}

function tokens(text: string): string[] {
    return normalize(text)
        .split(/[^a-z0-9]+/)
        .filter(t => t.length >= 4 && !STOPWORDS.has(t));
}

/** Two words match when they share a stem (up to 7 leading letters): "limpiapisos" ≠ "limpiajuntas". */
function stemMatch(a: string, b: string): boolean {
    const n = Math.min(7, a.length, b.length);
    return n >= 4 && a.slice(0, n) === b.slice(0, n);
}

function trim(text: string | undefined, max: number): string {
    const t = (text ?? '').replace(/\s+/g, ' ').trim();
    return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function describe(p: Product): string {
    const parts: string[] = [`## ${p.nombre}`];
    const intro = p.shortDescription || p.descripcion;
    if (intro) parts.push(trim(intro, 240));
    if (p.beneficios?.length) parts.push(`Beneficios: ${p.beneficios.slice(0, 4).join('; ')}`);
    if (p.usoRecomendado) parts.push(`Uso: ${trim(p.usoRecomendado, 160)}`);
    if (p.ph) parts.push(`pH: ${trim(p.ph, 40)}`);
    if (p.dilucion) parts.push(`Dilución: ${trim(p.dilucion, 120)}`);
    if (p.biodegradabilidad) parts.push(`Biodegradabilidad: ${trim(p.biodegradabilidad, 80)}`);
    if (p.diferenciadores?.length) parts.push(`Diferenciales: ${p.diferenciadores.slice(0, 3).join('; ')}`);
    if (p.instrucciones?.length) parts.push(`Modo de uso: ${p.instrucciones.slice(0, 3).join('; ')}`);

    const rows = p.manualContent?.usageRows?.slice(0, 3) ?? [];
    if (rows.length > 0) {
        parts.push(
            'Dosificación: ' +
                rows.map(r => `${r.useOrSurface}: dilución ${r.dilution}, ${r.amount}, contacto ${r.contactTime}`).join(' / ')
        );
    }
    if (p.manualContent?.warnings?.length) parts.push(`Precauciones: ${p.manualContent.warnings.slice(0, 2).join('; ')}`);
    if (p.faqs?.length) parts.push(`FAQ: ${p.faqs.slice(0, 2).map(f => `${f.q} → ${trim(f.a, 140)}`).join(' / ')}`);

    return trim(parts.join('\n'), 950);
}

/**
 * Returns the technical sheets of the products mentioned in the recent customer messages
 * (or already in the pre-order). Empty string when nothing matches.
 */
export async function getRelevantProductSheets(
    customerTexts: string[],
    preOrderProductNames: string[] = [],
    max: number = 3
): Promise<string> {
    const { products } = await load();
    const queryTokens = new Set(tokens(customerTexts.join(' ')));
    const inOrder = new Set(preOrderProductNames.map(normalize));

    const scored = products
        .map(p => {
            const nameWords = tokens(p.nombre);
            let score = 0;
            for (const q of queryTokens) {
                if (nameWords.some(w => stemMatch(w, q))) score += 3;
                else if (normalize(`${p.categoria ?? ''} ${p.subcategoria ?? ''}`).includes(q)) score += 1;
            }
            if (inOrder.has(normalize(p.nombre))) score += 4;
            return { p, score };
        })
        .filter(s => s.score >= 3)
        .sort((a, b) => b.score - a.score)
        .slice(0, max);

    return scored.map(s => describe(s.p)).join('\n\n');
}

/**
 * All single products (not combos) that match what the customer is asking for, each with EVERY
 * presentation and price. Computed server-side so the model never "picks one" by itself
 * (e.g. asking for "detergente para ropa" lists every laundry detergent).
 */
export async function getMatchingProductPrices(customerTexts: string[], max: number = 5): Promise<string> {
    const { products } = await load();
    // The head noun is the first significant word that actually exists in the catalog
    // ("detergente" in "detergente para ropa"). Products must match it; the other words only rank
    // them, so laundry detergents come before other detergents.
    const ordered = tokens(customerTexts.join(' '));
    const singles = products.filter(p => !Object.keys(p.precios ?? {}).every(k => k.toUpperCase() === 'COMBO'));
    const matchesToken = (nameWords: string[], q: string) => nameWords.some(w => stemMatch(w, q));
    const head = ordered.find(q => singles.some(p => matchesToken(tokens(p.nombre), q)));
    if (!head) return '';
    const rest = new Set(ordered.filter(q => q !== head));

    const scored = singles
        .map(p => {
            const nameWords = tokens(p.nombre);
            if (!matchesToken(nameWords, head)) return { p, score: 0 };
            let score = 4;
            for (const q of rest) if (matchesToken(nameWords, q)) score += 2;
            return { p, score };
        })
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score || a.p.nombre.localeCompare(b.p.nombre))
        .slice(0, max);

    return scored
        .map(({ p }) => {
            const sizes = Object.entries(p.precios ?? {})
                .filter(([size, price]) => !isDisallowedSize(size) && Number(price) > 0)
                .sort((a, b) => Number(a[1]) - Number(b[1]))
                .map(([size, price]) => `${sizeLabel(size)} ${money(Number(price))}`)
                .join(' · ');
            return `- ${p.nombre}: ${sizes}`;
        })
        .join('\n');
}
