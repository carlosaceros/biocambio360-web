'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronDown, MessageCircle, Search, ShoppingBag } from 'lucide-react';
import { slugify } from '@/lib/catalog-categories';

export interface CatalogProduct {
    id: string;
    nombre: string;
    categoria: string;
    subcategoria: string | null;
    descripcion: string;
    imgFile: string;
    badge: string;
    featured: boolean;
    sizes: Array<{ label: string; price: number }>;
}

const WHATSAPP = '573241005353';
const money = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const fold = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const orderLink = (p: CatalogProduct, size?: string) =>
    `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Hola, quiero ${p.nombre}${size ? ` en presentación ${size}` : ''}`)}`;

export default function CatalogClient({ products }: { products: CatalogProduct[] }) {
    const params = useSearchParams();
    const [category, setCategory] = useState<string>('all');
    const [sub, setSub] = useState<string>('all');
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState<string | null>(null);

    const categories = useMemo(() => {
        const counts = new Map<string, number>();
        products.forEach(p => counts.set(p.categoria, (counts.get(p.categoria) ?? 0) + 1));
        return [...counts.entries()].sort((a, b) => b[1] - a[1]);
    }, [products]);

    // ?cat=<slug> opens a category directly (links shared on WhatsApp / Instagram)
    useEffect(() => {
        const slug = params.get('cat');
        const match = slug ? categories.find(([name]) => slugify(name) === slug) : null;
        if (match) setCategory(match[0]);
    }, [params, categories]);

    const subcategories = useMemo(
        () => (category === 'all' ? [] : [...new Set(products.filter(p => p.categoria === category && p.subcategoria).map(p => p.subcategoria as string))]),
        [products, category]
    );

    const visible = useMemo(() => {
        const q = fold(query.trim());
        return products
            .filter(p => (category === 'all' || p.categoria === category) && (sub === 'all' || p.subcategoria === sub) && (!q || fold(`${p.nombre} ${p.categoria} ${p.subcategoria ?? ''}`).includes(q)))
            .sort((a, b) => Number(b.featured) - Number(a.featured) || a.nombre.localeCompare(b.nombre));
    }, [products, category, sub, query]);

    const chip = (active: boolean) =>
        `shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'}`;

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
                <div className="max-w-6xl mx-auto px-4 pt-3 pb-2">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h1 className="text-lg font-black text-gray-900 leading-tight">Catálogo Biocambio360</h1>
                            <p className="text-[11px] text-gray-500">Fábrica directa · {visible.length} producto{visible.length === 1 ? '' : 's'}</p>
                        </div>
                        <a href="https://biocambio360.com" className="flex items-center gap-1 text-xs font-bold text-blue-700"><ShoppingBag size={14} /> Tienda</a>
                    </div>
                    <div className="relative mt-2">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar producto (ej. detergente, cloro…)" className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-base sm:text-sm focus:outline-none focus:border-blue-400" />
                    </div>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar mt-2 pb-1">
                        <button className={chip(category === 'all')} onClick={() => { setCategory('all'); setSub('all'); }}>Todos ({products.length})</button>
                        {categories.map(([name, n]) => (
                            <button key={name} className={chip(category === name)} onClick={() => { setCategory(name); setSub('all'); }}>{name} ({n})</button>
                        ))}
                    </div>
                    {subcategories.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                            <button className={`${chip(sub === 'all')} !py-1 !text-[11px]`} onClick={() => setSub('all')}>Todas</button>
                            {subcategories.map(s => (
                                <button key={s} className={`${chip(sub === s)} !py-1 !text-[11px]`} onClick={() => setSub(s)}>{s}</button>
                            ))}
                        </div>
                    )}
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-3 sm:px-4 pt-4">
                {visible.length === 0 ? (
                    <p className="text-center text-sm text-gray-500 py-16">No encontramos productos con esa búsqueda. Escríbenos por WhatsApp y te ayudamos.</p>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 items-start">
                        {visible.map(p => {
                            const isOpen = open === p.id;
                            return (
                                <article key={p.id} className={`bg-white rounded-2xl border shadow-xs overflow-hidden ${isOpen ? 'border-blue-300 col-span-2 md:col-span-1' : 'border-gray-100'}`}>
                                    <button className="w-full text-left cursor-pointer" onClick={() => setOpen(isOpen ? null : p.id)} aria-expanded={isOpen}>
                                        <div className="relative aspect-square bg-white">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={`/images/${p.imgFile}`} alt={p.nombre} loading="lazy" className="w-full h-full object-contain p-2" />
                                            {p.badge && <span className="absolute top-2 left-2 text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded-full">{p.badge}</span>}
                                        </div>
                                        <div className="px-3 pb-3">
                                            <h2 className="text-[13px] font-bold text-gray-900 leading-snug line-clamp-2 min-h-[2.4em]">{p.nombre}</h2>
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-sm font-black text-blue-700">Desde {money(p.sizes[0].price)}</span>
                                                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                            </div>
                                        </div>
                                    </button>
                                    {isOpen && (
                                        <div className="px-3 pb-3 space-y-2 border-t border-gray-100 pt-2">
                                            {p.descripcion && <p className="text-xs text-gray-600">{p.descripcion}</p>}
                                            <ul className="divide-y divide-gray-100">
                                                {p.sizes.map(s => (
                                                    <li key={s.label} className="flex items-center justify-between py-1.5 text-xs">
                                                        <span className="font-semibold text-gray-800">{cap(s.label)}</span>
                                                        <span className="flex items-center gap-2">
                                                            <span className="font-black text-gray-900">{money(s.price)}</span>
                                                            <a href={orderLink(p, s.label)} className="px-2 py-1 rounded-lg bg-green-600 text-white font-bold">Pedir</a>
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                            <a href={`/producto/${p.id}`} className="block text-center text-xs font-bold text-blue-700 underline">Ver en la tienda</a>
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}
            </main>

            <a href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hola, quiero hacer un pedido')}`} className="fixed bottom-4 right-4 z-30 flex items-center gap-2 px-4 py-3 rounded-full bg-green-600 text-white text-sm font-black shadow-xl">
                <MessageCircle size={18} /> Pedir por WhatsApp
            </a>
        </div>
    );
}
