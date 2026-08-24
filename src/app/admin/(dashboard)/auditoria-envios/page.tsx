'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Activity, RefreshCw, Trash2, ChevronDown, ChevronUp,
    CheckCircle, XCircle, AlertTriangle, Truck, Gift, Clock,
    Package, DollarSign, MapPin, Wifi, WifiOff, ArrowLeft, Key
} from 'lucide-react';
import ChangePasswordModal from '@/components/admin/ChangePasswordModal';

interface AuditLog {
    id: string;
    timestamp: string;
    destinoCodigo: string;
    destinoNombre: string;
    subtotal: number;
    totalWeightKg: number;
    bultos: number;
    aplicaContrapago: boolean;
    esLocal: boolean;
    esVecino?: boolean;
    subsidioFabrica?: number;
    subsidio?: number;
    source?: string;
    fleteCliente?: number;
    precioFinal?: number;
    transportadora?: string;
    cotizacionBruta99?: number;
    valorBase99?: number;
    valorContrapago99?: number;
    valorContrapago?: number;
    costoUnBulto?: number;
    costoBrutoBultos?: number;
    costoBrutoTotal?: number;
    subsidioAplicado?: number;
    api99Error?: string;
    api99Cotizaciones?: Record<string, {
        valor: number;
        valor_contrapago: number;
        exito: boolean;
        mensaje: string;
        dias: string | number;
    }>;
    fallbackPrecio?: number;
    fallbackZona?: string;
    errorMessage?: string;
    durationMs?: number;
    // Campos de auditoria detallada de paquetes y subsidios
    subsidioBruto?: number;
    subsidioEfectivo?: number;
    subsidioFabricaBruto?: number;
    subsidioMaxNacional?: number;
    desgloseSubsidio?: Array<{
        nombre: string;
        size: string;
        cantidad: number;
        pesoTotal: number;
        subsidioUnitario: number;
        subsidioTotal: number;
    }>;
}

