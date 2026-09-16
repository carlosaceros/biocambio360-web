import { getAllProducts } from '@/lib/products-service';
import { generateProductSlug, getProductImage } from '@/lib/product-utils';
import { Product } from '@/lib/products';
import { KIT_COMPOSITION_MAP } from '@/lib/shipping-zones';

const BASE_URL = 'https://www.biocambio360.com';

function escapeXml(unsafe: string): string {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export const SIZE_LABELS: Record<string, string> = {
    '1/2G': '1/2 Gal',
    '3.8L': '1 Gal',
    '10L': '10L',
    '20L': '20L',
    '15L': '15L',
    '1KG': '1 Kg',
    '4KG': '4 Kg',
    '10KG': '10 Kg',
    '20KG': '20 Kg',
    '60ML': '60 ml',
    'COMBO': 'Combo Ahorro Fábrica',
    'DEFAULT': 'Combo Ahorro Fábrica',
};

export function getGoogleTaxonomyCategory(product: Product): number {
    const cat = (product.categoria || '').toLowerCase();
    const sub = (product.subcategoria || '').toLowerCase();
    const id = (product.id || '').toLowerCase();
    const name = (product.nombre || '').toLowerCase();

    if (id.includes('suavizante') || name.includes('suavizante')) return 633; // Fabric Softeners
    if (id.includes('detergente') || sub.includes('lavanderia') || sub.includes('ropa') || id.includes('quitamanchas')) return 631; // Laundry Detergents
    if (id.includes('lavaloza') || name.includes('lavaloza')) return 634; // Dish Detergents
    if (cat.includes('automotriz') || id.includes('auto') || id.includes('carro')) return 2678; // Vehicle Cleaning & Care
    if (cat.includes('cuidado personal') || id.includes('mantequilla') || id.includes('splash') || id.includes('jabon-de-manos')) {
        if (id.includes('splash')) return 506; // Fragrances
        if (id.includes('mantequilla')) return 502; // Skin Care
        return 486; // Hand Washes & Sanitizers
    }
    return 632; // Household Cleaners
}

/**
 * Obtiene la medida unitaria para Google Shopping (unit_pricing_measure y unit_pricing_base_measure)
 */
function getUnitPricingMeasures(size: string): { measure: string; base: string } | null {
    switch (size) {
        case '20L': return { measure: '20l', base: '1l' };
        case '10L': return { measure: '10l', base: '1l' };
        case '3.8L': return { measure: '3.8l', base: '1l' };
        case '1/2G': return { measure: '1.9l', base: '1l' };
        case '15L': return { measure: '15l', base: '1l' };
        case '1KG': return { measure: '1kg', base: '1kg' };
        case '4KG': return { measure: '4kg', base: '1kg' };
        case '10KG': return { measure: '10kg', base: '1kg' };
        case '20KG': return { measure: '20kg', base: '1kg' };
        case '60ML': return { measure: '60ml', base: '100ml' };
        default: return null;
    }
}

/**
 * Genera el título optimizado para Google Shopping & Meta Ads incorporando intención de búsqueda
 */
function getOptimizedTitle(product: Product, sizeLabel: string, categoryId: number): string {
    const rawName = product.nombre.trim();
    const id = (product.id || '').toLowerCase();
    const nameLower = rawName.toLowerCase();

    // 1. Detergentes para lavadora y ropa (Google Taxonomy 631)
    if (categoryId === 631) {
        if (id.includes('ropa-negra') || nameLower.includes('ropa negra')) {
            return `Detergente para Ropa Negra y Oscura ${sizeLabel} | Lavadora y Lavado Manual Biocambio360`;
        }
        if (id.includes('industrial') || nameLower.includes('industrial')) {
            return `Detergente Líquido para Ropa y Lavadora Industrial ${sizeLabel} | Biocambio360 Fábrica`;
        }
        return `Detergente Líquido para Ropa y Lavadora ${sizeLabel} | Concentrado Biodegradable Biocambio360`;
    }

    // 2. Suavizantes de ropa (Google Taxonomy 633)
    if (categoryId === 633) {
        return `Suavizante de Ropa Concentrado ${sizeLabel} | Microcápsulas de Aroma Duradero Biocambio360`;
    }

    // 3. Desengrasantes (Google Taxonomy 632)
    if (id.includes('desengrasante') || nameLower.includes('desengrasante')) {
        if (id.includes('industrial') || nameLower.includes('industrial')) {
            return `Desengrasante Industrial Concentrado Heavy Duty ${sizeLabel} | Arrancagrasa Biocambio360`;
        }
        return `Desengrasante Multiusos Cocina y Hogar ${sizeLabel} | Alto Rendimiento Biocambio360`;
    }

    // 4. Lavaloza / Lavaplatos (Google Taxonomy 634)
    if (categoryId === 634 || id.includes('lavaloza') || nameLower.includes('lavaloza')) {
        return `Lavaloza Líquido Concentrado Antigrasa ${sizeLabel} | Espuma Activa Biocambio360`;
    }

    // 5. Limpiapisos y desinfectantes
    if (id.includes('limpiapisos') || nameLower.includes('limpiapisos')) {
        return `Limpiapisos Desinfectante Concentrado ${sizeLabel} | Fragancia Larga Duración Biocambio360`;
    }

    // 6. Combos y Kits
    if (product.categoria === 'Kits & Combos' || id.includes('combo') || id.includes('kit') || id.includes('matrimonio')) {
        return `${rawName} ${sizeLabel !== 'Combo Ahorro Fábrica' ? sizeLabel : ''} | Combo Ahorro Fábrica Biocambio360`.trim();
    }

    // Título estándar mejorado
    return `${rawName} ${sizeLabel} | Venta Directa Fábrica Biocambio360`;
}

/**
 * Enriquecimiento de descripción con cantidad exacta en Litros/ml, rendimiento y compatibilidad
 */
function getEnrichedDescription(product: Product, size: string, sizeLabel: string, categoryId: number): string {
    const id = (product.id || '').toLowerCase();
    const nameLower = product.nombre.toLowerCase();
    const baseDesc = product.descripcion ? product.descripcion.trim() : '';

    let detallesCantidad = '';

    // ─── A. DETERGENTES PARA LAVADORA (Taxonomía 631) ───
    if (categoryId === 631) {
        switch (size) {
            case '20L':
                detallesCantidad = 'Contenido neto exacto: 20 Litros (20.000 ml). Rendimiento garantizado: Rinde hasta 200 cargas en lavadora automática (carga superior o frontal) y lavado manual. Dosificación recomendada: 80 a 100 ml por carga de 10-15 kg. Fórmula biodegradable con bicarbonato y tensioactivos activos que cuidan los tejidos.';
                break;
            case '10L':
                detallesCantidad = 'Contenido neto exacto: 10 Litros (10.000 ml). Rendimiento garantizado: Rinde hasta 100 cargas en lavadora automática y lavado a mano. Dosificación: 80 a 100 ml por carga completa. Alta remoción de manchas y protección de fibras.';
                break;
            case '3.8L':
                detallesCantidad = 'Contenido neto exacto: 3.8 Litros (1 Galón / 3.800 ml). Rendimiento garantizado: Rinde hasta 38 cargas en lavadora automática. Formulación concentrada para todo tipo de ropa blanca y de color.';
                break;
            case '1/2G':
                detallesCantidad = 'Contenido neto exacto: 1.9 Litros (1/2 Galón / 1.900 ml). Rendimiento garantizado: Rinde hasta 19 cargas de lavadora. Apto para lavadoras de carga frontal, superior y lavado manual.';
                break;
            default:
                detallesCantidad = `Contenido neto: ${sizeLabel}. Apto para lavadora automática y lavado a mano con alto rendimiento por dosis.`;
        }
    }
    // ─── B. SUAVIZANTES DE ROPA (Taxonomía 633) ───
    else if (categoryId === 633) {
        switch (size) {
            case '20L':
                detallesCantidad = 'Contenido neto exacto: 20 Litros (20.000 ml). Rendimiento: Rinde hasta 250 ciclos de enjuague en lavadora automática. Microcápsulas de perfume de liberación prolongada que suavizan fibras y facilitan el planchado.';
                break;
            case '10L':
                detallesCantidad = 'Contenido neto exacto: 10 Litros (10.000 ml). Rendimiento: Rinde hasta 125 ciclos de enjuague en lavadora. Fragancia floral de alta adherencia y suavizado profundo.';
                break;
            case '3.8L':
                detallesCantidad = 'Contenido neto exacto: 3.8 Litros (1 Galón / 3.800 ml). Rendimiento: Rinde hasta 45 ciclos de enjuague en lavadora. Fórmula concentrada que acondiciona las telas.';
                break;
            case '1/2G':
                detallesCantidad = 'Contenido neto exacto: 1.9 Litros (1/2 Galón / 1.900 ml). Rendimiento: Rinde hasta 22 ciclos de enjuague en lavadora automática y manual.';
                break;
            default:
                detallesCantidad = `Contenido neto: ${sizeLabel}. Suavizante concentrado de alto rendimiento con microcápsulas de aroma.`;
        }
    }
    // ─── C. DESENGRASANTES (INDUSTRIAL Y HOGAR) ───
    else if (id.includes('desengrasante') || nameLower.includes('desengrasante')) {
        const esIndustrial = id.includes('industrial') || nameLower.includes('industrial');
        const dilucion = esIndustrial ? 'diluible hasta 1:10 en agua pesada' : 'diluible hasta 1:10 para limpieza diaria';
        switch (size) {
            case '20L':
                detallesCantidad = `Contenido neto exacto: 20 Litros (20.000 ml). Fórmula concentrada de fábrica ${dilucion} (rinde hasta 200 Litros de solución limpiadora activa). Remueve grasa pesada, aceites y suciedad adherida en campanas, estufas, pisos y motores.`;
                break;
            case '10L':
                detallesCantidad = `Contenido neto exacto: 10 Litros (10.000 ml). Fórmula concentrada ${dilucion} (rinde hasta 100 Litros de solución limpiadora). Poder arrancagrasa instantáneo sin dañar superficies.`;
                break;
            case '3.8L':
                detallesCantidad = `Contenido neto exacto: 3.8 Litros (1 Galón / 3.800 ml). Fórmula concentrada ${dilucion} (rinde hasta 38 Litros de solución desengrasante). Ideal para cocina, talleres y áreas de alto tráfico.`;
                break;
            case '1/2G':
                detallesCantidad = `Contenido neto exacto: 1.9 Litros (1/2 Galón / 1.900 ml). Fórmula concentrada ${dilucion} (rinde hasta 19 Litros de solución limpiadora). Práctico envase con alta concentración activa.`;
                break;
            default:
                detallesCantidad = `Contenido neto: ${sizeLabel}. Alto poder desengrasante concentrado diluible.`;
        }
    }
    // ─── D. LAVALOZA / LAVAVAJILLAS (Taxonomía 634) ───
    else if (categoryId === 634 || id.includes('lavaloza') || nameLower.includes('lavaloza')) {
        switch (size) {
            case '20L':
                detallesCantidad = 'Contenido neto exacto: 20 Litros (20.000 ml). Ultra concentrado con alto poder desengrasante y espuma controlada. Rinde miles de lavadas de vajilla, ollas y cristalería comercial o doméstica.';
                break;
            case '10L':
                detallesCantidad = 'Contenido neto exacto: 10 Litros (10.000 ml). Rendimiento: Rinde hasta 1.000 lavadas de vajilla. Corta la grasa al instante y neutraliza olores difíciles.';
                break;
            case '3.8L':
                detallesCantidad = 'Contenido neto exacto: 3.8 Litros (1 Galón / 3.800 ml). Rendimiento: Rinde hasta 380 lavadas completas de vajilla y utensilios. Fórmula suave con las manos.';
                break;
            case '1/2G':
                detallesCantidad = 'Contenido neto exacto: 1.9 Litros (1/2 Galón / 1.900 ml). Rendimiento: Rinde hasta 190 lavadas de vajilla. Máxima remoción de grasa acumulada.';
                break;
            default:
                detallesCantidad = `Contenido neto: ${sizeLabel}. Lavaloza líquido concentrado con alto poder desengrasante.`;
        }
    }
    // ─── E. LIMPIAPISOS Y DESINFECTANTES ───
    else if (id.includes('limpiapisos') || nameLower.includes('limpiapisos') || id.includes('desinfectante') || id.includes('cloro') || id.includes('blanqueador')) {
        switch (size) {
            case '20L':
                detallesCantidad = 'Contenido neto exacto: 20 Litros (20.000 ml). Rendimiento: Diluible hasta 1:20 (rinde hasta 200 baldes de trapeado y desinfección). Aroma prolongado y secado rápido sin dejar huellas.';
                break;
            case '10L':
                detallesCantidad = 'Contenido neto exacto: 10 Litros (10.000 ml). Rendimiento: Rinde hasta 100 baldes de limpieza profunda y desinfección de pisos y superficies.';
                break;
            case '3.8L':
                detallesCantidad = 'Contenido neto exacto: 3.8 Litros (1 Galón / 3.800 ml). Rendimiento: Rinde hasta 38 baldes de limpieza diaria.';
                break;
            case '1/2G':
                detallesCantidad = 'Contenido neto exacto: 1.9 Litros (1/2 Galón / 1.900 ml). Rendimiento: Rinde hasta 19 baldes de limpieza y ambientación.';
                break;
            default:
                detallesCantidad = `Contenido neto: ${sizeLabel}. Limpieza y desinfección profunda concentrada.`;
        }
    }
    // ─── F. COMBOS Y KITS (Desglose de Litros Totales) ───
    else if (product.categoria === 'Kits & Combos' || id.includes('combo') || id.includes('kit') || id.includes('matrimonio')) {
        const kitSpec = KIT_COMPOSITION_MAP[product.id];
        if (kitSpec) {
            const descomp = kitSpec.components.map(c => `${c.cantidad}x ${c.size}`).join(' + ');
            detallesCantidad = `Contenido total del combo: ${kitSpec.totalWeightKg} Litros distribuidos en ${kitSpec.components.length} presentaciones (${descomp}). Rinde múltiples ciclos completos de lavandería y aseo general directo de fábrica.`;
        } else if (id.includes('lavanderia-cocina')) {
            detallesCantidad = 'Contenido total del kit: 12.8 Litros (10L Detergente Ropa + 1.9L Suavizante + 1.9L Lavaloza + 1L Quitamanchas). Rinde más de 120 ciclos de lavado y limpieza profunda.';
        } else if (id.includes('matrimonio')) {
            detallesCantidad = 'Contenido total del kit: 23.8 Litros (20 Litros Detergente Ropa Líquido + 3.8 Litros Lavaloza Hogar + Dispensador). Rinde más de 200 lavadas de ropa y meses de vajilla limpia.';
        } else {
            detallesCantidad = 'Contenido total: Combo ahorro multimax de fábrica con envases institucionales de alta concentración.';
        }
    }
    // ─── G. PRESENTACIÓN ESTÁNDAR ───
    else {
        switch (size) {
            case '20L': detallesCantidad = 'Contenido neto exacto: 20 Litros (20.000 ml).'; break;
            case '10L': detallesCantidad = 'Contenido neto exacto: 10 Litros (10.000 ml).'; break;
            case '3.8L': detallesCantidad = 'Contenido neto exacto: 3.8 Litros (1 Galón / 3.800 ml).'; break;
            case '1/2G': detallesCantidad = 'Contenido neto exacto: 1.9 Litros (1/2 Galón / 1.900 ml).'; break;
            case '1KG': detallesCantidad = 'Contenido neto exacto: 1 Kilogramo (1.000 g).'; break;
            case '4KG': detallesCantidad = 'Contenido neto exacto: 4 Kilogramos (4.000 g).'; break;
            case '10KG': detallesCantidad = 'Contenido neto exacto: 10 Kilogramos (10.000 g).'; break;
            case '20KG': detallesCantidad = 'Contenido neto exacto: 20 Kilogramos (20.000 g).'; break;
            case '60ML': detallesCantidad = 'Contenido neto exacto: 60 mililitros.'; break;
            default: detallesCantidad = `Presentación: ${sizeLabel}.`; break;
        }
    }

    const geoCoverage = 'Venta directa de fábrica Biocambio360 con despacho rápido en Bogotá, Soacha, Cundinamarca y toda Colombia. Pago seguro contraentrega y respaldo directo de fabricante.';

    return `${baseDesc} ${detallesCantidad} ${geoCoverage}`.replace(/\s+/g, ' ').trim();
}

/**
 * Genera el XML completo del Feed para Google Merchant Center y Meta Shopping
 */
export async function generateMerchantFeedXml(): Promise<string> {
    const products = await getAllProducts();
    const items: string[] = [];

    for (const product of products) {
        if (!product || !product.id) continue;
        if (product.status === 'draft' || product.status === 'archived' || (product as any).isDeleted) continue;

        const prices = product.precios || {};
        const sizes = Object.keys(prices);
        const slug = generateProductSlug(product);
        const productUrl = `${BASE_URL}/producto/${slug}`;

        // Si el producto no tiene tamaños explícitos, usar DEFAULT
        const effectiveSizes = sizes.length > 0 ? sizes : ['DEFAULT'];

        for (const size of effectiveSizes) {
            const priceValue = prices[size] || Object.values(prices)[0] || 0;
            if (!priceValue || priceValue <= 0) continue;

            // Precio de referencia / competidor tachado
            const competitorPrice = (product.competidorPromedio && (product.competidorPromedio[size] || Object.values(product.competidorPromedio)[0])) || Math.round(priceValue * 1.35);
            const regularPrice = competitorPrice > priceValue ? competitorPrice : Math.round(priceValue * 1.35);

            const sizeClean = size.replace(/\./g, '_').toUpperCase();
            const skuId = `BIO-${product.id.toUpperCase()}-${sizeClean}`;
            const sizeLabel = SIZE_LABELS[size] || size;
            const googleCatId = getGoogleTaxonomyCategory(product);

            // Título optimizado con intención de búsqueda
            const title = getOptimizedTitle(product, sizeLabel, googleCatId);

            // Descripción enriquecida con cantidad exacta y rendimiento
            const description = getEnrichedDescription(product, size, sizeLabel, googleCatId);

            const imgFileName = getProductImage(product, size);
            const imageUrl = `${BASE_URL}/images/${encodeURIComponent(imgFileName).replace(/%2F/g, '/')}`;

            const priceFormatted = `${regularPrice.toFixed(2)} COP`;
            const salePriceFormatted = `${priceValue.toFixed(2)} COP`;

            const category = product.categoria || 'Aseo y Limpieza';
            const subcategory = product.subcategoria || 'General';
            const productType = `Aseo & Limpieza > ${category}${subcategory ? ` > ${subcategory}` : ''}`;

            const variantUrl = size !== 'DEFAULT' ? `${productUrl}?tamano=${encodeURIComponent(size)}` : productUrl;

            // Medidas unitarias para Google Shopping
            const unitPricing = getUnitPricingMeasures(size);
            const unitPricingTags = unitPricing
                ? `\n      <g:unit_pricing_measure>${unitPricing.measure}</g:unit_pricing_measure>\n      <g:unit_pricing_base_measure>${unitPricing.base}</g:unit_pricing_base_measure>`
                : '';

            items.push(`    <item>
      <g:id>${escapeXml(skuId)}</g:id>
      <g:item_group_id>${escapeXml(product.id)}</g:item_group_id>
      <g:title><![CDATA[${title}]]></g:title>
      <g:description><![CDATA[${description}]]></g:description>
      <g:link>${escapeXml(variantUrl)}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
      <g:brand>Biocambio360</g:brand>
      <g:condition>new</g:condition>
      <g:availability>in_stock</g:availability>
      <g:price>${priceFormatted}</g:price>
      <g:sale_price>${salePriceFormatted}</g:sale_price>
      <g:size>${escapeXml(sizeLabel)}</g:size>${unitPricingTags}
      <g:google_product_category>${googleCatId}</g:google_product_category>
      <g:product_type><![CDATA[${productType}]]></g:product_type>
      <g:identifier_exists>no</g:identifier_exists>
      <g:mpn>${escapeXml(skuId)}</g:mpn>
      <g:custom_label_0>${escapeXml(category)}</g:custom_label_0>
      <g:custom_label_1>${escapeXml(sizeLabel)}</g:custom_label_1>
      <g:custom_label_2>Bogota Cundinamarca y Colombia</g:custom_label_2>
      <g:custom_label_3>Venta Directa de Fabrica</g:custom_label_3>
      <g:custom_label_4>${size === '20L' ? 'Mayor Ahorro 20L' : 'Presentacion Estandar'}</g:custom_label_4>
      <g:shipping>
        <g:country>CO</g:country>
        <g:service>Envío Rápido Bogotá, Cundinamarca y Nacional</g:service>
        <g:price>0.00 COP</g:price>
      </g:shipping>
    </item>`);
        }
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Biocambio360 - Catálogo Oficial de Fábrica (Meta Shopping &amp; Google Merchant)</title>
    <link>${BASE_URL}</link>
    <description>Catálogo oficial de productos Biocambio360 optimizado para Google Merchant Center y Meta Shopping con precios unitarios, rendimiento en lavados y dosificaciones de fábrica.</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items.join('\n')}
  </channel>
</rss>`;
}
