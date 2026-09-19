'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Search,
    Plus,
    Minus,
    Trash2,
    DollarSign,
    Truck,
    CreditCard,
    Phone,
    User,
    MapPin,
    Building2,
    FileText,
    CheckCircle2,
    MessageCircle,
    Zap,
    AlertCircle,
    Package,
    Bookmark
} from 'lucide-react';
import { PRODUCTOS, Product, isDisallowedSize } from '@/lib/products';
import { formatCurrency, DEPARTAMENTOS, CIUDADES_POR_DEPARTAMENTO, calculateShipping } from '@/lib/checkout-utils';
import { OrderCustomer, OrderItem, Order } from '@/types/order';
import { createOrder, lookupCustomerByPhone, updateOrderStatus } from '@/lib/orders-service';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import citiesData from '@/lib/cities-99envios.json';
import { subscribeToAdminUsers } from '@/lib/users-service';
import { recordOrderTimingSession } from '@/lib/order-timing-service';

const ADVISORS = ['Karen', 'Katherine', 'Andrea', 'Diego', 'Laura', 'Camilo'];

function findDaneCode(dept: string, city: string): { codigo: string; nombre: string } {
    const cleanCity = (city || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
    const cleanDept = (dept || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

    if (cleanCity.includes('BOGOTA')) {
        return { codigo: '11001000', nombre: 'BOGOTA, DISTRITO CAPITAL' };
    }
    if (cleanCity.includes('SOACHA')) {
        return { codigo: '25754000', nombre: 'SOACHA' };
    }

    const entries = Object.values(citiesData as Record<string, { codigo: string; ciudad: string; departamento: string }>);
    
    const exact = entries.find(e => {
        const c = e.ciudad.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        const d = e.departamento.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        return c === cleanCity && (d.includes(cleanDept) || cleanDept.includes(d));
    });
    if (exact) return { codigo: exact.codigo, nombre: exact.ciudad };

    const partial = entries.find(e => {
        const c = e.ciudad.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        return c.includes(cleanCity) || cleanCity.includes(c);
    });
    if (partial) return { codigo: partial.codigo, nombre: partial.ciudad };

    return { codigo: '11001000', nombre: cleanCity || 'BOGOTA, DISTRITO CAPITAL' };
}

interface FastOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onOrderCreated?: (orderId: string) => void;
    initialAdvisorName?: string;
    draftOrder?: (Order & { id: string }) | null;
    preloadedCustomer?: {
        nombre?: string;
        celular?: string;
        cedula?: string;
        direccion?: string;
        ciudad?: string;
        departamento?: string;
        barrio?: string;
    };
}

export default function FastOrderModal({
    isOpen,
    onClose,
    onOrderCreated,
    initialAdvisorName,
    draftOrder,
    preloadedCustomer
}: FastOrderModalProps) {
    const { user, userProfile, role } = useAuth();

    // Advisor attribution & dynamic advisor list
    const isRestrictedAdvisor = role === 'asesor';
    const profileAdvisorName = userProfile?.asesorAsignado || userProfile?.nombre || initialAdvisorName || user?.displayName;
    const activeAdvisor = profileAdvisorName ? profileAdvisorName.trim() : 'Karen';

    const [selectedAdvisor, setSelectedAdvisor] = useState<string>(activeAdvisor);
    const [advisorsList, setAdvisorsList] = useState<string[]>(ADVISORS);
    const [salesChannel, setSalesChannel] = useState<'call_center' | 'whatsapp' | 'pos'>('call_center');

    // Customer fields
    const [celular, setCelular] = useState<string>('');
    const [nombre, setNombre] = useState<string>('');
    const [cedula, setCedula] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [departamento, setDepartamento] = useState<string>('Cundinamarca');
    const [ciudad, setCiudad] = useState<string>('Bogotá D.C.');
    const [direccion, setDireccion] = useState<string>('');
    const [barrio, setBarrio] = useState<string>('');
    const [notas, setNotas] = useState<string>('');

    // Customer search state
    const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
    const [customerFound, setCustomerFound] = useState<boolean | null>(null);

    // Products / Cart
    const [cartItems, setCartItems] = useState<OrderItem[]>([]);
    const [productSearch, setProductSearch] = useState<string>('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedSize, setSelectedSize] = useState<string>('3.8L');
    const [customItemPrice, setCustomItemPrice] = useState<number>(0);
    const [itemQty, setItemQty] = useState<number>(1);

    // Logistics & Payment
    const [flete, setFlete] = useState<number>(0);
    const [fleteManual, setFleteManual] = useState<boolean>(false);
    const [isQuotingShipping, setIsQuotingShipping] = useState<boolean>(false);
    const [shippingCarrier, setShippingCarrier] = useState<string>('');
    const [metodoPago, setMetodoPago] = useState<string>('contraentrega');

    // Submission states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [motivoBorrador, setMotivoBorrador] = useState<string>('Consulta con socio o familia');
    const [isDraftSaved, setIsDraftSaved] = useState<boolean>(false);

    // Telemetría de tiempos de toma de pedidos
    const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
    const [currentSessionId, setCurrentSessionId] = useState<string>('');
    const [sessionTimingLogged, setSessionTimingLogged] = useState<boolean>(false);

    useEffect(() => {
        if (isOpen) {
            const start = Date.now();
            setSessionStartTime(start);
            setCurrentSessionId(`${start}_${Math.random().toString(36).substring(2, 7)}`);
            setSessionTimingLogged(false);
        }
    }, [isOpen]);

    const handleSafeClose = () => {
        if (sessionStartTime && !sessionTimingLogged && !completedOrderId) {
            recordOrderTimingSession({
                sessionId: currentSessionId,
                advisorName: selectedAdvisor,
                advisorEmail: userProfile?.email || user?.email || `${selectedAdvisor.toLowerCase()}@biocambio360.com`,
                startTime: sessionStartTime,
                endTime: Date.now(),
                status: 'descartado',
                orderTotal: 0,
                itemsCount: cartItems.length,
                customerName: nombre || 'Consulta Descartada',
                channel: salesChannel
            });
            setSessionTimingLogged(true);
        }
        onClose();
    };

    // Cargar asesores desde Firestore en tiempo real
    useEffect(() => {
        const unsubscribe = subscribeToAdminUsers((users) => {
            const advisorNames = users
                .map(u => (u.asesorAsignado || u.nombre)?.trim())
                .filter(Boolean) as string[];

            setAdvisorsList(prev => Array.from(new Set([...ADVISORS, ...advisorNames])));
        });
        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, []);

    // Sincronizar asesor activo
    useEffect(() => {
        const activeName = userProfile?.asesorAsignado || userProfile?.nombre || initialAdvisorName || user?.displayName;
        if (activeName) {
            const clean = activeName.trim();
            setAdvisorsList(prev => Array.from(new Set([...prev, clean])));
            if (isRestrictedAdvisor || selectedAdvisor === 'Karen' || !selectedAdvisor) {
                setSelectedAdvisor(clean);
            }
        }
    }, [initialAdvisorName, isRestrictedAdvisor, userProfile, user]);

    // Handle preloaded customer if passed
    useEffect(() => {
        if (preloadedCustomer) {
            if (preloadedCustomer.celular) setCelular(preloadedCustomer.celular);
            if (preloadedCustomer.nombre) setNombre(preloadedCustomer.nombre);
            if (preloadedCustomer.cedula) setCedula(preloadedCustomer.cedula);
            if (preloadedCustomer.direccion) setDireccion(preloadedCustomer.direccion);
            if (preloadedCustomer.departamento) setDepartamento(preloadedCustomer.departamento);
            if (preloadedCustomer.ciudad) setCiudad(preloadedCustomer.ciudad);
            if (preloadedCustomer.barrio) setBarrio(preloadedCustomer.barrio);
            setCustomerFound(true);
        }
    }, [preloadedCustomer]);

    // Handle draft order preload if editing or resuming
    useEffect(() => {
        if (draftOrder) {
            if (draftOrder.cliente?.celular) setCelular(draftOrder.cliente.celular);
            if (draftOrder.cliente?.nombre) setNombre(draftOrder.cliente.nombre);
            if (draftOrder.cliente?.cedula) setCedula(draftOrder.cliente.cedula);
            if (draftOrder.cliente?.email) setEmail(draftOrder.cliente.email);
            if (draftOrder.cliente?.direccion) setDireccion(draftOrder.cliente.direccion);
            if (draftOrder.cliente?.barrio) setBarrio(draftOrder.cliente.barrio);
            if (draftOrder.cliente?.departamento) setDepartamento(draftOrder.cliente.departamento);
            if (draftOrder.cliente?.ciudad) setCiudad(draftOrder.cliente.ciudad);
            if (draftOrder.cliente?.notas) setNotas(draftOrder.cliente.notas);
            if (draftOrder.productos && draftOrder.productos.length > 0) {
                setCartItems(draftOrder.productos);
            }
            if (typeof draftOrder.envio === 'number') {
                setFlete(draftOrder.envio);
                setFleteManual(true);
            }
            if (draftOrder.metodoPago) setMetodoPago(draftOrder.metodoPago);
            if (draftOrder.asesorNombre) setSelectedAdvisor(draftOrder.asesorNombre);
            if (draftOrder.canal) setSalesChannel(draftOrder.canal as any);
            if (draftOrder.motivoBorrador) setMotivoBorrador(draftOrder.motivoBorrador);
            setCustomerFound(true);
        }
    }, [draftOrder]);

    // Available cities based on department
    const availableCities = useMemo(() => {
        return CIUDADES_POR_DEPARTAMENTO[departamento] || ['Bogotá D.C.'];
    }, [departamento]);

    // Cotizar flete en vivo con 99 Envíos cada vez que cambia ciudad, departamento o carrito
    useEffect(() => {
        if (fleteManual) return;

        if (cartItems.length === 0) {
            setFlete(0);
            setShippingCarrier('');
            return;
        }

        let cancelled = false;
        setIsQuotingShipping(true);

        const timer = setTimeout(() => {
            const dane = findDaneCode(departamento, ciudad);
            const currentSubtotal = cartItems.reduce((acc, it) => acc + (it.price * it.cantidad), 0);

            fetch('/api/envios/cotizar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    destinoCodigo: dane.codigo,
                    destinoNombre: dane.nombre,
                    subtotal: currentSubtotal,
                    aplicaContrapago: metodoPago === 'contraentrega',
                    items: cartItems.map(it => ({
                        productId: it.product.id,
                        nombre: it.product.nombre,
                        size: it.size,
                        cantidad: it.cantidad,
                    })),
                    itemsSizes: cartItems.map(it => ({ size: it.size, cantidad: it.cantidad }))
                })
            })
                .then(r => r.json())
                .then(data => {
                    if (cancelled) return;
                    if (data.gratis) {
                        setFlete(0);
                        setShippingCarrier(data.transportadora || 'Biocambio360 (Local)');
                    } else if (typeof data.precio === 'number') {
                        setFlete(data.precio);
                        setShippingCarrier(data.transportadora || '99 Envíos');
                    } else {
                        const fallbackCost = calculateShipping(departamento, ciudad);
                        setFlete(fallbackCost);
                        setShippingCarrier('99 Envíos');
                    }
                })
                .catch(err => {
                    if (cancelled) return;
                    console.warn('[FastOrderModal] Fallback flete 99 Envíos:', err);
                    const fallbackCost = calculateShipping(departamento, ciudad);
                    setFlete(fallbackCost);
                    setShippingCarrier('Tarifa Estándar');
                })
                .finally(() => {
                    if (!cancelled) setIsQuotingShipping(false);
                });
        }, 300);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [departamento, ciudad, cartItems, metodoPago, fleteManual]);

    // Fast customer lookup by phone
    const handlePhoneChange = async (val: string) => {
        setCelular(val);
        const clean = val.replace(/\D/g, '');
        if (clean.length === 10) {
            setIsSearchingCustomer(true);
            try {
                const prev = await lookupCustomerByPhone(clean);
                if (prev) {
                    if (prev.nombre) setNombre(prev.nombre);
                    if (prev.cedula) setCedula(prev.cedula);
                    if (prev.email) setEmail(prev.email);
                    if (prev.direccion) setDireccion(prev.direccion);
                    if (prev.barrio) setBarrio(prev.barrio || '');
                    if (prev.departamento) setDepartamento(prev.departamento);
                    if (prev.ciudad) setCiudad(prev.ciudad);
                    setCustomerFound(true);
                } else {
                    setCustomerFound(false);
                }
            } finally {
                setIsSearchingCustomer(false);
            }
        } else {
            setCustomerFound(null);
        }
    };

    // Filtered products for catalog search
    const filteredProducts = useMemo(() => {
        if (!productSearch.trim()) return PRODUCTOS.slice(0, 8);
        const q = productSearch.toLowerCase();
        return PRODUCTOS.filter(p =>
            p.nombre.toLowerCase().includes(q) ||
            p.id.toLowerCase().includes(q) ||
            p.categoria?.toLowerCase().includes(q)
        ).slice(0, 10);
    }, [productSearch]);

    // Update selected product and default price
    const handleSelectProduct = (prod: Product) => {
        setSelectedProduct(prod);
        const availableSizes = Object.keys(prod.precios || {}).filter(s => !isDisallowedSize(s));
        const defaultSize = availableSizes.includes('3.8L') ? '3.8L' : (availableSizes[0] || '1/2G');
        setSelectedSize(defaultSize);
        setCustomItemPrice(prod.precios?.[defaultSize] || 0);
        setItemQty(1);
    };

    // Update price when size changes
    const handleSizeChange = (size: string) => {
        setSelectedSize(size);
        if (selectedProduct?.precios?.[size]) {
            setCustomItemPrice(selectedProduct.precios[size]);
        }
    };

    // Add product to cart
    const handleAddToCart = () => {
        if (!selectedProduct) return;
        const newItem: OrderItem = {
            product: {
                id: selectedProduct.id,
                nombre: selectedProduct.nombre,
                imgFile: selectedProduct.imgFile
            },
            size: selectedSize,
            cantidad: itemQty,
            price: customItemPrice
        };

        setCartItems(prev => [...prev, newItem]);
        setSelectedProduct(null);
        setProductSearch('');
    };

    const handleRemoveItem = (index: number) => {
        setCartItems(prev => prev.filter((_, i) => i !== index));
    };

    // Totals
    const subtotal = useMemo(() => {
        return cartItems.reduce((acc, it) => acc + (it.price * it.cantidad), 0);
    }, [cartItems]);

    const total = subtotal + flete;

    const handleManualFleteEdit = () => {
        const input = window.prompt(
            'Ingresa el valor del flete en COP (Escribe 0 para flete gratis):',
            flete.toString()
        );
        if (input !== null) {
            const cleanNum = parseInt(input.replace(/\D/g, ''), 10);
            if (!isNaN(cleanNum)) {
                setFlete(cleanNum);
                setFleteManual(true);
                setShippingCarrier('Manual');
            }
        }
    };

    // Submit draft order (cotización caliente sin descontar inventario)
    const handleSaveDraft = async () => {
        setErrorMsg(null);

        if (cartItems.length === 0) {
            setErrorMsg('Debes agregar al menos un producto a la cotización.');
            return;
        }

        if (!nombre.trim() || !celular.trim()) {
            setErrorMsg('Ingresa al menos el nombre y teléfono del cliente para guardar el borrador.');
            return;
        }

        setIsSubmitting(true);
        try {
            const customerData: OrderCustomer = {
                nombre: nombre.trim(),
                cedula: cedula.trim() || 'No registrada',
                celular: celular.trim(),
                email: email.trim() || undefined,
                departamento,
                ciudad,
                direccion: direccion.trim() || 'Dirección por confirmar',
                barrio: barrio.trim() || undefined,
                notas: notas.trim() || undefined
            };

            let orderId = '';
            if (draftOrder?.id) {
                // Actualizar borrador existente
                const orderRef = doc(db, 'orders', draftOrder.id);
                await updateDoc(orderRef, {
                    cliente: customerData,
                    productos: cartItems,
                    subtotal,
                    envio: flete,
                    total,
                    metodoPago,
                    canal: salesChannel,
                    asesorNombre: selectedAdvisor,
                    asesorEmail: userProfile?.email || user?.email || `${selectedAdvisor.toLowerCase()}@biocambio360.com`,
                    motivoBorrador,
                    updatedAt: Timestamp.now()
                });
                orderId = draftOrder.id;
            } else {
                // Crear nuevo borrador
                const orderPayload: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'timeline'> = {
                    cliente: customerData,
                    productos: cartItems,
                    subtotal,
                    envio: flete,
                    total,
                    metodoPago,
                    status: 'borrador', // NO descuenta inventario
                    canal: salesChannel,
                    asesorNombre: selectedAdvisor,
                    asesorEmail: userProfile?.email || user?.email || `${selectedAdvisor.toLowerCase()}@biocambio360.com`,
                    asesorId: user?.uid || selectedAdvisor,
                    motivoBorrador,
                    notas: notas ? [notas] : []
                };

                orderId = await createOrder(orderPayload);
            }

            // Registrar telemetría de tiempo de toma de pedido
            if (sessionStartTime && !sessionTimingLogged) {
                recordOrderTimingSession({
                    sessionId: currentSessionId,
                    advisorName: selectedAdvisor,
                    advisorEmail: userProfile?.email || user?.email || `${selectedAdvisor.toLowerCase()}@biocambio360.com`,
                    startTime: sessionStartTime,
                    endTime: Date.now(),
                    status: 'borrador',
                    orderId,
                    orderTotal: total,
                    itemsCount: cartItems.length,
                    customerName: nombre || 'Cliente',
                    channel: salesChannel
                });
                setSessionTimingLogged(true);
            }

            setCompletedOrderId(orderId);
            setIsDraftSaved(true);
            if (onOrderCreated) {
                onOrderCreated(orderId);
            }
        } catch (err: any) {
            console.error('Error guardando borrador:', err);
            setErrorMsg(err.message || 'Error al guardar la cotización. Intenta nuevamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Submit order (cierre activo y confirmado con descuento de inventario)
    const handleSubmitOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (cartItems.length === 0) {
            setErrorMsg('Debes agregar al menos un producto al pedido.');
            return;
        }

        if (!nombre.trim() || !celular.trim() || !direccion.trim()) {
            setErrorMsg('Por favor completa el nombre, teléfono y dirección del cliente para confirmar el despacho.');
            return;
        }

        setIsSubmitting(true);
        try {
            const customerData: OrderCustomer = {
                nombre: nombre.trim(),
                cedula: cedula.trim() || 'No registrada',
                celular: celular.trim(),
                email: email.trim() || undefined,
                departamento,
                ciudad,
                direccion: direccion.trim(),
                barrio: barrio.trim() || undefined,
                notas: notas.trim() || undefined
            };

            let orderId = '';
            if (draftOrder?.id) {
                // Actualizar y activar borrador a confirmado
                const orderRef = doc(db, 'orders', draftOrder.id);
                await updateDoc(orderRef, {
                    cliente: customerData,
                    productos: cartItems,
                    subtotal,
                    envio: flete,
                    total,
                    metodoPago,
                    canal: salesChannel,
                    asesorNombre: selectedAdvisor,
                    asesorEmail: userProfile?.email || user?.email || `${selectedAdvisor.toLowerCase()}@biocambio360.com`,
                    updatedAt: Timestamp.now()
                });
                await updateOrderStatus(
                    draftOrder.id,
                    'confirmado',
                    'Borrador/Cotización cerrado exitosamente por asesor comercial',
                    {
                        email: userProfile?.email || user?.email || undefined,
                        nombre: selectedAdvisor,
                        role: role || 'asesor'
                    }
                );
                orderId = draftOrder.id;
            } else {
                const orderPayload: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'timeline'> = {
                    cliente: customerData,
                    productos: cartItems,
                    subtotal,
                    envio: flete,
                    total,
                    metodoPago,
                    status: 'confirmado', // Pedidos directos de llamada entran confirmados listos para bodega
                    canal: salesChannel,
                    asesorNombre: selectedAdvisor,
                    asesorEmail: userProfile?.email || user?.email || `${selectedAdvisor.toLowerCase()}@biocambio360.com`,
                    asesorId: user?.uid || selectedAdvisor,
                    notas: notas ? [notas] : []
                };

                orderId = await createOrder(orderPayload);
            }

            // Registrar telemetría de tiempo de toma de pedido
            if (sessionStartTime && !sessionTimingLogged) {
                recordOrderTimingSession({
                    sessionId: currentSessionId,
                    advisorName: selectedAdvisor,
                    advisorEmail: userProfile?.email || user?.email || `${selectedAdvisor.toLowerCase()}@biocambio360.com`,
                    startTime: sessionStartTime,
                    endTime: Date.now(),
                    status: 'guardado',
                    orderId,
                    orderTotal: total,
                    itemsCount: cartItems.length,
                    customerName: nombre || 'Cliente',
                    channel: salesChannel
                });
                setSessionTimingLogged(true);
            }

            setCompletedOrderId(orderId);
            setIsDraftSaved(false);
            if (onOrderCreated) {
                onOrderCreated(orderId);
            }
        } catch (err: any) {
            console.error('Error creando pedido rápido:', err);
            setErrorMsg(err.message || 'Error al guardar el pedido. Intenta nuevamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // WhatsApp Message trigger
    const getWhatsAppUrl = () => {
        if (!completedOrderId) return '';
        const cleanPhone = celular.replace(/\D/g, '');
        const itemsList = cartItems
            .map(it => `• ${it.cantidad}x ${it.product.nombre} (${it.size}) - ${formatCurrency(it.price * it.cantidad)}`)
            .join('\n');

        if (isDraftSaved) {
            const text = `Hola *${nombre}*, te saluda *${selectedAdvisor}* de *Biocambio360* 🌿\n\nTe comparto la cotización que preparamos para ti:\n\n*Cotización N°:* #${completedOrderId.slice(-8)}\n${itemsList}\n\n*Envío:* ${flete === 0 ? '¡GRATIS!' : formatCurrency(flete)}\n*Total Cotización:* ${formatCurrency(total)}\n*Método de Pago sugerido:* ${metodoPago.toUpperCase()}\n*Destino:* ${ciudad} (${departamento})\n\n¿Te gustaría que te lo despachemos hoy mismo? Quedo muy atento(a) para confirmar la entrega.`;
            return `https://wa.me/57${cleanPhone}?text=${encodeURIComponent(text)}`;
        }

        const text = `Hola *${nombre}*, te saluda *${selectedAdvisor}* de *Biocambio360* 🌿\n\nConfirmamos tu pedido *#${completedOrderId.slice(-8)}*:\n${itemsList}\n\n*Envío:* ${flete === 0 ? '¡GRATIS!' : formatCurrency(flete)}\n*Total a Pagar:* ${formatCurrency(total)}\n*Método de Pago:* ${metodoPago.toUpperCase()}\n*Dirección de Entrega:* ${direccion}, ${barrio ? barrio + ', ' : ''}${ciudad} (${departamento}).\n\nTu pedido ya entró a alistamiento en bodega. ¡Muchas gracias por preferir la química sostenible!`;

        return `https://wa.me/57${cleanPhone}?text=${encodeURIComponent(text)}`;
    };

    const handleResetAndNew = () => {
        setCartItems([]);
        setCelular('');
        setNombre('');
        setCedula('');
        setEmail('');
        setDireccion('');
        setBarrio('');
        setNotas('');
        setCustomerFound(null);
        setCompletedOrderId(null);
        setIsDraftSaved(false);
        setErrorMsg(null);
        setProductSearch('');
        setSelectedProduct(null);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
                >
                    {/* Header */}
                    <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-xs">
                                <Zap size={20} className="text-amber-400" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-black tracking-wide">
                                        {draftOrder?.id ? 'Retomar & Cerrar Cotización' : 'Nuevo Pedido Rápido'}
                                    </h2>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                        draftOrder?.id 
                                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    }`}>
                                        {draftOrder?.id ? 'Modo Cotización' : 'Fast Entry'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400">
                                    Cierre en caliente por Call Center o WhatsApp · Inventario y comisiones en tiempo real
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleSafeClose}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
                        {completedOrderId ? (
                            /* Success View */
                            <div className="py-10 text-center space-y-5 max-w-md mx-auto">
                                <div className={`w-16 h-16 ${isDraftSaved ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'} rounded-2xl flex items-center justify-center mx-auto shadow-inner`}>
                                    {isDraftSaved ? <Bookmark size={36} /> : <CheckCircle2 size={36} />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900">
                                        {isDraftSaved ? '¡Cotización Guardada como Borrador!' : '¡Pedido Registrado con Éxito!'}
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {isDraftSaved ? 'Cotización' : 'Orden'} <span className="font-mono font-bold text-slate-800">#{completedOrderId}</span> asignada a <span className="font-bold text-indigo-600">{selectedAdvisor}</span>
                                    </p>
                                    {isDraftSaved ? (
                                        <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 text-left">
                                            <strong>📌 Estado Operativo:</strong><br />
                                            • El inventario en bodega <strong>NO</strong> ha sido descontado.<br />
                                            • Motivo registrado: <em>"{motivoBorrador}"</em>.<br />
                                            • Esta cotización está disponible en tu Cockpit para retomarla y cerrarla en 1 clic.
                                        </div>
                                    ) : (
                                        <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800">
                                            ✓ Inventario descontado automáticamente en bodega<br />
                                            ✓ Notificación de seguimiento y tracking enviada al cliente<br />
                                            ✓ Métricas de venta y comisiones actualizadas al instante
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-3 pt-2">
                                    <a
                                        href={getWhatsAppUrl()}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`w-full py-3 px-4 ${isDraftSaved ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all`}
                                    >
                                        <MessageCircle size={18} />
                                        <span>{isDraftSaved ? '📱 Enviar Cotización Formal al WhatsApp' : '📱 Enviar Resumen al WhatsApp del Cliente'}</span>
                                    </a>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleResetAndNew}
                                            className="flex-1 py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all"
                                        >
                                            + Nuevo Registro
                                        </button>
                                        <button
                                            onClick={handleSafeClose}
                                            className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                                        >
                                            Cerrar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Fast Entry Form */
                            <form onSubmit={handleSubmitOrder} className="space-y-6">
                                {errorMsg && (
                                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-semibold">
                                        <AlertCircle size={16} className="shrink-0" />
                                        <span>{errorMsg}</span>
                                    </div>
                                )}

                                {/* Barra de Asignación Comercial y Canal */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                                    {/* Asesor */}
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                            <User size={12} /> Asesor Responsable
                                        </label>
                                        <select
                                            disabled={isRestrictedAdvisor}
                                            value={selectedAdvisor}
                                            onChange={(e) => setSelectedAdvisor(e.target.value)}
                                            className="mt-1 w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 disabled:opacity-75"
                                        >
                                            {advisorsList.map(adv => (
                                                <option key={adv} value={adv}>{adv}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Canal */}
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                            <Phone size={12} /> Canal de Venta
                                        </label>
                                        <select
                                            value={salesChannel}
                                            onChange={(e) => setSalesChannel(e.target.value as any)}
                                            className="mt-1 w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                                        >
                                            <option value="call_center">📞 Call Center (Llamada)</option>
                                            <option value="whatsapp">💬 WhatsApp Chat</option>
                                            <option value="pos">🏪 Punto de Venta / Mostrador</option>
                                        </select>
                                    </div>

                                    {/* Medio de Pago */}
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                            <CreditCard size={12} /> Método de Pago
                                        </label>
                                        <select
                                            value={metodoPago}
                                            onChange={(e) => setMetodoPago(e.target.value)}
                                            className="mt-1 w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                                        >
                                            <option value="contraentrega">💵 Contraentrega (Efectivo)</option>
                                            <option value="transferencia">🏦 Transferencia Bancolombia / Nequi</option>
                                            <option value="wompi">💳 Link Wompi (Tarjeta / PSE)</option>
                                            <option value="addi">⚡ Addi (Crédito)</option>
                                            <option value="efectivo_pos">🪙 Efectivo en Mostrador (POS)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Paso 1: Datos del Cliente con Autocompletado Predictivo */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
                                            <User size={14} className="text-indigo-600" />
                                            1. Datos del Cliente & Envío
                                        </h3>
                                        {customerFound === true && (
                                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-200">
                                                <CheckCircle2 size={12} /> Cliente Reconocido (Autocompletado)
                                            </span>
                                        )}
                                        {customerFound === false && (
                                            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                                Cliente Nuevo
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                        {/* Celular / WhatsApp */}
                                        <div className="sm:col-span-1 md:col-span-2">
                                            <label className="text-[11px] font-bold text-slate-600">
                                                Teléfono / WhatsApp <span className="text-rose-500">*</span>
                                            </label>
                                            <div className="relative mt-1">
                                                <input
                                                    type="tel"
                                                    required
                                                    placeholder="Ej: 3123456789"
                                                    value={celular}
                                                    onChange={(e) => handlePhoneChange(e.target.value)}
                                                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                                                />
                                                <Phone size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                                                {isSearchingCustomer && (
                                                    <span className="absolute right-2.5 top-2 text-[10px] text-indigo-600 font-bold animate-pulse">
                                                        Buscando...
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Nombre */}
                                        <div className="sm:col-span-1 md:col-span-2">
                                            <label className="text-[11px] font-bold text-slate-600">
                                                Nombre Completo <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Ej: Claudia Rodríguez"
                                                value={nombre}
                                                onChange={(e) => setNombre(e.target.value)}
                                                className="mt-1 w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                                            />
                                        </div>

                                        {/* Cédula / NIT */}
                                        <div>
                                            <label className="text-[11px] font-bold text-slate-600">
                                                Cédula / NIT
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="C.C. o NIT"
                                                value={cedula}
                                                onChange={(e) => setCedula(e.target.value)}
                                                className="mt-1 w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                                            />
                                        </div>

                                        {/* Departamento */}
                                        <div>
                                            <label className="text-[11px] font-bold text-slate-600">
                                                Departamento
                                            </label>
                                            <select
                                                value={departamento}
                                                onChange={(e) => {
                                                    setDepartamento(e.target.value);
                                                    const cities = CIUDADES_POR_DEPARTAMENTO[e.target.value] || [];
                                                    setCiudad(cities[0] || 'Bogotá D.C.');
                                                }}
                                                className="mt-1 w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden"
                                            >
                                                {DEPARTAMENTOS.map(dep => (
                                                    <option key={dep} value={dep}>{dep}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Ciudad */}
                                        <div>
                                            <label className="text-[11px] font-bold text-slate-600">
                                                Ciudad / Municipio
                                            </label>
                                            <select
                                                value={ciudad}
                                                onChange={(e) => setCiudad(e.target.value)}
                                                className="mt-1 w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden"
                                            >
                                                {availableCities.map(c => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Barrio / Localidad */}
                                        <div>
                                            <label className="text-[11px] font-bold text-slate-600">
                                                Barrio / Localidad
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Ej: Kennedy / San Mateo"
                                                value={barrio}
                                                onChange={(e) => setBarrio(e.target.value)}
                                                className="mt-1 w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden"
                                            />
                                        </div>

                                        {/* Dirección Completa */}
                                        <div className="sm:col-span-2 md:col-span-3">
                                            <label className="text-[11px] font-bold text-slate-600">
                                                Dirección Completa de Entrega <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Ej: Calle 45 Sur # 78 - 20 Apto 302 Torre 4"
                                                value={direccion}
                                                onChange={(e) => setDireccion(e.target.value)}
                                                className="mt-1 w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                                            />
                                        </div>

                                        {/* Observaciones de Entrega */}
                                        <div className="sm:col-span-2 md:col-span-1">
                                            <label className="text-[11px] font-bold text-slate-600">
                                                Notas de Entrega
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Ej: Dejar en portería"
                                                value={notas}
                                                onChange={(e) => setNotas(e.target.value)}
                                                className="mt-1 w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Paso 2: Selección de Productos del Catálogo */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                                    <h3 className="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
                                        <Package size={14} className="text-indigo-600" />
                                        2. Seleccionar Productos & Presentaciones
                                    </h3>

                                    {/* Selector / Buscador */}
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Buscar producto por nombre o SKU (Ej: Detergente, Suavizante, Desengrasante)..."
                                                value={productSearch}
                                                onChange={(e) => setProductSearch(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden"
                                            />
                                            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                                        </div>

                                        {/* Quick Pick Chips */}
                                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-slate-50/50 rounded-xl border border-slate-100">
                                            {filteredProducts.map(p => (
                                                <button
                                                    type="button"
                                                    key={p.id}
                                                    onClick={() => handleSelectProduct(p)}
                                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                                        selectedProduct?.id === p.id
                                                            ? 'bg-indigo-600 text-white shadow-xs'
                                                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    {p.nombre}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Panel de Configuración del Producto Seleccionado */}
                                        {selectedProduct && (
                                            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span className="text-xs font-black text-indigo-950">
                                                            {selectedProduct.nombre}
                                                        </span>
                                                        <span className="ml-2 text-[10px] text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full font-bold">
                                                            {selectedProduct.categoria}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedProduct(null)}
                                                        className="text-xs text-slate-400 hover:text-slate-600"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                                                    {/* Chips de Tamaño */}
                                                    <div className="sm:col-span-2">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase">
                                                            Presentación / Tamaño
                                                        </label>
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {Object.keys(selectedProduct.precios || {})
                                                                .filter(s => !isDisallowedSize(s))
                                                                .map(size => (
                                                                    <button
                                                                        type="button"
                                                                        key={size}
                                                                        onClick={() => handleSizeChange(size)}
                                                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                                                            selectedSize === size
                                                                                ? 'bg-indigo-600 text-white shadow-xs'
                                                                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                                                        }`}
                                                                    >
                                                                        {size} ({formatCurrency(selectedProduct.precios[size] || 0)})
                                                                    </button>
                                                                ))}
                                                        </div>
                                                    </div>

                                                    {/* Precio Unitario Configurable */}
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase">
                                                            Precio Unitario ($)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={customItemPrice}
                                                            onChange={(e) => setCustomItemPrice(Number(e.target.value))}
                                                            className="mt-1 w-full px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                                                        />
                                                    </div>

                                                    {/* Cantidad & Agregar */}
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden">
                                                            <button
                                                                type="button"
                                                                onClick={() => setItemQty(Math.max(1, itemQty - 1))}
                                                                className="px-2 py-1 text-slate-600 hover:bg-slate-100 text-xs font-bold"
                                                            >
                                                                -
                                                            </button>
                                                            <span className="px-2.5 py-1 text-xs font-black text-slate-900">
                                                                {itemQty}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setItemQty(itemQty + 1)}
                                                                className="px-2 py-1 text-slate-600 hover:bg-slate-100 text-xs font-bold"
                                                            >
                                                                +
                                                            </button>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={handleAddToCart}
                                                            className="flex-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black shadow-xs transition-colors cursor-pointer"
                                                        >
                                                            + Agregar
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Tabla / Lista de Items en el Pedido */}
                                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                                        <div className="bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-600 grid grid-cols-12">
                                            <span className="col-span-6">Producto & Tamaño</span>
                                            <span className="col-span-2 text-center">Cant</span>
                                            <span className="col-span-3 text-right">Subtotal</span>
                                            <span className="col-span-1 text-center"></span>
                                        </div>

                                        <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                                            {cartItems.map((item, idx) => (
                                                <div key={idx} className="px-3 py-2 text-xs grid grid-cols-12 items-center hover:bg-slate-50">
                                                    <div className="col-span-6">
                                                        <span className="font-bold text-slate-900">{item.product.nombre}</span>
                                                        <span className="ml-1.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                                                            {item.size}
                                                        </span>
                                                        <p className="text-[10px] text-slate-400">
                                                            {formatCurrency(item.price)} c/u
                                                        </p>
                                                    </div>
                                                    <span className="col-span-2 text-center font-bold text-slate-700">
                                                        {item.cantidad}
                                                    </span>
                                                    <span className="col-span-3 text-right font-black text-slate-900">
                                                        {formatCurrency(item.price * item.cantidad)}
                                                    </span>
                                                    <div className="col-span-1 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveItem(idx)}
                                                            className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}

                                            {cartItems.length === 0 && (
                                                <div className="py-6 text-center text-xs text-slate-400 italic">
                                                    No hay productos agregados al pedido todavía.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Franja para Borradores / Cotizaciones en Frío o Dudas del Cliente */}
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                                            <Bookmark size={16} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-amber-900">
                                                ¿El cliente aún no decide comprar o solicitó cotización para luego?
                                            </p>
                                            <p className="text-[11px] text-amber-700">
                                                Guarda los datos sin descontar stock para retomar y cerrar la venta después.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <select
                                            value={motivoBorrador}
                                            onChange={(e) => setMotivoBorrador(e.target.value)}
                                            className="px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden"
                                        >
                                            <option value="Consulta con socio o familia">Consulta con socio / pareja</option>
                                            <option value="Esperando quincena o pago">Espera fecha de pago / quincena</option>
                                            <option value="Pidió cotización formal por WhatsApp">Pidió cotización WhatsApp</option>
                                            <option value="Comparando precios en mercado">Comparando con competencia</option>
                                            <option value="Faltan datos de dirección">Faltan datos de entrega</option>
                                            <option value="Llamará más tarde">Llamará más tarde</option>
                                            <option value="Otro motivo comercial">Otro motivo</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Resumen Financiero y Botones de Acción */}
                                <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-6">
                                        <div>
                                            <span className="text-[10px] text-slate-400 uppercase font-bold">Subtotal Productos</span>
                                            <p className="text-base font-black text-slate-200">
                                                {formatCurrency(subtotal)}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Flete 99 Envíos</span>
                                                    {isQuotingShipping && (
                                                        <span className="text-[10px] text-amber-300 animate-pulse font-mono font-bold">
                                                             ⚡ Cotizando...
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-baseline gap-1.5">
                                                    <p className="text-base font-black text-amber-400">
                                                        {flete === 0 ? '¡GRATIS!' : formatCurrency(flete)}
                                                    </p>
                                                    {shippingCarrier && !isQuotingShipping && (
                                                        <span className="text-[10px] text-slate-400 font-medium truncate max-w-[130px]" title={shippingCarrier}>
                                                            ({shippingCarrier})
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <button
                                                    type="button"
                                                    onClick={handleManualFleteEdit}
                                                    className="text-[10px] text-indigo-300 underline hover:text-white cursor-pointer"
                                                    title="Editar valor manual de flete"
                                                >
                                                    Editar
                                                </button>
                                                {fleteManual && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setFleteManual(false)}
                                                        className="text-[9px] text-emerald-400 hover:underline cursor-pointer font-bold"
                                                        title="Volver a cotización automática con 99 Envíos"
                                                    >
                                                        Auto
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="border-l border-slate-700 pl-6">
                                            <span className="text-[10px] text-emerald-400 uppercase font-black">Total a Cobrar</span>
                                            <p className="text-2xl font-black text-white">
                                                {formatCurrency(total)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2.5 flex-wrap justify-end">
                                        <button
                                            type="button"
                                            onClick={handleSafeClose}
                                            className="px-3 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
                                        >
                                            Cancelar
                                        </button>

                                        <button
                                            type="button"
                                            disabled={isSubmitting || cartItems.length === 0}
                                            onClick={handleSaveDraft}
                                            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                            title="Guardar como cotización/borrador sin descontar inventario"
                                        >
                                            <Bookmark size={14} />
                                            <span>{draftOrder?.id ? 'Actualizar Borrador' : 'Guardar Borrador'}</span>
                                        </button>

                                        <button
                                            type="submit"
                                            disabled={isSubmitting || cartItems.length === 0}
                                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 cursor-pointer"
                                        >
                                            {isSubmitting ? (
                                                <span>Guardando...</span>
                                            ) : (
                                                <>
                                                    <CheckCircle2 size={16} />
                                                    <span>{draftOrder?.id ? 'Confirmar y Despachar' : 'Guardar Pedido'}</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
