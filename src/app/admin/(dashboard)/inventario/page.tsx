'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Package,
    ArrowLeft,
    Eye,
    Filter,
    Layers,
    Tag,
    X,
    CheckCircle2,
    Shield,
    Sparkles,
    Info,
    Droplet,
    Key
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Image from 'next/image';
import { PRODUCTOS, Product, ProductSize } from '@/lib/products';
import { formatCurrency } from '@/lib/checkout-utils';
import ChangePasswordModal from '@/components/admin/ChangePasswordModal';

export default function InventarioViewPage() {
    const router = useRouter();
    const { user, role } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    // Extract unique categories
    const categories = useMemo(() => {
        const cats = new Set<string>();
        PRODUCTOS.forEach((p: Product) => {
            if (p.categoria) cats.add(p.categoria);
        });
        return ['all', ...Array.from(cats)];
    }, []);

    // Filter products
    const filteredProducts = useMemo(() => {
        return PRODUCTOS.filter((product: Product) => {
            const matchesSearch =
                product.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (product.subcategoria && product.subcategoria.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (product.slogan && product.slogan.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesCategory = selectedCategory === 'all' || product.categoria === selectedCategory;

            return matchesSearch && matchesCategory;
        });
    }, [searchQuery, selectedCategory]);

    const totalKits = PRODUCTOS.filter((p: Product) => p.categoria === 'Kits & Combos' || p.id.includes('kit') || p.id.includes('combo')).length;
    const totalIndividual = PRODUCTOS.length - totalKits;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b shadow-sm sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/admin')}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl md:text-2xl font-black text-gray-900" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
                                    INVENTARIO DE PRODUCTOS
                                </h1>
                                <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                                    <Eye size={12} />
                                    Solo Vista
                                </span>
                            </div>
                            <p className="text-xs md:text-sm text-gray-500">
                                Catálogo maestro, stock, presentaciones y fichas técnicas operativas
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsPasswordModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition-colors"
                            title="Cambiar mi contraseña"
                        >
                            <Key size={14} className="text-indigo-600" />
                            <span className="hidden sm:inline">Cambiar Clave</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 flex-1 w-full space-y-6">
                {/* Stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase">Total Productos</p>
                            <p className="text-2xl font-black text-gray-900">{PRODUCTOS.length}</p>
                        </div>
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Package size={22} />
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase">Kits & Combos</p>
                            <p className="text-2xl font-black text-purple-700">{totalKits}</p>
                        </div>
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                            <Layers size={22} />
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase">Individuales</p>
                            <p className="text-2xl font-black text-green-700">{totalIndividual}</p>
                        </div>
                        <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                            <Droplet size={22} />
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase">Categorías</p>
                            <p className="text-2xl font-black text-blue-700">{categories.length - 1}</p>
                        </div>
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <Tag size={22} />
                        </div>
                    </div>
                </div>

                {/* Filters & Search */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
                    {/* Search */}
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar por nombre, código o palabra clave..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-gray-900 transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X size={15} />
                            </button>
                        )}
                    </div>

                    {/* Category pills */}
                    <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
                        <Filter size={16} className="text-gray-400 flex-shrink-0 ml-1 mr-1" />
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                                    selectedCategory === cat
                                        ? 'bg-indigo-600 text-white shadow'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {cat === 'all' ? 'Todas las Categorías' : cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Products Table */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                                    <th className="py-3.5 px-4">Producto</th>
                                    <th className="py-3.5 px-4">Categoría</th>
                                    <th className="py-3.5 px-4">Presentaciones & Precios Oficiales</th>
                                    <th className="py-3.5 px-4 text-center">Ficha Técnica</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {filteredProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-12 text-center text-gray-400">
                                            No se encontraron productos con los filtros actuales.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredProducts.map((product: Product) => {
                                        const precios = product.precios || {};
                                        const isCombo = product.categoria === 'Kits & Combos' || product.id.includes('kit') || product.id.includes('combo');

                                        return (
                                            <tr key={product.id} className="hover:bg-gray-50/60 transition-colors">
                                                {/* Producto Info */}
                                                <td className="py-3.5 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                                                            <Image
                                                                src={`/images/${product.imgFile}`}
                                                                alt={product.nombre}
                                                                fill
                                                                className="object-contain p-0.5"
                                                            />
                                                        </div>
                                                        <div className="min-w-0 max-w-sm">
                                                            <p className="font-bold text-gray-900 line-clamp-1">{product.nombre}</p>
                                                            <p className="text-xs text-gray-400 font-mono truncate">ID: {product.id}</p>
                                                            {product.badge && (
                                                                <span className="inline-block mt-0.5 text-[10px] font-bold px-2 py-0.2 rounded bg-amber-100 text-amber-800">
                                                                    {product.badge}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Categoría */}
                                                <td className="py-3.5 px-4">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                                                        {product.categoria}
                                                    </span>
                                                    {product.subcategoria && (
                                                        <p className="text-xs text-gray-400 mt-0.5 pl-1">{product.subcategoria}</p>
                                                    )}
                                                </td>

                                                {/* Presentaciones & Precios */}
                                                <td className="py-3.5 px-4">
                                                    <div className="flex flex-wrap gap-1.5 max-w-md">
                                                        {Object.entries(precios).map(([size, price]) => (
                                                            <span
                                                                key={size}
                                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 border border-indigo-100 text-indigo-900"
                                                            >
                                                                <span className="font-mono text-indigo-600 font-black">{size}:</span>
                                                                <span>{formatCurrency(price as number)}</span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>

                                                {/* Acciones (Solo Lectura) */}
                                                <td className="py-3.5 px-4 text-center">
                                                    <button
                                                        onClick={() => setSelectedProductForModal(product)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 rounded-lg text-xs font-bold transition-all border border-gray-200 hover:border-indigo-200"
                                                    >
                                                        <Eye size={14} />
                                                        Ver Ficha
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Modal de Ficha Técnica (Solo Lectura) */}
            <AnimatePresence>
                {selectedProductForModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100"
                        >
                            {/* Modal Header */}
                            <div className="sticky top-0 bg-white border-b border-gray-100 p-5 flex items-center justify-between z-10">
                                <div className="flex items-center gap-3">
                                    <div className="relative w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 overflow-hidden flex-shrink-0">
                                        <Image
                                            src={`/images/${selectedProductForModal.imgFile}`}
                                            alt={selectedProductForModal.nombre}
                                            fill
                                            className="object-contain p-1"
                                        />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-base line-clamp-1">
                                            {selectedProductForModal.nombre}
                                        </h3>
                                        <p className="text-xs text-indigo-600 font-semibold">{selectedProductForModal.slogan || selectedProductForModal.categoria}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedProductForModal(null)}
                                    className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 space-y-5">
                                {/* Descripcion */}
                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                        <Info size={14} className="text-indigo-600" />
                                        Descripción Técnica del Producto
                                    </h4>
                                    <p className="text-sm text-gray-700 bg-gray-50 p-3.5 rounded-xl border border-gray-200/60 leading-relaxed">
                                        {selectedProductForModal.descripcion}
                                    </p>
                                </div>

                                {/* Precios y Presentaciones */}
                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Tag size={14} className="text-indigo-600" />
                                        Presentaciones y Precios Oficiales (Fábrica)
                                    </h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {Object.entries(selectedProductForModal.precios || {}).map(([size, price]) => (
                                            <div key={size} className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl">
                                                <p className="text-xs font-black text-indigo-600 uppercase">{size}</p>
                                                <p className="text-base font-black text-gray-900">{formatCurrency(price as number)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Beneficios */}
                                {selectedProductForModal.beneficios && (
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <CheckCircle2 size={14} className="text-green-600" />
                                            Beneficios Clave
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {Object.values(selectedProductForModal.beneficios).map((b, idx) => (
                                                <div key={idx} className="flex items-center gap-2 p-2.5 bg-green-50/50 border border-green-100 rounded-lg text-xs font-semibold text-gray-800">
                                                    <CheckCircle2 size={13} className="text-green-600 flex-shrink-0" />
                                                    <span>{b}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* FAQs / Instrucciones */}
                                {selectedProductForModal.faqs && Object.keys(selectedProductForModal.faqs).length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <Sparkles size={14} className="text-amber-500" />
                                            Preguntas Frecuentes & Instrucciones
                                        </h4>
                                        <div className="space-y-2">
                                            {Object.entries(selectedProductForModal.faqs).map(([key, faq]: [string, any]) => (
                                                <div key={key} className="p-3 bg-gray-50 border border-gray-200/60 rounded-xl text-xs space-y-1">
                                                    <p className="font-bold text-gray-900">Q: {faq.q || faq.pregunta}</p>
                                                    <p className="text-gray-600">A: {faq.a || faq.respuesta}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 border-t border-gray-100 bg-gray-50/80 flex justify-end">
                                <button
                                    onClick={() => setSelectedProductForModal(null)}
                                    className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold transition-all"
                                >
                                    Cerrar Ficha
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal Cambiar Contraseña */}
            <ChangePasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
            />
        </div>
    );
}
