'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingCart,
    ShoppingBag,
    ArrowLeft,
    Mail,
    MessageCircle,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Search,
    Filter,
    ExternalLink,
    Copy,
    Check,
    Send,
    RefreshCw,
    User,
    MapPin,
    Phone,
    DollarSign,
    TrendingUp,
    Package,
    ChevronRight,
    X,
    Eye,
    MousePointerClick,
    MailOpen
} from 'lucide-react';
import { db } from '@/lib/firebase';
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';
import { AbandonedCartRecord, AbandonedCartItem } from '@/lib/abandoned-cart-service';
import { formatCurrency } from '@/lib/checkout-utils';

export default function CarritosAbandonadosPage() {
    const router = useRouter();
    const [carts, setCarts] = useState<AbandonedCartRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'abandoned' | 'recovered'>('all');
    const [selectedCart, setSelectedCart] = useState<AbandonedCartRecord | null>(null);
    const [copiedToken, setCopiedToken] = useState<string | null>(null);
    const [sendingEmailToken, setSendingEmailToken] = useState<string | null>(null);
    const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        const cartsRef = collection(db, 'abandoned_carts');
        const q = query(cartsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const fetched: AbandonedCartRecord[] = [];
                snapshot.forEach((docSnap) => {
                    fetched.push(docSnap.data() as AbandonedCartRecord);
                });
                setCarts(fetched);
                setLoading(false);
            },
            (err) => {
                console.error('[Admin/CarritosAbandonados] Error fetching carts:', err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    // Filter carts
    const filteredCarts = carts.filter((c) => {
        // Status filter
        if (statusFilter === 'abandoned' && c.status !== 'abandoned') return false;
        if (statusFilter === 'recovered' && c.status !== 'recovered') return false;

        // Search term
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        const nameMatch = (c.customerName || '').toLowerCase().includes(term);
        const emailMatch = (c.customerEmail || '').toLowerCase().includes(term);
        const phoneMatch = (c.customerPhone || '').toLowerCase().includes(term);
        const cityMatch = (c.ciudad || '').toLowerCase().includes(term);
        const productMatch = c.items?.some((i) => (i.nombre || '').toLowerCase().includes(term));

        return nameMatch || emailMatch || phoneMatch || cityMatch || productMatch;
    });

    // Metrics
    const totalCartsCount = carts.length;
    const abandonedCarts = carts.filter((c) => c.status === 'abandoned');
    const recoveredCarts = carts.filter((c) => c.status === 'recovered');

    const totalLostValue = abandonedCarts.reduce((sum, c) => sum + (c.total || 0), 0);
    const totalRecoveredValue = recoveredCarts.reduce((sum, c) => sum + (c.total || 0), 0);
    const recoveryRate = totalCartsCount > 0 ? Math.round((recoveredCarts.length / totalCartsCount) * 100) : 0;

    // Tracking Metrics
    const notifiedCarts = carts.filter((c) => (c.notificationCount || 0) > 0);
    const openedCarts = carts.filter((c) => (c.openCount || 0) > 0 || !!c.openedAt);
    const clickedCarts = carts.filter((c) => (c.clickCount || 0) > 0 || !!c.clickedAt);

    const openRate = notifiedCarts.length > 0 ? Math.round((openedCarts.length / notifiedCarts.length) * 100) : 0;
    const clickRate = openedCarts.length > 0 ? Math.round((clickedCarts.length / openedCarts.length) * 100) : 0;

    const safeToDate = (timestamp: any): Date => {
        if (!timestamp) return new Date();
        if (typeof timestamp.toDate === 'function') return timestamp.toDate();
        if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
        if (typeof timestamp === 'string' || typeof timestamp === 'number') return new Date(timestamp);
        return new Date();
    };

    const formatDate = (timestamp: any) => {
        const date = safeToDate(timestamp);
        return date.toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getTimeAgo = (timestamp: any) => {
        const date = safeToDate(timestamp);
        const diffMs = Date.now() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs / (1000 * 60)) % 60);

        if (diffHours < 1) return `Hace ${diffMins} min`;
        if (diffHours < 24) return `Hace ${diffHours} h`;
        const diffDays = Math.floor(diffHours / 24);
        return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
    };

    const handleCopyRecoveryUrl = (cartToken: string) => {
        const url = `https://www.biocambio360.com/checkout?recovery_token=${cartToken}`;
        navigator.clipboard.writeText(url);
        setCopiedToken(cartToken);
        setTimeout(() => setCopiedToken(null), 3000);
    };

    const handleWhatsAppRecovery = (cart: AbandonedCartRecord) => {
        if (!cart.customerPhone) {
            alert('Este carrito no tiene teléfono de contacto registrado.');
            return;
        }

        const phoneDigits = cart.customerPhone.replace(/\D/g, '');
        const formattedPhone = phoneDigits.length === 10 ? `57${phoneDigits}` : phoneDigits;
        const recoveryUrl = `https://www.biocambio360.com/checkout?recovery_token=${cart.cartToken}`;
        const customerName = cart.customerName || 'Hola';
        const productsList = (cart.items || []).map((i) => `• ${i.nombre} (${i.size}) × ${i.cantidad}`).join('\n');

        const message = `Hola ${customerName} 👋, te saludamos de *Biocambio360* 🇨🇴\n\nNotamos que estuviste armando tu pedido en nuestra tienda de fábrica pero no alcanzaste a finalizarlo:\n\n${productsList}\n\n*Total:* ${formatCurrency(cart.total)}\n\n¿Tuviste alguna duda con el envío o prefieres pagar *Contraentrega en efectivo*? 🚚\n\nPuedes retomar tu carrito en 1 clic aquí:\n👉 ${recoveryUrl}\n\n¡Quedamos atentos para asistirte!`;

        const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
    };

    const handleSendEmail = async (cart: AbandonedCartRecord, contactNumber: number = 1) => {
        setSendingEmailToken(cart.cartToken);
        try {
            const res = await fetch('/api/admin/send-abandoned-cart-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cartToken: cart.cartToken,
                    contactNumber,
                }),
            });
            const data = await res.json();
            if (data.ok) {
                setActionMessage({ type: 'success', text: `Correo #${contactNumber} enviado con éxito a ${cart.customerEmail}` });
            } else {
                setActionMessage({ type: 'error', text: data.error || 'Error al enviar correo' });
            }
        } catch (err: any) {
            setActionMessage({ type: 'error', text: 'Error de red al conectar con el servidor' });
        } finally {
            setSendingEmailToken(null);
            setTimeout(() => setActionMessage(null), 4000);
        }
    };

    const handleMarkRecovered = async (cartToken: string) => {
        try {
            await updateDoc(doc(db, 'abandoned_carts', cartToken), {
                status: 'recovered',
                updatedAt: serverTimestamp(),
            });
            setActionMessage({ type: 'success', text: 'Carrito marcado como recuperado exitosamente.' });
            setTimeout(() => setActionMessage(null), 3000);
        } catch (err) {
            console.error('Error marking cart as recovered:', err);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Top Bar Navigation */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/admin')}
                            className="p-2.5 rounded-2xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm transition-all cursor-pointer"
                            title="Volver al Panel"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
                                    <ShoppingCart size={18} />
                                </span>
                                <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                                    Carritos Abandonados
                                </h1>
                            </div>
                            <p className="text-xs md:text-sm text-gray-500 font-medium">
                                Recuperación omnicanal con analítica de apertura de correos y clics
                            </p>
                        </div>
                    </div>
                </div>

                {/* Notification Alert */}
                {actionMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 rounded-2xl border flex items-center gap-3 ${
                            actionMessage.type === 'success'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : 'bg-rose-50 border-rose-200 text-rose-800'
                        }`}
                    >
                        {actionMessage.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                        <p className="text-sm font-bold">{actionMessage.text}</p>
                    </motion.div>
                )}

                {/* Metrics Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Abandonados</span>
                            <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                                <AlertTriangle size={18} />
                            </span>
                        </div>
                        <p className="text-2xl font-black text-rose-600 mt-2">{abandonedCarts.length}</p>
                        <p className="text-[11px] text-gray-500 font-medium mt-1">Carritos pendientes</p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Valor en Riesgo</span>
                            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                                <DollarSign size={18} />
                            </span>
                        </div>
                        <p className="text-2xl font-black text-amber-600 mt-2">{formatCurrency(totalLostValue)}</p>
                        <p className="text-[11px] text-gray-500 font-medium mt-1">Ingresos potenciales</p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Recuperados</span>
                            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                                <CheckCircle2 size={18} />
                            </span>
                        </div>
                        <p className="text-2xl font-black text-emerald-600 mt-2">{recoveredCarts.length}</p>
                        <p className="text-[11px] text-emerald-700 font-bold mt-1">+{formatCurrency(totalRecoveredValue)}</p>
                    </div>

                    {/* Email Open Rate */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tasa Apertura</span>
                            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                <MailOpen size={18} />
                            </span>
                        </div>
                        <p className="text-2xl font-black text-blue-600 mt-2">{openRate}%</p>
                        <p className="text-[11px] text-gray-500 font-medium mt-1">{openedCarts.length} de {notifiedCarts.length} abiertos</p>
                    </div>

                    {/* Email Click-Through Rate (CTR) */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tasa de Clics</span>
                            <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                                <MousePointerClick size={18} />
                            </span>
                        </div>
                        <p className="text-2xl font-black text-purple-600 mt-2">{clickRate}%</p>
                        <p className="text-[11px] text-gray-500 font-medium mt-1">{clickedCarts.length} de {openedCarts.length} con clic</p>
                    </div>
                </div>

                {/* Filters & Search Header */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                    {/* Search Input */}
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por cliente, email, teléfono o producto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:bg-white transition-all"
                        />
                    </div>

                    {/* Status Tabs */}
                    <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                statusFilter === 'all'
                                    ? 'bg-[var(--brand-dark)] text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            Todos ({carts.length})
                        </button>
                        <button
                            onClick={() => setStatusFilter('abandoned')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                statusFilter === 'abandoned'
                                    ? 'bg-rose-600 text-white shadow-sm'
                                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                            }`}
                        >
                            Pendientes ({abandonedCarts.length})
                        </button>
                        <button
                            onClick={() => setStatusFilter('recovered')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                statusFilter === 'recovered'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                        >
                            Recuperados ({recoveredCarts.length})
                        </button>
                    </div>
                </div>

                {/* Main Table / List */}
                <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-16 flex flex-col items-center justify-center gap-3 text-gray-500">
                            <div className="w-10 h-10 border-4 border-gray-200 border-t-[var(--brand-blue)] rounded-full animate-spin"></div>
                            <p className="text-sm font-bold">Cargando carritos en tiempo real...</p>
                        </div>
                    ) : filteredCarts.length === 0 ? (
                        <div className="p-16 text-center">
                            <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3">
                                <ShoppingBag size={28} />
                            </div>
                            <h3 className="text-lg font-black text-gray-900 mb-1">No se encontraron carritos</h3>
                            <p className="text-sm text-gray-500 max-w-sm mx-auto">
                                {searchTerm
                                    ? 'No hay registros que coincidan con la búsqueda ingresada.'
                                    : 'En este momento no hay carritos registrados bajo este filtro.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-400 uppercase tracking-wider">
                                        <th className="py-3.5 px-4">Cliente & Contacto</th>
                                        <th className="py-3.5 px-4">Productos en Carrito</th>
                                        <th className="py-3.5 px-4 text-right">Total</th>
                                        <th className="py-3.5 px-4">Fecha</th>
                                        <th className="py-3.5 px-4">Trazabilidad Email</th>
                                        <th className="py-3.5 px-4 text-center">Acciones de Rescate</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm">
                                    {filteredCarts.map((cart) => {
                                        const isRecovered = cart.status === 'recovered';
                                        const hasPhone = !!cart.customerPhone;
                                        const isOpened = (cart.openCount || 0) > 0 || !!cart.openedAt;
                                        const isClicked = (cart.clickCount || 0) > 0 || !!cart.clickedAt;

                                        return (
                                            <tr
                                                key={cart.cartToken}
                                                className="hover:bg-blue-50/30 transition-colors group"
                                            >
                                                {/* Cliente & Contacto */}
                                                <td className="py-4 px-4 align-top">
                                                    <div className="flex flex-col">
                                                        <span className="font-extrabold text-gray-900 flex items-center gap-1.5">
                                                            {cart.customerName || 'Cliente sin nombre'}
                                                            {isRecovered && (
                                                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                                                                    Recuperado
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                            <Mail size={12} className="text-gray-400" />
                                                            {cart.customerEmail}
                                                        </span>
                                                        {cart.customerPhone && (
                                                            <span className="text-xs text-gray-600 font-mono mt-0.5 flex items-center gap-1">
                                                                <Phone size={12} className="text-gray-400" />
                                                                {cart.customerPhone}
                                                            </span>
                                                        )}
                                                        {cart.ciudad && (
                                                            <span className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                                                                <MapPin size={11} /> {cart.ciudad}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Productos */}
                                                <td className="py-4 px-4 align-top">
                                                    <div className="space-y-1.5 max-w-xs">
                                                        {cart.items?.map((item, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="flex items-center justify-between text-xs bg-gray-50 p-1.5 rounded-lg border border-gray-100"
                                                            >
                                                                <span className="font-bold text-gray-800 truncate mr-2">
                                                                    {item.nombre}{' '}
                                                                    <span className="text-gray-400 font-normal">
                                                                        ({item.size})
                                                                    </span>
                                                                </span>
                                                                <span className="font-black text-gray-900 shrink-0">
                                                                    ×{item.cantidad}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>

                                                {/* Total */}
                                                <td className="py-4 px-4 align-top text-right">
                                                    <p className="font-black text-base text-gray-900">
                                                        {formatCurrency(cart.total)}
                                                    </p>
                                                    {cart.shippingCost === 0 ? (
                                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                                                            Envío Gratis
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-gray-400 block mt-0.5">
                                                            Envío: {formatCurrency(cart.shippingCost)}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Fecha / Antigüedad */}
                                                <td className="py-4 px-4 align-top">
                                                    <p className="font-bold text-gray-900 text-xs">
                                                        {getTimeAgo(cart.createdAt)}
                                                    </p>
                                                    <p className="text-[11px] text-gray-400 mt-0.5">
                                                        {formatDate(cart.createdAt)}
                                                    </p>
                                                </td>

                                                {/* Trazabilidad Email (Enviado / Abierto / Clic) */}
                                                <td className="py-4 px-4 align-top">
                                                    <div className="flex flex-col gap-1.5">
                                                        {/* Status Envíos */}
                                                        <div className="flex items-center gap-1.5">
                                                            <span
                                                                className={`w-2 h-2 rounded-full ${
                                                                    cart.notificationCount > 0
                                                                        ? 'bg-blue-500'
                                                                        : 'bg-gray-300'
                                                                }`}
                                                            />
                                                            <span className="text-xs font-bold text-gray-700">
                                                                {cart.notificationCount === 0
                                                                    ? 'Sin envíos'
                                                                    : `${cart.notificationCount}/3 correos`}
                                                            </span>
                                                        </div>

                                                        {/* Badge Apertura */}
                                                        {isOpened ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-black border border-blue-100">
                                                                <Eye size={11} /> Abierto ({cart.openCount || 1}x)
                                                            </span>
                                                        ) : cart.notificationCount > 0 ? (
                                                            <span className="text-[10px] text-gray-400">No abierto aún</span>
                                                        ) : null}

                                                        {/* Badge Clic */}
                                                        {isClicked && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-black border border-purple-100">
                                                                <MousePointerClick size={11} /> Clic en botón ({cart.clickCount || 1}x)
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Acciones */}
                                                <td className="py-4 px-4 align-top">
                                                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                        {/* Botón WhatsApp */}
                                                        {hasPhone && !isRecovered && (
                                                            <button
                                                                onClick={() => handleWhatsAppRecovery(cart)}
                                                                className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                                                                title="Contactar por WhatsApp"
                                                            >
                                                                <MessageCircle size={14} /> WhatsApp
                                                            </button>
                                                        )}

                                                        {/* Botón Enviar Correo Manual */}
                                                        {!isRecovered && (
                                                            <button
                                                                onClick={() => handleSendEmail(cart, Math.min((cart.notificationCount || 0) + 1, 3))}
                                                                disabled={sendingEmailToken === cart.cartToken}
                                                                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-blue-200 transition-all cursor-pointer disabled:opacity-50"
                                                                title={`Enviar Correo #${Math.min((cart.notificationCount || 0) + 1, 3)}`}
                                                            >
                                                                {sendingEmailToken === cart.cartToken ? (
                                                                    <RefreshCw size={14} className="animate-spin" />
                                                                ) : (
                                                                    <Send size={14} />
                                                                )}
                                                                Email #{Math.min((cart.notificationCount || 0) + 1, 3)}
                                                            </button>
                                                        )}

                                                        {/* Botón Copiar Enlace */}
                                                        <button
                                                            onClick={() => handleCopyRecoveryUrl(cart.cartToken)}
                                                            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all cursor-pointer"
                                                            title="Copiar enlace de recuperación de 1 clic"
                                                        >
                                                            {copiedToken === cart.cartToken ? (
                                                                <Check size={16} className="text-emerald-600" />
                                                            ) : (
                                                                <Copy size={16} />
                                                            )}
                                                        </button>

                                                        {/* Ver Detalle */}
                                                        <button
                                                            onClick={() => setSelectedCart(cart)}
                                                            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all cursor-pointer"
                                                            title="Ver Detalle Completo"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Detalle del Carrito */}
            <AnimatePresence>
                {selectedCart && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto space-y-6"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-100 px-3 py-1 rounded-full">
                                        Token: {selectedCart.cartToken.slice(0, 12)}...
                                    </span>
                                    <h3 className="text-xl font-black text-gray-900 mt-2">
                                        Detalle de Carrito Abandonado
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setSelectedCart(null)}
                                    className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 cursor-pointer"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Datos del Cliente */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <div>
                                    <p className="text-xs text-gray-400 font-bold uppercase">Nombre Completo</p>
                                    <p className="font-extrabold text-gray-900 text-sm mt-0.5">
                                        {selectedCart.customerName || 'No especificado'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold uppercase">Correo Electrónico</p>
                                    <p className="font-extrabold text-gray-900 text-sm mt-0.5">
                                        {selectedCart.customerEmail}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold uppercase">Teléfono / WhatsApp</p>
                                    <p className="font-extrabold text-gray-900 text-sm mt-0.5">
                                        {selectedCart.customerPhone || 'No registrado'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold uppercase">Ciudad & Dirección</p>
                                    <p className="font-extrabold text-gray-900 text-sm mt-0.5">
                                        {selectedCart.ciudad ? `${selectedCart.ciudad}, ${selectedCart.direccion || ''}` : 'No ingresada'}
                                    </p>
                                </div>
                            </div>

                            {/* Trazabilidad de Correo */}
                            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-2">
                                <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider">
                                    📊 Trazabilidad y Comportamiento del Cliente
                                </h4>
                                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                                    <div className="bg-white p-2 rounded-xl border border-blue-100">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Correos Enviados</p>
                                        <p className="text-base font-black text-gray-900">{selectedCart.notificationCount || 0}/3</p>
                                    </div>
                                    <div className="bg-white p-2 rounded-xl border border-blue-100">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Aperturas</p>
                                        <p className="text-base font-black text-blue-600">{selectedCart.openCount || 0} veces</p>
                                        {selectedCart.openedAt && (
                                            <p className="text-[9px] text-gray-400">{getTimeAgo(selectedCart.openedAt)}</p>
                                        )}
                                    </div>
                                    <div className="bg-white p-2 rounded-xl border border-blue-100">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Clics en Botón</p>
                                        <p className="text-base font-black text-purple-600">{selectedCart.clickCount || 0} veces</p>
                                        {selectedCart.clickedAt && (
                                            <p className="text-[9px] text-gray-400">{getTimeAgo(selectedCart.clickedAt)}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Productos */}
                            <div>
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">
                                    Productos en el Carrito ({selectedCart.items?.length || 0})
                                </h4>
                                <div className="space-y-2">
                                    {selectedCart.items?.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="p-3 bg-white rounded-xl border border-gray-200 flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-black">
                                                    📦
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 text-sm">{item.nombre}</p>
                                                    <p className="text-xs text-gray-500">
                                                        Presentación: {item.size} • Cantidad: {item.cantidad}
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="font-black text-gray-900 text-sm">
                                                {formatCurrency(item.price * item.cantidad)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Resumen de Valores */}
                            <div className="bg-slate-900 text-white p-5 rounded-2xl flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-slate-400 font-medium">Total Carrito</p>
                                    <p className="text-2xl font-black">{formatCurrency(selectedCart.total)}</p>
                                </div>
                                {selectedCart.status !== 'recovered' && (
                                    <button
                                        onClick={() => {
                                            handleMarkRecovered(selectedCart.cartToken);
                                            setSelectedCart(null);
                                        }}
                                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-xl cursor-pointer transition-colors"
                                    >
                                        Marcar como Recuperado
                                    </button>
                                )}
                            </div>

                            {/* Acciones Rápidas */}
                            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                                {selectedCart.customerPhone && selectedCart.status !== 'recovered' && (
                                    <button
                                        onClick={() => handleWhatsAppRecovery(selectedCart)}
                                        className="w-full sm:flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
                                    >
                                        <MessageCircle size={16} /> Contactar por WhatsApp
                                    </button>
                                )}
                                <button
                                    onClick={() => handleCopyRecoveryUrl(selectedCart.cartToken)}
                                    className="w-full sm:flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <Copy size={16} /> Copiar Enlace Directo
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
