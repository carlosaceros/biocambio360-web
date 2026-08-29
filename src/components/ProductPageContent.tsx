'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ShoppingCart, 
    ArrowLeft, 
    Package, 
    Truck, 
    Shield, 
    ChevronDown, 
    ChevronUp,
    Sparkles,
    HelpCircle,
    FileText,
    CheckCircle2,
    ClipboardList 
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Product, formatCurrency, calcularAhorro } from '@/lib/products';
import { useCart } from '@/lib/cart-context';
import ProductCard from '@/components/ProductCard';
import Toast from '@/components/Toast';
import { getRichProductDetails, getSchwartzCopy, getProductImage, generateProductSlug } from '@/lib/product-utils';
import { getManualContentForProduct, MANUAL_NOTICE_TEXT } from '@/lib/products-rich-data';
import { trackViewContent } from '@/lib/meta-pixel';

// Fixed size order
const SIZE_ORDER: string[] = ['500ML', '1L', '1/2G', '3.8L', '10L', '20L'];

// Badge on product image per size
const SIZE_PHOTO_BADGE: Record<string, { label: string; bg: string } | null> = {
    '500ML': null,
    '1L':    null,
    '1/2G':  null,
    '3.8L':  null,
    '10L': { label: '10 Litros', bg: 'bg-blue-600' },
    '20L': { label: '20 Litros 🔥', bg: 'bg-orange-600' },
};

interface ProductPageContentProps {
    product: Product;
    relatedProducts: Product[];
}

