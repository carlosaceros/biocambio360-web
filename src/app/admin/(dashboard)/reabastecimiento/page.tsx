'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Clock,
    AlertTriangle,
    CheckCircle2,
    Calendar,
    MessageCircle,
    Search,
    ArrowLeft,
    RefreshCw,
    User,
    Building2,
    ShoppingBag,
    TrendingUp,
    Filter
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
    getAllReplenishmentRecords,
    markReminderSent,
    CustomerReplenishment
} from '@/lib/replenishment-service';
import { formatCurrency } from '@/lib/checkout-utils';

export default function ReabastecimientoBIAdminPage() {
    const router = useRouter();
    const [records, setRecords] = useState<CustomerReplenishment[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterType, setFilterType] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const data = await getAllReplenishmentRecords();
        setRecords(data);
        setIsLoading(false);
    };

    const handleSendReminder = async (r: CustomerReplenishment) => {
        if (!r.id) return;
        await markReminderSent(r.id);
        
        setRecords(prev => prev.map(rec => rec.id === r.id ? { ...rec, lastReminderSentAt: new Date().toISOString() } : rec));

        const dueDateStr = new Date(r.nextOrderDueDate).toLocaleDateString('es-CO');
        let msg = '';

        if (r.customerType === 'b2c') {
            msg = `Hola ${r.customerName} 👋. En Biocambio360 nos importa que nunca te quedes sin tus productos de aseo. Calculamos que tu último pedido (*${r.itemsSummary}*) está próximo a agotarse (fecha est. ${dueDateStr}). ¿Te programamos el envío de reabastecimiento directo de fábrica para esta semana? Compra en 1-clic aquí: https://biocambio360-web.vercel.app/`;
        } else {
            msg = `Hola ${r.customerName} 👋, saludos de Biocambio360 Fábrica. Registramos que tus garrafas de insumos industriales (*${r.itemsSummary}*) vencerán ciclo de consumo este ${dueDateStr}. ¿Deseas autorizar la orden de reabastecimiento corporativo?`;
        }

        window.open(`https://wa.me/57${r.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const filteredRecords = records.filter(r => {
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchName = r.customerName.toLowerCase().includes(q);
            const matchEmail = r.customerEmail.toLowerCase().includes(q);
            const matchPhone = r.customerPhone.toLowerCase().includes(q);
            const matchCity = r.customerCity.toLowerCase().includes(q);
            if (!matchName && !matchEmail && !matchPhone && !matchCity) return false;
        }

        if (filterStatus) {
            if (filterStatus === 'critico' && r.status !== 'critico_10_dias' && r.status !== 'vencido') return false;
            if (filterStatus === 'alerta' && r.status !== 'alerta_temprana') return false;
            if (filterStatus === 'surtido' && r.status !== 'surtido') return false;
        }

        if (filterType && r.customerType !== filterType) return false;

        return true;
    });

    const totalClientes = records.length;
    const criticos10Dias = records.filter(r => r.status === 'critico_10_dias' || r.status === 'vencido').length;
    const alertasTempranas = records.filter(r => r.status === 'alerta_temprana').length;
    const clientesB2C = records.filter(r => r.customerType === 'b2c').length;
    const clientesB2B = records.filter(r => r.customerType === 'b2b').length;

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                    <button
                        onClick={() => router.push('/admin')}
                        className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1 mb-2"
                    >
                        <ArrowLeft size={14} /> Volver al Dashboard
                    </button>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <Clock className="text-red-600" size={28} />
                        Business Intelligence: Timers de Reabastecimiento Recurrente
                    </h1>
                    <p className="text-xs text-gray-500">
                        Automatización de ciclo de consumo y alertas 10 días antes para clientes B2C (Hogar) y B2B (Empresas).
                    </p>
                </div>

                <button
                    onClick={loadData}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs flex items-center gap-2 self-start sm:self-auto cursor-pointer"
                >
                    <RefreshCw size={14} /> Actualizar Timers BI
                </button>
            </div>

            {/* KPI Summary Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
                    <span className="text-[10px] font-extrabold uppercase text-gray-400">Total Monitoreados</span>
                    <div className="text-2xl font-black text-gray-900 mt-1">{totalClientes}</div>
                </div>

                <div className="bg-white rounded-2xl border border-red-200 bg-red-50/40 p-4 shadow-xs">
                    <span className="text-[10px] font-extrabold uppercase text-red-600">🔴 Críticos (≤ 10 Días)</span>
                    <div className="text-2xl font-black text-red-700 mt-1">{criticos10Dias}</div>
                </div>

                <div className="bg-white rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-xs">
                    <span className="text-[10px] font-extrabold uppercase text-amber-700">🟡 Alerta Temprana</span>
                    <div className="text-2xl font-black text-amber-800 mt-1">{alertasTempranas}</div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
                    <span className="text-[10px] font-extrabold uppercase text-gray-400">🛒 B2C Hogares</span>
                    <div className="text-2xl font-black text-slate-800 mt-1">{clientesB2C}</div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
                    <span className="text-[10px] font-extrabold uppercase text-gray-400">🏢 B2B Empresas</span>
                    <div className="text-2xl font-black text-teal-700 mt-1">{clientesB2B}</div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative col-span-1 sm:col-span-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por cliente, teléfono o ciudad..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-xs focus:border-red-600 focus:outline-none"
                    />
                </div>

                <div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold bg-white text-gray-800"
                    >
                        <option value="">Todos los Estados de Consumo</option>
                        <option value="critico">🔴 Críticos / Vencidos (≤ 10 días)</option>
                        <option value="alerta">🟡 Alerta Temprana (11-25 días)</option>
                        <option value="surtido">🟢 Surtidos Satisfechos (&gt; 25 días)</option>
                    </select>
                </div>

                <div>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold bg-white text-gray-800"
                    >
                        <option value="">Todos los Tipos de Cliente</option>
                        <option value="b2c">🛒 B2C Hogar (3.8L / Pequeño)</option>
                        <option value="b2b">🏢 B2B Empresa (10L / 20L Garrafas)</option>
                    </select>
                </div>
            </div>

            {/* Table of Customer Replenishments */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                <th className="p-4">Cliente & Tipo</th>
                                <th className="p-4">Resumen Última Compra</th>
                                <th className="p-4 text-center">Ciclo de Consumo</th>
                                <th className="p-4 text-center">Próximo Reabastecimiento</th>
                                <th className="p-4 text-center">Estado / Timer BI</th>
                                <th className="p-4 text-right">Acción Recordatorio</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-400">Calculando timers de consumo BI...</td>
                                </tr>
                            ) : filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-400">No hay registros de reabastecimiento para el filtro seleccionado.</td>
                                </tr>
                            ) : (
                                filteredRecords.map((r) => {
                                    const dueDate = new Date(r.nextOrderDueDate);
                                    const now = Date.now();
                                    const daysLeft = Math.ceil((dueDate.getTime() - now) / (1000 * 60 * 60 * 24));

                                    let badgeBg = 'bg-green-100 text-green-800';
                                    let badgeText = `🟢 ${daysLeft} Días Restantes`;

                                    if (daysLeft < 0) {
                                        badgeBg = 'bg-red-100 text-red-800 font-black animate-pulse';
                                        badgeText = `🔴 VENCIDO (${Math.abs(daysLeft)} días sin reorden)`;
                                    } else if (daysLeft <= 10) {
                                        badgeBg = 'bg-red-100 text-red-700 font-extrabold';
                                        badgeText = `🔴 REABASTECER (Faltan ${daysLeft} días)`;
                                    } else if (daysLeft <= 25) {
                                        badgeBg = 'bg-amber-100 text-amber-800 font-bold';
                                        badgeText = `🟡 Alerta (${daysLeft} días restantes)`;
                                    }

                                    return (
                                        <tr key={r.id || r.customerPhone} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${r.customerType === 'b2b' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-700'}`}>
                                                        {r.customerType === 'b2b' ? '🏢 B2B Empresa' : '🛒 B2C Hogar'}
                                                    </span>
                                                </div>
                                                <div className="font-bold text-gray-900 mt-1">{r.customerName}</div>
                                                <div className="text-xs text-gray-500">📱 {r.customerPhone} · 📍 {r.customerCity}</div>
                                            </td>

                                            <td className="p-4 text-xs text-gray-700 max-w-xs">
                                                <div className="font-medium line-clamp-2">{r.itemsSummary}</div>
                                                <div className="text-[11px] text-gray-400 mt-0.5">Comprado: {new Date(r.lastOrderDate).toLocaleDateString('es-CO')}</div>
                                            </td>

                                            <td className="p-4 text-center font-bold text-xs text-gray-700">
                                                ~{r.estimatedCycleDays} Días
                                            </td>

                                            <td className="p-4 text-center font-mono font-bold text-xs text-gray-900">
                                                {dueDate.toLocaleDateString('es-CO')}
                                            </td>

                                            <td className="p-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-xs inline-block ${badgeBg}`}>
                                                    {badgeText}
                                                </span>
                                            </td>

                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => handleSendReminder(r)}
                                                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1 ml-auto shadow-xs cursor-pointer"
                                                >
                                                    <MessageCircle size={14} /> Recordatorio 1-Clic
                                                </button>
                                                {r.lastReminderSentAt && (
                                                    <span className="block text-[10px] text-gray-400 mt-1">
                                                        Enviado: {new Date(r.lastReminderSentAt).toLocaleDateString('es-CO')}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
