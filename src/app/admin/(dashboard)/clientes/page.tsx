'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    User,
    ArrowLeft,
    ShoppingBag,
    Calendar,
    MapPin,
    Phone,
    Mail,
    X,
    ExternalLink,
    MessageCircle,
    Layers,
    List,
    Kanban,
    Tag,
    Shield,
    Clock,
    AlertTriangle,
    CheckCircle2,
    Send,
    Plus,
    UserCheck,
    Filter,
    BarChart3,
    Sparkles,
    RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getCustomers, syncCustomersFromOrders } from '@/lib/customers-service';
import { getOrdersByCustomer } from '@/lib/orders-service';
import { Customer } from '@/types/customer';
import { Order, ORDER_STATUS_CONFIG } from '@/types/order';
import { formatCurrency } from '@/lib/checkout-utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    CRMStage,
    CustomerCRM,
    CustomerTag,
    CRMActivity,
    CRM_STAGE_CONFIG,
    CUSTOMER_TAG_CONFIG,
    CRM_ACTIVITY_ICONS
} from '@/types/crm';
import {
    calculateCRMStage,
    enrichCustomerWithCRM,
    addCRMActivity,
    getCustomerActivities,
    updateCustomerTags,
    assignCustomerToAdvisor
} from '@/lib/crm-service';
import { runSARLAFTCheck } from '@/lib/sarlaft-service';
import { useAuth } from '@/lib/auth-context';

const ADVISORS = ['Karen', 'Katherine', 'Andrea', 'Diego', 'Laura', 'Camilo'];

function parseSafeDate(timestamp: any): Date {
    if (!timestamp) return new Date();
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp.toDate === 'function') {
        try {
            return timestamp.toDate();
        } catch {
            return new Date();
        }
    }
    if (timestamp.seconds !== undefined) return new Date(timestamp.seconds * 1000);
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        const d = new Date(timestamp);
        if (!isNaN(d.getTime())) return d;
    }
    return new Date();
}

