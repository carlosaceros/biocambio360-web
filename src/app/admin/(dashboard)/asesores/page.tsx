'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Award,
    Target,
    Users,
    DollarSign,
    Phone,
    MessageCircle,
    ArrowLeft,
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    Calendar,
    Sparkles,
    ShoppingBag,
    Send,
    Zap,
    Plus,
    Truck,
    Layers,
    Clock,
    FileSpreadsheet,
    Shield,
    Bookmark,
    Trash2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/checkout-utils';
import {
    getAdvisorPortfolio,
    AdvisorPortfolioSummary,
    DEFAULT_ADVISOR_GOALS
} from '@/lib/advisors-service';
import { CustomerCRM } from '@/types/crm';
import { addCRMActivity } from '@/lib/crm-service';
import { useAuth } from '@/lib/auth-context';
import FastOrderModal from '@/components/admin/FastOrderModal';
import { ORDER_STATUS_CONFIG, OrderStatus, Order } from '@/types/order';
import { subscribeToAdminUsers } from '@/lib/users-service';
import { getDraftOrdersByAdvisor, discardDraftOrder } from '@/lib/orders-service';

const DEFAULT_ADVISORS = ['Karen', 'Katherine', 'Andrea', 'Diego', 'Laura', 'Camilo'];

export default function AsesoresCockpitPage() {
    const router = useRouter();
    const { user, userProfile, role } = useAuth();

    // Si el usuario tiene rol asesor, fijar su nombre automáticamente
    const isRestrictedAdvisor = role === 'asesor';
    const profileAdvisorName = userProfile?.asesorAsignado || userProfile?.nombre || user?.displayName;
    const initialAdvisor = isRestrictedAdvisor
        ? (profileAdvisorName || 'Karen')
        : (profileAdvisorName || 'Karen');

    const [selectedAdvisor, setSelectedAdvisor] = useState<string>(initialAdvisor);
    const [advisorsList, setAdvisorsList] = useState<string[]>(DEFAULT_ADVISORS);
    const [portfolio, setPortfolio] = useState<AdvisorPortfolioSummary | null>(null);
    const [draftOrders, setDraftOrders] = useState<(Order & { id: string })[]>([]);
    const [selectedDraftForModal, setSelectedDraftForModal] = useState<(Order & { id: string }) | null>(null);
    const [isDiscardingDraft, setIsDiscardingDraft] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [quickNoteText, setQuickNoteText] = useState<{ [key: string]: string }>({});

    // Fast order modal & tab state
    const [isFastOrderOpen, setIsFastOrderOpen] = useState(false);
    const [preloadedClientForOrder, setPreloadedClientForOrder] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'tareas' | 'pedidos' | 'borradores'>('tareas');

    // Cargar asesores dinámicamente desde admin_users
    useEffect(() => {
        const unsubscribe = subscribeToAdminUsers((users) => {
            const advisorNames = users
                .map(u => (u.asesorAsignado || u.nombre)?.trim())
                .filter(Boolean) as string[];

            setAdvisorsList(prev => {
                const combined = Array.from(new Set([...DEFAULT_ADVISORS, ...advisorNames]));
                return combined;
            });
        });
        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, []);

    // Sincronizar asesor asignado si carga el perfil después
    useEffect(() => {
        const activeName = userProfile?.asesorAsignado || userProfile?.nombre || user?.displayName;
        if (activeName) {
            setAdvisorsList(prev => Array.from(new Set([...prev, activeName.trim()])));
            if (isRestrictedAdvisor || selectedAdvisor === 'Karen') {
                setSelectedAdvisor(activeName.trim());
            }
        }
    }, [isRestrictedAdvisor, userProfile, user]);

    useEffect(() => {
        loadData(selectedAdvisor);
    }, [selectedAdvisor]);

    // Atajo de teclado: Ctrl + N o Cmd + N para nuevo pedido rápido
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                setPreloadedClientForOrder(null);
                setIsFastOrderOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const loadData = async (advName: string) => {
        setIsLoading(true);
        try {
            const [data, drafts] = await Promise.all([
                getAdvisorPortfolio(advName),
                getDraftOrdersByAdvisor(advName)
            ]);
            setPortfolio(data);
            setDraftOrders(drafts);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendQuickNote = async (customerId: string) => {
        const text = quickNoteText[customerId];
        if (!text || !text.trim()) return;

        try {
            await addCRMActivity({
                customerId,
                type: 'call',
                description: text.trim(),
                authorName: selectedAdvisor,
                authorEmail: userProfile?.email || `${selectedAdvisor.toLowerCase()}@biocambio360.com`,
            });
            setQuickNoteText(prev => ({ ...prev, [customerId]: '' }));
            alert('Llamada/compromiso registrado en el CRM.');
        } catch (e) {
            console.error('Error registrando nota:', e);
        }
    };

    const handleOpenOrderForClient = (client: CustomerCRM) => {
        setSelectedDraftForModal(null);
        setPreloadedClientForOrder({
            nombre: client.nombre,
            celular: client.celular,
            cedula: client.cedula,
            direccion: client.direccion,
            ciudad: client.ciudad,
            departamento: client.departamento
        });
        setIsFastOrderOpen(true);
    };

    const handleResumeDraft = (draft: Order & { id: string }) => {
        setPreloadedClientForOrder(null);
        setSelectedDraftForModal(draft);
        setIsFastOrderOpen(true);
    };

    const handleDiscardDraft = async (draftId: string) => {
        if (!window.confirm('¿Deseas descartar este borrador? Se registrará como cancelado en la auditoría sin alterar inventario.')) {
            return;
        }

        setIsDiscardingDraft(draftId);
        try {
            await discardDraftOrder(draftId, {
                email: user?.email || undefined,
                nombre: selectedAdvisor,
                role: role || 'asesor'
            });
            await loadData(selectedAdvisor);
        } catch (err) {
            console.error('Error al descartar borrador:', err);
            alert('Error al descartar el borrador. Intenta nuevamente.');
        } finally {
            setIsDiscardingDraft(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-28 relative">
            {/* Top Bar */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/admin')}
                            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-600 cursor-pointer"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider">
                                <span>Biocambio360</span>
                                <span>•</span>
                                <span>Espacio Comercial</span>
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Zap size={10} /> Fast Sales System
                                </span>
                            </div>
                            <h1 className="text-xl font-black text-slate-900 mt-0.5">
                                Cockpit del Asesor Comercial
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Selector de Asesor Activo (Oculto o bloqueado para rol asesor individual) */}
                        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                            <span className="text-xs font-bold text-slate-500 pl-2">Asesor:</span>
                            {isRestrictedAdvisor ? (
                                <span className="px-3 py-1.5 bg-white text-indigo-700 font-black text-xs rounded-xl shadow-xs">
                                    {selectedAdvisor}
                                </span>
                            ) : (
                                <div className="flex gap-1 overflow-x-auto no-scrollbar">
                                    {advisorsList.map(adv => (
                                        <button
                                            key={adv}
                                            onClick={() => setSelectedAdvisor(adv)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                                selectedAdvisor === adv
                                                    ? 'bg-white text-indigo-600 shadow-xs'
                                                    : 'text-slate-600 hover:text-slate-900'
                                            }`}
                                        >
                                            {adv}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Botón Acción Rápida Header */}
                        <button
                            onClick={() => {
                                setPreloadedClientForOrder(null);
                                setIsFastOrderOpen(true);
                            }}
                            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs hover:shadow-md transition-all cursor-pointer"
                        >
                            <Zap size={14} className="text-amber-300" />
                            <span>+ Nuevo Pedido</span>
                            <span className="text-[10px] bg-indigo-800 text-indigo-200 px-1.5 py-0.5 rounded-md">Ctrl+N</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Contenido Principal */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
                {/* Banner de Metas & Comisiones */}
                {portfolio && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                        {/* Meta Mensual & Cumplimiento */}
                        <div className="sm:col-span-2 bg-gradient-to-br from-indigo-900 to-slate-900 p-5 rounded-2xl text-white shadow-sm flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
                                        Meta Mensual ($30M)
                                    </span>
                                    <span className="text-xs text-indigo-200 font-mono font-bold">
                                        {portfolio.porcentajeCumplimiento}%
                                    </span>
                                </div>
                                <p className="text-3xl font-black text-amber-400 mt-1">
                                    {formatCurrency(portfolio.ventasAcumuladasMes)}
                                </p>
                                <p className="text-xs text-slate-300 mt-0.5">
                                    {portfolio.pedidosMesCount} pedidos cerrados este mes
                                </p>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2.5 mt-4 overflow-hidden">
                                <div
                                    className="bg-amber-400 h-full rounded-full transition-all"
                                    style={{ width: `${Math.min(100, portfolio.porcentajeCumplimiento)}%` }}
                                />
                            </div>
                        </div>

                        {/* Comisiones Devengadas */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase">Comisiones Mes</span>
                                <p className="text-2xl font-black text-emerald-600 mt-1">
                                    {formatCurrency(portfolio.comisionesEstimadasCOP)}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {portfolio.porcentajeCumplimiento >= 100 ? 'Bono 3.5% Superada' : 'Tasa Base 2.0%'}
                                </p>
                            </div>
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-md w-fit">
                                {portfolio.porcentajeCumplimiento >= 100 ? '🎉 ¡Meta Superada!' : 'En Carrera Comercial'}
                            </span>
                        </div>

                        {/* Pedidos Hoy */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase">Cierres de Hoy</span>
                                <p className="text-2xl font-black text-indigo-600 mt-1">
                                    {portfolio.pedidosHoyCount}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Ticket Promedio: {formatCurrency(portfolio.ticketPromedioMes)}
                                </p>
                            </div>
                            <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-2 py-1 rounded-md w-fit">
                                Actividad en Caliente
                            </span>
                        </div>

                        {/* Cartera Asignada */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase">Clientes Cartera</span>
                                <p className="text-2xl font-black text-slate-900 mt-1">
                                    {portfolio.totalClientes}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {portfolio.clientesNuevosEsteMes} nuevos este mes
                                </p>
                            </div>
                            <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-2 py-1 rounded-md w-fit">
                                Fidelización Activa
                            </span>
                        </div>

                        {/* Clientes en Riesgo */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase">En Riesgo Fuga</span>
                                <p className="text-2xl font-black text-rose-600 mt-1">
                                    {portfolio.clientesEnRiesgo}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Sin compra en +45d
                                </p>
                            </div>
                            <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-2 py-1 rounded-md w-fit">
                                Llamar Prioritario
                            </span>
                        </div>
                    </div>
                )}

                {/* Selector de Pestañas: Tareas Diarias vs Mis Pedidos del Mes */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setActiveTab('tareas')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                                activeTab === 'tareas'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                        >
                            <Users size={14} />
                            <span>Clientes Prioritarios & Tareas ({portfolio?.clientesPrioritarios.length || 0})</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('pedidos')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                                activeTab === 'pedidos'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                        >
                            <ShoppingBag size={14} />
                            <span>Mis Pedidos del Mes ({portfolio?.pedidosMesCount || 0})</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('borradores')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                                activeTab === 'borradores'
                                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                        >
                            <Bookmark size={14} className={activeTab === 'borradores' ? 'text-slate-950' : 'text-amber-500'} />
                            <span>Borradores & Cotizaciones ({draftOrders.length})</span>
                            {draftOrders.length > 0 && (
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                                    activeTab === 'borradores' ? 'bg-slate-950 text-amber-300' : 'bg-amber-100 text-amber-800'
                                }`}>
                                    {draftOrders.length}
                                </span>
                            )}
                        </button>
                    </div>

                    <span className="text-xs text-slate-500 hidden sm:inline">
                        Sincronización en tiempo real con bodega y despacho
                    </span>
                </div>

                {/* TAB 1: Clientes Prioritarios y Recompra */}
                {activeTab === 'tareas' && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-base font-black text-slate-900">
                                    Clientes Prioritarios de {selectedAdvisor} (Acción Inmediata)
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Clientes en ciclo de recompra o en riesgo asignados a tu cartera. Crea un pedido en 1 clic durante la llamada.
                                </p>
                            </div>
                            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                                {portfolio?.clientesPrioritarios.length || 0} pendientes
                            </span>
                        </div>

                        <div className="space-y-3">
                            {portfolio?.clientesPrioritarios.map(client => {
                                const cleanPhone = client.celular.replace(/\D/g, '');
                                const whatsappMsg = encodeURIComponent(
                                    `Hola ${client.nombre}, te saluda ${selectedAdvisor} de Biocambio360. Vemos que tu último pedido fue de productos concentrados. ¿Cómo va tu stock de detergente? Recuerda que tenemos envío subsidiado para ti.`
                                );

                                return (
                                    <div
                                        key={client.id}
                                        className="p-4 bg-slate-50/75 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-indigo-200 transition-colors"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm text-slate-900">{client.nombre}</span>
                                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                                                    {client.stage}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500">
                                                Tel: {client.celular} · {client.ciudad || 'Colombia'} · {client.ordersCount} pedidos ({formatCurrency(client.totalSpent)})
                                            </p>
                                        </div>

                                        {/* Acciones de Contacto y Creación Rápida */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <button
                                                onClick={() => handleOpenOrderForClient(client)}
                                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black shadow-2xs transition-all cursor-pointer"
                                                title="Abrir formulario rápido con los datos de este cliente"
                                            >
                                                <Zap size={13} className="text-amber-300" />
                                                Crear Pedido
                                            </button>

                                            <div className="flex items-center gap-1.5">
                                                <input
                                                    type="text"
                                                    placeholder="Nota de llamada..."
                                                    value={quickNoteText[client.id] || ''}
                                                    onChange={(e) => setQuickNoteText({ ...quickNoteText, [client.id]: e.target.value })}
                                                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs w-44 focus:outline-hidden"
                                                />
                                                <button
                                                    onClick={() => handleSendQuickNote(client.id)}
                                                    className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                                                    title="Guardar nota en CRM"
                                                >
                                                    <Send size={14} />
                                                </button>
                                            </div>

                                            <a
                                                href={`https://wa.me/57${cleanPhone}?text=${whatsappMsg}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                                            >
                                                <MessageCircle size={14} />
                                                WhatsApp
                                            </a>

                                            <a
                                                href={`tel:${client.celular}`}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                                            >
                                                <Phone size={14} />
                                                Llamar
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}

                            {(!portfolio?.clientesPrioritarios || portfolio.clientesPrioritarios.length === 0) && (
                                <div className="text-center py-8 text-slate-400 text-xs italic">
                                    No hay tareas pendientes para este asesor en este momento.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 2: Mis Pedidos del Mes (Histórico Real de Cierres) */}
                {activeTab === 'pedidos' && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-base font-black text-slate-900">
                                    Pedidos Cerrados por {selectedAdvisor} este Mes
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Total acumulado: {formatCurrency(portfolio?.ventasAcumuladasMes || 0)} · Comisión estimada: {formatCurrency(portfolio?.comisionesEstimadasCOP || 0)}
                                </p>
                            </div>

                            <button
                                onClick={() => {
                                    setPreloadedClientForOrder(null);
                                    setIsFastOrderOpen(true);
                                }}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer"
                            >
                                <Plus size={14} />
                                <span>Nuevo Pedido</span>
                            </button>
                        </div>

                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                            <table className="w-full text-left text-xs text-slate-600">
                                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                                    <tr>
                                        <th className="px-3.5 py-3"># Orden / Fecha</th>
                                        <th className="px-3.5 py-3">Cliente</th>
                                        <th className="px-3.5 py-3">Destino</th>
                                        <th className="px-3.5 py-3">Canal</th>
                                        <th className="px-3.5 py-3 text-right">Total</th>
                                        <th className="px-3.5 py-3">Medio de Pago</th>
                                        <th className="px-3.5 py-3">Estado Logístico</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {portfolio?.pedidosRecientes.map(ord => {
                                        const cfg = ORDER_STATUS_CONFIG[ord.status as OrderStatus] || {
                                            label: ord.status,
                                            bgColor: 'bg-slate-100',
                                            color: 'text-slate-700'
                                        };

                                        const dateStr = ord.createdAt?.toMillis?.()
                                            ? new Date(ord.createdAt.toMillis()).toLocaleString('es-CO', {
                                                  day: '2-digit',
                                                  month: 'short',
                                                  hour: '2-digit',
                                                  minute: '2-digit'
                                              })
                                            : 'Hoy';

                                        return (
                                            <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-3.5 py-3">
                                                    <div className="font-mono font-bold text-slate-900">
                                                        #{ord.id.slice(-8)}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                                        <Clock size={10} />
                                                        {dateStr}
                                                    </div>
                                                </td>
                                                <td className="px-3.5 py-3">
                                                    <div className="font-bold text-slate-900">
                                                        {ord.cliente?.nombre || 'Cliente'}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">
                                                        Tel: {ord.cliente?.celular}
                                                    </div>
                                                </td>
                                                <td className="px-3.5 py-3">
                                                    <div>{ord.cliente?.ciudad || 'Bogotá'}</div>
                                                    <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                                        {ord.cliente?.direccion}
                                                    </div>
                                                </td>
                                                <td className="px-3.5 py-3">
                                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md uppercase">
                                                        {ord.canal || 'call_center'}
                                                    </span>
                                                </td>
                                                <td className="px-3.5 py-3 text-right">
                                                    <span className="font-black text-slate-900 text-sm">
                                                        {formatCurrency(ord.total || 0)}
                                                    </span>
                                                </td>
                                                <td className="px-3.5 py-3">
                                                    <span className="text-[11px] font-semibold text-slate-700 uppercase">
                                                        {ord.metodoPago}
                                                    </span>
                                                </td>
                                                <td className="px-3.5 py-3">
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${cfg.bgColor} ${cfg.color}`}>
                                                        {cfg.label}
                                                    </span>
                                                    {ord.alertaDireccionReciente && (
                                                        <span className="ml-1 text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                                                            ⚠️ &lt;30d
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {(!portfolio?.pedidosRecientes || portfolio.pedidosRecientes.length === 0) && (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic">
                                                Aún no se registran pedidos este mes para este asesor. ¡Haz clic en "Nuevo Pedido" para comenzar!
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 3: Borradores & Cotizaciones Pendientes */}
                {activeTab === 'borradores' && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-black text-slate-900">
                                        Borradores & Cotizaciones de {selectedAdvisor}
                                    </h2>
                                    <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-300">
                                        Stock Reservado: NO
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Cotizaciones en caliente guardadas durante llamadas o chats. No comprometen inventario hasta que el cliente confirme.
                                </p>
                            </div>

                            <button
                                onClick={() => {
                                    setSelectedDraftForModal(null);
                                    setPreloadedClientForOrder(null);
                                    setIsFastOrderOpen(true);
                                }}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 cursor-pointer"
                            >
                                <Plus size={14} />
                                <span>Nueva Cotización</span>
                            </button>
                        </div>

                        {/* Grid de Tarjetas de Borradores */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                            {draftOrders.map(draft => {
                                const cleanPhone = (draft.cliente?.celular || '').replace(/\D/g, '');
                                const totalFormatted = formatCurrency(draft.total || 0);
                                const dateStr = draft.createdAt?.toMillis?.()
                                    ? new Date(draft.createdAt.toMillis()).toLocaleString('es-CO', {
                                          day: '2-digit',
                                          month: 'short',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                      })
                                    : 'Reciente';

                                const itemsSummary = (draft.productos || [])
                                    .map(p => `${p.cantidad}x ${p.product?.nombre || 'Producto'} (${p.size})`)
                                    .join('\n• ');

                                const whatsappFollowupMsg = encodeURIComponent(
                                    `Hola ${draft.cliente?.nombre || ''}, te saluda ${selectedAdvisor} de Biocambio360. Te escribo para retomar la cotización #${draft.id.slice(-8)} de los productos de limpieza:\n• ${itemsSummary}\n\nTotal con envío: ${totalFormatted}. ¿Confirmamos el despacho para que te llegue pronto?`
                                );

                                return (
                                    <div
                                        key={draft.id}
                                        className="bg-slate-50 rounded-xl border border-amber-200/80 p-4 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none overflow-hidden">
                                            <div className="bg-amber-400 text-slate-950 font-black text-[9px] py-0.5 text-center transform rotate-45 translate-x-4 translate-y-2 uppercase shadow-2xs">
                                                Draft
                                            </div>
                                        </div>

                                        <div className="space-y-2.5">
                                            <div className="flex items-start justify-between pr-8">
                                                <div>
                                                    <h3 className="font-bold text-sm text-slate-900">
                                                        {draft.cliente?.nombre || 'Cliente sin nombre'}
                                                    </h3>
                                                    <p className="text-xs text-slate-500">
                                                        📞 {draft.cliente?.celular || 'Sin celular'} · {draft.cliente?.ciudad || 'Colombia'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Motivo del borrador */}
                                            <div className="bg-white border border-amber-200 rounded-lg p-2 text-xs">
                                                <span className="text-[10px] uppercase font-bold text-amber-800 block">
                                                    Motivo de pausa:
                                                </span>
                                                <p className="text-xs text-slate-700 font-medium">
                                                    {draft.motivoBorrador || 'Cotización en llamada / Espera confirmación'}
                                                </p>
                                            </div>

                                            {/* Productos */}
                                            <div className="space-y-1">
                                                <span className="text-[10px] uppercase font-bold text-slate-400">
                                                    Productos ({draft.productos?.length || 0}):
                                                </span>
                                                <div className="max-h-24 overflow-y-auto space-y-1 text-xs text-slate-700 bg-white/70 p-2 rounded-lg border border-slate-200/60">
                                                    {draft.productos?.map((p, pIdx) => (
                                                        <div key={pIdx} className="flex justify-between items-baseline gap-2">
                                                            <span className="truncate">
                                                                {p.cantidad}x {p.product?.nombre || 'Producto'} ({p.size})
                                                            </span>
                                                            <span className="font-bold text-slate-900 shrink-0">
                                                                {formatCurrency(p.price * p.cantidad)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-xs">
                                                <span className="text-slate-400 font-mono text-[11px]">{dateStr}</span>
                                                <div className="text-right">
                                                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Cotizado</span>
                                                    <span className="text-base font-black text-slate-900">{totalFormatted}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Botones de Acción */}
                                        <div className="flex items-center gap-2 pt-4 mt-2 border-t border-slate-200">
                                            <button
                                                onClick={() => handleResumeDraft(draft)}
                                                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                                                title="Cargar pedido en modal para cerrar la venta"
                                            >
                                                <Zap size={14} className="text-amber-300" />
                                                <span>Retomar & Cerrar</span>
                                            </button>

                                            <a
                                                href={`https://wa.me/57${cleanPhone}?text=${whatsappFollowupMsg}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition-colors cursor-pointer"
                                                title="Enviar seguimiento por WhatsApp"
                                            >
                                                <MessageCircle size={16} />
                                            </a>

                                            <button
                                                disabled={isDiscardingDraft === draft.id}
                                                onClick={() => handleDiscardDraft(draft.id)}
                                                className="p-2 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                                title="Descartar borrador"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {draftOrders.length === 0 && (
                            <div className="text-center py-12 text-slate-400 text-xs italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                No tienes borradores o cotizaciones pendientes de cierre. ¡Todas tus oportunidades están al día!
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* BOTÓN FLOTANTE PERMANENTE (FAB) PARA ASESORES COMERCIALES */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                    setSelectedDraftForModal(null);
                    setPreloadedClientForOrder(null);
                    setIsFastOrderOpen(true);
                }}
                className="fixed bottom-6 right-6 z-40 px-5 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-2xl shadow-xl hover:shadow-2xl font-black text-sm flex items-center gap-2.5 transition-all cursor-pointer border border-indigo-400/30"
                title="Crear Pedido Rápido de Call Center / WhatsApp (Ctrl+N)"
            >
                <div className="p-1 bg-amber-400 text-slate-900 rounded-lg">
                    <Zap size={16} />
                </div>
                <span>⚡ Nuevo Pedido Rápido</span>
                <span className="text-[10px] bg-indigo-950/60 text-indigo-200 px-1.5 py-0.5 rounded-md font-mono">
                    Ctrl+N
                </span>
            </motion.button>

            {/* MODAL DE ENTRADA RÁPIDA DE PEDIDOS */}
            <FastOrderModal
                isOpen={isFastOrderOpen}
                onClose={() => {
                    setIsFastOrderOpen(false);
                    setSelectedDraftForModal(null);
                }}
                initialAdvisorName={selectedAdvisor}
                draftOrder={selectedDraftForModal}
                preloadedCustomer={preloadedClientForOrder}
                onOrderCreated={() => {
                    // Recargar datos inmediatamente al crear o cerrar la orden
                    loadData(selectedAdvisor);
                }}
            />
        </div>
    );
}
