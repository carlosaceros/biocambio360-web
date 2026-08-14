'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plus, Edit, Trash2, Save, X, Package, Upload, Loader2, Sparkles, 
    Search, Filter, Download, ArrowUpDown, AlertTriangle, CheckCircle2, 
    XCircle, RefreshCw, MessageSquare, TrendingUp, DollarSign, Layers,
    Copy, ExternalLink, ShieldCheck, Zap
} from 'lucide-react';
import { Product } from '@/lib/products';
import { getAllProducts, saveProduct, deleteProduct, updateProductStock } from '@/lib/products-service';
import Image from 'next/image';

type ViewTab = 'inventory' | 'catalog' | 'ai-assistant' | 'margins';
type StockFilter = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';

export default function InventoryAdminPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [availableImages, setAvailableImages] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [uploadError, setUploadError] = useState<string | null>(null);

    // Filter & Search states
    const [activeTab, setActiveTab] = useState<ViewTab>('inventory');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [stockFilter, setStockFilter] = useState<StockFilter>('all');
    const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'category'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // AI Assistant state
    const [aiSelectedProduct, setAiSelectedProduct] = useState<Product | null>(null);
    const [aiGeneratedCopy, setAiGeneratedCopy] = useState<string | null>(null);
    const [isAiGenerating, setIsAiGenerating] = useState(false);

    // B2B Quote Modal state
    const [b2bProduct, setB2bProduct] = useState<Product | null>(null);
    const [b2bQuantity, setB2bQuantity] = useState(5);
    const [b2bSelectedSize, setB2bSelectedSize] = useState('20L');

    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await getAllProducts(true);
            setProducts(data);
        } catch (error) {
            console.error('Error cargando productos:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadImages = async () => {
        try {
            const res = await fetch('/api/admin/images');
            const data = await res.json();
            if (data.images) {
                setAvailableImages(data.images);
            }
        } catch (error) {
            console.error('Error cargando imágenes:', error);
        }
    };

    useEffect(() => {
        loadProducts();
        loadImages();
    }, []);

    // Unique Categories List
    const categories = useMemo(() => {
        const set = new Set<string>();
        products.forEach(p => { if (p.categoria) set.add(p.categoria); });
        return Array.from(set);
    }, [products]);

    // KPI Metrics Calculations
    const kpiMetrics = useMemo(() => {
        let totalItems = products.length;
        let totalUnitsInBodega = 0;
        let totalInventoryValueCOP = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;

        products.forEach(p => {
            const threshold = p.minStockThreshold ?? 5;
            const sizes = Object.keys(p.precios || {});
            let hasAnyStock = false;
            let pHasLowStock = false;

            sizes.forEach(size => {
                const qty = p.stock?.[size] ?? 0;
                const price = p.precios[size] || 0;
                totalUnitsInBodega += qty;
                totalInventoryValueCOP += qty * price;

                if (qty > 0) hasAnyStock = true;
                if (qty > 0 && qty <= threshold) pHasLowStock = true;
            });

            if (!hasAnyStock) outOfStockCount++;
            else if (pHasLowStock) lowStockCount++;
        });

        return {
            totalItems,
            totalUnitsInBodega,
            totalInventoryValueCOP,
            lowStockCount,
            outOfStockCount
        };
    }, [products]);

    // Filtered & Sorted Products
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            // Search match
            const query = searchQuery.toLowerCase().trim();
            const matchesSearch = !query || 
                p.nombre.toLowerCase().includes(query) || 
                p.id.toLowerCase().includes(query) || 
                (p.sku && p.sku.toLowerCase().includes(query));

            // Category match
            const matchesCat = selectedCategory === 'all' || p.categoria === selectedCategory;

            // Stock match
            const threshold = p.minStockThreshold ?? 5;
            const stockValues = Object.values(p.stock || {});
            const totalStock = stockValues.reduce((acc, curr) => acc + curr, 0);

            let matchesStock = true;
            if (stockFilter === 'out-of-stock') matchesStock = totalStock === 0;
            else if (stockFilter === 'low-stock') matchesStock = totalStock > 0 && stockValues.some(s => s <= threshold);
            else if (stockFilter === 'in-stock') matchesStock = totalStock > 0 && stockValues.every(s => s > threshold);

            return matchesSearch && matchesCat && matchesStock;
        }).sort((a, b) => {
            let res = 0;
            if (sortBy === 'name') {
                res = a.nombre.localeCompare(b.nombre);
            } else if (sortBy === 'category') {
                res = (a.categoria || '').localeCompare(b.categoria || '');
            } else if (sortBy === 'price') {
                const priceA = Object.values(a.precios || {})[0] || 0;
                const priceB = Object.values(b.precios || {})[0] || 0;
                res = priceA - priceB;
            } else if (sortBy === 'stock') {
                const stockA = Object.values(a.stock || {}).reduce((acc, curr) => acc + curr, 0);
                const stockB = Object.values(b.stock || {}).reduce((acc, curr) => acc + curr, 0);
                res = stockA - stockB;
            }
            return sortOrder === 'asc' ? res : -res;
        });
    }, [products, searchQuery, selectedCategory, stockFilter, sortBy, sortOrder]);

    // Fast inline stock adjustment
    const handleQuickStockChange = async (productId: string, size: string, delta: number) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const currentQty = product.stock?.[size] ?? 0;
        const newQty = Math.max(0, currentQty + delta);

        // Optimistic UI update
        setProducts(prev => prev.map(p => {
            if (p.id === productId) {
                return {
                    ...p,
                    stock: { ...(p.stock || {}), [size]: newQty }
                };
            }
            return p;
        }));

        try {
            await updateProductStock(productId, size, newQty);
        } catch (error) {
            console.error('Error actualizando stock en base de datos:', error);
            // Revert on error
            loadProducts();
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProduct) return;
        
        setIsSaving(true);
        try {
            await saveProduct(editingProduct);
            await loadProducts();
            setEditingProduct(null);
        } catch (error) {
            console.error('Error guardando producto:', error);
            alert('Hubo un error al guardar el producto.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este producto permanentemente de la base de datos?')) return;
        
        try {
            await deleteProduct(id);
            setProducts(products.filter(p => p.id !== id));
            if (editingProduct?.id === id) setEditingProduct(null);
        } catch (error) {
            console.error('Error al eliminar:', error);
            alert('Error al eliminar producto.');
        }
    };

    const handleEditChange = (field: keyof Product, value: any) => {
        if (!editingProduct) return;
        setEditingProduct({ ...editingProduct, [field]: value });
    };

    // Export Inventory to CSV
    const exportToCSV = () => {
        const headers = ['SKU', 'ID', 'Producto', 'Categoría', 'Presentación', 'Precio (COP)', 'Stock Actual', 'Valor Total (COP)', 'Estado Stock'];
        const rows: string[][] = [];

        products.forEach(p => {
            const sku = p.sku || `BIO-${p.id.toUpperCase()}`;
            const threshold = p.minStockThreshold ?? 5;

            Object.entries(p.precios || {}).forEach(([size, price]) => {
                const stockQty = p.stock?.[size] ?? 0;
                const totalVal = stockQty * price;
                let status = 'En Stock';
                if (stockQty === 0) status = 'Agotado';
                else if (stockQty <= threshold) status = 'Stock Bajo';

                rows.push([
                    `"${sku}-${size}"`,
                    `"${p.id}"`,
                    `"${p.nombre.replace(/"/g, '""')}"`,
                    `"${p.categoria || 'Sin Categoría'}"`,
                    `"${size}"`,
                    `${price}`,
                    `${stockQty}`,
                    `${totalVal}`,
                    `"${status}"`
                ]);
            });
        });

        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `inventario_biocambio360_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // AI Copy Generator Handler
    const handleGenerateAiCopy = (product: Product) => {
        setAiSelectedProduct(product);
        setIsAiGenerating(true);
        setAiGeneratedCopy(null);

        setTimeout(() => {
            const name = product.nombre;
            const cat = product.categoria || 'Aseo';
            const priceMin = Object.values(product.precios)[0]?.toLocaleString('es-CO');
            
            const copy = `🚀 **TEXTO OPTIMIZADO CON IA PARA E-COMMERCE & REDES SOCIALES**

📌 **Título SEO Sugerido**:
"${name} Biocambio360 | Solución Concentrada de Alto Rendimiento en Colombia"

🎯 **Pitch de Ventas Persuasivo (WhatsApp & B2B)**:
"¡Hola! Te presentamos el **${name}** de Biocambio360. 
Fórmula industrial de grado profesional ideal para ${cat.toLowerCase()} en restaurantes, hoteles, instituciones y el hogar.

✨ **Beneficios Clave**:
• Rendimiento superior por litro que maximiza el ahorro de tu presupuesto.
• Fórmula biodegradable con pH balanceado y acción rápida.
• Despacho inmediato en Bogotá, Soacha y municipios aledaños.

💰 **Presentaciones Disponibles**: Desde $${priceMin} COP con factura de fábrica.
💬 ¡Contáctanos directamente para pedidos al por mayor y descuentos especiales por volumen!"`;

            setAiGeneratedCopy(copy);
            setIsAiGenerating(false);
        }, 1200);
    };

    // Generate WhatsApp B2B Quote Link
    const getWhatsAppQuoteUrl = (product: Product, size: string, qty: number) => {
        const price = product.precios[size] || 0;
        const total = price * qty;
        const msg = `Hola Biocambio360 👋. Deseo solicitar una cotización mayorista para:\n\n` +
            `📦 *Producto*: ${product.nombre}\n` +
            `🧴 *Presentación*: ${size}\n` +
            `🔢 *Cantidad*: ${qty} unidades\n` +
            `💰 *Valor Estimado*: $${total.toLocaleString('es-CO')} COP\n\n` +
            `¿Tienen disponibilidad inmediata para envío en Bogotá / Cundinamarca?`;
        return `https://wa.me/573133333333?text=${encodeURIComponent(msg)}`;
    };

    const processAndUploadImage = async (file: File, fieldName: 'imgFile' | 'imgFileSmall') => {
        setIsUploading(true);
        setUploadProgress('Inicializando...');
        setUploadError(null);

        try {
            setUploadProgress('Cargando motor de IA para eliminar fondo...');
            const { removeBackground } = await import('@imgly/background-removal');
            
            const transparentBlob = await removeBackground(file, {
                progress: (key, current, total) => {
                    const pct = Math.round((current / total) * 100);
                    setUploadProgress(key.includes('fetch') ? `Descargando IA: ${pct}%` : `Procesando IA: ${pct}%`);
                }
            });

            setUploadProgress('Mejorando saturación, luz y contraste...');
            const imageUrl = URL.createObjectURL(transparentBlob);
            const img = new window.Image();
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = imageUrl;
            });

            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('No canvas context');

            ctx.filter = 'brightness(1.05) contrast(1.15) saturate(1.25)';
            ctx.drawImage(img, 0, 0, img.width, img.height);
            URL.revokeObjectURL(imageUrl);

            setUploadProgress('Comprimiendo WebP ultra-ligero...');
            const webpBlob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Fallo al exportar WebP'));
                }, 'image/webp', 0.85);
            });

            setUploadProgress('Guardando imagen...');
            const uploadFormData = new FormData();
            const originalName = file.name;
            const baseName = originalName.replace(/\.[^.]+$/, '').toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
                
            const finalFilename = `${baseName || 'producto'}_${Date.now()}.webp`;
            uploadFormData.append('file', webpBlob, finalFilename);

            const res = await fetch('/api/admin/images', {
                method: 'POST',
                body: uploadFormData
            });

            if (!res.ok) throw new Error('Error al subir la imagen');

            const data = await res.json();
            await loadImages();
            handleEditChange(fieldName, data.filename);
            setUploadProgress('¡Imagen procesada con éxito!');
            setTimeout(() => { setIsUploading(false); setUploadProgress(''); }, 1500);

        } catch (error: any) {
            console.error('Error processing/uploading image:', error);
            setUploadError(error.message || 'Error al procesar la imagen');
            setTimeout(() => { setIsUploading(false); setUploadError(null); }, 6000);
        }
    };

    const createNewProduct = () => {
        setEditingProduct({
            id: `nuevo-producto-${Date.now()}`,
            nombre: '',
            slogan: 'Calidad Biocambio360',
            descripcion: '',
            imgFile: 'placeholder.png',
            imgFiles: {},
            beneficios: ['Calidad Industrial', 'Rendimiento Superior'],
            badge: '',
            color: 'bg-blue-600',
            categoria: 'Aseo Hogar',
            faqs: [],
            precios: { '3.8L': 35000, '10L': 55000, '20L': 83000 },
            competidorPromedio: { '3.8L': 52000, '10L': 82000, '20L': 125000 },
            stock: { '3.8L': 25, '10L': 15, '20L': 10 },
            minStockThreshold: 5,
            sku: `BIO-NUEVO-${Date.now().toString().slice(-4)}`
        });
    };

    if (loading) {
        return (
            <div className="p-12 text-center flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-red-600 mb-3" size={40} />
                <h3 className="text-lg font-bold text-gray-800">Cargando Gestor de Productos e Inventario...</h3>
                <p className="text-sm text-gray-500">Sincronizando existencias y catálogo en tiempo real</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
            
            {/* Header Title & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-red-100 text-red-700 text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            E-commerce Admin 2026
                        </span>
                        <span className="text-xs text-gray-400 font-medium">| Actualizado hoy</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
                        GESTOR DE PRODUCTOS E INVENTARIO
                    </h1>
                    <p className="text-sm text-gray-500">
                        Administra tu catálogo de 105+ productos, monitorea existencias en bodega y optimiza copys con IA.
                    </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-xs"
                        title="Exportar inventario completo en formato CSV / Excel"
                    >
                        <Download size={18} />
                        <span className="hidden sm:inline">Exportar CSV</span>
                    </button>

                    <button
                        onClick={createNewProduct}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all"
                    >
                        <Plus size={20} />
                        Nuevo Producto
                    </button>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex items-center gap-3.5">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <Layers size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Catálogo</p>
                        <h3 className="text-xl font-black text-gray-900">{kpiMetrics.totalItems}</h3>
                        <p className="text-[11px] text-gray-500">Productos activos</p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex items-center gap-3.5">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                        <Package size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Stock Bodega</p>
                        <h3 className="text-xl font-black text-gray-900">{kpiMetrics.totalUnitsInBodega.toLocaleString('es-CO')}</h3>
                        <p className="text-[11px] text-gray-500">Unidades totales</p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex items-center gap-3.5">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <AlertTriangle size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Stock Bajo</p>
                        <h3 className="text-xl font-black text-amber-600">{kpiMetrics.lowStockCount}</h3>
                        <p className="text-[11px] text-gray-500">&le; 5 unidades en alerta</p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex items-center gap-3.5">
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                        <XCircle size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Agotados</p>
                        <h3 className="text-xl font-black text-red-600">{kpiMetrics.outOfStockCount}</h3>
                        <p className="text-[11px] text-gray-500">Requieren reabastecimiento</p>
                    </div>
                </div>

                <div className="col-span-2 lg:col-span-1 bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex items-center gap-3.5">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <DollarSign size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Valor Inventario</p>
                        <h3 className="text-xl font-black text-emerald-600">
                            ${Math.round(kpiMetrics.totalInventoryValueCOP / 1000000)}M COP
                        </h3>
                        <p className="text-[11px] text-gray-500">Valorización total</p>
                    </div>
                </div>
            </div>

            {/* View Tabs & Control Bar */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-sm space-y-4">
                
                {/* Tabs */}
                <div className="flex items-center justify-between border-b border-gray-200 pb-3 flex-wrap gap-2">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('inventory')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                activeTab === 'inventory' 
                                    ? 'bg-red-600 text-white shadow-sm' 
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <Package size={17} />
                            Inventario & Stock
                        </button>

                        <button
                            onClick={() => setActiveTab('catalog')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                activeTab === 'catalog' 
                                    ? 'bg-red-600 text-white shadow-sm' 
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <Layers size={17} />
                            Vista Cuadrícula
                        </button>

                        <button
                            onClick={() => setActiveTab('margins')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                                activeTab === 'margins' 
                                    ? 'bg-red-600 text-white shadow-sm' 
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <TrendingUp size={17} />
                            Análisis Margen
                        </button>
                    </div>

                    <div className="text-xs font-medium text-gray-400">
                        Mostrando <strong className="text-gray-900">{filteredProducts.length}</strong> de {products.length} productos
                    </div>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Search bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, SKU o slug..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-500 bg-gray-50/50 text-gray-900 placeholder-gray-400"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Category Selector */}
                    <div className="relative">
                        <select
                            value={selectedCategory}
                            onChange={e => setSelectedCategory(e.target.value)}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-500 bg-gray-50/50 text-gray-900 font-medium"
                        >
                            <option value="all">Todas las Categorías ({categories.length})</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {/* Stock Filter */}
                    <div className="relative">
                        <select
                            value={stockFilter}
                            onChange={e => setStockFilter(e.target.value as StockFilter)}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-500 bg-gray-50/50 text-gray-900 font-medium"
                        >
                            <option value="all">Estado Stock: Todos</option>
                            <option value="in-stock">🟢 En Stock (&gt; 5 und)</option>
                            <option value="low-stock">🟡 Stock Bajo (&le; 5 und)</option>
                            <option value="out-of-stock">🔴 Agotados (0 und)</option>
                        </select>
                    </div>

                    {/* Sorting */}
                    <div className="flex items-center gap-2">
                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value as any)}
                            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-500 bg-gray-50/50 text-gray-900 font-medium"
                        >
                            <option value="name">Ordenar: Nombre</option>
                            <option value="price">Ordenar: Precio</option>
                            <option value="stock">Ordenar: Stock Total</option>
                            <option value="category">Ordenar: Categoría</option>
                        </select>
                        <button
                            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                            className="p-2.5 border border-gray-200 rounded-xl bg-gray-50/50 hover:bg-gray-100 text-gray-600 transition-colors"
                            title="Cambiar orden ascendente/descendente"
                        >
                            <ArrowUpDown size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Areas */}
            
            {/* 📋 VIEW 1: INVENTORY TABLE */}
            {activeTab === 'inventory' && (
                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/80 text-gray-500 uppercase text-[11px] font-black tracking-wider border-b border-gray-200">
                                    <th className="py-3.5 px-4">Producto</th>
                                    <th className="py-3.5 px-4">Categoría</th>
                                    <th className="py-3.5 px-4 text-center">Stock por Presentación (1L / 1/2G / Galón / 10L / 20L)</th>
                                    <th className="py-3.5 px-4 text-right">Rango Precios</th>
                                    <th className="py-3.5 px-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {filteredProducts.map(product => {
                                    const sizes = Object.keys(product.precios || {}).sort((a, b) => {
                                        const order = ['500ML', '1L', '1/2G', '3.8L', '10L', '20L', '1KG', '4KG', '10KG', '20KG'];
                                        return order.indexOf(a) - order.indexOf(b);
                                    });
                                    const threshold = product.minStockThreshold ?? 5;
                                    const minPrice = Math.min(...Object.values(product.precios));
                                    const maxPrice = Math.max(...Object.values(product.precios));

                                    return (
                                        <tr key={product.id} className="hover:bg-gray-50/60 transition-colors">
                                            {/* Product column */}
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                                                        <Image
                                                            src={`/images/${product.imgFile || 'placeholder.png'}`}
                                                            alt={product.nombre}
                                                            fill
                                                            unoptimized
                                                            className="object-contain p-1.5"
                                                            onError={(e) => {
                                                                e.currentTarget.onerror = null;
                                                                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjY2JjYmNiIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIxIDE1djRjMCAxLjA5Ny0uOTAzIDItMiAyaC0xNGMtMS4wOTcgMC0yLS45MDMtMi0yVjVjMC0xLjA5Ny45MDMtMiAyLTJoMTRjMS4wOTcgMCAyIC45MDMgMiAydjQiLz48cGF0aCBkPSJNMTAgOW0tMiAwYTIgMiAwIDEgMCA0IDAgMiAyIDAgMSAwIC00IDAiLz48cGF0aCBkPSJNMjEgMTVMMTYgMTBsLTIuNSAyLjVMOSA4TDMgMTQiLz48L3N2Zz4=';
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-900 leading-tight">{product.nombre}</h4>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-xs font-mono text-gray-400">{product.sku || product.id}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Category */}
                                            <td className="py-3.5 px-4 text-xs font-medium text-gray-600">
                                                <span className="inline-block bg-gray-100 text-gray-700 font-semibold px-2.5 py-1 rounded-lg">
                                                    {product.categoria || 'Sin Categoría'}
                                                </span>
                                            </td>

                                            {/* Stock Interactive Controls per Size */}
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center justify-center gap-2 flex-wrap">
                                                    {sizes.map(size => {
                                                        const qty = product.stock?.[size] ?? 0;
                                                        let badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                                                        if (qty === 0) badgeBg = 'bg-red-50 text-red-700 border-red-200 font-bold';
                                                        else if (qty <= threshold) badgeBg = 'bg-amber-50 text-amber-700 border-amber-200 font-bold';

                                                        return (
                                                            <div 
                                                                key={size}
                                                                className={`flex items-center border rounded-lg p-1 text-xs transition-all ${badgeBg}`}
                                                            >
                                                                <span className="font-bold px-1.5 uppercase text-[10px] opacity-75">{size}:</span>
                                                                <button
                                                                    onClick={() => handleQuickStockChange(product.id, size, -1)}
                                                                    className="w-5 h-5 flex items-center justify-center hover:bg-black/5 rounded font-black text-gray-600"
                                                                    title="Reducir 1 unidad"
                                                                >
                                                                    -
                                                                </button>
                                                                <span className="font-mono font-black text-sm px-1.5">{qty}</span>
                                                                <button
                                                                    onClick={() => handleQuickStockChange(product.id, size, +1)}
                                                                    className="w-5 h-5 flex items-center justify-center hover:bg-black/5 rounded font-black text-gray-600"
                                                                    title="Aumentar 1 unidad"
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </td>

                                            {/* Price Range */}
                                            <td className="py-3.5 px-4 text-right font-mono font-black text-gray-900 text-sm whitespace-nowrap">
                                                {minPrice === maxPrice 
                                                    ? `$${minPrice.toLocaleString('es-CO')}` 
                                                    : `$${minPrice.toLocaleString('es-CO')} - $${maxPrice.toLocaleString('es-CO')}`}
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3.5 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        onClick={() => setEditingProduct(product)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Editar producto completo"
                                                    >
                                                        <Edit size={17} />
                                                    </button>

                                                    <button
                                                        onClick={() => handleGenerateAiCopy(product)}
                                                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                        title="Generar copy con IA"
                                                    >
                                                        <Sparkles size={17} />
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            setB2bProduct(product);
                                                            setB2bSelectedSize(sizes[0] || '3.8L');
                                                        }}
                                                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                        title="Cotización WhatsApp B2B"
                                                    >
                                                        <MessageSquare size={17} />
                                                    </button>

                                                    <button
                                                        onClick={() => handleDelete(product.id)}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Eliminar producto"
                                                    >
                                                        <Trash2 size={17} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {filteredProducts.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-gray-400">
                                            <Package size={36} className="mx-auto mb-2 opacity-50" />
                                            <p className="font-bold text-gray-600">No se encontraron productos</p>
                                            <p className="text-xs">Prueba cambiando los filtros de búsqueda o categoría</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 📦 VIEW 2: CATALOG GRID */}
            {activeTab === 'catalog' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredProducts.map(product => {
                        const threshold = product.minStockThreshold ?? 5;
                        const stockValues = Object.values(product.stock || {});
                        const totalStock = stockValues.reduce((a, b) => a + b, 0);

                        let badgeColor = 'bg-emerald-100 text-emerald-800';
                        let statusText = `${totalStock} en stock`;
                        if (totalStock === 0) { badgeColor = 'bg-red-100 text-red-800'; statusText = 'Agotado'; }
                        else if (stockValues.some(s => s <= threshold)) { badgeColor = 'bg-amber-100 text-amber-800'; statusText = 'Stock Bajo'; }

                        return (
                            <div 
                                key={product.id}
                                className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                            >
                                <div>
                                    <div className="relative w-full h-36 bg-gray-50 rounded-xl overflow-hidden mb-3 border border-gray-100">
                                        <Image
                                            src={`/images/${product.imgFile || 'placeholder.png'}`}
                                            alt={product.nombre}
                                            fill
                                            unoptimized
                                            className="object-contain p-3"
                                        />
                                        <span className={`absolute top-2 right-2 text-[10px] font-black px-2 py-0.5 rounded-full ${badgeColor}`}>
                                            {statusText}
                                        </span>
                                    </div>

                                    <h3 className="font-bold text-gray-900 text-sm line-clamp-2 leading-tight mb-1">{product.nombre}</h3>
                                    <p className="text-xs text-gray-500 mb-2 font-mono">{product.sku || product.id}</p>
                                    <p className="text-xs text-gray-600 line-clamp-2 mb-3">{product.shortDescription || product.descripcion}</p>
                                </div>

                                <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                                    <span className="font-black text-gray-900 text-sm">
                                        ${(Object.values(product.precios)[0] || 0).toLocaleString('es-CO')}
                                    </span>

                                    <button
                                        onClick={() => setEditingProduct(product)}
                                        className="bg-gray-100 hover:bg-red-600 hover:text-white text-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        Editar
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 📊 VIEW 3: MARGIN ANALYSIS */}
            {activeTab === 'margins' && (
                <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b pb-4">
                        <div>
                            <h3 className="text-lg font-black text-gray-900">ANÁLISIS DE BRECHA DE PRECIOS VS COMPETENCIA</h3>
                            <p className="text-xs text-gray-500">Compara los precios de Biocambio360 con el promedio del mercado en Colombia.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredProducts.map(p => {
                            const size = Object.keys(p.precios)[0] || '3.8L';
                            const nuestro = p.precios[size] || 0;
                            const comp = p.competidorPromedio?.[size] || Math.round(nuestro * 1.5);
                            const ahorroAbs = comp - nuestro;
                            const ahorroPct = Math.round((ahorroAbs / comp) * 100);

                            return (
                                <div key={p.id} className="p-4 border rounded-xl bg-gray-50/50 space-y-2">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-sm text-gray-900 line-clamp-1">{p.nombre}</h4>
                                        <span className="bg-emerald-100 text-emerald-800 font-black text-xs px-2 py-0.5 rounded-full">
                                            {ahorroPct}% Más Económico
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs border-t pt-2 mt-2">
                                        <div>
                                            <span className="text-gray-400 block">Biocambio360 ({size})</span>
                                            <strong className="text-emerald-600 font-mono text-sm">${nuestro.toLocaleString('es-CO')}</strong>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 block">Competidor Promedio</span>
                                            <strong className="text-gray-500 font-mono text-sm text-line-through">${comp.toLocaleString('es-CO')}</strong>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ✏️ FORM MODAL / DRAWER FOR EDITING PRODUCT */}
            <AnimatePresence>
                {editingProduct && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                        <motion.form
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onSubmit={handleSave}
                            className="bg-white border rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="p-5 border-b bg-gray-50 flex items-center justify-between sticky top-0 z-10 bg-white/90 backdrop-blur-md">
                                <h2 className="font-black text-lg text-gray-900 flex items-center gap-2">
                                    <Edit size={20} className="text-red-600" />
                                    {editingProduct.id.startsWith('nuevo') ? 'CREAR NUEVO PRODUCTO' : `EDITAR: ${editingProduct.nombre}`}
                                </h2>
                                <div className="flex gap-2">
                                    <button 
                                        type="button" 
                                        onClick={() => setEditingProduct(null)}
                                        className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 space-y-6 flex-1">
                                
                                {/* Section 1: Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Nombre del Producto *</label>
                                        <input 
                                            required
                                            type="text" 
                                            value={editingProduct.nombre} 
                                            onChange={e => handleEditChange('nombre', e.target.value)}
                                            className="w-full border border-gray-200 rounded-xl p-2.5 focus:border-red-500 focus:outline-none text-gray-900 bg-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">SKU / Referencia Almacén</label>
                                        <input 
                                            type="text" 
                                            value={editingProduct.sku || ''} 
                                            onChange={e => handleEditChange('sku', e.target.value.toUpperCase())}
                                            placeholder="Ej: BIO-DET-20L"
                                            className="w-full border border-gray-200 rounded-xl p-2.5 focus:border-red-500 focus:outline-none text-gray-900 bg-white font-mono text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Categoría *</label>
                                        <input 
                                            required
                                            type="text" 
                                            value={editingProduct.categoria || ''} 
                                            onChange={e => handleEditChange('categoria', e.target.value)}
                                            className="w-full border border-gray-200 rounded-xl p-2.5 focus:border-red-500 focus:outline-none text-gray-900 bg-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Subcategoría</label>
                                        <input 
                                            type="text" 
                                            value={editingProduct.subcategoria || ''} 
                                            onChange={e => handleEditChange('subcategoria', e.target.value || null)}
                                            className="w-full border border-gray-200 rounded-xl p-2.5 focus:border-red-500 focus:outline-none text-gray-900 bg-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Eslogan Comercial</label>
                                    <input 
                                        type="text" 
                                        value={editingProduct.slogan || ''} 
                                        onChange={e => handleEditChange('slogan', e.target.value)}
                                        className="w-full border border-gray-200 rounded-xl p-2.5 focus:border-red-500 focus:outline-none text-gray-900 bg-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Descripción Breve (Resumen Catálogo)</label>
                                    <textarea 
                                        rows={2}
                                        value={editingProduct.shortDescription || ''} 
                                        onChange={e => handleEditChange('shortDescription', e.target.value)}
                                        className="w-full border border-gray-200 rounded-xl p-2.5 focus:border-red-500 focus:outline-none text-gray-900 bg-white text-sm"
                                    />
                                </div>

                                {/* Section 2: Pricing Grid */}
                                <div className="border-t pt-4">
                                    <h3 className="text-sm font-bold text-gray-900 mb-3">Precios Propios y Competencia (COP)</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {Object.keys(editingProduct.precios || {}).map((size) => (
                                            <div key={size} className="p-3 border rounded-xl bg-gray-50/50 space-y-2">
                                                <span className="font-black text-xs text-gray-700 block uppercase">{size}</span>
                                                <div>
                                                    <label className="block text-[10px] text-gray-500">Precio Biocambio</label>
                                                    <input 
                                                        type="number" 
                                                        value={editingProduct.precios[size] || 0} 
                                                        onChange={e => handleEditChange('precios', { ...editingProduct.precios, [size]: parseInt(e.target.value) || 0 })}
                                                        className="w-full border border-gray-200 rounded-lg p-1.5 text-sm font-mono font-bold text-gray-900 bg-white"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] text-gray-500">Stock Actual</label>
                                                    <input 
                                                        type="number" 
                                                        value={editingProduct.stock?.[size] ?? 0} 
                                                        onChange={e => handleEditChange('stock', { ...(editingProduct.stock || {}), [size]: parseInt(e.target.value) || 0 })}
                                                        className="w-full border border-gray-200 rounded-lg p-1.5 text-sm font-mono font-bold text-emerald-700 bg-white"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Section 3: Image Optimizer & Background Removal */}
                                <div className="border-t pt-4">
                                    <h3 className="text-sm font-bold text-gray-900 mb-2">Imagen Principal & Remoción de Fondo con IA</h3>
                                    <div className="flex gap-3 items-center flex-wrap">
                                        <select
                                            value={editingProduct.imgFile || ''}
                                            onChange={e => handleEditChange('imgFile', e.target.value)}
                                            className="flex-1 border border-gray-200 rounded-xl p-2.5 text-sm text-gray-900 bg-white min-w-[200px]"
                                        >
                                            <option value="placeholder.png">placeholder.png</option>
                                            {availableImages.map(img => (
                                                <option key={img} value={img}>{img}</option>
                                            ))}
                                        </select>

                                        <label className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3.5 py-2.5 rounded-xl font-bold text-sm cursor-pointer border border-gray-300 transition-colors">
                                            <Upload size={16} />
                                            Subir Foto
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                className="hidden" 
                                                onChange={e => processAndUploadImage(e.target.files?.[0]!, 'imgFile')}
                                            />
                                        </label>
                                    </div>

                                    {isUploading && (
                                        <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-2 text-xs font-bold text-purple-700">
                                            <Loader2 className="animate-spin" size={16} />
                                            {uploadProgress}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 border-t bg-gray-50 flex items-center justify-between sticky bottom-0 z-10 bg-white/90 backdrop-blur-md">
                                <button
                                    type="button"
                                    onClick={() => setEditingProduct(null)}
                                    className="px-4 py-2.5 border border-gray-300 hover:bg-gray-100 rounded-xl font-bold text-sm text-gray-700 transition-colors"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                    Guardar Cambios
                                </button>
                            </div>
                        </motion.form>
                    </div>
                )}
            </AnimatePresence>

            {/* 🤖 MODAL ASISTENTE DE IA */}
            <AnimatePresence>
                {aiSelectedProduct && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 border border-purple-200"
                        >
                            <div className="flex justify-between items-center border-b pb-3">
                                <h3 className="font-black text-lg text-purple-900 flex items-center gap-2">
                                    <Sparkles className="text-purple-600" size={20} />
                                    ASISTENTE DE COPYWRITING & SEO IA
                                </h3>
                                <button onClick={() => setAiSelectedProduct(null)} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>

                            {isAiGenerating ? (
                                <div className="py-12 text-center flex flex-col items-center justify-center space-y-3">
                                    <Loader2 className="animate-spin text-purple-600" size={36} />
                                    <p className="text-sm font-bold text-purple-900">Generando copys de alta conversión con IA...</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-100 text-sm font-mono text-gray-800 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                                        {aiGeneratedCopy}
                                    </div>

                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(aiGeneratedCopy || '');
                                                alert('¡Copy copiado al portapapeles!');
                                            }}
                                            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-sm"
                                        >
                                            <Copy size={16} />
                                            Copiar Texto
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 📲 MODAL B2B WHATSAPP QUOTE GENERATOR */}
            <AnimatePresence>
                {b2bProduct && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-emerald-200"
                        >
                            <div className="flex justify-between items-center border-b pb-3">
                                <h3 className="font-black text-lg text-emerald-900 flex items-center gap-2">
                                    <MessageSquare className="text-emerald-600" size={20} />
                                    COTIZADOR WHATSAPP B2B
                                </h3>
                                <button onClick={() => setB2bProduct(null)} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-3 text-sm">
                                <p className="font-bold text-gray-800">{b2bProduct.nombre}</p>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Presentación</label>
                                    <select
                                        value={b2bSelectedSize}
                                        onChange={e => setB2bSelectedSize(e.target.value)}
                                        className="w-full p-2 border rounded-xl text-sm"
                                    >
                                        {Object.keys(b2bProduct.precios).map(size => (
                                            <option key={size} value={size}>
                                                {size} - ${(b2bProduct.precios[size] || 0).toLocaleString('es-CO')} COP
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Cantidad de unidades</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={b2bQuantity}
                                        onChange={e => setB2bQuantity(parseInt(e.target.value) || 1)}
                                        className="w-full p-2 border rounded-xl text-sm font-bold"
                                    />
                                </div>

                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs flex justify-between font-bold text-emerald-800">
                                    <span>Total Estimado:</span>
                                    <span>${((b2bProduct.precios[b2bSelectedSize] || 0) * b2bQuantity).toLocaleString('es-CO')} COP</span>
                                </div>

                                <a
                                    href={getWhatsAppQuoteUrl(b2bProduct, b2bSelectedSize, b2bQuantity)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md w-full text-sm transition-all"
                                >
                                    <ExternalLink size={18} />
                                    Abrir WhatsApp con Cotización
                                </a>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
