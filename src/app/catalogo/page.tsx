import { Suspense } from 'react';
import { existsSync } from 'fs';
import path from 'path';
import type { Metadata } from 'next';
import { getSellableProducts, sizeLabel } from '@/lib/ai-agent-knowledge';
import { isDisallowedSize } from '@/lib/products';
import CatalogClient, { type CatalogProduct } from './CatalogClient';

export const revalidate = 300;

export const metadata: Metadata = {
    title: 'Catálogo de productos de aseo y limpieza',
    description: 'Catálogo visual de Biocambio360 por categorías: detergentes, suavizantes, desengrasantes, kits y más, con fotos, presentaciones y precios de fábrica, envío a nivel nacional a toda Colombia.',
    alternates: { canonical: 'https://biocambio360.com/catalogo' },
};

const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');

/** A real product photo, not an empty value or the generic logo/placeholder used as a filler. */
function isRealPhoto(file: string | undefined | null): file is string {
    if (!file || /placeholder|logo-biocambio360/i.test(file)) return false;
    return existsSync(path.join(IMAGES_DIR, file));
}

export default async function CatalogPage() {
    const products = await getSellableProducts();
    const data: CatalogProduct[] = products
        .map(p => {
            const mainImage = isRealPhoto(p.imgFile) ? `/images/${p.imgFile}` : null;
            const sizes = Object.entries(p.precios ?? {})
                .filter(([size, price]) => !isDisallowedSize(size) && Number(price) > 0)
                .map(([size, price]) => {
                    const perSizeFile = p.imgFiles?.[size];
                    const image = isRealPhoto(perSizeFile) ? `/images/${perSizeFile}` : mainImage;
                    return { label: sizeLabel(size), price: Number(price), image };
                })
                .sort((a, b) => a.price - b.price);
            return {
                id: p.id,
                nombre: p.nombre,
                categoria: p.categoria || 'Otros',
                subcategoria: p.subcategoria || null,
                descripcion: String(p.shortDescription || p.slogan || '').replace(/\s+/g, ' ').trim().slice(0, 140),
                hasImage: !!mainImage || sizes.some(s => !!s.image),
                image: mainImage ?? sizes.find(s => s.image)?.image ?? null,
                badge: p.badge || '',
                featured: !!p.isFeatured,
                sizes,
            };
        })
        .filter(p => p.sizes.length > 0);
    return (
        <Suspense fallback={null}>
            <CatalogClient products={data} />
        </Suspense>
    );
}