export default function ClientesPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [rawCustomers, setRawCustomers] = useState<Customer[]>([]);
    const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStage, setSelectedStage] = useState<CRMStage | 'all'>('all');
    const [selectedAdvisor, setSelectedAdvisor] = useState<string>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    // Selected customer for slideover panel
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerCRM | null>(null);
    const [customerOrders, setCustomerOrders] = useState<(Order & { id: string })[]>([]);
    const [customerActivities, setCustomerActivities] = useState<CRMActivity[]>([]);
    const [isLoadingOrders, setIsLoadingOrders] = useState(false);
    const [newNoteText, setNewNoteText] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [isCheckingSarlaft, setIsCheckingSarlaft] = useState(false);

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        setIsLoading(true);
        try {
            const data = await getCustomers();
            setRawCustomers(data);
        } catch (error) {
            console.error('Error loading customers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Enrich customers with CRM stage & calculated data
    const crmCustomers: CustomerCRM[] = useMemo(() => {
        return rawCustomers.map(c => enrichCustomerWithCRM(c, {
            tags: (c as any).tags || [],
            assignedTo: (c as any).assignedTo,
            sarlaftStatus: (c as any).sarlaftStatus || 'pendiente',
            sarlaftCheckedAt: (c as any).sarlaftCheckedAt,
        }));
    }, [rawCustomers]);

    // Handle customer selection
    const handleCustomerClick = async (customer: CustomerCRM) => {
        setSelectedCustomer(customer);
        setIsLoadingOrders(true);
        try {
            const [orders, activities] = await Promise.all([
                getOrdersByCustomer(customer.celular),
                getCustomerActivities(customer.id)
            ]);
            setCustomerOrders(orders);
            setCustomerActivities(activities);
        } catch (error) {
            console.error('Error loading customer details:', error);
        } finally {
            setIsLoadingOrders(false);
        }
    };

    // Filter customers
    const filteredCustomers = useMemo(() => {
        return crmCustomers.filter(customer => {
            // Stage filter
            if (selectedStage !== 'all' && customer.stage !== selectedStage) {
                return false;
            }
            // Advisor filter
            if (selectedAdvisor !== 'all') {
                if (selectedAdvisor === 'sin_asignar' && customer.assignedTo) return false;
                if (selectedAdvisor !== 'sin_asignar' && customer.assignedTo !== selectedAdvisor) return false;
            }
            // Search query
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            const nombre = (customer.nombre || '').toLowerCase();
            const celular = (customer.celular || '');
            const email = (customer.email || '').toLowerCase();
            const ciudad = (customer.ciudad || '').toLowerCase();
            const cedula = (customer.cedula || '');

            return (
                nombre.includes(query) ||
                celular.includes(query) ||
                email.includes(query) ||
                ciudad.includes(query) ||
                cedula.includes(query)
            );
        });
    }, [crmCustomers, selectedStage, selectedAdvisor, searchQuery]);

    // Pipeline counts
    const stageCounts = useMemo(() => {
        const counts: Record<string, number> = { all: crmCustomers.length };
        Object.keys(CRM_STAGE_CONFIG).forEach(stage => {
            counts[stage] = crmCustomers.filter(c => c.stage === stage).length;
        });
        return counts;
    }, [crmCustomers]);

    // Add note to timeline
    const handleAddNote = async () => {
        if (!selectedCustomer || !newNoteText.trim()) return;
        setIsSavingNote(true);
        try {
            await addCRMActivity({
                customerId: selectedCustomer.id,
                type: 'note',
                description: newNoteText.trim(),
                authorEmail: user?.email || 'admin@biocambio360.com',
                authorName: user?.displayName || 'Asesor Comercial',
            });
            setNewNoteText('');
            // Refresh activities
            const updated = await getCustomerActivities(selectedCustomer.id);
            setCustomerActivities(updated);
        } catch (e) {
            console.error('Error saving note:', e);
        } finally {
            setIsSavingNote(false);
        }
    };

    // Assign Advisor
    const handleAssignAdvisor = async (advisorName: string) => {
        if (!selectedCustomer) return;
        try {
            await assignCustomerToAdvisor(
                selectedCustomer.id,
                advisorName,
                user?.email || 'admin@biocambio360.com',
                user?.displayName || 'Admin'
            );
            setSelectedCustomer(prev => prev ? { ...prev, assignedTo: advisorName } : null);
            // Update in list
            setRawCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, assignedTo: advisorName } as any : c));
            const updated = await getCustomerActivities(selectedCustomer.id);
            setCustomerActivities(updated);
        } catch (e) {
            console.error('Error assigning advisor:', e);
        }
    };

    // Run SARLAFT
    const handleRunSarlaft = async () => {
        if (!selectedCustomer) return;
        setIsCheckingSarlaft(true);
        try {
            const res = await runSARLAFTCheck(
                selectedCustomer.id,
                selectedCustomer.cedula,
                selectedCustomer.nombre,
                user?.email || 'admin@biocambio360.com',
                user?.displayName || 'Admin'
            );
            const newStatus = res.status === 'clean' ? 'verificado' : 'rechazado';
            setSelectedCustomer(prev => prev ? { ...prev, sarlaftStatus: newStatus } : null);
            const updated = await getCustomerActivities(selectedCustomer.id);
            setCustomerActivities(updated);
        } catch (e) {
            console.error('Error checking SARLAFT:', e);
        } finally {
            setIsCheckingSarlaft(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
            {/* Top Bar */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => router.push('/admin')}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft size={20} className="text-slate-600" />
                            </motion.button>
                            <div>
                                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                                    <span>Biocambio360</span>
                                    <span>•</span>
                                    <span>P1 Comercial</span>
                                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">CRM 360°</span>
                                </div>
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                    Gestión de Clientes & CRM
                                </h1>
                                <p className="text-xs text-slate-500">
                                    {crmCustomers.length} clientes en base de datos · Pipeline de fidelización y recompra
                                </p>
                            </div>
                        </div>

                        {/* Controles de Vista y Sincronización */}
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <button
                                onClick={() => router.push('/admin/informe-ventas')}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-xs font-bold text-indigo-700 transition-colors"
                            >
                                <BarChart3 className="w-3.5 h-3.5" />
                                Ver Informe Ventas (Power BI)
                            </button>

                            <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all ${
                                        viewMode === 'list' ? 'bg-white text-indigo-600 shadow-xs font-black' : 'text-slate-600'
                                    }`}
                                >
                                    <List className="w-3.5 h-3.5" />
                                    Lista
                                </button>
                                <button
                                    onClick={() => setViewMode('pipeline')}
                                    className={`flex items-center gap-1 px-3 py-1 rounded-lg transition-all ${
                                        viewMode === 'pipeline' ? 'bg-white text-indigo-600 shadow-xs font-black' : 'text-slate-600'
                                    }`}
                                >
                                    <Kanban className="w-3.5 h-3.5" />
                                    Pipeline
                                </button>
                            </div>

                            <button
                                onClick={async () => {
                                    setIsSyncing(true);
                                    try {
                                        await syncCustomersFromOrders();
                                        await loadCustomers();
                                    } finally {
                                        setIsSyncing(false);
                                    }
                                }}
                                disabled={isSyncing}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-colors"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
                                {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
                            </button>
                        </div>
                    </div>

                    {/* Filtros de Pipeline y Asesores */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        {/* Buscador */}
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, celular, cédula, ciudad..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
                            />
                        </div>

                        {/* Filtro por Asesor */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500">Asesor:</span>
                            <select
                                value={selectedAdvisor}
                                onChange={(e) => setSelectedAdvisor(e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-hidden focus:border-indigo-500"
                            >
                                <option value="all">Todos los Asesores</option>
                                {ADVISORS.map(adv => (
                                    <option key={adv} value={adv}>{adv}</option>
                                ))}
                                <option value="sin_asignar">Sin Asignar</option>
                            </select>
                        </div>
                    </div>

                    {/* Pills de Etapas CRM (Horizontal scroll) */}
                    <div className="flex items-center gap-1.5 overflow-x-auto mt-3 pb-1 no-scrollbar text-xs">
                        <button
                            onClick={() => setSelectedStage('all')}
                            className={`px-3 py-1 rounded-full font-bold whitespace-nowrap transition-all ${
                                selectedStage === 'all'
                                    ? 'bg-slate-900 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            Todos ({stageCounts.all})
                        </button>
                        {(Object.keys(CRM_STAGE_CONFIG) as CRMStage[]).map(stage => {
                            const conf = CRM_STAGE_CONFIG[stage];
                            const isActive = selectedStage === stage;
                            return (
                                <button
                                    key={stage}
                                    onClick={() => setSelectedStage(stage)}
                                    className={`px-3 py-1 rounded-full font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                        isActive
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : `${conf.bgColor} ${conf.color} hover:opacity-80`
                                    }`}
                                >
                                    <span>{conf.emoji}</span>
                                    <span>{conf.label}</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                        isActive ? 'bg-white/20 text-white font-extrabold' : 'bg-black/5'
                                    }`}>
                                        {stageCounts[stage] || 0}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </header>

            {/* Contenido Principal */}
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">

                {/* VISTA 1: LISTADO */}
                {viewMode === 'list' && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-bold uppercase text-[10px]">
                                        <th className="py-3 px-4">Cliente</th>
                                        <th className="py-3 px-4">Etapa CRM</th>
                                        <th className="py-3 px-4">Asesor Asignado</th>
                                        <th className="py-3 px-4">Contacto</th>
                                        <th className="py-3 px-4">Ubicación</th>
                                        <th className="py-3 px-4 text-right">Pedidos</th>
                                        <th className="py-3 px-4 text-right">Total Gastado</th>
                                        <th className="py-3 px-4 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                    {filteredCustomers.map(customer => {
                                        const stageConf = CRM_STAGE_CONFIG[customer.stage] || CRM_STAGE_CONFIG.first_purchase;
                                        const cleanPhone = customer.celular.replace(/\D/g, '');

                                        return (
                                            <tr
                                                key={customer.id}
                                                onClick={() => handleCustomerClick(customer)}
                                                className="hover:bg-indigo-50/40 cursor-pointer transition-colors"
                                            >
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-xs">
                                                            {customer.nombre.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <span className="font-bold text-slate-900 block">{customer.nombre}</span>
                                                            <span className="text-[10px] text-slate-400">CC {customer.cedula || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${stageConf.bgColor} ${stageConf.color}`}>
                                                        <span>{stageConf.emoji}</span>
                                                        <span>{stageConf.label}</span>
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    {customer.assignedTo ? (
                                                        <span className="inline-flex items-center gap-1 text-slate-900 font-bold text-[11px] bg-slate-100 px-2 py-0.5 rounded-md">
                                                            <UserCheck className="w-3 h-3 text-indigo-600" />
                                                            {customer.assignedTo}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 text-[11px] italic">Sin Asignar</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-slate-600">
                                                    <div>{customer.celular}</div>
                                                    <div className="text-[10px] text-slate-400">{customer.email || '—'}</div>
                                                </td>
                                                <td className="py-3 px-4 text-slate-600">
                                                    {customer.ciudad || '—'}
                                                </td>
                                                <td className="py-3 px-4 text-right font-bold text-slate-900">
                                                    {customer.ordersCount}
                                                </td>
                                                <td className="py-3 px-4 text-right font-black text-indigo-700">
                                                    {formatCurrency(customer.totalSpent)}
                                                </td>
                                                <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <a
                                                        href={`https://wa.me/57${cleanPhone}?text=Hola%20${encodeURIComponent(customer.nombre)}%2C%20te%20saludamos%20de%20Biocambio360`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[10px] transition-colors"
                                                    >
                                                        <MessageCircle className="w-3 h-3 text-emerald-600" />
                                                        WhatsApp
                                                    </a>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {filteredCustomers.length === 0 && !isLoading && (
                                <div className="text-center py-12 text-slate-400 text-xs">
                                    No se encontraron clientes con los filtros seleccionados.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* VISTA 2: PIPELINE KANBAN */}
                {viewMode === 'pipeline' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3 overflow-x-auto pb-6">
                        {(Object.keys(CRM_STAGE_CONFIG) as CRMStage[]).map(stage => {
                            const conf = CRM_STAGE_CONFIG[stage];
                            const stageCustomers = crmCustomers.filter(c => c.stage === stage);

                            return (
                                <div key={stage} className="bg-slate-100/80 rounded-xl p-3 border border-slate-200/80 flex flex-col min-w-[200px]">
                                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                                        <span className="font-black text-xs text-slate-800 flex items-center gap-1">
                                            <span>{conf.emoji}</span>
                                            <span>{conf.label}</span>
                                        </span>
                                        <span className="text-[10px] font-black bg-white px-2 py-0.5 rounded-full text-slate-600 shadow-2xs">
                                            {stageCustomers.length}
                                        </span>
                                    </div>

                                    <div className="space-y-2 flex-1 overflow-y-auto max-h-[600px] no-scrollbar">
                                        {stageCustomers.map(customer => (
                                            <div
                                                key={customer.id}
                                                onClick={() => handleCustomerClick(customer)}
                                                className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs hover:border-indigo-300 hover:shadow-xs cursor-pointer transition-all text-xs"
                                            >
                                                <span className="font-bold text-slate-900 block truncate">{customer.nombre}</span>
                                                <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                                                    <span>{customer.ordersCount} pedidos</span>
                                                    <span className="font-black text-indigo-700">{formatCurrency(customer.totalSpent)}</span>
                                                </div>
                                                {customer.assignedTo && (
                                                    <div className="mt-2 pt-1.5 border-t border-slate-100 text-[10px] text-slate-500 flex items-center gap-1">
                                                        <UserCheck className="w-2.5 h-2.5 text-indigo-600" />
                                                        <span>{customer.assignedTo}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {stageCustomers.length === 0 && (
                                            <div className="text-center py-6 text-slate-400 text-[10px] italic">
                                                Sin clientes en esta etapa
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* ─────────────────────────────────────────────────────────────
                SLIDE-OVER / PANEL LATERAL DE DETALLE DE CLIENTE (CRM 360°)
            ───────────────────────────────────────────────────────────── */}
            <AnimatePresence>
                {selectedCustomer && (
                    <div className="fixed inset-0 z-50 overflow-hidden">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedCustomer(null)}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
                        />

                        <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="w-screen max-w-xl bg-white shadow-2xl flex flex-col"
                            >
                                {/* Header del Panel */}
                                <div className="p-6 bg-slate-900 text-white flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                                CRM_STAGE_CONFIG[selectedCustomer.stage]?.bgColor || 'bg-slate-800'
                                            } ${CRM_STAGE_CONFIG[selectedCustomer.stage]?.color || 'text-white'}`}>
                                                {CRM_STAGE_CONFIG[selectedCustomer.stage]?.emoji} {CRM_STAGE_CONFIG[selectedCustomer.stage]?.label}
                                            </span>
                                            {selectedCustomer.sarlaftStatus === 'verificado' && (
                                                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <Shield className="w-2.5 h-2.5" /> SARLAFT ✓
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="text-xl font-black">{selectedCustomer.nombre}</h2>
                                        <p className="text-xs text-slate-400 mt-0.5">CC {selectedCustomer.cedula || 'No registrada'} · {selectedCustomer.celular}</p>
                                    </div>

                                    <button
                                        onClick={() => setSelectedCustomer(null)}
                                        className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Contenido con Scroll */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
                                    {/* Acciones Rápidas (WhatsApp / Llamar) */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <a
                                            href={`https://wa.me/57${selectedCustomer.celular.replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(selectedCustomer.nombre)}%2C%20te%20saludo%20de%20Biocambio360`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-colors"
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                            Abrir WhatsApp
                                        </a>
                                        <a
                                            href={`tel:${selectedCustomer.celular}`}
                                            className="flex items-center justify-center gap-2 p-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold transition-colors"
                                        >
                                            <Phone className="w-4 h-4 text-slate-600" />
                                            Llamar
                                        </a>
                                    </div>

                                    {/* Métricas Financieras del Cliente */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Gastado</span>
                                            <p className="text-base font-black text-indigo-700 mt-1">{formatCurrency(selectedCustomer.totalSpent)}</p>
                                        </div>
                                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Pedidos</span>
                                            <p className="text-base font-black text-slate-900 mt-1">{selectedCustomer.ordersCount}</p>
                                        </div>
                                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Ticket Prom.</span>
                                            <p className="text-base font-black text-slate-900 mt-1">
                                                {formatCurrency(Math.round(selectedCustomer.totalSpent / Math.max(1, selectedCustomer.ordersCount)))}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Asignación de Asesor & SARLAFT */}
                                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-800">Asesor Comercial Asignado:</span>
                                            <select
                                                value={selectedCustomer.assignedTo || ''}
                                                onChange={(e) => handleAssignAdvisor(e.target.value)}
                                                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-hidden"
                                            >
                                                <option value="">Seleccionar Asesor...</option>
                                                {ADVISORS.map(adv => (
                                                    <option key={adv} value={adv}>{adv}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                                            <div>
                                                <span className="font-bold text-slate-800 block">Validación SARLAFT:</span>
                                                <span className="text-[10px] text-slate-500">Listas restrictivas (OFAC / PEPs)</span>
                                            </div>
                                            <button
                                                onClick={handleRunSarlaft}
                                                disabled={isCheckingSarlaft}
                                                className="px-3 py-1 bg-white border border-slate-300 hover:border-indigo-500 rounded-lg font-bold text-[11px] text-slate-700 transition-colors shadow-2xs"
                                            >
                                                {isCheckingSarlaft ? 'Consultando...' : 'Verificar Documento'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Timeline de Actividades CRM */}
                                    <div>
                                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">
                                            Timeline de Actividades CRM ({customerActivities.length})
                                        </h3>

                                        {/* Input para agregar nota */}
                                        <div className="flex gap-2 mb-4">
                                            <input
                                                type="text"
                                                placeholder="Registrar llamada, nota o compromiso..."
                                                value={newNoteText}
                                                onChange={(e) => setNewNoteText(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                                                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                                            />
                                            <button
                                                onClick={handleAddNote}
                                                disabled={isSavingNote || !newNoteText.trim()}
                                                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold"
                                            >
                                                <Send className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        {/* Lista de actividades */}
                                        <div className="space-y-2">
                                            {customerActivities.map(act => (
                                                <div key={act.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5">
                                                    <span className="text-base">{CRM_ACTIVITY_ICONS[act.type] || '📝'}</span>
                                                    <div className="flex-1">
                                                        <p className="text-slate-800 text-xs font-medium">{act.description}</p>
                                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                                                            <span>{act.authorName || 'Sistema'}</span>
                                                            <span>•</span>
                                                            <span>{act.createdAt?.seconds ? format(new Date(act.createdAt.seconds * 1000), 'd MMM yyyy, h:mm a', { locale: es }) : 'Reciente'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            {customerActivities.length === 0 && (
                                                <p className="text-slate-400 text-center py-4 italic text-[11px]">
                                                    No hay actividades registradas aún. ¡Escribe la primera nota arriba!
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Historial de Pedidos */}
                                    <div>
                                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">
                                            Historial de Pedidos ({customerOrders.length})
                                        </h3>

                                        <div className="space-y-2">
                                            {customerOrders.map(order => (
                                                <div key={order.id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-bold text-slate-900">#{order.id.slice(-6).toUpperCase()}</span>
                                                        <span className="font-black text-indigo-700">{formatCurrency(order.total)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-[10px] text-slate-500">
                                                        <span>{order.productos?.length || 0} producto(s)</span>
                                                        <span>{order.createdAt ? format(parseSafeDate(order.createdAt), 'dd MMM yyyy', { locale: es }) : 'N/A'}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
