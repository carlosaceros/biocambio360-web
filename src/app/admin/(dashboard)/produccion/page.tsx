'use client';

import { useState, useEffect } from 'react';
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
    X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/checkout-utils';
import {
    DEFAULT_FORMULAS,
    createProductionBatch,
    getProductionBatches,
    updateBatchQualityControl
} from '@/lib/production-service';
import { ProductionBatch, ProductFormula } from '@/types/production';
import { useAuth } from '@/lib/auth-context';

export default function ProduccionPlantaPage() {
    const router = useRouter();
    const { user } = useAuth();

    const [batches, setBatches] = useState<ProductionBatch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'batches' | 'formulas' | 'traceability'>('batches');

    // Create Batch Modal
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedFormulaId, setSelectedFormulaId] = useState<string>(DEFAULT_FORMULAS[0].id);
    const [batchVolumeLitros, setBatchVolumeLitros] = useState<number>(2000);
    const [selectedTank, setSelectedTank] = useState<string>('Tanque Mezclador #1 (2,500 L)');
    const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

    // Quality Control Modal
    const [selectedBatchForQC, setSelectedBatchForQC] = useState<ProductionBatch | null>(null);
    const [qcPh, setQcPh] = useState<number>(7.4);
    const [qcDensity, setQcDensity] = useState<number>(1.03);
    const [qcViscosity, setQcViscosity] = useState<string>('Conforme (1050 cP)');
    const [qcObservations, setQcObservations] = useState<string>('');
    const [isSubmittingQC, setIsSubmittingQC] = useState(false);

    // Traceability Search
    const [lotSearchQuery, setLotSearchQuery] = useState<string>('');

    useEffect(() => {
        loadBatches();
    }, []);

    const loadBatches = async () => {
        setIsLoading(true);
        try {
            const data = await getProductionBatches(50);
            setBatches(data);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateBatch = async () => {
        const formula = DEFAULT_FORMULAS.find(f => f.id === selectedFormulaId) || DEFAULT_FORMULAS[0];
        setIsSubmittingBatch(true);
        try {
            await createProductionBatch({
                formulaId: formula.id,
                productId: formula.productId,
                nombreProducto: formula.nombreProducto,
                volumenPlaneadoLitros: batchVolumeLitros,
                tanqueOMezclador: selectedTank,
                responsablePlanta: user?.displayName || 'Jefe de Planta',
            });
            await loadBatches();
            setIsCreateModalOpen(false);
            alert('¡Orden de producción y código de lote INVIMA generados con éxito!');
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
            await loadBatches();
            setSelectedBatchForQC(null);
            alert(approved ? '✅ Lote aprobado y liberado para despacho.' : '❌ Lote rechazado por no conformidad.');
        } catch (e) {
            console.error('Error en control de calidad:', e);
        } finally {
            setIsSubmittingQC(false);
        }
    };

    // Traceability search result
    const searchedBatch = batches.find(b =>
        b.numeroLote.toLowerCase().includes(lotSearchQuery.toLowerCase().trim())
    );

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
            {/* Top Bar */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/admin')}
                            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-600"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider">
                                <span>Biocambio360 Planta Soacha</span>
                                <span>•</span>
                                <span>MRP & Buenas Prácticas</span>
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">INVIMA</span>
                            </div>
                            <h1 className="text-xl font-black text-slate-900 mt-0.5">
                                Producción, Lotes & Control de Calidad
                            </h1>
                        </div>
                    </div>

                    {/* Botón Nueva Orden & Pestañas */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer"
                        >
                            <Plus size={16} />
                            <span>Crear Batch / Lote</span>
                        </button>

                        <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                            <button
                                onClick={() => setActiveTab('batches')}
                                className={`px-3 py-1.5 rounded-lg transition-all ${
                                    activeTab === 'batches' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
                                }`}
                            >
                                Lotes Activos
                            </button>
                            <button
                                onClick={() => setActiveTab('formulas')}
                                className={`px-3 py-1.5 rounded-lg transition-all ${
                                    activeTab === 'formulas' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
                                }`}
                            >
                                Recetas BOM
                            </button>
                            <button
                                onClick={() => setActiveTab('traceability')}
                                className={`px-3 py-1.5 rounded-lg transition-all ${
                                    activeTab === 'traceability' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
                                }`}
                            >
                                Trazabilidad INVIMA
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Contenido Principal */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">

                {/* TAB 1: LOTES ACTIVOS / KANBAN */}
                {activeTab === 'batches' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-black text-slate-900">
                                Órdenes de Producción Registradas ({batches.length})
                            </h2>
                            <span className="text-xs text-slate-500">
                                Trazabilidad de mezclas químicas y liberación de producto
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {batches.map(batch => {
                                const isApproved = batch.estado === 'aprobado';
                                const isRejected = batch.estado === 'rechazado';

                                return (
                                    <div
                                        key={batch.id}
                                        className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between hover:border-indigo-300 transition-all"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                                                    Lote #{batch.numeroLote}
                                                </span>
                                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                    isApproved
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : isRejected
                                                        ? 'bg-rose-100 text-rose-800'
                                                        : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                    {batch.estado}
                                                </span>
                                            </div>

                                            <h3 className="font-black text-slate-900 text-sm">{batch.nombreProducto}</h3>
                                            <p className="text-xs text-slate-500 mt-1">{batch.tanqueOMezclador}</p>

                                            <div className="mt-3 grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl text-xs">
                                                <div>
                                                    <span className="text-[10px] text-slate-400 block font-bold">Volumen</span>
                                                    <span className="font-black text-slate-800">{batch.volumenPlaneadoLitros.toLocaleString()} L</span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] text-slate-400 block font-bold">Costo/Litro</span>
                                                    <span className="font-black text-indigo-600">{formatCurrency(batch.costoUnitarioPorLitro)}</span>
                                                </div>
                                            </div>

                                            {batch.controlCalidad && (
                                                <div className="mt-2 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg space-y-0.5">
                                                    <div>pH: <strong>{batch.controlCalidad.phMedido}</strong> · Densidad: <strong>{batch.controlCalidad.densidadMedida}</strong></div>
                                                    <div className="text-[10px] text-slate-400">Verificado por: {batch.controlCalidad.verificadoPor}</div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                            <span className="text-[10px] text-slate-400">
                                                Vence: {new Date(batch.fechaVencimiento).toLocaleDateString('es-CO')}
                                            </span>

                                            {!batch.controlCalidad && (
                                                <button
                                                    onClick={() => setSelectedBatchForQC(batch)}
                                                    className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                                                >
                                                    Control Calidad
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {batches.length === 0 && !isLoading && (
                                <div className="col-span-3 text-center py-12 text-slate-400 text-xs italic">
                                    No hay órdenes de producción registradas aún. Haz clic en "Crear Batch / Lote" para iniciar.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 2: RECETAS / FÓRMULAS BOM */}
                {activeTab === 'formulas' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-black text-slate-900">
                                Fórmulas Químicas Maestras (Lista de Materiales - BOM)
                            </h2>
                            <span className="text-xs text-slate-500">
                                Especificaciones fisicoquímicas y componentes por litro base
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {DEFAULT_FORMULAS.map(formula => (
                                <div key={formula.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
                                    <div>
                                        <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                            Versión {formula.version} · Activa
                                        </span>
                                        <h3 className="font-black text-slate-900 text-sm mt-1.5">{formula.nombreProducto}</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">{formula.aromaTeorico} · {formula.colorTeorico}</p>
                                    </div>

                                    {/* Parámetros */}
                                    <div className="p-2.5 bg-slate-50 rounded-xl text-xs space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Rango de pH:</span>
                                            <span className="font-bold">{formula.phTeoricoMin} - {formula.phTeoricoMax}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Densidad Teórica:</span>
                                            <span className="font-bold">{formula.densidadTeorica} g/ml</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Viscosidad:</span>
                                            <span className="font-bold">{formula.viscosidadTeorica}</span>
                                        </div>
                                    </div>

                                    {/* Ingredientes */}
                                    <div>
                                        <span className="text-[10px] font-black uppercase text-slate-400 block mb-1.5">
                                            Ingredientes por cada 1 Litro:
                                        </span>
                                        <div className="space-y-1 text-xs">
                                            {formula.ingredientes.map(ing => (
                                                <div key={ing.rawMaterialId} className="flex justify-between border-b border-slate-100 pb-1 text-[11px]">
                                                    <span className="text-slate-700 truncate">{ing.nombre}</span>
                                                    <span className="font-bold font-mono text-slate-900">{ing.cantidadPorUnidadBase} {ing.unidad}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* TAB 3: TRAZABILIDAD INVERSA INVIMA */}
                {activeTab === 'traceability' && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 max-w-2xl mx-auto">
                        <div className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-emerald-600" />
                            <h2 className="text-base font-black text-slate-900">
                                Consulta de Trazabilidad Inversa (Auditoría INVIMA / Recall)
                            </h2>
                        </div>
                        <p className="text-xs text-slate-500">
                            Ingresa un número de lote para auditar componentes, fecha de mezcla y parámetros de liberación.
                        </p>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Ej: 400725081 o buscar lote..."
                                value={lotSearchQuery}
                                onChange={(e) => setLotSearchQuery(e.target.value)}
                                className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                            />
                        </div>

                        {searchedBatch ? (
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
                                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                    <div>
                                        <span className="font-black text-sm text-slate-900">{searchedBatch.nombreProducto}</span>
                                        <p className="text-[11px] text-slate-500">Lote #{searchedBatch.numeroLote}</p>
                                    </div>
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                                        {searchedBatch.estado}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                    <div>Fecha Elaboración: <strong>{new Date(searchedBatch.fechaInicio).toLocaleDateString()}</strong></div>
                                    <div>Fecha Vencimiento: <strong>{new Date(searchedBatch.fechaVencimiento).toLocaleDateString()}</strong></div>
                                    <div>Tanque de Mezcla: <strong>{searchedBatch.tanqueOMezclador}</strong></div>
                                    <div>Responsable: <strong>{searchedBatch.responsablePlanta}</strong></div>
                                </div>

                                <div>
                                    <span className="font-bold text-[11px] text-slate-700 block mb-1">Materias Primas Consumidas:</span>
                                    <div className="space-y-1">
                                        {searchedBatch.materiasPrimasConsumidas.map((m, idx) => (
                                            <div key={idx} className="flex justify-between text-[11px] border-b border-slate-200/60 pb-0.5">
                                                <span>{m.nombre}</span>
                                                <span className="font-bold font-mono">{m.cantidadRealConsumida} {m.unidad} ({formatCurrency(m.costoTotal)})</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : lotSearchQuery.trim() ? (
                            <div className="text-center py-6 text-slate-400 text-xs italic">
                                No se encontró ningún lote con el código especificado.
                            </div>
                        ) : null}
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
                                <button onClick={() => setIsCreateModalOpen(false)} className="p-1 text-slate-400">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-3 text-xs">
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Fórmula Maestra a Producir</label>
                                    <select
                                        value={selectedFormulaId}
                                        onChange={(e) => setSelectedFormulaId(e.target.value)}
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                                    >
                                        {DEFAULT_FORMULAS.map(f => (
                                            <option key={f.id} value={f.id}>{f.nombreProducto}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-bold text-slate-700 block mb-1">Volumen Planeado (Litros)</label>
                                        <input
                                            type="number"
                                            step="100"
                                            value={batchVolumeLitros}
                                            onChange={(e) => setBatchVolumeLitros(Number(e.target.value))}
                                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-bold text-slate-700 block mb-1">Tanque Mezclador</label>
                                        <select
                                            value={selectedTank}
                                            onChange={(e) => setSelectedTank(e.target.value)}
                                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                                        >
                                            <option value="Tanque Mezclador #1 (2,500 L)">Tanque #1 (2,500 L)</option>
                                            <option value="Tanque Mezclador #2 (1,000 L)">Tanque #2 (1,000 L)</option>
                                            <option value="Tanque Mezclador #3 (5,000 L)">Tanque #3 (5,000 L)</option>
                                        </select>
                                    </div>
                                </div>

                                <button
                                    onClick={handleCreateBatch}
                                    disabled={isSubmittingBatch}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
                                >
                                    {isSubmittingBatch ? 'Generando Orden y Lote...' : 'Confirmar Orden y Generar Lote INVIMA'}
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
                                <button onClick={() => setSelectedBatchForQC(null)} className="p-1 text-slate-400">
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
                                        className="py-2.5 bg-rose-50 text-rose-700 font-bold rounded-xl hover:bg-rose-100"
                                    >
                                        Rechazar Lote
                                    </button>
                                    <button
                                        onClick={() => handleApproveQC(true)}
                                        disabled={isSubmittingQC}
                                        className="py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700"
                                    >
                                        Aprobar y Liberar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
