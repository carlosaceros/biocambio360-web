'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ShoppingCart, Search, Plus, Minus } from 'lucide-react';
import { Product, ProductSize, calcularAhorro, formatCurrency } from '@/lib/products';
import { generateProductSlug, getProductImage } from '@/lib/product-utils';

interface ProductCardProps {
    product: Product;
    onAddToCart?: (product: Product, size: string, price: number, cantidad: number) => void;
    onViewDetails?: (product: Product) => void;
}

import { useEffect } from 'react';

// Top 5 most purchased sizes displayed in the initial catalog grid
const TOP_SIZES: ProductSize[] = ['1L', '1/2G', '3.8L', '10L', '20L'];

// Ordered from smallest to largest
const SIZE_ORDER: ProductSize[] = ['1L', '1/2G', '3.8L', '10L', '20L'];

// Human-readable label for each size
const SIZE_LABELS: Record<string, string> = {
    '1L':   '1 L',
    '1/2G': '½ Gal',
    '3.8L': '1 Gal',
    '10L':  '10 L',
    '20L':  '20 L 🔥',
    '500ML': '500 ml',
    '60ML': '60 ml',
    '15L': '15 L',
    '1KG': '1 Kg',
    '4KG': '4 Kg',
    '10KG': '10 Kg',
    '20KG': '20 Kg',
    'COMBO': 'Combo Completo',
    'DEFAULT': 'Estándar'
};

// Placeholder SVG rendered inline
const PLACEHOLDER_EMOJI: Record<string, string> = {
    detergente:   '🧺',
    desengrasante:'🧴',
    suavizante:   '🌸',
    blanqueador:  '🫧',
};

