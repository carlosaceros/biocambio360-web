'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShoppingBag, MapPin, CreditCard, Loader, Ticket } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { useCart } from '@/lib/cart-context';
import { recordCouponRedemption } from '@/lib/coupons-service';
import {
    DEPARTAMENTOS,
    CIUDADES_POR_DEPARTAMENTO,
    validateCedula,
    validateCelular,
    formatCurrency
} from '@/lib/checkout-utils';
import citiesData from '@/lib/cities-99envios.json';

const ALL_CITIES_99 = Object.entries(citiesData as Record<string, { codigo: string; ciudad: string; departamento: string }>)
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => a.ciudad.localeCompare(b.ciudad));
import { createOrder } from '@/lib/orders-service';
import { processOrderReplenishment, saveReplenishmentRecord } from '@/lib/replenishment-service';
import { Order } from '@/types/order';

interface FormData {
    nombre: string;
    cedula: string;
    celular: string;
    email: string;
    departamento: string;
    ciudad: string;
    direccion: string;
    notas: string;
}

interface FormErrors {
    [key: string]: string;
}

export default function CheckoutPage() {
    const router = useRouter();
    const { 
        cart, 
        getTotalPrice, 
        getTotalWeightKg, 
        isHydrated,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        getDiscountAmount,
        getFinalTotal
    } = useCart();
    
    const [formData, setFormData] = useState<FormData>({
        nombre: '',
        cedula: '',
        celular: '',
        email: '',
        departamento: '',
        ciudad: '',
        direccion: '',
        notas: ''
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [shippingCost, setShippingCost] = useState(0);
    const [shippingInfo, setShippingInfo] = useState<{
        source?: string;
        transportadora?: string | null;
        dias?: string | number;
        sinCobertura?: boolean;
        mensaje?: string;
        loading?: boolean;
    }>({});

    const [destinoCodigo, setDestinoCodigo] = useState('');
    const [citySearch, setCitySearch] = useState('');
    const [citySearchOpen, setCitySearchOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'contraentrega' | 'wompi'>('contraentrega');

    const [couponCodeInput, setCouponCodeInput] = useState('');
    const [couponError, setCouponError] = useState('');
    const [couponSuccess, setCouponSuccess] = useState('');
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

    const handleCheckoutApplyCoupon = async () => {
        if (!couponCodeInput.trim()) return;
        setIsValidatingCoupon(true);
        setCouponError('');
        setCouponSuccess('');

        const res = await applyCoupon(couponCodeInput.trim(), formData.email, formData.celular);
        setIsValidatingCoupon(false);

        if (res.success) {
            setCouponSuccess(res.message);
            setCouponCodeInput('');
        } else {
            setCouponError(res.message);
        }
    };

    const subtotal = getTotalPrice();
    const totalKg = getTotalWeightKg();
    const discountAmount = getDiscountAmount();
    const effectiveShippingCost = appliedCoupon?.type === 'free_shipping' ? 0 : shippingCost;
    const total = Math.max(0, subtotal - discountAmount) + effectiveShippingCost;

    // Cotizar envío con 99 Envíos cuando cambia la ciudad destino
    useEffect(() => {
        if (!destinoCodigo || !formData.ciudad) return;
        let cancelled = false;
        setShippingInfo({ loading: true });
        setShippingCost(0);

        fetch('/api/envios/cotizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                destinoCodigo,
                destinoNombre: formData.ciudad,
                subtotal,
                aplicaContrapago: paymentMethod === 'contraentrega',
                totalWeightKg: totalKg,
                itemsSizes: cart.map(item => ({ size: item.size, cantidad: item.cantidad })),
            }),
        })
            .then(r => r.json())
            .then(data => {
                if (cancelled) return;
                if (data.gratis) {
                    setShippingCost(0);
                    setShippingInfo({ source: 'free_shipping', mensaje: data.mensaje });
                } else if (data.sinCobertura) {
                    setShippingCost(0);
                    setShippingInfo({ sinCobertura: true, mensaje: data.mensaje });
                } else {
                    setShippingCost(data.precio || 0);
                    setShippingInfo({
                        source: data.source,
                        transportadora: data.transportadora,
                        dias: data.dias,
                        mensaje: data.mensaje,
                    });
                }
            })
            .catch(() => {
                if (cancelled) return;
                // Ultimate fallback — $18.000
                setShippingCost(18000);
                setShippingInfo({ source: 'fallback', mensaje: '* Precio estimado' });
            });

        return () => { cancelled = true; };
    }, [destinoCodigo, formData.ciudad, paymentMethod]);

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, []);

    // Redirect if cart is empty — but only AFTER localStorage has been read (isHydrated)
    useEffect(() => {
        if (isHydrated && cart.length === 0) {
            router.push('/');
        }
    }, [isHydrated, cart, router]);

    const [cartToken, setCartToken] = useState<string>('');

    // 1. Recovery token check on mount & cartToken initialization
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const recoveryToken = params.get('recovery_token');

        if (recoveryToken) {
            fetch(`/api/abandoned-cart/recover?token=${recoveryToken}`)
                .then(r => r.json())
                .then(res => {
                    if (res.cart) {
                        setCartToken(res.cart.cartToken);
                        if (res.cart.customerEmail) {
                            setFormData(prev => ({
                                ...prev,
                                email: res.cart.customerEmail || prev.email,
                                nombre: res.cart.customerName || prev.nombre,
                                celular: res.cart.customerPhone || prev.celular,
                                ciudad: res.cart.ciudad || prev.ciudad,
                                direccion: res.cart.direccion || prev.direccion,
                            }));
                        }
                    }
                })
                .catch(err => console.warn('[Recovery] Error restoring cart:', err));
        } else {
            let tok = localStorage.getItem('biocambio_cart_token');
            if (!tok) {
                tok = `cart_tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                localStorage.setItem('biocambio_cart_token', tok);
            }
            setCartToken(tok);
        }
    }, []);

    // 2. Auto-save abandoned cart session when email or cart changes
    useEffect(() => {
        if (!cartToken || !formData.email || !formData.email.includes('@') || cart.length === 0) return;

        const timer = setTimeout(() => {
            fetch('/api/abandoned-cart/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cartToken,
                    customerEmail: formData.email,
                    customerName: formData.nombre,
                    customerPhone: formData.celular,
                    ciudad: formData.ciudad,
                    direccion: formData.direccion,
                    items: cart.map(i => ({
                        id: i.product.id,
                        nombre: i.product.nombre,
                        size: i.size,
                        cantidad: i.cantidad,
                        price: i.price,
                        imgFile: i.product.imgFile,
                    })),
                    subtotal,
                    shippingCost,
                    total,
                }),
            }).catch(e => console.warn('[AbandonedCart] Auto-save failed:', e));
        }, 1500);

        return () => clearTimeout(timer);
    }, [cartToken, formData.email, formData.nombre, formData.celular, formData.ciudad, formData.direccion, cart, subtotal, shippingCost, total]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }

        // Reset ciudad when departamento changes
        if (name === 'departamento') {
            setFormData(prev => ({ ...prev, ciudad: '' }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        if (!formData.nombre.trim() || formData.nombre.length < 3) {
            newErrors.nombre = 'Nombre completo es requerido (mín. 3 caracteres)';
        }

        if (!validateCedula(formData.cedula)) {
            newErrors.cedula = 'Cédula inválida (6-10 dígitos)';
        }

        if (!validateCelular(formData.celular)) {
            newErrors.celular = 'Celular inválido (10 dígitos, debe iniciar con 3)';
        }

        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Email inválido';
        }

        if (!formData.departamento) {
            newErrors.departamento = 'Departamento es requerido';
        }

        if (!formData.ciudad) {
            newErrors.ciudad = 'Ciudad es requerida';
        }

        if (!formData.direccion.trim() || formData.direccion.length < 10) {
            newErrors.direccion = 'Dirección completa es requerida (mín. 10 caracteres)';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            // Create order in Firestore
            const orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'timeline'> = {
                cliente: {
                    nombre: formData.nombre,
                    cedula: formData.cedula,
                    celular: formData.celular,
                    email: formData.email || undefined,
                    departamento: formData.departamento,
                    ciudad: formData.ciudad,
                    direccion: formData.direccion,
                    notas: formData.notas || undefined
                },
                productos: cart,
                subtotal,
                envio: effectiveShippingCost,
                total,
                metodoPago: paymentMethod,
                status: 'pendiente',
                cuponAplicado: appliedCoupon ? {
                    code: appliedCoupon.code,
                    type: appliedCoupon.type,
                    value: appliedCoupon.value,
                    discountAmount
                } : undefined
            };

            const orderId = await createOrder(orderData as any);

            // Record replenishment BI timer (works for B2C & B2B)
            if (orderId) {
                try {
                    const replRecord = processOrderReplenishment({ ...orderData, id: orderId } as any);
                    await saveReplenishmentRecord(replRecord);
                } catch (rErr) {
                    console.warn('Error al registrar timer de reabastecimiento BI:', rErr);
                }
            }

            // Record coupon usage in database for analytics & security limits
            if (appliedCoupon && orderId) {
                try {
                    await recordCouponRedemption(
                        appliedCoupon.code,
                        orderId,
                        formData.email || 'sin-email@biocambio360.com',
                        formData.celular,
                        discountAmount
                    );
                } catch (cErr) {
                    console.warn('Error al registrar redención de cupón:', cErr);
                }
            }

            // Send push + email notifications — await to ensure request reaches server before navigation
            try {
                await fetch('/api/notifications/new-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderId,
                        customerName: formData.nombre,
                        customerEmail: formData.email || null,
                        telefono: formData.celular,
                        direccion: formData.direccion,
                        total,
                        metodoPago: paymentMethod,
                        ciudad: formData.ciudad,
                        productos: cart.map(item => ({
                            nombre: item.product?.nombre || (item.product as any)?.title || 'Producto Biocambio360',
                            size: item.size,
                            cantidad: item.cantidad,
                            price: item.price,
                        })),
                        subtotal,
                        envio: shippingCost,
                    }),
                });
            } catch (e) {
                console.warn('[Checkout] Notification call failed (non-fatal):', e);
            }

            // Store order ID in sessionStorage for confirmation page
            sessionStorage.setItem(`order_${orderId}`, JSON.stringify(orderData));
            sessionStorage.setItem('lastOrderId', orderId);

            if (paymentMethod === 'wompi') {
                // Handle Wompi Flow
                const amountInCents = total * 100;

                // 1. Get Signature
                const sigRes = await fetch('/api/wompi/signature', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        reference: orderId,
                        amountInCents,
                        currency: 'COP'
                    })
                });

                if (!sigRes.ok) throw new Error('Failed to get signature');

                const { signature } = await sigRes.json();
                
                // Get the domain for correct redirect (works dev and prod)
                const baseUrl = window.location.origin;

                // 2. Wompi Checkout Widget Configuration
                const checkout = new (window as any).WidgetCheckout({
                    currency: 'COP',
                    amountInCents: amountInCents,
                    reference: orderId,
                    publicKey: process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY,
                    signature: { integrity: signature },
                    redirectUrl: `${baseUrl}/confirmacion/${orderId}`, // Where wompi returns after payment
                    taxInCents: { // Required structure for some bin cards or configurations if any tax applies
                        vat: 0,
                        consumption: 0
                    },
                    customerData: {
                        email: formData.email || '',
                        fullName: formData.nombre,
                        phoneNumber: formData.celular,
                        phoneNumberPrefix: '+57',
                        legalId: formData.cedula,
                        legalIdType: 'CC'
                    }
                });

                // 3. Open Widget
                checkout.open((result: any) => {
                    // Logic here if they use widget modal instead of redirect
                    // This callback fires when they close the modal widget. 
                    // However, we are setting redirectUrl, so this block might not trigger if payment is full redirect.
                    // But if it fires, we can push them to confirmation:
                    const transaction = result.transaction;
                    if (transaction) {
                        router.push(`/confirmacion/${orderId}?id=${transaction.id}`);
                    }
                });
                
                // Keep subitting true while the widget is open
            } else {
                // Contraentrega flow
                // Redirect to confirmation immediately
                router.push(`/confirmacion/${orderId}`);
            }

        } catch (error) {
            console.error('Error creating order:', error);
            alert('Hubo un error al procesar tu pedido. Por favor intenta de nuevo.');
            setIsSubmitting(false);
        }
    };

    // Show loading spinner while cart is hydrating from localStorage
    if (!isHydrated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <Loader className="animate-spin text-red-500 mx-auto mb-3" size={32} />
                    <p className="text-gray-500 text-sm">Cargando tu carrito...</p>
                </div>
            </div>
        );
    }

    if (cart.length === 0) {
        return null;
    }

    return (
        <>
            {/* Wompi script MUST be loaded for the widget to work */}
            <script src="https://checkout.wompi.co/widget.js" async></script>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
            <div className="max-w-7xl mx-auto px-4">
                {/* Back button */}
                <motion.button
                    whileHover={{ x: -5 }}
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 hover:text-red-600 mb-6 transition-colors"
                >
                    <ArrowLeft size={20} />
                    <span className="font-medium">Volver</span>
                </motion.button>

                <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-8" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
                    Finalizar Compra
                </h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Checkout Form */}
                    <div className="lg:col-span-2">
                        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 md:p-8 space-y-6">
                            {/* Personal Info Section */}
                            <div>
                                <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                                    <MapPin className="text-red-600" size={24} />
                                    Información Personal
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">
                                            Nombre Completo *
                                        </label>
                                        <input
                                            type="text"
                                            name="nombre"
                                            value={formData.nombre}
                                            onChange={handleInputChange}
                                            className={`w-full px-4 py-3 rounded-lg border-2 ${errors.nombre ? 'border-red-500' : 'border-gray-200'} focus:border-red-600 focus:outline-none transition-colors bg-white text-gray-900 placeholder:text-gray-400`}
                                            placeholder="Juan Pérez"
                                        />
                                        {errors.nombre && <p className="text-red-600 text-xs mt-1">{errors.nombre}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">
                                            Cédula *
                                        </label>
                                        <input
                                            type="text"
                                            name="cedula"
                                            value={formData.cedula}
                                            onChange={handleInputChange}
                                            className={`w-full px-4 py-3 rounded-lg border-2 ${errors.cedula ? 'border-red-500' : 'border-gray-200'} focus:border-red-600 focus:outline-none transition-colors bg-white text-gray-900 placeholder:text-gray-400`}
                                            placeholder="1234567890"
                                            maxLength={10}
                                        />
                                        {errors.cedula && <p className="text-red-600 text-xs mt-1">{errors.cedula}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">
                                            Celular *
                                        </label>
                                        <input
                                            type="tel"
                                            name="celular"
                                            value={formData.celular}
                                            onChange={handleInputChange}
                                            className={`w-full px-4 py-3 rounded-lg border-2 ${errors.celular ? 'border-red-500' : 'border-gray-200'} focus:border-red-600 focus:outline-none transition-colors bg-white text-gray-900 placeholder:text-gray-400`}
                                            placeholder="3001234567"
                                            maxLength={10}
                                        />
                                        {errors.celular && <p className="text-red-600 text-xs mt-1">{errors.celular}</p>}
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">
                                            Email (Opcional)
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className={`w-full px-4 py-3 rounded-lg border-2 ${errors.email ? 'border-red-500' : 'border-gray-200'} focus:border-red-600 focus:outline-none transition-colors bg-white text-gray-900 placeholder:text-gray-400`}
                                            placeholder="correo@ejemplo.com"
                                        />
                                        {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Shipping Address Section */}
                            <div>
                                <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                                    <ShoppingBag className="text-red-600" size={24} />
                                    Dirección de Envío
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">
                                            Ciudad / Municipio *
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={citySearch || (formData.ciudad ? `${formData.ciudad}${formData.departamento ? ' / ' + formData.departamento : ''}` : '')}
                                                onChange={e => {
                                                    setCitySearch(e.target.value);
                                                    setCitySearchOpen(true);
                                                    if (!e.target.value) {
                                                        setFormData(prev => ({ ...prev, ciudad: '', departamento: '' }));
                                                        setDestinoCodigo('');
                                                        setShippingInfo({});
                                                        setShippingCost(0);
                                                    }
                                                }}
                                                onFocus={() => setCitySearchOpen(true)}
                                                onBlur={() => setTimeout(() => setCitySearchOpen(false), 200)}
                                                className={`w-full px-4 py-3 rounded-lg border-2 ${errors.ciudad ? 'border-red-500' : 'border-gray-200'} focus:border-red-600 focus:outline-none transition-colors bg-white text-gray-900 placeholder:text-gray-400`}
                                                placeholder="Busca tu ciudad (ej: Bogotá, Medellín, Cali...)"
                                                autoComplete="off"
                                            />
                                            {citySearchOpen && citySearch.length >= 2 && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto">
                                                    {ALL_CITIES_99.filter(c =>
                                                        c.ciudad.includes(citySearch.toUpperCase()) ||
                                                        c.departamento.includes(citySearch.toUpperCase()) ||
                                                        c.codigo.includes(citySearch)
                                                    ).slice(0, 15).map(city => (
                                                        <button
                                                            key={city.codigo}
                                                            type="button"
                                                            className="w-full text-left px-4 py-3 hover:bg-red-50 transition-colors flex items-center justify-between border-b border-gray-100 last:border-0"
                                                            onMouseDown={() => {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    ciudad: city.ciudad,
                                                                    departamento: city.departamento,
                                                                }));
                                                                setDestinoCodigo(city.codigo);
                                                                setCitySearch('');
                                                                setCitySearchOpen(false);
                                                                if (errors.ciudad) setErrors(prev => ({ ...prev, ciudad: '' }));
                                                            }}
                                                        >
                                                            <div>
                                                                <span className="font-semibold text-gray-900">{city.ciudad}</span>
                                                                <span className="text-sm text-gray-500 ml-2">{city.departamento}</span>
                                                            </div>
                                                            <span className="text-xs text-gray-400 font-mono">{city.codigo}</span>
                                                        </button>
                                                    ))}
                                                    {ALL_CITIES_99.filter(c =>
                                                        c.ciudad.includes(citySearch.toUpperCase()) || c.departamento.includes(citySearch.toUpperCase())
                                                    ).length === 0 && (
                                                        <div className="px-4 py-3 text-gray-500 text-sm">No se encontraron resultados</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {formData.ciudad && (
                                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                                                <MapPin size={11} />
                                                {formData.ciudad}, {formData.departamento}
                                                {destinoCodigo && <span className="font-mono text-gray-400">· código {destinoCodigo}</span>}
                                            </p>
                                        )}
                                        {errors.ciudad && <p className="text-red-600 text-xs mt-1">{errors.ciudad}</p>}
                                        {/* Shipping info badge */}
                                        {formData.ciudad && (
                                            <div className={`mt-2 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${
                                                shippingInfo.loading ? 'bg-gray-100 text-gray-500' :
                                                shippingInfo.sinCobertura ? 'bg-red-50 text-red-700 border border-red-200' :
                                                shippingInfo.source === 'free_shipping' ? 'bg-green-50 text-green-700' :
                                                'bg-blue-50 text-blue-700'
                                            }`}>
                                                {shippingInfo.loading && <span className="animate-spin">⏳</span>}
                                                {shippingInfo.sinCobertura && '⛔'}
                                                {!shippingInfo.loading && !shippingInfo.sinCobertura && shippingInfo.source === 'free_shipping' && '🎁'}
                                                {!shippingInfo.loading && !shippingInfo.sinCobertura && shippingInfo.source === '99envios' && '🚚'}
                                                {!shippingInfo.loading && !shippingInfo.sinCobertura && shippingInfo.source === 'fallback' && '📦'}
                                                <div className="w-full flex items-center justify-between gap-2">
                                                    {shippingInfo.loading && <span>Cotizando envío...</span>}
                                                    {!shippingInfo.loading && shippingInfo.sinCobertura && <span>{shippingInfo.mensaje}</span>}
                                                    {!shippingInfo.loading && !shippingInfo.sinCobertura && shippingInfo.source === 'free_shipping' && (
                                                        <span>{shippingInfo.mensaje}</span>
                                                    )}
                                                    {!shippingInfo.loading && !shippingInfo.sinCobertura && (shippingInfo.source === '99envios' || !shippingInfo.source) && (
                                                        <>
                                                            <span>
                                                                Envío con {shippingInfo.transportadora || 'Transportadora'}
                                                                {shippingInfo.dias ? ` · ${shippingInfo.dias} días hábiles` : ''}
                                                            </span>
                                                            <span className="font-bold ml-auto flex-shrink-0">
                                                                {(shippingCost === 0 && (subtotal >= 100000 || shippingInfo.source === 'free_shipping')) ? 'GRATIS' : shippingCost > 0 ? `$${shippingCost.toLocaleString('es-CO')}` : 'Por calcular'}
                                                            </span>
                                                        </>
                                                    )}
                                                    {!shippingInfo.loading && !shippingInfo.sinCobertura && shippingInfo.source === 'fallback' && (
                                                        <>
                                                            <span>Envío estimado{shippingInfo.mensaje ? ` · ${shippingInfo.mensaje}` : ''}</span>
                                                            <span className="font-bold ml-auto flex-shrink-0">
                                                                {(shippingCost === 0 && subtotal >= 100000) ? 'GRATIS' : shippingCost > 0 ? `$${shippingCost.toLocaleString('es-CO')}` : 'Por calcular'}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">
                                            Dirección Completa *
                                        </label>
                                        <input
                                            type="text"
                                            name="direccion"
                                            value={formData.direccion}
                                            onChange={handleInputChange}
                                            className={`w-full px-4 py-3 rounded-lg border-2 ${errors.direccion ? 'border-red-500' : 'border-gray-200'} focus:border-red-600 focus:outline-none transition-colors bg-white text-gray-900 placeholder:text-gray-400`}
                                            placeholder="Calle 123 #45-67, Apto 301"
                                        />
                                        {errors.direccion && <p className="text-red-600 text-xs mt-1">{errors.direccion}</p>}
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">
                                            Notas Adicionales (Opcional)
                                        </label>
                                        <textarea
                                            name="notas"
                                            value={formData.notas}
                                            onChange={handleInputChange}
                                            rows={3}
                                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-red-600 focus:outline-none transition-colors resize-none bg-white text-gray-900 placeholder:text-gray-400"
                                            placeholder="Ej: Casa esquinera, portón verde"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div>
                                <h2 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                                    <CreditCard className="text-red-600" size={24} />
                                    Método de Pago
                                </h2>
                                <div className="space-y-4">
                                    {/* Contraentrega */}
                                    <div
                                        className={`border-2 rounded-xl p-4 cursor-pointer transition-colors ${paymentMethod === 'contraentrega'
                                                ? 'bg-blue-50 border-blue-400'
                                                : 'bg-white border-gray-200 hover:border-blue-200'
                                            }`}
                                        onClick={() => setPaymentMethod('contraentrega')}
                                    >
                                        <div className="flex items-start gap-3">
                                            <input
                                                type="radio"
                                                id="contraentrega"
                                                name="paymentMethod"
                                                value="contraentrega"
                                                checked={paymentMethod === 'contraentrega'}
                                                onChange={(e) => setPaymentMethod(e.target.value as 'contraentrega' | 'wompi')}
                                                className="mt-1"
                                            />
                                            <div>
                                                <label htmlFor="contraentrega" className="font-bold text-gray-900 cursor-pointer">
                                                    Pago Contraentrega
                                                </label>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    Paga cuando recibas tu pedido. Aceptamos efectivo o Nequi al momento de la entrega.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Wompi */}
                                    <div
                                        className={`border-2 rounded-xl p-4 cursor-pointer transition-colors relative overflow-hidden ${paymentMethod === 'wompi'
                                                ? 'bg-blue-50 border-blue-400'
                                                : 'bg-white border-gray-200 hover:border-blue-200'
                                            }`}
                                        onClick={() => setPaymentMethod('wompi')}
                                    >
                                        {/* Wompi Badge */}
                                        <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-bl-lg">
                                            SEGURO
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <input
                                                type="radio"
                                                id="wompi"
                                                name="paymentMethod"
                                                value="wompi"
                                                checked={paymentMethod === 'wompi'}
                                                onChange={(e) => setPaymentMethod(e.target.value as 'contraentrega' | 'wompi')}
                                                className="mt-1"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <label htmlFor="wompi" className="font-bold text-gray-900 cursor-pointer">
                                                        Pago en Línea
                                                    </label>
                                                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                        Wompi
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    Tarjetas de crédito, débito, PSE, Nequi y transferencias Bancolombia.
                                                </p>
                                                {/* Logos array */}
                                                <div className="flex gap-2 mt-3 opacity-75">
                                                    <div className="h-6 w-10 bg-gray-200 rounded flex items-center justify-center text-[8px] font-bold">PSE</div>
                                                    <div className="h-6 w-10 bg-gray-200 rounded flex items-center justify-center text-[8px] font-bold">VISA</div>
                                                    <div className="h-6 w-10 bg-gray-200 rounded flex items-center justify-center text-[8px] font-bold">MC</div>
                                                    <div className="h-6 w-10 bg-gray-200 rounded flex items-center justify-center text-[8px] font-bold">NEQUI</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sin cobertura warning */}
                            {shippingInfo.sinCobertura && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                                    <span className="text-base">⛔</span>
                                    <span>{shippingInfo.mensaje || 'No hay cobertura de envío para esta ciudad.'} Por favor elige otra ciudad o contáctanos.</span>
                                </div>
                            )}

                            {/* Submit Button */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={isSubmitting || !!shippingInfo.loading || !!shippingInfo.sinCobertura}
                                className={`w-full text-white font-black py-4 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${paymentMethod === 'wompi'
                                        ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                                        : 'bg-red-600 hover:bg-red-700 shadow-red-200'
                                    }`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader className="animate-spin" size={20} />
                                        Procesando...
                                    </>
                                ) : (
                                    paymentMethod === 'wompi' ? 'IR A PAGAR CON WOMPI' : 'CONFIRMAR PEDIDO CONTRAENTREGA'
                                )}
                            </motion.button>
                        </form>
                    </div>

                    {/* Order Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
                            <h2 className="text-xl font-black text-gray-900 mb-4">Resumen de Compra</h2>

                            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                                {cart.map((item) => (
                                    <div key={`${item.product.id}-${item.size}`} className="flex justify-between text-sm">
                                        <span className="text-gray-600">
                                            {item.product.nombre} {item.size} x{item.cantidad}
                                        </span>
                                        <span className="font-bold">
                                            {formatCurrency(item.price * item.cantidad)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Module Cupón de Descuento */}
                            <div className="border-t border-b border-gray-100 py-3.5 my-3">
                                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
                                    <Ticket size={14} className="text-blue-600" />
                                    ¿Tienes un cupón de descuento?
                                </label>
                                {appliedCoupon ? (
                                    <div className="flex items-center justify-between bg-green-50 border border-green-200 px-3 py-2 rounded-xl">
                                        <div className="flex items-center gap-2 text-xs font-bold text-green-700">
                                            <span>Cupón <strong>{appliedCoupon.code}</strong> (-{appliedCoupon.type === 'percentage' ? `${appliedCoupon.value}%` : formatCurrency(discountAmount)})</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={removeCoupon}
                                            className="text-xs text-red-500 hover:text-red-700 font-bold underline"
                                        >
                                            Quitar
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={couponCodeInput}
                                                onChange={(e) => {
                                                    setCouponCodeInput(e.target.value.toUpperCase());
                                                    setCouponError('');
                                                }}
                                                placeholder="CÓDIGO (Ej: PRIMERAZO10)"
                                                className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-blue-500 focus:outline-none uppercase bg-white text-gray-900"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleCheckoutApplyCoupon}
                                                disabled={isValidatingCoupon || !couponCodeInput.trim()}
                                                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
                                            >
                                                {isValidatingCoupon ? '...' : 'Aplicar'}
                                            </button>
                                        </div>
                                        {couponError && <p className="text-[11px] text-red-600 font-medium">{couponError}</p>}
                                        {couponSuccess && <p className="text-[11px] text-green-600 font-medium">{couponSuccess}</p>}
                                    </div>
                                )}
                            </div>

                            <div className="pt-2 space-y-2 text-sm">
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal</span>
                                    <span className="font-bold text-gray-900">{formatCurrency(subtotal)}</span>
                                </div>

                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-green-600 font-bold">
                                        <span>Descuento Cupón ({appliedCoupon?.code})</span>
                                        <span>-{formatCurrency(discountAmount)}</span>
                                    </div>
                                )}

                                <div className="flex justify-between items-center text-gray-600">
                                    <span>Envío</span>
                                    {shippingInfo.loading ? (
                                        <span className="font-medium text-amber-600 text-xs flex items-center gap-1.5">
                                            <span className="animate-spin">⏳</span> Cotizando...
                                        </span>
                                    ) : appliedCoupon?.type === 'free_shipping' || shippingInfo.source === 'free_shipping' ? (
                                        <span className="font-bold text-green-600">GRATIS</span>
                                    ) : !formData.ciudad || !destinoCodigo ? (
                                        <span className="font-medium text-gray-400 text-xs">Por calcular</span>
                                    ) : shippingInfo.sinCobertura ? (
                                        <span className="font-bold text-red-600 text-xs">Sin cobertura</span>
                                    ) : (
                                        <span className="font-bold text-gray-900">{formatCurrency(shippingCost)}</span>
                                    )}
                                </div>
                                {(!formData.ciudad || !destinoCodigo) && (
                                    <p className="text-[11px] text-gray-400">
                                        * Selecciona tu ciudad para calcular el costo de envío
                                    </p>
                                )}
                            </div>

                            <div className="border-t mt-4 pt-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-black text-gray-900">Total a pagar</span>
                                    <span className="text-2xl font-black text-red-600">
                                        {formatCurrency(total)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
}
