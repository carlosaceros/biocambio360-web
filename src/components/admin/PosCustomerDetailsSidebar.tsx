'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User,
    Phone,
    MessageCircle,
    Copy,
    Check,
    Star,
    ShoppingBag,
    Calendar,
    MapPin,
    Building2,
    Tag,
    RefreshCw,
    X,
    FileText,
    Send,
    Sparkles,
    Clock,
    ShoppingCart,
    Plus,
    CheckCircle2,
    Share2,
    Shield,
    ExternalLink
} from 'lucide-react';
import { Customer } from '@/types/customer';
import { PosItem } from '@/types/pos';
import { formatCurrency, normalizeDepartmentAndCity } from '@/lib/checkout-utils';
import {
    getCustomerPurchaseHistory,
    CustomerPurchaseHistoryItem
} from '@/lib/customers-service';
import {
    getCustomerActivities,
    addCRMActivity,
    toggleCustomerReferrerStatus
} from '@/lib/crm-service';
import { CRMActivity } from '@/types/crm';
import { useAuth } from '@/lib/auth-context';

interface PosCustomerDetailsSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    customer: Customer | null;
    onReorderItems?: (items: PosItem[]) => void;
    onAssignToTicket?: (customer: Customer) => void;
    isTicketCustomer?: boolean;
}

