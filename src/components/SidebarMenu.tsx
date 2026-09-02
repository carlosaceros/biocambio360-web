'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { 
    ChevronRight, 
    ChevronDown, 
    Package, 
    Droplets, 
    Car, 
    Sparkles, 
    LayoutGrid,
    Utensils,
    Shirt,
    ShieldAlert,
    Home as HomeIcon,
    Key,
    Coffee,
    Briefcase,
    Grid,
    X,
    Bath,
    Sofa,
    Factory,
    FlaskConical,
    Building2,
    ArrowRight
} from 'lucide-react';
import { useState } from 'react';

interface SidebarMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onCategorySelect: (category: string | null) => void;
    onSubcategorySelect: (subcategory: string | null) => void;
    onSegmentSelect: (segment: string | null) => void;
    onSolutionSelect: (solution: string | null) => void;
    activeCategory: string | null;
    activeSubcategory: string | null;
    activeSegment: string | null;
    activeSolution: string | null;
}

const CATEGORIES = [
    { name: 'Aseo Hogar', icon: <Droplets size={18} />, subcategories: ['Detergentes', 'Suavizantes', 'Limpiapisos', 'Lavaloza', 'Desinfección'] },
    { name: 'Línea Industrial', icon: <Package size={18} />, subcategories: ['Desengrasantes', 'Bactokill Desinfectante'] },
    { name: 'Automotriz', icon: <Car size={18} />, subcategories: ['Limpieza Interior', 'Lustrado', 'Shampoo'] },
    { name: 'Cuidado Personal', icon: <Sparkles size={18} />, subcategories: ['Jabones', 'Splash', 'Gel'] },
    { name: 'Especialidades', icon: <LayoutGrid size={18} />, subcategories: ['Alcohol', 'Vinagre', 'Selladores'] },
];

const SOLUTIONS = [
    { name: 'Cocina',           icon: <Utensils size={18} /> },
    { name: 'Lavandería',       icon: <Shirt size={18} /> },
    { name: 'Desinfección',     icon: <ShieldAlert size={18} /> },
    { name: 'Pisos',            icon: <Grid size={18} /> },
    { name: 'Baños',            icon: <Bath size={18} /> },
    { name: 'Cuidado Personal', icon: <Sparkles size={18} /> },
    { name: 'Automotriz',       icon: <Car size={18} /> },
    { name: 'Vidrios y Ventanas', icon: <FlaskConical size={18} /> },
    { name: 'Muebles y Madera', icon: <Sofa size={18} /> },
    { name: 'Industrial',       icon: <Factory size={18} /> },
];

const SEGMENTS = [
    { name: 'Hogar', label: 'Hogar Familiar', icon: <HomeIcon size={18} /> },
    { name: 'Airbnb', label: 'Airbnb / Alojamientos', icon: <Key size={18} /> },
    { name: 'Restaurante', label: 'Restaurantes y Cafés', icon: <Coffee size={18} /> },
    { name: 'Oficina', label: 'Oficinas e Institucional', icon: <Briefcase size={18} /> },
];