export default function ProductCard({ product, onAddToCart, onViewDetails }: ProductCardProps) {
    const [imgError, setImgError] = useState(false);

    if (!product || !product.id) return null;

    // Get all sizes sorted by size order
    const allSizes = Object.keys(product.precios || {}).sort(
        (a, b) => (SIZE_ORDER.indexOf(a as ProductSize) !== -1 ? SIZE_ORDER.indexOf(a as ProductSize) : 99) - 
                  (SIZE_ORDER.indexOf(b as ProductSize) !== -1 ? SIZE_ORDER.indexOf(b as ProductSize) : 99)
    );
    
    // Filter to top 5 most purchased sizes for grid view
    const mainSizes = allSizes.filter(s => TOP_SIZES.includes(s as ProductSize));
    const displaySizes = mainSizes.length > 0 ? mainSizes : allSizes;

    const initialSize = (product.precios && product.precios[displaySizes[0]] !== undefined) 
        ? displaySizes[0] 
        : (Object.keys(product.precios || {})[0] || '3.8L');

    const [selectedSize, setSelectedSize] = useState<string>(initialSize);

    // Keep selectedSize synchronized with valid keys of current product
    useEffect(() => {
        if (!product.precios || product.precios[selectedSize] === undefined) {
            const fallback = displaySizes[0] || Object.keys(product.precios || {})[0] || '3.8L';
            setSelectedSize(fallback);
        }
    }, [product, displaySizes, selectedSize]);

    const effectiveSize = (product.precios && product.precios[selectedSize] !== undefined)
        ? selectedSize
        : (displaySizes[0] || Object.keys(product.precios || {})[0] || selectedSize);

    const currentPrice = product.precios?.[effectiveSize] 
        || product.precios?.[displaySizes[0]] 
        || Object.values(product.precios || {})[0] 
        || 0;

    // Dynamically resolve image for selected size on-demand
    const imgSrc = `/images/${getProductImage(product, selectedSize)}`;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -6 }}
            onClick={() => onViewDetails?.(product)}
            className="bg-white rounded-[2rem] shadow-sm border border-gray-100 flex flex-col hover:shadow-2xl hover:shadow-[var(--brand-blue)]/10 transition-all duration-500 group overflow-hidden cursor-pointer h-full"
        >
            {/* Product image container */}
            <div className="group/img relative h-60 bg-gradient-to-br from-gray-50 to-[var(--brand-blue-50)]/50 flex items-center justify-center p-6 overflow-hidden">
                <div className="absolute inset-0 opacity-0 group-hover/img:opacity-100 transition-all duration-700 bg-radial-gradient from-[var(--brand-blue)]/5 to-transparent" />
                
                {imgError ? (
                    <div className="flex flex-col items-center justify-center gap-2 z-10">
                        <span className="text-6xl select-none">{PLACEHOLDER_EMOJI[product.id] ?? '🧹'}</span>
                    </div>
                ) : (
                    <motion.img
                        key={selectedSize}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.08, rotate: 2 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        src={imgSrc}
                        alt={product.nombre}
                        className="max-h-full max-w-full object-contain drop-shadow-2xl z-10"
                        onError={() => setImgError(true)}
                    />
                )}

                {/* Badge top-left */}
                {product.badge && (
                    <div className="absolute top-4 left-4 bg-[var(--brand-blue)] text-white text-[9px] font-black px-3 py-1.5 rounded-full shadow-lg z-20 tracking-tighter uppercase">
                        {product.badge}
                    </div>
                )}

                {/* Quick View Overlay (Only when hovering directly over image area) */}
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--brand-dark)]/5 backdrop-blur-[2px] opacity-0 group-hover/img:opacity-100 transition-all duration-300 z-20 pointer-events-none">
                    <div className="bg-white text-[var(--brand-dark)] font-black text-[10px] px-5 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 transform translate-y-4 group-hover/img:translate-y-0 transition-transform">
                        <Search size={14} strokeWidth={3} />
                        VISTA RÁPIDA
                    </div>
                </div>
            </div>

            <div className="p-5 flex flex-col flex-1 bg-white">
                <div className="mb-2">
                    <span className="text-[9px] font-black text-[var(--brand-blue)] uppercase tracking-[0.2em] mb-1 block">
                        {product.categoria}
                    </span>
                    <h3 className="text-[var(--brand-dark)] font-extrabold text-base leading-tight group-hover:text-[var(--brand-blue)] transition-colors">
                        {product.nombre}
                    </h3>
                    {product.shortDescription && (
                        <p className="mt-2 text-xs text-gray-600 leading-snug line-clamp-2 min-h-[2.25rem]">
                            {product.shortDescription}
                        </p>
                    )}
                </div>

                {/* Top 5 Most Purchased Sizes Pills */}
                {displaySizes.length > 1 && (
                    <div className="flex flex-wrap gap-1.5 my-3 z-20" onClick={(e) => e.stopPropagation()}>
                        {displaySizes.map((size) => {
                            const isSelected = selectedSize === size;
                            return (
                                <button
                                    key={size}
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedSize(size);
                                        setImgError(false);
                                    }}
                                    className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer ${
                                        isSelected
                                            ? 'bg-[var(--brand-blue)] text-white shadow-sm scale-105'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {SIZE_LABELS[size] || size}
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className="mt-auto pt-3 flex items-end justify-between border-t border-gray-50">
                    <div>
                        <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest mb-0.5">
                            Precio ({SIZE_LABELS[effectiveSize] || effectiveSize})
                        </p>
                        <div className="flex items-baseline gap-1.5">
                            {product.competidorPromedio && product.competidorPromedio[effectiveSize] && product.competidorPromedio[effectiveSize] > currentPrice && (
                                <span className="text-xs text-gray-400 line-through font-bold">
                                    {formatCurrency(product.competidorPromedio[effectiveSize])}
                                </span>
                            )}
                            <span className="text-xl font-black text-[var(--brand-dark)] tracking-tight">
                                {formatCurrency(currentPrice)}
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddToCart?.(product, effectiveSize, currentPrice, 1);
                        }}
                        className="w-10 h-10 rounded-2xl bg-[var(--brand-blue-50)] text-[var(--brand-blue)] flex items-center justify-center hover:bg-[var(--brand-blue)] hover:text-white transition-all duration-300 shadow-sm hover:shadow-[var(--brand-blue)]/20 cursor-pointer"
                        title="Agregar al carrito"
                    >
                        <Plus size={20} strokeWidth={3} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