export default function PosCustomerDetailsSidebar({
    isOpen,
    onClose,
    customer,
    onReorderItems,
    onAssignToTicket,
    isTicketCustomer = true,
}: PosCustomerDetailsSidebarProps) {
    const { user, userProfile } = useAuth();

    // Tabs
    const [activeTab, setActiveTab] = useState<'resumen' | 'compras' | 'referidos' | 'notas'>('resumen');

    // Purchase history state
    const [purchases, setPurchases] = useState<CustomerPurchaseHistoryItem[]>([]);
    const [isLoadingPurchases, setIsLoadingPurchases] = useState(false);

    // CRM activities state
    const [activities, setActivities] = useState<CRMActivity[]>([]);
    const [isLoadingActivities, setIsLoadingActivities] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);

    // Copy feedback
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [actionFeedback, setActionFeedback] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

    // Referrer toggle
    const [isReferrerState, setIsReferrerState] = useState<boolean>(false);
    const [referralCodeState, setReferralCodeState] = useState<string>('');
    const [isTogglingReferrer, setIsTogglingReferrer] = useState(false);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Load data when customer changes
    useEffect(() => {
        if (!isOpen || !customer) return;

        setIsReferrerState(Boolean(customer.isReferrer));
        setReferralCodeState(customer.referralCode || '');

        const loadData = async () => {
            setIsLoadingPurchases(true);
            setIsLoadingActivities(true);

            try {
                const history = await getCustomerPurchaseHistory(customer.celular);
                setPurchases(history);
            } catch (err) {
                console.error('[PosCustomerDetails] Error fetching purchases:', err);
            } finally {
                setIsLoadingPurchases(false);
            }

            try {
                const acts = await getCustomerActivities(customer.id);
                setActivities(acts);
            } catch (err) {
                console.error('[PosCustomerDetails] Error fetching activities:', err);
            } finally {
                setIsLoadingActivities(false);
            }
        };

        loadData();
    }, [isOpen, customer]);

    // Format dates safely
    const formatDate = (dateVal: any): string => {
        if (!dateVal) return 'No registrada';
        try {
            if (dateVal.toDate && typeof dateVal.toDate === 'function') {
                return dateVal.toDate().toLocaleDateString('es-CO', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            }
            if (dateVal.seconds) {
                return new Date(dateVal.seconds * 1000).toLocaleDateString('es-CO', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            }
            const d = new Date(dateVal);
            if (!isNaN(d.getTime())) {
                return d.toLocaleDateString('es-CO', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            }
        } catch {
            // fallback
        }
        return 'Reciente';
    };

    // Calculate days since last order
    const daysSinceLastOrder = useMemo(() => {
        if (!customer?.lastOrderDate) return null;
        try {
            const time = customer.lastOrderDate.seconds
                ? customer.lastOrderDate.seconds * 1000
                : customer.lastOrderDate.toDate
                    ? customer.lastOrderDate.toDate().getTime()
                    : new Date(customer.lastOrderDate).getTime();
            if (isNaN(time)) return null;
            const diffDays = Math.floor((Date.now() - time) / (1000 * 60 * 60 * 24));
            return Math.max(0, diffDays);
        } catch {
            return null;
        }
    }, [customer]);

    // Customer tier classification
    const customerTier = useMemo(() => {
        if (!customer) return { label: 'Cliente', color: 'bg-slate-100 text-slate-700', icon: '👤' };
        if (customer.ordersCount >= 4 || customer.totalSpent >= 300000) {
            return { label: 'Cliente VIP', color: 'bg-amber-100 text-amber-900 border-amber-300', icon: '👑' };
        }
        if (customer.ordersCount >= 2) {
            return { label: 'Cliente Frecuente', color: 'bg-blue-100 text-blue-900 border-blue-300', icon: '🔄' };
        }
        if (customer.ordersCount === 1) {
            return { label: 'Primera Compra', color: 'bg-emerald-100 text-emerald-900 border-emerald-300', icon: '🌱' };
        }
        return { label: 'Nuevo Prospecto', color: 'bg-slate-100 text-slate-800 border-slate-300', icon: '👤' };
    }, [customer]);

    // Copy to clipboard
    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(label);
        setTimeout(() => setCopiedField(null), 2500);
    };

    // Normalized geo for display and clipboard
    const normGeo = useMemo(() => {
        if (!customer) return { ciudad: 'Soacha', departamento: 'Cundinamarca' };
        return normalizeDepartmentAndCity(customer.departamento, customer.ciudad);
    }, [customer?.departamento, customer?.ciudad]);

    // Copy entire customer dossier
    const handleCopyFullInfo = () => {
        if (!customer) return;
        const info = `*FICHA DE CLIENTE BIOCAMBIO360*\n` +
            `• Nombre: ${customer.nombre}\n` +
            `• Celular: ${customer.celular}\n` +
            `• Cédula / NIT: ${customer.cedula || 'No registrada'}\n` +
            `• Ciudad: ${normGeo.ciudad} (${normGeo.departamento})\n` +
            `• Dirección: ${customer.direccion || 'Venta Mostrador Soacha'}\n` +
            `• Email: ${customer.email || 'No registrado'}\n` +
            `• Compras: ${customer.ordersCount} pedidos (${formatCurrency(customer.totalSpent)})\n` +
            `• Asesor: ${customer.asesorAsignado || 'Mostrador Soacha'}`;
        navigator.clipboard.writeText(info);
        setActionFeedback({ text: '✓ Ficha completa copiada al portapapeles', type: 'success' });
        setTimeout(() => setActionFeedback(null), 3500);
    };

    // Add note in CRM
    const handleAddNote = async () => {
        if (!customer || !newNote.trim()) return;
        setIsSavingNote(true);
        try {
            await addCRMActivity({
                customerId: customer.id,
                type: 'note',
                description: `[Mostrador POS] ${newNote.trim()}`,
                authorEmail: user?.email || 'mostrador@biocambio360.com',
                authorName: userProfile?.nombre || user?.displayName || 'Cajero Mostrador'
            });

            const acts = await getCustomerActivities(customer.id);
            setActivities(acts);
            setNewNote('');
            setActionFeedback({ text: '✓ Nota registrada en el CRM', type: 'success' });
            setTimeout(() => setActionFeedback(null), 3000);
        } catch (err) {
            console.error('Error guardando nota:', err);
        } finally {
            setIsSavingNote(false);
        }
    };

    // Toggle Referrer
    const handleToggleReferrer = async () => {
        if (!customer) return;
        setIsTogglingReferrer(true);
        try {
            const newState = !isReferrerState;
            const res = await toggleCustomerReferrerStatus({
                customerId: customer.id,
                isReferrer: newState,
                customerName: customer.nombre,
                customerPhone: customer.celular,
                activatedByEmail: user?.email || 'pos@biocambio360.com',
                activatedByName: userProfile?.nombre || user?.displayName || 'Cajero Mostrador Soacha'
            });

            setIsReferrerState(newState);
            if (res.referralCode) {
                setReferralCodeState(res.referralCode);
            }
            setActionFeedback({
                text: newState ? '🌟 Cliente activado como Embajador' : 'Programa de Embajador pausado',
                type: 'success'
            });
            setTimeout(() => setActionFeedback(null), 3500);
        } catch (err) {
            console.error('Error alternando estado de referidor:', err);
        } finally {
            setIsTogglingReferrer(false);
        }
    };

    // Reorder from past purchase
    const handleReorderPurchase = (purchase: CustomerPurchaseHistoryItem) => {
        if (!onReorderItems || purchase.items.length === 0) return;

        const posItems: PosItem[] = purchase.items.map(it => ({
            productId: it.productId,
            nombre: it.nombre,
            size: it.size,
            price: it.precioUnitario,
            precioUnitario: it.precioUnitario,
            cantidad: it.cantidad,
            subtotal: it.subtotal || it.precioUnitario * it.cantidad,
            imgFile: it.imagen,
            imagen: it.imagen
        }));


        onReorderItems(posItems);
        setActionFeedback({
            text: `✓ ${posItems.length} producto(s) cargados al ticket de venta`,
            type: 'success'
        });
        setTimeout(() => setActionFeedback(null), 4000);
    };

    if (!customer) return null;

    const cleanPhone = customer.celular.replace(/\D/g, '');
    const cleanDoc = (customer.cedula || '').replace(/\D/g, '');

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
                    {/* Backdrop desenfocado */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
                    />

                    {/* Drawer lateral deslizable */}
                    <motion.aside
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                        className="relative w-full max-w-xl bg-white shadow-2xl z-10 flex flex-col h-full border-l border-slate-200 overflow-hidden"
                    >
                        {/* Cabecera Principal */}
                        <div className="bg-slate-900 text-white p-5 sm:p-6 border-b border-slate-800 shrink-0">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-600/90 border border-emerald-400/30 text-white flex items-center justify-center font-black text-xl shrink-0 shadow-md">
                                        {customer.nombre ? customer.nombre.charAt(0).toUpperCase() : 'C'}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${customerTier.color}`}>
                                                <span>{customerTier.icon}</span>
                                                <span>{customerTier.label}</span>
                                            </span>
                                            {isReferrerState && (
                                                <span className="bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <Star size={10} className="fill-amber-300 text-amber-300" />
                                                    Embajador
                                                </span>
                                            )}
                                            <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                ID: {customer.id}
                                            </span>
                                        </div>
                                        <h2 className="text-xl font-black text-white truncate tracking-tight">
                                            {customer.nombre}
                                        </h2>
                                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap font-medium">
                                            <span>CC / NIT: {customer.cedula || '222222222222'}</span>
                                            <span>·</span>
                                            <span className="font-mono text-emerald-400 font-bold">{customer.celular}</span>
                                            <span>·</span>
                                            <span>{customer.ciudad || 'Soacha'}</span>
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
                                    title="Cerrar ficha (Esc)"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Barra de Acciones Rápidas del Punto de Venta */}
                            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-800 text-xs">
                                <a
                                    href={`https://wa.me/57${cleanPhone}?text=Hola%20${encodeURIComponent(customer.nombre)}%2C%20te%20saludamos%20del%20Punto%20de%20Venta%20Biocambio360%20Mostrador%20Soacha%20%F0%9F%8C%BF`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="py-2 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all text-center"
                                >
                                    <MessageCircle size={14} className="shrink-0" />
                                    <span className="truncate">WhatsApp</span>
                                </a>

                                <a
                                    href={`tel:${customer.celular}`}
                                    className="py-2 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all text-center"
                                >
                                    <Phone size={14} className="shrink-0 text-slate-400" />
                                    <span className="truncate">Llamar</span>
                                </a>

                                <button
                                    type="button"
                                    onClick={handleCopyFullInfo}
                                    className="py-2 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer text-center"
                                >
                                    {copiedField === 'full' ? (
                                        <Check size={14} className="text-emerald-400 shrink-0" />
                                    ) : (
                                        <Copy size={14} className="text-slate-400 shrink-0" />
                                    )}
                                    <span className="truncate">Copiar Ficha</span>
                                </button>
                            </div>
                        </div>

                        {/* Alerta flotante de feedback */}
                        {actionFeedback && (
                            <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 px-4 py-2 text-xs font-bold flex items-center gap-2 animate-fadeIn shrink-0">
                                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                                <span>{actionFeedback.text}</span>
                            </div>
                        )}

                        {/* Selector de Pestañas */}
                        <div className="flex border-b border-slate-200 bg-slate-50 px-4 shrink-0 overflow-x-auto no-scrollbar">
                            <button
                                type="button"
                                onClick={() => setActiveTab('resumen')}
                                className={`py-3 px-3.5 text-xs font-black transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                                    activeTab === 'resumen'
                                        ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
                                        : 'border-transparent text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                <User size={13} />
                                <span>Resumen & Contacto</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab('compras')}
                                className={`py-3 px-3.5 text-xs font-black transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                                    activeTab === 'compras'
                                        ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
                                        : 'border-transparent text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                <ShoppingBag size={13} />
                                <span>Compras & Reorden</span>
                                {purchases.length > 0 && (
                                    <span className="bg-indigo-100 text-indigo-800 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                                        {purchases.length}
                                    </span>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab('referidos')}
                                className={`py-3 px-3.5 text-xs font-black transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                                    activeTab === 'referidos'
                                        ? 'border-amber-600 text-amber-700 bg-white shadow-2xs'
                                        : 'border-transparent text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                <Star size={13} />
                                <span>Comunidad Embajador</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab('notas')}
                                className={`py-3 px-3.5 text-xs font-black transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                                    activeTab === 'notas'
                                        ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
                                        : 'border-transparent text-slate-500 hover:text-slate-900'
                                }`}
                            >
                                <FileText size={13} />
                                <span>Notas CRM</span>
                                {activities.length > 0 && (
                                    <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                                        {activities.length}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Contenido con Scroll según pestaña */}
                        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-slate-800">
                            {/* PESTAÑA 1: RESUMEN Y CONTACTO */}
                            {activeTab === 'resumen' && (
                                <div className="space-y-5 animate-fadeIn">
                                    {/* 3 Tarjetas de Métricas LTV */}
                                    <div className="grid grid-cols-3 gap-2.5">
                                        <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl">
                                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 block">Total Facturado</span>
                                            <p className="text-base font-black text-indigo-950 mt-1">
                                                {formatCurrency(customer.totalSpent || 0)}
                                            </p>
                                        </div>

                                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Compras</span>
                                            <p className="text-base font-black text-slate-900 mt-1">
                                                {customer.ordersCount || 1} {customer.ordersCount === 1 ? 'pedido' : 'pedidos'}
                                            </p>
                                        </div>

                                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Ticket Prom.</span>
                                            <p className="text-base font-black text-slate-900 mt-1">
                                                {formatCurrency(Math.round((customer.totalSpent || 0) / Math.max(1, customer.ordersCount || 1)))}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Fechas clave */}
                                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <Clock size={16} className="text-slate-400" />
                                            <div>
                                                <span className="font-bold text-slate-700 block text-[11px]">Última Compra:</span>
                                                <span className="text-slate-500 text-[11px]">{formatDate(customer.lastOrderDate)}</span>
                                            </div>
                                        </div>
                                        {daysSinceLastOrder !== null && (
                                            <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                                                daysSinceLastOrder <= 15
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : daysSinceLastOrder <= 45
                                                        ? 'bg-amber-100 text-amber-800'
                                                        : 'bg-red-100 text-red-800'
                                            }`}>
                                                {daysSinceLastOrder === 0
                                                    ? 'Hoy'
                                                    : `Hace ${daysSinceLastOrder} ${daysSinceLastOrder === 1 ? 'día' : 'días'}`}
                                            </span>
                                        )}
                                    </div>

                                    {/* Ficha de Ubicación y Despacho Habitual */}
                                    <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3 shadow-xs">
                                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                                            <MapPin size={13} className="text-indigo-600" />
                                            <span>Dirección Habitual & Datos de Entrega</span>
                                        </h3>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Dirección</span>
                                                <span className="font-semibold text-slate-900 block mt-0.5">
                                                    {customer.direccion || 'Venta Mostrador Soacha'}
                                                </span>
                                            </div>

                                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Ciudad / Depto</span>
                                                <span className="font-semibold text-slate-900 block mt-0.5">
                                                    {normGeo.ciudad}, {normGeo.departamento}
                                                </span>
                                            </div>

                                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Cédula o NIT</span>
                                                <span className="font-mono font-bold text-slate-900 block mt-0.5">
                                                    {customer.cedula || '222222222222'}
                                                </span>
                                            </div>

                                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Asesor Asignado</span>
                                                <span className="font-semibold text-indigo-700 block mt-0.5">
                                                    {customer.asesorAsignado || 'Mostrador Soacha'}
                                                </span>
                                            </div>

                                            {customer.email && (
                                                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 sm:col-span-2">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Correo Electrónico</span>
                                                    <span className="font-semibold text-slate-900 block mt-0.5">
                                                        {customer.email}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Botón de Asignar / Reasignar al Ticket Activo si se visualiza otro cliente */}
                                    {onAssignToTicket && !isTicketCustomer && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onAssignToTicket(customer);
                                                onClose();
                                            }}
                                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            <ShoppingCart size={15} />
                                            <span>Asignar a este Cliente en el Ticket Activo</span>
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* PESTAÑA 2: COMPRAS PREVIAS & REORDEN */}
                            {activeTab === 'compras' && (
                                <div className="space-y-4 animate-fadeIn">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                                                Historial de Transacciones
                                            </h3>
                                            <p className="text-[11px] text-slate-500">
                                                Ventas en mostrador y pedidos despachados
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                setIsLoadingPurchases(true);
                                                try {
                                                    const history = await getCustomerPurchaseHistory(customer.celular);
                                                    setPurchases(history);
                                                } finally {
                                                    setIsLoadingPurchases(false);
                                                }
                                            }}
                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                            title="Actualizar historial"
                                        >
                                            <RefreshCw size={13} className={isLoadingPurchases ? 'animate-spin' : ''} />
                                        </button>
                                    </div>

                                    {isLoadingPurchases ? (
                                        <div className="py-12 text-center text-slate-400 space-y-2">
                                            <RefreshCw size={20} className="animate-spin mx-auto text-indigo-600" />
                                            <p className="text-xs">Consultando compras de {customer.nombre}...</p>
                                        </div>
                                    ) : purchases.length === 0 ? (
                                        <div className="py-10 bg-slate-50 border border-slate-200 rounded-2xl text-center p-4 space-y-2">
                                            <ShoppingBag size={28} className="mx-auto text-slate-300" />
                                            <p className="text-xs font-bold text-slate-700">No hay compras previas registradas</p>
                                            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                                                Esta es la primera compra o los pedidos anteriores no tenían vinculado el celular {customer.celular}.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {purchases.map((purchase) => (
                                                <div
                                                    key={purchase.id}
                                                    className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:border-indigo-300 transition-all space-y-3"
                                                >
                                                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-mono font-black text-xs text-slate-900">
                                                                    #{purchase.numeroComprobante}
                                                                </span>
                                                                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                                                                    purchase.tipo === 'POS Mostrador'
                                                                        ? 'bg-emerald-100 text-emerald-800'
                                                                        : 'bg-indigo-100 text-indigo-800'
                                                                }`}>
                                                                    {purchase.tipo}
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                                {formatDate(purchase.fecha)} · Pago: {purchase.metodoPago || 'Efectivo'}
                                                            </p>
                                                        </div>

                                                        <div className="text-right">
                                                            <span className="text-xs font-black text-indigo-900 block">
                                                                {formatCurrency(purchase.total)}
                                                            </span>
                                                            <span className="text-[9px] text-slate-400">
                                                                {purchase.items.length} {purchase.items.length === 1 ? 'ítem' : 'ítems'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Desglose de productos comprados */}
                                                    <div className="space-y-1.5">
                                                        {purchase.items.map((it, idx) => (
                                                            <div
                                                                key={`${purchase.id}-${idx}`}
                                                                className="flex items-center justify-between text-xs py-1 px-2 bg-slate-50 rounded-lg"
                                                            >
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <span className="font-mono font-bold text-indigo-600 text-[11px] shrink-0">
                                                                        {it.cantidad}x
                                                                    </span>
                                                                    <span className="font-medium text-slate-800 truncate">
                                                                        {it.nombre}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-500 bg-white border border-slate-200 px-1.5 py-0.2 rounded-md shrink-0">
                                                                        {it.size}
                                                                    </span>
                                                                </div>
                                                                <span className="font-bold text-slate-700 shrink-0 text-[11px]">
                                                                    {formatCurrency(it.subtotal || it.precioUnitario * it.cantidad)}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Botón Reordenar / Cargar en ticket */}
                                                    {onReorderItems && (
                                                        <div className="pt-2 border-t border-slate-100 flex justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleReorderPurchase(purchase)}
                                                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                                            >
                                                                <Plus size={13} className="text-emerald-700" />
                                                                <span>Cargar estos productos en el Ticket</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* PESTAÑA 3: COMUNIDAD EMBAJADOR (REFERIDOS) */}
                            {activeTab === 'referidos' && (
                                <div className="space-y-5 animate-fadeIn">
                                    <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50/40 border border-amber-200 rounded-2xl space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                                                    <Star size={18} className="fill-white" />
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-sm text-slate-900">
                                                        Comunidad Biocambio360
                                                    </h3>
                                                    <p className="text-[10px] text-amber-900/80 font-medium">
                                                        Programa Oficial de Referidos y Embajadores
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={handleToggleReferrer}
                                                disabled={isTogglingReferrer}
                                                className={`px-3 py-1 rounded-full text-xs font-extrabold transition-all shadow-xs cursor-pointer ${
                                                    isReferrerState
                                                        ? 'bg-amber-600 text-white hover:bg-amber-700'
                                                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-amber-100 hover:text-amber-900'
                                                }`}
                                            >
                                                {isTogglingReferrer
                                                    ? 'Actualizando...'
                                                    : isReferrerState
                                                        ? '🌟 Activo'
                                                        : 'Activar a Libre Demanda'}
                                            </button>
                                        </div>

                                        {isReferrerState ? (
                                            <div className="space-y-3 pt-2 border-t border-amber-200/80">
                                                <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border border-amber-200 shadow-2xs">
                                                    <div>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Código Único</span>
                                                        <span className="font-mono font-black text-sm text-slate-900 tracking-wider">
                                                            {referralCodeState || customer.referralCode || 'EMBAJADOR'}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const code = referralCodeState || customer.referralCode || 'EMBAJADOR';
                                                            const link = `https://biocambio360.com/comunidad?ref=${code}`;
                                                            handleCopy(link, 'reflink');
                                                        }}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                                    >
                                                        {copiedField === 'reflink' ? (
                                                            <Check size={14} className="text-emerald-600" />
                                                        ) : (
                                                            <Copy size={14} />
                                                        )}
                                                        <span>{copiedField === 'reflink' ? '¡Copiado!' : 'Copiar Link'}</span>
                                                    </button>
                                                </div>

                                                <a
                                                    href={`https://wa.me/57${cleanPhone}?text=${encodeURIComponent(
                                                        `¡Hola ${customer.nombre}! Te saludamos del Punto de Venta Biocambio360 Soacha 🌿. Queremos contarte que por ser nuestro cliente preferencial, tienes activo tu beneficio de embajador: comparte tu código *${referralCodeState || customer.referralCode || 'EMBAJADOR'}* con tus amigos y familiares, ellos recibirán $10.000 COP de descuento en su primer pedido y tú acumularás $10.000 COP de saldo para tus compras. Consulta tu enlace aquí: https://biocambio360.com/comunidad?ref=${referralCodeState || customer.referralCode || 'EMBAJADOR'}`
                                                    )}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                                                >
                                                    <MessageCircle size={14} />
                                                    <span>Compartir Guion de Embajador por WhatsApp</span>
                                                </a>
                                            </div>
                                        ) : (
                                            <p className="text-[11px] text-amber-900/80 leading-relaxed">
                                                Este cliente puede ser activado como embajador de marca directamente desde el mostrador para generar recomendaciones de boca a boca y fidelización.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* PESTAÑA 4: NOTAS CRM */}
                            {activeTab === 'notas' && (
                                <div className="space-y-4 animate-fadeIn">
                                    <div className="space-y-2">
                                        <label className="block text-xs font-black uppercase text-slate-700 tracking-wider">
                                            Agregar Nota de Mostrador
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Ej: Cliente prefiere garrafas de 20L aroma lavanda..."
                                                value={newNote}
                                                onChange={(e) => setNewNote(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                                                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleAddNote}
                                                disabled={isSavingNote || !newNote.trim()}
                                                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                                            >
                                                <Send size={13} />
                                                <span>Guardar</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Lista de notas */}
                                    <div className="space-y-2.5 pt-3 border-t border-slate-200">
                                        <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                                            Bitácora de Notas & Actividades ({activities.length})
                                        </h4>

                                        {isLoadingActivities ? (
                                            <div className="py-6 text-center text-slate-400">
                                                <RefreshCw size={16} className="animate-spin mx-auto text-indigo-600" />
                                            </div>
                                        ) : activities.length === 0 ? (
                                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center text-xs text-slate-400">
                                                No hay notas registradas todavía para este cliente.
                                            </div>
                                        ) : (
                                            activities.map((act) => (
                                                <div
                                                    key={act.id}
                                                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs"
                                                >
                                                    <p className="font-medium text-slate-800">{act.description}</p>
                                                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                                        <span>Por: {act.authorName || 'Cajero'}</span>
                                                        <span>{formatDate(act.createdAt)}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Pie de Drawer con botón de Cerrar */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                            <span className="text-[11px] text-slate-400">
                                TPV Mostrador Soacha · Cra. 7C #44-17 Sur
                            </span>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                            >
                                Cerrar Ficha
                            </button>
                        </div>
                    </motion.aside>
                </div>
            )}
        </AnimatePresence>
    );
}
