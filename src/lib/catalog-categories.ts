/** Category helpers shared by the visual catalog page and the WhatsApp catalog messages. */

export const CATALOG_URL = 'https://biocambio360.com/catalogo';

export const slugify = (text: string) =>
    String(text ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/&/g, ' y ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

export const categoryUrl = (categoria: string) => `${CATALOG_URL}?cat=${slugify(categoria)}`;

export const wantsCatalog = (text: string) =>
    /\b(cat[aá]logo|lista de precios|todos los productos|qu[eé] productos (tienen|manejan|venden|ofrecen)|productos que (tienen|manejan|venden))\b/i.test(text);
