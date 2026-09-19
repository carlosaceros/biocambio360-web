'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    Factory,
    Shield,
    DollarSign,
    TrendingUp,
    Layers,
    Package,
    Truck,
    FlaskConical,
    Sliders,
    AlertCircle,
    CheckCircle2,
    BarChart3,
    Sparkles,
    Scale,
    FileSpreadsheet,
    Lock
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@/lib/checkout-utils';

export interface BOMProductRecipe {
    id: string;
    nombre: string;
    loteAuditado: string;
    fechaBatch: string;
    tamanoBatchKg: number;
    densidad: number;
    ph: string;
    aroma: string;
    color: string;
    insumosQuimicos: {
        nombre: string;
        porcentaje: number;
        kgTotal: number;
        proveedor: string;
        loteProveedor: string;
        costoUnitarioKg: number;
    }[];
    empaquePresentaciones: {
        presentacion: string;
        litros: number;
        costoEnvaseYTapa: number;
        costoEtiqueta: number;
        manoObraLlenado: number;
        pvpPromedioCOP: number;
        fleteRealPromedioCOP: number;
        fleteCobradoClienteCOP: number;
    }[];
}

export const MANUFACTURING_BOM_DATA: BOMProductRecipe[] = [
    {
        id: 'lavaloza-liquido-cb',
        nombre: 'Detergente Lavaloza Líquido CB',
        loteAuditado: '300926115',
        fechaBatch: '17/09/2026',
        tamanoBatchKg: 160,
        densidad: 1.0,
        ph: '9.0 (Esp. 7.0 - 10.0)',
        aroma: 'Flores de Limón',
        color: 'Verde Oscuro (Azul Tuska + Amarillo Huevo)',
        insumosQuimicos: [
            { nombre: 'Agua Desmineralizada', porcentaje: 89.03, kgTotal: 142.45, proveedor: 'Planta Soacha', loteProveedor: 'RED-2609', costoUnitarioKg: 15 },
            { nombre: 'Ácido Sulfónico 1', porcentaje: 6.5, kgTotal: 10.4, proveedor: 'Chemical', loteProveedor: 'C26609739A', costoUnitarioKg: 8900 },
            { nombre: 'Cocoamida Líquida', porcentaje: 2.0, kgTotal: 3.2, proveedor: 'Química Proter', loteProveedor: '20250714Q1', costoUnitarioKg: 9500 },
            { nombre: 'Soda Cáustica', porcentaje: 0.85, kgTotal: 1.36, proveedor: 'DISAN', loteProveedor: 'NM_WH39-24', costoUnitarioKg: 5200 },
            { nombre: 'Celulosa HPK200MS', porcentaje: 0.5, kgTotal: 0.8, proveedor: 'Quimialmel', loteProveedor: '26036114', costoUnitarioKg: 28000 },
            { nombre: 'Glicerina USP', porcentaje: 0.5, kgTotal: 0.8, proveedor: 'DISAN', loteProveedor: 'GU20326916', costoUnitarioKg: 7800 },
            { nombre: 'Aroma Flores de Limón', porcentaje: 0.25, kgTotal: 0.4, proveedor: 'Aromas y Proc.', loteProveedor: '39502', costoUnitarioKg: 45000 },
            { nombre: 'EDTA Tetrasódico', porcentaje: 0.1, kgTotal: 0.16, proveedor: 'Química Proter', loteProveedor: '20251119', costoUnitarioKg: 14000 },
            { nombre: 'Texapón 70', porcentaje: 0.12, kgTotal: 0.19, proveedor: 'Chemical', loteProveedor: '226052631197', costoUnitarioKg: 9800 },
            { nombre: 'Color Azul Tuska', porcentaje: 0.035, kgTotal: 0.056, proveedor: 'Cimpa', loteProveedor: '26053559', costoUnitarioKg: 65000 },
            { nombre: 'Colorante Amarillo C11', porcentaje: 0.015, kgTotal: 0.024, proveedor: 'Ciacomeq', loteProveedor: '99999', costoUnitarioKg: 72000 }
        ],
        empaquePresentaciones: [
            {
                presentacion: '20 Litros (Garrafa Industrial)',
                litros: 20,
                costoEnvaseYTapa: 7800,
                costoEtiqueta: 950,
                manoObraLlenado: 1800,
                pvpPromedioCOP: 110000,
                fleteRealPromedioCOP: 22000,
                fleteCobradoClienteCOP: 12000
            },
            {
                presentacion: 'Galón (3.800 ml)',
                litros: 3.8,
                costoEnvaseYTapa: 2400,
                costoEtiqueta: 650,
                manoObraLlenado: 600,
                pvpPromedioCOP: 32000,
                fleteRealPromedioCOP: 14000,
                fleteCobradoClienteCOP: 8000
            },
            {
                presentacion: '1 Litro',
                litros: 1,
                costoEnvaseYTapa: 1100,
                costoEtiqueta: 450,
                manoObraLlenado: 350,
                pvpPromedioCOP: 13500,
                fleteRealPromedioCOP: 11000,
                fleteCobradoClienteCOP: 8000
            }
        ]
    },
    {
        id: 'detergente-liquido-multiusos',
        nombre: 'Detergente Líquido Concentrado Multiusos',
        loteAuditado: '300926114',
        fechaBatch: '16/09/2026',
        tamanoBatchKg: 900,
        densidad: 1.02,
        ph: '8.5 (Esp. 7.5 - 9.5)',
        aroma: 'Ariel Plus Fresh',
        color: 'Azul Intenso Cristalino',
        insumosQuimicos: [
            { nombre: 'Agua Desmineralizada', porcentaje: 88.5, kgTotal: 796.5, proveedor: 'Planta Soacha', loteProveedor: 'RED-2609', costoUnitarioKg: 15 },
            { nombre: 'Ácido Sulfónico 1', porcentaje: 7.2, kgTotal: 64.8, proveedor: 'Chemical', loteProveedor: 'C26609739A', costoUnitarioKg: 8900 },
            { nombre: 'Soda Cáustica 50%', porcentaje: 1.1, kgTotal: 9.9, proveedor: 'DISAN', loteProveedor: 'NM_WH39-24', costoUnitarioKg: 5200 },
            { nombre: 'Texapón 70', porcentaje: 1.5, kgTotal: 13.5, proveedor: 'Chemical', loteProveedor: '226052631197', costoUnitarioKg: 9800 },
            { nombre: 'Cocoamida Líquida', porcentaje: 0.8, kgTotal: 7.2, proveedor: 'Química Proter', loteProveedor: '20250714Q1', costoUnitarioKg: 9500 },
            { nombre: 'Aroma Ariel Plus', porcentaje: 0.35, kgTotal: 3.15, proveedor: 'Distriaromas', loteProveedor: '397179', costoUnitarioKg: 48000 },
            { nombre: 'Sal Refisal Industrial', porcentaje: 0.45, kgTotal: 4.05, proveedor: 'Ciacomeq', loteProveedor: 'L241029', costoUnitarioKg: 1200 },
            { nombre: 'EDTA Tetrasódico', porcentaje: 0.1, kgTotal: 0.9, proveedor: 'Química Proter', loteProveedor: '20251119', costoUnitarioKg: 14000 }
        ],
        empaquePresentaciones: [
            {
                presentacion: '20 Litros (Garrafa Industrial)',
                litros: 20,
                costoEnvaseYTapa: 7800,
                costoEtiqueta: 950,
                manoObraLlenado: 1800,
                pvpPromedioCOP: 115000,
                fleteRealPromedioCOP: 22000,
                fleteCobradoClienteCOP: 12000
            },
            {
                presentacion: 'Galón (3.800 ml)',
                litros: 3.8,
                costoEnvaseYTapa: 2400,
                costoEtiqueta: 650,
                manoObraLlenado: 600,
                pvpPromedioCOP: 34000,
                fleteRealPromedioCOP: 14000,
                fleteCobradoClienteCOP: 8000
            }
        ]
    },
    {
        id: 'desengrasante-industrial',
        nombre: 'Desengrasante Industrial Multisuperficies',
        loteAuditado: '300926112',
        fechaBatch: '14/09/2026',
        tamanoBatchKg: 500,
        densidad: 1.04,
        ph: '12.0 (Esp. 11.0 - 13.0)',
        aroma: 'Cítrico Industrial',
        color: 'Amarillo Fluorescente',
        insumosQuimicos: [
            { nombre: 'Agua Desmineralizada', porcentaje: 85.27, kgTotal: 426.35, proveedor: 'Planta Soacha', loteProveedor: 'RED-2609', costoUnitarioKg: 15 },
            { nombre: 'Butilglicol', porcentaje: 5.0, kgTotal: 25.0, proveedor: 'Chemical', loteProveedor: '120000592421', costoUnitarioKg: 16500 },
            { nombre: 'Metasilicato de Sodio', porcentaje: 5.0, kgTotal: 25.0, proveedor: 'Ciacomeq', loteProveedor: '60202135', costoUnitarioKg: 6800 },
            { nombre: 'Ácido Sulfónico 1', porcentaje: 4.0, kgTotal: 20.0, proveedor: 'Chemical', loteProveedor: 'C26609739A', costoUnitarioKg: 8900 },
            { nombre: 'Soda Cáustica', porcentaje: 0.43, kgTotal: 2.15, proveedor: 'DISAN', loteProveedor: 'NM_WH39-24', costoUnitarioKg: 5200 },
            { nombre: 'EDTA Tetrasódico', porcentaje: 0.3, kgTotal: 1.5, proveedor: 'Química Proter', loteProveedor: '20251119', costoUnitarioKg: 14000 }
        ],
        empaquePresentaciones: [
            {
                presentacion: '20 Litros (Garrafa Industrial)',
                litros: 20,
                costoEnvaseYTapa: 7800,
                costoEtiqueta: 950,
                manoObraLlenado: 1800,
                pvpPromedioCOP: 125000,
                fleteRealPromedioCOP: 22000,
                fleteCobradoClienteCOP: 12000
            },
            {
                presentacion: 'Galón (3.800 ml)',
                litros: 3.8,
                costoEnvaseYTapa: 2400,
                costoEtiqueta: 650,
                manoObraLlenado: 600,
                pvpPromedioCOP: 38000,
                fleteRealPromedioCOP: 14000,
                fleteCobradoClienteCOP: 8000
            }
        ]
    }
];

