'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Package, Sparkles, Check, Plus, Minus, Truck, ChevronRight, Zap, Gift, Star } from 'lucide-react';
import { COMBOS, Combo, calcularAhorroCombo, calcularPrecioCustomCombo, formatCOP, COMBO_SIZE_LABELS } from '@/lib/combos';
import { Product, formatCurrency } from '@/lib/products';
import { useCart } from '@/lib/cart-context';

interface ComboBuilderProps {
    products: Product[];
    onAddToCart: (product: any, size: string, price: number, cantidad: number) => void;
}

type TabType = 'combos' | 'custom';

// ─── Combo Card Component ────────────────────────────────────
function ComboCard({ combo, onSelect }: { combo: Combo; onSelect: (combo: Combo) => void }) {
    const savings = calcularAhorroCombo(combo);
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            layout
            whileHover={{ y: -8, scale: 1.02 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            className={`relative bg-white rounded-3xl border border-gray-100 overflow-hidden cursor-pointer group transition-shadow duration-500 ${
                isHovered ? 'shadow-2xl shadow-brand-blue/10' : 'shadow-lg shadow-gray-200/50'
            } ${combo.popular ? 'ring-2 ring-brand-blue' : ''}`}
            onClick={() => onSelect(combo)}
        >
            {/* Popular Ribbon */}
            {combo.popular && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-dark)] text-white text-center py-1.5 text-xs font-extrabold tracking-widest uppercase z-10">
                    <Star size={12} className="inline mr-1 -mt-0.5" />
                    Más Popular
                </div>
            )}

            {/* Header with gradient */}
            <div className={`relative p-6 pb-12 bg-gradient-to-br ${combo.colorGradient} ${combo.popular ? 'pt-10' : ''}`}>
                <div className="relative z-10">
                    <div className="flex items-start justify-between">
                        <div>
                            <span className={`inline-block ${combo.badgeColor} text-white text-[9px] font-extrabold px-3 py-1 rounded-full tracking-wider uppercase mb-3`}>
                                {combo.badge}
                            </span>
                            <h3 className="text-white font-extrabold text-2xl leading-tight tracking-tight">
                                {combo.nombre}
                            </h3>
                            <p className="text-white/70 text-sm font-medium mt-1">{combo.subtitulo}</p>
                        </div>
                        <span className="text-4xl">{combo.emoji}</span>
                    </div>
                </div>
                {/* Decorative blobs */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-2xl" />
            </div>

            {/* Products included — pill-style overlapping cards */}
            <div className="px-6 -mt-6 relative z-10">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Incluye</p>
                    <div className="space-y-2">
                        {combo.items.map((item, idx) => (
                            <motion.div
                                key={item.productId}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="flex items-center gap-2 text-sm"
                            >
                                <span className="text-base">{item.emoji}</span>
                                <span className="text-gray-700 font-medium flex-1">{item.productName}</span>
                                <span className="text-gray-400 text-xs font-semibold bg-gray-50 px-2 py-0.5 rounded-full">{COMBO_SIZE_LABELS[item.size]}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Benefits */}
            <div className="px-6 pt-4 pb-2">
                {combo.beneficios.slice(0, 2).map((b, idx) => (
                    <div key={idx} className="flex items-start gap-2 mb-2">
                        <Check size={14} className="text-[var(--brand-success)] mt-0.5 shrink-0" />
                        <span className="text-xs text-gray-500 leading-snug">{b}</span>
                    </div>
                ))}
            </div>

            {/* Footer: Price + CTA */}
            <div className="px-6 pb-6 pt-2">
                <div className="flex items-end justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-400 line-through font-medium">{formatCOP(combo.precioRegular)}</span>
                            <span className="text-[10px] font-extrabold text-[var(--brand-success)] bg-[var(--brand-success-light)] px-2 py-0.5 rounded-full">
                                -{savings.ahorroPorcentaje}%
                            </span>
                        </div>
                        <span className="text-3xl font-extrabold text-[var(--brand-dark)] tracking-tight">
                            {formatCOP(combo.precio)}
                        </span>
                        {combo.envioGratis && (
                            <div className="flex items-center gap-1 mt-1 text-[var(--brand-success)]">
                                <Truck size={12} />
                                <span className="text-[10px] font-bold">Envío GRATIS</span>
                            </div>
                        )}
                    </div>
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-dark)] text-white font-bold text-sm px-5 py-3 rounded-xl shadow-lg shadow-[var(--brand-blue)]/20 flex items-center gap-2"
                    >
                        <ShoppingCart size={16} />
                        Agregar
                    </motion.div>
                </div>
            </div>

            {/* Duration tag */}
            <div className="absolute top-3 right-3 bg-black/20 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-1 rounded-full z-20">
                ⏱️ Rinde {combo.duracion}
            </div>
        </motion.div>
    );
}

