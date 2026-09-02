'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Gift,
    Award,
    DollarSign,
    TrendingUp,
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    Shield,
    Sliders,
    MessageCircle,
    ArrowLeft,
    RefreshCw,
    ExternalLink,
    AlertCircle,
    FileSpreadsheet,
    Wallet
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { 
    ReferralProfile, 
    ReferralTransaction, 
    ReferralConfig, 
    ReferralTier 
} from '@/types/referral';
import { 
    getAllReferralProfiles, 
    getAllReferralTransactions, 
    getReferralConfig, 
    saveReferralConfig, 
    updateReferralProfileAdmin 
} from '@/lib/referrals-service';
import { formatCurrency } from '@/lib/checkout-utils';

export default function AdminReferidosPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'embajadores' | 'transacciones' | 'configuracion'>('dashboard');
    const [profiles, setProfiles] = useState<ReferralProfile[]>([]);
    const [transactions, setTransactions] = useState<ReferralTransaction[]>([]);
    const [config, setConfig] = useState<ReferralConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal de edición manual de embajador
    const [selectedProfile, setSelectedProfile] = useState<ReferralProfile | null>(null);
    const [editBalance, setEditBalance] = useState(0);
    const [editTier, setEditTier] = useState<ReferralTier>('referidor');
    const [editIsActive, setEditIsActive] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);

    // Guardado de configuración
    const [savingConfig, setSavingConfig] = useState(false);
    const [configMessage, setConfigMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [profs, txs, cfg] = await Promise.all([
                getAllReferralProfiles(),
                getAllReferralTransactions(),
                getReferralConfig()
            ]);
            setProfiles(profs);
            setTransactions(txs);
            setConfig(cfg);
        } catch (e) {
            console.error('Error cargando datos de referidos:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // KPIs calculados
    const totalReferredOrders = transactions.length;
    const deliveredTransactions = transactions.filter(t => t.status === 'approved');
    const pendingTransactions = transactions.filter(t => t.status === 'pending');
    
    const totalSalesReferred = transactions.reduce((sum, t) => sum + (t.orderTotal || 0), 0);
    const totalRewardsPaid = deliveredTransactions.reduce((sum, t) => sum + (t.rewardAmount || 0), 0);
    const totalDiscountsGiven = transactions.reduce((sum, t) => sum + (t.friendDiscountAmount || 0), 0);
    
    // CAC Estimado del canal referidos (premios pagados + descuentos / clientes nuevos)
    const newCustomersCount = profiles.reduce((sum, p) => sum + (p.totalDeliveredOrders || 0), 0);
    const totalProgramCost = totalRewardsPaid + totalDiscountsGiven;
    const cacReferidos = newCustomersCount > 0 ? Math.round(totalProgramCost / newCustomersCount) : 0;

    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!config) return;
        setSavingConfig(true);
        setConfigMessage(null);
        try {
            await saveReferralConfig(config);
            setConfigMessage({ type: 'ok', text: '✅ Configuración del programa de referidos guardada con éxito.' });
        } catch (err: any) {
            setConfigMessage({ type: 'err', text: `❌ Error al guardar: ${err.message}` });
        } finally {
            setSavingConfig(false);
            setTimeout(() => setConfigMessage(null), 4000);
        }
    };

    const handleOpenProfileModal = (p: ReferralProfile) => {
        setSelectedProfile(p);
        setEditBalance(p.balanceAvailable || 0);
        setEditTier(p.tier || 'referidor');
        setEditIsActive(p.isActive !== false);
    };

    const handleSaveProfileUpdates = async () => {
        if (!selectedProfile) return;
        setSavingProfile(true);
        try {
            await updateReferralProfileAdmin(selectedProfile.id, {
                balanceAvailable: Number(editBalance),
                tier: editTier,
                isActive: editIsActive
            });
            // Refrescar local
            setProfiles(prev => prev.map(p => p.id === selectedProfile.id ? {
                ...p,
                balanceAvailable: Number(editBalance),
                tier: editTier,
                isActive: editIsActive
            } : p));
            setSelectedProfile(null);
        } catch (err) {
            alert('Error al actualizar el perfil.');
        } finally {
            setSavingProfile(false);
        }
    };

    const filteredProfiles = profiles.filter(p => {
        const q = searchQuery.toLowerCase();
        return p.nombre.toLowerCase().includes(q) ||
               p.celular.includes(q) ||
               p.code.toLowerCase().includes(q) ||
               p.tier.toLowerCase().includes(q);
    });

    const getTierBadge = (tier: ReferralTier) => {
        switch (tier) {
            case 'embajador':
                return { label: 'Embajador VIP 🏆', color: 'bg-amber-50 text-amber-800 border-amber-300' };
            case 'aliado':
                return { label: 'Aliado Frecuente ⭐', color: 'bg-indigo-50 text-indigo-800 border-indigo-300' };
            default:
                return { label: 'Referidor 🌱', color: 'bg-emerald-50 text-emerald-800 border-emerald-300' };
        }
    };

    const getTxStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return { label: 'Aprobado / Entregado', color: 'bg-emerald-100 text-emerald-800' };
            case 'rejected':
                return { label: 'Rechazado / Cancelado', color: 'bg-rose-100 text-rose-800' };
            default:
                return { label: 'Pendiente de Entrega', color: 'bg-amber-100 text-amber-800' };
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 pb-12 font-sans">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-20 shadow-xs">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/admin')}
                            className="p-2 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors cursor-pointer"
                            title="Volver al inicio"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-black text-gray-900">
                                    Comunidad & Plan de Referidos
                                </h1>
                                <span className="bg-purple-100 text-purple-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-purple-200">
                                    Fidelización 360
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 font-medium">
                                Red de clientes recomendadores, aliados comerciales y embajadores B2B
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            onClick={loadData}
                            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            Actualizar
                        </button>

                        <a
                            href="/comunidad"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-black rounded-xl flex items-center gap-1.5 transition-colors"
                        >
                            <ExternalLink size={14} />
                            Ver Portal Clientes
                        </a>
                    </div>
                </div>

                {/* Tabs */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-6 border-t border-gray-100 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`py-3 text-xs sm:text-sm font-black border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                            activeTab === 'dashboard'
                                ? 'border-purple-600 text-purple-700'
                                : 'border-transparent text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <TrendingUp size={16} />
                        Dashboard & Métricas
                    </button>
                    <button
                        onClick={() => setActiveTab('embajadores')}
                        className={`py-3 text-xs sm:text-sm font-black border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                            activeTab === 'embajadores'
                                ? 'border-purple-600 text-purple-700'
                                : 'border-transparent text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <Users size={16} />
                        Embajadores & Aliados ({profiles.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('transacciones')}
                        className={`py-3 text-xs sm:text-sm font-black border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                            activeTab === 'transacciones'
                                ? 'border-purple-600 text-purple-700'
                                : 'border-transparent text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <Gift size={16} />
                        Historial de Ventas Referidas ({transactions.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('configuracion')}
                        className={`py-3 text-xs sm:text-sm font-black border-b-2 flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                            activeTab === 'configuracion'
                                ? 'border-purple-600 text-purple-700'
                                : 'border-transparent text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <Sliders size={16} />
                        Reglas & Configuración
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                {/* 1. TAB: DASHBOARD & METRICAS */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-6">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                                <span className="text-[11px] font-black uppercase text-gray-400">Ventas Referidas</span>
                                <p className="text-2xl sm:text-3xl font-black text-gray-900 mt-1">
                                    {formatCurrency(totalSalesReferred)}
                                </p>
                                <p className="text-xs text-emerald-600 font-bold mt-1">
                                    {totalReferredOrders} pedidos generados
                                </p>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                                <span className="text-[11px] font-black uppercase text-gray-400">Embajadores Activos</span>
                                <p className="text-2xl sm:text-3xl font-black text-indigo-600 mt-1">
                                    {profiles.filter(p => p.isActive !== false).length}
                                </p>
                                <p className="text-xs text-gray-500 font-medium mt-1">
                                    {profiles.filter(p => p.tier === 'embajador').length} en Nivel VIP
                                </p>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                                <span className="text-[11px] font-black uppercase text-gray-400">Pasivo Saldo Circulante</span>
                                <p className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">
                                    {formatCurrency(profiles.reduce((sum, p) => sum + (p.balanceAvailable || 0), 0))}
                                </p>
                                <p className="text-xs text-amber-600 font-bold mt-1">
                                    {formatCurrency(profiles.reduce((sum, p) => sum + (p.balancePending || 0), 0))} pendiente
                                </p>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                                <span className="text-[11px] font-black uppercase text-gray-400">CAC Promedio Referido</span>
                                <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
                                    {formatCurrency(cacReferidos)}
                                </p>
                                <p className="text-xs text-emerald-700 font-bold mt-1">
                                    Vs Meta Ads (~$25.000 COP)
                                </p>
                            </div>
                        </div>

                        {/* Top Embajadores & Diagnóstico Financiero */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-200 shadow-xs">
                                <h3 className="text-base font-black text-gray-900 mb-4 flex items-center justify-between">
                                    <span>🏆 Top 5 Embajadores con Mayor Impacto</span>
                                    <button
                                        onClick={() => setActiveTab('embajadores')}
                                        className="text-xs text-purple-600 hover:text-purple-800 font-bold"
                                    >
                                        Ver todos →
                                    </button>
                                </h3>

                                <div className="divide-y divide-gray-100">
                                    {profiles.slice(0, 5).map((p, idx) => (
                                        <div key={p.id} className="py-3.5 flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-800 text-xs font-black flex items-center justify-center">
                                                    {idx + 1}
                                                </span>
                                                <div>
                                                    <p className="font-bold text-sm text-gray-900">{p.nombre}</p>
                                                    <p className="text-xs text-gray-500 font-mono">
                                                        Código: <strong className="text-purple-700">{p.code}</strong> • {p.celular}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <p className="font-black text-sm text-gray-900">
                                                    {formatCurrency(p.totalSalesGenerated || 0)}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {p.totalDeliveredOrders || 0} compras entregadas
                                                </p>
                                            </div>
                                        </div>
                                    ))}

                                    {profiles.length === 0 && (
                                        <div className="py-8 text-center text-gray-400 text-xs">
                                            Aún no hay embajadores registrados en el sistema.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Resumen Financiero Tributario */}
                            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col justify-between">
                                <div>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-indigo-300 bg-indigo-500/20 px-2.5 py-1 rounded-full mb-3">
                                        <Shield size={12} /> Blindaje Financiero Colombia
                                    </span>
                                    <h4 className="text-lg font-black mb-2">Políticas Contables Activas</h4>
                                    <p className="text-xs text-gray-300 leading-relaxed mb-4">
                                        Conforme a la matriz de viabilidad financiera, los incentivos se emiten como descuentos comerciales condicionados en especie o cupones de compra para garantizar deducibilidad y evitar impacto negativo en IVA o flujo de caja.
                                    </p>
                                    <div className="space-y-2 text-xs border-t border-indigo-700/50 pt-3 text-indigo-100">
                                        <p className="flex justify-between">
                                            <span>Validación entrega:</span>
                                            <strong className="text-emerald-400">100% Automática</strong>
                                        </p>
                                        <p className="flex justify-between">
                                            <span>Mínimo de orden:</span>
                                            <strong>{formatCurrency(config?.minOrderSubtotal || 50000)}</strong>
                                        </p>
                                        <p className="flex justify-between">
                                            <span>Antifraude Autorreferidos:</span>
                                            <strong className="text-emerald-400">Activo</strong>
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setActiveTab('configuracion')}
                                    className="mt-6 w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black transition-colors"
                                >
                                    Modificar Parámetros
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. TAB: EMBAJADORES Y ALIADOS */}
                {activeTab === 'embajadores' && (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                        <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h3 className="text-base font-black text-gray-900">Listado de Embajadores & Aliados</h3>
                                <p className="text-xs text-gray-500">Administra niveles, saldos y estado de cada recomendador.</p>
                            </div>

                            <div className="relative w-full sm:w-72">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar por nombre, celular o código..."
                                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-gray-700">
                                <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider text-[10px] border-b border-gray-200">
                                    <tr>
                                        <th className="py-3 px-4">Embajador</th>
                                        <th className="py-3 px-4">Código Único</th>
                                        <th className="py-3 px-4">Nivel</th>
                                        <th className="py-3 px-4">Ventas Generadas</th>
                                        <th className="py-3 px-4">Saldo Disponible</th>
                                        <th className="py-3 px-4">Saldo Pendiente</th>
                                        <th className="py-3 px-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredProfiles.map((p) => (
                                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-3 px-4">
                                                <p className="font-bold text-gray-900">{p.nombre}</p>
                                                <p className="text-[11px] text-gray-500">{p.celular} • {p.ciudad || 'Colombia'}</p>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="font-mono font-black text-purple-700 bg-purple-50 border border-purple-200 px-2 py-1 rounded-md">
                                                    {p.code}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${getTierBadge(p.tier).color}`}>
                                                    {getTierBadge(p.tier).label}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 font-bold text-gray-900">
                                                {formatCurrency(p.totalSalesGenerated || 0)}
                                                <span className="block text-[10px] font-normal text-gray-400">
                                                    {p.totalDeliveredOrders || 0} pedidos entregados
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 font-black text-emerald-700">
                                                {formatCurrency(p.balanceAvailable || 0)}
                                            </td>
                                            <td className="py-3 px-4 font-bold text-amber-700">
                                                {formatCurrency(p.balancePending || 0)}
                                            </td>
                                            <td className="py-3 px-4 text-right space-x-2">
                                                <a
                                                    href={`https://wa.me/57${p.celular.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${p.nombre}! Te escribimos del equipo de Biocambio360 respecto a tu programa de embajador...`)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-colors"
                                                    title="Escribir al WhatsApp"
                                                >
                                                    <MessageCircle size={14} />
                                                </a>
                                                <button
                                                    onClick={() => handleOpenProfileModal(p)}
                                                    className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                                                >
                                                    Editar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {filteredProfiles.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="py-8 text-center text-gray-400">
                                                No se encontraron embajadores que coincidan con la búsqueda.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 3. TAB: TRANSACCIONES Y PEDIDOS REFERIDOS */}
                {activeTab === 'transacciones' && (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                        <div className="p-4 sm:p-6 border-b border-gray-100">
                            <h3 className="text-base font-black text-gray-900">Historial de Transacciones de Referidos</h3>
                            <p className="text-xs text-gray-500">Trazabilidad de compras generadas mediante código de recomendador.</p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-gray-700">
                                <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider text-[10px] border-b border-gray-200">
                                    <tr>
                                        <th className="py-3 px-4">Fecha</th>
                                        <th className="py-3 px-4">Código Usado</th>
                                        <th className="py-3 px-4">Cliente Referido</th>
                                        <th className="py-3 px-4">Monto Orden</th>
                                        <th className="py-3 px-4">Descuento Amigo</th>
                                        <th className="py-3 px-4">Recompensa Embajador</th>
                                        <th className="py-3 px-4">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {transactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-3 px-4 text-gray-500 font-mono text-[11px]">
                                                {new Date((tx.createdAt as any)?.seconds ? (tx.createdAt as any).seconds * 1000 : Date.now()).toLocaleDateString('es-CO')}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="font-mono font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                                                    {tx.referralCode}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <p className="font-bold text-gray-900">{tx.referredCustomer.nombre}</p>
                                                <p className="text-[11px] text-gray-500">{tx.referredCustomer.celular} • {tx.referredCustomer.ciudad}</p>
                                            </td>
                                            <td className="py-3 px-4 font-bold text-gray-900">
                                                {formatCurrency(tx.orderTotal)}
                                            </td>
                                            <td className="py-3 px-4 font-bold text-purple-700">
                                                -{formatCurrency(tx.friendDiscountAmount)}
                                            </td>
                                            <td className="py-3 px-4 font-black text-emerald-700">
                                                +{formatCurrency(tx.rewardAmount)}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${getTxStatusBadge(tx.status).color}`}>
                                                    {getTxStatusBadge(tx.status).label}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}

                                    {transactions.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="py-8 text-center text-gray-400">
                                                Aún no hay transacciones de compras referidas registradas.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 4. TAB: CONFIGURACION DE REGLAS */}
                {activeTab === 'configuracion' && config && (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 max-w-3xl">
                        <h3 className="text-lg font-black text-gray-900 mb-2 flex items-center gap-2">
                            <Sliders size={20} className="text-purple-600" />
                            Reglas Generales del Programa de Referidos
                        </h3>
                        <p className="text-xs text-gray-500 mb-6">
                            Ajusta los incentivos de doble vía (Win-Win) y los límites financieros para el e-commerce.
                        </p>

                        <form onSubmit={handleSaveConfig} className="space-y-5">
                            {/* Toggle Activo */}
                            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200">
                                <div>
                                    <p className="text-sm font-black text-gray-900">Programa de Referidos Activo</p>
                                    <p className="text-xs text-gray-500">Permite validar códigos de referidos en el checkout y acumular recompensas.</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={config.isActive}
                                    onChange={(e) => setConfig({ ...config, isActive: e.target.checked })}
                                    className="w-5 h-5 text-purple-600 rounded-md focus:ring-purple-500 cursor-pointer"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Recompensa Embajador (COP) *
                                    </label>
                                    <input
                                        type="number"
                                        value={config.rewardAmount}
                                        onChange={(e) => setConfig({ ...config, rewardAmount: Number(e.target.value) })}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                                        step={1000}
                                        required
                                    />
                                    <p className="text-[11px] text-gray-400 mt-1">Saldo que recibe al entregar la orden.</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Descuento al Nuevo Amigo (COP) *
                                    </label>
                                    <input
                                        type="number"
                                        value={config.friendDiscountAmount}
                                        onChange={(e) => setConfig({ ...config, friendDiscountAmount: Number(e.target.value) })}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                                        step={1000}
                                        required
                                    />
                                    <p className="text-[11px] text-gray-400 mt-1">Beneficio inmediato en su primer pedido.</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Subtotal Mínimo de Pedido para Aplicar Descuento (COP) *
                                </label>
                                <input
                                    type="number"
                                    value={config.minOrderSubtotal}
                                    onChange={(e) => setConfig({ ...config, minOrderSubtotal: Number(e.target.value) })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                                    step={5000}
                                    required
                                />
                                <p className="text-[11px] text-gray-400 mt-1">
                                    Protección de margen: evita que se use el cupón en tickets inferiores que no cubran los costos logísticos.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Pedidos para Nivel "Aliado Frecuente"
                                    </label>
                                    <input
                                        type="number"
                                        value={config.tierThresholds.aliadoMinOrders}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            tierThresholds: { ...config.tierThresholds, aliadoMinOrders: Number(e.target.value) }
                                        })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm font-bold"
                                        min={1}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Pedidos para Nivel "Embajador VIP"
                                    </label>
                                    <input
                                        type="number"
                                        value={config.tierThresholds.embajadorMinOrders}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            tierThresholds: { ...config.tierThresholds, embajadorMinOrders: Number(e.target.value) }
                                        })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm font-bold"
                                        min={2}
                                    />
                                </div>
                            </div>

                            {configMessage && (
                                <div className={`p-3 rounded-xl text-xs font-bold ${
                                    configMessage.type === 'ok' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                    {configMessage.text}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={savingConfig}
                                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                            >
                                {savingConfig ? 'Guardando...' : 'Guardar Reglas del Programa'}
                            </button>
                        </form>
                    </div>
                )}
            </main>

            {/* Modal Editar Embajador */}
            <AnimatePresence>
                {selectedProfile && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-200"
                        >
                            <h3 className="text-lg font-black text-gray-900 mb-1">
                                Editar Embajador: {selectedProfile.nombre}
                            </h3>
                            <p className="text-xs text-gray-500 mb-5">
                                Celular: {selectedProfile.celular} • Código: {selectedProfile.code}
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Saldo Disponible (COP)
                                    </label>
                                    <input
                                        type="number"
                                        value={editBalance}
                                        onChange={(e) => setEditBalance(Number(e.target.value))}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm font-bold"
                                        step={1000}
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Ajuste manual de saldo en monedero.</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">
                                        Nivel de Fidelización
                                    </label>
                                    <select
                                        value={editTier}
                                        onChange={(e) => setEditTier(e.target.value as ReferralTier)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm font-bold bg-white"
                                    >
                                        <option value="referidor">Cliente Referidor 🌱</option>
                                        <option value="aliado">Aliado Frecuente ⭐</option>
                                        <option value="embajador">Embajador VIP 🏆</option>
                                    </select>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border">
                                    <span className="text-xs font-bold text-gray-700">Estado Activo</span>
                                    <input
                                        type="checkbox"
                                        checked={editIsActive}
                                        onChange={(e) => setEditIsActive(e.target.checked)}
                                        className="w-4 h-4 text-purple-600 rounded"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    onClick={() => setSelectedProfile(null)}
                                    className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveProfileUpdates}
                                    disabled={savingProfile}
                                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow cursor-pointer disabled:opacity-50"
                                >
                                    {savingProfile ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
