import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import {
    getAllProductSlugs,
    getProductBySlug,
    generateProductMetadata,
    generateProductSchema,
    generateBreadcrumbSchema,
    generateFAQSchema,
    getRelatedProducts
} from '@/lib/product-utils';
import ProductPageContent from '@/components/ProductPageContent';

// ISR: Revalidate the page every 60 seconds to pull new products
export const revalidate = 60;

// SSG: Generate static pages for all products
export async function generateStaticParams() {
    const slugs = await getAllProductSlugs();
    return slugs.map((slug) => ({
        slug,
    }));
}

// SEO: Generate dynamic metadata per product
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const product = await getProductBySlug(slug);

    if (!product) {
        return {
            title: 'Producto no encontrado | Biocambio360',
            description: 'El producto que buscas no existe'
        };
    }

    return generateProductMetadata(product);
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const product = await getProductBySlug(slug);

    if (!product) {
        notFound();
    }

    const relatedProducts = await getRelatedProducts(product.id, 3);
    const productSchema = generateProductSchema(product);
    const breadcrumbSchema = generateBreadcrumbSchema(product);
    const faqSchema = generateFAQSchema(product);

    return (
        <>
            {/* Schema.org Product JSON-LD */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
            />

            {/* Schema.org Breadcrumb JSON-LD */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
            />

            {/* Schema.org FAQ JSON-LD — Enables rich FAQ snippets in Google */}
            {faqSchema && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
                />
            )}

            <ProductPageContent product={product} relatedProducts={relatedProducts} />
        </>
    );
}
