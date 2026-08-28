'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, ProductSize } from './products';
import { calcularAhorro } from './products';
import { getCartPackagingAnalysis, PackagingAnalysis } from './shipping-zones';
import { AppliedCoupon } from './coupon-types';
import { trackAddToCart } from './meta-pixel';

export interface CartItem {
    product: Product;
    size: ProductSize;
    price: number;
    cantidad: number;
}

interface CartContextType {
    cart: CartItem[];
    isHydrated: boolean;
    addToCart: (product: Product, size: ProductSize, price: number, cantidad?: number) => void;
    removeFromCart: (productId: string, size: string) => void;
    updateQuantity: (productId: string, size: string, cantidad: number) => void;
    clearCart: () => void;
    getTotalItems: () => number;
    getTotalPrice: () => number;
    getTotalSavings: () => number;
    getTotalWeightKg: () => number;
    getPackagingAnalysis: () => PackagingAnalysis;
    isCartOpen: boolean;
    setIsCartOpen: (open: boolean) => void;
    appliedCoupon: AppliedCoupon | null;
    applyCoupon: (code: string, email?: string, phone?: string) => Promise<{ success: boolean; message: string }>;
    removeCoupon: () => void;
    getDiscountAmount: () => number;
    getFinalTotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);
    const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

    // Load cart & coupon from localStorage on mount safely
    useEffect(() => {
        try {
            const savedCart = typeof window !== 'undefined' ? localStorage.getItem('biocambio360_cart') : null;
            if (savedCart) {
                const parsed = JSON.parse(savedCart);
                if (Array.isArray(parsed)) {
                    // Sanitize and filter out corrupt items
                    const sanitized = parsed
                        .filter(item => item && item.product && typeof item.product === 'object' && item.product.id)
                        .map(item => {
                            const precios = item.product.precios || {};
                            const availableSizes = Object.keys(precios);
                            const validSize = (precios[item.size] !== undefined)
                                ? item.size
                                : (availableSizes[0] || item.size || '3.8L');
                            
                            const resolvedPrice = (typeof item.price === 'number' && item.price > 0)
                                ? item.price
                                : (precios[validSize] || Object.values(precios)[0] || 0);

                            return {
                                ...item,
                                product: item.product,
                                size: validSize as ProductSize,
                                price: resolvedPrice,
                                cantidad: typeof item.cantidad === 'number' && item.cantidad > 0 ? item.cantidad : 1
                            };
                        });
                    setCart(sanitized);
                }
            }
        } catch (e) {
            console.error('Error loading cart from localStorage:', e);
            try { localStorage.removeItem('biocambio360_cart'); } catch (_) {}
        }

        try {
            const savedCoupon = typeof window !== 'undefined' ? localStorage.getItem('biocambio360_coupon') : null;
            if (savedCoupon) {
                setAppliedCoupon(JSON.parse(savedCoupon));
            }
        } catch (e) {
            console.error('Error loading saved coupon:', e);
            try { localStorage.removeItem('biocambio360_coupon'); } catch (_) {}
        }

        setIsHydrated(true);
    }, []);

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        try {
            if (typeof window !== 'undefined') {
                if (cart.length > 0) {
                    localStorage.setItem('biocambio360_cart', JSON.stringify(cart));
                } else {
                    localStorage.removeItem('biocambio360_cart');
                }
            }
        } catch (e) {
            // ignore quota/security errors
        }
    }, [cart]);

    // Save coupon to localStorage
    useEffect(() => {
        try {
            if (typeof window !== 'undefined') {
                if (appliedCoupon) {
                    localStorage.setItem('biocambio360_coupon', JSON.stringify(appliedCoupon));
                } else {
                    localStorage.removeItem('biocambio360_coupon');
                }
            }
        } catch (e) {
            // ignore quota/security errors
        }
    }, [appliedCoupon]);

    const addToCart = (product: Product, size: ProductSize, price: number, cantidad: number = 1) => {
        const availableSizes = Object.keys(product.precios || {});
        const effectiveSize = (product.precios && product.precios[size] !== undefined)
            ? size
            : (availableSizes[0] || size);

        const resolvedPrice = (price && price > 0)
            ? price
            : (product.precios?.[effectiveSize] || Object.values(product.precios || {})[0] || 0);

        // Meta Pixel: Track AddToCart
        trackAddToCart({
            content_ids: [product.sku || `${product.id}-${effectiveSize}`],
            content_name: `${product.nombre} (${effectiveSize})`,
            content_type: 'product',
            currency: 'COP',
            value: resolvedPrice,
            num_items: cantidad,
        });

        setCart(prevCart => {
            const existingItem = prevCart.find(
                item => item.product.id === product.id && item.size === effectiveSize
            );

            if (existingItem) {
                return prevCart.map(item =>
                    item.product.id === product.id && item.size === effectiveSize
                        ? { ...item, price: resolvedPrice, cantidad: item.cantidad + cantidad }
                        : item
                );
            }

            return [...prevCart, { product, size: effectiveSize as ProductSize, price: resolvedPrice, cantidad }];
        });
    };

    const removeFromCart = (productId: string, size: string) => {
        setCart(prevCart => prevCart.filter(
            item => !(item.product.id === productId && item.size === size)
        ));
    };

    const updateQuantity = (productId: string, size: string, cantidad: number) => {
        if (cantidad <= 0) {
            removeFromCart(productId, size);
            return;
        }

        setCart(prevCart =>
            prevCart.map(item =>
                item.product.id === productId && item.size === size
                    ? { ...item, cantidad }
                    : item
            )
        );
    };

    const clearCart = () => {
        setCart([]);
        setAppliedCoupon(null);
    };

    const getTotalItems = () => {
        return cart.reduce((total, item) => total + (item?.cantidad || 0), 0);
    };

    const getTotalPrice = () => {
        return cart.reduce((total, item) => total + ((item?.price || 0) * (item?.cantidad || 0)), 0);
    };

    const getDiscountAmount = () => {
        if (!appliedCoupon) return 0;
        const subtotal = getTotalPrice();
        if (appliedCoupon.type === 'percentage') {
            return Math.round((subtotal * (appliedCoupon.value || 0)) / 100);
        } else if (appliedCoupon.type === 'fixed_amount') {
            return Math.min(subtotal, appliedCoupon.value || 0);
        } else if (appliedCoupon.type === 'buy_x_get_y') {
            return Math.round(subtotal * 0.15);
        }
        return appliedCoupon.discountAmount || 0;
    };

    const getFinalTotal = () => {
        return Math.max(0, getTotalPrice() - getDiscountAmount());
    };

    const applyCoupon = async (code: string, email?: string, phone?: string) => {
        try {
            const subtotal = getTotalPrice();
            const res = await fetch('/api/coupons/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, subtotal, customerEmail: email, customerPhone: phone })
            });

            const data = await res.json();
            if (!res.ok || !data.valid) {
                return { success: false, message: data.reason || 'Cupón no válido' };
            }

            setAppliedCoupon(data.appliedCoupon);
            return { success: true, message: data.appliedCoupon.message };
        } catch (e: any) {
            return { success: false, message: e.message || 'Error al validar cupón' };
        }
    };

    const removeCoupon = () => {
        setAppliedCoupon(null);
    };

    const getTotalSavings = () => {
        return cart.reduce((total, item) => {
            if (!item || !item.product) return total;
            const competidorPrecio = item.product.competidorPromedio?.[item.size] || 0;
            const savingsData = calcularAhorro(item.price || 0, item.size || '3.8L', competidorPrecio);
            if (savingsData && savingsData.ahorroDinero > 0) {
                return total + (savingsData.ahorroDinero * (item.cantidad || 1));
            }
            return total;
        }, 0);
    };

    const getPackagingAnalysis = (): PackagingAnalysis => {
        const quoteItems = cart
            .filter(item => item && item.product && item.product.id)
            .map(item => ({
                productId: item.product.id,
                nombre: item.product.nombre || 'Producto',
                size: item.size || '3.8L',
                cantidad: item.cantidad || 1,
            }));
        return getCartPackagingAnalysis(quoteItems);
    };

    const getTotalWeightKg = () => {
        return getPackagingAnalysis().totalWeightKg;
    };

    return (
        <CartContext.Provider
            value={{
                cart,
                isHydrated,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                getTotalItems,
                getTotalPrice,
                getTotalSavings,
                getTotalWeightKg,
                getPackagingAnalysis,
                isCartOpen,
                setIsCartOpen,
                appliedCoupon,
                applyCoupon,
                removeCoupon,
                getDiscountAmount,
                getFinalTotal,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within CartProvider');
    }
    return context;
}
