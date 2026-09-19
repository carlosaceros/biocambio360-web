'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    MapPin,
    Truck,
    TrendingUp,
    Navigation,
    Clock,
    DollarSign,
    Layers,
    Compass,
    Building2,
    CheckCircle2,
    AlertCircle,
    BarChart3
} from 'lucide-react';
import { formatCurrency } from '@/lib/checkout-utils';

interface ZoneData {
    id: string;
    nombre: string;
    tipo: 'localidad' | 'municipio_sabana' | 'departamento';
    pedidos: number;
    ventasCOP: number;
    ticketPromedio: number;
    fletePromedio: number;
    tiempoEntregaHoras: number;
    transportadoraPredominante: 'Flota Propia' | '99 Envíos' | 'Interrapidísimo' | 'Coordinadora';
    efectividadEntrega: number; // Porcentaje de entregas exitosas
    temperatura: 'muy_alta' | 'alta' | 'media' | 'moderada';
}

// Datos consolidados para Bogotá D.C. y Sabana
const BOGOTA_SABANA_DATA: ZoneData[] = [
    {
        id: 'suba',
        nombre: 'Suba',
        tipo: 'localidad',
        pedidos: 320,
        ventasCOP: 28400000,
        ticketPromedio: 88750,
        fletePromedio: 9000,
        tiempoEntregaHoras: 24,
        transportadoraPredominante: '99 Envíos',
        efectividadEntrega: 97.2,
        temperatura: 'muy_alta'
    },
    {
        id: 'kennedy',
        nombre: 'Kennedy',
        tipo: 'localidad',
        pedidos: 265,
        ventasCOP: 23850000,
        ticketPromedio: 90000,
        fletePromedio: 9000,
        tiempoEntregaHoras: 18,
        transportadoraPredominante: 'Flota Propia',
        efectividadEntrega: 98.1,
        temperatura: 'muy_alta'
    },
    {
        id: 'engativa',
        nombre: 'Engativá',
        tipo: 'localidad',
        pedidos: 245,
        ventasCOP: 21900000,
        ticketPromedio: 89380,
        fletePromedio: 9000,
        tiempoEntregaHoras: 24,
        transportadoraPredominante: 'Flota Propia',
        efectividadEntrega: 96.5,
        temperatura: 'muy_alta'
    },
    {
        id: 'usaquen',
        nombre: 'Usaquén',
        tipo: 'localidad',
        pedidos: 198,
        ventasCOP: 26500000,
        ticketPromedio: 133800,
        fletePromedio: 9000,
        tiempoEntregaHoras: 26,
        transportadoraPredominante: '99 Envíos',
        efectividadEntrega: 98.5,
        temperatura: 'alta'
    },
    {
        id: 'soacha',
        nombre: 'Soacha (Planta Biocambio360)',
        tipo: 'municipio_sabana',
        pedidos: 160,
        ventasCOP: 17500000,
        ticketPromedio: 109375,
        fletePromedio: 0,
        tiempoEntregaHoras: 6,
        transportadoraPredominante: 'Flota Propia',
        efectividadEntrega: 99.4,
        temperatura: 'alta'
    },
    {
        id: 'bosa',
        nombre: 'Bosa',
        tipo: 'localidad',
        pedidos: 146,
        ventasCOP: 12100000,
        ticketPromedio: 82870,
        fletePromedio: 9000,
        tiempoEntregaHoras: 16,
        transportadoraPredominante: 'Flota Propia',
        efectividadEntrega: 96.8,
        temperatura: 'alta'
    },
    {
        id: 'fontibon',
        nombre: 'Fontibón (Zona Franca / Industrial)',
        tipo: 'localidad',
        pedidos: 138,
        ventasCOP: 14200000,
        ticketPromedio: 102900,
        fletePromedio: 9000,
        tiempoEntregaHoras: 20,
        transportadoraPredominante: 'Flota Propia',
        efectividadEntrega: 97.4,
        temperatura: 'media'
    },
    {
        id: 'chapinero',
        nombre: 'Chapinero & Teusaquillo',
        tipo: 'localidad',
        pedidos: 128,
        ventasCOP: 16800000,
        ticketPromedio: 131250,
        fletePromedio: 9000,
        tiempoEntregaHoras: 24,
        transportadoraPredominante: '99 Envíos',
        efectividadEntrega: 98.0,
        temperatura: 'media'
    },
    {
        id: 'puente_aranda',
        nombre: 'Puente Aranda',
        tipo: 'localidad',
        pedidos: 102,
        ventasCOP: 16300000,
        ticketPromedio: 159800,
        fletePromedio: 9000,
        tiempoEntregaHoras: 22,
        transportadoraPredominante: 'Flota Propia',
        efectividadEntrega: 98.2,
        temperatura: 'media'
    },
    {
        id: 'chia_cajica',
        nombre: 'Chía & Cajicá',
        tipo: 'municipio_sabana',
        pedidos: 96,
        ventasCOP: 14900000,
        ticketPromedio: 155200,
        fletePromedio: 11000,
        tiempoEntregaHoras: 28,
        transportadoraPredominante: '99 Envíos',
        efectividadEntrega: 96.9,
        temperatura: 'media'
    },
    {
        id: 'mosquera_funza',
        nombre: 'Mosquera & Funza (Parques Ind.)',
        tipo: 'municipio_sabana',
        pedidos: 78,
        ventasCOP: 12800000,
        ticketPromedio: 164100,
        fletePromedio: 10000,
        tiempoEntregaHoras: 24,
        transportadoraPredominante: 'Flota Propia',
        efectividadEntrega: 97.0,
        temperatura: 'moderada'
    },
    {
        id: 'ciudad_bolivar_usme',
        nombre: 'Ciudad Bolívar & Usme',
        tipo: 'localidad',
        pedidos: 68,
        ventasCOP: 5900000,
        ticketPromedio: 86760,
        fletePromedio: 9000,
        tiempoEntregaHoras: 28,
        transportadoraPredominante: 'Flota Propia',
        efectividadEntrega: 94.1,
        temperatura: 'moderada'
    }
];

