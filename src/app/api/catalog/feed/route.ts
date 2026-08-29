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
    '1L': '1 Litro',
    '1/2G': 'Medio Galón (1.9L)',
    '3.8L': '1 Galón (3.8L)',
    '10L': '10 Litros',
    '20L': '20 Litros',
    '500ML': '500 ml',
    '60ML': '60 ml',
    '15L': '15 Litros',
    '1KG': '1 Kg',
    '4KG': '4 Kg',
    '10KG': '10 Kg',
    '20KG': '20 Kg',
    'COMBO': 'Combo Completo',
    'DEFAULT': 'Estándar',
};

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
                const skuId = `${product.id}-${sizeClean}`;
                const sizeLabel = SIZE_LABELS[size] || size;
                const title = `${product.nombre} (${sizeLabel}) | Biocambio360`;
                const description = product.descripcion 
                    ? `${product.descripcion} Presentación: ${sizeLabel}. Fabricado directamente por Biocambio360 S.A.S.`
                    : `${product.nombre} de alta concentración para el aseo y limpieza profesional e industrial. Presentación: ${sizeLabel}.`;

                const imgFileName = getProductImage(product, size);
                const imageUrl = `${BASE_URL}/images/${encodeURIComponent(imgFileName).replace(/%2F/g, '/')}`;
                const priceFormatted = `${Math.round(priceValue)} COP`;

                const category = product.categoria || 'Aseo y Limpieza';
                const subcategory = product.subcategoria || 'General';
                const productType = `Aseo & Limpieza > ${category}${subcategory ? ` > ${subcategory}` : ''}`;

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
      <g:availability>in stock</g:availability>
      <g:price>${priceFormatted}</g:price>
      <g:google_product_category>632</g:google_product_category>
      <g:product_type><![CDATA[${productType}]]></g:product_type>
      <g:identifier_exists>no</g:identifier_exists>
      <g:custom_label_0>${escapeXml(category)}</g:custom_label_0>
      <g:custom_label_1>${escapeXml(sizeLabel)}</g:custom_label_1>
      <g:custom_label_2>Venta Directa de Fabrica</g:custom_label_2>
      <g:shipping>
        <g:country>CO</g:country>
        <g:service>Envío Nacional con Cobertura 99 Envíos</g:service>
        <g:price>0 COP</g:price>
      </g:shipping>
    </item>`);
            }
        }

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Biocambio360 - Catálogo Oficial de Productos de Fábrica</title>
    <link>${BASE_URL}</link>
    <description>Catálogo sincronizado en tiempo real de productos de aseo, limpieza industrial y combos Biocambio360 para Meta Commerce Manager y Google Merchant.</description>
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
        console.error('[API/CatalogFeed] Error generating XML feed:', err);
        return new NextResponse('Error generating product feed', { status: 500 });
    }
}
