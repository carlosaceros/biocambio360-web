'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Layers,
    FlaskConical,
    Shield,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ArrowLeft,
    Plus,
    Search,
    Calendar,
    Clock,
    Factory,
    Scale,
    FileText,
    ChevronRight,
    ChevronLeft,
    X,
    Filter,
    Sparkles,
    ExternalLink,
    RefreshCw,
    Droplets,
    Check,
    Printer,
    Copy,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/checkout-utils';
import {
    PLANT_FORMULAS,
    DEFAULT_FORMULAS,
    MASTER_BATCHES,
    createProductionBatch,
    getProductionBatches,
    updateBatchQualityControl,
    searchBatches,
    getBatchByLot,
    getProductionStatistics
} from '@/lib/production-service';
import { ProductionBatch, ProductFormula } from '@/types/production';
import { useAuth } from '@/lib/auth-context';
import ManufacturingBOMCostingPanel from '@/components/admin/ManufacturingBOMCostingPanel';

export default function ProduccionPlantaPage() {
    const router = useRouter();
    const { user } = useAuth();

    // Iniciar con el catálogo maestro de 2,563 lotes de fábrica para cero latencia
    const [batches, setBatches] = useState<ProductionBatch[]>(MASTER_BATCHES);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'batches' | 'formulas' | 'traceability' | 'industrial_bi'>('batches');

    // Filtros de Lotes
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedYear, setSelectedYear] = useState<'all' | '2026' | '2025'>('all');
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'aprobado' | 'planeado' | 'rechazado'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 24;

    // Filtros de Fórmulas BOM
    const [selectedFormulaCategory, setSelectedFormulaCategory] = useState<string>('all');
    const [formulaSearchQuery, setFormulaSearchQuery] = useState('');
    const [expandedFormulaId, setExpandedFormulaId] = useState<string | null>(null);

    // Modal Crear Batch
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedFormulaId, setSelectedFormulaId] = useState<string>(PLANT_FORMULAS[0]?.id || '');
    const [batchVolumeLitros, setBatchVolumeLitros] = useState<number>(2000);
    const [selectedTank, setSelectedTank] = useState<string>('Tanque Mezclador #1 (2,500 L)');
    const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

    // Modal Control de Calidad
    const [selectedBatchForQC, setSelectedBatchForQC] = useState<ProductionBatch | null>(null);
    const [qcPh, setQcPh] = useState<number>(7.4);
    const [qcDensity, setQcDensity] = useState<number>(1.03);
    const [qcViscosity, setQcViscosity] = useState<string>('Conforme');
    const [qcObservations, setQcObservations] = useState<string>('');
    const [isSubmittingQC, setIsSubmittingQC] = useState(false);

    // Trazabilidad INVIMA
    const [lotSearchQuery, setLotSearchQuery] = useState<string>('300926122');
    const [copiedToast, setCopiedToast] = useState<string | null>(null);

    useEffect(() => {
        loadBatches();
    }, []);

    const loadBatches = async () => {
        try {
            const data = await getProductionBatches(100);
            if (data && data.length > 0) {
                setBatches(data);
            }
        } catch (e) {
            console.warn('[Producción] Error refrescando lotes:', e);
        }
    };

    // Estadísticas Globales de Planta
    const stats = useMemo(() => getProductionStatistics(batches), [batches]);

    // Categorías de Fórmulas
    const formulaCategories = useMemo(() => {
        const cats = new Set<string>();
        PLANT_FORMULAS.forEach(f => {
            if (f.categoria) cats.add(f.categoria);
        });
        return ['all', ...Array.from(cats)];
    }, []);

    // Fórmulas Filtradas
    const filteredFormulas = useMemo(() => {
        let list = PLANT_FORMULAS;
        if (selectedFormulaCategory !== 'all') {
            list = list.filter(f => f.categoria === selectedFormulaCategory);
        }
        if (formulaSearchQuery.trim()) {
            const q = formulaSearchQuery.toLowerCase();
            list = list.filter(f =>
                f.nombreProducto.toLowerCase().includes(q) ||
                f.ingredientes.some(ing => ing.nombre.toLowerCase().includes(q)) ||
                (f.aromaTeorico || '').toLowerCase().includes(q) ||
                (f.categoria || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [selectedFormulaCategory, formulaSearchQuery]);

    // Lotes Filtrados
    const filteredBatches = useMemo(() => {
        let list = batches;
        if (selectedYear !== 'all') {
            list = list.filter(b => String(b.fechaInicio || '').startsWith(selectedYear));
        }
        if (selectedStatus !== 'all') {
            list = list.filter(b => b.estado === selectedStatus);
        }
        if (searchQuery.trim()) {
            list = searchBatches(searchQuery, list);
        }
        return list;
    }, [batches, selectedYear, selectedStatus, searchQuery]);

    // Paginación
    const totalPages = Math.ceil(filteredBatches.length / pageSize) || 1;
    const paginatedBatches = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredBatches.slice(start, start + pageSize);
    }, [filteredBatches, currentPage, pageSize]);

    // Trazabilidad de Lote Seleccionado
    const searchedBatch = useMemo(() => {
        if (!lotSearchQuery.trim()) return null;
        return getBatchByLot(lotSearchQuery, batches);
    }, [lotSearchQuery, batches]);

    const handleCreateBatch = async () => {
        const formula = PLANT_FORMULAS.find(f => f.id === selectedFormulaId) || PLANT_FORMULAS[0];
        setIsSubmittingBatch(true);
        try {
            const created = await createProductionBatch({
                formulaId: formula.id,
                productId: formula.productId,
                nombreProducto: formula.nombreProducto,
                volumenPlaneadoLitros: batchVolumeLitros,
                tanqueOMezclador: selectedTank,
                responsablePlanta: user?.displayName || 'Jefe de Planta Soacha',
            });
            setBatches(prev => [created, ...prev]);
            setIsCreateModalOpen(false);
            setLotSearchQuery(created.numeroLote);
            alert(`✅ ¡Lote #${created.numeroLote} (${created.nombreProducto}) generado con éxito para producción!`);
        } catch (e) {
            console.error('Error creando lote:', e);
            alert('Error al generar la orden de producción.');
        } finally {
            setIsSubmittingBatch(false);
        }
    };

    const handleApproveQC = async (approved: boolean) => {
        if (!selectedBatchForQC) return;
        setIsSubmittingQC(true);
        try {
            await updateBatchQualityControl(
                selectedBatchForQC.id,
                {
                    phMedido: qcPh,
                    densidadMedida: qcDensity,
                    viscosidadMedida: qcViscosity,
                    colorConforme: true,
                    aromaConforme: true,
                    aparienciaVisual: 'Líquido homogéneo sin sedimentos',
                    aprobado: approved,
                    verificadoPor: user?.displayName || 'Control Calidad Biocambio360',
                    observaciones: qcObservations,
                    fechaControl: new Date().toISOString(),
                },
                approved
            );
            setBatches(prev => prev.map(b => b.id === selectedBatchForQC.id ? {
                ...b,
                estado: approved ? 'aprobado' : 'rechazado',
                controlCalidad: {
                    phMedido: qcPh,
                    densidadMedida: qcDensity,
                    viscosidadMedida: qcViscosity,
                    colorConforme: true,
                    aromaConforme: true,
                    aparienciaVisual: 'Líquido homogéneo',
                    aprobado: approved,
                    verificadoPor: user?.displayName || 'Control Calidad',
                    fechaControl: new Date().toISOString()
                }
            } : b));
            setSelectedBatchForQC(null);
            alert(approved ? '✅ Lote aprobado y liberado para despacho en bodegas y mostrador.' : '❌ Lote marcado en no conformidad.');
        } catch (e) {
            console.error('Error en control de calidad:', e);
        } finally {
            setIsSubmittingQC(false);
        }
    };

    const copyToClipboard = (text: string, msg: string) => {
        navigator.clipboard.writeText(text);
        setCopiedToast(msg);
        setTimeout(() => setCopiedToast(null), 3000);
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
            {/* Top Bar Header */}
            <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/admin')}
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                                <span>Planta Química Soacha · Cra 7C #44-17 Sur</span>
                                <span>•</span>
                                <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-extrabold text-[10px]">
                                    SGC FR-001-POE-007
                                </span>
                            </div>
                            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2 mt-0.5">
                                <Factory size={20} className="text-indigo-400" />
                                Producción, Lotes & Fórmulas Maestras
                            </h1>
                        </div>
                    </div>

                    {/* Botones de Acción & Pestañas */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
                        >
                            <Plus size={15} />
                            <span>Crear Nuevo Lote</span>
                        </button>

                        <div className="inline-flex bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-bold">
                            <button
                                onClick={() => setActiveTab('batches')}
                                className={`px-3 py-1.5 rounded-lg transition-all ${
                                    activeTab === 'batches' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Lotes ({filteredBatches.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('formulas')}
                                className={`px-3 py-1.5 rounded-lg transition-all ${
                                    activeTab === 'formulas' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Recetas BOM (83)
                            </button>
                            <button
                                onClick={() => setActiveTab('traceability')}
                                className={`px-3 py-1.5 rounded-lg transition-all ${
                                    activeTab === 'traceability' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Trazabilidad INVIMA
                            </button>
                            <button
                                onClick={() => setActiveTab('industrial_bi')}
                                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                    activeTab === 'industrial_bi' ? 'bg-amber-400 text-slate-950 font-black shadow-xs' : 'text-amber-300 hover:text-white'
                                }`}
                            >
                                <Sparkles size={13} />
                                <span>Inteligencia Industrial Big Data (2025-2026)</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Contenido Principal */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 space-y-6">

                {/* TARJETAS KPI DE PLANTA */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                            <Layers size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-500 uppercase block truncate">Lotes Históricos</span>
                            <p className="text-xl font-black text-slate-900 mt-0.5">{stats.totalBatches.toLocaleString()}</p>
                            <span className="text-[10px] text-emerald-600 font-bold">100% SGC Registrados</span>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                            <Droplets size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-500 uppercase block truncate">Volumen Formulado</span>
                            <p className="text-xl font-black text-emerald-700 mt-0.5">{(stats.totalLiters / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k Litros</p>
                            <span className="text-[10px] text-slate-400 font-medium">Capacidad instalada Soacha</span>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                            <Calendar size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-500 uppercase block truncate">Lotes Año 2026</span>
                            <p className="text-xl font-black text-slate-900 mt-0.5">{stats.batches2026.toLocaleString()}</p>
                            <span className="text-[10px] text-amber-700 font-bold">{stats.batches2025.toLocaleString()} en 2025</span>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                            <Shield size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-500 uppercase block truncate">Conformidad Calidad</span>
                            <p className="text-xl font-black text-purple-700 mt-0.5">{stats.complianceRate}%</p>
                            <span className="text-[10px] text-purple-600 font-bold">83 Fórmulas BOM Activas</span>
                        </div>
                    </div>
                </div>

                {/* TAB 1: LOTES DE PRODUCCIÓN & HISTORIAL */}
                {activeTab === 'batches' && (
                    <div className="space-y-4">
                        {/* Barra de Filtros */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar lote (ej. 300926122), producto, tanque, pesador u operario..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                                />
                            </div>

                            <div className="flex items-center gap-2 w-full md:w-auto">
                                {/* Filtro Año */}
                                <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                                    {(['all', '2026', '2025'] as const).map(yr => (
                                        <button
                                            key={yr}
                                            onClick={() => {
                                                setSelectedYear(yr);
                                                setCurrentPage(1);
                                            }}
                                            className={`px-3 py-1 rounded-lg transition-all ${
                                                selectedYear === yr ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                                            }`}
                                        >
                                            {yr === 'all' ? 'Todos Años' : yr}
                                        </button>
                                    ))}
                                </div>

                                {/* Filtro Estado */}
                                <select
                                    value={selectedStatus}
                                    onChange={(e) => {
                                        setSelectedStatus(e.target.value as any);
                                        setCurrentPage(1);
                                    }}
                                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-hidden"
                                >
                                    <option value="all">Todos los Estados</option>
                                    <option value="aprobado">Aprobado INVIMA</option>
                                    <option value="planeado">Planeado</option>
                                    <option value="rechazado">Rechazado</option>
                                </select>
                            </div>
                        </div>

                        {/* Grid de Lotes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {paginatedBatches.map(batch => {
                                const isApproved = batch.estado === 'aprobado';
                                const isRejected = batch.estado === 'rechazado';
                                const dateFormatted = batch.fechaInicio ? new Date(batch.fechaInicio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : 'S/F';

                                return (
                                    <div
                                        key={batch.id}
                                        className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col justify-between hover:border-indigo-300 hover:shadow-md transition-all"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2.5 py-0.5 rounded-lg">
                                                        #{batch.numeroLote}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-medium">{dateFormatted}</span>
                                                </div>
                                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                    isApproved
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : isRejected
                                                        ? 'bg-rose-100 text-rose-800'
                                                        : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                    {isApproved ? 'Aprobado INVIMA' : batch.estado}
                                                </span>
                                            </div>

                                            <h3 className="font-black text-slate-900 text-sm line-clamp-1">{batch.nombreProducto}</h3>
                                            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                                                <span>{batch.tanqueOMezclador || 'Tanque Planta'}</span>
                                                {(batch as any).pesadoPor && (
                                                    <>
                                                        <span>·</span>
                                                        <span className="text-slate-700 font-medium">Pesó: {(batch as any).pesadoPor}</span>
                                                    </>
                                                )}
                                            </p>

                                            {/* Métricas Volumen y Envasado */}
                                            <div className="mt-3 grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl text-xs border border-slate-100">
                                                <div>
                                                    <span className="text-[10px] text-slate-400 block font-bold">Volumen Formulado</span>
                                                    <span className="font-black text-slate-800">{batch.volumenPlaneadoLitros.toLocaleString()} L</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-400 block font-bold">Costo Base Lote</span>
                                                    <span className="font-black text-indigo-700">{formatCurrency(batch.costoTotalLote || batch.volumenPlaneadoLitros * 2850)}</span>
                                                </div>
                                            </div>

                                            {/* Presentaciones Empacadas */}
                                            {batch.presentacionesEmpacadas && batch.presentacionesEmpacadas.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {batch.presentacionesEmpacadas.map((pres, i) => (
                                                        <span key={i} className="bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                                                            {pres.cantidadUnidades} x {pres.size}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Control de Calidad */}
                                            {batch.controlCalidad && (
                                                <div className="mt-2.5 text-[11px] text-slate-600 bg-emerald-50/60 border border-emerald-100 p-2 rounded-xl flex items-center justify-between">
                                                    <div>
                                                        <span className="font-bold text-emerald-950">pH: {batch.controlCalidad.phMedido}</span>
                                                        {batch.controlCalidad.densidadMedida && (
                                                            <span className="text-emerald-800 ml-2">Dens: {batch.controlCalidad.densidadMedida}</span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] font-semibold text-emerald-700 truncate max-w-[120px]">
                                                        {batch.controlCalidad.verificadoPor || 'Conforme'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Pie con Acciones */}
                                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                                            <button
                                                onClick={() => {
                                                    setLotSearchQuery(batch.numeroLote);
                                                    setActiveTab('traceability');
                                                }}
                                                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                                            >
                                                <span>Ficha Trazabilidad</span>
                                                <ChevronRight size={13} />
                                            </button>

                                            <div className="flex items-center gap-1">
                                                {(batch as any).imagenLote && (
                                                    <a
                                                        href={(batch as any).imagenLote}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1 text-slate-400 hover:text-indigo-600"
                                                        title="Ver foto del lote físico en Google Drive"
                                                    >
                                                        <ExternalLink size={13} />
                                                    </a>
                                                )}
                                                {!batch.controlCalidad && (
                                                    <button
                                                        onClick={() => setSelectedBatchForQC(batch)}
                                                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                                                    >
                                                        Validar QC
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Paginación */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 text-xs font-bold">
                                <span className="text-slate-500">
                                    Mostrando {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredBatches.length)} de {filteredBatches.length} lotes
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg">
                                        Página {currentPage} de {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: RECETAS / FÓRMULAS BOM (83 FÓRMULAS MAESTRAS) */}
                {activeTab === 'formulas' && (
                    <div className="space-y-4">
                        {/* Barra de Búsqueda y Categorías */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                                        <FlaskConical size={18} className="text-indigo-600" />
                                        Fórmulas Químicas Maestras de Planta ({filteredFormulas.length} recetas)
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        Bill of Materials (BOM), concentraciones de insumos, especificaciones físico-químicas e INVIMA
                                    </p>
                                </div>

                                <div className="relative w-full md:w-80">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por producto o insumo químico..."
                                        value={formulaSearchQuery}
                                        onChange={(e) => setFormulaSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                                    />
                                </div>
                            </div>

                            {/* Categorías de Fórmulas */}
                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs pt-1">
                                {formulaCategories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedFormulaCategory(cat)}
                                        className={`px-3 py-1 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer ${
                                            selectedFormulaCategory === cat
                                                ? 'bg-indigo-600 text-white shadow-xs'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        {cat === 'all' ? `Todas (${PLANT_FORMULAS.length})` : cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Grid de 83 Fórmulas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredFormulas.map(formula => {
                                const isExpanded = expandedFormulaId === formula.id;

                                return (
                                    <div
                                        key={formula.id}
                                        className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col justify-between hover:border-indigo-300 transition-all"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                                                    {formula.categoria || 'Química'}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400">
                                                    Base: 1 {formula.unidadBase} · v{formula.version}
                                                </span>
                                            </div>

                                            <h3 className="font-black text-slate-900 text-sm mt-1">{formula.nombreProducto}</h3>
                                            <p className="text-[11px] text-slate-500 mt-0.5">
                                                Aroma: <strong>{formula.aromaTeorico || 'Característico'}</strong> · Color: <strong>{formula.colorTeorico || 'Estándar'}</strong>
                                            </p>

                                            {/* Parámetros Fisicoquímicos */}
                                            <div className="mt-3 p-2.5 bg-slate-50 rounded-xl text-[11px] space-y-1 border border-slate-100">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500 font-medium">Rango de pH:</span>
                                                    <span className="font-bold text-slate-800">{formula.phTeoricoMin} - {formula.phTeoricoMax}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500 font-medium">Densidad Teórica:</span>
                                                    <span className="font-bold text-slate-800">{formula.densidadTeorica} g/ml</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500 font-medium">Viscosidad:</span>
                                                    <span className="font-bold text-slate-800">{formula.viscosidadTeorica || 'Estándar'}</span>
                                                </div>
                                                {formula.gramera && (
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500 font-medium">Balanza de Pesaje:</span>
                                                        <span className="font-bold text-indigo-600">{formula.gramera}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Lista de Ingredientes BOM */}
                                            <div className="mt-3">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-[10px] font-black uppercase text-slate-400">
                                                        Composición ({formula.ingredientes.length} materias primas):
                                                    </span>
                                                    <button
                                                        onClick={() => setExpandedFormulaId(isExpanded ? null : formula.id)}
                                                        className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                                                    >
                                                        {isExpanded ? 'Ver menos' : 'Ver todo'}
                                                    </button>
                                                </div>

                                                <div className="space-y-1">
                                                    {(isExpanded ? formula.ingredientes : formula.ingredientes.slice(0, 4)).map((ing, idx) => (
                                                        <div key={idx} className="flex justify-between border-b border-slate-100 pb-0.5 text-[11px]">
                                                            <span className="text-slate-700 truncate max-w-[180px]">{ing.nombre}</span>
                                                            <span className="font-bold font-mono text-slate-900">
                                                                {ing.cantidadPorUnidadBase} {ing.unidad} {ing.porcentajeEnFormula ? `(${ing.porcentajeEnFormula}%)` : ''}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {!isExpanded && formula.ingredientes.length > 4 && (
                                                        <p className="text-[10px] text-slate-400 italic pt-0.5 text-center">
                                                            +{formula.ingredientes.length - 4} ingredientes más
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Botón Acción Crear Lote con esta Fórmula */}
                                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                            <button
                                                onClick={() => {
                                                    setSelectedFormulaId(formula.id);
                                                    setIsCreateModalOpen(true);
                                                }}
                                                className="w-full py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                            >
                                                <Plus size={14} />
                                                <span>Crear Lote con esta Receta</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* TAB 3: TRAZABILIDAD INVERSA INVIMA & AUDITORÍA POE-007 */}
                {activeTab === 'traceability' && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5 max-w-3xl mx-auto">
                        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                <Shield size={22} />
                            </div>
                            <div>
                                <h2 className="text-base font-black text-slate-900">
                                    Auditoría de Trazabilidad Inversa INVIMA (SGC FR-001-POE-007)
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Consulta instantánea de batch records, despejes de línea, parámetros de liberación y materias primas
                                </p>
                            </div>
                        </div>

                        {/* Buscador de Lote */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-700">Número de Lote a Auditar</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Digita código de lote (ej: 300926122, 410926125, 300415467)..."
                                    value={lotSearchQuery}
                                    onChange={(e) => setLotSearchQuery(e.target.value)}
                                    className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-hidden focus:border-indigo-500 focus:bg-white"
                                />
                                <button
                                    onClick={() => setLotSearchQuery('300926122')}
                                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                >
                                    Lote Reciente
                                </button>
                            </div>

                            {/* Accesos rápidos a lotes emblemáticos */}
                            <div className="flex items-center gap-1.5 flex-wrap text-[11px] pt-1">
                                <span className="text-slate-400 font-medium">Lotes de muestra:</span>
                                {['300926122', '410926125', '300926115', '700925390', '300415467'].map(l => (
                                    <button
                                        key={l}
                                        onClick={() => setLotSearchQuery(l)}
                                        className="font-mono text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                                    >
                                        #{l}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Ficha de Trazabilidad */}
                        {searchedBatch ? (
                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 text-xs">
                                <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                                    <div>
                                        <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                            Certificado SGC FR-001-POE-007
                                        </span>
                                        <h3 className="font-black text-base text-slate-900 mt-1">{searchedBatch.nombreProducto}</h3>
                                        <p className="text-xs text-slate-500 font-mono font-bold mt-0.5">
                                            Código Único de Lote: #{searchedBatch.numeroLote}
                                        </p>
                                    </div>
                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-black text-xs">
                                        LIBERADO / CONFORME
                                    </span>
                                </div>

                                {/* Matriz Operativa de Planta */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-white p-3 rounded-xl border border-slate-200/80 text-[11px]">
                                    <div>
                                        <span className="text-slate-400 block font-medium">Fecha Elaboración</span>
                                        <strong className="text-slate-800">{new Date(searchedBatch.fechaInicio).toLocaleDateString('es-CO')}</strong>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-medium">Tanque Mezcla</span>
                                        <strong className="text-slate-800">{searchedBatch.tanqueOMezclador || 'Tanque 01'}</strong>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-medium">Pesado / Dispensado</span>
                                        <strong className="text-slate-800">{(searchedBatch as any).pesadoPor || searchedBatch.responsablePlanta}</strong>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-medium">Empacado Por</span>
                                        <strong className="text-slate-800">{(searchedBatch as any).empacadoPor || 'Equipo Planta'}</strong>
                                    </div>
                                </div>

                                {/* Control Físico-Químico */}
                                {searchedBatch.controlCalidad && (
                                    <div className="bg-emerald-50/80 border border-emerald-200/80 p-3.5 rounded-xl space-y-2">
                                        <span className="font-black text-emerald-950 text-xs flex items-center gap-1.5">
                                            <CheckCircle2 size={14} className="text-emerald-600" />
                                            Parámetros Físico-Químicos de Liberación INVIMA:
                                        </span>
                                        <div className="grid grid-cols-3 gap-2 text-[11px]">
                                            <div className="bg-white p-2 rounded-lg border border-emerald-100">
                                                <span className="text-emerald-700 block text-[10px]">pH Medido</span>
                                                <strong className="text-sm font-black text-emerald-950">{searchedBatch.controlCalidad.phMedido}</strong>
                                            </div>
                                            <div className="bg-white p-2 rounded-lg border border-emerald-100">
                                                <span className="text-emerald-700 block text-[10px]">Densidad</span>
                                                <strong className="text-sm font-black text-emerald-950">{searchedBatch.controlCalidad.densidadMedida || 1.0} g/ml</strong>
                                            </div>
                                            <div className="bg-white p-2 rounded-lg border border-emerald-100">
                                                <span className="text-emerald-700 block text-[10px]">Viscosidad / Apariencia</span>
                                                <strong className="text-[11px] font-bold text-emerald-950">{searchedBatch.controlCalidad.viscosidadMedida || 'Conforme'}</strong>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Presentaciones Envasadas */}
                                {searchedBatch.presentacionesEmpacadas && searchedBatch.presentacionesEmpacadas.length > 0 && (
                                    <div>
                                        <span className="font-bold text-[11px] text-slate-700 block mb-1">
                                            Unidades Empacadas por Presentación:
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {searchedBatch.presentacionesEmpacadas.map((pres, idx) => (
                                                <span key={idx} className="bg-white border border-slate-200 text-slate-800 text-xs font-bold px-2.5 py-1 rounded-lg">
                                                    {pres.size}: <span className="text-indigo-700 font-black">{pres.cantidadUnidades} unidades</span>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Explosión de Materias Primas Consumidas */}
                                {searchedBatch.materiasPrimasConsumidas && searchedBatch.materiasPrimasConsumidas.length > 0 && (
                                    <div>
                                        <span className="font-bold text-[11px] text-slate-700 block mb-1.5">
                                            Explosión de Materias Primas Consumidas (BOM Batch):
                                        </span>
                                        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                                            {searchedBatch.materiasPrimasConsumidas.map((m, idx) => (
                                                <div key={idx} className="p-2 flex items-center justify-between text-[11px]">
                                                    <span className="text-slate-800 font-medium">{m.nombre}</span>
                                                    <span className="font-bold font-mono text-slate-900">
                                                        {m.cantidadRealConsumida} {m.unidad}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Fotos de Auditoría en Google Drive */}
                                {((searchedBatch as any).imagenLote || (searchedBatch as any).imagenEtiqueta) && (
                                    <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
                                        {(searchedBatch as any).imagenLote && (
                                            <a
                                                href={(searchedBatch as any).imagenLote}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                                            >
                                                <ExternalLink size={13} />
                                                <span>Ver Foto Rótulo Físico</span>
                                            </a>
                                        )}
                                        {(searchedBatch as any).imagenEtiqueta && (
                                            <a
                                                href={(searchedBatch as any).imagenEtiqueta}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                                            >
                                                <ExternalLink size={13} />
                                                <span>Ver Foto Etiqueta Envase</span>
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : lotSearchQuery.trim() ? (
                            <div className="text-center py-8 text-slate-400 text-xs italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                No se encontró ningún lote con el código &ldquo;{lotSearchQuery}&rdquo;. Verifica los números sugeridos arriba.
                            </div>
                        ) : null}
                    </div>
                )}

                {/* TAB 4: INTELIGENCIA INDUSTRIAL BIG DATA & BOM */}
                {activeTab === 'industrial_bi' && (
                    <div className="space-y-4 pt-2">
                        <ManufacturingBOMCostingPanel />
                    </div>
                )}
            </main>

            {/* MODAL CREAR BATCH */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <h3 className="font-black text-base text-slate-900">Crear Nueva Orden de Producción</h3>
                                <button onClick={() => setIsCreateModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-3 text-xs">
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Fórmula Maestra a Producir (83 Recetas)</label>
                                    <select
                                        value={selectedFormulaId}
                                        onChange={(e) => setSelectedFormulaId(e.target.value)}
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                                    >
                                        {PLANT_FORMULAS.map(f => (
                                            <option key={f.id} value={f.id}>{f.nombreProducto} ({f.categoria || 'Química'})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-bold text-slate-700 block mb-1">Volumen a Fabricar (Litros)</label>
                                        <input
                                            type="number"
                                            step="100"
                                            value={batchVolumeLitros}
                                            onChange={(e) => setBatchVolumeLitros(Number(e.target.value))}
                                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 block mb-1">Tanque Mezclador</label>
                                        <select
                                            value={selectedTank}
                                            onChange={(e) => setSelectedTank(e.target.value)}
                                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                                        >
                                            <option value="Tanque Mezclador #1 (2,500 L)">Tanque #1 (2,500 L)</option>
                                            <option value="Tanque Mezclador #2 (1,000 L)">Tanque #2 (1,000 L)</option>
                                            <option value="Tanque Mezclador #3 (5,000 L)">Tanque #3 (5,000 L)</option>
                                            <option value="Tanque Mezclador SGC #4 (160 L)">Tanque Piloto #4 (160 L)</option>
                                        </select>
                                    </div>
                                </div>

                                <button
                                    onClick={handleCreateBatch}
                                    disabled={isSubmittingBatch}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                    {isSubmittingBatch ? (
                                        <>
                                            <RefreshCw size={14} className="animate-spin" />
                                            <span>Generando Orden y Lote...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={15} />
                                            <span>Confirmar Orden y Generar Lote INVIMA</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL CONTROL DE CALIDAD */}
            <AnimatePresence>
                {selectedBatchForQC && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
                        >
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <h3 className="font-black text-base text-slate-900">
                                    Control de Calidad: Lote #{selectedBatchForQC.numeroLote}
                                </h3>
                                <button onClick={() => setSelectedBatchForQC(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-3 text-xs">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-bold text-slate-700 block mb-1">pH Medido</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={qcPh}
                                            onChange={(e) => setQcPh(Number(e.target.value))}
                                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 block mb-1">Densidad (g/ml)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={qcDensity}
                                            onChange={(e) => setQcDensity(Number(e.target.value))}
                                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Viscosidad Medida</label>
                                    <input
                                        type="text"
                                        value={qcViscosity}
                                        onChange={(e) => setQcViscosity(e.target.value)}
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                                    />
                                </div>

                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Observaciones / Inspector</label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Lote conforme, aroma intenso..."
                                        value={qcObservations}
                                        onChange={(e) => setQcObservations(e.target.value)}
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <button
                                        onClick={() => handleApproveQC(false)}
                                        disabled={isSubmittingQC}
                                        className="py-2.5 bg-rose-50 text-rose-700 font-bold rounded-xl hover:bg-rose-100 cursor-pointer"
                                    >
                                        Rechazar Lote
                                    </button>
                                    <button
                                        onClick={() => handleApproveQC(true)}
                                        disabled={isSubmittingQC}
                                        className="py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 cursor-pointer"
                                    >
                                        Aprobar y Liberar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Toast Copiado */}
            {copiedToast && (
                <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 text-xs font-bold">
                    <Check size={14} className="text-emerald-400" />
                    <span>{copiedToast}</span>
                </div>
            )}
        </div>
    );
}
