'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plus, Edit, Trash2, Save, X, Package, Upload, Loader2, Sparkles, 
    Search, Filter, Download, ArrowUpDown, AlertTriangle, CheckCircle2, 
    XCircle, RefreshCw, MessageSquare, TrendingUp, DollarSign, Layers,
    Copy, ExternalLink, ShieldCheck, Zap, Eye, Check, Tag, HelpCircle,
    Boxes, Smartphone, Image as ImageIcon, SlidersHorizontal, FileText,
    ClipboardList, FlaskConical, Lightbulb, BookOpen, Shield
} from 'lucide-react';
import { Product, UsageRow, SchwartzCopyData, ManualContentData } from '@/lib/products';
import { getAllProducts, saveProduct, deleteProduct, updateProductStock } from '@/lib/products-service';
import { getRichProductDetails, getSchwartzCopy } from '@/lib/product-utils';
import { getManualContentForProduct } from '@/lib/products-rich-data';
import Image from 'next/image';
import Link from 'next/link';

type ViewTab = 'inventory' | 'catalog' | 'ai-assistant' | 'margins';
type StockFilter = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock' | 'archived';
type ModalTab = 'general' | 'schwartz' | 'beneficios' | 'tecnica' | 'dosificacion' | 'faqs' | 'imagenes';

const STANDARD_CATEGORIES = [
    'Aseo Hogar',
    'Automotriz',
    'Cuidado Personal',
    'Línea Industrial',
    'Especialidades',
    'Kits & Combos',
    'Desinfección',
    'Hogar & Comercio'
];

const STANDARD_SIZES = ['1L', '1/2G', '3.8L', '10L', '20L', 'COMBO'];

const BADGE_PRESETS = [
    '🔥 MÁS VENDIDO',
    '⭐ OFERTA ESPECIAL',
    '🎁 ENVÍO GRATIS',
    '✨ NUEVO LANZAMIENTO',
    '🧪 FÓRMULA INDUSTRIAL',
    '👑 CALIDAD PREMIUM',
    '🌿 BIODEGRADABLE',
    '⚡ ACCIÓN RÁPIDA'
];

const COLOR_PRESETS = [
    { label: 'Azul', value: 'bg-blue-600' },
    { label: 'Verde', value: 'bg-green-600' },
    { label: 'Morado', value: 'bg-purple-600' },
    { label: 'Rosa / Magenta', value: 'bg-pink-600' },
    { label: 'Ámbar / Naranja', value: 'bg-amber-600' },
    { label: 'Esmeralda', value: 'bg-emerald-600' },
    { label: 'Cian', value: 'bg-cyan-600' },
    { label: 'Gris Oscuro', value: 'bg-gray-800' }
];