export default function ManufacturingBOMCostingPanel() {
    const { user, userProfile, role } = useAuth();
    const userEmail = (user?.email || '').toLowerCase();

    // Verificación estricta de autorización para acceso a fórmulas y costos industriales
    const isAuthorized =
        role === 'superadmin' ||
        role === 'director' ||
        userEmail.includes('diego') ||
        userEmail.includes('fernando') ||
        userEmail.includes('carlos') ||
        userEmail.includes('julian') ||
        userEmail.includes('danilo');

    const [selectedRecipeId, setSelectedRecipeId] = useState<string>('lavaloza-liquido-cb');
    const [rawMaterialInflationPct, setRawMaterialInflationPct] = useState<number>(0);
    const [selectedChannel, setSelectedChannel] = useState<'tienda_online' | 'asesor_whatsapp' | 'mostrador_pos'>('tienda_online');

    const activeRecipe = useMemo(() => {
        return MANUFACTURING_BOM_DATA.find(r => r.id === selectedRecipeId) || MANUFACTURING_BOM_DATA[0];
    }, [selectedRecipeId]);

    // Cálculo del Costo Químico por Kg/Litro según batch
    const { costoTotalBatch, costoQuimicoPorKg } = useMemo(() => {
        const factor = 1 + (rawMaterialInflationPct / 100);
        let totalCosto = 0;
        activeRecipe.insumosQuimicos.forEach(insumo => {
            totalCosto += insumo.kgTotal * (insumo.costoUnitarioKg * factor);
        });
        const porKg = activeRecipe.tamanoBatchKg > 0 ? totalCosto / activeRecipe.tamanoBatchKg : 0;
        return { costoTotalBatch: totalCosto, costoQuimicoPorKg: porKg };
    }, [activeRecipe, rawMaterialInflationPct]);

    if (!isAuthorized) {
        return (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4 shadow-xs">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                    <Lock size={26} />
                </div>
                <div>
                    <h3 className="text-base font-black text-slate-900">
                        Módulo de Costeo Industrial BOM y Rentabilidad Química Protegido
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                        El desglose de materias primas, proveedores de insumos (Chemical, DISAN, Quimialmel) y fórmulas del SGC FR-001-POE-007 está restringido exclusivamente a Dirección General (Diego, Fernando, Julián, Danilo) y Superadministradores.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header del Panel */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black tracking-widest text-indigo-300 uppercase">
                            Ingeniería Química & SGC Biocambio360
                        </span>
                        <span className="bg-emerald-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                            Lote 300926115 Auditado
                        </span>
                    </div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                        <Factory size={22} className="text-indigo-400" />
                        Desglose de Costos Industriales BOM, Insumos & Márgenes Reales
                    </h2>
                    <p className="text-xs text-slate-300">
                        Trazabilidad completa de recetas del FR-001-POE-007, rendimientos por lote, empaque y cálculo exacto del subsidio de flete.
                    </p>
                </div>

                {/* Selector de Receta / Producto */}
                <div className="flex flex-wrap gap-2">
                    {MANUFACTURING_BOM_DATA.map(rec => (
                        <button
                            key={rec.id}
                            onClick={() => setSelectedRecipeId(rec.id)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                selectedRecipeId === rec.id
                                    ? 'bg-amber-400 text-slate-950 shadow-md scale-102'
                                    : 'bg-white/10 hover:bg-white/20 text-white'
                            }`}
                        >
                            {rec.nombre.split(' ')[1] || rec.nombre}
                        </button>
                    ))}
                </div>
            </div>

            {/* Ficha Técnica del Lote Auditado */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Lote Producción</span>
                    <span className="font-mono font-black text-slate-900 text-sm mt-0.5 block">#{activeRecipe.loteAuditado}</span>
                    <span className="text-[10px] text-slate-500">{activeRecipe.fechaBatch}</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Tamaño del Batch</span>
                    <span className="font-mono font-black text-indigo-600 text-sm mt-0.5 block">{activeRecipe.tamanoBatchKg} Kg</span>
                    <span className="text-[10px] text-slate-500">Densidad: {activeRecipe.densidad} g/ml</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">pH de Control SGC</span>
                    <span className="font-black text-emerald-600 text-sm mt-0.5 block">{activeRecipe.ph}</span>
                    <span className="text-[10px] text-slate-500">Conforme Especificación</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Aroma y Fragancia</span>
                    <span className="font-black text-slate-800 text-xs mt-0.5 block truncate">{activeRecipe.aroma}</span>
                    <span className="text-[10px] text-slate-500">Alta fijación textil</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Costo Químico / Litro</span>
                    <span className="font-mono font-black text-indigo-700 text-sm mt-0.5 block">
                        {formatCurrency(Math.round(costoQuimicoPorKg))}
                    </span>
                    <span className="text-[10px] text-slate-500">Materia prima neta</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Costo Total Batch</span>
                    <span className="font-mono font-black text-slate-900 text-sm mt-0.5 block">
                        {formatCurrency(Math.round(costoTotalBatch))}
                    </span>
                    <span className="text-[10px] text-slate-500">Total formulación</span>
                </div>
            </div>

            {/* Simulador de Variación de Costos de Materia Prima */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-800 rounded-xl">
                        <Sliders size={18} />
                    </div>
                    <div>
                        <h4 className="font-black text-xs text-slate-900">
                            Simulador de Estrés de Precios Químicos (Ácido Sulfónico / Soda / Texapón)
                        </h4>
                        <p className="text-[11px] text-slate-500">
                            Ajusta el porcentaje de inflación o descuento de insumos para ver el impacto automático en márgenes brutos.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600">Variación MP:</span>
                        {[-10, 0, 5, 10, 20].map(pct => (
                            <button
                                key={pct}
                                onClick={() => setRawMaterialInflationPct(pct)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    rawMaterialInflationPct === pct
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                                }`}
                            >
                                {pct > 0 ? `+${pct}%` : `${pct}%`}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* TABLA 1: DESGLOSE DE MATERIA PRIMA (BOM DETALLADO POR INSUMO Y PROVEEDOR) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <FlaskConical size={16} className="text-indigo-600" />
                        Lista de Materiales Químicos (BOM) — Lote #{activeRecipe.loteAuditado}
                    </h3>
                    <span className="text-xs text-slate-500">
                        {activeRecipe.insumosQuimicos.length} insumos certificados INVIMA
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/75 text-slate-500 uppercase font-bold border-b border-slate-200 text-[10px]">
                            <tr>
                                <th className="py-3 px-4">Insumo Químico</th>
                                <th className="py-3 px-4">Proveedor</th>
                                <th className="py-3 px-4">Lote Insumo</th>
                                <th className="py-3 px-4 text-right">Dosificación (%)</th>
                                <th className="py-3 px-4 text-right">Cantidad Batch (Kg)</th>
                                <th className="py-3 px-4 text-right">Costo Unitario ($/Kg)</th>
                                <th className="py-3 px-4 text-right">Subtotal Batch</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {activeRecipe.insumosQuimicos.map((ins, idx) => {
                                const unitCost = ins.costoUnitarioKg * (1 + rawMaterialInflationPct / 100);
                                const subtotal = ins.kgTotal * unitCost;

                                return (
                                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="py-3 px-4 font-bold text-slate-900">
                                            {ins.nombre}
                                        </td>
                                        <td className="py-3 px-4 text-slate-600">
                                            <span className="bg-slate-100 px-2 py-0.5 rounded-md font-medium text-[11px]">
                                                {ins.proveedor}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                                            {ins.loteProveedor}
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono font-bold text-indigo-600">
                                            {ins.porcentaje.toFixed(2)}%
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                                            {ins.kgTotal.toFixed(2)} Kg
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                                            {formatCurrency(Math.round(unitCost))}
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                                            {formatCurrency(Math.round(subtotal))}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* TABLA 2: COSTEO POR PRESENTACIÓN (GARRAFA 20L, GALÓN, 1L), EMPAQUE Y MÁRGENES REALES */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                            <Package size={16} className="text-emerald-600" />
                            Análisis de Costos de Empaque, Mano de Obra, Subsidio de Flete y Margen Neto
                        </h3>
                        <p className="text-xs text-slate-500">
                            Desglose de garrafa HDPE, tapa con precinto, etiqueta UV, flete real y margen neto de contribución.
                        </p>
                    </div>

                    {/* Selector de Canal */}
                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <span className="text-[11px] font-bold text-slate-500 pl-2">Canal:</span>
                        <button
                            onClick={() => setSelectedChannel('tienda_online')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                selectedChannel === 'tienda_online' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                            }`}
                        >
                            Tienda Online
                        </button>
                        <button
                            onClick={() => setSelectedChannel('asesor_whatsapp')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                selectedChannel === 'asesor_whatsapp' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                            }`}
                        >
                            Asesor WhatsApp
                        </button>
                        <button
                            onClick={() => setSelectedChannel('mostrador_pos')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                selectedChannel === 'mostrador_pos' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                            }`}
                        >
                            Mostrador POS
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {activeRecipe.empaquePresentaciones.map((pres, idx) => {
                        const costoQuimicoSKU = costoQuimicoPorKg * pres.litros;
                        const costoEmpaqueSKU = pres.costoEnvaseYTapa + pres.costoEtiqueta;
                        const costoIndustrialTotal = costoQuimicoSKU + costoEmpaqueSKU + pres.manoObraLlenado;

                        // Flete y pasarelas según canal
                        const fleteReal = selectedChannel === 'mostrador_pos' ? 0 : pres.fleteRealPromedioCOP;
                        const fleteCobrado = selectedChannel === 'mostrador_pos' ? 0 : pres.fleteCobradoClienteCOP;
                        const subsidioFlete = Math.max(0, fleteReal - fleteCobrado);

                        // Comisión pasarela promedio (3% si online/contraentrega)
                        const comisionPasarela = selectedChannel === 'mostrador_pos' ? 0 : Math.round(pres.pvpPromedioCOP * 0.032);

                        // Margen Neto
                        const costoOperativoTotal = costoIndustrialTotal + fleteReal + comisionPasarela;
                        const ingresoTotal = pres.pvpPromedioCOP + fleteCobrado;
                        const margenNetoCOP = ingresoTotal - costoOperativoTotal;
                        const margenNetoPct = ingresoTotal > 0 ? Math.round((margenNetoCOP / ingresoTotal) * 100) : 0;

                        return (
                            <div key={idx} className="bg-slate-50/70 rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="font-black text-sm text-slate-900">
                                            {pres.presentacion}
                                        </span>
                                        <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                                            {pres.litros} Litros
                                        </span>
                                    </div>

                                    {/* Costos Unitarios */}
                                    <div className="space-y-1.5 pt-2 border-t border-slate-200 text-xs text-slate-600">
                                        <div className="flex justify-between">
                                            <span>Materia Prima Química:</span>
                                            <span className="font-mono font-medium text-slate-800">{formatCurrency(Math.round(costoQuimicoSKU))}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Garrafa + Tapa precintada:</span>
                                            <span className="font-mono font-medium text-slate-800">{formatCurrency(pres.costoEnvaseYTapa)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Etiqueta Laminada UV:</span>
                                            <span className="font-mono font-medium text-slate-800">{formatCurrency(pres.costoEtiqueta)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Mano de Obra / Llenado:</span>
                                            <span className="font-mono font-medium text-slate-800">{formatCurrency(pres.manoObraLlenado)}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                                            <span>Costo Industrial de Fábrica:</span>
                                            <span className="font-mono">{formatCurrency(Math.round(costoIndustrialTotal))}</span>
                                        </div>
                                    </div>

                                    {/* Logística & Subsidio */}
                                    {selectedChannel !== 'mostrador_pos' && (
                                        <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                                            <div className="flex justify-between text-[11px]">
                                                <span>Flete Real de Envío:</span>
                                                <span className="font-mono font-bold">{formatCurrency(fleteReal)}</span>
                                            </div>
                                            <div className="flex justify-between text-[11px]">
                                                <span>Cobrado al Cliente:</span>
                                                <span className="font-mono font-bold text-emerald-700">{formatCurrency(fleteCobrado)}</span>
                                            </div>
                                            <div className="flex justify-between text-[11px] pt-1 border-t border-amber-200 font-black">
                                                <span className="flex items-center gap-1">
                                                    <Truck size={12} /> Subsidio Biocambio360:
                                                </span>
                                                <span className="font-mono text-rose-700">-{formatCurrency(subsidioFlete)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Margen Neto de Contribución */}
                                <div className="pt-4 mt-3 border-t border-slate-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase block">PVP al Cliente</span>
                                            <span className="font-mono font-black text-slate-900 text-sm">
                                                {formatCurrency(pres.pvpPromedioCOP)}
                                            </span>
                                        </div>

                                        <div className="text-right">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Margen Neto Real</span>
                                            <div className="flex items-center gap-1.5 justify-end">
                                                <span className="font-mono font-black text-emerald-700 text-sm">
                                                    {formatCurrency(Math.round(margenNetoCOP))}
                                                </span>
                                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                                                    margenNetoPct >= 40
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : margenNetoPct >= 25
                                                        ? 'bg-amber-100 text-amber-800'
                                                        : 'bg-rose-100 text-rose-800'
                                                }`}>
                                                    {margenNetoPct}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
