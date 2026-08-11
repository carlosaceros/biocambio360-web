'use client';

import { useFomoTimer } from '@/lib/fomo-timer';
import { PRODUCTOS } from '@/lib/products-data';
import ProductCard from '@/components/ProductCard';
import { Flame, Clock, Sparkles, ShieldCheck, ChevronRight } from 'lucide-react';
import { Product } from '@/lib/products';

interface KitsSectionProps {
    onAddToCart?: (product: Product, size: string, price: number, cantidad: number) => void;
    onViewDetails?: (product: Product) => void;
    onVerTodosKits?: () => void;
}

// Featured kits to show in the preview (best sellers first)
const FEATURED_KIT_IDS = [
    'kit-limpieza-completo-1-20l',
    'kit-combo-lavanderia-cocina',
    'kit-combo-duo-10-10-detergente-desengrasante',
];

export default function KitsSection({ onAddToCart, onViewDetails, onVerTodosKits }: KitsSectionProps) {
    const { isVisible, formattedTime } = useFomoTimer();

    if (!isVisible) return null;

    const allKits = PRODUCTOS.filter(p => p.categoria === 'Kits & Combos');
    const totalKits = allKits.length;

    // Show only 3 featured kits in the preview
    const featuredKits = FEATURED_KIT_IDS
        .map(id => allKits.find(p => p.id === id))
        .filter(Boolean) as Product[];

    // Fallback: if featured kits not found, use first 3
    const displayKits = featuredKits.length >= 3 ? featuredKits : allKits.slice(0, 3);

    const handleVerTodos = () => {
        if (onVerTodosKits) {
            onVerTodosKits();
        } else {
            // Default: scroll to catalog and filter by Kits & Combos
            document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <section id="kits-especiales" className="my-12 px-4 md:px-6 max-w-7xl mx-auto scroll-mt-24">
            <div className="bg-gradient-to-br from-amber-500/10 via-pink-500/5 to-purple-600/10 rounded-[3rem] border-2 border-pink-500/20 p-6 md:p-12 shadow-2xl relative overflow-hidden">
                
                {/* Header Info */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-pink-200/50 pb-6">
                    <div>
                        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-600 to-amber-600 text-white font-black text-[10px] uppercase px-4 py-1.5 rounded-full shadow-lg mb-3">
                            <Flame size={14} className="fill-yellow-300" />
                            KITS & COMBOS ESPECIALES DE FÁBRICA
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black text-[var(--brand-dark)] tracking-tight">
                            Kits Ahorro Total Biocambio360
                        </h2>
                        <p className="text-gray-600 text-sm md:text-base font-medium mt-1">
                            Combos de insumos industriales concentrados para Bogotá, Medellín, Cali, Barranquilla y toda Colombia.
                        </p>
                    </div>

                    {/* Live Countdown Box */}
                    <div className="bg-gradient-to-r from-[var(--brand-dark)] to-slate-900 text-white p-4 rounded-2xl border border-white/10 shadow-xl flex items-center gap-3 shrink-0">
                        <div className="p-2.5 bg-pink-500/20 rounded-xl text-pink-400">
                            <Clock size={22} className="animate-pulse" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">OFERTA LIMITADA DE FÁBRICA</p>
                            <p className="font-mono text-xl font-black text-yellow-300 tracking-wider">
                                {formattedTime}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Grid of 3 Featured Kit Products */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayKits.map(product => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            onAddToCart={onAddToCart}
                            onViewDetails={onViewDetails}
                        />
                    ))}
                </div>

                {/* Ver todos los kits CTA */}
                {totalKits > 3 && (
                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={handleVerTodos}
                            className="group flex items-center gap-3 bg-gradient-to-r from-pink-600 to-amber-500 text-white font-black text-sm px-8 py-4 rounded-2xl shadow-lg hover:shadow-pink-500/30 hover:shadow-xl transition-all duration-300 hover:scale-105"
                        >
                            <Sparkles size={18} className="group-hover:animate-spin" />
                            Ver todos los Kits & Combos
                            <span className="bg-white/20 text-white text-xs font-black px-2.5 py-1 rounded-full">
                                {totalKits} combos
                            </span>
                            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <p className="text-xs text-gray-500 font-medium">
                            🎁 Ahorra más comprando en combo · Envío nacional garantizado
                        </p>
                    </div>
                )}

                <div className="mt-8 text-center bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-pink-100 flex flex-wrap items-center justify-around gap-4 text-xs font-extrabold text-gray-700">
                    <span className="flex items-center gap-1.5">
                        <ShieldCheck size={16} className="text-emerald-600" />
                        Garantía Directa de Fábrica
                    </span>
                    <span className="flex items-center gap-1.5">
                        🚚 Despacho Inmediato Nacional
                    </span>
                    <span className="flex items-center gap-1.5">
                        💳 Pago Seguro Wompi (Nequi/Daviplata/Tarjetas)
                    </span>
                </div>

            </div>
        </section>
    );
}
