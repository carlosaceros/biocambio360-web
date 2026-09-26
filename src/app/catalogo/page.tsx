import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getSellableProducts, sizeLabel } from '@/lib/ai-agent-knowledge';
import { isDisallowedSize } from '@/lib/products';
import CatalogClient, { type CatalogProduct } from './CatalogClient';

export const revalidate = 300;

export const metadata: Metadata = {
    title: 'Catálogo de productos de aseo y limpieza',
    description: 'Catálogo visual de Biocambio360 por categorías: detergentes, suavizantes, desengrasantes, kits y más, con fotos, presentaciones y precios de fábrica.',
    alternates: { canonical: 'https://biocambio360.com/catalogo' },
};

export default async function CatalogPage() {
    const products = await getSellableProducts();
    const data: CatalogProduct[] = products
        .filter(p => p.imgFile)
        .map(p => ({
            id: p.id,
            nombre: p.nombre,
            categoria: p.categoria || 'Otros',
            subcategoria: p.subcategoria || null,
            descripcion: String(p.shortDescription || p.slogan || '').replace(/\s+/g, ' ').trim().slice(0, 140),
            imgFile: p.imgFile,
            badge: p.badge || '',
            featured: !!p.isFeatured,
            sizes: Object.entries(p.precios ?? {})
                .filter(([size, price]) => !isDisallowedSize(size) && Number(price) > 0)
                .map(([size, price]) => ({ label: sizeLabel(size), price: Number(price) }))
                .sort((a, b) => a.price - b.price),
        }))
        .filter(p => p.sizes.length > 0);
    return (
        <Suspense fallback={null}>
            <CatalogClient products={data} />
        </Suspense>
    );
}
