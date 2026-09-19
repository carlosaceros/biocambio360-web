'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    Lock,
    Search,
    Calendar,
    RefreshCw,
    ChevronRight,
    ChevronDown,
    ArrowUpRight,
    ArrowDownRight,
    Bot,
    Cpu,
    Compass,
    Check,
    X,
    Filter
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@/lib/checkout-utils';
import {
    getMacroIndustrialSummary,
    getCompactBatchesIndex,
    searchIndustrialLots,
    getLotBOMBreakdown,
    filterAndConsolidateBatches,
    getSellInVsSellOutReconciliation,
    GranularLotBOMBreakdown,
    FilteredConsolidatedStats,
    CompactIndustrialBatch,
    IndustrialFilterOptions
} from '@/lib/industrial-analytics-service';

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
    const { user, role } = useAuth();
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

    // Pestaña Principal del Módulo
    const [activeTab, setActiveTab] = useState<'lot_bom' | 'macro_consolidated' | 'sell_in_out' | 'gemini_copilot'>('lot_bom');

    // --- ESTADO TAB 1: FICHA TÉCNICA & BOM POR LOTE ---
    const [selectedLotNumber, setSelectedLotNumber] = useState<string>('300926115');
    const [lotSearchInput, setLotSearchInput] = useState<string>('');
    const [isSearchingLots, setIsSearchingLots] = useState(false);
    const [rawMaterialInflationPct, setRawMaterialInflationPct] = useState<number>(0);
    const [selectedChannel, setSelectedChannel] = useState<'tienda_online' | 'asesor_whatsapp' | 'mostrador_pos'>('tienda_online');

    // Desglose del lote activo
    const activeLotBOM = useMemo(() => {
        return getLotBOMBreakdown(selectedLotNumber) || getLotBOMBreakdown('300926115');
    }, [selectedLotNumber]);

    // Resultados de búsqueda en tiempo real de lotes
    const searchedBatches = useMemo(() => {
        if (!lotSearchInput.trim()) return [];
        return searchIndustrialLots(lotSearchInput, 8);
    }, [lotSearchInput]);

    // Costo químico dinámico con simulador de inflación/descuento de materia prima
    const { costoQuimicoSimuladoCOP, costoTotalSimuladoCOP, costoLitroSimuladoCOP, margenSimuladoPct } = useMemo(() => {
        if (!activeLotBOM) {
            return { costoQuimicoSimuladoCOP: 0, costoTotalSimuladoCOP: 0, costoLitroSimuladoCOP: 0, margenSimuladoPct: 0 };
        }
        const factor = 1 + (rawMaterialInflationPct / 100);
        const costoQuimico = activeLotBOM.insumosQuimicos.reduce((acc, ing) => {
            return acc + (ing.kgTotal * (ing.costoUnitarioKg * factor));
        }, 0);
        const costoTotal = costoQuimico + activeLotBOM.costoEmpaqueTotalCOP;
        const costoLitro = activeLotBOM.volumenLitros > 0 ? costoTotal / activeLotBOM.volumenLitros : 0;
        const margen = activeLotBOM.pvpEstimadoTotalCOP > 0
            ? Math.round(((activeLotBOM.pvpEstimadoTotalCOP - costoTotal) / activeLotBOM.pvpEstimadoTotalCOP) * 1000) / 10
            : activeLotBOM.margenBrutoPct;

        return {
            costoQuimicoSimuladoCOP: Math.round(costoQuimico),
            costoTotalSimuladoCOP: Math.round(costoTotal),
            costoLitroSimuladoCOP: Math.round(costoLitro * 100) / 100,
            margenSimuladoPct: margen
        };
    }, [activeLotBOM, rawMaterialInflationPct]);

    // --- ESTADO TAB 2: CONSOLIDADO MACRO INDUSTRIAL (MULTI-MES / ANUAL) ---
    const [macroFilters, setMacroFilters] = useState<IndustrialFilterOptions>({
        year: 'all',
        quarter: 'all',
        month: 'all',
        category: 'all',
        tank: 'all',
        searchQuery: ''
    });

    const consolidatedData = useMemo(() => {
        return filterAndConsolidateBatches(macroFilters);
    }, [macroFilters]);

    // --- ESTADO TAB 3: CONCILIACIÓN SELL-IN VS SELL-OUT ---
    const [reconciliationYear, setReconciliationYear] = useState<number>(2026);
    const reconciliationData = useMemo(() => {
        return getSellInVsSellOutReconciliation(reconciliationYear);
    }, [reconciliationYear]);

    // --- ESTADO TAB 4: COPILOT IA GEMINI INDUSTRIAL 2026-2030 ---
    const [aiAction, setAiAction] = useState<'analizar_lote' | 'analizar_periodo' | 'estrategia_2026_2030'>('analizar_lote');
    const [aiReport, setAiReport] = useState<string | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    const handleRunAiAudit = async (actionType: 'analizar_lote' | 'analizar_periodo' | 'estrategia_2026_2030') => {
        setAiAction(actionType);
        setIsAiLoading(true);
        setAiReport(null);

        try {
            const payload: any = { action: actionType };

            if (actionType === 'analizar_lote') {
                payload.loteData = activeLotBOM;
            } else {
                const periodoNombre = macroFilters.year === 'all'
                    ? 'Todo el Histórico 2025-2026'
                    : `Año ${macroFilters.year}${macroFilters.quarter !== 'all' ? ' - ' + macroFilters.quarter : ''}`;
                payload.periodoData = {
                    periodoNombre,
                    ...consolidatedData.stats
                };
            }

            const res = await fetch('/api/ai/industrial-copilot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.report) {
                setAiReport(data.report);
            } else {
                setAiReport('No se pudo generar el dictamen con IA. Revisa la consola o configuración.');
            }
        } catch (err) {
            console.error('Error llamando a Copilot Industrial:', err);
            setAiReport('Ocurrió un error al contactar al motor de IA.');
        } finally {
            setIsAiLoading(false);
        }
    };

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
            {/* ENCABEZADO MAESTRO DE INTELIGENCIA INDUSTRIAL */}
            <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black tracking-widest text-indigo-300 uppercase">
                            Ingeniería Química, SGC & Big Data Biocambio360
                        </span>
                        <span className="bg-emerald-400 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <Shield size={11} /> 2,534 Órdenes SGC Validadas
                        </span>
                        <span className="bg-indigo-500/30 text-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            FR-001-POE-007
                        </span>
                    </div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                        <Factory size={22} className="text-indigo-400" />
                        Inteligencia Industrial Big Data, Desglose BOM & BI Estratégico (2025 - 2026)
                    </h2>
                    <p className="text-xs text-slate-300 max-w-3xl">
                        Desglose granular de formulaciones químicas por lote, cubos multidimensionales para cualquier rango de fechas, balance Sell-In vs Sell-Out y auditoría predictiva con IA Gemini hacia 2030.
                    </p>
                </div>

                {/* KPI RÁPIDO EN CABECERA */}
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/10 shrink-0">
                    <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Inversión COGS Total</span>
                        <span className="text-sm font-black text-amber-400 font-mono">
                            {formatCurrency(getMacroIndustrialSummary().totalCostoIndustrialCOP)}
                        </span>
                    </div>
                    <div className="h-8 w-px bg-white/10" />
                    <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold block uppercase">Volumen Acumulado</span>
                        <span className="text-sm font-black text-emerald-400 font-mono">
                            {getMacroIndustrialSummary().totalVolumenLitros.toLocaleString()} L
                        </span>
                    </div>
                </div>
            </div>

            {/* NAVEGACIÓN ENTRE 4 SUB-PESTAÑAS DE INTELIGENCIA INDUSTRIAL */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
                <button
                    onClick={() => setActiveTab('lot_bom')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'lot_bom'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                    <FlaskConical size={15} />
                    <span>🔬 Ficha Técnica & BOM por Lote</span>
                </button>

                <button
                    onClick={() => setActiveTab('macro_consolidated')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'macro_consolidated'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                    <BarChart3 size={15} />
                    <span>📊 Consolidado Macro (Multi-Mes / Anual)</span>
                </button>

                <button
                    onClick={() => setActiveTab('sell_in_out')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'sell_in_out'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                    <Scale size={15} />
                    <span>⚖️ Conciliación Sell-In vs Sell-Out</span>
                </button>

                <button
                    onClick={() => setActiveTab('gemini_copilot')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                        activeTab === 'gemini_copilot'
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                    <Sparkles size={15} className="text-amber-400" />
                    <span>✨ Copilot IA Gemini Industrial 2026-2030</span>
                </button>
            </div>

            {/* ========================================================================= */}
            {/* PESTAÑA 1: FICHA TÉCNICA & DESGLOSE BOM UNIVERSAL POR LOTE                */}
            {/* ========================================================================= */}
            {activeTab === 'lot_bom' && (
                <div className="space-y-6">
                    {/* BARRA DE BÚSQUEDA UNIVERSAL DE CUALQUIER LOTE */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="relative flex-1">
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={lotSearchInput}
                                    onChange={(e) => {
                                        setLotSearchInput(e.target.value);
                                        setIsSearchingLots(true);
                                    }}
                                    placeholder="Buscar por # de lote (ej. 300926115, 300926072), producto (ej. Lavaloza, Suavizante) o tanque..."
                                    className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                />
                                {lotSearchInput && (
                                    <button
                                        onClick={() => {
                                            setLotSearchInput('');
                                            setIsSearchingLots(false);
                                        }}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X size={14} />
                                    </button>
                                )}

                                {/* Desplegable de Resultados en Tiempo Real */}
                                {isSearchingLots && searchedBatches.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl z-20 max-h-64 overflow-y-auto divide-y divide-slate-100">
                                        {searchedBatches.map((b) => (
                                            <button
                                                key={b.lote}
                                                onClick={() => {
                                                    setSelectedLotNumber(b.lote);
                                                    setLotSearchInput('');
                                                    setIsSearchingLots(false);
                                                }}
                                                className="w-full text-left px-3.5 py-2.5 hover:bg-indigo-50/70 transition-colors flex items-center justify-between text-xs"
                                            >
                                                <div>
                                                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                                        <span className="font-mono text-indigo-600">#{b.lote}</span>
                                                        <span>·</span>
                                                        <span>{b.producto}</span>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400">
                                                        {b.fecha} · {b.volumenLitros} L · {b.tanque} · {b.categoria}
                                                    </span>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="font-mono font-bold text-slate-700 block">
                                                        {formatCurrency(b.costoTotalIndustrial)}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-emerald-600">
                                                        {b.margenBrutoPct}% margen
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* CHIPS DE ACCESO RÁPIDO A LOTES AUDITADOS */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Lotes Clave:</span>
                                {[
                                    { lote: '300926115', label: 'Lavaloza CB #115' },
                                    { lote: '300926114', label: 'Multiusos #114' },
                                    { lote: '300926112', label: 'Desengrasante #112' },
                                    { lote: '300926072', label: 'Ropa Negra #072' },
                                    { lote: '700226115', label: 'Destapacañerias' }
                                ].map((chip) => (
                                    <button
                                        key={chip.lote}
                                        onClick={() => setSelectedLotNumber(chip.lote)}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                            selectedLotNumber === chip.lote
                                                ? 'bg-amber-400 text-slate-950 shadow-xs font-black'
                                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                        }`}
                                    >
                                        {chip.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* FICHA TÉCNICA DEL LOTE SELECCIONADO */}
                    {activeLotBOM && (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Lote Producción</span>
                                    <span className="font-mono font-black text-slate-900 text-sm mt-0.5 block">#{activeLotBOM.lote}</span>
                                    <span className="text-[10px] text-slate-500">{activeLotBOM.fecha}</span>
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Batch & Tanque</span>
                                    <span className="font-mono font-black text-indigo-600 text-sm mt-0.5 block">{activeLotBOM.volumenLitros} L</span>
                                    <span className="text-[10px] text-slate-500 truncate block">{activeLotBOM.tanque}</span>
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">pH & Densidad</span>
                                    <span className="font-black text-emerald-600 text-sm mt-0.5 block">pH {activeLotBOM.controlCalidad.ph}</span>
                                    <span className="text-[10px] text-slate-500">Densidad: {activeLotBOM.controlCalidad.densidad}</span>
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Costo / Litro</span>
                                    <span className="font-mono font-black text-indigo-700 text-sm mt-0.5 block">
                                        {formatCurrency(Math.round(costoLitroSimuladoCOP))}
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                        {rawMaterialInflationPct !== 0 ? `(${rawMaterialInflationPct > 0 ? '+' : ''}${rawMaterialInflationPct}% MP)` : 'Costo fábrica'}
                                    </span>
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Costo Total Industrial</span>
                                    <span className="font-mono font-black text-slate-900 text-sm mt-0.5 block">
                                        {formatCurrency(costoTotalSimuladoCOP)}
                                    </span>
                                    <span className="text-[10px] text-slate-500">Química + Empaque</span>
                                </div>
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Margen & Merma</span>
                                    <span className="font-mono font-black text-emerald-600 text-sm mt-0.5 block">
                                        {margenSimuladoPct}% Bruto
                                    </span>
                                    <span className="text-[10px] text-rose-500 font-bold">
                                        Merma: {activeLotBOM.mermaPct}% ({formatCurrency(activeLotBOM.perdidaMermaCOP)})
                                    </span>
                                </div>
                            </div>

                            {/* SIMULADOR DE ESTRÉS DE PRECIOS QUÍMICOS */}
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

                            {/* TABLA 1: DESGLOSE QUÍMICO BOM POR INSUMO Y PROVEEDOR */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                            <FlaskConical size={16} className="text-indigo-600" />
                                            Lista de Materiales Químicos (BOM) — Lote #{activeLotBOM.lote} ({activeLotBOM.producto})
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            Receta SGC certificada · Operario Responsable: {activeLotBOM.elaboradoPor}
                                        </p>
                                    </div>
                                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                                        {activeLotBOM.insumosQuimicos.length} Insumos Registrados
                                    </span>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-100/75 text-slate-500 uppercase font-bold border-b border-slate-200 text-[10px]">
                                            <tr>
                                                <th className="py-3 px-4">Insumo Químico</th>
                                                <th className="py-3 px-4">Proveedor Oficial</th>
                                                <th className="py-3 px-4">Lote Materia Prima</th>
                                                <th className="py-3 px-4 text-right">Dosificación (%)</th>
                                                <th className="py-3 px-4 text-right">Cantidad Batch (Kg)</th>
                                                <th className="py-3 px-4 text-right">Costo Unitario ($/Kg)</th>
                                                <th className="py-3 px-4 text-right">Subtotal Batch</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {activeLotBOM.insumosQuimicos.map((ins, idx) => {
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

                            {/* TABLA 2: COSTEO POR PRESENTACIÓN, EMPAQUE, LOGÍSTICA Y MÁRGENES NETOS */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                            <Package size={16} className="text-emerald-600" />
                                            Costos de Empaque, Mano de Obra, Subsidio de Flete y Margen Neto
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            Desglose de garrafa HDPE, tapa con precinto, etiqueta UV, flete real y margen neto de contribución.
                                        </p>
                                    </div>

                                    {/* Selector de Canal Comercial */}
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
                                    {activeLotBOM.empaquePresentaciones.map((pres, idx) => {
                                        const costoQuimicoSKU = (costoLitroSimuladoCOP * pres.litrosPorUnidad);
                                        const costoEmpaqueSKU = pres.costoEnvaseYTapa + pres.costoEtiqueta;
                                        const costoIndustrialTotal = costoQuimicoSKU + costoEmpaqueSKU + pres.manoObraLlenado;

                                        // Flete según canal
                                        const fleteReal = selectedChannel === 'mostrador_pos' ? 0 : (pres.litrosPorUnidad >= 20 ? 22000 : pres.litrosPorUnidad >= 3.8 ? 14000 : 11000);
                                        const fleteCobrado = selectedChannel === 'mostrador_pos' ? 0 : (pres.litrosPorUnidad >= 20 ? 12000 : 8000);
                                        const subsidioFlete = Math.max(0, fleteReal - fleteCobrado);
                                        const comisionPasarela = selectedChannel === 'mostrador_pos' ? 0 : Math.round(pres.pvpEstimadoCOP * 0.032);

                                        // Margen Neto
                                        const costoOperativoTotal = costoIndustrialTotal + fleteReal + comisionPasarela;
                                        const ingresoTotal = pres.pvpEstimadoCOP + fleteCobrado;
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
                                                            {pres.unidades} Unds ({pres.litrosPorUnidad} L)
                                                        </span>
                                                    </div>

                                                    {/* Costos Unitarios */}
                                                    <div className="space-y-1.5 pt-2 border-t border-slate-200 text-xs text-slate-600">
                                                        <div className="flex justify-between">
                                                            <span>Materia Prima Química:</span>
                                                            <span className="font-mono font-medium text-slate-800">{formatCurrency(Math.round(costoQuimicoSKU))}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Envase + Tapa precinto:</span>
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
                                                            <span>Costo Industrial Fábrica:</span>
                                                            <span className="font-mono">{formatCurrency(Math.round(costoIndustrialTotal))}</span>
                                                        </div>
                                                    </div>

                                                    {/* Subsidio de Flete */}
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

                                                {/* Margen Neto */}
                                                <div className="pt-4 mt-3 border-t border-slate-200">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase block">PVP al Cliente</span>
                                                            <span className="font-mono font-black text-slate-900 text-sm">
                                                                {formatCurrency(pres.pvpEstimadoCOP)}
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
                        </>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* PESTAÑA 2: CONSOLIDADO MACRO INDUSTRIAL (MULTI-MES / ANUAL)               */}
            {/* ========================================================================= */}
            {activeTab === 'macro_consolidated' && (
                <div className="space-y-6">
                    {/* BARRA DE FILTROS DINÁMICOS */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                        <div className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-wider">
                            <Filter size={14} className="text-indigo-600" />
                            <span>Filtrar Cubos de Producción por Periodo, Categoría & Tanque</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                            {/* Año */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Año</label>
                                <select
                                    value={macroFilters.year}
                                    onChange={(e) => setMacroFilters(prev => ({ ...prev, year: e.target.value === 'all' ? 'all' : Number(e.target.value) }))}
                                    className="w-full text-xs py-1.5 px-2 rounded-xl border border-slate-200 bg-white font-medium"
                                >
                                    <option value="all">Todo el Histórico (2025-2026)</option>
                                    <option value="2026">Año 2026</option>
                                    <option value="2025">Año 2025</option>
                                </select>
                            </div>

                            {/* Trimestre */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Trimestre</label>
                                <select
                                    value={macroFilters.quarter}
                                    onChange={(e) => setMacroFilters(prev => ({ ...prev, quarter: e.target.value }))}
                                    className="w-full text-xs py-1.5 px-2 rounded-xl border border-slate-200 bg-white font-medium"
                                >
                                    <option value="all">Todos los Trimestres</option>
                                    <option value="Q1">Q1 (Ene - Mar)</option>
                                    <option value="Q2">Q2 (Abr - Jun)</option>
                                    <option value="Q3">Q3 (Jul - Sep)</option>
                                    <option value="Q4">Q4 (Oct - Dic)</option>
                                </select>
                            </div>

                            {/* Mes */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Mes</label>
                                <select
                                    value={macroFilters.month}
                                    onChange={(e) => setMacroFilters(prev => ({ ...prev, month: e.target.value === 'all' ? 'all' : Number(e.target.value) }))}
                                    className="w-full text-xs py-1.5 px-2 rounded-xl border border-slate-200 bg-white font-medium"
                                >
                                    <option value="all">Todos los Meses</option>
                                    {[
                                        { val: 1, name: 'Enero' }, { val: 2, name: 'Febrero' }, { val: 3, name: 'Marzo' },
                                        { val: 4, name: 'Abril' }, { val: 5, name: 'Mayo' }, { val: 6, name: 'Junio' },
                                        { val: 7, name: 'Julio' }, { val: 8, name: 'Agosto' }, { val: 9, name: 'Septiembre' },
                                        { val: 10, name: 'Octubre' }, { val: 11, name: 'Noviembre' }, { val: 12, name: 'Diciembre' }
                                    ].map(m => (
                                        <option key={m.val} value={m.val}>{m.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Categoría */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Categoría</label>
                                <select
                                    value={macroFilters.category}
                                    onChange={(e) => setMacroFilters(prev => ({ ...prev, category: e.target.value }))}
                                    className="w-full text-xs py-1.5 px-2 rounded-xl border border-slate-200 bg-white font-medium"
                                >
                                    <option value="all">Todas las Categorías</option>
                                    <option value="Detergentes">Detergentes</option>
                                    <option value="Limpiapisos">Limpiapisos</option>
                                    <option value="Desengrasantes">Desengrasantes</option>
                                    <option value="Lavaloza y Cocina">Lavaloza y Cocina</option>
                                    <option value="Suavizantes">Suavizantes</option>
                                    <option value="Blanqueadores y Desinfección">Desinfección y Cloros</option>
                                    <option value="Ambientadores y Aromas">Ambientadores</option>
                                    <option value="Línea Automotriz">Línea Automotriz</option>
                                </select>
                            </div>

                            {/* Búsqueda textual */}
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Filtro Rápido</label>
                                <input
                                    type="text"
                                    value={macroFilters.searchQuery || ''}
                                    onChange={(e) => setMacroFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                                    placeholder="Filtrar por texto..."
                                    className="w-full text-xs py-1.5 px-2.5 rounded-xl border border-slate-200 font-medium"
                                />
                            </div>
                        </div>
                    </div>

                    {/* KPI CARDS MACRO */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Batches Auditados</span>
                            <span className="font-mono font-black text-slate-900 text-lg mt-0.5 block">
                                {consolidatedData.stats.totalBatches.toLocaleString()} OPs
                            </span>
                            <span className="text-[10px] text-emerald-600 font-bold">100% Trazabilidad SGC</span>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Volumen Elaborado</span>
                            <span className="font-mono font-black text-indigo-600 text-lg mt-0.5 block">
                                {consolidatedData.stats.totalVolumenLitros.toLocaleString()} L
                            </span>
                            <span className="text-[10px] text-slate-500">Capacidad dispensada</span>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Inversión COGS</span>
                            <span className="font-mono font-black text-slate-900 text-lg mt-0.5 block">
                                {formatCurrency(consolidatedData.stats.totalCostoIndustrialCOP)}
                            </span>
                            <span className="text-[10px] text-slate-500">Costo industrial total</span>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Costo Medio / Litro</span>
                            <span className="font-mono font-black text-indigo-700 text-lg mt-0.5 block">
                                {formatCurrency(Math.round(consolidatedData.stats.costoMedioLitroCOP))}
                            </span>
                            <span className="text-[10px] text-slate-500">Ponderado industrial</span>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Margen Bruto Medio</span>
                            <span className="font-mono font-black text-emerald-600 text-lg mt-0.5 block">
                                {consolidatedData.stats.margenBrutoPromedioPct}%
                            </span>
                            <span className="text-[10px] text-slate-500">Rentabilidad operativa</span>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Rendimiento & Merma</span>
                            <span className="font-mono font-black text-slate-900 text-lg mt-0.5 block">
                                {consolidatedData.stats.rendimientoPromedioPct}%
                            </span>
                            <span className="text-[10px] text-rose-500 font-bold">
                                Merma {consolidatedData.stats.mermaPromedioPct}% (-{formatCurrency(consolidatedData.stats.perdidaTotalMermaCOP)})
                            </span>
                        </div>
                    </div>

                    {/* SECCIÓN DE DISTRIBUCIÓN POR CATEGORÍAS & MEZCLA DE EMPAQUE */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Categorías */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                <Layers size={16} className="text-indigo-600" />
                                Distribución por Categoría de Producto
                            </h3>
                            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                                {consolidatedData.stats.distribucionCategorias.map((cat, idx) => (
                                    <div key={idx} className="space-y-1">
                                        <div className="flex justify-between text-xs font-bold text-slate-800">
                                            <span>{cat.categoria} ({cat.batchesCount} OPs)</span>
                                            <span className="font-mono">{cat.volumenLitros.toLocaleString()} L ({cat.porcentajeVolumen}%)</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-indigo-600 h-full rounded-full transition-all"
                                                style={{ width: `${Math.min(100, cat.porcentajeVolumen)}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[10px] text-slate-400">
                                            <span>Costo: {formatCurrency(cat.costoTotalCOP)}</span>
                                            <span>$/L: {cat.volumenLitros > 0 ? formatCurrency(Math.round(cat.costoTotalCOP / cat.volumenLitros)) : '$0'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Mezcla de Empaques y Presentaciones */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                <Package size={16} className="text-emerald-600" />
                                Mezcla de Presentaciones & Empaque (SKUs)
                            </h3>
                            <div className="grid grid-cols-3 gap-3">
                                {consolidatedData.stats.distribucionPresentaciones.map((pres, idx) => (
                                    <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center space-y-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">{pres.presentacion}</span>
                                        <span className="font-mono font-black text-slate-900 text-base block">
                                            {pres.unidades.toLocaleString()} Unds
                                        </span>
                                        <span className="text-[10px] text-indigo-600 font-bold block">
                                            {pres.litros.toLocaleString()} Litros
                                        </span>
                                        <span className="text-[10px] text-slate-500 block">
                                            Costo: {formatCurrency(pres.costoEmpaqueCOP)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Tanques Utilizados */}
                            <div className="pt-2 border-t border-slate-100 space-y-2">
                                <span className="text-xs font-black text-slate-800 uppercase block">Tanques de Mezclado Utilizados</span>
                                <div className="flex flex-wrap gap-2">
                                    {consolidatedData.stats.tanquesUtilizados.slice(0, 6).map((t, idx) => (
                                        <span key={idx} className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-lg font-medium">
                                            {t.tanque}: <strong className="font-mono">{t.batchesCount} batches</strong> ({t.volumenLitros.toLocaleString()} L)
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* LISTA DE LOTES RECIENTES DEL SUBCONJUNTO */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                    <FileSpreadsheet size={16} className="text-indigo-600" />
                                    Órdenes de Producción Filtradas ({consolidatedData.batches.length} lotes)
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Haz clic en cualquier lote para inspeccionar su formulación química completa en la Pestaña 1.
                                </p>
                            </div>
                        </div>

                        <div className="overflow-x-auto max-h-96">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100/75 text-slate-500 uppercase font-bold border-b border-slate-200 text-[10px] sticky top-0 z-10">
                                    <tr>
                                        <th className="py-2.5 px-4">Lote</th>
                                        <th className="py-2.5 px-4">Fecha</th>
                                        <th className="py-2.5 px-4">Producto</th>
                                        <th className="py-2.5 px-4">Categoría</th>
                                        <th className="py-2.5 px-4 text-right">Volumen</th>
                                        <th className="py-2.5 px-4 text-right">Costo Total</th>
                                        <th className="py-2.5 px-4 text-right">$/Litro</th>
                                        <th className="py-2.5 px-4 text-right">Margen</th>
                                        <th className="py-2.5 px-4 text-center">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {consolidatedData.batches.slice(0, 30).map((b) => (
                                        <tr key={b.lote} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="py-2.5 px-4 font-mono font-bold text-indigo-600">
                                                #{b.lote}
                                            </td>
                                            <td className="py-2.5 px-4 text-slate-600">{b.fecha}</td>
                                            <td className="py-2.5 px-4 font-bold text-slate-900">{b.producto}</td>
                                            <td className="py-2.5 px-4 text-slate-600">{b.categoria}</td>
                                            <td className="py-2.5 px-4 text-right font-mono font-medium">{b.volumenLitros} L</td>
                                            <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                                                {formatCurrency(b.costoTotalIndustrial)}
                                            </td>
                                            <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                                                {formatCurrency(Math.round(b.costoPorLitro))}
                                            </td>
                                            <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600">
                                                {b.margenBrutoPct}%
                                            </td>
                                            <td className="py-2.5 px-4 text-center">
                                                <button
                                                    onClick={() => {
                                                        setSelectedLotNumber(b.lote);
                                                        setActiveTab('lot_bom');
                                                    }}
                                                    className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md font-bold text-[11px] transition-colors cursor-pointer"
                                                >
                                                    Ver BOM ➔
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* PESTAÑA 3: CONCILIACIÓN SELL-IN VS SELL-OUT                               */}
            {/* ========================================================================= */}
            {activeTab === 'sell_in_out' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                <Scale size={16} className="text-indigo-600" />
                                Conciliación Industrial Sell-In vs Sell-Out (Planta vs Comercial)
                            </h3>
                            <p className="text-xs text-slate-500">
                                Compara los litros fabricados en Planta Soacha contra las ventas comercializadas en e-commerce, WhatsApp y POS.
                            </p>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button
                                onClick={() => setReconciliationYear(2026)}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    reconciliationYear === 2026 ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                                }`}
                            >
                                Año 2026 (YTD)
                            </button>
                            <button
                                onClick={() => setReconciliationYear(2025)}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    reconciliationYear === 2025 ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                                }`}
                            >
                                Año 2025 (Cierre)
                            </button>
                        </div>
                    </div>

                    {/* KPI CARDS DE CONCILIACIÓN */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Litros Elaborados Planta</span>
                            <span className="font-mono font-black text-indigo-600 text-lg mt-0.5 block">
                                {reconciliationData.litrosElaboradosPlanta.toLocaleString()} L
                            </span>
                            <span className="text-[10px] text-slate-500">Sell-In Total</span>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Litros Vendidos Comercial</span>
                            <span className="font-mono font-black text-emerald-600 text-lg mt-0.5 block">
                                {reconciliationData.litrosVendidosComercial.toLocaleString()} L
                            </span>
                            <span className="text-[10px] text-slate-500">Sell-Out Total</span>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Stock Remanente Bodega</span>
                            <span className="font-mono font-black text-slate-900 text-lg mt-0.5 block">
                                {reconciliationData.brechaStockRemanenteLitros.toLocaleString()} L
                            </span>
                            <span className="text-[10px] text-slate-500">Inventario disponible</span>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Rotación Promedio</span>
                            <span className="font-mono font-black text-amber-600 text-lg mt-0.5 block">
                                {reconciliationData.tasaRotacionInventarioDias} Días
                            </span>
                            <span className="text-[10px] text-emerald-600 font-bold">Ciclo ágil</span>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Merma Logística Estimada</span>
                            <span className="font-mono font-black text-rose-600 text-lg mt-0.5 block">
                                {reconciliationData.mermaLogisticaEstimadaLitros.toLocaleString()} L
                            </span>
                            <span className="text-[10px] text-slate-500">1.5% transporte y manipulación</span>
                        </div>
                    </div>

                    {/* TABLA DE PRODUCTOS CONCILIADOS */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                            <h3 className="text-sm font-black text-slate-900">
                                Conciliación de Volumen por Producto & Estado de Inventario ({reconciliationYear})
                            </h3>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100/75 text-slate-500 uppercase font-bold border-b border-slate-200 text-[10px]">
                                    <tr>
                                        <th className="py-3 px-4">Producto</th>
                                        <th className="py-3 px-4">Categoría</th>
                                        <th className="py-3 px-4 text-right">Litros Fabricados</th>
                                        <th className="py-3 px-4 text-right">Litros Vendidos</th>
                                        <th className="py-3 px-4 text-right">Balance en Bodega</th>
                                        <th className="py-3 px-4 text-center">Estado Rotación</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {reconciliationData.productosConciliados.map((p, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="py-3 px-4 font-bold text-slate-900">{p.producto}</td>
                                            <td className="py-3 px-4 text-slate-600">{p.categoria}</td>
                                            <td className="py-3 px-4 text-right font-mono font-medium text-slate-800">
                                                {p.litrosFabricados.toLocaleString()} L
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-medium text-emerald-700">
                                                {p.litrosVendidos.toLocaleString()} L
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                                                {p.balanceInventario.toLocaleString()} L
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                                    p.estadoRotacion === 'Alta Rotación'
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : p.estadoRotacion === 'Estable'
                                                        ? 'bg-indigo-100 text-indigo-800'
                                                        : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                    {p.estadoRotacion}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* PESTAÑA 4: COPILOT IA GEMINI INDUSTRIAL 2026-2030                         */}
            {/* ========================================================================= */}
            {activeTab === 'gemini_copilot' && (
                <div className="space-y-6">
                    <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-indigo-800/50 space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <Sparkles size={11} /> Google Gemini AI Industrial
                            </span>
                            <span className="text-xs text-indigo-200">
                                Consultor Senior de Operaciones, Lean Manufacturing & S&OP
                            </span>
                        </div>

                        <div>
                            <h3 className="text-lg font-black text-white">
                                Auditoría Predictiva, Costeo BOM Cuantitativo & Hoja de Ruta 2026 - 2030
                            </h3>
                            <p className="text-xs text-slate-300 max-w-2xl mt-1">
                                Aplica matemática financiera e ingeniería industrial avanzada a los datos reales de tu planta para reducir mermas, optimizar contratos de materias primas y escalar la capacidad de producción.
                            </p>
                        </div>

                        {/* BOTONES DE ACCIÓN DE IA */}
                        <div className="flex flex-wrap gap-3 pt-2">
                            <button
                                onClick={() => handleRunAiAudit('analizar_lote')}
                                disabled={isAiLoading}
                                className="px-4 py-2.5 bg-white text-slate-900 hover:bg-amber-400 font-black rounded-xl text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                <FlaskConical size={14} className="text-indigo-600" />
                                <span>🧪 Auditar Lote #{selectedLotNumber} con IA</span>
                            </button>

                            <button
                                onClick={() => handleRunAiAudit('analizar_periodo')}
                                disabled={isAiLoading}
                                className="px-4 py-2.5 bg-indigo-500/30 hover:bg-indigo-500/50 text-white font-black rounded-xl text-xs transition-all border border-indigo-400/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                <BarChart3 size={14} className="text-emerald-400" />
                                <span>📊 Dictamen Macro del Periodo Seleccionado</span>
                            </button>

                            <button
                                onClick={() => handleRunAiAudit('estrategia_2026_2030')}
                                disabled={isAiLoading}
                                className="px-4 py-2.5 bg-purple-500/30 hover:bg-purple-500/50 text-white font-black rounded-xl text-xs transition-all border border-purple-400/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                <Compass size={14} className="text-amber-400" />
                                <span>🔮 Plan Estratégico Industrial 2026 - 2030</span>
                            </button>
                        </div>
                    </div>

                    {/* ESTADO DE CARGA */}
                    {isAiLoading && (
                        <div className="bg-white rounded-2xl border border-indigo-100 p-8 text-center space-y-3 shadow-xs">
                            <RefreshCw size={28} className="animate-spin text-indigo-600 mx-auto" />
                            <h4 className="text-sm font-black text-slate-900">
                                Analizando Big Data Industrial con Gemini AI...
                            </h4>
                            <p className="text-xs text-slate-500 max-w-md mx-auto">
                                Cruzando formulación química, rendimientos históricos, costos unitarios de proveedores (Chemical, DISAN) y proyecciones de demanda.
                            </p>
                        </div>
                    )}

                    {/* REPORTE DE IA RENDERIZADO */}
                    {!isAiLoading && aiReport && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-2">
                                    <Bot size={18} className="text-indigo-600" />
                                    <span className="text-xs font-black text-slate-900 uppercase">
                                        Dictamen Técnico Generado
                                    </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">
                                    Modelo: Gemini 1.5 Flash · SGC Biocambio360
                                </span>
                            </div>

                            <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-normal space-y-2">
                                {aiReport}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