export default function SidebarMenu({ 
    isOpen, 
    onClose, 
    onCategorySelect, 
    onSubcategorySelect,
    onSegmentSelect,
    onSolutionSelect,
    activeCategory, 
    activeSubcategory,
    activeSegment,
    activeSolution
}: SidebarMenuProps) {
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

    const toggleCategory = (name: string) => {
        setExpandedCategory(expandedCategory === name ? null : name);
    };

    const clearAllFilters = () => {
        onCategorySelect(null);
        onSubcategorySelect(null);
        onSegmentSelect(null);
        onSolutionSelect(null);
        onClose();
    };

    const isAllActive = activeCategory === null && activeSubcategory === null && activeSegment === null && activeSolution === null;

    return (
        <>
            {/* Mobile Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] md:hidden cursor-pointer"
                    />
                )}
            </AnimatePresence>

            <aside 
                className={`fixed left-0 top-0 h-full bg-white border-r border-[var(--brand-border)] z-[90] transition-all duration-300 ease-in-out ${
                    isOpen 
                        ? 'translate-x-0 w-80 max-w-[85vw] shadow-2xl md:shadow-none md:relative md:w-64 md:shrink-0 md:h-[calc(100vh-80px)] md:sticky md:top-20 md:self-start md:z-10 md:opacity-100 md:block' 
                        : '-translate-x-full w-0 max-w-0 opacity-0 pointer-events-none md:hidden'
                }`}
            >
                <div className="flex flex-col h-full">
                    <div className="p-5 border-b border-[var(--brand-border)] flex items-center justify-between bg-[var(--brand-blue-50)]/50">
                        <h2 className="text-xs font-black text-[var(--brand-dark)] tracking-wider flex items-center gap-2">
                            <span className="w-2 h-2 bg-[var(--brand-blue)] rounded-full animate-pulse" />
                            COMPRAR SOLUCIONES
                        </h2>
                        <button 
                            onClick={onClose} 
                            className="md:hidden p-2 text-gray-500 hover:text-[var(--brand-dark)] bg-white rounded-xl shadow-sm border border-gray-100"
                            aria-label="Cerrar menú"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <nav className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        <button
                            onClick={clearAllFilters}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black transition-all ${isAllActive ? 'bg-[var(--brand-blue)] text-white shadow-lg shadow-[var(--brand-blue)]/20' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                            <LayoutGrid size={18} />
                            TODOS LOS PRODUCTOS
                        </button>

                        {/* Section: Segments / Profiles */}
                        <div>
                            <p className="px-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.2em] mb-2">Comprar por Perfil</p>
                            <div className="space-y-1">
                                {SEGMENTS.map((seg) => (
                                    <button
                                        key={seg.name}
                                        onClick={() => {
                                            onSegmentSelect(seg.name);
                                            onClose();
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${activeSegment === seg.name ? 'bg-[var(--brand-blue-50)] text-[var(--brand-blue)] font-black' : 'text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        {seg.icon}
                                        {seg.label.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Section: Solutions by need */}
                        <div>
                            <p className="px-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.2em] mb-2">Por Necesidad</p>
                            <div className="space-y-1">
                                {SOLUTIONS.map((sol) => (
                                    <button
                                        key={sol.name}
                                        onClick={() => {
                                            onSolutionSelect(sol.name);
                                            onClose();
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${activeSolution === sol.name ? 'bg-[var(--brand-blue-50)] text-[var(--brand-blue)] font-black' : 'text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        {sol.icon}
                                        {sol.name.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Section: Traditional Categories */}
                        <div>
                            <p className="px-4 text-[10px] font-extrabold text-gray-400 uppercase tracking-[0.2em] mb-2">Categorías</p>
                            <div className="space-y-1">
                                {CATEGORIES.map((cat) => (
                                    <div key={cat.name} className="space-y-1">
                                        <button
                                            onClick={() => { 
                                                toggleCategory(cat.name);
                                                onCategorySelect(cat.name);
                                                onClose();
                                            }}
                                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${activeCategory === cat.name && !activeSubcategory ? 'bg-[var(--brand-blue-50)] text-[var(--brand-blue)] font-black' : 'text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                {cat.icon}
                                                {cat.name.toUpperCase()}
                                            </div>
                                            {expandedCategory === cat.name ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        </button>
                                        
                                        <AnimatePresence>
                                            {expandedCategory === cat.name && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden pl-11 pr-4 space-y-1"
                                                >
                                                    {cat.subcategories.map(sub => (
                                                        <button
                                                            key={sub}
                                                            onClick={() => {
                                                                onSubcategorySelect(sub);
                                                                onClose();
                                                            }}
                                                            className={`w-full text-left py-1.5 text-xs font-medium transition-colors ${activeSubcategory === sub ? 'text-[var(--brand-blue)] font-bold' : 'text-gray-500 hover:text-[var(--brand-blue)]'}`}
                                                        >
                                                            {sub}
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </nav>

                    <div className="p-4 bg-gray-50 border-t border-[var(--brand-border)] space-y-2.5">
                        {/* CTA B2B Cotizador */}
                        <Link
                            href="/cotizador-b2b"
                            onClick={onClose}
                            className="w-full bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 hover:opacity-95 text-white p-3 rounded-2xl shadow-md border border-teal-500/30 flex items-center justify-between transition-all group cursor-pointer"
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-teal-500/20 text-teal-300 rounded-xl">
                                    <Building2 size={18} />
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-black text-white tracking-wide">COTIZADOR B2B / EMPRESAS</p>
                                    <p className="text-[10px] text-teal-300 font-medium">Ahorra 38% en Garrafas 20L</p>
                                </div>
                            </div>
                            <ArrowRight size={16} className="text-teal-300 group-hover:translate-x-1 transition-transform" />
                        </Link>

                        <div className="bg-white p-3.5 rounded-2xl border border-[var(--brand-border)] shadow-xs">
                            <p className="text-[10px] font-bold text-[var(--brand-success)] flex items-center gap-1.5 mb-1">
                                <span className="w-1.5 h-1.5 bg-[var(--brand-success)] rounded-full animate-pulse" />
                                STOCK ACTUALIZADO
                            </p>
                            <p className="text-[9px] text-gray-500 font-medium">
                                {new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())} · Precios directos de fábrica
                            </p>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
