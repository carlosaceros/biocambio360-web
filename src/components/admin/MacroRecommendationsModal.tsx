'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Sparkles,
    Calendar,
    TrendingUp,
    Users,
    Target,
    Award,
    AlertTriangle,
    CheckCircle2,
    Copy,
    ChevronRight,
    RefreshCw,
    BarChart3,
    ArrowUpRight,
    FileText,
    Layers,
    Clock,
    Zap
} from 'lucide-react';
import { formatCurrency } from '@/lib/checkout-utils';
import {
    getMonthlyInsightsHistory,
    getMacroConsolidationData,
    MonthlyInsightRecord,
    MacroConsolidationData
} from '@/lib/monthly-insights-service';

interface MacroRecommendationsModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialYear?: number;
    initialMonth?: number;
}

export default function MacroRecommendationsModal({
    isOpen,
    onClose,
    initialYear = 2026,
    initialMonth = 8
}: MacroRecommendationsModalProps) {
    const [activeTab, setActiveTab] = useState<'macro' | 'historial'>('macro');
    const [selectedPeriodType, setSelectedPeriodType] = useState<'trimestre' | 'semestre' | 'anio'>('trimestre');
    const [selectedPeriodValue, setSelectedPeriodValue] = useState<string>('Q3');
    const [selectedYear, setSelectedYear] = useState<number>(initialYear);

    // Estados de datos
    const [historyRecords, setHistoryRecords] = useState<MonthlyInsightRecord[]>([]);
    const [macroData, setMacroData] = useState<MacroConsolidationData | null>(null);
    const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<MonthlyInsightRecord | null>(null);

    // Estados de IA
    const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
    const [aiExecutiveBrief, setAiExecutiveBrief] = useState<{
        diagnostico_gerencial?: string;
        riesgo_estructural?: string;
        palanca_crecimiento?: string;
        plan_accion_directores?: string[];
        mensaje_motivacional_equipo?: string;
    } | null>(null);
    const [copiedToast, setCopiedToast] = useState<boolean>(false);

    // Cargar historial
    useEffect(() => {
        if (isOpen) {
            getMonthlyInsightsHistory().then(records => {
                setHistoryRecords(records);
                const current = records.find(r => r.anio === selectedYear && r.mesNumero === initialMonth) || records[0];
                setSelectedHistoryMonth(current || null);
            });
        }
    }, [isOpen, selectedYear, initialMonth]);

    // Recalcular consolidación macro cuando cambie período o año
    useEffect(() => {
        const data = getMacroConsolidationData(selectedPeriodType, selectedPeriodValue, selectedYear);
        setMacroData(data);
        setAiExecutiveBrief(null);
    }, [selectedPeriodType, selectedPeriodValue, selectedYear]);

    if (!isOpen) return null;

    const handleGenerateAiBrief = async () => {
        if (!macroData) return;
        setIsGeneratingAi(true);
        try {
            const res = await fetch('/api/ai/sales-copilot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'consolidar_macro',
                    macroData
                })
            });
            const data = await res.json();
            if (data.success) {
                setAiExecutiveBrief(data);
            }
        } catch (err) {
            console.error('Error generando síntesis macro con IA:', err);
        } finally {
            setIsGeneratingAi(false);
        }
    };

    const handleCopyReport = () => {
        if (!macroData) return;
        const text = `📊 INFORME EJECUTIVO MACRO — BIOCAMBIO360
Período: ${macroData.periodLabel}
Ventas Totales: $${macroData.ventasTotalesMillones}M COP (${macroData.porcentajeCumplimiento}% de la Meta)
Clientes Nuevos Totales: ${macroData.clientesNuevosTotales}
Ticket Promedio Ponderado: $${macroData.ticketPromedioPonderado.toLocaleString('es-CO')} COP

🎯 HALLAZGOS DIRECTIVOS:
• Concentración: ${macroData.macroHallazgos.concentracion.diagnostico}
• Líder Prospección: ${macroData.macroHallazgos.cazadorPeriodo.diagnostico}
• Riesgo Comercial: ${macroData.macroHallazgos.asesorCriticoPeriodo.diagnostico}

📌 DIRECTRICES ESTRATÉGICAS:
${macroData.directricesEstrategicas.join('\n')}

${aiExecutiveBrief ? `\n🤖 SÍNTESIS GERENCIAL IA:\n${aiExecutiveBrief.diagnostico_gerencial}\n\nPALANCA DE CRECIMIENTO:\n${aiExecutiveBrief.palanca_crecimiento}` : ''}
`;
        navigator.clipboard.writeText(text);
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 2500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            <span>Business Intelligence & Consolidación Estratégica</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-white">
                            Historial de Recomendaciones & Análisis Macro
                        </h2>
                        <p className="text-xs text-slate-300 mt-0.5">
                            Seguimiento mensual persistente y consolidación gerencial por Trimestres, Semestres y Años
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Selector de Pestañas */}
                        <div className="bg-white/10 p-1 rounded-2xl flex gap-1 border border-white/10">
                            <button
                                onClick={() => setActiveTab('macro')}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    activeTab === 'macro'
                                        ? 'bg-white text-slate-950 shadow-xs'
                                        : 'text-slate-300 hover:text-white'
                                }`}
                            >
                                📈 Consolidación Macro
                            </button>
                            <button
                                onClick={() => setActiveTab('historial')}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    activeTab === 'historial'
                                        ? 'bg-white text-slate-950 shadow-xs'
                                        : 'text-slate-300 hover:text-white'
                                }`}
                            >
                                🗂️ Historial Mensual
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body con Scroll */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-slate-50">
                    {/* ─────────────────────────────────────────────────────────────
                        PESTAÑA 1: CONSOLIDACIÓN MACRO
                    ───────────────────────────────────────────────────────────── */}
                    {activeTab === 'macro' && macroData && (
                        <div className="space-y-6">
                            {/* Barra de Filtros de Período */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Período:</span>

                                    {/* Tipo */}
                                    <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
                                        <button
                                            onClick={() => {
                                                setSelectedPeriodType('trimestre');
                                                setSelectedPeriodValue('Q3');
                                            }}
                                            className={`px-3 py-1 rounded-lg transition-all ${
                                                selectedPeriodType === 'trimestre' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'
                                            }`}
                                        >
                                            Trimestre
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedPeriodType('semestre');
                                                setSelectedPeriodValue('S1');
                                            }}
                                            className={`px-3 py-1 rounded-lg transition-all ${
                                                selectedPeriodType === 'semestre' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'
                                            }`}
                                        >
                                            Semestre
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedPeriodType('anio');
                                                setSelectedPeriodValue(String(selectedYear));
                                            }}
                                            className={`px-3 py-1 rounded-lg transition-all ${
                                                selectedPeriodType === 'anio' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'
                                            }`}
                                        >
                                            Año Completo
                                        </button>
                                    </div>

                                    {/* Sub-valores según tipo */}
                                    {selectedPeriodType === 'trimestre' && (
                                        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
                                            {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                                                <button
                                                    key={q}
                                                    onClick={() => setSelectedPeriodValue(q)}
                                                    className={`px-3 py-1 rounded-lg transition-all ${
                                                        selectedPeriodValue === q ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
                                                    }`}
                                                >
                                                    {q}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {selectedPeriodType === 'semestre' && (
                                        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
                                            {['S1', 'S2'].map(s => (
                                                <button
                                                    key={s}
                                                    onClick={() => setSelectedPeriodValue(s)}
                                                    className={`px-3 py-1 rounded-lg transition-all ${
                                                        selectedPeriodValue === s ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
                                                    }`}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Selector de Año */}
                                    <select
                                        value={selectedYear}
                                        onChange={e => setSelectedYear(Number(e.target.value))}
                                        className="text-xs font-bold bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none"
                                    >
                                        <option value={2026}>2026 (Año Actual)</option>
                                        <option value={2025}>2025</option>
                                        <option value={2024}>2024</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleCopyReport}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                                    >
                                        {copiedToast ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                        <span>{copiedToast ? '¡Copiado!' : 'Copiar Informe'}</span>
                                    </button>

                                    <button
                                        onClick={handleGenerateAiBrief}
                                        disabled={isGeneratingAi}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all disabled:opacity-50"
                                    >
                                        <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                                        <span>{isGeneratingAi ? 'Sintetizando...' : '✨ Síntesis Ejecutiva con IA'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Tarjetas KPI del Período */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase">Facturación Acumulada</span>
                                    <p className="text-2xl font-black text-slate-900 mt-1">${macroData.ventasTotalesMillones}M COP</p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className="text-[11px] font-bold text-indigo-600">Meta: ${macroData.metaTotalMillones}M</span>
                                        <span className="text-[11px] font-bold text-slate-400">({macroData.porcentajeCumplimiento}%)</span>
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase">Clientes Nuevos Captados</span>
                                    <p className="text-2xl font-black text-blue-600 mt-1">{macroData.clientesNuevosTotales}</p>
                                    <p className="text-[11px] text-slate-500 mt-1">${macroData.clientesNuevosMillones}M facturados en nuevos</p>
                                </div>

                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase">Recompra & Fidelización</span>
                                    <p className="text-2xl font-black text-emerald-600 mt-1">${macroData.recompraMillones}M</p>
                                    <p className="text-[11px] text-slate-500 mt-1">{Math.round((macroData.recompraMillones / Math.max(1, macroData.ventasTotalesMillones)) * 100)}% del volumen total</p>
                                </div>

                                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase">Ticket Promedio Ponderado</span>
                                    <p className="text-2xl font-black text-purple-600 mt-1">${Math.round(macroData.ticketPromedioPonderado / 1000)}k COP</p>
                                    <p className="text-[11px] text-slate-500 mt-1">{macroData.pedidosTotales.toLocaleString()} órdenes analizadas</p>
                                </div>
                            </div>

                            {/* Síntesis de IA si fue generada */}
                            {aiExecutiveBrief && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50 via-purple-50 to-white border border-indigo-200 shadow-sm space-y-3"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                                            <Sparkles className="w-4 h-4 text-purple-600" />
                                            Síntesis Ejecutiva Asistida por IA (Gemini Copilot)
                                        </span>
                                        <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full">
                                            Dirección General
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                        {aiExecutiveBrief.diagnostico_gerencial}
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
                                        <div className="p-3 bg-white/80 rounded-xl border border-indigo-100">
                                            <p className="font-bold text-rose-900">⚠️ Riesgo de Concentración</p>
                                            <p className="text-[11px] text-slate-600 mt-1">{aiExecutiveBrief.riesgo_estructural}</p>
                                        </div>
                                        <div className="p-3 bg-white/80 rounded-xl border border-indigo-100">
                                            <p className="font-bold text-emerald-900">🚀 Palanca de Crecimiento</p>
                                            <p className="text-[11px] text-slate-600 mt-1">{aiExecutiveBrief.palanca_crecimiento}</p>
                                        </div>
                                    </div>
                                    {aiExecutiveBrief.plan_accion_directores && (
                                        <div className="pt-2">
                                            <p className="font-bold text-xs text-slate-900 mb-1.5">Plan de Acción Inmediato para Directores:</p>
                                            <ul className="space-y-1 text-xs text-slate-600">
                                                {aiExecutiveBrief.plan_accion_directores.map((item, idx) => (
                                                    <li key={idx} className="flex items-start gap-2">
                                                        <span className="text-indigo-600 font-bold">•</span>
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* Hallazgos Macro Consolidados */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Users className="w-4 h-4 text-amber-700" />
                                        <h4 className="font-bold text-xs text-amber-900 uppercase">Concentración Macro</h4>
                                    </div>
                                    <p className="text-xs text-amber-900 font-medium">
                                        {macroData.macroHallazgos.concentracion.diagnostico}
                                    </p>
                                </div>

                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Award className="w-4 h-4 text-blue-700" />
                                        <h4 className="font-bold text-xs text-blue-900 uppercase">Cazador(a) del Período</h4>
                                    </div>
                                    <p className="text-xs text-blue-900 font-medium">
                                        {macroData.macroHallazgos.cazadorPeriodo.diagnostico}
                                    </p>
                                </div>

                                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertTriangle className="w-4 h-4 text-rose-700" />
                                        <h4 className="font-bold text-xs text-rose-900 uppercase">Atención & Nivelación</h4>
                                    </div>
                                    <p className="text-xs text-rose-900 font-medium">
                                        {macroData.macroHallazgos.asesorCriticoPeriodo.diagnostico}
                                    </p>
                                </div>
                            </div>

                            {/* Matriz de Desempeño de Asesores en el Período */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                                <h3 className="text-sm font-black text-slate-900 mb-3 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                                    <span>Desempeño Acumulado del Equipo Comercial ({macroData.periodLabel})</span>
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-200 text-slate-400 font-bold">
                                                <th className="pb-2">Asesor</th>
                                                <th className="pb-2">Perfil</th>
                                                <th className="pb-2 text-right">Facturado</th>
                                                <th className="pb-2 text-right">Cuota Período</th>
                                                <th className="pb-2 text-center">% Cumplimiento</th>
                                                <th className="pb-2 text-right">Share</th>
                                                <th className="pb-2 text-right">Nuevos Clientes</th>
                                                <th className="pb-2 text-right">Ticket Medio</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {macroData.asesoresRendimientoPeriodo.map((adv, idx) => (
                                                <tr key={adv.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="py-2.5 font-bold text-slate-900 flex items-center gap-2">
                                                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-black">
                                                            {idx + 1}
                                                        </span>
                                                        {adv.nombre}
                                                    </td>
                                                    <td className="py-2.5 text-slate-500 text-[11px]">{adv.perfil}</td>
                                                    <td className="py-2.5 text-right font-bold text-slate-900">${adv.ventasPeriodoMillones}M</td>
                                                    <td className="py-2.5 text-right text-slate-500">${adv.metaPeriodoMillones}M</td>
                                                    <td className="py-2.5 text-center">
                                                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                                            adv.porcentajeCumplimiento >= 100
                                                                ? 'bg-emerald-100 text-emerald-800'
                                                                : adv.porcentajeCumplimiento >= 70
                                                                ? 'bg-blue-100 text-blue-800'
                                                                : 'bg-rose-100 text-rose-800'
                                                        }`}>
                                                            {adv.porcentajeCumplimiento}%
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 text-right font-semibold text-indigo-600">{adv.shareVentas}%</td>
                                                    <td className="py-2.5 text-right text-blue-600 font-bold">{adv.clientesNuevosTotal}</td>
                                                    <td className="py-2.5 text-right text-slate-600">${adv.ticketPromedioPonderado}k</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Directrices Estratégicas para el Período */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                                <h3 className="text-sm font-black text-slate-900 mb-3 flex items-center gap-2">
                                    <Target className="w-4 h-4 text-emerald-600" />
                                    <span>Directrices Estratégicas para la Dirección Comercial</span>
                                </h3>
                                <div className="space-y-2 text-xs text-slate-700">
                                    {macroData.directricesEstrategicas.map((dir, idx) => (
                                        <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5">
                                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                                                {idx + 1}
                                            </span>
                                            <p className="leading-relaxed font-medium">{dir}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─────────────────────────────────────────────────────────────
                        PESTAÑA 2: HISTORIAL MENSUAL
                    ───────────────────────────────────────────────────────────── */}
                    {activeTab === 'historial' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Lista de Meses (Timeline) */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2 max-h-[600px] overflow-y-auto">
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">
                                    Bitácora de Cierres Mensuales ({historyRecords.length})
                                </h3>
                                {historyRecords.map(rec => {
                                    const isSelected = selectedHistoryMonth?.id === rec.id;
                                    return (
                                        <button
                                            key={rec.id}
                                            onClick={() => setSelectedHistoryMonth(rec)}
                                            className={`w-full text-left p-3 rounded-xl border transition-all ${
                                                isSelected
                                                    ? 'bg-indigo-50 border-indigo-300 shadow-xs'
                                                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-xs text-slate-900">
                                                    {rec.mes} {rec.anio}
                                                </span>
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                                    rec.porcentajeCumplimiento >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                                                }`}>
                                                    ${rec.ventasMillones}M ({rec.porcentajeCumplimiento}%)
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                                                {rec.findings?.concentracion?.asesores?.join(' & ')} • Top Hunter: {rec.findings?.hunter?.asesor}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Detalle del Mes Seleccionado */}
                            {selectedHistoryMonth && (
                                <div className="md:col-span-2 space-y-4">
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                                            <div>
                                                <span className="text-[11px] font-bold text-indigo-600 uppercase">Cierre Oficial</span>
                                                <h3 className="text-lg font-black text-slate-900">
                                                    {selectedHistoryMonth.mes} {selectedHistoryMonth.anio}
                                                </h3>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-2xl font-black text-slate-900">${selectedHistoryMonth.ventasMillones}M</span>
                                                <p className="text-[11px] text-slate-400">Meta $220M • {selectedHistoryMonth.pedidosTotales} pedidos</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3 text-xs">
                                            <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl">
                                                <p className="font-bold text-amber-900">Concentración de Ventas</p>
                                                <p className="text-amber-800 mt-1 text-[11px]">
                                                    {selectedHistoryMonth.findings.concentracion.descripcion}
                                                </p>
                                            </div>

                                            <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl">
                                                <p className="font-bold text-blue-900">{selectedHistoryMonth.findings.hunter.titulo}</p>
                                                <p className="text-blue-800 mt-1 text-[11px]">
                                                    {selectedHistoryMonth.findings.hunter.descripcion}
                                                </p>
                                            </div>

                                            <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl">
                                                <p className="font-bold text-rose-900">{selectedHistoryMonth.findings.alerta.titulo}</p>
                                                <p className="text-rose-800 mt-1 text-[11px]">
                                                    {selectedHistoryMonth.findings.alerta.descripcion}
                                                </p>
                                                <p className="text-rose-900 font-bold mt-1 text-[10px]">
                                                    Acción recomendada: {selectedHistoryMonth.findings.alerta.accionRecomendada}
                                                </p>
                                            </div>

                                            <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                                                <p className="font-bold text-emerald-900">Oportunidad & Recomendación Estratégica</p>
                                                <p className="text-emerald-800 mt-1 text-[11px]">
                                                    {selectedHistoryMonth.findings.recomendacionEstrategica}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                        Histórico Biocambio360 • Conciliación con Power BI Desktop y Auditoría SGC
                    </span>
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