const SOURCE_CONFIG = {
    '99envios': { label: '99 Envíos API', icon: Truck, color: 'green', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
    'free_shipping': { label: 'Gratis (Local)', icon: Gift, color: 'blue', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
    'free_shipping_local': { label: 'Gratis (Local)', icon: Gift, color: 'blue', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
    'fallback': { label: 'Fallback Zonas', icon: AlertTriangle, color: 'amber', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
    'fallback_no_coverage': { label: 'Sin cobertura', icon: XCircle, color: 'red', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
    'error': { label: 'Error', icon: XCircle, color: 'red', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
};

const fmt = (n?: number) => n !== undefined
    ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)
    : '—';

const fmtTime = (iso: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'medium' });
};

export default function ShippingAuditPage() {
    const router = useRouter();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>('all');
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    const fetchLogs = useCallback(async (showRefreshing = false) => {
        if (showRefreshing) setRefreshing(true);
        else setLoading(true);
        try {
            const res = await fetch('/api/admin/shipping-audit?limit=100');
            const data = await res.json();
            setLogs(data.logs || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const clearOldLogs = async () => {
        if (!confirm('¿Eliminar logs con más de 7 días?')) return;
        await fetch('/api/admin/shipping-audit', { method: 'DELETE' });
        fetchLogs(true);
    };

    const getLogSource = (l: AuditLog) => {
        if (l.source) return l.source;
        if (l.esLocal || l.esVecino) return 'free_shipping';
        return '99envios';
    };

    const filtered = filter === 'all' ? logs : logs.filter(l => getLogSource(l) === filter);

    // Stats
    const total = logs.length;
    const ok99 = logs.filter(l => getLogSource(l) === '99envios').length;
    const fallbacks = logs.filter(l => getLogSource(l) === 'fallback' || getLogSource(l) === 'fallback_no_coverage').length;
    const errors = logs.filter(l => getLogSource(l) === 'error').length;
    const apiSuccessRate = total > 0 ? Math.round((ok99 / total) * 100) : 0;

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Activity className="animate-pulse text-red-500 mx-auto mb-3" size={32} />
                    <p className="text-gray-500">Cargando auditoría de envíos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/admin')}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 mr-1"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-xl flex items-center justify-center">
                            <Activity className="text-white" size={20} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Auditoría de Cotizaciones</h1>
                            <p className="text-sm text-gray-500">Logs en tiempo real de la API de envíos · últimas 100 cotizaciones</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        <button
                            onClick={() => setIsPasswordModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition-colors"
                            title="Cambiar mi contraseña"
                        >
                            <Key size={14} className="text-indigo-600" />
                            <span className="hidden sm:inline">Cambiar Clave</span>
                        </button>
                        <button
                            onClick={() => fetchLogs(true)}
                            disabled={refreshing}
                            className="flex items-center gap-2 bg-white border border-gray-200 hover:border-indigo-400 hover:text-indigo-600 text-gray-600 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-all shadow-sm"
                        >
                            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                            <span className="hidden sm:inline">{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
                        </button>
                        <button
                            onClick={clearOldLogs}
                            className="flex items-center gap-2 bg-white border border-gray-200 hover:border-red-400 hover:text-red-600 text-gray-600 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-all shadow-sm"
                        >
                            <Trash2 size={14} />
                            <span className="hidden sm:inline">Limpiar viejos</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total cotizaciones', value: total, icon: Activity, color: 'indigo', sub: 'últimos 7 días' },
                        {
                            label: 'API 99 Envíos OK', value: ok99,
                            icon: ok99 > 0 ? Wifi : WifiOff,
                            color: ok99 > 0 ? 'green' : 'red',
                            sub: `${apiSuccessRate}% tasa de éxito`
                        },
                        { label: 'Fallbacks usados', value: fallbacks, icon: AlertTriangle, color: 'amber', sub: 'cuando API falló' },
                        { label: 'Errores', value: errors, icon: XCircle, color: 'red', sub: 'errores totales' },
                    ].map(({ label, value, icon: Icon, color, sub }) => (
                        <div key={label} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
                                color === 'indigo' ? 'bg-indigo-50' :
                                color === 'green' ? 'bg-green-50' :
                                color === 'amber' ? 'bg-amber-50' : 'bg-red-50'
                            }`}>
                                <Icon size={18} className={
                                    color === 'indigo' ? 'text-indigo-500' :
                                    color === 'green' ? 'text-green-500' :
                                    color === 'amber' ? 'text-amber-500' : 'text-red-500'
                                } />
                            </div>
                            <div className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</div>
                            <div className="text-xs font-medium text-gray-700 mt-0.5">{label}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
                        </div>
                    ))}
                </div>

                {/* API Status Alert */}
                {apiSuccessRate < 50 && total > 5 && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                        <WifiOff className="text-red-500 mt-0.5 flex-shrink-0" size={20} />
                        <div>
                            <p className="font-semibold text-red-800">⚠️ La API de 99 Envíos no está respondiendo correctamente</p>
                            <p className="text-sm text-red-600 mt-1">
                                Solo el {apiSuccessRate}% de las cotizaciones recientes usaron la API de 99 Envíos.
                                Las demás usaron el sistema de fallback. Revisa las credenciales o el estado del servicio.
                            </p>
                        </div>
                    </div>
                )}

                {/* Filter */}
                <div className="flex items-center gap-2 flex-wrap">
                    {[
                        { key: 'all', label: 'Todos' },
                        { key: '99envios', label: '✅ 99 Envíos' },
                        { key: 'free_shipping', label: '🎁 Gratis (Local)' },
                        { key: 'fallback', label: '⚠️ Fallback' },
                        { key: 'fallback_no_coverage', label: '⛔ Sin cobertura' },
                        { key: 'error', label: '❌ Errores' },
                    ].map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                filter === key
                                    ? 'bg-indigo-600 text-white shadow'
                                    : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'
                            }`}
                        >
                            {label}
                            {key !== 'all' && (
                                <span className="ml-1.5 text-xs opacity-75">
                                    ({logs.filter(l => getLogSource(l) === key).length})
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Log list */}
                {filtered.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                        <Activity size={40} className="text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No hay logs para mostrar</p>
                        <p className="text-gray-400 text-sm mt-1">Los logs aparecen cuando los clientes cotizan el envío en el checkout</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map((log) => {
                            const sourceKey = getLogSource(log);
                            const src = SOURCE_CONFIG[sourceKey as keyof typeof SOURCE_CONFIG] || SOURCE_CONFIG['error'];
                            const SrcIcon = src.icon;
                            const isExpanded = expandedId === log.id;
                            const precioFinalCalculado = log.fleteCliente ?? log.precioFinal ?? 0;
                            const subsidioCalculado = log.subsidioFabrica ?? log.subsidio ?? log.subsidioAplicado ?? 0;
                            const bultosCalculados = log.bultos || Math.ceil((log.totalWeightKg || 5) / 20);

                            return (
                                <div key={log.id} className={`bg-white rounded-2xl border-2 shadow-sm transition-all ${src.border}`}>
                                    {/* Summary row */}
                                    <button
                                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                                        className="w-full text-left p-4 flex items-center gap-4"
                                    >
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${src.bg}`}>
                                            <SrcIcon size={16} className={src.text} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-gray-900 truncate">
                                                    {log.destinoNombre || log.destinoCodigo}
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${src.bg} ${src.text}`}>
                                                    {src.label}
                                                </span>
                                                {log.api99Error && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                                                        Error API: {log.api99Error.slice(0, 40)}...
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                                                <span className="flex items-center gap-1"><Clock size={11} />{fmtTime(log.timestamp)}</span>
                                                <span className="flex items-center gap-1"><Package size={11} />{log.totalWeightKg || 5}kg · {bultosCalculados} bulto{bultosCalculados !== 1 ? 's' : ''}</span>
                                                <span className="flex items-center gap-1"><DollarSign size={11} />Pedido: {fmt(log.subtotal)}</span>
                                                {log.durationMs && <span className="flex items-center gap-1"><Activity size={11} />{log.durationMs}ms</span>}
                                            </div>
                                        </div>

                                        <div className="text-right flex-shrink-0">
                                            <div className="text-lg font-bold text-gray-900">
                                                {fmt(precioFinalCalculado)}
                                            </div>
                                            <div className="text-xs text-gray-400">precio final</div>
                                        </div>

                                        <div className="text-gray-400 flex-shrink-0">
                                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </div>
                                    </button>

                                    {/* Expanded detail */}
                                    {isExpanded && (
                                        <div className="border-t border-gray-100 p-4 space-y-4">
                                            {/* Calculation breakdown */}
                                            <div>
                                                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Desglose del cálculo</h4>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    {[
                                                        { label: 'Subtotal pedido', value: fmt(log.subtotal) },
                                                        { label: 'Peso total', value: `${log.totalWeightKg || 5} kg` },
                                                        { label: 'Bultos', value: bultosCalculados },
                                                        { label: 'Subsidio Biocambio360', value: fmt(log.subsidioEfectivo ?? log.subsidioBruto ?? log.subsidioFabrica ?? log.subsidioFabricaBruto ?? 0) },
                                                        ...(log.subsidioBruto !== undefined && log.subsidioBruto !== log.subsidioEfectivo ? [
                                                            { label: '  └ Subsidio bruto (teórico)', value: fmt(log.subsidioBruto) },
                                                        ] : []),
                                                        ...(log.cotizacionBruta99 !== undefined || log.valorBase99 !== undefined ? [
                                                            { label: 'Flete 99envíos', value: fmt(log.cotizacionBruta99 || log.valorBase99) },
                                                            { label: 'Cargo contrapago', value: fmt(log.valorContrapago || log.valorContrapago99 || 0) },
                                                            { label: 'Costo bruto total', value: fmt(log.costoBrutoTotal || log.costoBrutoBultos || log.cotizacionBruta99) },
                                                        ] : []),
                                                        ...(sourceKey === 'fallback' ? [
                                                            { label: 'Zona fallback', value: log.fallbackZona || '—' },
                                                            { label: 'Tarifa fallback', value: fmt(log.fallbackPrecio) },
                                                            { label: 'Error API', value: log.api99Error?.slice(0, 60) || 'No registrado' },
                                                        ] : []),
                                                    ].map(({ label, value }) => (
                                                        <div key={label} className="bg-gray-50 rounded-xl p-3">
                                                            <div className="text-xs text-gray-500 mb-0.5">{label}</div>
                                                            <div className="text-sm font-semibold text-gray-800">{String(value)}</div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Detalle de items y subsidios */}
                                                {log.desgloseSubsidio && log.desgloseSubsidio.length > 0 && (
                                                    <div className="mt-3 bg-indigo-50/50 border border-indigo-100 rounded-xl p-3">
                                                        <div className="text-xs font-bold text-indigo-900 mb-1.5 flex items-center gap-1.5">
                                                            <Package size={13} className="text-indigo-600" />
                                                            Composición del Pedido & Subsidios Aplicados:
                                                        </div>
                                                        <div className="space-y-1">
                                                            {log.desgloseSubsidio.map((item, idx) => (
                                                                <div key={idx} className="flex items-center justify-between text-xs text-gray-700 bg-white/80 px-2.5 py-1 rounded-lg border border-indigo-50">
                                                                    <span>
                                                                        <strong className="text-gray-900">{item.cantidad}x</strong> {item.nombre} ({item.size}) · <span className="text-gray-500">{item.pesoTotal} kg</span>
                                                                    </span>
                                                                    <span className="font-semibold text-indigo-700">
                                                                        Subsidio: {fmt(item.subsidioTotal)} ({fmt(item.subsidioUnitario)} c/u)
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* 99envios response breakdown */}
                                            {log.api99Cotizaciones && Object.keys(log.api99Cotizaciones).length > 0 && (
                                                <div>
                                                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                                                        Respuesta de 99 Envíos por transportadora
                                                    </h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                        {Object.entries(log.api99Cotizaciones).map(([name, carrier]) => (
                                                            <div
                                                                key={name}
                                                                className={`rounded-xl p-3 border ${
                                                                    carrier.exito
                                                                        ? 'border-green-200 bg-green-50'
                                                                        : 'border-red-100 bg-red-50'
                                                                }`}
                                                            >
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="text-sm font-semibold capitalize text-gray-800">{name}</span>
                                                                    {carrier.exito
                                                                        ? <CheckCircle size={14} className="text-green-500" />
                                                                        : <XCircle size={14} className="text-red-400" />
                                                                    }
                                                                </div>
                                                                {carrier.exito ? (
                                                                    <div className="text-xs text-gray-600 space-y-0.5">
                                                                        <div>Flete: <strong>{fmt(carrier.valor)}</strong></div>
                                                                        <div>Contrapago: <strong>{fmt(carrier.valor_contrapago)}</strong></div>
                                                                        <div>Días: <strong>{carrier.dias}</strong></div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-xs text-red-500">{carrier.mensaje || 'Sin cobertura'}</div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Destination info */}
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <MapPin size={14} />
                                                <span>Código DANE: <strong className="text-gray-700 font-mono">{log.destinoCodigo}</strong></span>
                                                {(log.esLocal || log.esVecino) && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">Zona Local (Soacha/Bogotá)</span>}
                                                {log.aplicaContrapago && <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">💵 Contraentrega</span>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal Cambiar Contraseña */}
            <ChangePasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
            />
        </div>
    );
}