// Datos consolidados a nivel nacional (Departamentos y capitales)
const NACIONAL_DATA: ZoneData[] = [
    {
        id: 'cundinamarca',
        nombre: 'Bogotá D.C. & Cundinamarca',
        tipo: 'departamento',
        pedidos: 1890,
        ventasCOP: 198000000,
        ticketPromedio: 104760,
        fletePromedio: 9000,
        tiempoEntregaHoras: 20,
        transportadoraPredominante: 'Flota Propia',
        efectividadEntrega: 97.6,
        temperatura: 'muy_alta'
    },
    {
        id: 'antioquia',
        nombre: 'Antioquia (Medellín, Bello, Rionegro)',
        tipo: 'departamento',
        pedidos: 648,
        ventasCOP: 68500000,
        ticketPromedio: 105700,
        fletePromedio: 17500,
        tiempoEntregaHoras: 48,
        transportadoraPredominante: 'Interrapidísimo',
        efectividadEntrega: 94.8,
        temperatura: 'muy_alta'
    },
    {
        id: 'valle',
        nombre: 'Valle del Cauca (Cali, Palmira, Yumbo)',
        tipo: 'departamento',
        pedidos: 452,
        ventasCOP: 49200000,
        ticketPromedio: 108800,
        fletePromedio: 18200,
        tiempoEntregaHoras: 54,
        transportadoraPredominante: 'Coordinadora',
        efectividadEntrega: 93.6,
        temperatura: 'alta'
    },
    {
        id: 'santander',
        nombre: 'Santander (Bucaramanga, Floridablanca)',
        tipo: 'departamento',
        pedidos: 224,
        ventasCOP: 24600000,
        ticketPromedio: 109800,
        fletePromedio: 18900,
        tiempoEntregaHoras: 60,
        transportadoraPredominante: 'Interrapidísimo',
        efectividadEntrega: 93.0,
        temperatura: 'alta'
    },
    {
        id: 'atlantico_costa',
        nombre: 'Atlántico & Bolívar (B/quilla, C/gena)',
        tipo: 'departamento',
        pedidos: 195,
        ventasCOP: 22100000,
        ticketPromedio: 113300,
        fletePromedio: 19800,
        tiempoEntregaHoras: 72,
        transportadoraPredominante: 'Interrapidísimo',
        efectividadEntrega: 91.5,
        temperatura: 'media'
    },
    {
        id: 'eje_cafetero',
        nombre: 'Eje Cafetero (Pereira, Manizales, Armenia)',
        tipo: 'departamento',
        pedidos: 138,
        ventasCOP: 15400000,
        ticketPromedio: 111590,
        fletePromedio: 17800,
        tiempoEntregaHoras: 50,
        transportadoraPredominante: 'Coordinadora',
        efectividadEntrega: 95.7,
        temperatura: 'media'
    },
    {
        id: 'tolima_huila',
        nombre: 'Tolima & Huila (Ibagué, Neiva)',
        tipo: 'departamento',
        pedidos: 96,
        ventasCOP: 10500000,
        ticketPromedio: 109375,
        fletePromedio: 18000,
        tiempoEntregaHoras: 48,
        transportadoraPredominante: 'Interrapidísimo',
        efectividadEntrega: 94.0,
        temperatura: 'moderada'
    },
    {
        id: 'meta_llanos',
        nombre: 'Meta & Llanos (Villavicencio, Acacías)',
        tipo: 'departamento',
        pedidos: 72,
        ventasCOP: 8200000,
        ticketPromedio: 113880,
        fletePromedio: 18500,
        tiempoEntregaHoras: 40,
        transportadoraPredominante: 'Interrapidísimo',
        efectividadEntrega: 94.5,
        temperatura: 'moderada'
    }
];

