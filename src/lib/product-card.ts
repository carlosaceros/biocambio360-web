/**
 * WhatsApp "product card": a message with the product photo, name, short description and the price of
 * every presentation, plus a "Ver en la tienda" button, followed by a picker (one row per presentation
 * with its price). Everything comes from the live store catalog. The customer's pick arrives as
 * "Quiero el <producto> en presentación <tamaño>" (see the webhook).
 */

import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDB } from '@/lib/firebase-admin';
import { sendCtaUrlButton, sendRichList } from '@/lib/whatsapp-service';
import { isDisallowedSize, type Product } from '@/lib/products';
import { getProductImage } from '@/lib/product-utils';
import { money, sizeLabel, getProductById, getSellableProducts } from '@/lib/ai-agent-knowledge';
import { CATALOG_URL, categoryUrl, slugify } from '@/lib/catalog-categories';

export const SITE = 'https://biocambio360.com';

export interface ProductSize {
    size: string;
    label: string;
    price: number;
}

export function productSizes(p: Product): ProductSize[] {
    return Object.entries(p.precios ?? {})
        .filter(([size, price]) => !isDisallowedSize(size) && Number(price) > 0)
        .map(([size, price]) => ({ size, label: sizeLabel(size), price: Number(price) }))
        .sort((a, b) => a.price - b.price);
}

const clean = (t?: string) => String(t ?? '').replace(/\s+/g, ' ').trim();
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** WhatsApp-fetchable URL for a filename in public/images: the JPEG twin generated at build time from the store's WebP. */
const imageUrlForFile = (file: string) =>
    /\.(jpe?g|png)$/i.test(file) ? `${SITE}/images/${encodeURIComponent(file)}` : `${SITE}/images-jpg/${encodeURIComponent(file.replace(/\.[^.]+$/, ''))}.jpg`;

/** Image URL WhatsApp can fetch: the JPEG twin generated at build time from the store's WebP. */
export const productImageUrl = (p: Product) => imageUrlForFile(p.imgFile);

/** Same, but for one specific presentation (falls back to the main photo when that size has none of its own). */
export function productImageUrlForSize(p: Product, size: string): string {
    return imageUrlForFile(getProductImage(p, size));
}
export const productUrl = (p: Product) => `${SITE}/producto/${p.id}`;

export function productCardText(p: Product): string {
    const sizes = productSizes(p);
    const short = clean(p.shortDescription || p.slogan || p.descripcion).slice(0, 140);
    const lines = sizes.map(s => `• ${cap(s.label)}: ${money(s.price)}`);
    return `*${p.nombre}*\n${short}${short && !/[.!?]$/.test(short) ? '.' : ''}\n\n${lines.join('\n')}`.slice(0, 1000);
}

export const PRODUCT_LIST_BODY = '¿Cuál presentación te interesa? 👇';

/** Sends the card + presentation picker and stores both in the conversation. */
export async function sendProductCard(input: {
    phoneId: string;
    to: string;
    product: Product;
    conversationId: string;
    agentUid: string;
    agentName: string;
}): Promise<string> {
    const { phoneId, to, product } = input;
    const sizes = productSizes(product);
    const text = productCardText(product);
    const imageUrl = productImageUrl(product);
    const url = productUrl(product);

    const card = await sendCtaUrlButton(phoneId, to, text, 'Ver en la tienda', url, imageUrl);
    const rows = sizes.map(s => ({ id: `psize:${product.id}:${s.size}`.slice(0, 200), title: cap(s.label), description: money(s.price) }));
    const list = rows.length > 1 ? await sendRichList(phoneId, to, PRODUCT_LIST_BODY, 'Elegir presentación', rows, 'Presentaciones') : null;

    try {
        const messages = getAdminDB().collection('conversations').doc(input.conversationId).collection('messages');
        const base = { direction: 'outbound', agentUid: input.agentUid, agentName: input.agentName, status: 'sent' };
        await messages.add({ ...base, type: 'image', content: text, mediaUrl: imageUrl, cta: { label: 'Ver en la tienda', url }, metaMessageId: card.messageId, timestamp: FieldValue.serverTimestamp() });
        if (list) {
            await messages.add({ ...base, type: 'text', content: PRODUCT_LIST_BODY, options: rows.map(r => `${r.title} · ${r.description}`), metaMessageId: list.messageId, timestamp: FieldValue.serverTimestamp() });
        }
    } catch (err) {
        console.warn('[product-card] Sent but could not store the messages:', err instanceof Error ? err.message : err);
    }
    return text.split('\n')[0].replace(/\*/g, '');
}

