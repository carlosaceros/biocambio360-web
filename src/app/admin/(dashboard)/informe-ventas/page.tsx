'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp,
    Users,
    Target,
    Award,
    Store,
    Lightbulb,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    Download,
    BarChart3,
    PieChart,
    Sparkles,
    CheckCircle2,
    AlertTriangle,
    Clock,
    ShoppingBag,
    DollarSign,
    RefreshCw,
    MessageCircle,
    ChevronRight,
    HelpCircle,
    MapPin
} from 'lucide-react';
import GeographicHeatMap from '@/components/admin/GeographicHeatMap';
import {
    HISTORICAL_SALES_DATA,
    ADVISORS_PERFORMANCE_DATA,
    POS_MONTHLY_DATA,
    getCommercialSummaryForMonth
} from '@/lib/commercial-reports-data';
import { MonthlySalesData, AdvisorPerformance } from '@/types/commercial-reports';
import { formatCurrency } from '@/lib/checkout-utils';

type ReportTab = 'ventas' | 'clientes' | 'metas' | 'asesores' | 'pos' | 'gaps' | 'geografia';

export default function InformeVentasPage() {
    const [selectedTab, setSelectedTab] = useState<ReportTab>('metas');
    const [selectedYear, setSelectedYear] = useState<number>(2026);
    const [selectedMonth, setSelectedMonth] = useState<number>(8); // Agosto (mes completo del reporte)
    const [selectedPosMonth, setSelectedPosMonth] = useState<number>(8); // Agosto para POS

    // Resumen ejecutivo
    const summary = useMemo(() => {
        return getCommercialSummaryForMonth(selectedMonth, selectedYear, 220);
    }, [selectedMonth, selectedYear]);

    // Filtrar datos por año seleccionado
    const yearSalesData = useMemo(() => {
        return HISTORICAL_SALES_DATA.filter(d => d.anio === selectedYear);
    }, [selectedYear]);

    // POS data del mes seleccionado
    const currentPosMonthData = useMemo(() => {
        return POS_MONTHLY_DATA.find(p => p.mesNumero === selectedPosMonth) || POS_MONTHLY_DATA[POS_MONTHLY_DATA.length - 1];
    }, [selectedPosMonth]);

    // Totales del año seleccionado
    const yearTotals = useMemo(() => {
        const totalMillones = yearSalesData.reduce((acc, curr) => acc + curr.ventasMillones, 0);
        const totalCantidad = yearSalesData.reduce((acc, curr) => acc + curr.ventasCantidad, 0);
        const totalNuevosMillones = yearSalesData.reduce((acc, curr) => acc + curr.clientesNuevosMillones, 0);
        const totalRecompraMillones = yearSalesData.reduce((acc, curr) => acc + curr.recompraMillones, 0);
        const promedioMensualMillones = yearSalesData.length > 0 ? Math.round(totalMillones / yearSalesData.length) : 0;
        return {
            totalMillones,
            totalCantidad,
            totalNuevosMillones,
            totalRecompraMillones,
            promedioMensualMillones
        };
    }, [yearSalesData]);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
            {/* Header / Topbar */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                                <span>Biocambio360</span>
                                <span>•</span>
                                <span>Business Intelligence</span>
                                <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-bold">Power BI Web</span>
                            </div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-0.5">
                                Informe Comercial & Rendimiento a 2026
                            </h1>
                            <p className="text-xs text-slate-500">
                                Tablero analítico de ventas, comportamiento de asesores, dinámica de recompra y punto de venta.
                            </p>
                        </div>

                        {/* Filtros de Año y Acciones */}
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                                {[2024, 2025, 2026].map(year => (
                                    <button
                                        key={year}
                                        onClick={() => setSelectedYear(year)}
                                        className={`px-3 py-1.5 rounded-lg transition-all ${
                                            selectedYear === year
                                                ? 'bg-white text-indigo-600 shadow-xs font-black'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        {year}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-colors"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Exportar
                            </button>
                        </div>
                    </div>

                    {/* Barra de Pestañas (Tabs) */}
                    <div className="flex items-center gap-1.5 overflow-x-auto mt-4 pt-1 no-scrollbar border-t border-slate-100">
                        {[
                            { id: 'metas', label: 'Cumplimiento Metas', icon: Target, badge: 'Agosto' },
                            { id: 'asesores', label: 'Comportamiento Asesores', icon: Award },
                            { id: 'ventas', label: 'Evolución Ventas', icon: TrendingUp },
                            { id: 'clientes', label: 'Nuevos vs Recompra', icon: Users },
                            { id: 'pos', label: 'Punto de Venta (Físico)', icon: Store },
                            { id: 'geografia', label: 'Distribución Geográfica', icon: MapPin, badge: 'Bogotá & Nal' },
                            { id: 'gaps', label: 'Gaps & Oportunidades', icon: Lightbulb, badge: 'IA / BI' },
                        ].map(tab => {
                            const Icon = tab.icon;
                            const isActive = selectedTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    {...(tab.id === 'geografia' ? { 'data-tour': 'bi-nav-geografia' } : {})}
                                    onClick={() => setSelectedTab(tab.id as ReportTab)}
                                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                        isActive
                                            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                    }`}
                                >
                                    <Icon className="w-3.5 h-3.5" />
                                    <span>{tab.label}</span>
                                    {tab.badge && (
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                                            isActive ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'
                                        }`}>
                                            {tab.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Contenido Principal */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

                {/* ─────────────────────────────────────────────────────────────
                    TAB 1: CUMPLIMIENTO DE METAS (Agosto 2026 - Pág 4 del Power BI)
                ───────────────────────────────────────────────────────────── */}
                {selectedTab === 'metas' && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        {/* Banner de Mes */}
                        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
                            <div className="absolute right-0 top-0 w-80 h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent pointer-events-none" />
                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div>
                                    <span className="inline-block bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2">
                                        Corte Oficial: Agosto 2026
                                    </span>
                                    <h2 className="text-3xl font-black tracking-tight">
                                        Informe 2026: Cumplimiento META
                                    </h2>
                                    <p className="text-slate-400 text-sm mt-1 max-w-xl">
                                        Monitoreo de objetivos comerciales de la fábrica. Meta global mensual de <strong>$220 Millones</strong> y cuota individual de <strong>$30 Millones</strong> por asesor comercial.
                                    </p>
                                </div>

                                <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-xl backdrop-blur-xs">
                                    <div className="text-right">
                                        <p className="text-[11px] text-slate-400 font-bold uppercase">Meta Nuevos</p>
                                        <p className="text-2xl font-black text-amber-400">75%</p>
                                        <p className="text-[10px] text-slate-400">166 clientes nuevos</p>
                                    </div>
                                    <div className="h-10 w-px bg-white/10" />
                                    <div className="text-right">
                                        <p className="text-[11px] text-slate-400 font-bold uppercase">Meta Global</p>
                                        <p className="text-2xl font-black text-emerald-400">71%</p>
                                        <p className="text-[10px] text-slate-400">$157M de $220M</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Medidor Global & Velocímetros Asesores */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Tacómetro Meta Global */}
                            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Meta General</span>
                                        <span className="text-xs font-bold text-slate-500">AGOSTO</span>
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900 mt-1">Cumplimiento Global</h3>
                                </div>

                                {/* Tacómetro semicircular visual */}
                                <div className="py-6 flex flex-col items-center justify-center">
                                    <div className="relative w-48 h-28 flex items-end justify-center overflow-hidden">
                                        {/* Arco de fondo */}
                                        <div className="absolute top-0 w-48 h-48 rounded-full border-[18px] border-slate-100" />
                                        {/* Arco de progreso */}
                                        <div
                                            className="absolute top-0 w-48 h-48 rounded-full border-[18px] border-transparent border-t-indigo-600 border-l-indigo-600 rotate-[-45deg]"
                                            style={{ transform: `rotate(${-45 + (summary.porcentajeCumplimientoGlobal * 1.8)}deg)` }}
                                        />
                                        <div className="text-center pb-2 z-10">
                                            <span className="text-4xl font-black text-indigo-700">71%</span>
                                            <p className="text-xs font-bold text-slate-400">ALCANZADO</p>
                                        </div>
                                    </div>
                                    <div className="w-full flex justify-between text-xs font-bold text-slate-400 px-4 mt-2">
                                        <span>0 mill.</span>
                                        <span className="text-indigo-600 font-extrabold text-sm">$157 mill.</span>
                                        <span>220 mill.</span>
                                    </div>
                                </div>

                                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3.5 text-xs text-indigo-900 space-y-1">
                                    <div className="flex justify-between font-bold">
                                        <span>Faltante para la meta:</span>
                                        <span className="text-rose-600">$63 Millones</span>
                                    </div>
                                    <div className="flex justify-between text-[11px] text-slate-600">
                                        <span>Total facturado en agosto:</span>
                                        <span className="font-semibold">$157,000,000 COP</span>
                                    </div>
                                </div>
                            </div>

                            {/* Velocímetros Individuales de Asesores (Grid 2 columnas en lg:col-span-2) */}
                            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-base font-black text-slate-900">Cumplimiento por Asesor Comercial</h3>
                                        <p className="text-xs text-slate-500">Cuota base de $30 Millones COP por asesor al mes</p>
                                    </div>
                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                                        6 Asesores Activos
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {ADVISORS_PERFORMANCE_DATA.map(advisor => {
                                        const isOverTarget = advisor.porcentajeCumplimiento >= 100;
                                        const isCritical = advisor.porcentajeCumplimiento < 30;
                                        const isWarning = advisor.porcentajeCumplimiento >= 30 && advisor.porcentajeCumplimiento < 70;

                                        // Colores del tacómetro
                                        let arcColor = 'border-indigo-600';
                                        let badgeColor = 'bg-indigo-100 text-indigo-800';
                                        if (isOverTarget) {
                                            arcColor = 'border-emerald-600';
                                            badgeColor = 'bg-emerald-100 text-emerald-800 font-black';
                                        } else if (isCritical) {
                                            arcColor = 'border-rose-600';
                                            badgeColor = 'bg-rose-100 text-rose-800';
                                        } else if (isWarning) {
                                            arcColor = 'border-amber-500';
                                            badgeColor = 'bg-amber-100 text-amber-800';
                                        }

                                        return (
                                            <div
                                                key={advisor.id}
                                                className="border border-slate-100 rounded-xl p-3.5 hover:border-indigo-200 hover:shadow-xs transition-all bg-slate-50/50 flex flex-col justify-between"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-black uppercase text-slate-800">{advisor.nombre}</span>
                                                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold ${badgeColor}`}>
                                                        {advisor.porcentajeCumplimiento}%
                                                    </span>
                                                </div>

                                                {/* Mini gauge */}
                                                <div className="py-3 flex flex-col items-center justify-center">
                                                    <div className="relative w-32 h-18 flex items-end justify-center overflow-hidden">
                                                        <div className="absolute top-0 w-32 h-32 rounded-full border-[10px] border-slate-200" />
                                                        <div
                                                            className={`absolute top-0 w-32 h-32 rounded-full border-[10px] border-transparent border-t-indigo-600 border-l-indigo-600 ${arcColor}`}
                                                            style={{
                                                                transform: `rotate(${-45 + Math.min(180, advisor.porcentajeCumplimiento * 1.8)}deg)`
                                                            }}
                                                        />
                                                        <div className="text-center pb-1 z-10">
                                                            <span className="text-lg font-black text-slate-900">{advisor.ventasMillones} mill.</span>
                                                        </div>
                                                    </div>
                                                    <div className="w-full flex justify-between text-[10px] font-bold text-slate-400 px-2 mt-1">
                                                        <span>0 mill.</span>
                                                        <span className="text-slate-500 font-semibold">Meta 30M</span>
                                                    </div>
                                                </div>

                                                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                                                    <span>Recompra: <strong>{advisor.porcentajeRecompra}%</strong></span>
                                                    <span>Ticket: <strong>${advisor.ticketPromedioMil}k</strong></span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Ranking & Hallazgos Estratégicos */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs lg:col-span-2">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Award className="w-4 h-4 text-amber-500" />
                                    Ranking de Productividad Comercial (Agosto 2026)
                                </h3>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                                                <th className="py-2.5">Asesor</th>
                                                <th className="py-2.5 text-right">Venta Total</th>
                                                <th className="py-2.5 text-right">Cumplimiento</th>
                                                <th className="py-2.5 text-right">Nuevos ($)</th>
                                                <th className="py-2.5 text-right">Recompra ($)</th>
                                                <th className="py-2.5 text-right">Ticket Prom.</th>
                                                <th className="py-2.5 text-right">Prod/Orden</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                            {ADVISORS_PERFORMANCE_DATA.map((adv, idx) => (
                                                <tr key={adv.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="py-3 flex items-center gap-2">
                                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                                            idx === 0 ? 'bg-amber-100 text-amber-800' : idx === 1 ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                            {idx + 1}
                                                        </span>
                                                        <span className="font-bold text-slate-900">{adv.nombre}</span>
                                                    </td>
                                                    <td className="py-3 text-right font-black text-slate-900">
                                                        ${adv.ventasMillones}M COP
                                                    </td>
                                                    <td className="py-3 text-right">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                            adv.porcentajeCumplimiento >= 100 ? 'bg-emerald-100 text-emerald-800' : adv.porcentajeCumplimiento >= 60 ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                                                        }`}>
                                                            {adv.porcentajeCumplimiento}%
                                                        </span>
                                                    </td>
                                                    <td className="py-3 text-right text-slate-600">${adv.clientesNuevosMillones}M ({adv.porcentajeNuevos}%)</td>
                                                    <td className="py-3 text-right text-indigo-600 font-semibold">${adv.recompraMillones}M ({adv.porcentajeRecompra}%)</td>
                                                    <td className="py-3 text-right text-slate-600">${adv.ticketPromedioMil},000</td>
                                                    <td className="py-3 text-right font-bold text-slate-900">{adv.promedioProductosPorPedido}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Insights Rápidos */}
                            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
                                <div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-indigo-600" />
                                        Hallazgos Clave
                                    </h3>
                                    <div className="space-y-3 text-xs text-slate-600">
                                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                                            <p className="font-bold text-amber-900">Concentración de Ventas</p>
                                            <p className="mt-1 text-[11px] text-amber-800">
                                                Karen y Katherine generan <strong>$85 Millones (54%)</strong> del total de la fábrica. Su fuerte es la fidelización (recompra &gt;89%).
                                            </p>
                                        </div>

                                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                                            <p className="font-bold text-blue-900">Cazadora de Nuevos (Hunter)</p>
                                            <p className="mt-1 text-[11px] text-blue-800">
                                                <strong>Laura</strong> trajo 49 clientes nuevos (37% de sus ventas), la cifra más alta del equipo. Requiere apoyo para aumentar su ticket promedio.
                                            </p>
                                        </div>

                                        <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl">
                                            <p className="font-bold text-rose-900">Alerta: Camilo al 9%</p>
                                            <p className="mt-1 text-[11px] text-rose-800">
                                                Solo facturó $3M con ticket de $65k y 1.89 prod/orden. Necesita plan de reactivación urgente y combos sugeridos.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setSelectedTab('gaps')}
                                    className="mt-4 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                                >
                                    Ver Estrategias de Mejora
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ─────────────────────────────────────────────────────────────
                    TAB 2: COMPORTAMIENTO ASESORES (Pág 5 del Power BI)
                ───────────────────────────────────────────────────────────── */}
                {selectedTab === 'asesores' && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900">Comportamiento de Asesores</h2>
                                    <p className="text-xs text-slate-500">Desglose de composición de ventas, profundidad de pedido y ticket promedio</p>
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-blue-600 rounded-sm" /> Cliente Nuevo</span>
                                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-indigo-500 rounded-sm" /> Recompra</span>
                                </div>
                            </div>

                            {/* Gráfica de Barras Horizontales (Composición de Venta en Millones) */}
                            <div className="space-y-4">
                                {ADVISORS_PERFORMANCE_DATA.map(adv => (
                                    <div key={adv.id} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-900 w-24">{adv.nombre}</span>
                                                <span className="text-[11px] text-slate-400">Total: ${adv.ventasMillones}M COP</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-[11px]">
                                                <span className="text-blue-600 font-semibold">Nuevos: ${adv.clientesNuevosMillones}M ({adv.porcentajeNuevos}%)</span>
                                                <span className="text-indigo-600 font-semibold">Recompra: ${adv.recompraMillones}M ({adv.porcentajeRecompra}%)</span>
                                            </div>
                                        </div>

                                        {/* Barra apilada */}
                                        <div className="w-full h-7 bg-slate-100 rounded-lg overflow-hidden flex text-[10px] font-black text-white">
                                            <div
                                                style={{ width: `${(adv.clientesNuevosMillones / 50) * 100}%` }}
                                                className="bg-blue-600 flex items-center justify-center transition-all"
                                                title={`Nuevos: $${adv.clientesNuevosMillones}M`}
                                            >
                                                {adv.clientesNuevosMillones > 2 ? `$${adv.clientesNuevosMillones}M` : ''}
                                            </div>
                                            <div
                                                style={{ width: `${(adv.recompraMillones / 50) * 100}%` }}
                                                className="bg-indigo-500 flex items-center justify-center transition-all"
                                                title={`Recompra: $${adv.recompraMillones}M`}
                                            >
                                                ${adv.recompraMillones}M
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Comparativa Media de Ventas y Promedio de Productos por Asesor */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Ticket Promedio (Media de Ventas) */}
                            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-2">
                                    Media de Ventas (Ticket Promedio COP)
                                </h3>
                                <p className="text-xs text-slate-500 mb-6">Monto promedio facturado por cada pedido atendido</p>

                                <div className="space-y-3">
                                    {ADVISORS_PERFORMANCE_DATA.map(adv => (
                                        <div key={adv.id} className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-slate-700 w-20">{adv.nombre}</span>
                                            <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                                                <div
                                                    className="bg-slate-800 h-full rounded-full transition-all"
                                                    style={{ width: `${(adv.ticketPromedioMil / 130) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-black text-slate-900 w-16 text-right">
                                                ${adv.ticketPromedioMil} mil
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Profundidad de Carrito (Promedio de Productos) */}
                            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-2">
                                    Promedio de Productos por Pedido (Cross-selling)
                                </h3>
                                <p className="text-xs text-slate-500 mb-6">Capacidad de ofrecer combos y productos complementarios</p>

                                <div className="space-y-3">
                                    {ADVISORS_PERFORMANCE_DATA.map(adv => (
                                        <div key={adv.id} className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-slate-700 w-20">{adv.nombre}</span>
                                            <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                                                <div
                                                    className="bg-indigo-600 h-full rounded-full transition-all"
                                                    style={{ width: `${(adv.promedioProductosPorPedido / 3.0) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-black text-indigo-700 w-16 text-right">
                                                {adv.promedioProductosPorPedido} un.
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ─────────────────────────────────────────────────────────────
                    TAB 3: EVOLUCIÓN HISTÓRICA DE VENTAS (Pág 1 del Power BI)
                ───────────────────────────────────────────────────────────── */}
                {selectedTab === 'ventas' && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        {/* KPIs del año */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                                <span className="text-[11px] font-bold text-slate-400 uppercase">Facturación Total {selectedYear}</span>
                                <p className="text-2xl font-black text-slate-900 mt-1">${yearTotals.totalMillones} Millones</p>
                                <p className="text-xs text-slate-500 mt-1">{yearSalesData.length} meses registrados</p>
                            </div>
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                                <span className="text-[11px] font-bold text-slate-400 uppercase">Promedio Mensual</span>
                                <p className="text-2xl font-black text-indigo-600 mt-1">${yearTotals.promedioMensualMillones} Millones</p>
                                <p className="text-xs text-slate-500 mt-1">por mes facturado</p>
                            </div>
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                                <span className="text-[11px] font-bold text-slate-400 uppercase">Volumen de Pedidos</span>
                                <p className="text-2xl font-black text-slate-900 mt-1">{yearTotals.totalCantidad.toLocaleString()}</p>
                                <p className="text-xs text-slate-500 mt-1">despachos acumulados</p>
                            </div>
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                                <span className="text-[11px] font-bold text-slate-400 uppercase">Mes Récord Histórico</span>
                                <p className="text-2xl font-black text-emerald-600 mt-1">$209 Millones</p>
                                <p className="text-xs text-slate-500 mt-1">Diciembre 2025 (1,373 pedidos)</p>
                            </div>
                        </div>

                        {/* Tabla / Gráfica de Serie Mensual */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
                            <h3 className="text-base font-black text-slate-900 mb-4">
                                Serie Mensual {selectedYear} — Cantidad y Facturación
                            </h3>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                                            <th className="py-2.5">Mes</th>
                                            <th className="py-2.5 text-right">Cantidad de Pedidos</th>
                                            <th className="py-2.5 text-right">Facturación (Millones)</th>
                                            <th className="py-2.5 text-right">Clientes Nuevos</th>
                                            <th className="py-2.5 text-right">Recompra</th>
                                            <th className="py-2.5 text-right">Ticket Promedio</th>
                                            <th className="py-2.5 text-right">Visual</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                        {yearSalesData.map(d => (
                                            <tr key={d.mesNumero} className="hover:bg-slate-50 transition-colors">
                                                <td className="py-3 font-bold text-slate-900">{d.mes}</td>
                                                <td className="py-3 text-right font-bold text-slate-800">{d.ventasCantidad.toLocaleString()}</td>
                                                <td className="py-3 text-right font-black text-indigo-700">${d.ventasMillones}M COP</td>
                                                <td className="py-3 text-right text-blue-600">{d.clientesNuevosCantidad} (${d.clientesNuevosMillones}M)</td>
                                                <td className="py-3 text-right text-indigo-600">{d.recompraCantidad} (${d.recompraMillones}M)</td>
                                                <td className="py-3 text-right font-mono">${d.ticketPromedio.toLocaleString()}</td>
                                                <td className="py-3 text-right w-32">
                                                    <div className="bg-slate-100 rounded-full h-3 overflow-hidden">
                                                        <div
                                                            className="bg-indigo-600 h-full rounded-full"
                                                            style={{ width: `${(d.ventasMillones / 210) * 100}%` }}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ─────────────────────────────────────────────────────────────
                    TAB 4: DINÁMICA DE CLIENTES (Págs 2, 3, 6, 7 del Power BI)
                ───────────────────────────────────────────────────────────── */}
                {selectedTab === 'clientes' && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <div>
                                    <h2 className="text-xl font-black text-slate-900">Evolución de Clientes: Nuevos vs Recompra</h2>
                                    <p className="text-xs text-slate-500">Distribución porcentual del volumen y la facturación mensual</p>
                                </div>
                                <div className="flex items-center gap-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    <span className="font-bold text-slate-700">Dependencia de Recompra:</span>
                                    <span className="font-black text-indigo-600 text-sm">~84% del negocio</span>
                                </div>
                            </div>

                            {/* Barras de distribución mensual (Págs 6 y 7 del Power BI) */}
                            <div className="space-y-3">
                                {yearSalesData.map(d => {
                                    const totalPedidos = d.clientesNuevosCantidad + d.recompraCantidad;
                                    const pctNuevos = Math.round((d.clientesNuevosCantidad / totalPedidos) * 100);
                                    const pctRecompra = 100 - pctNuevos;

                                    return (
                                        <div key={d.mesNumero} className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="font-bold text-slate-800 w-24">{d.mes}</span>
                                                <div className="flex gap-4 text-[11px]">
                                                    <span className="text-blue-600 font-semibold">{d.clientesNuevosCantidad} Nuevos ({pctNuevos}%) — ${d.clientesNuevosMillones}M</span>
                                                    <span className="text-indigo-600 font-semibold">{d.recompraCantidad} Recompra ({pctRecompra}%) — ${d.recompraMillones}M</span>
                                                </div>
                                            </div>

                                            <div className="w-full h-6 bg-slate-100 rounded-lg overflow-hidden flex text-[10px] font-black text-white">
                                                <div
                                                    style={{ width: `${pctNuevos}%` }}
                                                    className="bg-blue-600 flex items-center justify-center transition-all"
                                                >
                                                    {pctNuevos > 10 ? `${pctNuevos}%` : ''}
                                                </div>
                                                <div
                                                    style={{ width: `${pctRecompra}%` }}
                                                    className="bg-indigo-500 flex items-center justify-center transition-all"
                                                >
                                                    {pctRecompra}%
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Card Exclusivo: Adquisición de Clientes Nuevos (Pág 3 del PDF) */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
                            <h3 className="text-base font-black text-slate-900 mb-2">
                                Curva de Nuevos Clientes Captados ({selectedYear})
                            </h3>
                            <p className="text-xs text-slate-500 mb-6">
                                Flujo de entrada de nuevos consumidores antes de ingresar al ciclo de reposición
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                                {yearSalesData.map(d => (
                                    <div key={d.mesNumero} className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-center">
                                        <span className="text-[10px] font-bold text-blue-600 uppercase">{d.mes}</span>
                                        <p className="text-xl font-black text-slate-900 mt-0.5">{d.clientesNuevosCantidad}</p>
                                        <p className="text-[10px] font-semibold text-slate-500">${d.clientesNuevosMillones}M COP</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ─────────────────────────────────────────────────────────────
                    TAB 5: PUNTO DE VENTA FÍSICO SOACHA (Pág 8 del Power BI)
                ───────────────────────────────────────────────────────────── */}
                {selectedTab === 'pos' && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        {/* Selector de Mes POS y Resumen */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Store className="w-5 h-5 text-indigo-600" />
                                        <h2 className="text-xl font-black text-slate-900">Ventas Punto de Venta (Mostrador Soacha)</h2>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Registro de venta directa en fábrica (Cra. 7C #44-17 Sur, Soacha)
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-slate-500">Seleccionar Mes:</span>
                                    <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                                        {[
                                            { num: 7, label: 'Julio ($7.2M)' },
                                            { num: 8, label: 'Agosto ($6.4M)' }
                                        ].map(m => (
                                            <button
                                                key={m.num}
                                                onClick={() => setSelectedPosMonth(m.num)}
                                                className={`px-3 py-1.5 rounded-lg transition-all ${
                                                    selectedPosMonth === m.num
                                                        ? 'bg-white text-indigo-600 shadow-xs font-black'
                                                        : 'text-slate-600 hover:text-slate-900'
                                                }`}
                                            >
                                                {m.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Desglose Diario en Barras (Día 1 al 31) */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-slate-700">Comportamiento Diario ({currentPosMonthData.mes} 2026)</span>
                                    <span className="text-xs font-extrabold text-indigo-600">Total Mes: ${currentPosMonthData.totalMillones} Millones</span>
                                </div>

                                <div className="grid grid-cols-7 sm:grid-cols-11 md:grid-cols-16 lg:grid-cols-31 gap-1.5 pt-4">
                                    {currentPosMonthData.dias.map(d => {
                                        const isQuincena = d.dia === 15 || d.dia === 30 || d.dia === 31 || d.dia === 2;
                                        const barHeight = Math.max(12, Math.round((d.ventasMil / 800) * 120));

                                        return (
                                            <div
                                                key={d.dia}
                                                className="flex flex-col items-center group relative cursor-pointer"
                                                title={`Día ${d.dia}: $${d.ventasMil},000 COP (${d.pedidosCantidad} ventas)`}
                                            >
                                                {/* Tooltip hover */}
                                                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-2 rounded-md whitespace-nowrap pointer-events-none z-20">
                                                    Día {d.dia}: ${d.ventasMil}k
                                                </div>

                                                <div className="w-full flex items-end justify-center h-32 pb-1">
                                                    <div
                                                        style={{ height: `${barHeight}px` }}
                                                        className={`w-full rounded-t-sm transition-all ${
                                                            isQuincena
                                                                ? 'bg-indigo-600 group-hover:bg-indigo-500'
                                                                : 'bg-slate-300 group-hover:bg-slate-400'
                                                        }`}
                                                    />
                                                </div>
                                                <span className={`text-[10px] font-bold ${isQuincena ? 'text-indigo-600 font-black' : 'text-slate-400'}`}>
                                                    {d.dia}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-[11px] text-slate-400 text-right mt-3">
                                    * Columnas resaltadas corresponden a picos quincenales (días 15, 30/31) y fines de semana de alto tráfico.
                                </p>
                            </div>
                        </div>

                        {/* Acumulado Mensual POS 2026 */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
                            <h3 className="text-base font-black text-slate-900 mb-4">
                                Histórico Mensual Mostrador 2026 (Acumulado: $46.2 Millones)
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                                {POS_MONTHLY_DATA.map(p => (
                                    <div key={p.mesNumero} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">{p.mes}</span>
                                        <p className="text-lg font-black text-slate-900 mt-1">${p.totalMillones}M</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ─────────────────────────────────────────────────────────────
                    TAB 6: GAPS DE INTELIGENCIA & OPORTUNIDADES (SUPERIOR A POWER BI)
                ───────────────────────────────────────────────────────────── */}
                {selectedTab === 'gaps' && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                        {/* Banner Estratégico */}
                        <div className="bg-linear-to-br from-indigo-900 via-indigo-950 to-slate-950 p-6 rounded-2xl text-white shadow-md">
                            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
                                <Sparkles className="w-4 h-4" />
                                Inteligencia Comercial Avanzada
                            </div>
                            <h2 className="text-2xl font-black">
                                Gaps Detectados en Power BI & Plan de Acción Competitivo
                            </h2>
                            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
                                Power BI muestra lo que ya pasó en un archivo estático. El CRM nativo de Biocambio360 convierte estos datos en <strong>acciones automáticas en tiempo real</strong> para maximizar rentabilidad y retención.
                            </p>
                        </div>

                        {/* Los 4 Gaps y Soluciones de Alto Valor */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Gap 1: Run-Rate y Forecast Predictivo */}
                            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase mb-2">
                                        <span>Gap #1</span>
                                        <span>•</span>
                                        <span>Falta de Proyección</span>
                                    </div>
                                    <h3 className="text-base font-black text-slate-900">
                                        Calculadora de Run-Rate & Gap Diario
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        En vez de esperar a fin de mes para saber si se llegó al objetivo, el sistema calcula el ritmo diario requerido hoy.
                                    </p>

                                    <div className="mt-4 p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-2 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Meta Mensual:</span>
                                            <span className="font-bold text-slate-900">$220 Millones</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Faltante para meta (Agosto):</span>
                                            <span className="font-black text-rose-600">$63 Millones COP</span>
                                        </div>
                                        <div className="flex justify-between border-t border-indigo-200/60 pt-2 font-bold">
                                            <span className="text-indigo-900">Cuota Diaria Necesaria del Equipo:</span>
                                            <span className="text-indigo-700 font-black text-sm">$4.8 Millones / día</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 text-[11px] text-slate-400">
                                    ✓ Acción: Distribuir la cuota diaria en el dashboard de cada asesor para gamificar su jornada.
                                </div>
                            </div>

                            {/* Gap 2: Riesgo de Concentración Hunter vs Farmer */}
                            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-amber-600 uppercase mb-2">
                                        <span>Gap #2</span>
                                        <span>•</span>
                                        <span>Concentración de Cartera</span>
                                    </div>
                                    <h3 className="text-base font-black text-slate-900">
                                        Especialización de Roles: Hunters vs Farmers
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        El 54% de la facturación depende solo de Karen y Katherine. Si no se balancea el equipo, hay riesgo operacional severo.
                                    </p>

                                    <div className="mt-4 space-y-2 text-xs">
                                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-slate-800">Laura (Hunter Estrella)</p>
                                                <p className="text-[11px] text-slate-500">37% de ventas son clientes nuevos (49 nuevos)</p>
                                            </div>
                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-bold text-[10px]">Cazadora</span>
                                        </div>
                                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-slate-800">Karen & Katherine (Farmers Top)</p>
                                                <p className="text-[11px] text-slate-500">90% recompra ($77M recurrentes)</p>
                                            </div>
                                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full font-bold text-[10px]">Fidelizadoras</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 text-[11px] text-slate-400">
                                    ✓ Acción: Asignar nuevos leads de pauta a Laura y carteras recurrentes a Karen/Katherine.
                                </div>
                            </div>

                            {/* Gap 3: Cross-selling y Profundidad de Pedido */}
                            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase mb-2">
                                        <span>Gap #3</span>
                                        <span>•</span>
                                        <span>Ticket Promedio</span>
                                    </div>
                                    <h3 className="text-base font-black text-slate-900">
                                        Combos Automáticos para Asesores
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Camilo tiene un promedio de 1.89 productos por pedido frente al 2.56 de Laura. Si Camilo añade 0.6 productos por orden, sus ventas crecen +35%.
                                    </p>

                                    <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs space-y-1.5">
                                        <p className="font-bold text-emerald-900">Impacto Financiero Simulado:</p>
                                        <p className="text-[11px] text-emerald-800">
                                            Elevar el ticket promedio de Camilo de $65,000 a $105,000 COP generaría <strong>+$1.4M adicionales</strong> por cada 36 pedidos sin gastar un peso más en publicidad.
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 text-[11px] text-slate-400">
                                    ✓ Acción: Activar sugerencias de "Venta Cruzada" en la interfaz de pedidos del asesor.
                                </div>
                            </div>

                            {/* Gap 4: Retención Proactiva WhatsApp en vez de Gráficos Pasivos */}
                            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-rose-600 uppercase mb-2">
                                        <span>Gap #4</span>
                                        <span>•</span>
                                        <span>Accionabilidad Inmediata</span>
                                    </div>
                                    <h3 className="text-base font-black text-slate-900">
                                        Campañas WhatsApp por Alertas de Recompra
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Power BI no puede contactar a los clientes. El CRM nativo de Biocambio360 sí: identifica quiénes están a 10 días de terminar su detergente y los lista por asesor.
                                    </p>

                                    <div className="mt-4 p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs space-y-1.5">
                                        <p className="font-bold text-rose-900">Poder de la Recompra (84%):</p>
                                        <p className="text-[11px] text-rose-800">
                                            Recuperar solo el 10% de los clientes en riesgo genera <strong>+$15M a $20M mensuales</strong> directos al flujo de caja.
                                        </p>
                                    </div>
                                </div>

                                <a
                                    href="/admin/clientes"
                                    className="mt-4 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                                >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    Ir al CRM de Clientes & Recompra →
                                </a>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* PESTAÑA: DISTRIBUCIÓN GEOGRÁFICA & MAPAS DE CALOR */}
                {selectedTab === 'geografia' && (
                    <motion.div
                        data-tour="bi-geo-view"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <GeographicHeatMap />
                    </motion.div>
                )}

            </div>
        </div>
    );
}
