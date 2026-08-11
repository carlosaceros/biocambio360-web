'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Save, X, Package, Upload, Loader2, Sparkles } from 'lucide-react';
import { Product } from '@/lib/products';
import { getAllProducts, saveProduct, deleteProduct } from '@/lib/products-service';
import Image from 'next/image';

export default function InventoryPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [availableImages, setAvailableImages] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [uploadError, setUploadError] = useState<string | null>(null);


    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await getAllProducts(true);
            setProducts(data);
        } catch (error) {
            console.error('Error loading products:', error);
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
            console.error('Error loading images list:', error);
        }
    };

    useEffect(() => {
        loadProducts();
        loadImages();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProduct) return;
        
        setIsSaving(true);
        try {
            await saveProduct(editingProduct);
            await loadProducts();
            setEditingProduct(null);
        } catch (error) {
            console.error('Error saving product:', error);
            alert('Hubo un error al guardar el producto.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de que quieres eliminar este producto permanentemente?')) return;
        
        try {
            await deleteProduct(id);
            setProducts(products.filter(p => p.id !== id));
        } catch (error) {
            console.error('Error deleting:', error);
            alert('Error al eliminar producto.');
        }
    };

    const handleEditChange = (field: keyof Product, value: any) => {
        if (!editingProduct) return;
        setEditingProduct({ ...editingProduct, [field]: value });
    };

    const processAndUploadImage = async (file: File, fieldName: 'imgFile' | 'imgFileSmall') => {
        setIsUploading(true);
        setUploadProgress('Inicializando...');
        setUploadError(null);

        try {
            // 1. Remove background client-side
            setUploadProgress('Cargando motor de IA para eliminar fondo...');
            const { removeBackground } = await import('@imgly/background-removal');
            
            // Remove background
            const transparentBlob = await removeBackground(file, {
                progress: (key, current, total) => {
                    const pct = Math.round((current / total) * 100);
                    if (key.includes('fetch')) {
                        setUploadProgress(`Descargando IA: ${pct}%`);
                    } else {
                        setUploadProgress(`Procesando imagen con IA: ${pct}%`);
                    }
                }
            });

            // 2. Load the transparent blob into an HTMLImageElement
            setUploadProgress('Mejorando saturación, luz y contraste...');
            const imageUrl = URL.createObjectURL(transparentBlob);
            const img = new window.Image();
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = imageUrl;
            });

            // 3. Draw to canvas with filters
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('No se pudo obtener el contexto del Canvas');

            // Apply professional adjustments:
            // - brightness(1.05): light and exposure boost
            // - contrast(1.15): rich highlights and shadows contrast
            // - saturate(1.25): colorful saturation for professional pop
            ctx.filter = 'brightness(1.05) contrast(1.15) saturate(1.25)';
            ctx.drawImage(img, 0, 0, img.width, img.height);

            // Clean up the object URL
            URL.revokeObjectURL(imageUrl);

            // 4. Compress and convert to WebP
            setUploadProgress('Comprimiendo y convirtiendo a WebP...');
            const webpBlob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Fallo al exportar imagen WebP'));
                    }
                }, 'image/webp', 0.85); // 85% WebP quality
            });

            // 5. Upload WebP blob to the API
            setUploadProgress('Guardando imagen en el servidor...');
            const uploadFormData = new FormData();
            
            // Create a clean filename from the original
            const originalName = file.name;
            const lastDotIndex = originalName.lastIndexOf('.');
            const baseName = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;
            const cleanName = baseName.toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]/g, '_')
                .replace(/_+/g, '_');
                
            const finalFilename = `${cleanName || 'producto'}_${Date.now()}.webp`;

            uploadFormData.append('file', webpBlob, finalFilename);

            const res = await fetch('/api/admin/images', {
                method: 'POST',
                body: uploadFormData
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Error al subir la imagen al servidor');
            }

            const data = await res.json();
            
            // 6. Reload images list and auto-select
            await loadImages();
            handleEditChange(fieldName, data.filename);
            setUploadProgress('¡Imagen procesada y optimizada con éxito!');
            setTimeout(() => {
                setIsUploading(false);
                setUploadProgress('');
            }, 1500);

        } catch (error: any) {
            console.error('Error processing/uploading image:', error);
            setUploadError(error.message || 'Error al procesar la imagen');
            setTimeout(() => {
                setIsUploading(false);
                setUploadError(null);
            }, 6000);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'imgFile' | 'imgFileSmall') => {
        const file = e.target.files?.[0];
        if (!file) return;
        await processAndUploadImage(file, fieldName);
    };

    const handleSizeImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, size: string) => {
        const file = e.target.files?.[0];
        if (!file || !editingProduct) return;

        setIsUploading(true);
        setUploadProgress('Inicializando...');
        setUploadError(null);

        try {
            setUploadProgress('Cargando motor de IA para eliminar fondo...');
            const { removeBackground } = await import('@imgly/background-removal');
            const transparentBlob = await removeBackground(file, {
                progress: (key: string, current: number, total: number) => {
                    const pct = Math.round((current / total) * 100);
                    setUploadProgress(key.includes('fetch') ? `Descargando IA: ${pct}%` : `Procesando imagen con IA: ${pct}%`);
                }
            });

            setUploadProgress('Mejorando saturación, luz y contraste...');
            const imageUrl = URL.createObjectURL(transparentBlob);
            const img = new window.Image();
            await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = imageUrl; });

            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('No canvas context');
            ctx.filter = 'brightness(1.05) contrast(1.15) saturate(1.25)';
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(imageUrl);

            setUploadProgress('Comprimiendo y convirtiendo a WebP...');
            const webpBlob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(b => b ? resolve(b) : reject(new Error('Fallo WebP')), 'image/webp', 0.85);
            });

            setUploadProgress('Guardando imagen en el servidor...');
            const baseName = file.name.replace(/\.[^.]+$/, '').toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
            const finalFilename = `${baseName || 'producto'}_${size.replace('/', '_')}_${Date.now()}.webp`;

            const form = new FormData();
            form.append('file', webpBlob, finalFilename);
            const res = await fetch('/api/admin/images', { method: 'POST', body: form });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error al subir'); }
            const data = await res.json();

            await loadImages();
            const updatedImgFiles = { ...(editingProduct.imgFiles || {}), [size]: data.filename };
            handleEditChange('imgFiles', updatedImgFiles);
            setUploadProgress('¡Imagen procesada y optimizada con éxito!');
            setTimeout(() => { setIsUploading(false); setUploadProgress(''); }, 1500);
        } catch (error: any) {
            setUploadError(error.message || 'Error al procesar');
            setTimeout(() => { setIsUploading(false); setUploadError(null); }, 6000);
        }
    };

    const handleOptimizeSizeImage = async (size: string) => {
        if (!editingProduct) return;
        const currentFilename = editingProduct.imgFiles?.[size];
        if (!currentFilename || currentFilename === 'placeholder.png') {
            alert('Selecciona una imagen válida para ese tamaño primero.');
            return;
        }
        setIsUploading(true);
        setUploadProgress('Descargando imagen existente...');
        try {
            const resp = await fetch(`/images/${currentFilename}`);
            if (!resp.ok) throw new Error('No se pudo descargar la imagen');
            const blob = await resp.blob();
            const file = new File([blob], currentFilename, { type: blob.type || 'image/jpeg' });
            // Re-upload as size image
            await handleSizeImageUpload({ target: { files: [file] } } as any, size);
        } catch (error: any) {
            setUploadError(error.message || 'Error al optimizar');
            setTimeout(() => { setIsUploading(false); setUploadError(null); }, 6000);
        }
    };

    const handleOptimizeExistingImage = async (fieldName: 'imgFile' | 'imgFileSmall') => {
        if (!editingProduct) return;
        const currentFilename = editingProduct[fieldName];
        if (!currentFilename || currentFilename === 'placeholder.png') {
            alert('Por favor selecciona una imagen válida de la lista para procesar.');
            return;
        }

        setIsUploading(true);
        setUploadProgress('Descargando imagen existente desde el servidor...');
        try {
            const imageUrl = `/images/${currentFilename}`;
            const response = await fetch(imageUrl);
            if (!response.ok) throw new Error('No se pudo descargar la imagen seleccionada del servidor');
            
            const fileBlob = await response.blob();
            const fileType = fileBlob.type || 'image/jpeg';
            const file = new File([fileBlob], currentFilename, { type: fileType });
            
            await processAndUploadImage(file, fieldName);
        } catch (error: any) {
            console.error('Error downloading/optimizing existing image:', error);
            setUploadError(error.message || 'Error al descargar la imagen para optimizar');
            setTimeout(() => {
                setIsUploading(false);
                setUploadError(null);
            }, 6000);
        }
    };


    const createNewProduct = () => {
        setEditingProduct({
            id: `nuevo-producto-${Date.now()}`,
            nombre: '',
            slogan: '',
            descripcion: '',
            imgFile: '',
            imgFiles: {},
            beneficios: ['', '', ''],
            badge: '',
            color: 'bg-blue-600',
            categoria: '',
            faqs: [],
            precios: { '3.8L': 0, '10L': 0, '20L': 0 },
            competidorPromedio: { '3.8L': 0, '10L': 0, '20L': 0 }
        });
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Cargando inventario...</div>;
    }

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-black text-gray-900" style={{ fontFamily: '"Archivo Black", sans-serif' }}>GESTIÓN DE INVENTARIO</h1>
                    <p className="text-gray-500 text-sm">Administra los productos de tu catálogo</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={createNewProduct}
                        className="flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-lg font-bold transition-colors"
                    >
                        <Plus size={20} />
                        Nuevo Producto
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Product List */}
                <div className="lg:col-span-1 space-y-4 max-h-[calc(100vh-120px)] overflow-y-auto pr-2 custom-scrollbar">
                    {products.map(product => (
                        <div 
                            key={product.id}
                            className={`bg-white border rounded-xl p-4 cursor-pointer transition-all ${editingProduct?.id === product.id ? 'border-red-500 shadow-md ring-1 ring-red-500' : 'hover:border-gray-300'}`}
                            onClick={() => setEditingProduct(product)}
                        >
                            <div className="flex gap-4">
                                <div className={`relative w-16 h-16 rounded-lg ${product.color} bg-opacity-10 overflow-hidden flex-shrink-0`}>
                                    <Image 
                                        src={`/images/${product.imgFile}`}
                                        alt={product.nombre}
                                        fill
                                        unoptimized
                                        className="object-contain p-2"
                                        onError={(e) => {
                                            e.currentTarget.onerror = null; // Prevent infinite error loop
                                            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjY2JjYmNiIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTIxIDE1djRjMCAxLjA5Ny0uOTAzIDItMiAyaC0xNGMtMS4wOTcgMC0yLS45MDMtMi0yVjVjMC0xLjA5Ny45MDMtMiAyLTJoMTRjMS4wOTcgMCAyIC45MDMgMiAydjQiLz48cGF0aCBkPSJNMTAgOW0tMiAwYTIgMiAwIDEgMCA0IDAgMiAyIDAgMSAwIC00IDAiLz48cGF0aCBkPSJNMjEgMTVMMTYgMTBsLTIuNSAyLjVMOSA4TDMgMTQiLz48L3N2Zz4=';
                                        }}
                                    />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 line-clamp-1">{product.nombre}</h3>
                                    <p className="text-sm text-gray-500 mb-1">{product.id}</p>
                                    <p className="text-xs font-black text-gray-900">
                                        $ {(product.precios?.['3.8L'] !== undefined ? product.precios['3.8L'] : (product.precios ? Object.values(product.precios)[0] : 0) || 0).toLocaleString('es-CO')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {products.length === 0 && (
                        <div className="text-center p-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                            <Package className="mx-auto text-gray-400 mb-2" size={32} />
                            <p className="text-sm text-gray-500">No hay productos aún.</p>
                            <p className="text-xs text-gray-400 mt-1">Crea un nuevo producto para agregarlo al catálogo.</p>
                        </div>
                    )}
                </div>

                {/* Editor Form */}
                <div className="lg:col-span-2">
                    <AnimatePresence mode="wait">
                        {editingProduct ? (
                            <motion.form 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                onSubmit={handleSave}
                                className="bg-white border rounded-xl shadow-sm overflow-hidden"
                            >
                                <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                                    <h2 className="font-black text-gray-900 flex items-center gap-2">
                                        <Edit size={18} className="text-red-600" />
                                        {editingProduct.id.startsWith('nuevo') ? 'CREAR PRODUCTO' : 'EDITAR PRODUCTO'}
                                    </h2>
                                    <div className="flex gap-2">
                                        {!editingProduct.id.startsWith('nuevo') && (
                                            <button 
                                                type="button" 
                                                onClick={() => handleDelete(editingProduct.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                        <button 
                                            type="button" 
                                            onClick={() => setEditingProduct(null)}
                                            className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Nombre del producto *</label>
                                            <input 
                                                required
                                                type="text" 
                                                value={editingProduct.nombre} 
                                                onChange={e => handleEditChange('nombre', e.target.value)}
                                                className="w-full border-2 border-gray-200 rounded-lg p-2 focus:border-red-500 focus:outline-none text-gray-900 bg-white placeholder-gray-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">ID / Slug * (url: /producto/slug)</label>
                                            <input 
                                                required
                                                type="text" 
                                                value={editingProduct.id} 
                                                onChange={e => handleEditChange('id', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                                disabled={!editingProduct.id.startsWith('nuevo')}
                                                className={`w-full border-2 rounded-lg p-2 focus:outline-none ${editingProduct.id.startsWith('nuevo') ? 'border-gray-200 focus:border-red-500 text-gray-900 bg-white placeholder-gray-400' : 'bg-gray-100 border-transparent text-gray-500 cursor-not-allowed'}`}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Eslogan</label>
                                        <input 
                                            type="text" 
                                            value={editingProduct.slogan} 
                                            onChange={e => handleEditChange('slogan', e.target.value)}
                                            className="w-full border-2 border-gray-200 rounded-lg p-2 focus:border-red-500 focus:outline-none text-gray-900 bg-white placeholder-gray-400"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Descripción</label>
                                        <textarea 
                                            rows={3}
                                            value={editingProduct.descripcion} 
                                            onChange={e => handleEditChange('descripcion', e.target.value)}
                                            className="w-full border-2 border-gray-200 rounded-lg p-2 focus:border-red-500 focus:outline-none resize-none text-gray-900 bg-white placeholder-gray-400"
                                        />
                                    </div>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Imagen Principal</label>
                                            <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                                                <select
                                                    value={editingProduct.imgFile}
                                                    onChange={e => handleEditChange('imgFile', e.target.value)}
                                                    className="flex-1 border-2 border-gray-200 rounded-lg p-2 focus:border-red-500 focus:outline-none text-gray-900 bg-white min-w-[200px]"
                                                >
                                                    <option value="placeholder.png">placeholder.png (Predeterminado)</option>
                                                    {availableImages.map(img => (
                                                        <option key={img} value={img}>{img}</option>
                                                    ))}
                                                </select>
                                                
                                                <button
                                                    type="button"
                                                    onClick={() => handleOptimizeExistingImage('imgFile')}
                                                    disabled={!editingProduct.imgFile || editingProduct.imgFile === 'placeholder.png'}
                                                    className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-100 disabled:text-gray-400 text-white px-3 py-2.5 rounded-lg font-bold text-sm cursor-pointer transition-colors border border-amber-600 disabled:border-transparent flex-shrink-0"
                                                    title="Eliminar fondo y optimizar la imagen ya seleccionada"
                                                >
                                                    <Sparkles size={16} />
                                                    <span>Optimizar</span>
                                                </button>

                                                <label className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2.5 rounded-lg font-bold text-sm cursor-pointer transition-colors border border-gray-300 flex-shrink-0">
                                                    <Upload size={16} />
                                                    <span>Subir</span>
                                                    <input 
                                                        type="file" 
                                                        accept="image/*" 
                                                        className="hidden" 
                                                        onChange={e => handleImageUpload(e, 'imgFile')}
                                                    />
                                                </label>

                                                {editingProduct.imgFile && (
                                                    <div className="relative w-10 h-10 border rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
                                                        <Image
                                                            src={`/images/${editingProduct.imgFile}`}
                                                            alt="preview"
                                                            fill
                                                            className="object-contain p-1"
                                                            unoptimized
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Imagen Secundaria (Miniatura / 3.8L)</label>
                                            <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                                                <select
                                                    value={editingProduct.imgFileSmall || ''}
                                                    onChange={e => handleEditChange('imgFileSmall', e.target.value || null)}
                                                    className="flex-1 border-2 border-gray-200 rounded-lg p-2 focus:border-red-500 focus:outline-none text-gray-900 bg-white min-w-[200px]"
                                                >
                                                    <option value="">Ninguna</option>
                                                    {availableImages.map(img => (
                                                        <option key={img} value={img}>{img}</option>
                                                    ))}
                                                </select>

                                                <button
                                                    type="button"
                                                    onClick={() => handleOptimizeExistingImage('imgFileSmall')}
                                                    disabled={!editingProduct.imgFileSmall || editingProduct.imgFileSmall === 'placeholder.png'}
                                                    className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-100 disabled:text-gray-400 text-white px-3 py-2.5 rounded-lg font-bold text-sm cursor-pointer transition-colors border border-amber-600 disabled:border-transparent flex-shrink-0"
                                                    title="Eliminar fondo y optimizar la imagen ya seleccionada"
                                                >
                                                    <Sparkles size={16} />
                                                    <span>Optimizar</span>
                                                </button>

                                                <label className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2.5 rounded-lg font-bold text-sm cursor-pointer transition-colors border border-gray-300 flex-shrink-0">
                                                    <Upload size={16} />
                                                    <span>Subir</span>
                                                    <input 
                                                        type="file" 
                                                        accept="image/*" 
                                                        className="hidden" 
                                                        onChange={e => handleImageUpload(e, 'imgFileSmall')}
                                                    />
                                                </label>

                                                {editingProduct.imgFileSmall && (
                                                    <div className="relative w-10 h-10 border rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
                                                        <Image
                                                            src={`/images/${editingProduct.imgFileSmall}`}
                                                            alt="preview small"
                                                            fill
                                                            className="object-contain p-1"
                                                            unoptimized
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* === IMAGES PER SIZE === */}
                                    <div className="border-t pt-6">
                                        <h3 className="text-sm font-bold text-gray-900 mb-1">Imágenes por Tamaño</h3>
                                        <p className="text-xs text-gray-400 mb-4">Asigna una imagen específica por presentación. Si un tamaño no tiene imagen, se usará automáticamente la del tamaño más cercano.</p>
                                        <div className="space-y-3">
                                            {Object.keys(editingProduct.precios).sort((a, b) => {
                                                const order = ['500ML','1L','1/2G','3.8L','10L','20L'];
                                                return order.indexOf(a) - order.indexOf(b);
                                            }).map(size => {
                                                const sizeImg = editingProduct.imgFiles?.[size] || '';
                                                return (
                                                    <div key={size} className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                                                        <span className="text-xs font-black text-gray-600 w-10 flex-shrink-0">{size}</span>
                                                        <select
                                                            value={sizeImg}
                                                            onChange={e => handleEditChange('imgFiles', { ...(editingProduct.imgFiles || {}), [size]: e.target.value })}
                                                            className="flex-1 border-2 border-gray-200 rounded-lg p-2 focus:border-red-500 focus:outline-none text-gray-900 bg-white text-xs min-w-[160px]"
                                                        >
                                                            <option value="">— Heredar imagen principal —</option>
                                                            {availableImages.map(img => (
                                                                <option key={img} value={img}>{img}</option>
                                                            ))}
                                                        </select>

                                                        {sizeImg && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOptimizeSizeImage(size)}
                                                                className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-2 rounded-lg font-bold text-xs flex-shrink-0 transition-colors"
                                                                title="Eliminar fondo y optimizar"
                                                            >
                                                                <Sparkles size={13} />
                                                                Opt.
                                                            </button>
                                                        )}

                                                        <label className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-2 rounded-lg font-bold text-xs cursor-pointer transition-colors border border-gray-300 flex-shrink-0">
                                                            <Upload size={13} />
                                                            Subir
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={e => handleSizeImageUpload(e, size)}
                                                            />
                                                        </label>

                                                        {sizeImg && (
                                                            <div className="relative w-9 h-9 border rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
                                                                <Image src={`/images/${sizeImg}`} alt={`${size} preview`} fill className="object-contain p-1" unoptimized />
                                                            </div>
                                                        )}

                                                        {sizeImg && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const updated = { ...(editingProduct.imgFiles || {}) };
                                                                    delete updated[size];
                                                                    handleEditChange('imgFiles', updated);
                                                                }}
                                                                className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                                                                title="Quitar imagen de este tamaño"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Categoría *</label>
                                            <input 
                                                required
                                                type="text" 
                                                value={editingProduct.categoria || ''} 
                                                onChange={e => handleEditChange('categoria', e.target.value)}
                                                placeholder="Ej: Aseo Hogar"
                                                className="w-full border-2 border-gray-200 rounded-lg p-2 focus:border-red-500 focus:outline-none text-gray-900 bg-white placeholder-gray-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Subcategoría (Opcional)</label>
                                            <input 
                                                type="text" 
                                                value={editingProduct.subcategoria || ''} 
                                                onChange={e => handleEditChange('subcategoria', e.target.value || null)}
                                                placeholder="Ej: Detergentes"
                                                className="w-full border-2 border-gray-200 rounded-lg p-2 focus:border-red-500 focus:outline-none text-gray-900 bg-white placeholder-gray-400"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Etiqueta Badge</label>
                                            <input 
                                                type="text" 
                                                value={editingProduct.badge} 
                                                onChange={e => handleEditChange('badge', e.target.value)}
                                                placeholder="Ej: MÁS VENDIDO"
                                                className="w-full border-2 border-gray-200 rounded-lg p-2 focus:border-red-500 focus:outline-none text-gray-900 bg-white placeholder-gray-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Color de Fondo Card</label>
                                            <input 
                                                type="text" 
                                                value={editingProduct.color} 
                                                onChange={e => handleEditChange('color', e.target.value)}
                                                placeholder="Ej: bg-blue-600"
                                                className="w-full border-2 border-gray-200 rounded-lg p-2 focus:border-red-500 focus:outline-none text-gray-900 bg-white placeholder-gray-400"
                                            />
                                        </div>
                                    </div>

                                    <div className="border-t pt-6">
                                        <h3 className="text-sm font-bold text-gray-900 mb-4">Precios Propios (COP)</h3>
                                        <div className="grid grid-cols-3 gap-4">
                                            {['3.8L', '10L', '20L'].map((size) => (
                                                <div key={size}>
                                                    <label className="block text-xs font-bold text-gray-700 mb-1">{size}</label>
                                                    <input 
                                                        type="number" 
                                                        value={editingProduct.precios[size as keyof typeof editingProduct.precios]} 
                                                        onChange={e => handleEditChange('precios', { ...editingProduct.precios, [size]: parseInt(e.target.value) || 0 })}
                                                        className="w-full border-2 border-gray-200 rounded-lg p-2 focus:border-red-500 focus:outline-none text-gray-900 bg-white placeholder-gray-400"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="border-t pt-6">
                                        <h3 className="text-sm font-bold text-gray-900 mb-4">Precios Competencia Promedio (COP)</h3>
                                        <div className="grid grid-cols-3 gap-4">
                                            {['3.8L', '10L', '20L'].map((size) => (
                                                <div key={size}>
                                                    <label className="block text-xs font-bold text-gray-700 mb-1">{size}</label>
                                                    <input 
                                                        type="number" 
                                                        value={editingProduct.competidorPromedio[size as keyof typeof editingProduct.competidorPromedio]} 
                                                        onChange={e => handleEditChange('competidorPromedio', { ...editingProduct.competidorPromedio, [size]: parseInt(e.target.value) || 0 })}
                                                        className="w-full border-2 border-gray-200 rounded-lg p-2 focus:border-red-500 focus:outline-none text-gray-900 bg-white placeholder-gray-400"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-4 flex justify-end">
                                        <button 
                                            type="submit" 
                                            disabled={isSaving}
                                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                                        >
                                            <Save size={20} />
                                            {isSaving ? 'Guardando...' : 'Guardar Producto'}
                                        </button>
                                    </div>
                                </div>
                            </motion.form>
                        ) : (
                            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-gray-400 bg-white border border-dashed border-gray-300 rounded-xl">
                                <Package size={48} className="mb-4 text-gray-300" />
                                <p className="font-medium">Selecciona un producto para editarlo</p>
                                <p className="text-sm">o crea uno nuevo para agregarlo al catálogo</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
            
            {/* Image Uploading / Processing Overlay */}
            <AnimatePresence>
                {isUploading && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center space-y-6 border border-gray-100"
                        >
                            <div className="flex justify-center">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full border-4 border-red-100 border-t-red-600 animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Upload className="text-red-600 animate-pulse" size={24} />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-black text-gray-900" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
                                    PROCESANDO IMAGEN
                                </h3>
                                <p className="text-gray-600 text-sm font-medium">
                                    {uploadProgress}
                                </p>
                            </div>
                            
                            {uploadError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold">
                                    {uploadError}
                                </div>
                            )}

                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider space-y-1 text-left bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <p>• Remoción automática de fondo con IA</p>
                                <p>• Ajuste profesional de contraste y luz</p>
                                <p>• Optimización y compresión a WebP</p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
