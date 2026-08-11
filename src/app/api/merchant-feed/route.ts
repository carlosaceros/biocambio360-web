import { NextResponse } from 'next/server';
import { getAllProducts } from '@/lib/products-service';
import { generateProductSlug } from '@/lib/product-utils';

const BASE_URL = 'https://www.biocambio360.com';

const SIZES: Array<'3.8L' | '10L' | '20L'> = ['3.8L', '10L', '20L'];

export async function GET() {
    const products = await getAllProducts();

    const items: string[] = [];

    for (const product of products) {
        for (const size of SIZES) {
            const price = product.precios[size];
            const slug = generateProductSlug(product.id, product.nombre);
            const itemId = `${product.id}-${size.replace('.', '_')}`;
            const title = `${product.nombre} ${size} Industrial | Biocambio360`;
            const description = `${product.descripcion} Presentación ${size}. ${product.slogan}`;
            const imageUrl = `${BASE_URL}/images/${product.imgFile.replace(/%20/g, ' ')}`;
            const productUrl = `${BASE_URL}/producto/${slug}`;
            const priceFormatted = `${price} COP`;

            items.push(`
        <item>
          <g:id>${itemId}</g:id>
          <g:title><![CDATA[${title}]]></g:title>
          <g:description><![CDATA[${description}]]></g:description>
          <g:link>${productUrl}</g:link>
          <g:image_link>${imageUrl}</g:image_link>
          <g:condition>new</g:condition>
          <g:availability>in stock</g:availability>
          <g:price>${priceFormatted}</g:price>
          <g:brand>Biocambio360</g:brand>
          <g:product_type>Productos de Limpieza &gt; Aseo Industrial</g:product_type>
          <g:google_product_category>632</g:google_product_category>
          <g:identifier_exists>no</g:identifier_exists>
          <g:shipping>
            <g:country>CO</g:country>
            <g:service>Envío Estándar</g:service>
            <g:price>12000 COP</g:price>
          </g:shipping>
          <g:custom_label_0>${size}</g:custom_label_0>
        </item>`);
        }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Biocambio360 - Limpieza Industrial</title>
    <link>${BASE_URL}</link>
    <description>Productos de aseo industrial directo de fábrica. Envíos a toda Colombia.</description>
    ${items.join('\n')}
  </channel>
</rss>`;

    return new NextResponse(xml, {
        status: 200,
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        },
    });
}