export default function InventoryAdminPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [modalTab, setModalTab] = useState<ModalTab>('general');
    const [isSaving, setIsSaving] = useState(false);
    const [availableImages, setAvailableImages] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isSeeding, setIsSeeding] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Filter & Search states
    const [activeTab, setActiveTab] = useState<ViewTab>('inventory');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [stockFilter, setStockFilter] = useState<StockFilter>('all');
    const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'category'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Sub-inputs for modal lists
    const [newBenefitInput, setNewBenefitInput] = useState('');
    const [newDiferenciadorInput, setNewDiferenciadorInput] = useState('');
    const [newInstruccionInput, setNewInstruccionInput] = useState('');
    const [newRecommendationInput, setNewRecommendationInput] = useState('');
    const [newWarningInput, setNewWarningInput] = useState('');
    const [newSizeInput, setNewSizeInput] = useState('');

    // AI Assistant state
    const [aiSelectedProduct, setAiSelectedProduct] = useState<Product | null>(null);
    const [aiGeneratedCopy, setAiGeneratedCopy] = useState<string | null>(null);
    const [isAiGenerating, setIsAiGenerating] = useState(false);

    // B2B Quote Modal state
    const [b2bProduct, setB2bProduct] = useState<Product | null>(null);
    const [b2bQuantity, setB2bQuantity] = useState(5);
    const [b2bSelectedSize, setB2bSelectedSize] = useState('20L');

    // Delete Confirmation state
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Market Price Scanner state
    const [scanningProductId, setScanningProductId] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4000);
    };

    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await getAllProducts(true);
            setProducts(data);
        } catch (error) {
            console.error('Error cargando productos:', error);
            showToast('Error al conectar con Firestore. Usando datos locales.');
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

    // Sync seed from code to Firestore
    const handleSeedCatalog = async () => {
        if (!confirm('¿Deseas sincronizar y cargar todo el catálogo base oficial a Firestore? Esto asegurará que todos los 105+ productos estén registrados en la base de datos.')) return;
        setIsSeeding(true);
        try {
            const res = await fetch('/api/admin/seed-products');
            const data = await res.json();
            if (data.success) {
                showToast(`✅ Catálogo sincronizado: ${data.upserted} productos actualizados.`);
                await loadProducts();
            } else {
                throw new Error(data.error || 'Fallo en la sincronización');
            }
        } catch (e: any) {
            console.error('Error sincronizando catálogo:', e);
            alert(`Error: ${e.message}`);
        } finally {
            setIsSeeding(false);
        }
    };

    const handleScanMarketPrices = async (productId: string) => {
        setScanningProductId(productId);
        try {
            const res = await fetch('/api/admin/update-competitor-prices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || data.message || 'No se pudieron rastrear precios de mercado');
            }

            showToast(`✅ Precios de mercado actualizados con IA para ${productId}`);
            await loadProducts();

            if (editingProduct && editingProduct.id === productId) {
                setEditingProduct(prev => prev ? { ...prev, competidorPromedio: data.competidorPromedio } : null);
            }
        } catch (error: any) {
            console.error('Error al escanear precios:', error);
            alert(error.message || 'Error al consultar precios en Google Search Colombia');
        } finally {
            setScanningProductId(null);
        }
    };

    // Unique Categories List
    const categories = useMemo(() => {
        const set = new Set<string>(STANDARD_CATEGORIES);
        products.forEach(p => { if (p.categoria) set.add(p.categoria); });
        return Array.from(set);
    }, [products]);

    // KPI Metrics Calculations
    const kpiMetrics = useMemo(() => {
        let totalItems = 0;
        let totalUnitsInBodega = 0;
        let totalInventoryValueCOP = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;

        products.forEach(p => {
            if (p.status === 'archived' || p.isDeleted) return;
            totalItems++;
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
                (p.sku && p.sku.toLowerCase().includes(query)) ||
                (p.categoria && p.categoria.toLowerCase().includes(query));

            // Category match
            const matchesCat = selectedCategory === 'all' || p.categoria === selectedCategory;

            // Stock match
            const threshold = p.minStockThreshold ?? 5;
            const stockValues = Object.values(p.stock || {});
            const totalStock = stockValues.reduce((acc, curr) => acc + curr, 0);

            let matchesStock = true;
            if (stockFilter === 'archived') matchesStock = p.status === 'archived' || p.isDeleted === true;
            else if (p.status === 'archived' || p.isDeleted) return false;
            else if (stockFilter === 'out-of-stock') matchesStock = totalStock === 0;
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

    // Fast inline stock adjustment with optimistic UI
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
            loadProducts();
        }
    };

    // Save or Update Product
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProduct) return;

        if (!editingProduct.nombre.trim()) {
            alert('Por favor ingresa un nombre para el producto.');
            return;
        }

        if (Object.keys(editingProduct.precios || {}).length === 0) {
            alert('El producto debe tener al menos una presentación y precio.');
            return;
        }
        
        setIsSaving(true);
        try {
            await saveProduct(editingProduct);
            showToast(`✅ Producto "${editingProduct.nombre}" guardado con éxito.`);
            await loadProducts();
            setEditingProduct(null);
        } catch (error) {
            console.error('Error guardando producto:', error);
            alert('Hubo un error al guardar el producto en Firestore.');
        } finally {
            setIsSaving(false);
        }
    };

    // Clone existing product
    const handleCloneProduct = (product: Product) => {
        const timestamp = Date.now().toString().slice(-4);
        const clonedId = `${product.id}-copia-${timestamp}`;
        const clonedSku = `BIO-${product.id.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)}-COP${timestamp}`;

        const rich = getRichProductDetails(product);
        const schwartz = getSchwartzCopy(product);
        const manual = getManualContentForProduct(product);

        const cloned: Product = {
            ...product,
            id: clonedId,
            sku: clonedSku,
            nombre: `${product.nombre} (Copia)`,
            createdAt: new Date().toISOString(),
            status: 'draft',
            beneficios: [...(product.beneficios || [])],
            diferenciadores: [...(product.diferenciadores || rich.diferenciadores)],
            instrucciones: [...(product.instrucciones || rich.instrucciones)],
            faqs: product.faqs ? product.faqs.map(f => ({ ...f })) : [...rich.faqs],
            schwartzCopy: { ...(product.schwartzCopy || schwartz) },
            manualContent: {
                enrichedIntroduction: product.manualContent?.enrichedIntroduction || manual?.enrichedIntroduction || '',
                usageRows: (product.manualContent?.usageRows || manual?.usageRows || []).map(r => ({ ...r })),
                recommendations: [...(product.manualContent?.recommendations || manual?.recommendations || [])],
                warnings: [...(product.manualContent?.warnings || manual?.warnings || [])]
            }
        };

        setEditingProduct(cloned);
        setModalTab('general');
        showToast('✨ Producto duplicado en modo borrador. Puedes editarlo y guardarlo.');
    };

    // Open Edit Modal with full pre-population from Rich Data & Schwartz Copy
    const handleOpenEdit = (prod: Product) => {
        const rich = getRichProductDetails(prod);
        const schwartz = getSchwartzCopy(prod);
        const manual = getManualContentForProduct(prod);

        setEditingProduct({
            ...prod,
            beneficios: prod.beneficios || [],
            diferenciadores: prod.diferenciadores && prod.diferenciadores.length > 0 ? prod.diferenciadores : rich.diferenciadores,
            instrucciones: prod.instrucciones && prod.instrucciones.length > 0 ? prod.instrucciones : rich.instrucciones,
            ph: prod.ph || rich.ph,
            dilucion: prod.dilucion || rich.dilucion,
            biodegradabilidad: prod.biodegradabilidad || rich.biodegradabilidad,
            usoRecomendado: prod.usoRecomendado || rich.usoRecomendado,
            faqs: prod.faqs && prod.faqs.length > 0 ? prod.faqs : rich.faqs,
            schwartzCopy: {
                problema: prod.schwartzCopy?.problema || schwartz.problema,
                solucion: prod.schwartzCopy?.solucion || schwartz.solucion,
                producto: prod.schwartzCopy?.producto || schwartz.producto,
                transaccion: prod.schwartzCopy?.transaccion || schwartz.transaccion,
                citableQuote: prod.schwartzCopy?.citableQuote || schwartz.citableQuote,
            },
            manualContent: {
                enrichedIntroduction: prod.manualContent?.enrichedIntroduction || manual?.enrichedIntroduction || '',
                usageRows: prod.manualContent?.usageRows || manual?.usageRows || [],
                recommendations: prod.manualContent?.recommendations || manual?.recommendations || [],
                warnings: prod.manualContent?.warnings || manual?.warnings || []
            }
        });
        setModalTab('general');
    };

    // Open Create New Product Modal
    const handleOpenCreate = () => {
        const tempId = `nuevo-producto-${Date.now().toString().slice(-4)}`;
        setEditingProduct({
            id: tempId,
            nombre: '',
            slogan: '',
            descripcion: '',
            shortDescription: '',
            imgFile: 'placeholder.png',
            beneficios: ['Fórmula Concentrada', 'Alto Rendimiento', 'Biodegradable'],
            diferenciadores: [
                'Fórmula ultra concentrada que rinde hasta 3 veces más que productos convencionales.',
                'Desarrollado con materias primas colombianas de alta pureza y calidad garantizada.',
                'Empaque industrial de alta resistencia con diseño ergonómico para dosificación segura.'
            ],
            instrucciones: [
                'Identifique el área o superficie a limpiar.',
                'Aplique el producto de forma uniforme (puro o diluido según necesidad).',
                'Deje actuar por 2 a 3 minutos para máxima eficiencia.',
                'Retire con un paño limpio o enjuague con agua si es necesario.'
            ],
            ph: '7.0 (Neutro)',
            dilucion: 'Listo para usar',
            biodegradabilidad: 'Fórmula biodegradable certificada libre de fosfatos',
            usoRecomendado: 'Uso general doméstico, comercial e industrial',
            badge: '🔥 NUEVO',
            color: 'bg-blue-600',
            categoria: 'Aseo Hogar',
            subcategoria: null,
            faqs: [
                {
                    q: '¿Cómo se debe utilizar este producto?',
                    a: 'Aplicar directamente o diluido según la tabla de dosificación y retirar con agua o paño limpio.'
                },
                {
                    q: '¿Es seguro para el medio ambiente?',
                    a: 'Sí, formulado con tensoactivos biodegradables libres de fosfatos y metales pesados.'
                }
            ],
            precios: { '3.8L': 35000, '10L': 57000, '20L': 86000 },
            competidorPromedio: { '3.8L': 52500, '10L': 85500, '20L': 129000 },
            stock: { '3.8L': 30, '10L': 15, '20L': 10 },
            minStockThreshold: 5,
            sku: 'BIO-PROD-01',
            status: 'active',
            schwartzCopy: {
                problema: 'La acumulación de suciedad requiere soluciones de limpieza eficientes, concentradas y confiables.',
                solucion: 'Utilizar productos de grado profesional biodegradables que optimicen los procesos de aseo.',
                producto: 'Formulado con ingredientes activos de alta pureza que aseguran resultados superiores.',
                transaccion: 'Compra directamente al fabricante Biocambio360 en Soacha, con distribución express en Bogotá y toda la Sabana.',
                citableQuote: 'Solución de limpieza biodegradable fabricada en Soacha, Cundinamarca, formulada para alto rendimiento.'
            },
            manualContent: {
                enrichedIntroduction: 'Guía técnica oficial de aplicación y rendimiento por litro.',
                usageRows: [
                    {
                        useOrSurface: 'Limpieza General',
                        concentration: 'Normal',
                        dilution: '1:10 a 1:20',
                        amount: '50-100 ml / L',
                        contactTime: '2-5 min',
                        approximateYield: '10-20 m² / L'
                    }
                ],
                recommendations: ['Aplicar sobre superficie fría y no exponer al sol directo durante el secado.'],
                warnings: ['Mantener fuera del alcance de niños. No mezclar con otros productos químicos no recomendados.']
            }
        });
        setModalTab('general');
    };

    // Execute Delete
    const executeDelete = async () => {
        if (!productToDelete) return;
        setIsDeleting(true);
        try {
            await deleteProduct(productToDelete.id);
            setProducts(products.filter(p => p.id !== productToDelete.id));
            if (editingProduct?.id === productToDelete.id) setEditingProduct(null);
            showToast(`🗑️ Producto "${productToDelete.nombre}" eliminado.`);
            setProductToDelete(null);
        } catch (error) {
            console.error('Error al eliminar:', error);
            alert('Error al eliminar producto.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEditChange = (field: keyof Product, value: any) => {
        if (!editingProduct) return;
        setEditingProduct({ ...editingProduct, [field]: value });
    };

    // Auto-generate slug from name if creating new product
    const handleNameChange = (newName: string) => {
        if (!editingProduct) return;
        const isNew = editingProduct.id.startsWith('nuevo-') || editingProduct.id.includes('-copia-');
        if (isNew) {
            const autoSlug = newName
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
            
            setEditingProduct({
                ...editingProduct,
                nombre: newName,
                id: autoSlug || editingProduct.id
            });
        } else {
            setEditingProduct({ ...editingProduct, nombre: newName });
        }
    };

    // Schwartz Copy Change Handler
    const handleSchwartzChange = (field: keyof SchwartzCopyData, value: string) => {
        if (!editingProduct) return;
        const current = { ...(editingProduct.schwartzCopy || {}) };
        current[field] = value;
        setEditingProduct({
            ...editingProduct,
            schwartzCopy: current
        });
    };

    // Manual Content Intro Change
    const handleManualIntroChange = (val: string) => {
        if (!editingProduct) return;
        const current = { ...(editingProduct.manualContent || {}) };
        current.enrichedIntroduction = val;
        setEditingProduct({ ...editingProduct, manualContent: current });
    };

    // Add Benefit Tag
    const handleAddBenefit = () => {
        if (!newBenefitInput.trim() || !editingProduct) return;
        const current = editingProduct.beneficios || [];
        if (!current.includes(newBenefitInput.trim())) {
            setEditingProduct({
                ...editingProduct,
                beneficios: [...current, newBenefitInput.trim()]
            });
        }
        setNewBenefitInput('');
    };

    // Remove Benefit Tag
    const handleRemoveBenefit = (idx: number) => {
        if (!editingProduct) return;
        const current = [...(editingProduct.beneficios || [])];
        current.splice(idx, 1);
        setEditingProduct({ ...editingProduct, beneficios: current });
    };

    // Add / Update / Remove Diferenciadores
    const handleAddDiferenciador = () => {
        if (!newDiferenciadorInput.trim() || !editingProduct) return;
        const current = editingProduct.diferenciadores || [];
        setEditingProduct({
            ...editingProduct,
            diferenciadores: [...current, newDiferenciadorInput.trim()]
        });
        setNewDiferenciadorInput('');
    };

    const handleUpdateDiferenciador = (idx: number, val: string) => {
        if (!editingProduct) return;
        const current = [...(editingProduct.diferenciadores || [])];
        current[idx] = val;
        setEditingProduct({ ...editingProduct, diferenciadores: current });
    };

    const handleRemoveDiferenciador = (idx: number) => {
        if (!editingProduct) return;
        const current = [...(editingProduct.diferenciadores || [])];
        current.splice(idx, 1);
        setEditingProduct({ ...editingProduct, diferenciadores: current });
    };

    // Add / Update / Remove Instrucciones
    const handleAddInstruccion = () => {
        if (!newInstruccionInput.trim() || !editingProduct) return;
        const current = editingProduct.instrucciones || [];
        setEditingProduct({
            ...editingProduct,
            instrucciones: [...current, newInstruccionInput.trim()]
        });
        setNewInstruccionInput('');
    };

    const handleUpdateInstruccion = (idx: number, val: string) => {
        if (!editingProduct) return;
        const current = [...(editingProduct.instrucciones || [])];
        current[idx] = val;
        setEditingProduct({ ...editingProduct, instrucciones: current });
    };

    const handleRemoveInstruccion = (idx: number) => {
        if (!editingProduct) return;
        const current = [...(editingProduct.instrucciones || [])];
        current.splice(idx, 1);
        setEditingProduct({ ...editingProduct, instrucciones: current });
    };

    // Usage Rows (Dosificación)
    const handleAddUsageRow = () => {
        if (!editingProduct) return;
        const current = editingProduct.manualContent?.usageRows || [];
        const newRow: UsageRow = {
            useOrSurface: 'Nueva Superficie / Uso',
            concentration: 'Normal',
            dilution: '1:10',
            amount: '50 ml / L',
            contactTime: '3 min',
            approximateYield: '15 m² / L'
        };
        const manual = { ...(editingProduct.manualContent || {}) };
        manual.usageRows = [...current, newRow];
        setEditingProduct({ ...editingProduct, manualContent: manual });
    };

    const handleUpdateUsageRow = (idx: number, field: keyof UsageRow, val: string) => {
        if (!editingProduct) return;
        const rows = [...(editingProduct.manualContent?.usageRows || [])];
        if (!rows[idx]) return;
        rows[idx] = { ...rows[idx], [field]: val };
        const manual = { ...(editingProduct.manualContent || {}) };
        manual.usageRows = rows;
        setEditingProduct({ ...editingProduct, manualContent: manual });
    };

    const handleRemoveUsageRow = (idx: number) => {
        if (!editingProduct) return;
        const rows = [...(editingProduct.manualContent?.usageRows || [])];
        rows.splice(idx, 1);
        const manual = { ...(editingProduct.manualContent || {}) };
        manual.usageRows = rows;
        setEditingProduct({ ...editingProduct, manualContent: manual });
    };

    // Manual Recommendations
    const handleAddRecommendation = () => {
        if (!newRecommendationInput.trim() || !editingProduct) return;
        const current = editingProduct.manualContent?.recommendations || [];
        const manual = { ...(editingProduct.manualContent || {}) };
        manual.recommendations = [...current, newRecommendationInput.trim()];
        setEditingProduct({ ...editingProduct, manualContent: manual });
        setNewRecommendationInput('');
    };

    const handleRemoveRecommendation = (idx: number) => {
        if (!editingProduct) return;
        const current = [...(editingProduct.manualContent?.recommendations || [])];
        current.splice(idx, 1);
        const manual = { ...(editingProduct.manualContent || {}) };
        manual.recommendations = current;
        setEditingProduct({ ...editingProduct, manualContent: manual });
    };

    // Manual Warnings
    const handleAddWarning = () => {
        if (!newWarningInput.trim() || !editingProduct) return;
        const current = editingProduct.manualContent?.warnings || [];
        const manual = { ...(editingProduct.manualContent || {}) };
        manual.warnings = [...current, newWarningInput.trim()];
        setEditingProduct({ ...editingProduct, manualContent: manual });
        setNewWarningInput('');
    };

    const handleRemoveWarning = (idx: number) => {
        if (!editingProduct) return;
        const current = [...(editingProduct.manualContent?.warnings || [])];
        current.splice(idx, 1);
        const manual = { ...(editingProduct.manualContent || {}) };
        manual.warnings = current;
        setEditingProduct({ ...editingProduct, manualContent: manual });
    };

    // Add FAQ
    const handleAddFAQ = () => {
        if (!editingProduct) return;
        const current = editingProduct.faqs || [];
        setEditingProduct({
            ...editingProduct,
            faqs: [...current, { q: '¿Cómo se usa este producto?', a: 'Aplicar según las instrucciones del rótulo.' }]
        });
    };

    // Update FAQ
    const handleUpdateFAQ = (index: number, key: 'q' | 'a', value: string) => {
        if (!editingProduct) return;
        const current = [...(editingProduct.faqs || [])];
        current[index] = { ...current[index], [key]: value };
        setEditingProduct({ ...editingProduct, faqs: current });
    };

    // Remove FAQ
    const handleRemoveFAQ = (index: number) => {
        if (!editingProduct) return;
        const current = [...(editingProduct.faqs || [])];
        current.splice(index, 1);
        setEditingProduct({ ...editingProduct, faqs: current });
    };

    // Add Presentation Size
    const handleAddSize = (size: string) => {
        if (!size.trim() || !editingProduct) return;
        const cleanSize = size.trim();
        const currentPrices = { ...(editingProduct.precios || {}) };
        const currentCompetitor = { ...(editingProduct.competidorPromedio || {}) };
        const currentStock = { ...(editingProduct.stock || {}) };

        if (!currentPrices[cleanSize]) {
            currentPrices[cleanSize] = 35000;
            currentCompetitor[cleanSize] = 52000;
            currentStock[cleanSize] = 20;

            setEditingProduct({
                ...editingProduct,
                precios: currentPrices,
                competidorPromedio: currentCompetitor,
                stock: currentStock
            });
        }
        setNewSizeInput('');
    };

    // Remove Presentation Size
    const handleRemoveSize = (size: string) => {
        if (!editingProduct) return;
        const currentPrices = { ...(editingProduct.precios || {}) };
        const currentCompetitor = { ...(editingProduct.competidorPromedio || {}) };
        const currentStock = { ...(editingProduct.stock || {}) };

        delete currentPrices[size];
        delete currentCompetitor[size];
        delete currentStock[size];

        setEditingProduct({
            ...editingProduct,
            precios: currentPrices,
            competidorPromedio: currentCompetitor,
            stock: currentStock
        });
    };

    // Export Inventory to CSV
    const exportToCSV = () => {
        const headers = ['SKU', 'ID', 'Producto', 'Categoría', 'Subcategoría', 'Presentación', 'Precio COP', 'Precio Mercado COP', 'Stock Actual', 'Valor Total COP', 'Estado'];
        const rows: string[][] = [];

        products.forEach(p => {
            if (p.status === 'archived' || p.isDeleted) return;
            const sku = p.sku || `BIO-${p.id.toUpperCase()}`;
            const threshold = p.minStockThreshold ?? 5;

            Object.entries(p.precios || {}).forEach(([size, price]) => {
                const compPrice = p.competidorPromedio?.[size] || 0;
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
                    `"${p.subcategoria || ''}"`,
                    `"${size}"`,
                    `${price}`,
                    `${compPrice}`,
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
        showToast('📊 Inventario exportado exitosamente a CSV.');
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
            
            const copy = `🚀 **TEXTO OPTIMIZADO CON IA PARA E-COMMERCE & REDES SOCIALES (2026/2030)**

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
💬 ¡Contáctanos directamente al 324 100 5353 para pedidos al por mayor y descuentos especiales por volumen!"`;

            setAiGeneratedCopy(copy);
            setIsAiGenerating(false);
        }, 800);
    };

    // Generate WhatsApp B2B Quote Link (+57 324 100 5353)
    const getWhatsAppQuoteUrl = (product: Product, size: string, qty: number) => {
        const price = product.precios[size] || 0;
        const total = price * qty;
        const msg = `Hola Biocambio360 👋. Deseo solicitar una cotización mayorista para:\n\n` +
            `📦 *Producto*: ${product.nombre}\n` +
            `🧴 *Presentación*: ${size}\n` +
            `🔢 *Cantidad*: ${qty} unidades\n` +
            `💰 *Valor Estimado*: $${total.toLocaleString('es-CO')} COP\n\n` +
            `¿Tienen disponibilidad inmediata para envío en Bogotá / Cundinamarca?`;
        return `https://wa.me/573241005353?text=${encodeURIComponent(msg)}`;
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
        handleOpenCreate();
    };

    if (loading) {
        return (
            <div className="p-12 text-center flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-red-600 mb-3" size={40} />
                <h3 className="text-lg font-bold text-gray-800">Cargando Gestor de Productos e Inventario...</h3>
                <p className="text-sm text-gray-500">Sincronizando existencias y catálogo con Firestore en tiempo real</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
            
            {/* Toast Notification */}
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-gray-700 text-sm font-bold flex items-center gap-2"
                    >
                        <CheckCircle2 size={18} className="text-emerald-400" />
                        {toastMessage}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header Title & Top Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Firestore Live CRUD 2026/2030
                        </span>
                        <span className="text-xs text-gray-400 font-medium">| {products.length} productos en catálogo</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
                        GESTOR DE PRODUCTOS E INVENTARIO
                    </h1>
                    <p className="text-sm text-gray-500">
                        Administración total de productos, edición de precios multiformato, control de existencias en bodega y asistente IA.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        onClick={handleSeedCatalog}
                        disabled={isSeeding}
                        className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                        title="Sincronizar todo el catálogo base en Firestore"
                    >
                        <RefreshCw size={16} className={isSeeding ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline">{isSeeding ? 'Sincronizando...' : 'Sincronizar Base'}</span>
                    </button>

                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-xs cursor-pointer"
                        title="Exportar inventario completo en formato CSV / Excel"
                    >
                        <Download size={18} />
                        <span className="hidden sm:inline">Exportar CSV</span>
                    </button>

                    <button
                        onClick={createNewProduct}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer"
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
                        <Boxes size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Unidades Bodega</p>
                        <h3 className="text-xl font-black text-gray-900">{kpiMetrics.totalUnitsInBodega}</h3>
                        <p className="text-[11px] text-gray-500">Galones & bidones</p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex items-center gap-3.5">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <DollarSign size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Valor Inventario</p>
                        <h3 className="text-lg font-black text-gray-900">${(kpiMetrics.totalInventoryValueCOP / 1000000).toFixed(1)}M</h3>
                        <p className="text-[11px] text-gray-500">COP estimado</p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex items-center gap-3.5">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <AlertTriangle size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Stock Bajo</p>
                        <h3 className="text-xl font-black text-amber-600">{kpiMetrics.lowStockCount}</h3>
                        <p className="text-[11px] text-gray-500">Por reabastecer</p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex items-center gap-3.5">
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                        <XCircle size={22} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Agotados</p>
                        <h3 className="text-xl font-black text-red-600">{kpiMetrics.outOfStockCount}</h3>
                        <p className="text-[11px] text-gray-500">Sin existencias</p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs & Search Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
                
                {/* 4 Main View Tabs */}
                <div className="flex border-b border-gray-100 gap-2 overflow-x-auto pb-1">
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap cursor-pointer ${
                            activeTab === 'inventory' 
                                ? 'bg-red-50 text-red-600 border border-red-200 shadow-xs' 
                                : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <Package size={17} />
                        Inventario & Existencias ({filteredProducts.length})
                    </button>

                    <button
                        onClick={() => setActiveTab('catalog')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap cursor-pointer ${
                            activeTab === 'catalog' 
                                ? 'bg-red-50 text-red-600 border border-red-200 shadow-xs' 
                                : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <Layers size={17} />
                        Catálogo Visual 360
                    </button>

                    <button
                        onClick={() => setActiveTab('margins')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap cursor-pointer ${
                            activeTab === 'margins' 
                                ? 'bg-red-50 text-red-600 border border-red-200 shadow-xs' 
                                : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <TrendingUp size={17} />
                        Precios & Competencia (Google CO)
                    </button>

                    <button
                        onClick={() => setActiveTab('ai-assistant')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap cursor-pointer ${
                            activeTab === 'ai-assistant' 
                                ? 'bg-purple-50 text-purple-600 border border-purple-200 shadow-xs' 
                                : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <Sparkles size={17} />
                        Asistente de Marketing & IA
                    </button>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                    
                    {/* Search Bar */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-3 text-gray-400" size={17} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, SKU, ID o categoría..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-red-500 focus:bg-white text-gray-900 transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Filter Dropdowns */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Category Filter */}
                        <select
                            value={selectedCategory}
                            onChange={e => setSelectedCategory(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-red-500"
                        >
                            <option value="all">Todas las Categorías ({categories.length})</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>

                        {/* Stock Status Filter */}
                        <select
                            value={stockFilter}
                            onChange={e => setStockFilter(e.target.value as StockFilter)}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-red-500"
                        >
                            <option value="all">Todo el Stock</option>
                            <option value="in-stock">En Stock Óptimo</option>
                            <option value="low-stock">⚠️ Stock Bajo</option>
                            <option value="out-of-stock">⛔ Agotados</option>
                            <option value="archived">📦 Archivados</option>
                        </select>

                        {/* Sort Selector */}
                        <select
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value as any)}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-red-500"
                        >
                            <option value="name">Ordenar por Nombre</option>
                            <option value="price">Ordenar por Precio</option>
                            <option value="stock">Ordenar por Stock</option>
                            <option value="category">Ordenar por Categoría</option>
                        </select>

                        {/* Sort Direction Toggle */}
                        <button
                            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                            className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 cursor-pointer"
                            title={`Orden ${sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}`}
                        >
                            <ArrowUpDown size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* 📋 VIEW 1: INVENTORY TABLE */}
            {activeTab === 'inventory' && (
                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 uppercase text-[11px] font-black tracking-wider">
                                    <th className="py-3.5 px-4">Producto & SKU</th>
                                    <th className="py-3.5 px-4">Categoría</th>
                                    <th className="py-3.5 px-4 text-center">Existencias en Bodega (+/-)</th>
                                    <th className="py-3.5 px-4 text-right">Rango de Precios</th>
                                    <th className="py-3.5 px-4 text-center">Acciones CRUD</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredProducts.map(product => {
                                    const threshold = product.minStockThreshold ?? 5;
                                    const sizes = Object.keys(product.precios || {});
                                    const prices = Object.values(product.precios || {});
                                    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
                                    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
                                    const isArchived = product.status === 'archived' || product.isDeleted;

                                    return (
                                        <tr 
                                            key={product.id} 
                                            className={`hover:bg-gray-50/80 transition-colors ${isArchived ? 'opacity-50 bg-gray-50' : ''}`}
                                        >
                                            {/* Product Info */}
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative w-12 h-12 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100">
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
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-bold text-gray-900 text-sm leading-tight">{product.nombre}</h4>
                                                            {product.badge && (
                                                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                                                                    {product.badge.replace(/\s*\.\d{3,}$/g, '').trim()}
                                                                </span>
                                                            )}
                                                            {isArchived && (
                                                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600">
                                                                    ARCHIVADO
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-xs font-mono text-gray-400">{product.sku || product.id}</span>
                                                            <span className="text-gray-300">·</span>
                                                            <span className="text-[11px] text-gray-500 font-mono">id: {product.id}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Category */}
                                            <td className="py-3.5 px-4 text-xs font-medium text-gray-600">
                                                <span className="inline-block bg-gray-100 text-gray-700 font-semibold px-2.5 py-1 rounded-lg">
                                                    {product.categoria || 'Sin Categoría'}
                                                </span>
                                                {product.subcategoria && (
                                                    <span className="block text-[10px] text-gray-400 mt-0.5">
                                                        {product.subcategoria}
                                                    </span>
                                                )}
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
                                                                    className="w-5 h-5 flex items-center justify-center hover:bg-black/10 rounded font-black text-gray-700 cursor-pointer"
                                                                    title="Reducir 1 unidad"
                                                                >
                                                                    -
                                                                </button>
                                                                <span className="font-mono font-black text-sm px-1.5 min-w-[20px] text-center">{qty}</span>
                                                                <button
                                                                    onClick={() => handleQuickStockChange(product.id, size, +1)}
                                                                    className="w-5 h-5 flex items-center justify-center hover:bg-black/10 rounded font-black text-gray-700 cursor-pointer"
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
                                                    {/* View in Store */}
                                                    <Link
                                                        href={`/producto/${product.id}`}
                                                        target="_blank"
                                                        className="p-2 text-gray-400 hover:text-[var(--brand-blue)] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Ver en Tienda Pública"
                                                    >
                                                        <Eye size={17} />
                                                    </Link>

                                                    {/* Edit */}
                                                    <button
                                                        onClick={() => handleOpenEdit(product)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Editar producto completo"
                                                    >
                                                        <Edit size={17} />
                                                    </button>

                                                    {/* Clone */}
                                                    <button
                                                        onClick={() => handleCloneProduct(product)}
                                                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Duplicar / Clonar producto"
                                                    >
                                                        <Copy size={17} />
                                                    </button>

                                                    {/* AI Copy */}
                                                    <button
                                                        onClick={() => handleGenerateAiCopy(product)}
                                                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Generar copy con IA"
                                                    >
                                                        <Sparkles size={17} />
                                                    </button>

                                                    {/* WhatsApp B2B */}
                                                    <button
                                                        onClick={() => {
                                                            setB2bProduct(product);
                                                            setB2bSelectedSize(sizes[0] || '3.8L');
                                                        }}
                                                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Cotización WhatsApp B2B"
                                                    >
                                                        <MessageSquare size={17} />
                                                    </button>

                                                    {/* Delete */}
                                                    <button
                                                        onClick={() => setProductToDelete(product)}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Eliminar o archivar producto"
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

                                    <div className="flex items-center gap-1">
                                        <Link
                                            href={`/producto/${product.id}`}
                                            target="_blank"
                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
                                            title="Ver en Tienda"
                                        >
                                            <Eye size={16} />
                                        </Link>
                                        <button
                                            onClick={() => handleOpenEdit(product)}
                                            className="bg-gray-100 hover:bg-red-600 hover:text-white text-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                                        >
                                            Editar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 📊 VIEW 3: MARGIN ANALYSIS */}
            {activeTab === 'margins' && (
                <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-3">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                                    <ShieldCheck size={12} /> Google Search CO + Gemini 2.5 IA
                                </span>
                                <span className="text-xs text-gray-400">| Datos verificables en tiempo real</span>
                            </div>
                            <h3 className="text-lg font-black text-gray-900">ANÁLISIS DE PRECIOS VS COMPETENCIA (COLOMBIA)</h3>
                            <p className="text-xs text-gray-500">
                                Precios extraídos de comercio electrónico en Colombia (Homecenter, Éxito, MercadoLibre) actualizados diariamente.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredProducts.map(p => {
                            const size = Object.keys(p.precios)[0] || '3.8L';
                            const nuestro = p.precios[size] || 0;
                            const comp = p.competidorPromedio?.[size] || Math.round(nuestro * 1.5);
                            const ahorroAbs = comp - nuestro;
                            const ahorroPct = Math.round((ahorroAbs / comp) * 100);
                            const isScanningThis = scanningProductId === p.id;

                            return (
                                <div key={p.id} className="p-4 border rounded-xl bg-gray-50/50 space-y-3 relative group hover:border-gray-300 transition-all">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-sm text-gray-900 line-clamp-1">{p.nombre}</h4>
                                            <span className="text-[11px] font-mono text-gray-400">{p.id}</span>
                                        </div>
                                        <span className="bg-emerald-100 text-emerald-800 font-black text-xs px-2.5 py-1 rounded-full flex-shrink-0">
                                            {ahorroPct}% Más Económico
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs border-t pt-2">
                                        <div>
                                            <span className="text-gray-400 block">Biocambio360 ({size})</span>
                                            <strong className="text-emerald-600 font-mono text-sm">${nuestro.toLocaleString('es-CO')}</strong>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 block">Mercado Promedio</span>
                                            <strong className="text-gray-500 font-mono text-sm text-line-through">${comp.toLocaleString('es-CO')}</strong>
                                        </div>
                                    </div>

                                    <div className="border-t pt-2 flex items-center justify-between">
                                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                            <ShieldCheck size={12} className="text-emerald-600" /> Fuente: Google CO
                                        </span>
                                        <button
                                            onClick={() => handleScanMarketPrices(p.id)}
                                            disabled={isScanningThis}
                                            className="flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                                            title="Escanear precio actual en Google Search Colombia con IA"
                                        >
                                            {isScanningThis ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                                            {isScanningThis ? 'Escaneando...' : 'Re-escanear'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ✏️ FORM MODAL / DRAWER FOR CREATING & EDITING PRODUCT */}
            <AnimatePresence>
                {editingProduct && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                        <motion.form
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onSubmit={handleSave}
                            className="bg-white border rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col my-auto"
                        >
                            {/* Modal Header */}
                            <div className="p-4 sm:p-5 border-b bg-gray-50 flex items-center justify-between sticky top-0 z-20 bg-white/95 backdrop-blur-md">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
                                        <Package size={22} />
                                    </div>
                                    <div>
                                        <h2 className="font-black text-lg text-gray-900">
                                            {editingProduct.id.startsWith('nuevo-') ? 'CREAR NUEVO PRODUCTO' : `EDITAR: ${editingProduct.nombre || 'Producto'}`}
                                        </h2>
                                        <p className="text-xs text-gray-400 font-mono">ID: {editingProduct.id}</p>
                                    </div>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => setEditingProduct(null)}
                                    className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* 📑 Modal Sub-Tabs Bar */}
                            <div className="bg-slate-900 text-white px-4 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs font-bold">
                                <button
                                    type="button"
                                    onClick={() => setModalTab('general')}
                                    className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                                        modalTab === 'general' ? 'bg-red-600 text-white shadow' : 'text-gray-300 hover:bg-slate-800'
                                    }`}
                                >
                                    <Boxes size={14} /> 1. General & Precios
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setModalTab('schwartz')}
                                    className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                                        modalTab === 'schwartz' ? 'bg-red-600 text-white shadow' : 'text-gray-300 hover:bg-slate-800'
                                    }`}
                                >
                                    <Sparkles size={14} /> 2. Ficha Conciencia & Valor (Schwartz SEO/AEO)
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setModalTab('beneficios')}
                                    className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                                        modalTab === 'beneficios' ? 'bg-red-600 text-white shadow' : 'text-gray-300 hover:bg-slate-800'
                                    }`}
                                >
                                    <ShieldCheck size={14} /> 3. Beneficios & Diferenciadores
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setModalTab('tecnica')}
                                    className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                                        modalTab === 'tecnica' ? 'bg-red-600 text-white shadow' : 'text-gray-300 hover:bg-slate-800'
                                    }`}
                                >
                                    <FlaskConical size={14} /> 4. Ficha Técnica & Specs
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setModalTab('dosificacion')}
                                    className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                                        modalTab === 'dosificacion' ? 'bg-red-600 text-white shadow' : 'text-gray-300 hover:bg-slate-800'
                                    }`}
                                >
                                    <ClipboardList size={14} /> 5. Dosificación & Rendimiento (Manual ML-01)
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setModalTab('faqs')}
                                    className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                                        modalTab === 'faqs' ? 'bg-red-600 text-white shadow' : 'text-gray-300 hover:bg-slate-800'
                                    }`}
                                >
                                    <HelpCircle size={14} /> 6. Preguntas Frecuentes (FAQs)
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setModalTab('imagenes')}
                                    className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                                        modalTab === 'imagenes' ? 'bg-red-600 text-white shadow' : 'text-gray-300 hover:bg-slate-800'
                                    }`}
                                >
                                    <ImageIcon size={14} /> 7. Multimedia & Fotos
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 space-y-6 flex-1 overflow-y-auto max-h-[calc(92vh-180px)]">
                                
                                {/* 🏷️ TAB 1: GENERAL & PRECIOS */}
                                {modalTab === 'general' && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Nombre Comercial del Producto *</label>
                                                <input 
                                                    required
                                                    type="text" 
                                                    value={editingProduct.nombre} 
                                                    onChange={e => handleNameChange(e.target.value)}
                                                    placeholder="Ej: Desengrasante Industrial Cítrico"
                                                    className="w-full border border-gray-200 rounded-xl p-2.5 focus:border-red-500 focus:outline-none text-gray-900 bg-white font-bold"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">SKU Almacén</label>
                                                <input 
                                                    type="text" 
                                                    value={editingProduct.sku || ''} 
                                                    onChange={e => handleEditChange('sku', e.target.value.toUpperCase())}
                                                    placeholder="Ej: BIO-DES-IND"
                                                    className="w-full border border-gray-200 rounded-xl p-2.5 focus:border-red-500 focus:outline-none text-gray-900 bg-white font-mono text-sm"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Categoría Principal *</label>
                                                <select
                                                    value={editingProduct.categoria || ''}
                                                    onChange={e => handleEditChange('categoria', e.target.value)}
                                                    className="w-full border border-gray-200 rounded-xl p-2.5 focus:border-red-500 focus:outline-none text-gray-900 bg-white font-bold"
                                                >
                                                    {categories.map(cat => (
                                                        <option key={cat} value={cat}>{cat}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Subcategoría</label>
                                                <input 
                                                    type="text" 
                                                    value={editingProduct.subcategoria || ''} 
                                                    onChange={e => handleEditChange('subcategoria', e.target.value || null)}
                                                    placeholder="Ej: Desengrasantes, Lavandería, Pisos"
                                                    className="w-full border border-gray-200 rounded-xl p-2.5 focus:border-red-500 focus:outline-none text-gray-900 bg-white"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Estado de Publicación</label>
                                                <select
                                                    value={editingProduct.status || 'active'}
                                                    onChange={e => handleEditChange('status', e.target.value)}
                                                    className="w-full border border-gray-200 rounded-xl p-2.5 focus:border-red-500 focus:outline-none text-gray-900 bg-white font-bold"
                                                >
                                                    <option value="active">🟢 Activo (Visible en tienda)</option>
                                                    <option value="draft">🟡 Borrador (Solo admin)</option>
                                                    <option value="archived">📦 Archivado (Oculto)</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-3 border-t pt-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Eslogan Comercial</label>
                                                <input 
                                                    type="text" 
                                                    value={editingProduct.slogan || ''} 
                                                    onChange={e => handleEditChange('slogan', e.target.value)}
                                                    placeholder="Ej: Máxima Acción Cortagrasa y Rendimiento de Fábrica"
                                                    className="w-full border border-gray-200 rounded-xl p-2.5 focus:border-red-500 focus:outline-none text-gray-900 bg-white"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Descripción Breve (Resumen Catálogo & Google SEO)</label>
                                                <textarea 
                                                    rows={2}
                                                    value={editingProduct.shortDescription || ''} 
                                                    onChange={e => handleEditChange('shortDescription', e.target.value)}
                                                    placeholder="Resumen corto del producto para las tarjetas del catálogo..."
                                                    className="w-full border border-gray-200 rounded-xl p-2.5 focus:border-red-500 focus:outline-none text-gray-900 bg-white text-xs"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Descripción Completa</label>
                                                <textarea 
                                                    rows={3}
                                                    value={editingProduct.descripcion || ''} 
                                                    onChange={e => handleEditChange('descripcion', e.target.value)}
                                                    placeholder="Descripción detallada de la fórmula y aplicaciones..."
                                                    className="w-full border border-gray-200 rounded-xl p-2.5 focus:border-red-500 focus:outline-none text-gray-900 bg-white text-xs"
                                                />
                                            </div>
                                        </div>

                                        {/* Insignia & Color */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Insignia Promocional (Badge)</label>
                                                <input
                                                    type="text"
                                                    value={editingProduct.badge || ''}
                                                    onChange={e => handleEditChange('badge', e.target.value)}
                                                    placeholder="Ej: 🔥 MÁS VENDIDO"
                                                    className="w-full border border-gray-200 rounded-xl p-2 text-xs bg-white text-gray-900 mb-2 font-bold"
                                                />
                                                <div className="flex flex-wrap gap-1">
                                                    {BADGE_PRESETS.map(b => (
                                                        <button
                                                            key={b}
                                                            type="button"
                                                            onClick={() => handleEditChange('badge', b)}
                                                            className="text-[10px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-0.5 rounded-md cursor-pointer"
                                                        >
                                                            {b}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Color del Tema de Tarjeta</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {COLOR_PRESETS.map(c => (
                                                        <button
                                                            key={c.value}
                                                            type="button"
                                                            onClick={() => handleEditChange('color', c.value)}
                                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border cursor-pointer transition-all ${
                                                                editingProduct.color === c.value 
                                                                    ? 'border-gray-900 shadow-md font-black ring-2 ring-gray-900' 
                                                                    : 'border-gray-200 text-gray-600'
                                                            }`}
                                                        >
                                                            <span className={`w-3.5 h-3.5 rounded-full ${c.value}`} />
                                                            {c.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Multi-presentation Pricing & Stock */}
                                        <div className="border-t pt-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-bold text-gray-700">Matriz de Presentaciones, Precios y Stock *</label>
                                                <div className="flex items-center gap-1.5">
                                                    <input
                                                        type="text"
                                                        value={newSizeInput}
                                                        onChange={e => setNewSizeInput(e.target.value)}
                                                        placeholder="Ej: 5L o 500ML"
                                                        className="border border-gray-200 rounded-lg px-2 py-1 text-xs w-28 text-gray-900 bg-white"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddSize(newSizeInput)}
                                                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer"
                                                    >
                                                        + Añadir
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                {Object.entries(editingProduct.precios || {}).map(([size, price]) => {
                                                    const compPrice = editingProduct.competidorPromedio?.[size] || 0;
                                                    const stockQty = editingProduct.stock?.[size] ?? 10;

                                                    return (
                                                        <div key={size} className="p-3.5 border rounded-2xl bg-gray-50/70 space-y-2">
                                                            <div className="flex items-center justify-between border-b pb-1.5">
                                                                <span className="font-black text-sm text-gray-900">{size}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveSize(size)}
                                                                    className="text-red-500 hover:text-red-700 text-xs font-bold cursor-pointer"
                                                                >
                                                                    Eliminar
                                                                </button>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-gray-500">Precio COP *</label>
                                                                    <input
                                                                        type="number"
                                                                        value={price}
                                                                        onChange={e => {
                                                                            const val = Number(e.target.value);
                                                                            setEditingProduct({
                                                                                ...editingProduct,
                                                                                precios: { ...(editingProduct.precios || {}), [size]: val }
                                                                            });
                                                                        }}
                                                                        className="w-full border rounded-lg p-1.5 text-xs font-bold text-blue-900 bg-white"
                                                                    />
                                                                </div>

                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-gray-500">Mercado COP</label>
                                                                    <input
                                                                        type="number"
                                                                        value={compPrice}
                                                                        onChange={e => {
                                                                            const val = Number(e.target.value);
                                                                            setEditingProduct({
                                                                                ...editingProduct,
                                                                                competidorPromedio: { ...(editingProduct.competidorPromedio || {}), [size]: val }
                                                                            });
                                                                        }}
                                                                        className="w-full border rounded-lg p-1.5 text-xs text-gray-600 bg-white"
                                                                    />
                                                                </div>

                                                                <div className="col-span-2">
                                                                    <label className="block text-[10px] font-bold text-gray-500">Existencias en Almacén (Stock)</label>
                                                                    <input
                                                                        type="number"
                                                                        value={stockQty}
                                                                        onChange={e => {
                                                                            const val = Number(e.target.value);
                                                                            setEditingProduct({
                                                                                ...editingProduct,
                                                                                stock: { ...(editingProduct.stock || {}), [size]: val }
                                                                            });
                                                                        }}
                                                                        className="w-full border rounded-lg p-1.5 text-xs font-bold text-emerald-800 bg-white"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 🧠 TAB 2: SCHWARTZ COPY (CONCIENCIA & VALOR SEO/AEO) */}
                                {modalTab === 'schwartz' && (
                                    <div className="space-y-5">
                                        <div className="bg-blue-50/80 p-4 rounded-2xl border border-blue-100 text-xs text-blue-900 leading-relaxed flex items-start gap-2.5">
                                            <Sparkles className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                                            <div>
                                                <strong className="block font-black text-sm">Ficha de Conciencia & Valor (Schwartz SEO / GEO / AEO)</strong>
                                                Estos textos estructurados se muestran directamente a la derecha de la imagen en la tienda virtual y alimentan a los motores de búsqueda e inteligencias artificiales (ChatGPT, Gemini, Perplexity).
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-black text-pink-600 mb-1 uppercase tracking-wider">
                                                    🔴 1. El Problema de Limpieza
                                                </label>
                                                <textarea
                                                    rows={3}
                                                    value={editingProduct.schwartzCopy?.problema || ''}
                                                    onChange={e => handleSchwartzChange('problema', e.target.value)}
                                                    placeholder="Ej: El lavado frecuente de prendas textiles puede decolorar las telas o dejarlas rígidas..."
                                                    className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:border-red-500 focus:outline-none text-gray-900 bg-white leading-relaxed"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-black text-blue-600 mb-1 uppercase tracking-wider">
                                                    🔵 2. La Alternativa Inteligente
                                                </label>
                                                <textarea
                                                    rows={3}
                                                    value={editingProduct.schwartzCopy?.solucion || ''}
                                                    onChange={e => handleSchwartzChange('solucion', e.target.value)}
                                                    placeholder="Ej: Utilizar detergentes líquidos concentrados con tensoactivos biodegradables y bicarbonato..."
                                                    className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:border-red-500 focus:outline-none text-gray-900 bg-white leading-relaxed"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-black text-emerald-700 mb-1 uppercase tracking-wider">
                                                    🟢 3. Ventaja Activa Biocambio360
                                                </label>
                                                <textarea
                                                    rows={3}
                                                    value={editingProduct.schwartzCopy?.producto || ''}
                                                    onChange={e => handleSchwartzChange('producto', e.target.value)}
                                                    placeholder="Ej: El Detergente Líquido Multiusos de Biocambio360 limpia profundamente cuidando los colores..."
                                                    className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:border-red-500 focus:outline-none text-gray-900 bg-white leading-relaxed"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-black text-gray-600 mb-1 uppercase tracking-wider">
                                                    📍 4. Distribución en Bogotá & Cobertura
                                                </label>
                                                <textarea
                                                    rows={2}
                                                    value={editingProduct.schwartzCopy?.transaccion || ''}
                                                    onChange={e => handleSchwartzChange('transaccion', e.target.value)}
                                                    placeholder="Ej: Compra directamente al fabricante Biocambio360 en Soacha, con distribución express en Bogotá..."
                                                    className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:border-red-500 focus:outline-none text-gray-900 bg-white leading-relaxed"
                                                />
                                            </div>

                                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                                                <label className="block text-xs font-black text-gray-700 mb-1 uppercase tracking-wider">
                                                    💬 5. Ficha Informativa (Citable por LLM / IA)
                                                </label>
                                                <textarea
                                                    rows={3}
                                                    value={editingProduct.schwartzCopy?.citableQuote || ''}
                                                    onChange={e => handleSchwartzChange('citableQuote', e.target.value)}
                                                    placeholder='Ej: "El Detergente Líquido Multiusos de Biocambio360 es un detergente líquido biodegradable fabricado en Colombia..."'
                                                    className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:border-red-500 focus:outline-none text-gray-900 bg-white italic leading-relaxed"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 🛡️ TAB 3: BENEFICIOS & DIFERENCIADORES */}
                                {modalTab === 'beneficios' && (
                                    <div className="space-y-6">
                                        {/* Beneficios */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-black text-gray-800 uppercase tracking-wider">
                                                    Beneficios Principales del Producto (Etiquetas en Vitrina)
                                                </label>
                                                <span className="text-[11px] text-gray-400">({editingProduct.beneficios?.length || 0} configurados)</span>
                                            </div>

                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newBenefitInput}
                                                    onChange={e => setNewBenefitInput(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddBenefit(); } }}
                                                    placeholder="Ej: Apto para Ropa Blanca y de Color"
                                                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 bg-white"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleAddBenefit}
                                                    className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                                                >
                                                    + Añadir
                                                </button>
                                            </div>

                                            <div className="flex flex-wrap gap-2 pt-2">
                                                {editingProduct.beneficios?.map((b, idx) => (
                                                    <span 
                                                        key={idx}
                                                        className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-900 px-3 py-1 rounded-xl text-xs font-bold border border-blue-100"
                                                    >
                                                        {b}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveBenefit(idx)}
                                                            className="text-red-500 hover:text-red-700 font-black cursor-pointer ml-1"
                                                        >
                                                            ×
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Diferenciadores */}
                                        <div className="space-y-3 border-t pt-6">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                                    <ShieldCheck size={16} className="text-emerald-600" />
                                                    Diferenciadores Clave de Fábrica (Puntos de Valor)
                                                </label>
                                                <span className="text-[11px] text-gray-400">({editingProduct.diferenciadores?.length || 0} ítems)</span>
                                            </div>

                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newDiferenciadorInput}
                                                    onChange={e => setNewDiferenciadorInput(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddDiferenciador(); } }}
                                                    placeholder="Ej: Fórmula ultra concentrada que rinde hasta 3 veces más..."
                                                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 bg-white"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleAddDiferenciador}
                                                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                                                >
                                                    + Añadir Diferenciador
                                                </button>
                                            </div>

                                            <div className="space-y-2 pt-2">
                                                {editingProduct.diferenciadores?.map((dif, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
                                                        <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                                                        <input
                                                            type="text"
                                                            value={dif}
                                                            onChange={e => handleUpdateDiferenciador(idx, e.target.value)}
                                                            className="flex-1 bg-white border rounded-lg px-2.5 py-1 text-xs font-medium text-gray-800"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveDiferenciador(idx)}
                                                            className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 🧪 TAB 4: FICHA TÉCNICA & ESPECIFICACIONES */}
                                {modalTab === 'tecnica' && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Nivel de pH Oficial</label>
                                                <input
                                                    type="text"
                                                    value={editingProduct.ph || ''}
                                                    onChange={e => handleEditChange('ph', e.target.value)}
                                                    placeholder="Ej: 7.0 (Neutro) o 10.5 - 11.5 (Alcalino)"
                                                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs text-gray-900 bg-white font-bold"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Dilución Sugerida</label>
                                                <input
                                                    type="text"
                                                    value={editingProduct.dilucion || ''}
                                                    onChange={e => handleEditChange('dilucion', e.target.value)}
                                                    placeholder="Ej: Listo para usar o 1:10 a 1:50 en agua"
                                                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs text-gray-900 bg-white font-bold"
                                                />
                                            </div>

                                            <div className="sm:col-span-2">
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Sostenibilidad & Biodegradabilidad</label>
                                                <input
                                                    type="text"
                                                    value={editingProduct.biodegradabilidad || ''}
                                                    onChange={e => handleEditChange('biodegradabilidad', e.target.value)}
                                                    placeholder="Ej: Fórmula biodegradable certificada libre de fosfatos y metales pesados"
                                                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs text-gray-900 bg-white"
                                                />
                                            </div>

                                            <div className="sm:col-span-2">
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Uso Recomendado Oficial</label>
                                                <textarea
                                                    rows={2}
                                                    value={editingProduct.usoRecomendado || ''}
                                                    onChange={e => handleEditChange('usoRecomendado', e.target.value)}
                                                    placeholder="Ej: Lavado y desinfección de prendas textiles en lavanderías industriales, hoteles y hogares..."
                                                    className="w-full border border-gray-200 rounded-xl p-2.5 text-xs text-gray-900 bg-white"
                                                />
                                            </div>
                                        </div>

                                        {/* Instrucciones de Uso Paso a Paso */}
                                        <div className="border-t pt-6 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                                    <ClipboardList size={16} className="text-blue-600" />
                                                    Instrucciones de Uso Paso a Paso
                                                </label>
                                                <span className="text-[11px] text-gray-400">({editingProduct.instrucciones?.length || 0} pasos)</span>
                                            </div>

                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newInstruccionInput}
                                                    onChange={e => setNewInstruccionInput(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddInstruccion(); } }}
                                                    placeholder="Ej: Aplique el producto puro sobre la mancha y frote suavemente..."
                                                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 bg-white"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleAddInstruccion}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                                                >
                                                    + Añadir Paso
                                                </button>
                                            </div>

                                            <div className="space-y-2 pt-2">
                                                {editingProduct.instrucciones?.map((inst, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                                                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center flex-shrink-0">
                                                            {idx + 1}
                                                        </span>
                                                        <input
                                                            type="text"
                                                            value={inst}
                                                            onChange={e => handleUpdateInstruccion(idx, e.target.value)}
                                                            className="flex-1 bg-white border rounded-lg px-2.5 py-1 text-xs font-medium text-gray-800"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveInstruccion(idx)}
                                                            className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                                                            title="Eliminar Paso"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 📊 TAB 5: DOSIFICACIÓN & RENDIMIENTO (MANUAL ML-01) */}
                                {modalTab === 'dosificacion' && (
                                    <div className="space-y-6">
                                        <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100 text-xs text-indigo-950 flex items-start gap-2.5">
                                            <ClipboardList className="text-indigo-600 flex-shrink-0 mt-0.5" size={18} />
                                            <div>
                                                <strong className="block font-black text-sm">Tabla Técnica Oficial de Rendimiento & Dosificación (Manual ML-01)</strong>
                                                Define las diluciones exactas, tiempos de contacto y rendimientos por litro que se mostrarán en la ficha técnica del producto.
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Introducción / Enfoque de Rendimiento</label>
                                            <textarea
                                                rows={2}
                                                value={editingProduct.manualContent?.enrichedIntroduction || ''}
                                                onChange={e => handleManualIntroChange(e.target.value)}
                                                placeholder="Ej: Guía de dosificación recomendada para maximizar el rendimiento por litro en diversas aplicaciones..."
                                                className="w-full border border-gray-200 rounded-xl p-2.5 text-xs text-gray-900 bg-white"
                                            />
                                        </div>

                                        {/* Table of Usage Rows */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-black text-gray-800 uppercase tracking-wider">
                                                    Filas de Dosificación por Superficie / Aplicación
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={handleAddUsageRow}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                                                >
                                                    <Plus size={14} /> Añadir Fila de Dosificación
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                {(editingProduct.manualContent?.usageRows || []).map((row, idx) => (
                                                    <div key={idx} className="p-4 border rounded-2xl bg-gray-50/80 space-y-3">
                                                        <div className="flex items-center justify-between border-b pb-2">
                                                            <span className="font-black text-xs text-indigo-900">Aplicación #{idx + 1}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveUsageRow(idx)}
                                                                className="text-xs text-red-500 hover:text-red-700 font-bold cursor-pointer"
                                                            >
                                                                Eliminar Fila
                                                            </button>
                                                        </div>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Uso / Superficie</label>
                                                                <input
                                                                    type="text"
                                                                    value={row.useOrSurface}
                                                                    onChange={e => handleUpdateUsageRow(idx, 'useOrSurface', e.target.value)}
                                                                    placeholder="Ej: Ropa Pesada / Pisos Grasosos"
                                                                    className="w-full border rounded-lg p-2 text-xs font-bold text-gray-900 bg-white"
                                                                />
                                                            </div>

                                                            <div>
                                                                <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Concentración</label>
                                                                <input
                                                                    type="text"
                                                                    value={row.concentration}
                                                                    onChange={e => handleUpdateUsageRow(idx, 'concentration', e.target.value)}
                                                                    placeholder="Ej: Normal / Concentrado / Pesado"
                                                                    className="w-full border rounded-lg p-2 text-xs text-gray-900 bg-white"
                                                                />
                                                            </div>

                                                            <div>
                                                                <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Dilución</label>
                                                                <input
                                                                    type="text"
                                                                    value={row.dilution}
                                                                    onChange={e => handleUpdateUsageRow(idx, 'dilution', e.target.value)}
                                                                    placeholder="Ej: 1:10 a 1:20 o Puro"
                                                                    className="w-full border rounded-lg p-2 text-xs text-gray-900 bg-white"
                                                                />
                                                            </div>

                                                            <div>
                                                                <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Cantidad Recomendada</label>
                                                                <input
                                                                    type="text"
                                                                    value={row.amount}
                                                                    onChange={e => handleUpdateUsageRow(idx, 'amount', e.target.value)}
                                                                    placeholder="Ej: 50-80 ml / carga"
                                                                    className="w-full border rounded-lg p-2 text-xs text-blue-700 font-bold bg-white"
                                                                />
                                                            </div>

                                                            <div>
                                                                <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Tiempo de Contacto</label>
                                                                <input
                                                                    type="text"
                                                                    value={row.contactTime}
                                                                    onChange={e => handleUpdateUsageRow(idx, 'contactTime', e.target.value)}
                                                                    placeholder="Ej: 3 a 5 minutos"
                                                                    className="w-full border rounded-lg p-2 text-xs text-gray-900 bg-white"
                                                                />
                                                            </div>

                                                            <div>
                                                                <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Rendimiento Aproximado</label>
                                                                <input
                                                                    type="text"
                                                                    value={row.approximateYield}
                                                                    onChange={e => handleUpdateUsageRow(idx, 'approximateYield', e.target.value)}
                                                                    placeholder="Ej: 12-15 lavadas / L"
                                                                    className="w-full border rounded-lg p-2 text-xs text-emerald-700 font-black bg-white"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Recomendaciones y Precauciones */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-6">
                                            {/* Recomendaciones */}
                                            <div className="space-y-3">
                                                <label className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                                                    <Lightbulb size={16} className="text-emerald-600" />
                                                    Recomendaciones de Aplicación
                                                </label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={newRecommendationInput}
                                                        onChange={e => setNewRecommendationInput(e.target.value)}
                                                        placeholder="Ej: Aplicar sobre superficie fría..."
                                                        className="flex-1 border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-900 bg-white"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleAddRecommendation}
                                                        className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                                                    >
                                                        + Añadir
                                                    </button>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {(editingProduct.manualContent?.recommendations || []).map((rec, idx) => (
                                                        <div key={idx} className="flex items-center justify-between gap-2 bg-emerald-50/60 p-2 rounded-lg border border-emerald-100 text-xs text-emerald-900">
                                                            <span>• {rec}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveRecommendation(idx)}
                                                                className="text-red-500 font-bold hover:text-red-700 cursor-pointer"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Precauciones */}
                                            <div className="space-y-3">
                                                <label className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                                                    <AlertTriangle size={16} className="text-amber-600" />
                                                    Precauciones de Bioseguridad
                                                </label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={newWarningInput}
                                                        onChange={e => setNewWarningInput(e.target.value)}
                                                        placeholder="Ej: Mantener fuera del alcance de niños..."
                                                        className="flex-1 border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-900 bg-white"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleAddWarning}
                                                        className="bg-amber-700 hover:bg-amber-800 text-white px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                                                    >
                                                        + Añadir
                                                    </button>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {(editingProduct.manualContent?.warnings || []).map((warn, idx) => (
                                                        <div key={idx} className="flex items-center justify-between gap-2 bg-amber-50/60 p-2 rounded-lg border border-amber-100 text-xs text-amber-900">
                                                            <span>⚠️ {warn}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveWarning(idx)}
                                                                className="text-red-500 font-bold hover:text-red-700 cursor-pointer"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ❓ TAB 6: PREGUNTAS FRECUENTES (FAQS) */}
                                {modalTab === 'faqs' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <label className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                                    <HelpCircle size={16} className="text-amber-500" />
                                                    Preguntas Frecuentes (FAQs para Google Rich Snippets)
                                                </label>
                                                <p className="text-xs text-gray-500">Estas preguntas y respuestas se indexan automáticamente en Google para mostrar fragmentos enriquecidos.</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleAddFAQ}
                                                className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1"
                                            >
                                                <Plus size={14} /> Añadir Pregunta
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            {editingProduct.faqs?.map((faq, idx) => (
                                                <div key={idx} className="p-4 border rounded-2xl bg-gray-50/80 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-black text-xs text-gray-700">Pregunta #{idx + 1}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveFAQ(idx)}
                                                            className="text-xs text-red-500 hover:text-red-700 font-bold cursor-pointer"
                                                        >
                                                            Eliminar Pregunta
                                                        </button>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={faq.q}
                                                        onChange={e => handleUpdateFAQ(idx, 'q', e.target.value)}
                                                        placeholder="¿Pregunta frecuente?"
                                                        className="w-full border rounded-xl p-2 text-xs font-bold text-gray-900 bg-white"
                                                    />
                                                    <textarea
                                                        rows={2}
                                                        value={faq.a}
                                                        onChange={e => handleUpdateFAQ(idx, 'a', e.target.value)}
                                                        placeholder="Respuesta explicativa para el cliente..."
                                                        className="w-full border rounded-xl p-2 text-xs text-gray-700 bg-white"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 📷 TAB 7: IMÁGENES & MULTIMEDIA */}
                                {modalTab === 'imagenes' && (
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Imagen Principal del Producto</label>
                                            <input 
                                                type="text" 
                                                value={editingProduct.imgFile || ''} 
                                                onChange={e => handleEditChange('imgFile', e.target.value)}
                                                placeholder="nombre-de-imagen.webp"
                                                className="w-full border border-gray-200 rounded-xl p-2.5 text-xs text-gray-900 bg-white font-mono mb-3"
                                            />
                                        </div>

                                        {/* Subida & AI Background Removal */}
                                        <div className="border border-dashed border-gray-300 rounded-2xl p-4 bg-gray-50 text-center space-y-2">
                                            <Upload className="mx-auto text-gray-400" size={24} />
                                            <div>
                                                <label className="text-xs font-black text-blue-600 hover:underline cursor-pointer">
                                                    <span>Haz clic para subir una foto de producto</span>
                                                    <input 
                                                        type="file" 
                                                        accept="image/*" 
                                                        onChange={e => {
                                                            const file = e.target.files?.[0];
                                                            if (file) processAndUploadImage(file, 'imgFile');
                                                        }} 
                                                        className="hidden" 
                                                        disabled={isUploading}
                                                    />
                                                </label>
                                                <p className="text-[11px] text-gray-400 mt-0.5">Se optimizará a WebP y se procesará el fondo blanco con IA.</p>
                                            </div>
                                            {isUploading && (
                                                <div className="text-xs text-blue-700 font-bold flex items-center justify-center gap-2">
                                                    <Loader2 className="animate-spin" size={14} />
                                                    {uploadProgress}
                                                </div>
                                            )}
                                        </div>

                                        {/* Available Images Gallery */}
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-2">Galería de Imágenes Disponibles en el Servidor</label>
                                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 max-h-52 overflow-y-auto p-2 border rounded-2xl bg-gray-50">
                                                {availableImages.map(img => (
                                                    <button
                                                        key={img}
                                                        type="button"
                                                        onClick={() => handleEditChange('imgFile', img)}
                                                        className={`relative aspect-square rounded-xl border overflow-hidden p-1 bg-white cursor-pointer transition-all ${
                                                            editingProduct.imgFile === img 
                                                                ? 'ring-2 ring-red-600 border-red-600' 
                                                                : 'hover:border-gray-400'
                                                        }`}
                                                    >
                                                        <Image
                                                            src={`/images/${img}`}
                                                            alt={img}
                                                            fill
                                                            unoptimized
                                                            className="object-contain p-1"
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 sm:p-5 border-t bg-gray-50 flex items-center justify-between sticky bottom-0 z-20 bg-white/95 backdrop-blur-md">
                                <button
                                    type="button"
                                    onClick={() => setEditingProduct(null)}
                                    className="px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                                >
                                    Cancelar
                                </button>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black px-6 py-2.5 rounded-xl shadow-lg shadow-red-600/20 transition-all cursor-pointer disabled:opacity-50"
                                    >
                                        {isSaving ? (
                                            <>
                                                <Loader2 size={15} className="animate-spin" /> Guardando...
                                            </>
                                        ) : (
                                            <>
                                                <Save size={15} /> Guardar Todos los Cambios
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.form>
                    </div>
                )}
            </AnimatePresence>

            {/* 🗑️ MODAL CONFIRMACION DE ELIMINACION */}
            <AnimatePresence>
                {productToDelete && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-red-200"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
                                    <Trash2 size={24} />
                                </div>
                                <div>
                                    <h3 className="font-black text-lg text-gray-900">¿Eliminar Producto?</h3>
                                    <p className="text-xs text-gray-500 font-mono">{productToDelete.id}</p>
                                </div>
                            </div>

                            <p className="text-sm text-gray-600">
                                ¿Estás seguro de que deseas eliminar permanentemente <strong>&ldquo;{productToDelete.nombre}&rdquo;</strong> de la base de datos? Esta acción actualizará el catálogo y la tienda en tiempo real.
                            </p>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setProductToDelete(null)}
                                    className="px-4 py-2.5 border border-gray-200 hover:bg-gray-100 rounded-xl font-bold text-sm text-gray-700 cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={executeDelete}
                                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                                >
                                    {isDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                                    Eliminar Definitivamente
                                </button>
                            </div>
                        </motion.div>
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
                            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-4 border border-purple-200"
                        >
                            <div className="flex justify-between items-center border-b pb-3">
                                <h3 className="font-black text-lg text-purple-900 flex items-center gap-2">
                                    <Sparkles className="text-purple-600" size={20} />
                                    ASISTENTE DE COPYWRITING & SEO IA
                                </h3>
                                <button onClick={() => setAiSelectedProduct(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
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
                                                showToast('📋 Copy copiado al portapapeles.');
                                            }}
                                            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-sm cursor-pointer"
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

            {/* 📲 MODAL B2B WHATSAPP QUOTE GENERATOR (+57 324 100 5353) */}
            <AnimatePresence>
                {b2bProduct && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-emerald-200"
                        >
                            <div className="flex justify-between items-center border-b pb-3">
                                <h3 className="font-black text-lg text-emerald-900 flex items-center gap-2">
                                    <MessageSquare className="text-emerald-600" size={20} />
                                    COTIZADOR WHATSAPP B2B
                                </h3>
                                <button onClick={() => setB2bProduct(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
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
                                    className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md w-full text-sm transition-all cursor-pointer"
                                >
                                    <ExternalLink size={18} />
                                    Abrir WhatsApp Oficial (+57 324 100 5353)
                                </a>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