export default function ProductPageContent({ product, relatedProducts }: ProductPageContentProps) {
    const router = useRouter();
    const { addToCart, setIsCartOpen, getTotalItems } = useCart();
    
    const searchParams = useSearchParams();

    // Sort available sizes and pick the first one, filtering out DEFAULT if other sizes exist
    const rawSizes = Object.keys(product.precios);
    const hasOtherSizes = rawSizes.some(s => s !== 'DEFAULT');
    const filteredSizes = hasOtherSizes ? rawSizes.filter(s => s !== 'DEFAULT') : rawSizes;

    const availableSizes = filteredSizes.sort((a, b) => {
        const indexA = SIZE_ORDER.indexOf(a);
        const indexB = SIZE_ORDER.indexOf(b);
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    const paramSizeRaw = (searchParams?.get('tamano') || searchParams?.get('size') || searchParams?.get('presentacion') || '').trim();
    const findMatchingSize = (target: string): string | undefined => {
        if (!target) return undefined;
        const normalized = target.toLowerCase().replace(/[^a-z0-9]/g, '');
        return availableSizes.find(s => {
            const sNorm = s.toLowerCase().replace(/[^a-z0-9]/g, '');
            return sNorm === normalized || s.toLowerCase() === target.toLowerCase();
        });
    };

    const initialSize = findMatchingSize(paramSizeRaw) || availableSizes[0] || '10L';
    const [selectedSize, setSelectedSize] = useState<string>(initialSize);

    // Sync if URL search params change
    useEffect(() => {
        if (paramSizeRaw) {
            const matched = findMatchingSize(paramSizeRaw);
            if (matched && matched !== selectedSize) {
                setSelectedSize(matched);
            }
        }
    }, [paramSizeRaw, availableSizes]);

    const handleSizeSelect = (newSize: string) => {
        setSelectedSize(newSize);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('tamano', newSize);
            window.history.replaceState({}, '', url.toString());
        }
    };

    const [quantity, setQuantity] = useState(1);
    const [showToast, setShowToast] = useState(false);
    const [toastData, setToastData] = useState<{ name: string; size: string }>({
        name: product.nombre,
        size: initialSize,
    });
    const [mediaTab, setMediaTab] = useState<'image' | 'video'>('image');
    const [imageError, setImageError] = useState(false);
    const richDetails = getRichProductDetails(product);
    const schwartzCopy = getSchwartzCopy(product);
    const manualContent = getManualContentForProduct(product);
    const [expandedSection, setExpandedSection] = useState<string | null>('dosificacion');

    // Reset image error state when size or product changes
    useEffect(() => {
        setImageError(false);
    }, [selectedSize, product.id]);

    const price = product.precios[selectedSize] || 0;

    // Meta Pixel: Track ViewContent when viewing product
    useEffect(() => {
        if (product && product.id) {
            const currentPrice = product.precios[selectedSize] || Object.values(product.precios)[0] || 0;
            trackViewContent({
                content_ids: [product.sku || `${product.id}-${selectedSize}`],
                content_name: `${product.nombre} (${selectedSize})`,
                content_type: 'product',
                currency: 'COP',
                value: currentPrice,
            });
        }
    }, [product, selectedSize]);

    const savingsData = calcularAhorro(
        price,
        selectedSize,
        product.competidorPromedio[selectedSize] || price * 1.5
    );

    const handleAddToCart = () => {
        addToCart(product, selectedSize as any, price, quantity);
        setToastData({ name: product.nombre, size: selectedSize });
        setShowToast(true);
    };

    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    return (
        <>
            <Toast
                show={showToast}
                message="Producto agregado"
                productName={toastData.name}
                size={toastData.size}
                onClose={() => setShowToast(false)}
            />

            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                {/* Sticky header with breadcrumb + cart */}
                <header className="bg-white border-b shadow-sm sticky top-0 z-50">
                    <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                        <nav className="flex items-center gap-2 text-sm text-gray-500">
                            <Link href="/" className="hover:text-[var(--brand-blue)] transition-colors">Inicio</Link>
                            <span>/</span>
                            <Link href="/#catalogo" className="hover:text-[var(--brand-blue)] transition-colors">Productos</Link>
                            <span>/</span>
                            <span className="text-gray-900 font-medium truncate max-w-[140px] sm:max-w-none">{product.nombre}</span>
                        </nav>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsCartOpen(true)}
                            className="relative flex items-center gap-2 bg-[var(--brand-blue)] hover:bg-[var(--brand-blue-dark)] text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-md"
                        >
                            <ShoppingCart size={18} />
                            <span className="hidden sm:inline">Ver carrito</span>
                            <AnimatePresence>
                                {getTotalItems() > 0 && (
                                    <motion.span
                                        key={getTotalItems()}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0 }}
                                        className="absolute -top-2 -right-2 bg-white text-[var(--brand-blue)] text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-[var(--brand-blue)] shadow"
                                    >
                                        {getTotalItems()}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </motion.button>
                    </div>
                </header>

                {/* Main Content */}
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <motion.button
                        whileHover={{ x: -5 }}
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-600 hover:text-[var(--brand-blue)] mb-6 transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span className="font-medium">Volver</span>
                    </motion.button>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 mb-16">
                        {/* Left: Product Image & Video Gallery */}
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white rounded-2xl p-8 shadow-lg"
                        >
                            {/* Media Tab Selector for Detergente product */}
                            {(product.id === 'detergente' || product.nombre.toLowerCase().includes('detergente')) && (
                                <div className="flex items-center gap-2 mb-4">
                                    <button
                                        type="button"
                                        onClick={() => setMediaTab('image')}
                                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                            mediaTab === 'image'
                                                ? 'bg-[var(--brand-blue)] text-white shadow-md'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        📷 Fotografía ({selectedSize})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMediaTab('video')}
                                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                            mediaTab === 'video'
                                                ? 'bg-[var(--brand-pink)] text-white shadow-md'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        🎥 Video Fábrica (Tipo Rey)
                                    </button>
                                </div>
                            )}

                            <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden">
                                {mediaTab === 'video' && (product.id === 'detergente' || product.nombre.toLowerCase().includes('detergente')) ? (
                                    <div className="relative w-full h-full bg-black rounded-xl overflow-hidden">
                                        <video
                                            controls
                                            autoPlay
                                            muted
                                            loop
                                            playsInline
                                            className="w-full h-full object-cover"
                                        >
                                            <source src="/videos/detergente-tipo-rey.mp4" type="video/mp4" />
                                            <source src="/videos/detergente-tipo-rey.mov" type="video/quicktime" />
                                        </video>
                                        <div className="absolute top-3 left-3 bg-[var(--brand-pink)] text-white text-[9px] font-black px-3 py-1 rounded-full shadow z-10 uppercase tracking-widest">
                                            🎥 Pruebas de Fábrica · Detergente Ropa Tipo Rey
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <Image
                                            src={imageError ? '/images/placeholder.png' : `/images/${getProductImage(product, selectedSize)}`}
                                            alt={`${product.nombre} ${selectedSize}`}
                                            fill
                                            priority
                                            className="object-contain p-8"
                                            sizes="(max-width: 768px) 100vw, 50vw"
                                            onError={() => setImageError(true)}
                                        />
                                        {product.badge && (
                                            <div className="absolute top-4 left-4 bg-[var(--brand-blue)] text-white text-xs font-black px-4 py-2 rounded-r-full shadow-lg">
                                                {product.badge}
                                            </div>
                                        )}
                                        {/* Size badge on photo */}
                                        {SIZE_PHOTO_BADGE[selectedSize] && (
                                            <motion.div
                                                key={selectedSize}
                                                initial={{ scale: 0.7, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className={`absolute bottom-4 right-4 ${SIZE_PHOTO_BADGE[selectedSize]!.bg} text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg`}
                                            >
                                                {SIZE_PHOTO_BADGE[selectedSize]!.label}
                                            </motion.div>
                                        )}
                                        {/* Colombia badge */}
                                        <div className="absolute bottom-4 left-4 flex items-center gap-1 bg-white/95 text-[10px] font-black px-2.5 py-1.5 rounded-full shadow text-gray-700">
                                            🇨🇴 <span>100% Colombiano</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Trust Badges */}
                            <div className="grid grid-cols-3 gap-4 mt-6">
                                <div className="text-center p-3 bg-blue-50 rounded-lg">
                                    <Shield className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                                    <p className="text-[10px] font-bold text-gray-700">Calidad Garantizada</p>
                                </div>
                                <div className="text-center p-3 bg-green-50 rounded-lg">
                                    <Truck className="w-6 h-6 text-green-600 mx-auto mb-1" />
                                    <p className="text-[10px] font-bold text-gray-700">Envío Rastreado</p>
                                </div>
                                <div className="text-center p-3 bg-orange-50 rounded-lg">
                                    <Package className="w-6 h-6 text-orange-600 mx-auto mb-1" />
                                    <p className="text-[10px] font-bold text-gray-700">Empaque Seguro</p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Right: Product Info + Purchase */}
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex flex-col"
                        >
                            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-lg sticky top-4">
                                <span className="text-xs font-bold text-[var(--brand-blue)] uppercase tracking-wider">
                                    {product.id === 'desengrasante' || product.id === 'bactokill' 
                                        ? 'USO MULTISUPERFICIES: HOGAR, NEGOCIOS E INDUSTRIA' 
                                        : (product.categoria ? `LÍNEA ${product.categoria.toUpperCase()}` : 'LÍNEA DE ASEO Y LIMPIEZA PROFESIONAL')}
                                </span>
                                <h1 className="text-3xl md:text-4xl font-black text-gray-900 mt-2 mb-4" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
                                    {product.nombre}
                                </h1>
                                <div className="space-y-4 mb-6">
                                    <div className="text-gray-700 font-medium leading-relaxed border-l-4 border-[var(--brand-blue)] pl-4 whitespace-pre-line text-sm md:text-base">
                                        {product.descripcion}
                                    </div>
                                    
                                    {/* Ficha de Conciencia & Valor (Schwartz SEO/AEO/GEO) */}
                                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4 text-sm text-gray-700">
                                        <div id="schwartz-problema" className="space-y-1">
                                            <h4 className="font-bold uppercase tracking-wider text-xs text-[var(--brand-pink)]">El Problema de Limpieza</h4>
                                            <p className="text-sm leading-relaxed whitespace-pre-line">{schwartzCopy.problema}</p>
                                        </div>
                                        <div id="schwartz-solucion" className="space-y-1">
                                            <h4 className="font-bold uppercase tracking-wider text-xs text-[var(--brand-blue)]">La Alternativa Inteligente</h4>
                                            <p className="text-sm leading-relaxed whitespace-pre-line">{schwartzCopy.solucion}</p>
                                        </div>
                                        <div id="schwartz-producto" className="space-y-1">
                                            <h4 className="font-bold uppercase tracking-wider text-xs text-green-700">Ventaja Activa Biocambio360</h4>
                                            <p className="text-sm leading-relaxed whitespace-pre-line">{schwartzCopy.producto}</p>
                                        </div>
                                        <div id="schwartz-geo" className="space-y-1">
                                            <h4 className="font-bold uppercase tracking-wider text-xs text-gray-500">Distribución en Bogotá</h4>
                                            <p className="text-sm leading-relaxed whitespace-pre-line">{schwartzCopy.transaccion}</p>
                                        </div>
                                        
                                        {/* Bloque de Cita RAG/LLM */}
                                        <div id="aeo-fact-sheet" className="pt-3 mt-3 border-t border-gray-200 bg-white p-3.5 rounded-xl border border-gray-100">
                                            <span className="font-black text-xs uppercase tracking-[0.15em] text-gray-400 block mb-1">Ficha Informativa (Citable por LLM/AI)</span>
                                            <blockquote className="italic text-sm text-gray-600 font-medium leading-relaxed whitespace-pre-line">
                                                "{schwartzCopy.citableQuote}"
                                            </blockquote>
                                        </div>
                                    </div>
                                </div>

                                {/* Size Selector */}
                                {availableSizes.length > 1 && (
                                    <div className="mb-6">
                                        <label className="text-sm font-bold text-gray-700 mb-3 block">
                                            Selecciona Presentación:
                                        </label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {availableSizes.map(size => (
                                                <motion.button
                                                    key={size}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => handleSizeSelect(size)}
                                                    className={`p-4 rounded-xl border-2 transition-all ${selectedSize === size
                                                            ? 'border-[var(--brand-pink)] bg-[var(--brand-pink-50)] shadow-md'
                                                            : 'border-gray-200 hover:border-gray-300 bg-white'
                                                        }`}
                                                >
                                                    <div className="text-2xl font-black text-gray-900">{size}</div>
                                                    <div className={`text-xs mt-1 ${selectedSize === size ? 'text-[var(--brand-pink)]' : 'text-gray-500'}`}>
                                                        {formatCurrency(product.precios[size] || 0)}
                                                    </div>
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Price Display */}
                                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 mb-6">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-sm text-gray-600 font-medium">Precio por unidad:</span>
                                        <div className="text-right">
                                            {product.competidorPromedio && product.competidorPromedio[selectedSize] && product.competidorPromedio[selectedSize] > product.precios[selectedSize] && (
                                                <span className="text-sm text-gray-400 line-through font-bold block mb-0.5">
                                                    {formatCurrency(product.competidorPromedio[selectedSize])}
                                                </span>
                                            )}
                                            <div className="text-3xl font-black text-gray-900" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
                                                {formatCurrency(product.precios[selectedSize])}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                ${savingsData.nuestroPrecioML}/ml
                                            </div>
                                        </div>
                                    </div>
                                    {savingsData.mostrarFOMO && (
                                        <div className="mt-3 pt-3 border-t border-gray-200">
                                            <span className="text-sm font-black text-green-600 flex items-center gap-2">
                                                📉 Ahorras {formatCurrency(savingsData.ahorroDinero)} ({savingsData.ahorroPorcentaje}%) vs otras marcas
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Quantity Selector */}
                                <div className="mb-6">
                                    <label className="text-sm font-bold text-gray-700 mb-3 block">
                                        Cantidad:
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                            className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center text-gray-700 font-bold transition-colors"
                                        >
                                            −
                                        </motion.button>
                                        <div className="flex-1 text-center">
                                            <div className="text-2xl font-black">{quantity}</div>
                                            <div className="text-xs text-gray-500">
                                                Total: {formatCurrency(product.precios[selectedSize] * quantity)}
                                            </div>
                                        </div>
                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => setQuantity(quantity + 1)}
                                            className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center text-gray-700 font-bold transition-colors"
                                        >
                                            +
                                        </motion.button>
                                    </div>
                                </div>

                                {/* CTA Buttons */}
                                <div className="space-y-3">
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleAddToCart}
                                        className="w-full bg-[var(--brand-blue)] hover:bg-[var(--brand-blue-dark)] text-white font-black py-4 rounded-xl shadow-lg shadow-[var(--brand-blue-light)] transition-all flex items-center justify-center gap-2"
                                    >
                                        <ShoppingCart size={20} />
                                        AGREGAR AL CARRITO
                                    </motion.button>
                                    <button
                                        onClick={() => setIsCartOpen(true)}
                                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-4 rounded-xl transition-colors"
                                    >
                                        VER CARRITO
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Expandable Sections - Semantically Rich for SEO/AEO/GEO/RAGs */}
                    <div className="max-w-4xl mx-auto mb-16 space-y-4">
                        {/* Banner Educativo & Bioseguridad */}
                        <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-blue-300 font-extrabold text-xs uppercase tracking-wider">
                                    <Shield className="w-4 h-4" /> Bioseguridad & Normativa Colombiana NTC / SGA
                                </div>
                                <h3 className="font-extrabold text-lg text-white">¿Tienes dudas de cómo usar o mezclar este producto?</h3>
                                <p className="text-xs text-slate-300">Consulta nuestra Guía Oficial de Uso y Matriz de Mezclas Químicas Permitidas y Prohibidas.</p>
                            </div>
                            <Link
                                href="/guia-uso-y-mezclas"
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow shrink-0"
                            >
                                Ver Guía de Mezclas →
                            </Link>
                        </div>

                        {/* Componentes del Kit (Si es Kit o Combo) */}
                        {product.categoria === 'Kits & Combos' && (
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-2xl shadow-md border border-blue-200 overflow-hidden">
                                <div className="p-6 border-b border-blue-100">
                                    <h3 className="flex items-center gap-3 text-lg font-black text-blue-950">
                                        <Package className="text-blue-600 w-5 h-5" />
                                        Componentes Incluidos en este Kit & Especificaciones
                                    </h3>
                                    <p className="text-sm text-blue-800 mt-1 font-medium">
                                        Este kit reúne la combinación sinérgica de productos formulados para cubrir todo el espectro de aseo con el mejor costo por mililitro:
                                    </p>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    {product.beneficios.map((ben, idx) => (
                                        <div key={idx} className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex items-start gap-3">
                                            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                                                {idx + 1}
                                            </span>
                                            <div>
                                                <h4 className="font-extrabold text-gray-900 text-sm">{ben}</h4>
                                                <p className="text-gray-600 text-sm mt-0.5">
                                                    Formulación industrial concentrada. Consultar dosificación y tabla de bioseguridad.
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 1. Beneficios & Diferenciadores */}
                        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                            <button
                                onClick={() => toggleSection('beneficios')}
                                className="w-full p-6 flex justify-between items-center hover:bg-gray-50 transition-colors text-left"
                            >
                                <span className="flex items-center gap-3 text-lg font-black text-gray-900">
                                    <Sparkles className="text-[var(--brand-pink)] w-5 h-5" />
                                    Beneficios y Diferenciadores
                                </span>
                                {expandedSection === 'beneficios' ? <ChevronUp /> : <ChevronDown />}
                            </button>
                            {expandedSection === 'beneficios' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="px-6 pb-6"
                                >
                                    <ul className="space-y-3">
                                        {richDetails.diferenciadores.map((dif, idx) => (
                                            <li key={idx} className="flex gap-3 text-sm text-gray-600">
                                                <CheckCircle2 className="text-green-500 w-5 h-5 flex-shrink-0 mt-0.5" />
                                                <span>{dif}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </motion.div>
                            )}
                        </div>

                        {/* 2. Instrucciones y Dosificación */}
                        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                            <button
                                onClick={() => toggleSection('instrucciones')}
                                className="w-full p-6 flex justify-between items-center hover:bg-gray-50 transition-colors text-left"
                            >
                                <span className="flex items-center gap-3 text-lg font-black text-gray-900">
                                    <ClipboardList className="text-[var(--brand-blue)] w-5 h-5" />
                                    Instrucciones de Uso y Dosificación
                                </span>
                                {expandedSection === 'instrucciones' ? <ChevronUp /> : <ChevronDown />}
                            </button>
                            {expandedSection === 'instrucciones' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="px-6 pb-6"
                                >
                                    <ol className="space-y-4">
                                        {richDetails.instrucciones.map((inst, idx) => (
                                            <li key={idx} className="flex gap-4 text-sm text-gray-600">
                                                <span className="w-6 h-6 rounded-full bg-[var(--brand-blue-50)] text-[var(--brand-blue)] font-black text-xs flex items-center justify-center flex-shrink-0">
                                                    {idx + 1}
                                                </span>
                                                <span className="pt-0.5">{inst}</span>
                                            </li>
                                        ))}
                                    </ol>
                                </motion.div>
                            )}
                        </div>

                        {/* 2.5 Guía Técnica de Dosificación y Rendimiento (Manual Oficial ML-01) */}
                        {manualContent && (
                            <div className="bg-white rounded-2xl shadow-md border border-blue-100 overflow-hidden">
                                <button
                                    onClick={() => toggleSection('dosificacion')}
                                    className="w-full p-6 flex justify-between items-center bg-gradient-to-r from-blue-50/80 to-indigo-50/50 hover:bg-blue-100/50 transition-colors text-left"
                                >
                                    <span className="flex items-center gap-3 text-lg font-black text-blue-950">
                                        <ClipboardList className="text-blue-600 w-5 h-5" />
                                        Dosificación y Rendimiento Oficial (Manual ML-01)
                                    </span>
                                    {expandedSection === 'dosificacion' ? <ChevronUp className="text-blue-900" /> : <ChevronDown className="text-blue-900" />}
                                </button>
                                {expandedSection === 'dosificacion' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="p-6 space-y-6"
                                    >
                                        <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 text-sm text-blue-900 leading-relaxed">
                                            <p className="font-semibold">{manualContent.enrichedIntroduction}</p>
                                        </div>

                                        {/* Desktop Table View (6 columns) */}
                                        <div className="hidden md:block overflow-x-auto border border-gray-100 rounded-xl">
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead className="bg-slate-900 text-white font-extrabold uppercase tracking-wider text-[11px]">
                                                    <tr>
                                                        <th scope="col" className="p-3">Uso / Superficie</th>
                                                        <th scope="col" className="p-3">Concentración</th>
                                                        <th scope="col" className="p-3">Dilución</th>
                                                        <th scope="col" className="p-3">Cantidad Recomendada</th>
                                                        <th scope="col" className="p-3">Tiempo de Contacto</th>
                                                        <th scope="col" className="p-3">Rendimiento Aproximado</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 text-gray-700">
                                                    {manualContent.usageRows.map((row, idx) => (
                                                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                                            <td className="p-3 font-bold text-gray-900">{row.useOrSurface}</td>
                                                            <td className="p-3">{row.concentration}</td>
                                                            <td className="p-3">{row.dilution}</td>
                                                            <td className="p-3 font-semibold text-blue-700">{row.amount}</td>
                                                            <td className="p-3">{row.contactTime}</td>
                                                            <td className="p-3 font-extrabold text-emerald-700">{row.approximateYield}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile Responsive Cards View */}
                                        <div className="md:hidden space-y-3">
                                            {manualContent.usageRows.map((row, idx) => (
                                                <div key={idx} className="bg-gradient-to-br from-gray-50 to-blue-50/30 p-4 rounded-xl border border-gray-200 text-xs space-y-2">
                                                    <div className="font-black text-blue-950 text-sm border-b border-gray-200 pb-1.5 flex justify-between items-center">
                                                        <span>{row.useOrSurface}</span>
                                                        <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold">{row.concentration}</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 text-gray-600">
                                                        <div>
                                                            <span className="font-bold text-gray-800 block text-[10px] uppercase">Dilución:</span>
                                                            {row.dilution}
                                                        </div>
                                                        <div>
                                                            <span className="font-bold text-gray-800 block text-[10px] uppercase">Cantidad:</span>
                                                            <span className="font-bold text-blue-700">{row.amount}</span>
                                                        </div>
                                                        <div>
                                                            <span className="font-bold text-gray-800 block text-[10px] uppercase">Contacto:</span>
                                                            {row.contactTime}
                                                        </div>
                                                        <div>
                                                            <span className="font-bold text-gray-800 block text-[10px] uppercase">Rendimiento:</span>
                                                            <span className="font-black text-emerald-700">{row.approximateYield}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Recommendations & Warnings */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                            {manualContent.recommendations.length > 0 && (
                                                <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100">
                                                    <h4 className="font-black text-emerald-950 mb-2 uppercase tracking-wider">💡 Recomendaciones de Aplicación</h4>
                                                    <ul className="space-y-1.5 text-emerald-900 list-disc list-inside">
                                                        {manualContent.recommendations.map((rec, idx) => (
                                                            <li key={idx}>{rec}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {manualContent.warnings.length > 0 && (
                                                <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-100">
                                                    <h4 className="font-black text-amber-950 mb-2 uppercase tracking-wider">⚠️ Precauciones Importantes</h4>
                                                    <ul className="space-y-1.5 text-amber-900 list-disc list-inside">
                                                        {manualContent.warnings.map((warn, idx) => (
                                                            <li key={idx}>{warn}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>

                                        {/* General Mandatory Warning Notice */}
                                        <div className="bg-gray-100 p-4 rounded-xl border border-gray-200 text-xs text-gray-600 leading-relaxed italic">
                                            <span className="font-bold text-gray-900 not-italic block mb-1">📌 Aviso de Rendimiento y Dosificación:</span>
                                            {MANUAL_NOTICE_TEXT}
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        )}

                        {/* 3. Ficha Técnica - GEO Optimization */}
                        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                            <button
                                onClick={() => toggleSection('ficha')}
                                className="w-full p-6 flex justify-between items-center hover:bg-gray-50 transition-colors text-left"
                            >
                                <span className="flex items-center gap-3 text-lg font-black text-gray-900">
                                    <FileText className="text-gray-500 w-5 h-5" />
                                    Ficha Técnica y Especificaciones
                                </span>
                                {expandedSection === 'ficha' ? <ChevronUp /> : <ChevronDown />}
                            </button>
                            {expandedSection === 'ficha' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="px-6 pb-6"
                                >
                                    <div className="border border-gray-100 rounded-xl overflow-hidden text-sm">
                                        <table className="w-full border-collapse">
                                            <tbody>
                                                <tr className="border-b border-gray-100">
                                                    <td className="bg-gray-50 p-3 font-bold text-gray-700 w-1/3">Presentaciones</td>
                                                    <td className="p-3 text-gray-600">{availableSizes.join(', ')}</td>
                                                </tr>
                                                <tr className="border-b border-gray-100">
                                                    <td className="bg-gray-50 p-3 font-bold text-gray-700">Nivel de pH</td>
                                                    <td className="p-3 text-gray-600 whitespace-pre-line">{richDetails.ph}</td>
                                                </tr>
                                                <tr className="border-b border-gray-100">
                                                    <td className="bg-gray-50 p-3 font-bold text-gray-700">Dilución Sugerida</td>
                                                    <td className="p-3 text-gray-600 whitespace-pre-line">{richDetails.dilucion}</td>
                                                </tr>
                                                <tr className="border-b border-gray-100">
                                                    <td className="bg-gray-50 p-3 font-bold text-gray-700">Sostenibilidad</td>
                                                    <td className="p-3 text-gray-600 whitespace-pre-line">{richDetails.biodegradabilidad}</td>
                                                </tr>
                                                <tr className="border-b border-gray-100">
                                                    <td className="bg-gray-50 p-3 font-bold text-gray-700">Uso Recomendado</td>
                                                    <td className="p-3 text-gray-600 whitespace-pre-line">{richDetails.usoRecomendado}</td>
                                                </tr>
                                                <tr className="border-b border-gray-100">
                                                    <td className="bg-gray-50 p-3 font-bold text-gray-700">Fabricante</td>
                                                    <td className="p-3 text-gray-600">Biocambio360 S.A.S.</td>
                                                </tr>
                                                <tr>
                                                    <td className="bg-gray-50 p-3 font-bold text-gray-700">Origen de Producción</td>
                                                    <td className="p-3 text-gray-600">Soacha, Cundinamarca (Colombia) 🇨🇴</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* 4. Tabla de Presentaciones y Rendimiento Unitario - AEO / RAG / B2B */}
                        {availableSizes.length > 1 && (
                            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                                <button
                                    onClick={() => toggleSection('presentaciones')}
                                    className="w-full p-6 flex justify-between items-center hover:bg-gray-50 transition-colors text-left"
                                >
                                    <span className="flex items-center gap-3 text-lg font-black text-gray-900">
                                        <Package className="text-blue-600 w-5 h-5" />
                                        Presentaciones de Fábrica y Rendimiento por Litro
                                    </span>
                                    {expandedSection === 'presentaciones' ? <ChevronUp /> : <ChevronDown />}
                                </button>
                                {expandedSection === 'presentaciones' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="px-6 pb-6"
                                    >
                                        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                                            Comparativa de costos por litro y ahorro por volumen en venta directa de fábrica Biocambio360:
                                        </p>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                                                        <th className="p-3">Presentación</th>
                                                        <th className="p-3 text-right">Precio Fábrica</th>
                                                        <th className="p-3 text-right">Costo x Litro/Unidad</th>
                                                        <th className="p-3 text-center">Acción</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {availableSizes.map((sizeKey) => {
                                                        const sizePrice = product.precios[sizeKey] || 0;
                                                        let literFactor = 1;
                                                        if (sizeKey === '20L') literFactor = 20;
                                                        else if (sizeKey === '10L') literFactor = 10;
                                                        else if (sizeKey === '3.8L') literFactor = 3.8;
                                                        else if (sizeKey === '1/2G') literFactor = 1.9;
                                                        else if (sizeKey === '1L') literFactor = 1;
                                                        else if (sizeKey === '500ML') literFactor = 0.5;

                                                        const unitPrice = sizePrice / literFactor;
                                                        const isCurrent = selectedSize === sizeKey;

                                                        return (
                                                            <tr key={sizeKey} className={isCurrent ? 'bg-blue-50/60 font-bold' : 'hover:bg-gray-50'}>
                                                                <td className="p-3">
                                                                    <span className="font-black text-gray-900 text-sm">{sizeKey}</span>
                                                                    {sizeKey === '20L' && (
                                                                        <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-800">
                                                                            Mayor Ahorro 🔥
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="p-3 text-right font-black text-gray-900 text-sm">
                                                                    {formatCurrency(sizePrice)}
                                                                </td>
                                                                <td className="p-3 text-right text-gray-600 font-mono">
                                                                    {formatCurrency(Math.round(unitPrice))} / L
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    <button
                                                                        onClick={() => handleSizeSelect(sizeKey)}
                                                                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                                                                            isCurrent
                                                                                ? 'bg-blue-600 text-white shadow-sm'
                                                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                                        }`}
                                                                    >
                                                                        {isCurrent ? 'Seleccionado ✓' : 'Elegir'}
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        )}

                        {/* 5. Preguntas Frecuentes - AEO Optimization */}
                        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
                            <button
                                onClick={() => toggleSection('faqs')}
                                className="w-full p-6 flex justify-between items-center hover:bg-gray-50 transition-colors text-left"
                            >
                                <span className="flex items-center gap-3 text-lg font-black text-gray-900">
                                    <HelpCircle className="text-amber-500 w-5 h-5" />
                                    Preguntas Frecuentes (FAQs)
                                </span>
                                {expandedSection === 'faqs' ? <ChevronUp /> : <ChevronDown />}
                            </button>
                            {expandedSection === 'faqs' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="px-6 pb-6 divide-y divide-gray-100"
                                >
                                    {richDetails.faqs.map((faq, idx) => (
                                        <div key={idx} className="py-4 first:pt-0 last:pb-0 text-left">
                                            <h3 className="font-extrabold text-gray-900 mb-2 text-sm">
                                                {faq.q}
                                            </h3>
                                            <p className="text-sm text-gray-600 leading-relaxed">
                                                {faq.a}
                                            </p>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* Related Products */}
                    {relatedProducts.length > 0 && (
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 mb-6" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
                                Productos Relacionados
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {relatedProducts.map((prod) => (
                                    <ProductCard
                                        key={prod.id}
                                        product={prod}
                                        onAddToCart={(addedProduct, size, addedPrice, cantidad) => {
                                            addToCart(addedProduct, size as any, addedPrice, cantidad);
                                            setToastData({ name: addedProduct.nombre, size: size });
                                            setShowToast(true);
                                        }}
                                        onViewDetails={(prodDetails) => {
                                            router.push(`/producto/${generateProductSlug(prodDetails)}`);
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
