'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BookOpen, Search, ArrowLeft, Calendar, ArrowRight, Sparkles } from 'lucide-react';
import { BLOG_POSTS, BlogPost } from '@/lib/blog-data';

export default function BlogIndexPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const categories = useMemo(() => {
        const cats = BLOG_POSTS.map(post => post.category);
        return ['Todos', ...Array.from(new Set(cats))];
    }, []);

    const filteredPosts = useMemo(() => {
        return BLOG_POSTS.filter(post => {
            const matchesSearch = 
                post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                post.summary.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = 
                !selectedCategory || 
                selectedCategory === 'Todos' || 
                post.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [searchQuery, selectedCategory]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                {/* Back Link */}
                <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-[var(--brand-blue)] mb-8 transition-colors font-bold text-sm">
                    <ArrowLeft size={16} /> Volver a la Tienda
                </Link>

                {/* Hero Header */}
                <div className="text-center mb-12">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-[var(--brand-pink-50)] text-[var(--brand-pink)] uppercase tracking-widest mb-4">
                        <Sparkles size={12} /> Academia de Limpieza Biocambio360
                    </span>
                    <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight mb-4" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
                        GUÍAS DE LIMPIEZA Y AHORRO
                    </h1>
                    <p className="text-gray-500 text-lg max-w-2xl mx-auto font-medium leading-relaxed">
                        Encuentra artículos técnicos, consejos de dosificación, comparaciones honestas y soluciones reales para el aseo del hogar y empresas en Bogotá y Colombia.
                    </p>
                    
                    {/* Búsquedas Semánticas Comunes */}
                    <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-gray-400">
                        <span className="font-bold">Consultas frecuentes:</span>
                        <span className="underline hover:text-[var(--brand-blue)] cursor-pointer" onClick={() => setSearchQuery('polvo vs liquido')}>¿Detergente líquido o polvo?</span>
                        <span>•</span>
                        <span className="underline hover:text-[var(--brand-blue)] cursor-pointer" onClick={() => setSearchQuery('grasa')}>Eliminar grasa de cocina</span>
                        <span>•</span>
                        <span className="underline hover:text-[var(--brand-blue)] cursor-pointer" onClick={() => setSearchQuery('errores')}>Evitar daños en lavadora</span>
                        <span>•</span>
                        <span className="underline hover:text-[var(--brand-blue)] cursor-pointer" onClick={() => setSearchQuery('bogota')}>Fabricantes en Bogotá</span>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="bg-white rounded-3xl p-6 shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col md:flex-row gap-6 justify-between items-center mb-12">
                    {/* Search */}
                    <div className="relative w-full md:max-w-xs">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar artículos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:border-transparent text-sm bg-gray-50/50"
                        />
                    </div>

                    {/* Category Tabs */}
                    <div className="flex gap-2 flex-wrap justify-center">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat === 'Todos' ? null : cat)}
                                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                    (cat === 'Todos' && !selectedCategory) || selectedCategory === cat
                                        ? 'bg-[var(--brand-blue)] text-white shadow-md shadow-[var(--brand-blue)]/20'
                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Post Grid */}
                {filteredPosts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredPosts.map((post, idx) => (
                            <motion.article
                                key={post.slug}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: idx * 0.1 }}
                                className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-lg shadow-gray-100/50 flex flex-col group hover:shadow-2xl hover:shadow-brand-blue/5 transition-all duration-300"
                            >
                                <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--brand-pink)] bg-[var(--brand-pink-50)] px-2.5 py-1 rounded-full">
                                                {post.category}
                                            </span>
                                            <span className="flex items-center gap-1 text-[10px] text-gray-400 font-bold">
                                                <Calendar size={12} /> {post.date}
                                            </span>
                                        </div>

                                        <h3 className="font-extrabold text-xl text-gray-900 group-hover:text-[var(--brand-blue)] transition-colors line-clamp-2 mb-3">
                                            {post.title}
                                        </h3>
                                        <p className="text-gray-500 text-sm font-medium line-clamp-3 mb-6">
                                            {post.summary}
                                        </p>
                                    </div>

                                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                                        <span className="text-[10px] font-black text-gray-400 tracking-wider uppercase">
                                            GEO: {post.geoTarget}
                                        </span>
                                        <Link href={`/blog/${post.slug}`} className="inline-flex items-center gap-1.5 text-xs font-black text-[var(--brand-blue)] group-hover:gap-2.5 transition-all">
                                            Leer Post <ArrowRight size={14} />
                                        </Link>
                                    </div>
                                </div>
                            </motion.article>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
                        <BookOpen className="mx-auto w-12 h-12 text-gray-300 mb-4" />
                        <h3 className="text-lg font-bold text-gray-700">No se encontraron artículos</h3>
                        <p className="text-gray-400 text-sm mt-1">Intenta con otra búsqueda o filtro.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
