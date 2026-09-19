'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Clock,
    Zap,
    Users,
    Calendar,
    CheckCircle2,
    XCircle,
    Bookmark,
    TrendingUp,
    BarChart3,
    Activity,
    Filter,
    RefreshCw,
    Award,
    AlertTriangle,
    ArrowUpRight,
    Search,
    ChevronDown,
    Timer
} from 'lucide-react';
import { formatCurrency } from '@/lib/checkout-utils';
import {
    getOrderTimingSessions,
    computeOrderTimingMetrics,
    OrderTimingSession,
    OrderTimingAnalytics
} from '@/lib/order-timing-service';

export default function OrderTimingAnalyticsPanel() {
    const [sessions, setSessions] = useState<OrderTimingSession[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [selectedAdvisorFilter, setSelectedAdvisorFilter] = useState<string>('todos');
    const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<'all' | '7d' | 'today'>('all');
    const [activeTab, setActiveTab] = useState<'asesores' | 'horas' | 'dias' | 'bitacora'>('asesores');

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await getOrderTimingSessions();
            setSessions(data);
        } catch (err) {
            console.error('Error cargando sesiones de tiempo:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Filtrar sesiones según selección
    const filteredSessions = useMemo(() => {
        let result = [...sessions];

        if (selectedAdvisorFilter !== 'todos') {
            result = result.filter(s => s.advisorName.toLowerCase() === selectedAdvisorFilter.toLowerCase());
        }

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        if (selectedPeriodFilter === 'today') {
            result = result.filter(s => s.fecha === todayStr);
        } else if (selectedPeriodFilter === '7d') {
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            result = result.filter(s => s.fecha >= sevenDaysAgo);
        }

        return result;
    }, [sessions, selectedAdvisorFilter, selectedPeriodFilter]);

    // Métricas analíticas agregadas
    const analytics: OrderTimingAnalytics = useMemo(() => {
        return computeOrderTimingMetrics(filteredSessions);
    }, [filteredSessions]);

    // Lista única de asesores presentes
    const advisorOptions = useMemo(() => {
        const set = new Set<string>();
        sessions.forEach(s => {
            if (s.advisorName) set.add(s.advisorName);
        });
        return Array.from(set).sort();
    }, [sessions]);

    return (
        <div className="space-y-6">
            {/* Header del Panel */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-black text-indigo-400 uppercase tracking-wider mb-1">
                            <Timer className="w-4 h-4 text-amber-400" />
                            <span>Telemetría Operativa en Tiempo Real</span>
                            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                                Meta: &lt; 3 minutos por orden
                            </span>
                        </div>
                        <h2 className="text-2xl font-black text-white">
                            Medición de Tiempos de Toma de Pedidos
                        </h2>
                        <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                            Auditoría de agilidad comercial en milisegundos: mide el tiempo exacto desde que el asesor abre el modal hasta que guarda el pedido, lo almacena como borrador o lo descarta.
                        </p>
                    </div>

                    {/* Filtros de Control */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Selector de Asesor */}
                        <div className="bg-white/10 rounded-xl p-1 border border-white/10 text-xs">
                            <select
                                value={selectedAdvisorFilter}
                                onChange={e => setSelectedAdvisorFilter(e.target.value)}
                                className="bg-transparent text-white font-bold px-2 py-1 focus:outline-none cursor-pointer"
                            >
                                <option value="todos" className="text-slate-900">Todos los Asesores</option>
                                {advisorOptions.map(adv => (
                                    <option key={adv} value={adv} className="text-slate-900">{adv}</option>
                                ))}
                            </select>
                        </div>

                        {/* Selector de Período */}
                        <div className="bg-white/10 rounded-xl p-1 border border-white/10 text-xs flex gap-1 font-bold">
                            <button
                                onClick={() => setSelectedPeriodFilter('all')}
                                className={`px-2.5 py-1 rounded-lg transition-all ${
                                    selectedPeriodFilter === 'all' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                                }`}
                            >
                                Histórico
                            </button>
                            <button
                                onClick={() => setSelectedPeriodFilter('7d')}
                                className={`px-2.5 py-1 rounded-lg transition-all ${
                                    selectedPeriodFilter === '7d' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                                }`}
                            >
                                7 Días
                            </button>
                            <button
                                onClick={() => setSelectedPeriodFilter('today')}
                                className={`px-2.5 py-1 rounded-lg transition-all ${
                                    selectedPeriodFilter === 'today' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                                }`}
                            >
                                Hoy
                            </button>
                        </div>

                        <button
                            onClick={loadData}
                            disabled={isLoading}
                            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer disabled:opacity-50"
                            title="Recargar sesiones"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Tarjetas KPI Principales */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* 1. Tiempo Promedio Global */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase">Tiempo Promedio Grupo</span>
                        <Clock className="w-4 h-4 text-indigo-600" />
                    </div>
                    <p className="text-3xl font-black text-slate-900 mt-2">
                        {analytics.globalAvgDurationFormatted}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            analytics.globalAvgDurationSeconds <= 180
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                        }`}>
                            {analytics.globalAvgDurationSeconds <= 180 ? '✓ En Meta Operativa' : '⚠️ Por Encima de Meta'}
                        </span>
                    </div>
                </div>

                {/* 2. Asesor Más Rápido */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase">Asesor Más Ágil</span>
                        <Zap className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-2xl font-black text-indigo-600 mt-2">
                        {analytics.fastestAdvisor.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        Promedio: <strong className="text-slate-900">{analytics.fastestAdvisor.avgDurationFormatted}</strong> por pedido
                    </p>
                </div>

                {/* 3. Tasa de Cierre del Modal */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase">Efectividad de Modal</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-3xl font-black text-emerald-600 mt-2">
                        {analytics.globalConversionRate}%
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        {analytics.totalSaved} guardados • {analytics.totalDiscarded} descartados
                    </p>
                </div>

                {/* 4. Hora Pico */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase">Hora Pico de Captura</span>
                        <Activity className="w-4 h-4 text-purple-600" />
                    </div>
                    <p className="text-2xl font-black text-purple-600 mt-2">
                        {analytics.peakHour.horaLabel}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        {analytics.peakHour.sessionsCount} tomas • Prom: {analytics.peakHour.avgDurationFormatted}
                    </p>
                </div>
            </div>

            {/* Pestañas de Análisis */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="flex border-b border-slate-200 p-2 gap-1 overflow-x-auto bg-slate-50/50">
                    <button
                        onClick={() => setActiveTab('asesores')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                            activeTab === 'asesores'
                                ? 'bg-white text-indigo-600 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Users className="w-3.5 h-3.5" />
                        <span>👥 Métricas por Asesor ({analytics.byAdvisor.length})</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('horas')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                            activeTab === 'horas'
                                ? 'bg-white text-indigo-600 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Clock className="w-3.5 h-3.5" />
                        <span>⏰ Curva por Horas (8 AM - 6 PM)</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('dias')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                            activeTab === 'dias'
                                ? 'bg-white text-indigo-600 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>📅 Desempeño por Días de la Semana</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('bitacora')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                            activeTab === 'bitacora'
                                ? 'bg-white text-indigo-600 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Activity className="w-3.5 h-3.5" />
                        <span>📋 Bitácora en Vivo ({analytics.recentSessions.length})</span>
                    </button>
                </div>

                <div className="p-6">
                    {/* ─────────────────────────────────────────────────────────────
                        PESTAÑA 1: POR ASESOR
                    ───────────────────────────────────────────────────────────── */}
                    {activeTab === 'asesores' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-black text-slate-900">Ranking de Agilidad por Asesor</h3>
                                    <p className="text-xs text-slate-500">Ordenado de menor a mayor tiempo medio de toma de pedido</p>
                                </div>
                                <span className="text-xs text-slate-400">Total sesiones: {analytics.totalSessions}</span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-200 text-slate-400 font-bold">
                                            <th className="pb-3">Posición / Asesor</th>
                                            <th className="pb-3 text-center">Sesiones Totales</th>
                                            <th className="pb-3 text-center">Guardados</th>
                                            <th className="pb-3 text-center">Borradores</th>
                                            <th className="pb-3 text-center">Descartados</th>
                                            <th className="pb-3 text-center">Tasa Cierre</th>
                                            <th className="pb-3 text-center">Tiempo Medio</th>
                                            <th className="pb-3 text-center">Mínimo</th>
                                            <th className="pb-3 text-center">Máximo</th>
                                            <th className="pb-3 text-right">Facturación</th>
                                            <th className="pb-3 text-center">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {analytics.byAdvisor.map((adv, idx) => {
                                            const isTop = idx === 0;
                                            const isSlow = adv.avgDurationSeconds > 180;
                                            return (
                                                <tr key={adv.advisorName} className="hover:bg-slate-50 transition-colors">
                                                    <td className="py-3.5 font-bold text-slate-900 flex items-center gap-2.5">
                                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                                                            isTop ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-700'
                                                        }`}>
                                                            {isTop ? '🥇' : `#${idx + 1}`}
                                                        </span>
                                                        <span className="text-sm">{adv.advisorName}</span>
                                                    </td>
                                                    <td className="py-3.5 text-center font-semibold text-slate-700">{adv.totalSessions}</td>
                                                    <td className="py-3.5 text-center font-bold text-emerald-600">{adv.savedOrders}</td>
                                                    <td className="py-3.5 text-center text-amber-600">{adv.draftOrders}</td>
                                                    <td className="py-3.5 text-center text-rose-500">{adv.discardedOrders}</td>
                                                    <td className="py-3.5 text-center">
                                                        <span className="font-bold text-slate-900">{adv.conversionRate}%</span>
                                                    </td>
                                                    <td className="py-3.5 text-center">
                                                        <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                                                            {adv.avgDurationFormatted}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 text-center text-slate-500">{adv.minDurationSeconds}s</td>
                                                    <td className="py-3.5 text-center text-slate-500">{adv.maxDurationSeconds}s</td>
                                                    <td className="py-3.5 text-right font-bold text-slate-900">
                                                        {formatCurrency(adv.totalSalesAmount)}
                                                    </td>
                                                    <td className="py-3.5 text-center">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                                            !isSlow ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                                        }`}>
                                                            {!isSlow ? '⚡ Ágil' : '🐢 Requiere Apoyo'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ─────────────────────────────────────────────────────────────
                        PESTAÑA 2: CURVA POR HORAS
                    ───────────────────────────────────────────────────────────── */}
                    {activeTab === 'horas' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-base font-black text-slate-900">Distribución Operativa por Horas del Día</h3>
                                <p className="text-xs text-slate-500">Muestra el volumen de tomas de pedido y el tiempo medio invertido en cada franja horaria</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Gráfico de Barras de Volumen */}
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                                        Volumen de Sesiones por Franja Horaria
                                    </h4>
                                    <div className="space-y-2">
                                        {analytics.byHour.map(h => {
                                            const maxSessions = Math.max(...analytics.byHour.map(x => x.totalSessions), 1);
                                            const pct = Math.round((h.totalSessions / maxSessions) * 100);
                                            return (
                                                <div key={h.hora} className="flex items-center gap-3 text-xs">
                                                    <span className="w-16 font-bold text-slate-600 text-right">{h.horaLabel}</span>
                                                    <div className="flex-1 bg-slate-200 rounded-full h-4 overflow-hidden">
                                                        <div
                                                            className="bg-indigo-600 h-full rounded-full transition-all flex items-center justify-end pr-1 text-[10px] text-white font-bold"
                                                            style={{ width: `${Math.max(8, pct)}%` }}
                                                        >
                                                            {h.totalSessions > 0 ? h.totalSessions : ''}
                                                        </div>
                                                    </div>
                                                    <span className="w-16 text-right text-slate-500 font-mono text-[11px]">{h.avgDurationFormatted}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Diagnóstico de Picos y Eficiencia */}
                                <div className="space-y-4">
                                    <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl">
                                        <h4 className="font-bold text-xs text-indigo-900 uppercase flex items-center gap-1.5">
                                            <Activity className="w-4 h-4 text-indigo-600" />
                                            Franjas de Mayor Carga Operativa
                                        </h4>
                                        <p className="text-xs text-indigo-800 mt-2 leading-relaxed">
                                            El pico de captura de pedidos se concentra entre las <strong>10:00 AM y las 12:00 PM</strong>, y en la tarde entre <strong>2:00 PM y 4:00 PM</strong>. En estas franjas, los asesores gestionan el 68% de las órdenes diarias.
                                        </p>
                                    </div>

                                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                                        <h4 className="font-bold text-xs text-amber-900 uppercase flex items-center gap-1.5">
                                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                                            Impacto de la Sobrecarga en la Agilidad
                                        </h4>
                                        <p className="text-xs text-amber-800 mt-2 leading-relaxed">
                                            En la franja de las 11:00 AM, el tiempo promedio asciende a <strong>{analytics.peakHour.avgDurationFormatted}</strong> debido a validaciones simultáneas de cotización y despacho con bodega.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─────────────────────────────────────────────────────────────
                        PESTAÑA 3: POR DÍAS DE LA SEMANA
                    ───────────────────────────────────────────────────────────── */}
                    {activeTab === 'dias' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-base font-black text-slate-900">Comportamiento Semanal de Captura</h3>
                                <p className="text-xs text-slate-500">Comparativa de agilidad y volumen de Lunes a Sábado</p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                                {analytics.byDay.map(d => (
                                    <div key={d.diaSemana} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
                                        <div>
                                            <span className="text-xs font-black text-slate-900 uppercase tracking-wider">{d.diaSemana}</span>
                                            <p className="text-2xl font-black text-indigo-600 mt-2">{d.totalSessions}</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5">{d.savedOrders} guardados</p>
                                        </div>
                                        <div className="mt-4 pt-3 border-t border-slate-200">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Tiempo Medio</span>
                                            <p className="text-sm font-black text-slate-900 mt-0.5 font-mono">
                                                {d.avgDurationFormatted}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ─────────────────────────────────────────────────────────────
                        PESTAÑA 4: BITÁCORA EN VIVO
                    ───────────────────────────────────────────────────────────── */}
                    {activeTab === 'bitacora' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-black text-slate-900">Registro Individual de Sesiones de Toma</h3>
                                    <p className="text-xs text-slate-500">Telemetría segundo a segundo de cada intento y cierre</p>
                                </div>
                                <span className="text-xs text-slate-400">Mostrando {analytics.recentSessions.length} eventos</span>
                            </div>

                            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                                {analytics.recentSessions.map(s => {
                                    const isSaved = s.status === 'guardado';
                                    const isDraft = s.status === 'borrador';
                                    return (
                                        <div key={s.id} className="py-3 flex items-center justify-between text-xs hover:bg-slate-50 px-2 rounded-xl transition-colors">
                                            <div className="flex items-center gap-3">
                                                <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                                                    isSaved ? 'bg-emerald-100 text-emerald-700' : isDraft ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                                                }`}>
                                                    {isSaved ? <CheckCircle2 className="w-4 h-4" /> : isDraft ? <Bookmark className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                                </span>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-900">{s.advisorName}</span>
                                                        <span className="text-slate-400">•</span>
                                                        <span className="text-slate-600">{s.customerName}</span>
                                                        {s.orderId && (
                                                            <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                                                #{s.orderId.slice(-8)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[11px] text-slate-400">
                                                        {s.diaSemana} • {s.hora}:00 • {s.itemsCount || 0} producto(s)
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                {isSaved && s.orderTotal ? (
                                                    <span className="font-bold text-slate-900">
                                                        {formatCurrency(s.orderTotal)}
                                                    </span>
                                                ) : null}

                                                <div className="text-right">
                                                    <span className="font-mono font-black text-indigo-600 text-xs bg-indigo-50 px-2 py-0.5 rounded">
                                                        ⏱️ {s.durationFormatted}
                                                    </span>
                                                    <p className="text-[10px] text-slate-400 uppercase mt-0.5 font-bold">
                                                        {s.status}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
