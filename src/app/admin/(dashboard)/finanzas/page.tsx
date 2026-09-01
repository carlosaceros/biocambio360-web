'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp,
    DollarSign,
    ShoppingCart,
    Calendar,
    Download,
    CreditCard,
    MapPin,
    ArrowLeft,
    RefreshCw,
    Filter,
    Layers,
    Truck,
    Ticket,
    CheckCircle2,
    XCircle,
    Clock,
    Award,
    PieChart,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    HelpCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { subscribeToOrders } from '@/lib/orders-service';
import { Order, OrderStatus } from '@/types/order';
import { formatCurrency } from '@/lib/checkout-utils';
import Image from 'next/image';

type PeriodPreset = 'this_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'this_year' | 'all_time' | 'custom';

function safeToDate(timestamp: any): Date {
    if (!timestamp) return new Date();
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
    if (typeof timestamp === 'string' || typeof timestamp === 'number') return new Date(timestamp);
    return new Date();
}

export default function AnalisisFinancieroPage() {
    const router = useRouter();
    const { user, role } = useAuth();
    const [orders, setOrders] = useState<(Order & { id: string })[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Period selector states
    const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('this_month');
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');

    useEffect(() => {
        const unsubscribe = subscribeToOrders((fetchedOrders) => {
            setOrders(fetchedOrders);
            setIsLoading(false);
        });
        return unsubscribe;
    }, []);

    // Calculate date boundaries based on preset
    const dateRange = useMemo(() => {
        const now = new Date();
        const start = new Date();
        const end = new Date();

        // End of today
        end.setHours(23, 59, 59, 999);

        if (periodPreset === 'this_month') {
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            return { start, end, label: 'Este Mes' };
        }

        if (periodPreset === 'last_month') {
            const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            const monthName = lastMonthStart.toLocaleString('es-CO', { month: 'long', year: 'numeric' });
            return { 
                start: lastMonthStart, 
                end: lastMonthEnd, 
                label: `Mes Anterior (${monthName.charAt(0).toUpperCase() + monthName.slice(1)})` 
            };
        }

        if (periodPreset === 'last_3_months') {
            start.setMonth(now.getMonth() - 3);
            start.setHours(0, 0, 0, 0);
            return { start, end, label: 'Últimos 3 Meses' };
        }

        if (periodPreset === 'last_6_months') {
            start.setMonth(now.getMonth() - 6);
            start.setHours(0, 0, 0, 0);
            return { start, end, label: 'Últimos 6 Meses' };
        }

        if (periodPreset === 'this_year') {
            const yearStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
            return { start: yearStart, end, label: `Año ${now.getFullYear()} (YTD)` };
        }

        if (periodPreset === 'all_time') {
            const oldStart = new Date(2024, 0, 1, 0, 0, 0, 0);
            return { start: oldStart, end, label: 'Histórico Completo' };
        }

        if (periodPreset === 'custom') {
            const cStart = customStartDate ? new Date(`${customStartDate}T00:00:00`) : new Date(2024, 0, 1);
            const cEnd = customEndDate ? new Date(`${customEndDate}T23:59:59`) : end;
            return { start: cStart, end: cEnd, label: 'Rango Personalizado' };
        }

        return { start, end, label: 'Periodo' };
    }, [periodPreset, customStartDate, customEndDate]);

    // Filter orders by date range
    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const orderDate = safeToDate(order.createdAt);
            return orderDate >= dateRange.start && orderDate <= dateRange.end;
        });
    }, [orders, dateRange]);

    // Financial Metrics Calculation
    const financials = useMemo(() => {
        let grossSales = 0;
        let deliveredSales = 0;
        let wompiSales = 0;
        let cashSales = 0;
        let shippingRevenue = 0;
        let couponDiscounts = 0;

        let statusCounts: Record<OrderStatus, number> = {
            pendiente: 0,
            confirmado: 0,
            preparacion: 0,
            enviado: 0,
            en_camino: 0,
            entregado: 0,
            cancelado: 0
        };

        const productSalesMap = new Map<string, {
            id: string;
            name: string;
            imgFile: string;
            units: number;
            revenue: number;
        }>();

        const geoMap = new Map<string, { city: string; dept: string; count: number; revenue: number }>();

        // Grouping timeline data for charts (by day or by month)
        const isMultiMonth = periodPreset === 'last_3_months' || periodPreset === 'last_6_months' || periodPreset === 'this_year' || periodPreset === 'all_time';
        const timeSeriesMap = new Map<string, { label: string; dateKey: string; revenue: number; ordersCount: number }>();

        filteredOrders.forEach(order => {
            const st = order.status || 'pendiente';
            statusCounts[st] = (statusCounts[st] || 0) + 1;

            if (st !== 'cancelado') {
                grossSales += (order.total || 0);
                shippingRevenue += (order.envio || 0);

                if (order.cuponAplicado?.discountAmount) {
                    couponDiscounts += order.cuponAplicado.discountAmount;
                }

                if (st === 'entregado' || order.wompiTransaction?.status === 'APPROVED') {
                    deliveredSales += (order.total || 0);
                }

                if (order.metodoPago === 'wompi') {
                    wompiSales += (order.total || 0);
                } else {
                    cashSales += (order.total || 0);
                }

                // Products breakdown
                const items = Array.isArray(order.productos) ? order.productos : Object.values(order.productos || {});
                items.forEach((item: any) => {
                    const prodId = item.product?.id || item.id || 'desconocido';
                    const prodName = item.product?.nombre || item.nombre || 'Producto';
                    const prodImg = item.product?.imgFile || 'placeholder.png';
                    const qty = Number(item.cantidad || 1);
                    const itemRev = Number(item.price || 0) * qty;

                    const existing = productSalesMap.get(prodId) || {
                        id: prodId,
                        name: prodName,
                        imgFile: prodImg,
                        units: 0,
                        revenue: 0
                    };

                    existing.units += qty;
                    existing.revenue += itemRev;
                    productSalesMap.set(prodId, existing);
                });

                // Geo breakdown
                const city = (order.cliente?.ciudad || 'Bogotá').trim();
                const dept = (order.cliente?.departamento || 'Cundinamarca').trim();
                const geoKey = `${city.toLowerCase()}_${dept.toLowerCase()}`;

                const existingGeo = geoMap.get(geoKey) || { city, dept, count: 0, revenue: 0 };
                existingGeo.count += 1;
                existingGeo.revenue += (order.total || 0);
                geoMap.set(geoKey, existingGeo);

                // Time series
                const orderDate = safeToDate(order.createdAt);
                let timeKey = '';
                let timeLabel = '';

                if (isMultiMonth) {
                    timeKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
                    timeLabel = orderDate.toLocaleString('es-CO', { month: 'short', year: '2-digit' });
                } else {
                    timeKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')}`;
                    timeLabel = `${orderDate.getDate()} ${orderDate.toLocaleString('es-CO', { month: 'short' })}`;
                }

                const existingTime = timeSeriesMap.get(timeKey) || { label: timeLabel, dateKey: timeKey, revenue: 0, ordersCount: 0 };
                existingTime.revenue += (order.total || 0);
                existingTime.ordersCount += 1;
                timeSeriesMap.set(timeKey, existingTime);
            }
        });

        const nonCancelledOrders = filteredOrders.length - statusCounts.cancelado;
        const aov = nonCancelledOrders > 0 ? Math.round(grossSales / nonCancelledOrders) : 0;
        const deliveryRate = filteredOrders.length > 0 
            ? Math.round((statusCounts.entregado / filteredOrders.length) * 100) 
            : 0;

        const topProducts = Array.from(productSalesMap.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);

        const topGeo = Array.from(geoMap.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 8);

        const timeSeries = Array.from(timeSeriesMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([_, val]) => val);

        const maxTimeSeriesRevenue = Math.max(...timeSeries.map(t => t.revenue), 1);

        return {
            totalOrders: filteredOrders.length,
            nonCancelledOrders,
            grossSales,
            deliveredSales,
            wompiSales,
            cashSales,
            shippingRevenue,
            couponDiscounts,
            aov,
            deliveryRate,
            statusCounts,
            topProducts,
            topGeo,
            timeSeries,
            maxTimeSeriesRevenue
        };
    }, [filteredOrders, periodPreset]);

    // Export CSV handler
    const handleExportCSV = () => {
        if (filteredOrders.length === 0) {
            alert('No hay datos en el periodo seleccionado para exportar.');
            return;
        }

        const headers = [
            'ID Pedido',
            'Fecha',
            'Hora',
            'Estado',
            'Cliente Nombre',
            'Cliente Telefono',
            'Cliente Correo',
            'Ciudad',
            'Departamento',
            'Direccion',
            'Metodo Pago',
            'Estado Wompi',
            'ID Transaccion Wompi',
            'Cupon Codigo',
            'Descuento Cupon',
            'Subtotal',
            'Envio',
            'Total',
            'Productos Resumen'
        ];

        const rows = filteredOrders.map(o => {
            const d = safeToDate(o.createdAt);
            const dateStr = d.toISOString().split('T')[0];
            const timeStr = d.toTimeString().split(' ')[0];
            const items = Array.isArray(o.productos) ? o.productos : Object.values(o.productos || {});
            const productsSummary = items.map((i: any) => `${i.product?.nombre || i.nombre || 'Item'} (${i.size || ''}) x${i.cantidad || 1}`).join(' | ');

            return [
                `"${o.id}"`,
                `"${dateStr}"`,
                `"${timeStr}"`,
                `"${o.status}"`,
                `"${(o.cliente?.nombre || '').replace(/"/g, '""')}"`,
                `"${o.cliente?.celular || ''}"`,
                `"${o.cliente?.email || ''}"`,
                `"${(o.cliente?.ciudad || '').replace(/"/g, '""')}"`,
                `"${(o.cliente?.departamento || '').replace(/"/g, '""')}"`,
                `"${(o.cliente?.direccion || '').replace(/"/g, '""')}"`,
                `"${o.metodoPago || ''}"`,
                `"${o.wompiTransaction?.status || 'N/A'}"`,
                `"${o.wompiTransaction?.id || ''}"`,
                `"${o.cuponAplicado?.code || ''}"`,
                o.cuponAplicado?.discountAmount || 0,
                o.subtotal || 0,
                o.envio || 0,
                o.total || 0,
                `"${productsSummary.replace(/"/g, '""')}"`
            ].join(',');
        });

        const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `reporte_financiero_biocambio360_${periodPreset}_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b shadow-xs sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/admin')}
                            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-600"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl md:text-2xl font-black text-slate-900" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
                                    HISTÓRICO & ANÁLISIS FINANCIERO
                                </h1>
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                                    <TrendingUp size={12} /> Balance en Tiempo Real
                                </span>
                            </div>
                            <p className="text-xs md:text-sm text-slate-500">
                                Informes financieros, trazabilidad de ingresos, ticket promedio y rendimiento por periodo
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportCSV}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                            title="Descargar reporte detallado en archivo CSV/Excel"
                        >
                            <Download size={15} />
                            <span>Exportar CSV</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 flex-1 w-full space-y-6">
                
                {/* 📅 Period Selector Bar */}
                <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                            <Calendar className="text-slate-700" size={18} />
                            <span className="text-sm font-black text-slate-900 uppercase tracking-wide">
                                Seleccionar Periodo de Análisis
                            </span>
                        </div>
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                            {dateRange.label}: {dateRange.start.toLocaleDateString('es-CO')} ➔ {dateRange.end.toLocaleDateString('es-CO')}
                        </span>
                    </div>

                    {/* Presets buttons */}
                    <div className="flex flex-wrap gap-2">
                        {[
                            { key: 'this_month', label: '📅 Este Mes' },
                            { key: 'last_month', label: '⏮️ Mes Anterior' },
                            { key: 'last_3_months', label: '📊 Últimos 3 Meses' },
                            { key: 'last_6_months', label: '📈 Últimos 6 Meses' },
                            { key: 'this_year', label: '🏆 Año 2026 (YTD)' },
                            { key: 'all_time', label: '🌐 Histórico Total' },
                            { key: 'custom', label: '⚙️ Rango Personalizado' },
                        ].map((btn) => (
                            <button
                                key={btn.key}
                                onClick={() => setPeriodPreset(btn.key as PeriodPreset)}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    periodPreset === btn.key
                                        ? 'bg-emerald-600 text-white shadow-xs scale-102'
                                        : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>

                    {/* Custom date range inputs */}
                    {periodPreset === 'custom' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100"
                        >
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Fecha Inicio</label>
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Fecha Fin</label>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-mono"
                                />
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* 💰 Primary KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Ventas Brutas */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ventas Totales Brutas</span>
                            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                                <DollarSign size={20} />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 font-mono">
                            {formatCurrency(financials.grossSales)}
                        </h3>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                            <span>📦 {financials.nonCancelledOrders} pedidos válidos</span>
                        </p>
                    </div>

                    {/* Ventas Entregadas / Efectivas */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ventas Entregadas / Pagadas</span>
                            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                                <CheckCircle2 size={20} />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-blue-900 font-mono">
                            {formatCurrency(financials.deliveredSales)}
                        </h3>
                        <p className="text-[11px] text-blue-700 font-bold flex items-center gap-1">
                            <span>✅ {financials.statusCounts.entregado} entregados con éxito</span>
                        </p>
                    </div>

                    {/* Ticket Promedio */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ticket Promedio (AOV)</span>
                            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                                <TrendingUp size={20} />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-purple-900 font-mono">
                            {formatCurrency(financials.aov)}
                        </h3>
                        <p className="text-[11px] text-slate-500">
                            Promedio por cliente / transacción
                        </p>
                    </div>

                    {/* Recaudo de Envíos */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
                        <div className="flex items-center justify-between text-slate-400">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Recaudo por Fletes</span>
                            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                                <Truck size={20} />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-amber-900 font-mono">
                            {formatCurrency(financials.shippingRevenue)}
                        </h3>
                        <p className="text-[11px] text-amber-700 font-medium">
                            Fletes facturados en órdenes
                        </p>
                    </div>
                </div>

                {/* 📊 Evolution Chart (Time series) */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                        <div>
                            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                <BarChart3 className="text-emerald-600" size={18} />
                                Evolución de Ingresos en el Periodo
                            </h3>
                            <p className="text-xs text-slate-500">Comportamiento diario/mensual de las ventas facturadas</p>
                        </div>
                        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                            Total: {formatCurrency(financials.grossSales)}
                        </span>
                    </div>

                    {financials.timeSeries.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 text-xs">
                            No hay transacciones registradas en este rango de fechas.
                        </div>
                    ) : (
                        <div className="pt-4">
                            <div className="flex items-end gap-2 sm:gap-3 overflow-x-auto pb-2 h-56">
                                {financials.timeSeries.map((t, idx) => {
                                    const heightPct = Math.max(8, Math.round((t.revenue / financials.maxTimeSeriesRevenue) * 100));
                                    return (
                                        <div key={idx} className="flex-1 min-w-[42px] max-w-[70px] flex flex-col items-center gap-1 group h-full justify-end">
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded shadow-xs whitespace-nowrap mb-1">
                                                {formatCurrency(t.revenue)} ({t.ordersCount})
                                            </div>
                                            <div
                                                style={{ height: `${heightPct}%` }}
                                                className="w-full bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t-lg group-hover:from-emerald-700 group-hover:to-teal-500 transition-all shadow-xs"
                                            />
                                            <span className="text-[10px] font-bold text-slate-500 mt-1 truncate w-full text-center">
                                                {t.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* 💳 Payment Methods & Geographic Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Payment breakdown */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                        <h3 className="text-base font-black text-slate-900 flex items-center gap-2 border-b pb-3">
                            <CreditCard className="text-blue-600" size={18} />
                            Desglose por Métodos de Pago
                        </h3>

                        <div className="space-y-4">
                            {/* Wompi */}
                            <div>
                                <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                                    <span className="text-slate-800 flex items-center gap-1.5">
                                        💳 Pasarela Wompi (Tarjetas, PSE, Nequi)
                                    </span>
                                    <span className="text-blue-700 font-mono">
                                        {formatCurrency(financials.wompiSales)} ({financials.grossSales > 0 ? Math.round((financials.wompiSales / financials.grossSales) * 100) : 0}%)
                                    </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                    <div
                                        className="bg-blue-600 h-full rounded-full transition-all"
                                        style={{ width: `${financials.grossSales > 0 ? Math.round((financials.wompiSales / financials.grossSales) * 100) : 0}%` }}
                                    />
                                </div>
                            </div>

                            {/* Contraentrega */}
                            <div>
                                <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                                    <span className="text-slate-800 flex items-center gap-1.5">
                                        💵 Pago Contraentrega en Efectivo
                                    </span>
                                    <span className="text-amber-700 font-mono">
                                        {formatCurrency(financials.cashSales)} ({financials.grossSales > 0 ? Math.round((financials.cashSales / financials.grossSales) * 100) : 0}%)
                                    </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                    <div
                                        className="bg-amber-500 h-full rounded-full transition-all"
                                        style={{ width: `${financials.grossSales > 0 ? Math.round((financials.cashSales / financials.grossSales) * 100) : 0}%` }}
                                    />
                                </div>
                            </div>

                            {financials.couponDiscounts > 0 && (
                                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 flex items-center justify-between text-xs font-bold text-purple-900">
                                    <span className="flex items-center gap-1.5">
                                        <Ticket size={16} className="text-purple-600" />
                                        Descuentos Otorgados con Cupones:
                                    </span>
                                    <span className="font-mono">-{formatCurrency(financials.couponDiscounts)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Geographic breakdown */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                        <h3 className="text-base font-black text-slate-900 flex items-center gap-2 border-b pb-3">
                            <MapPin className="text-red-600" size={18} />
                            Distribución Geográfica de Ventas
                        </h3>

                        <div className="space-y-3">
                            {financials.topGeo.length === 0 ? (
                                <p className="text-xs text-slate-400 italic py-4 text-center">No hay datos de envíos en este periodo.</p>
                            ) : (
                                financials.topGeo.map((g, idx) => {
                                    const pct = financials.grossSales > 0 ? Math.round((g.revenue / financials.grossSales) * 100) : 0;
                                    return (
                                        <div key={idx} className="space-y-1">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="font-bold text-slate-900">
                                                    {g.city} ({g.dept})
                                                </span>
                                                <span className="text-slate-600 font-mono text-[11px]">
                                                    {g.count} ped. · {formatCurrency(g.revenue)} ({pct}%)
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className="bg-slate-700 h-full rounded-full transition-all"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* 🏆 Top Products Table */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                        <div>
                            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                <Award className="text-amber-500" size={18} />
                                Top 10 Productos con Mayor Recaudo
                            </h3>
                            <p className="text-xs text-slate-500">Ranking de productos por volumen de ventas e ingresos generados</p>
                        </div>
                    </div>

                    {financials.topProducts.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 text-xs">
                            No hay productos registrados en el periodo seleccionado.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                                        <th className="py-3 px-4">#</th>
                                        <th className="py-3 px-4">Producto</th>
                                        <th className="py-3 px-4 text-center">Unidades</th>
                                        <th className="py-3 px-4 text-right">Ingresos Totales</th>
                                        <th className="py-3 px-4 text-right">% Participación</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {financials.topProducts.map((prod, idx) => {
                                        const share = financials.grossSales > 0 
                                            ? Number(((prod.revenue / financials.grossSales) * 100).toFixed(1)) 
                                            : 0;
                                        return (
                                            <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="py-3 px-4 font-black text-slate-400">{idx + 1}</td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative w-9 h-9 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden flex-shrink-0">
                                                            <Image
                                                                src={`/images/${prod.imgFile}`}
                                                                alt={prod.name}
                                                                fill
                                                                className="object-contain p-0.5"
                                                            />
                                                        </div>
                                                        <div>
                                                            <span className="font-bold text-slate-900 block line-clamp-1">{prod.name}</span>
                                                            <span className="text-[10px] font-mono text-slate-400">{prod.id}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-center font-bold text-slate-700">
                                                    {prod.units}
                                                </td>
                                                <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                                                    {formatCurrency(prod.revenue)}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <span className="inline-block px-2 py-0.5 bg-slate-100 rounded-full font-mono text-[11px] font-bold text-slate-700">
                                                        {share}%
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
}
