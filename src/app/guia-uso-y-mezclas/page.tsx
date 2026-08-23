'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldCheck,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Search,
    BookOpen,
    Droplets,
    Sparkles,
    ArrowLeft,
    ChevronDown,
    ChevronUp,
    FileText,
    HelpCircle
} from 'lucide-react';
import Link from 'next/link';
import { TABLA_MEZCLAS_OFICIAL, RICH_PRODUCT_SPECS, MezclaEntry } from '@/lib/products-rich-data';
import Footer from '@/components/Footer';

export default function GuiaUsoYMezclasPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<'all' | 'seguras' | 'peligrosas'>('all');
    const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

    const filteredMezclas = TABLA_MEZCLAS_OFICIAL.filter(m => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            m.producto.toLowerCase().includes(q) ||
            m.siMezclar.toLowerCase().includes(q) ||
            m.noMezclar.toLowerCase().includes(q) ||
            m.riesgo.toLowerCase().includes(q)
        );
    });

    const richProductsList = Object.entries(RICH_PRODUCT_SPECS);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
            {/* Header / Banner Principal */}
            <header className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white py-16 px-4 md:px-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent pointer-events-none" />
                <div className="max-w-6xl mx-auto relative z-10">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-blue-300 hover:text-white font-bold text-sm mb-6 transition-colors"
                    >
                        <ArrowLeft size={16} /> Volver al Inicio
                    </Link>
                    
                    <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 px-3.5 py-1.5 rounded-full text-blue-300 font-extrabold text-xs mb-4">
                        <ShieldCheck size={16} /> GUÍA OFICIAL DE BIOSEGURIDAD & NORMATIVA COLOMBIANA
                    </div>

                    <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
                        CENTRO DE EDUCACIÓN & TABLA DE MEZCLAS
                    </h1>

                    <p className="text-slate-300 text-lg max-w-3xl leading-relaxed">
                        En BioCambio360 nos tomamos la eficacia y tu seguridad muy en serio. Consulta aquí cómo dosificar tus productos, 
                        qué sustancias <strong className="text-emerald-400 font-black">SÍ</strong> se pueden combinar y cuáles <strong className="text-rose-400 font-black">NUNCA</strong> debes mezclar según los estándares de bioseguridad y la normativa colombiana (SGA / NTC).
                    </p>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 md:px-8 py-12 space-y-16">
                {/* 1. SECCIÓN: TABLA INTERACTIVA DE MEZCLAS Y INCOMPATIBILIDADES QUÍMICAS */}
                <section className="bg-white rounded-3xl p-6 md:p-10 shadow-xl border border-gray-100">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b pb-6">
                        <div>
                            <div className="flex items-center gap-2 text-red-600 font-extrabold text-xs tracking-wider uppercase mb-1">
                                <AlertTriangle size={18} /> Prevención de Riesgos Químicos en el Hogar e Industria
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black text-gray-900" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
                                Matriz de Compatibilidad & Mezclas Prohibidas
                            </h2>
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Buscar producto o sustancia..."
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 text-sm"
                            />
                        </div>
                    </div>

                    {/* Matrix Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredMezclas.length === 0 ? (
                            <p className="text-gray-500 text-center py-8 col-span-2">No se encontraron combinaciones para esa búsqueda.</p>
                        ) : (
                            filteredMezclas.map((item, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                                    className="bg-slate-50/70 border border-gray-200/80 rounded-2xl p-6 hover:shadow-md transition-shadow flex flex-col justify-between"
                                >
                                    <div>
                                        <h3 className="font-black text-lg text-slate-900 mb-4 pb-2 border-b border-gray-200 flex items-center gap-2">
                                            <Droplets size={20} className="text-blue-600" />
                                            {item.producto}
                                        </h3>

                                        <div className="space-y-4 text-sm">
                                            {/* SI MEZCLAR */}
                                            <div className="bg-emerald-50 border border-emerald-200/60 p-3.5 rounded-xl">
                                                <span className="font-extrabold text-emerald-800 flex items-center gap-1.5 mb-1 text-xs uppercase tracking-wide">
                                                    <CheckCircle2 size={16} className="text-emerald-600" /> SÍ SE PUEDE MEZCLAR CON:
                                                </span>
                                                <p className="text-emerald-900 font-medium">{item.siMezclar}</p>
                                            </div>

                                            {/* NO MEZCLAR */}
                                            <div className="bg-rose-50 border border-rose-200/60 p-3.5 rounded-xl">
                                                <span className="font-extrabold text-rose-800 flex items-center gap-1.5 mb-1 text-xs uppercase tracking-wide">
                                                    <XCircle size={16} className="text-rose-600" /> NUNCA MEZCLAR CON:
                                                </span>
                                                <p className="text-rose-950 font-bold">{item.noMezclar}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* RIESGO */}
                                    <div className="mt-4 pt-3 border-t border-gray-200 flex items-start gap-2 text-xs text-amber-800 font-medium bg-amber-50/80 p-3 rounded-xl border border-amber-200/50">
                                        <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                        <span><strong>Riesgo Químico:</strong> {item.riesgo}</span>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </section>

                {/* 2. SECCIÓN: DECÁLOGO DE BIOSEGURIDAD Y NORMATIVIDAD COLOMBIANA */}
                <section className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-3xl p-8 md:p-12 shadow-xl relative overflow-hidden">
                    <div className="max-w-3xl relative z-10 space-y-6">
                        <span className="bg-blue-500/30 text-blue-300 font-extrabold text-xs uppercase tracking-wider px-3 py-1 rounded-full border border-blue-400/20 inline-block">
                            Normativa Colombiana NTC & SGA (Decreto 1496/2018)
                        </span>
                        <h2 className="text-3xl font-black" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
                            Manual de Manejo Seguro de Productos de Limpieza
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-300 pt-4">
                            <div className="space-y-2 bg-white/5 p-4 rounded-xl border border-white/10">
                                <h4 className="font-bold text-white text-base flex items-center gap-2">
                                    📦 Almacenamiento Correcto
                                </h4>
                                <p>Conserva siempre los envases en su contenedor original bien cerrado, en zonas ventiladas, alejados de la luz solar directa y fuera del alcance de niños y mascotas.</p>
                            </div>
                            <div className="space-y-2 bg-white/5 p-4 rounded-xl border border-white/10">
                                <h4 className="font-bold text-white text-base flex items-center gap-2">
                                    🧤 Equipos de Protección (EPP)
                                </h4>
                                <p>Para manipular productos desincrustantes, desengrasantes industriales o desinfectantes concentrados, utiliza guantes de nitrilo/látex y evita el contacto ocular.</p>
                            </div>
                            <div className="space-y-2 bg-white/5 p-4 rounded-xl border border-white/10">
                                <h4 className="font-bold text-white text-base flex items-center gap-2">
                                    🚫 Cero Reenvase en Botellas de Bebidas
                                </h4>
                                <p>Nunca trasvases productos químicos de limpieza a botellas de gaseosa o agua de consumo para evitar ingestiones accidentales según la NTC colombiana.</p>
                            </div>
                            <div className="space-y-2 bg-white/5 p-4 rounded-xl border border-white/10">
                                <h4 className="font-bold text-white text-base flex items-center gap-2">
                                    ⚠️ Reacción Ácido - Cloro
                                </h4>
                                <p>Jamás combines hipoclorito de sodio (cloro/blanqueador) con vinagre o productos ácidos (limpiajuntas/quitaóxido). Produce gas cloro altamente tóxico.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. SECCIÓN: GUÍA TÉCNICA DETALLADA POR PRODUCTO */}
                <section className="space-y-8">
                    <div className="text-center max-w-2xl mx-auto space-y-2">
                        <h2 className="text-3xl font-black text-gray-900" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
                            Catálogo Didáctico de Fichas Técnicas
                        </h2>
                        <p className="text-gray-600 text-sm">
                            Haz clic en cada producto para desplegar su propósito científico, modo de uso exacto, dosificación y recomendaciones de almacenamiento.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        {richProductsList.map(([name, spec]) => (
                            <div
                                key={name}
                                className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-blue-300 transition-colors shadow-sm"
                            >
                                <button
                                    onClick={() => setExpandedProduct(expandedProduct === name ? null : name)}
                                    className="w-full p-5 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                                >
                                    <div className="pr-4">
                                        <h3 className="font-black text-gray-900 text-base">{spec.producto || name}</h3>
                                        <p className="text-xs text-gray-500 line-clamp-1">{spec.proposito}</p>
                                    </div>
                                    {expandedProduct === name ? <ChevronUp size={20} className="text-blue-600" /> : <ChevronDown size={20} className="text-gray-400" />}
                                </button>

                                <AnimatePresence>
                                    {expandedProduct === name && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="border-t border-gray-100 bg-slate-50/50 p-5 space-y-4 text-xs text-gray-700"
                                        >
                                            {spec.proposito && (
                                                <div>
                                                    <span className="font-extrabold uppercase text-gray-900 block mb-1">🎯 Propósito:</span>
                                                    <p className="leading-relaxed">{spec.proposito}</p>
                                                </div>
                                            )}

                                            {spec.aplicaciones && (
                                                <div>
                                                    <span className="font-extrabold uppercase text-gray-900 block mb-1">🏡 Aplicaciones Recomendadas:</span>
                                                    <p className="leading-relaxed">{spec.aplicaciones}</p>
                                                </div>
                                            )}

                                            {spec.modoUso && (
                                                <div className="bg-blue-50/80 p-3 rounded-xl border border-blue-100">
                                                    <span className="font-extrabold uppercase text-blue-900 block mb-1">💡 Modo de Uso y Dosificación:</span>
                                                    <p className="whitespace-pre-line leading-relaxed text-blue-950 font-medium">{spec.modoUso}</p>
                                                </div>
                                            )}

                                            {spec.caracteristicas && (
                                                <div>
                                                    <span className="font-extrabold uppercase text-gray-900 block mb-1">🧪 Características y pH:</span>
                                                    <p className="whitespace-pre-line leading-relaxed">{spec.caracteristicas}</p>
                                                </div>
                                            )}

                                            {spec.precauciones && (
                                                <div className="bg-rose-50/80 p-3 rounded-xl border border-rose-100 text-rose-950">
                                                    <span className="font-extrabold uppercase text-rose-900 block mb-1">⚠️ Precauciones de Bioseguridad:</span>
                                                    <p className="whitespace-pre-line leading-relaxed font-medium">{spec.precauciones}</p>
                                                </div>
                                            )}

                                            {spec.almacenamiento && (
                                                <div>
                                                    <span className="font-extrabold uppercase text-gray-900 block mb-1">📦 Almacenamiento & Vida Útil:</span>
                                                    <p className="leading-relaxed">{spec.almacenamiento}</p>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
