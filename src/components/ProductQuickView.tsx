'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Plus, Minus, ArrowRight, ShieldCheck, Truck, CreditCard } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Product, ProductSize, calcularAhorro, formatCurrency } from '@/lib/products';
import Link from 'next/link';
import { generateProductSlug, getProductImage } from '@/lib/product-utils';

interface ProductQuickViewProps {
    product: Product | null;
    isOpen: boolean;
    onClose: () => void;
    onAddToCart: (product: Product, size: string, price: number, cantidad: number) => void;
}

const SIZE_ORDER: string[] = ['500ML', '1L', '1/2G', '3.8L', '10L', '20L'];

const SIZE_LABELS: Record<string, string> = {
    '500ML': '500 ML',
    '1L':    '1 L',
    '1/2G':  '½ Gal',
    '3.8L':  '1 Gal',
    '10L':   '10 L',
    '20L':   '20 L 🔥',
};

export default function ProductQuickView({ product, isOpen, onClose, onAddToCart }: ProductQuickViewProps) {
    const [selectedSize, setSelectedSize] = useState<string>('');
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        if (product) {
            const sizes = Object.keys(product.precios).sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b));
            setSelectedSize(sizes[0]);
            setQuantity(1);
        }
    }, [product]);

    if (!product) return null;

    const availableSizes = Object.keys(product.precios).sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b));
    const price = product.precios[selectedSize];
    const savingsData = calcularAhorro(price, selectedSize, product.competidorPromedio[selectedSize]);
    const productSlug = generateProductSlug(product.id, product.nombre);

    const handleAdd = () => {
        onAddToCart(product, selectedSize, price, quantity);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-[var(--brand-dark)]/40 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden border border-white/20"
                    >
                        {/* Close Button */}
                        <button 
                            onClick={onClose}
                            className="absolute top-4 right-4 z-20 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
                        >
                            <X size={20} />
                        </button>

                        {/* Left: Image Section */}
                        <div className="w-full md:w-1/2 bg-gradient-to-br from-gray-50 to-[var(--brand-blue-50)] flex items-center justify-center p-6 md:p-12 relative min-h-[220px] md:min-h-[350px] overflow-hidden flex-shrink-0">
                            <motion.img
                                key={selectedSize}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                src={`/images/${getProductImage(product, selectedSize)}`}
                                alt={product.nombre}
                                className="max-h-[200px] sm:max-h-[260px] md:max-h-[320px] max-w-full h-auto object-contain drop-shadow-2xl z-10"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/images/placeholder.png';
                                }}
                            />
                            
                            <div className="absolute bottom-6 left-6 flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/50 shadow-sm z-20">
                                <span className="text-[10px] font-extrabold text-[var(--brand-blue)] tracking-wider">FABRICACIÓN NACIONAL 🇨🇴</span>
                            </div>
                        </div>

                        {/* Right: Info Section */}
                        <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col">
                            <div className="mb-6">
                                <span className="inline-block px-3 py-1 bg-[var(--brand-blue-50)] text-[var(--brand-blue)] text-[10px] font-bold rounded-full mb-3 tracking-widest uppercase">
                                    {product.categoria}
                                </span>
                                <h2 className="text-3xl font-extrabold text-[var(--brand-dark)] leading-tight mb-2">
                                    {product.nombre}
                                </h2>
                                <p className="text-gray-500 leading-relaxed text-sm whitespace-pre-line">
                                    {product.descripcion}
                                </p>
                            </div>

                            {/* Size Selector */}
                            {availableSizes.length > 1 && (
                                <div className="mb-6">
                                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-3 block">
                                        Tamaño / Presentación
                                    </label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {availableSizes.map(size => (
                                            <button
                                                key={size}
                                                onClick={() => setSelectedSize(size)}
                                                className={`py-2 text-xs font-bold rounded-xl border-2 transition-all ${selectedSize === size
                                                    ? 'border-[var(--brand-blue)] bg-[var(--brand-blue-50)] text-[var(--brand-blue)] shadow-sm'
                                                    : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'
                                                }`}
                                            >
                                                {SIZE_LABELS[size] || size}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Price and Quantity */}
                            <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
                                <div>
                                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Precio Unitario</p>
                                    <div className="flex items-baseline gap-2">
                                        {product.competidorPromedio && product.competidorPromedio[selectedSize] && product.competidorPromedio[selectedSize] > price && (
                                            <span className="text-sm text-gray-400 line-through font-bold">
                                                {formatCurrency(product.competidorPromedio[selectedSize])}
                                            </span>
                                        )}
                                        <span className="text-3xl font-black text-[var(--brand-dark)] tracking-tight">
                                            {formatCurrency(price)}
                                        </span>
                                    </div>
                                    {savingsData.mostrarFOMO && (
                                        <span className="text-[10px] font-bold text-[var(--brand-success)] flex items-center gap-1 mt-1">
                                            📉 Ahorras {formatCurrency(savingsData.ahorroDinero)} vs competidor
                                        </span>
                                    )}
                                </div>

                                <div className="bg-gray-50 p-1 rounded-2xl border border-gray-100 flex items-center gap-1">
                                    <button 
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        className="p-3 hover:bg-white rounded-xl transition-colors text-gray-400 hover:text-[var(--brand-pink)]"
                                    >
                                        <Minus size={18} />
                                    </button>
                                    <span className="w-10 text-center font-black text-lg text-[var(--brand-dark)]">
                                        {quantity}
                                    </span>
                                    <button 
                                        onClick={() => setQuantity(quantity + 1)}
                                        className="p-3 hover:bg-white rounded-xl transition-colors text-gray-400 hover:text-[var(--brand-success)]"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-3 mb-8">
                                <button
                                    onClick={handleAdd}
                                    className="w-full bg-[var(--brand-dark)] hover:bg-[var(--brand-dark-secondary)] text-white font-extrabold py-4 rounded-2xl transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-3"
                                >
                                    <ShoppingCart size={20} />
                                    AGREGAR AL CARRITO
                                </button>
                                <button className="w-full bg-gradient-to-r from-[var(--brand-pink)] to-[var(--brand-pink-dark)] text-white font-extrabold py-4 rounded-2xl transition-all shadow-xl shadow-[var(--brand-pink)]/20">
                                    COMPRAR AHORA
                                </button>
                            </div>

                            {/* Footer links & trust */}
                            <div className="mt-auto pt-4 flex items-center justify-between">
                                <Link 
                                    href={`/producto/${productSlug}`}
                                    onClick={onClose}
                                    className="text-xs font-extrabold text-[var(--brand-blue)] flex items-center gap-1.5 hover:gap-2 transition-all group"
                                >
                                    VER DETALLE COMPLETO
                                    <ArrowRight size={14} className="transition-transform" />
                                </Link>

                                <div className="flex gap-3">
                                    <div className="group relative">
                                        <ShieldCheck size={18} className="text-gray-300 hover:text-[var(--brand-success)] transition-colors" />
                                        <span className="absolute bottom-full right-0 mb-2 w-max bg-gray-800 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">Calidad Garantizada</span>
                                    </div>
                                    <div className="group relative">
                                        <Truck size={18} className="text-gray-300 hover:text-[var(--brand-blue)] transition-colors" />
                                        <span className="absolute bottom-full right-0 mb-2 w-max bg-gray-800 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">Envío Seguro</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
