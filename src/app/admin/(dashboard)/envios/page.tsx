'use client';

import { useState, useEffect } from 'react';
import { Truck, MapPin, Search, ArrowLeft, RefreshCw, DollarSign, Package, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { DEFAULT_SUBSIDIOS } from '@/lib/shipping-zones';

interface AuditLog {
    id?: string;
    destinoCodigo: string;
    destinoNombre: string;
    subtotal: number;
    totalWeightKg: number;
    subsidioFabrica: number;
    cotizacionBruta99: number;
    fleteCliente: number;
    esGratis: boolean;
    esLocal: boolean;
    transportadora: string;
    timestamp: string;
}

export default function AdminEnviosPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'audit' | 'matrix'>('audit');
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const loadLogs = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/shipping-config');
            const data = await res.json();
            if (data.logs) {
                setLogs(data.logs);
            }
        } catch (e) {
            console.error('[AdminEnvios] Error cargando logs:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLogs();
    }, []);

    const filteredLogs = logs.filter(log => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            (log.destinoNombre || '').toLowerCase().includes(q) ||
            (log.destinoCodigo || '').includes(q) ||
            (log.transportadora || '').toLowerCase().includes(q)
        );
    });

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b shadow-sm sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/admin')}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft size={20} className="text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
                                AUDITORÍA LOGÍSTICA & 99 ENVIOS
                            </h1>
                            <p className="text-sm text-gray-500">Trazabilidad de cotizaciones y matriz de subsidios por peso</p>
                        </div>
                    </div>
                    <button
                        onClick={loadLogs}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl flex items-center gap-2 transition-colors text-sm"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Actualizar
                    </button>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="bg-white border-b px-6 pt-3">
                <div className="max-w-7xl mx-auto flex gap-6">
                    <button
                        onClick={() => setActiveTab('audit')}
                        className={`pb-3 font-bold text-sm border-b-2 flex items-center gap-2 transition-colors ${
                            activeTab === 'audit'
                                ? 'border-red-600 text-red-600'
                                : 'border-transparent text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <Truck size={18} />
                        Trazabilidad Cotizaciones 99 Envíos ({logs.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('matrix')}
                        className={`pb-3 font-bold text-sm border-b-2 flex items-center gap-2 transition-colors ${
                            activeTab === 'matrix'
                                ? 'border-red-600 text-red-600'
                                : 'border-transparent text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <DollarSign size={18} />
                        Matriz Oficial de Subsidios (KG vs TARIFA)
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 flex-1 w-full">
                {activeTab === 'audit' && (
                    <div className="space-y-6">
                        {/* Search Bar */}
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Buscar por ciudad, código DANE o transportadora..."
                                className="w-full pl-12 pr-4 py-3 bg-white border rounded-xl shadow-sm focus:border-red-500 focus:outline-none"
                            />
                        </div>

                        {/* Logs Table */}
                        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 border-b text-xs font-black text-gray-500 uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">Fecha / Hora</th>
                                            <th className="px-6 py-4">Destino</th>
                                            <th className="px-6 py-4">Peso (KG)</th>
                                            <th className="px-6 py-4">Cotización 99 Envíos</th>
                                            <th className="px-6 py-4">Subsidio Fábrica</th>
                                            <th className="px-6 py-4">Cobrado al Cliente</th>
                                            <th className="px-6 py-4">Transportadora</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredLogs.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center text-gray-500 font-medium">
                                                    {loading ? 'Cargando trazabilidad...' : 'No hay registros de cotización recientes.'}
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredLogs.map((log, idx) => (
                                                <tr key={log.id || idx} className="hover:bg-gray-50/80 transition-colors">
                                                    <td className="px-6 py-4 text-xs font-medium text-gray-500">
                                                        {log.timestamp ? new Date(log.timestamp).toLocaleString('es-CO') : 'Reciente'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="font-bold text-gray-900">{log.destinoNombre}</p>
                                                        <p className="text-xs text-gray-400">DANE: {log.destinoCodigo}</p>
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-gray-700">
                                                        {log.totalWeightKg} kg
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-gray-600">
                                                        {formatCurrency(log.cotizacionBruta99)}
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-blue-600">
                                                        -{formatCurrency(log.subsidioFabrica)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {log.fleteCliente === 0 ? (
                                                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 font-black text-xs rounded-full">
                                                                <ShieldCheck size={14} /> GRATIS
                                                            </span>
                                                        ) : (
                                                            <span className="font-black text-gray-900">
                                                                {formatCurrency(log.fleteCliente)}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 uppercase font-bold text-xs text-purple-700">
                                                        {log.transportadora}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'matrix' && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-6">
                        <div>
                            <h2 className="text-lg font-black text-gray-900 mb-1">MATRIZ DE SUBSIDIOS DE FÁBRICA (KG vs TARIFA)</h2>
                            <p className="text-sm text-gray-500">
                                Esta es la tabla corporativa de subsidios que la fábrica absorbe para descontar del flete real devuelto por la API de 99 Envíos.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {Object.entries(DEFAULT_SUBSIDIOS).map(([kg, tarifa]) => (
                                <div key={kg} className="p-4 bg-gray-50 border rounded-xl flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-gray-400 font-bold uppercase">Peso</p>
                                        <p className="text-base font-black text-gray-900">{kg} KG</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-blue-600 font-bold uppercase">Subsidio</p>
                                        <p className="text-sm font-black text-blue-700">{formatCurrency(Number(tarifa))}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