// ─── Custom Combo Builder ────────────────────────────────────
function CustomComboBuilder({ products, onAddToCart }: { products: Product[]; onAddToCart: ComboBuilderProps['onAddToCart'] }) {
    const { addToCart } = useCart();

    interface CustomItem {
        product: Product;
        size: '3.8L' | '10L' | '20L';
        quantity: number;
    }

    const [customItems, setCustomItems] = useState<CustomItem[]>([]);

    const toggleProduct = (product: Product) => {
        const exists = customItems.find(i => i.product.id === product.id);
        if (exists) {
            setCustomItems(prev => prev.filter(i => i.product.id !== product.id));
        } else {
            setCustomItems(prev => [...prev, { product, size: '3.8L', quantity: 1 }]);
        }
    };

    const updateItemSize = (productId: string, size: '3.8L' | '10L' | '20L') => {
        setCustomItems(prev => prev.map(i => i.product.id === productId ? { ...i, size } : i));
    };

    const updateItemQty = (productId: string, delta: number) => {
        setCustomItems(prev => prev.map(i => {
            if (i.product.id === productId) {
                return { ...i, quantity: Math.max(1, i.quantity + delta) };
            }
            return i;
        }));
    };

    const pricing = useMemo(() => {
        if (customItems.length === 0) return null;
        const mapped = customItems.map(i => ({
            productId: i.product.id,
            size: i.size,
            precio: i.product.precios[i.size],
            quantity: i.quantity,
        }));
        return calcularPrecioCustomCombo(mapped);
    }, [customItems]);

    const totalItems = customItems.reduce((sum, i) => sum + i.quantity, 0);
    const isFreeShipping = pricing ? pricing.precioCombo >= 100000 : false;
    const amountToFreeShipping = pricing ? Math.max(0, 100000 - pricing.precioCombo) : 100000;
    const progress = pricing ? Math.min((pricing.precioCombo / 100000) * 100, 100) : 0;

    const handleAddAllToCart = () => {
        if (!pricing || customItems.length === 0) return;
        const discountRatio = pricing.precioOriginal > 0 ? pricing.precioCombo / pricing.precioOriginal : 1;

        customItems.forEach(item => {
            const regularPrice = item.product.precios[item.size] || 0;
            const discountedPrice = Math.round(regularPrice * discountRatio);
            onAddToCart(item.product, item.size, discountedPrice, item.quantity);
        });
    };

    const sizeOptions: Array<'3.8L' | '10L' | '20L'> = ['3.8L', '10L', '20L'];
    const sizeLabel = (s: '3.8L' | '10L' | '20L') => COMBO_SIZE_LABELS[s];

    const getColorForProduct = (id: string) => {
        switch (id) {
            case 'detergente': return 'from-blue-500 to-blue-600';
            case 'desengrasante': return 'from-[var(--brand-pink)] to-[var(--brand-pink-dark)]';
            case 'suavizante': return 'from-pink-500 to-pink-600';
            case 'blanqueador': return 'from-teal-500 to-teal-600';
            default: return 'from-gray-500 to-gray-600';
        }
    };

    const getEmojiForProduct = (id: string) => {
        switch (id) {
            case 'detergente': return '👕';
            case 'desengrasante': return '🔥';
            case 'suavizante': return '🌸';
            case 'blanqueador': return '✨';
            default: return '🧴';
        }
    };

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[var(--brand-pink)]/10 to-[var(--brand-blue)]/10 px-4 py-2 rounded-full mb-4">
                    <Zap size={16} className="text-[var(--brand-pink)]" />
                    <span className="text-sm font-bold text-[var(--brand-dark)]">Mientras más agregas, más ahorras</span>
                </div>
                <div className="flex items-center justify-center gap-4 text-xs text-gray-400 font-semibold">
                    <span className="flex items-center gap-1">2 items = <span className="text-[var(--brand-blue)] font-extrabold">5%</span></span>
                    <span className="w-px h-4 bg-gray-200" />
                    <span className="flex items-center gap-1">3 items = <span className="text-[var(--brand-blue)] font-extrabold">7%</span></span>
                    <span className="w-px h-4 bg-gray-200" />
                    <span className="flex items-center gap-1">4 items = <span className="text-[var(--brand-blue)] font-extrabold">10%</span></span>
                    <span className="w-px h-4 bg-gray-200" />
                    <span className="flex items-center gap-1">6+ items = <span className="text-[var(--brand-pink)] font-extrabold">15%</span></span>
                </div>
            </div>

            {/* Product Selection Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {products.map((product) => {
                    const isSelected = customItems.find(i => i.product.id === product.id);
                    const selectedItem = customItems.find(i => i.product.id === product.id);

                    return (
                        <motion.div
                            key={product.id}
                            layout
                            whileHover={{ y: -4 }}
                            whileTap={{ scale: 0.98 }}
                            className={`relative rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${
                                isSelected
                                    ? 'border-[var(--brand-blue)] bg-[var(--brand-blue-50)] shadow-lg shadow-[var(--brand-blue)]/10'
                                    : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-md'
                            }`}
                            onClick={() => toggleProduct(product)}
                        >
                            {/* Selected checkmark */}
                            <AnimatePresence>
                                {isSelected && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0 }}
                                        className="absolute top-3 right-3 w-6 h-6 bg-[var(--brand-blue)] rounded-full flex items-center justify-center z-10 shadow-md"
                                    >
                                        <Check size={14} className="text-white" />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Product Visual */}
                            <div className="p-4 pb-2 flex flex-col items-center">
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getColorForProduct(product.id)} flex items-center justify-center text-2xl mb-3 shadow-sm`}>
                                    {getEmojiForProduct(product.id)}
                                </div>
                                <h4 className="text-sm font-bold text-[var(--brand-dark)] text-center leading-tight">
                                    {product.nombre}
                                </h4>
                                <p className="text-[10px] text-gray-400 mt-1 text-center">{product.slogan}</p>
                            </div>

                            {/* Size & Qty controls (only when selected) */}
                            <AnimatePresence>
                                {isSelected && selectedItem && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="px-3 pb-4 pt-2 space-y-3">
                                            {/* Size pills */}
                                            <div className="flex gap-1 bg-gray-50 rounded-lg p-1">
                                                {sizeOptions.filter(s => product.precios[s] !== undefined).map(size => (
                                                    <button
                                                        key={size}
                                                        onClick={(e) => { e.stopPropagation(); updateItemSize(product.id, size); }}
                                                        className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-all ${
                                                            selectedItem.size === size
                                                                ? 'bg-white text-[var(--brand-blue)] shadow-sm ring-1 ring-[var(--brand-blue)]/20'
                                                                : 'text-gray-400 hover:text-gray-600'
                                                        }`}
                                                    >
                                                        {sizeLabel(size)}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Quantity */}
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-gray-400">Cantidad</span>
                                                <div className="flex items-center gap-1">
                                                    <motion.button
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={(e) => { e.stopPropagation(); updateItemQty(product.id, -1); }}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"
                                                    >
                                                        <Minus size={12} />
                                                    </motion.button>
                                                    <span className="w-6 text-center text-sm font-extrabold text-[var(--brand-dark)]">
                                                        {selectedItem.quantity}
                                                    </span>
                                                    <motion.button
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={(e) => { e.stopPropagation(); updateItemQty(product.id, 1); }}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"
                                                    >
                                                        <Plus size={12} />
                                                    </motion.button>
                                                </div>
                                            </div>

                                            {/* Price */}
                                            <div className="text-center">
                                                <span className="text-sm font-extrabold text-[var(--brand-dark)]">
                                                    {formatCurrency(product.precios[selectedItem.size] * selectedItem.quantity)}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>

            {/* Free Shipping Progress */}
            <motion.div
                layout
                className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 shadow-sm"
            >
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Truck size={18} className={isFreeShipping ? "text-[var(--brand-success)]" : "text-gray-400"} />
                        <span className="text-sm font-bold text-[var(--brand-dark)]">
                            {isFreeShipping
                                ? '¡Envío GRATIS desbloqueado! 🎉'
                                : `Te faltan ${formatCurrency(amountToFreeShipping)} para envío GRATIS`
                            }
                        </span>
                    </div>
                    {pricing && pricing.porcentaje > 0 && (
                        <span className="text-xs font-extrabold text-[var(--brand-pink)] bg-[var(--brand-pink-light)] px-3 py-1 rounded-full">
                            Descuento: {pricing.porcentaje}%
                        </span>
                    )}
                </div>
                <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className={`h-full rounded-full transition-colors ${isFreeShipping ? 'bg-[var(--brand-success)]' : 'bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-pink)]'}`}
                    />
                </div>
            </motion.div>

            {/* Summary + Add to Cart */}
            <AnimatePresence>
                {pricing && customItems.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="bg-gradient-to-br from-[var(--brand-dark)] to-[var(--brand-dark-secondary)] rounded-3xl p-6 text-white"
                    >
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <Gift size={18} className="text-[var(--brand-pink)]" />
                                    <span className="text-sm font-bold text-white/60">Tu Combo Personalizado</span>
                                </div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-xs text-white/40 line-through">{formatCurrency(pricing.precioOriginal)}</span>
                                    {pricing.descuento > 0 && (
                                        <span className="text-xs font-extrabold text-[var(--brand-pink)] bg-[var(--brand-pink)]/20 px-2 py-0.5 rounded-full">
                                            Ahorras {formatCurrency(pricing.descuento)}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-extrabold tracking-tight">{formatCurrency(pricing.precioCombo)}</span>
                                    <span className="text-sm text-white/40">({totalItems} {totalItems === 1 ? 'producto' : 'productos'})</span>
                                </div>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={handleAddAllToCart}
                                className="bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-pink)] text-white font-extrabold py-4 px-8 rounded-2xl shadow-xl shadow-[var(--brand-blue)]/30 flex items-center gap-3 text-lg"
                            >
                                <ShoppingCart size={22} />
                                Agregar Combo al Carrito
                                <ChevronRight size={18} />
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Main ComboBuilder Component ────────────────────────────
export default function ComboBuilder({ products, onAddToCart }: ComboBuilderProps) {
    const [activeTab, setActiveTab] = useState<TabType>('combos');
    const { addToCart } = useCart();

    const handleSelectCombo = (combo: Combo) => {
        const discountRatio = combo.precioRegular > 0 ? combo.precio / combo.precioRegular : 1;

        // Add all combo items to cart with discounted combo prices
        combo.items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (product) {
                const regularPrice = product.precios[item.size] || 0;
                const discountedPrice = Math.round(regularPrice * discountRatio);
                onAddToCart(product, item.size, discountedPrice, item.quantity);
            }
        });
    };

    return (
        <section className="py-16 px-4" id="combos">
            <div className="max-w-[1400px] mx-auto">
                {/* Section Header */}
                <div className="text-center mb-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <span className="inline-block text-[var(--brand-pink)] font-extrabold uppercase text-xs tracking-[0.2em] mb-3">
                            Ahorra Más en Combo
                        </span>
                        <h2 className="text-4xl md:text-5xl font-extrabold text-[var(--brand-dark)] tracking-tight mb-3">
                            COMBOTIZA TU LIMPIEZA
                        </h2>
                        <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                            Arma tu combo ideal o elige uno de nuestros packs populares. Mientras más llevas, más ahorras — y desbloqueas <strong className="text-[var(--brand-blue)]">envío gratis</strong>.
                        </p>
                    </motion.div>
                </div>

                {/* Tabs */}
                <div className="flex justify-center mb-10">
                    <div className="inline-flex bg-gray-100 rounded-2xl p-1.5 gap-1">
                        <button
                            onClick={() => setActiveTab('combos')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                                activeTab === 'combos'
                                    ? 'bg-white text-[var(--brand-dark)] shadow-sm'
                                    : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            <Package size={18} />
                            Combos Populares
                        </button>
                        <button
                            onClick={() => setActiveTab('custom')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                                activeTab === 'custom'
                                    ? 'bg-white text-[var(--brand-dark)] shadow-sm'
                                    : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            <Sparkles size={18} />
                            Arma tu Combo
                        </button>
                    </div>
                </div>

                {/* Tab Content */}
                <AnimatePresence mode="wait">
                    {activeTab === 'combos' ? (
                        <motion.div
                            key="combos"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="grid grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto gap-6 lg:gap-8"
                        >
                            {COMBOS.map((combo) => (
                                <ComboCard key={combo.id} combo={combo} onSelect={handleSelectCombo} />
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="custom"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <CustomComboBuilder products={products} onAddToCart={onAddToCart} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
}