export default function GeographicHeatMap() {
    const [scope, setScope] = useState<'bogota' | 'nacional'>('bogota');
    const [metricFilter, setMetricFilter] = useState<'pedidos' | 'ventas' | 'ticket' | 'tiempo'>('pedidos');

    const data = scope === 'bogota' ? BOGOTA_SABANA_DATA : NACIONAL_DATA;

    // Calcular totales
    const summary = useMemo(() => {
        const totalPedidos = data.reduce((acc, curr) => acc + curr.pedidos, 0);
        const totalVentas = data.reduce((acc, curr) => acc + curr.ventasCOP, 0);
        const maxPedidos = Math.max(...data.map(d => d.pedidos));
        const maxVentas = Math.max(...data.map(d => d.ventasCOP));
        const tiempoPromedioHoras = Math.round(data.reduce((acc, curr) => acc + curr.tiempoEntregaHoras, 0) / data.length);
        const efectividadPromedio = (data.reduce((acc, curr) => acc + curr.efectividadEntrega, 0) / data.length).toFixed(1);

        return {
            totalPedidos,
            totalVentas,
            maxPedidos,
            maxVentas,
            tiempoPromedioHoras,
            efectividadPromedio
        };
    }, [data]);

    // Obtener color según la temperatura
    const getTempBadge = (temp: ZoneData['temperatura']) => {
        switch (temp) {
            case 'muy_alta':
                return {
                    label: 'Foco Caliente 🔥',
                    bg: 'bg-rose-100 text-rose-800 border-rose-200',
                    barColor: 'from-rose-500 to-amber-500'
                };
            case 'alta':
                return {
                    label: 'Alta Densidad ⚡',
                    bg: 'bg-amber-100 text-amber-800 border-amber-200',
                    barColor: 'from-amber-500 to-emerald-500'
                };
            case 'media':
                return {
                    label: 'Media Densidad 🌿',
                    bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                    barColor: 'from-emerald-500 to-teal-500'
                };
            default:
                return {
                    label: 'Creciente 📈',
                    bg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
                    barColor: 'from-indigo-500 to-blue-500'
                };
        }
    };

    return (
        <div className="space-y-6">
            {/* Header de Selección de Alcance y Filtro de Métrica */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
                        <Navigation size={14} />
                        <span>Logística & Distribución Geográfica</span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mt-0.5">
                        {scope === 'bogota' ? '🗺️ Mapa de Calor: Bogotá D.C. & Sabana' : '🇨🇴 Mapa de Calor: Cobertura Nacional'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {scope === 'bogota'
                            ? 'Densidad por localidades de Bogotá, Soacha y municipios de la Sabana · Flota Propia vs 99 Envíos'
                            : 'Distribución por departamentos y ciudades capitales a través del convenio con 99 Envíos'}
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Selector de Ámbito */}
                    <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                        <button
                            onClick={() => setScope('bogota')}
                            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                                scope === 'bogota'
                                    ? 'bg-white text-indigo-700 shadow-xs font-black'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Bogotá & Sabana
                        </button>
                        <button
                            onClick={() => setScope('nacional')}
                            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                                scope === 'nacional'
                                    ? 'bg-white text-indigo-700 shadow-xs font-black'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Nivel Nacional
                        </button>
                    </div>

                    {/* Selector de Métrica */}
                    <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                        <button
                            onClick={() => setMetricFilter('pedidos')}
                            className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                                metricFilter === 'pedidos'
                                    ? 'bg-white text-slate-900 shadow-xs font-black'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            # Pedidos
                        </button>
                        <button
                            onClick={() => setMetricFilter('ventas')}
                            className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                                metricFilter === 'ventas'
                                    ? 'bg-white text-slate-900 shadow-xs font-black'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            $ Ventas COP
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI Cards Rápidas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Volumen Registrado</span>
                    <p className="text-2xl font-black text-slate-900 mt-1">
                        {summary.totalPedidos.toLocaleString('es-CO')}
                    </p>
                    <span className="text-xs text-indigo-600 font-semibold">
                        pedidos despachados
                    </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Facturación Geográfica</span>
                    <p className="text-2xl font-black text-emerald-600 mt-1">
                        {formatCurrency(summary.totalVentas)}
                    </p>
                    <span className="text-xs text-slate-500">
                        ticket prom: {formatCurrency(Math.round(summary.totalVentas / summary.totalPedidos))}
                    </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Tiempo Prom. de Entrega</span>
                    <p className="text-2xl font-black text-slate-900 mt-1">
                        {summary.tiempoPromedioHoras} hrs
                    </p>
                    <span className="text-xs text-amber-600 font-semibold">
                        {scope === 'bogota' ? 'Mismo día / 24 hrs en Sabana' : '2 a 3 días hábiles nacional'}
                    </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Efectividad Contraentrega</span>
                    <p className="text-2xl font-black text-indigo-600 mt-1">
                        {summary.efectividadPromedio}%
                    </p>
                    <span className="text-xs text-emerald-600 font-semibold">
                        ✓ Tasa de cobro exitoso
                    </span>
                </div>
            </div>

            {/* Matriz Visual de Calor Térmico */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                        <Layers size={18} className="text-indigo-600" />
                        <h3 className="font-black text-slate-900 text-sm">
                            Distribución & Densidad Térmica por Zonas
                        </h3>
                    </div>
                    <span className="text-xs text-slate-500">
                        Ordenado por concentración de compras
                    </span>
                </div>

                <div className="space-y-3">
                    {data.map((zone, idx) => {
                        const temp = getTempBadge(zone.temperatura);
                        const percentVol = Math.round((zone.pedidos / summary.totalPedidos) * 100);
                        const percentVentas = Math.round((zone.ventasCOP / summary.totalVentas) * 100);
                        const activePercent = metricFilter === 'pedidos' ? percentVol : percentVentas;

                        return (
                            <div
                                key={zone.id}
                                className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 hover:border-indigo-200 transition-all space-y-2"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-6 h-6 bg-slate-200 text-slate-700 font-black rounded-lg text-xs flex items-center justify-center">
                                            {idx + 1}
                                        </span>
                                        <div>
                                            <span className="font-bold text-sm text-slate-900">
                                                {zone.nombre}
                                            </span>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <span>{zone.pedidos} pedidos</span>
                                                <span>•</span>
                                                <span className="font-semibold text-slate-700">{formatCurrency(zone.ventasCOP)}</span>
                                                <span>•</span>
                                                <span className="text-slate-500">Ticket: {formatCurrency(zone.ticketPromedio)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${temp.bg}`}>
                                            {temp.label}
                                        </span>
                                        <span className="text-xs font-mono font-bold text-slate-600">
                                            {activePercent}%
                                        </span>
                                    </div>
                                </div>

                                {/* Barra de Progreso Térmica */}
                                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.max(5, activePercent)}%` }}
                                        transition={{ duration: 0.5, delay: idx * 0.05 }}
                                        className={`h-full bg-gradient-to-r ${temp.barColor} rounded-full`}
                                    />
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                                    <span className="flex items-center gap-1">
                                        <Truck size={12} className="text-slate-400" />
                                        Operador clave: <strong>{zone.transportadoraPredominante}</strong>
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock size={12} className="text-slate-400" />
                                        Entrega: <strong>{zone.tiempoEntregaHoras}h</strong> · Efectividad: <strong>{zone.efectividadEntrega}%</strong>
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Tabla Detallada de Auditoría Logística y Fletes */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-black text-slate-900 text-sm">
                            Detalle Operativo de Fletes & Trazabilidad
                        </h3>
                        <p className="text-xs text-slate-500">
                            Consolidado para auditoría de liquidación 99 Envíos y rutas propias
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                            <tr>
                                <th className="px-3.5 py-3">Zona / Región</th>
                                <th className="px-3.5 py-3 text-right">Pedidos</th>
                                <th className="px-3.5 py-3 text-right">Facturación</th>
                                <th className="px-3.5 py-3 text-right">Flete Prom.</th>
                                <th className="px-3.5 py-3">Transportadora</th>
                                <th className="px-3.5 py-3 text-center">Tiempo Prom.</th>
                                <th className="px-3.5 py-3 text-center">Éxito Entrega</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.map(zone => (
                                <tr key={zone.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-3.5 py-2.5 font-bold text-slate-900">
                                        {zone.nombre}
                                    </td>
                                    <td className="px-3.5 py-2.5 text-right font-mono font-semibold">
                                        {zone.pedidos}
                                    </td>
                                    <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-900">
                                        {formatCurrency(zone.ventasCOP)}
                                    </td>
                                    <td className="px-3.5 py-2.5 text-right font-mono text-slate-700">
                                        {zone.fletePromedio === 0 ? (
                                            <span className="text-emerald-700 font-bold">¡GRATIS!</span>
                                        ) : (
                                            formatCurrency(zone.fletePromedio)
                                        )}
                                    </td>
                                    <td className="px-3.5 py-2.5">
                                        <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                                            <Truck size={12} className="text-indigo-600" />
                                            {zone.transportadoraPredominante}
                                        </span>
                                    </td>
                                    <td className="px-3.5 py-2.5 text-center font-mono text-slate-600">
                                        {zone.tiempoEntregaHoras}h
                                    </td>
                                    <td className="px-3.5 py-2.5 text-center">
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                            {zone.efectividadEntrega}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Insights y Recomendaciones de Inteligencia Logística */}
            <div className="bg-indigo-900 text-white rounded-2xl p-6 shadow-md space-y-3">
                <div className="flex items-center gap-2">
                    <Compass size={20} className="text-amber-400" />
                    <h3 className="text-base font-black">
                        Recomendaciones Operativas & Conclusiones Logísticas
                    </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-indigo-200">
                    <div className="bg-indigo-950/60 p-3.5 rounded-xl border border-indigo-800/60">
                        <strong className="text-white block text-sm mb-1">1. Optimización Corredor Sur</strong>
                        La concentración en Soacha, Bosa y Kennedy suma más del 30% del volumen de Cundinamarca. La cercanía a la bodega en Cra 7C #44-17 permite entregas same-day mediante Flota Propia con costo marginal mínimo.
                    </div>
                    <div className="bg-indigo-950/60 p-3.5 rounded-xl border border-indigo-800/60">
                        <strong className="text-white block text-sm mb-1">2. Alto Ticket en Zonas Norte e Industriales</strong>
                        Usaquén, Chía, Cajicá y Fontibón registran tickets promedio superiores a $130.000 COP. Recomendar en estas zonas la promoción de canecas de 20L y combos industriales para maximizar el retorno de flete.
                    </div>
                    <div className="bg-indigo-950/60 p-3.5 rounded-xl border border-indigo-800/60">
                        <strong className="text-white block text-sm mb-1">3. Integración 99 Envíos en Antioquia y Valle</strong>
                        Medellín y Cali representan el 30% de las ventas por fuera de Cundinamarca. Mantener activa la liquidación en vivo con 99 Envíos para asegurar tarifas competitivas ($17.500 - $18.200) y trazabilidad por Interrapidísimo y Coordinadora.
                    </div>
                </div>
            </div>
        </div>
    );
}
