import { NextResponse } from 'next/server';
import { getAllProducts } from '@/lib/products-service';
import { generateProductSlug, getProductImage } from '@/lib/product-utils';
import { Product } from '@/lib/products';

const BASE_URL = 'https://www.biocambio360.com';

function escapeXml(unsafe: string): string {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

const SIZE_LABELS: Record<string, string> = {
    '1/2G': 'Medio Galón (1.9L)',
    '3.8L': '1 Galón (3.8L)',
    '10L': 'Garrafa 10 Litros',
    '20L': 'Pimpina 20 Litros',
    '15L': 'Bidón 15 Litros',
    '1KG': 'Pote 1 Kg',
    '4KG': 'Galón 4 Kg',
    '10KG': 'Balde 10 Kg',
    '20KG': 'Caneca 20 Kg',
    '60ML': 'Frasco 60 ml',
    'COMBO': 'Combo Ahorro Fábrica',
    'DEFAULT': 'Presentación Estándar',
};

function getGoogleTaxonomyCategory(product: Product): number {
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

export async function GET() {
    try {
        const products = await getAllProducts();
        const items: string[] = [];

        for (const product of products) {
            if (!product || !product.id) continue;

            const prices = product.precios || {};
            const sizes = Object.keys(prices);
            const slug = generateProductSlug(product);
            const productUrl = `${BASE_URL}/producto/${slug}`;

            // Si el producto no tiene tamaños explícitos, usar DEFAULT
            const effectiveSizes = sizes.length > 0 ? sizes : ['DEFAULT'];

            for (const size of effectiveSizes) {
                const priceValue = prices[size] || Object.values(prices)[0] || 0;
                if (!priceValue || priceValue <= 0) continue;

                const sizeClean = size.replace(/\./g, '_').toUpperCase();
                const skuId = `BIO-${product.id.toUpperCase()}-${sizeClean}`;
                const sizeLabel = SIZE_LABELS[size] || size;
                
                // Titulo optimizado para Google Shopping & Search
                const title = `${product.nombre} ${sizeLabel} | Venta Directa Fábrica Bogotá y Colombia`;
                
                // Descripcion con enriquecimiento GEO y de producto
                const baseDesc = product.descripcion 
                    ? product.descripcion.trim()
                    : `${product.nombre} de alta concentración para el aseo, desinfección y limpieza profesional e industrial.`;
                
                const geoCoverage = `Venta directa de fábrica Biocambio360 con despacho rápido en Bogotá (Suba, Engativá, Kennedy, Fontibón, Usaquén, Chapinero, Bosa, Teusaquillo), municipios de Cundinamarca (Soacha, Facatativá, Chía, Mosquera, Madrid, Funza, Zipaquirá, Cajicá, Cota, Sibaté) y envíos a toda Colombia (Medellín, Cali, Barranquilla, Bucaramanga, Pereira, Manizales, Cartagena). Pago seguro y contraentrega disponible.`;
                
                const description = `${baseDesc} Presentación: ${sizeLabel}. ${geoCoverage}`;

                const imgFileName = getProductImage(product, size);
                const imageUrl = `${BASE_URL}/images/${encodeURIComponent(imgFileName).replace(/%2F/g, '/')}`;
                const priceFormatted = `${Math.round(priceValue)} COP`;

                const category = product.categoria || 'Aseo y Limpieza';
                const subcategory = product.subcategoria || 'General';
                const productType = `Aseo & Limpieza > ${category}${subcategory ? ` > ${subcategory}` : ''}`;
                const googleCatId = getGoogleTaxonomyCategory(product);

                const variantUrl = size !== 'DEFAULT' ? `${productUrl}?tamano=${encodeURIComponent(size)}` : productUrl;

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
        <g:service>Envío Rápido Bogotá, Soacha, Facatativá, Chía y Nacional</g:service>
        <g:price>0 COP</g:price>
      </g:shipping>
    </item>`);
            }
        }

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Biocambio360 - Catálogo Oficial de Fábrica (Google Merchant &amp; Meta Ads)</title>
    <link>${BASE_URL}</link>
    <description>Catálogo oficial de productos de aseo, limpieza industrial y combos Biocambio360 para Google Merchant Center, Google Shopping y Meta Commerce Manager con cobertura en Bogotá, Cundinamarca y toda Colombia.</description>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items.join('\n')}
  </channel>
</rss>`;

        return new NextResponse(xml, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
            },
        });
    } catch (err: any) {
        console.error('[API/MerchantFeed] Error generating XML feed:', err);
        return new NextResponse('Error generating merchant feed', { status: 500 });
    }
}