/** Turns the row id of a picker answer into the sentence the customer effectively said. */
export async function resolvePick(rowId: string): Promise<string> {
    if (rowId.startsWith('psize:')) {
        const [, id, ...rest] = rowId.split(':');
        const product = await getProductById(id);
        return product ? `Quiero el ${product.nombre} en presentación ${sizeLabel(rest.join(':'))}` : rowId;
    }
    if (rowId.startsWith('catcat:')) {
        const slug = rowId.slice('catcat:'.length);
        const categories = [...new Set((await getSellableProducts()).map(p => p.categoria).filter(Boolean))];
        const name = categories.find(c => slugify(c) === slug);
        return name ? `Quiero ver la categoría ${name}` : rowId;
    }
    return rowId;
}

const COVER = `${SITE}/og-biocambio360.png`;

async function storeOutbound(conversationId: string, agentUid: string, agentName: string, entries: Array<Record<string, unknown>>) {
    try {
        const messages = getAdminDB().collection('conversations').doc(conversationId).collection('messages');
        for (const e of entries) {
            await messages.add({ direction: 'outbound', agentUid, agentName, status: 'sent', timestamp: FieldValue.serverTimestamp(), ...e });
        }
    } catch (err) {
        console.warn('[product-card] Sent but could not store the messages:', err instanceof Error ? err.message : err);
    }
}

/** The visual catalog: cover + link to the catalog page, and a picker of categories. */
export async function sendCatalogCard(input: { phoneId: string; to: string; conversationId: string; agentUid: string; agentName: string }): Promise<void> {
    const products = await getSellableProducts();
    const counts = new Map<string, number>();
    for (const p of products) if (p.categoria) counts.set(p.categoria, (counts.get(p.categoria) ?? 0) + 1);

    const body = '📚 *Catálogo Biocambio360*\nToda la línea con fotos, presentaciones y precios, organizada por categorías. Ábrelo en tu celular 👇';
    const card = await sendCtaUrlButton(input.phoneId, input.to, body, 'Ver catálogo', CATALOG_URL, COVER);
    const rows = [...counts.entries()].map(([name, n]) => ({ id: `catcat:${slugify(name)}`, title: name, description: `${n} producto${n > 1 ? 's' : ''}` }));
    const list = rows.length > 1 ? await sendRichList(input.phoneId, input.to, '¿Quieres ir directo a una categoría?', 'Ver categorías', rows, 'Categorías') : null;
    await storeOutbound(input.conversationId, input.agentUid, input.agentName, [
        { type: 'image', content: body, mediaUrl: COVER, cta: { label: 'Ver catálogo', url: CATALOG_URL }, metaMessageId: card.messageId },
        ...(list ? [{ type: 'text', content: '¿Quieres ir directo a una categoría?', options: rows.map(r => `${r.title} · ${r.description}`), metaMessageId: list.messageId }] : []),
    ]);
}

/** Link to one category of the catalog. */
export async function sendCategoryCard(input: { phoneId: string; to: string; conversationId: string; agentUid: string; agentName: string; categoria: string }): Promise<void> {
    const url = categoryUrl(input.categoria);
    const body = `*${input.categoria}*\nMira todos los productos de esta categoría con foto, presentaciones y precios 👇`;
    const card = await sendCtaUrlButton(input.phoneId, input.to, body, 'Ver categoría', url, COVER);
    await storeOutbound(input.conversationId, input.agentUid, input.agentName, [{ type: 'image', content: body, mediaUrl: COVER, cta: { label: 'Ver categoría', url }, metaMessageId: card.messageId }]);
}

// ─── "Send me a photo" ────────────────────────────────────────────────────────

const SIZE_MATCHERS: Array<[string, RegExp]> = [
    ['1/2G', /\bmedio\s*gal[oó]n|1\/2\s*g(al[oó]n)?\b/],
    ['3.8L', /\bgal[oó]n\b(?!.*20)/],
    ['20L', /\b20\s*(l(itros)?|lt)\b/],
    ['10L', /\b10\s*(l(itros)?|lt)\b/],
];

/** True when the customer's text is asking to be sent a picture. */
export function wantsProductPhoto(text: string): boolean {
    return /\b(foto|fotico|imagen)\b/i.test(text ?? '');
}

/** The size the customer named in `text`, if it is one this product actually sells. */
export function matchRequestedSize(product: Product, text: string): string | null {
    const t = String(text ?? '').toLowerCase();
    const sizes = new Set(Object.keys(product.precios ?? {}));
    for (const [size, re] of SIZE_MATCHERS) {
        if (sizes.has(size) && re.test(t)) return size;
    }
    return null;
}
