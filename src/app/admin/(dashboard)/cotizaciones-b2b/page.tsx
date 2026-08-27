'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2,
    FileText,
    Search,
    MessageCircle,
    Calendar,
    DollarSign,
    CheckCircle2,
    Clock,
    User,
    Phone,
    Mail,
    MapPin,
    ArrowLeft,
    TrendingDown,
    Settings,
    Plus,
    Trash2,
    Save,
    RotateCcw,
    Edit3,
    Eye,
    Printer,
    Sparkles,
    Shirt,
    Utensils,
    GraduationCap,
    Hotel,
    Stethoscope,
    Factory,
    HelpCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
    getAllB2BProposals,
    updateB2BProposalStatus,
    updateB2BProposalItems,
    getB2BSectorsConfig,
    saveB2BSectorsConfig,
    resetB2BSectorsConfig,
    B2BProposal,
    B2BProposalItem,
    SectorConfig,
    SectorRecommendedItem,
    DEFAULT_SECTORS
} from '@/lib/b2b-proposal-service';
import { formatCurrency } from '@/lib/checkout-utils';

const STATUS_CONFIG: Record<B2BProposal['status'], { label: string; bg: string; fg: string }> = {
    nuevo: { label: 'Nueva Cotización', bg: 'bg-blue-100', fg: 'text-blue-800' },
    descargado: { label: 'PDF Descargado', bg: 'bg-purple-100', fg: 'text-purple-800' },
    contactado: { label: 'Contactado', bg: 'bg-amber-100', fg: 'text-amber-800' },
    negociacion: { label: 'En Negociación', bg: 'bg-cyan-100', fg: 'text-cyan-800' },
    cerrado: { label: 'Cerrado ✅', bg: 'bg-green-100', fg: 'text-green-800' },
    no_aplica: { label: 'No Aplica', bg: 'bg-red-100', fg: 'text-red-800' }
};

const getSectorIcon = (iconKey?: string) => {
    switch (iconKey) {
        case 'Shirt': return Shirt;
        case 'Utensils': return Utensils;
        case 'GraduationCap': return GraduationCap;
        case 'Hotel': return Hotel;
        case 'Stethoscope': return Stethoscope;
        case 'Factory': return Factory;
        case 'Sparkles': return Sparkles;
        case 'Building2':
        default:
            return Building2;
    }
};

export default function CotizacionesB2BAdminPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'crm' | 'tarifas'>('crm');

    // ── CRM Proposals State ──
    const [proposals, setProposals] = useState<B2BProposal[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoadingProposals, setIsLoadingProposals] = useState(true);
    const [selectedProposal, setSelectedProposal] = useState<B2BProposal | null>(null);
    const [isEditingProposalModalOpen, setIsEditingProposalModalOpen] = useState(false);
    const [editingProposalItems, setEditingProposalItems] = useState<B2BProposalItem[]>([]);
    const [editingProposalNotes, setEditingProposalNotes] = useState('');
    const [isSavingProposal, setIsSavingProposal] = useState(false);

    // ── Sector Pricing Config State ──
    const [sectors, setSectors] = useState<SectorConfig[]>(DEFAULT_SECTORS);
    const [selectedSectorIndex, setSelectedSectorIndex] = useState<number>(0);
    const [isLoadingSectors, setIsLoadingSectors] = useState(true);
    const [isSavingSectors, setIsSavingSectors] = useState(false);
    const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoadingProposals(true);
        setIsLoadingSectors(true);
        const [proposalsData, sectorsData] = await Promise.all([
            getAllB2BProposals(),
            getB2BSectorsConfig()
        ]);
        setProposals(proposalsData);
        setSectors(sectorsData.length > 0 ? sectorsData : DEFAULT_SECTORS);
        setIsLoadingProposals(false);
        setIsLoadingSectors(false);
    };

    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setFeedbackMsg({ text, type });
        setTimeout(() => setFeedbackMsg(null), 4000);
    };

    // ── CRM Handlers ──
    const handleStatusChange = async (proposalId: string, newStatus: B2BProposal['status']) => {
        await updateB2BProposalStatus(proposalId, newStatus);
        setProposals(prev => prev.map(p => p.id === proposalId ? { ...p, status: newStatus } : p));
        if (selectedProposal && selectedProposal.id === proposalId) {
            setSelectedProposal(prev => prev ? { ...prev, status: newStatus } : null);
        }
    };

    const handleOpenEditModal = (p: B2BProposal) => {
        setSelectedProposal(p);
        setEditingProposalItems(JSON.parse(JSON.stringify(p.items || [])));
        setEditingProposalNotes(p.notasAdmin || '');
        setIsEditingProposalModalOpen(true);
    };

    const handleItemChange = (index: number, field: keyof B2BProposalItem, value: any) => {
        setEditingProposalItems(prev => {
            const next = [...prev];
            const item = { ...next[index], [field]: value };

            const cant = Number(item.cantidad) || 1;
            const pBiocambio = Number(item.precioBiocambio) || 0;
            const pMercado = Number(item.precioMercado) || 0;

            item.subtotalBiocambio = cant * pBiocambio;
            item.subtotalMercado = cant * pMercado;
            item.ahorroItem = item.subtotalMercado - item.subtotalBiocambio;

            next[index] = item;
            return next;
        });
    };

    const handleAddItemToProposal = () => {
        const newItem: B2BProposalItem = {
            nombre: 'Nuevo Producto Personalizado',
            presentacion: '20 Litros',
            precioMercado: 85000,
            precioBiocambio: 50000,
            cantidad: 2,
            subtotalBiocambio: 100000,
            subtotalMercado: 170000,
            ahorroItem: 70000
        };
        setEditingProposalItems(prev => [...prev, newItem]);
    };

    const handleRemoveItemFromProposal = (index: number) => {
        setEditingProposalItems(prev => prev.filter((_, i) => i !== index));
    };

    const editedFinancials = useMemo(() => {
        const gastoMercadoMes = editingProposalItems.reduce((sum, i) => sum + (Number(i.subtotalMercado) || 0), 0);
        const gastoBiocambioMes = editingProposalItems.reduce((sum, i) => sum + (Number(i.subtotalBiocambio) || 0), 0);
        const ahorroMes = gastoMercadoMes - gastoBiocambioMes;
        const ahorroAnual = ahorroMes * 12;
        const ahorroPct = gastoMercadoMes > 0 ? Math.round((ahorroMes / gastoMercadoMes) * 100) : 0;

        return {
            gastoMercadoMes,
            gastoBiocambioMes,
            ahorroMes,
            ahorroAnual,
            ahorroPct
        };
    }, [editingProposalItems]);

    const handleSaveProposalEdits = async () => {
        if (!selectedProposal?.id) return;
        setIsSavingProposal(true);

        const ok = await updateB2BProposalItems(
            selectedProposal.id,
            editingProposalItems,
            editedFinancials,
            editingProposalNotes
        );

        if (ok) {
            setProposals(prev => prev.map(p => {
                if (p.id === selectedProposal.id) {
                    return {
                        ...p,
                        items: editingProposalItems,
                        ...editedFinancials,
                        notasAdmin: editingProposalNotes
                    };
                }
                return p;
            }));
            setSelectedProposal(prev => prev ? {
                ...prev,
                items: editingProposalItems,
                ...editedFinancials,
                notasAdmin: editingProposalNotes
            } : null);
            setIsEditingProposalModalOpen(false);
            showToast('¡Cotización y precios actualizados exitosamente!');
        } else {
            showToast('Error al guardar cambios de la cotización', 'error');
        }
        setIsSavingProposal(false);
    };

    const handleGeneratePDF = async (proposal: B2BProposal) => {
        try {
            const res = await fetch('/api/b2b/generate-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(proposal)
            });
            const html = await res.text();
            const win = window.open('', '_blank');
            if (win) {
                win.document.write(html);
                win.document.close();
            }
        } catch (e) {
            console.error('Error generating PDF:', e);
            alert('Error al generar la cotización PDF');
        }
    };

    const handleOpenWhatsApp = (p: B2BProposal) => {
        const msg = `Hola ${p.nombreEncargado} 👋, te saludamos de Biocambio360. Respecto a la cotización *${p.code}* generada para *${p.nombreEmpresa}* (Ahorro estimado: *$${p.ahorroMes.toLocaleString('es-CO')}/mes*), ¿tuviste oportunidad de revisar la propuesta de fábrica?`;
        window.open(`https://wa.me/57${p.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    // ── Sector Pricing Config Handlers ──
    const currentSector = sectors[selectedSectorIndex] || sectors[0];

    const handleSectorFieldChange = (field: keyof SectorConfig, value: any) => {
        setSectors(prev => {
            const next = [...prev];
            next[selectedSectorIndex] = { ...next[selectedSectorIndex], [field]: value };
            return next;
        });
    };

    const handleSectorItemChange = (itemIdx: number, field: keyof SectorRecommendedItem, value: any) => {
        setSectors(prev => {
            const next = [...prev];
            const sec = { ...next[selectedSectorIndex] };
            const items = [...sec.recommendedItems];
            items[itemIdx] = { ...items[itemIdx], [field]: value };
            sec.recommendedItems = items;
            next[selectedSectorIndex] = sec;
            return next;
        });
    };

    const handleAddProductToSector = () => {
        setSectors(prev => {
            const next = [...prev];
            const sec = { ...next[selectedSectorIndex] };
            const items = [...(sec.recommendedItems || [])];
            items.push({
                nombre: 'Nuevo Producto de Limpieza',
                presentacion: '20 Litros',
                precioMercado: 85000,
                precioBiocambio: 52000,
                factorUnidad: 0.02
            });
            sec.recommendedItems = items;
            next[selectedSectorIndex] = sec;
            return next;
        });
    };

    const handleRemoveProductFromSector = (itemIdx: number) => {
        setSectors(prev => {
            const next = [...prev];
            const sec = { ...next[selectedSectorIndex] };
            sec.recommendedItems = sec.recommendedItems.filter((_, i) => i !== itemIdx);
            next[selectedSectorIndex] = sec;
            return next;
        });
    };

    const handleAddSector = () => {
        const newSec: SectorConfig = {
            id: `sector_${Date.now()}`,
            title: 'Nuevo Sector Empresarial',
            description: 'Descripción del sector comercial o industrial.',
            iconKey: 'Building2',
            defaultUnitsLabel: 'Unidades de Consumo',
            defaultUnits: 100,
            recommendedItems: [
                { nombre: 'Limpiapisos Concentrado', presentacion: '20 Litros', precioMercado: 75000, precioBiocambio: 46000, factorUnidad: 0.02 },
                { nombre: 'Desinfectante Multiusos', presentacion: '20 Litros', precioMercado: 82000, precioBiocambio: 51000, factorUnidad: 0.02 }
            ]
        };
        setSectors(prev => [...prev, newSec]);
        setSelectedSectorIndex(sectors.length);
        showToast('Nuevo sector creado. Personaliza sus tarifas y guarda los cambios.');
    };

    const handleDeleteSector = (idx: number) => {
        if (sectors.length <= 1) {
            alert('Debe existir al menos un sector activo.');
            return;
        }
        if (confirm(`¿Estás seguro de eliminar el sector "${sectors[idx].title}"?`)) {
            setSectors(prev => prev.filter((_, i) => i !== idx));
            setSelectedSectorIndex(0);
            showToast('Sector eliminado.');
        }
    };

    const handleSaveAllSectors = async () => {
        setIsSavingSectors(true);
        const ok = await saveB2BSectorsConfig(sectors);
        if (ok) {
            showToast('¡Tarifas y plantillas de sectores B2B guardadas en Firestore exitosamente!');
        } else {
            showToast('Error al guardar la configuración en Firestore', 'error');
        }
        setIsSavingSectors(false);
    };

    const handleResetSectors = async () => {
        if (confirm('¿Deseas restablecer todas las tarifas y sectores a los valores oficiales de fábrica?')) {
            setIsSavingSectors(true);
            const ok = await resetB2BSectorsConfig();
            if (ok) {
                setSectors(DEFAULT_SECTORS);
                setSelectedSectorIndex(0);
                showToast('Tarifas restablecidas a valores de fábrica.');
            }
            setIsSavingSectors(false);
        }
    };

    const filteredProposals = proposals.filter(p => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            p.code.toLowerCase().includes(q) ||
            p.nombreEmpresa.toLowerCase().includes(q) ||
            p.nombreEncargado.toLowerCase().includes(q) ||
            p.ciudad.toLowerCase().includes(q) ||
            p.sectorLabel.toLowerCase().includes(q)
        );
    });

    const totalCotizaciones = proposals.length;
    const totalMontoBiocambio = proposals.reduce((sum, p) => sum + p.gastoBiocambioMes, 0);
    const totalAhorroOfrecido = proposals.reduce((sum, p) => sum + p.ahorroMes, 0);
    const totalCerradas = proposals.filter(p => p.status === 'cerrado').length;

    return (
        <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
            {feedbackMsg && (
                <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl shadow-xl font-bold text-sm text-white flex items-center gap-2 ${
                    feedbackMsg.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
                }`}>
                    <Sparkles size={18} />
                    {feedbackMsg.text}
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                    <button
                        onClick={() => router.push('/admin')}
                        className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1 mb-2 cursor-pointer"
                    >
                        <ArrowLeft size={14} /> Volver al Dashboard
                    </button>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-2">
                        <Building2 className="text-teal-600" size={30} />
                        Gestor Comercial & Tarifas B2B
                    </h1>
                    <p className="text-xs text-gray-500">
                        Administra cotizaciones de clientes corporativos y personaliza las tarifas base de sectores en tiempo real.
                    </p>
                </div>

                <div className="flex items-center gap-1 bg-gray-100 p-1.5 rounded-2xl border border-gray-200 self-start sm:self-auto">
                    <button
                        onClick={() => setActiveTab('crm')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                            activeTab === 'crm'
                                ? 'bg-white text-teal-700 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <FileText size={16} />
                        CRM Cotizaciones ({proposals.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('tarifas')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                            activeTab === 'tarifas'
                                ? 'bg-teal-600 text-white shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        <Settings size={16} />
                        Configurar Tarifas & Sectores ({sectors.length})
                    </button>
                </div>
            </div>

            {/* TAB 1: CRM */}
            {activeTab === 'crm' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
                            <span className="text-[10px] font-extrabold uppercase text-gray-400">Total Cotizaciones B2B</span>
                            <div className="text-2xl font-black text-gray-900 mt-1">{totalCotizaciones}</div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
                            <span className="text-[10px] font-extrabold uppercase text-gray-400">Valor Cotizado (Fábrica)</span>
                            <div className="text-xl font-black text-teal-700 mt-1">{formatCurrency(totalMontoBiocambio)}</div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
                            <span className="text-[10px] font-extrabold uppercase text-gray-400">Ahorro Ofrecido / Mes</span>
                            <div className="text-xl font-black text-green-700 mt-1">{formatCurrency(totalAhorroOfrecido)}</div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
                            <span className="text-[10px] font-extrabold uppercase text-gray-400">Cotizaciones Cerradas</span>
                            <div className="text-2xl font-black text-blue-700 mt-1">{totalCerradas}</div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar por código (COT-2026-...), empresa, encargado, ciudad o sector..."
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-600 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        <th className="p-4">Código / Empresa</th>
                                        <th className="p-4">Contacto Encargado</th>
                                        <th className="p-4">Sector & Ubicación</th>
                                        <th className="p-4 text-right">Cotizado (Fábrica)</th>
                                        <th className="p-4 text-right">Ahorro Mensual</th>
                                        <th className="p-4 text-center">Estado CRM</th>
                                        <th className="p-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {isLoadingProposals ? (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-gray-400">Cargando cotizaciones B2B...</td>
                                        </tr>
                                    ) : filteredProposals.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-gray-400">No se encontraron cotizaciones registradas.</td>
                                        </tr>
                                    ) : (
                                        filteredProposals.map((p) => {
                                            const stDef = STATUS_CONFIG[p.status] || STATUS_CONFIG.nuevo;

                                            return (
                                                <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                                                    <td className="p-4 font-mono font-black text-gray-900">
                                                        <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 text-xs block mb-1 inline-block">
                                                            {p.code}
                                                        </span>
                                                        <span className="font-bold text-sm block text-gray-900">{p.nombreEmpresa}</span>
                                                    </td>

                                                    <td className="p-4">
                                                        <div className="font-bold text-gray-900">{p.nombreEncargado}</div>
                                                        <div className="text-xs text-gray-500">📱 {p.whatsapp}</div>
                                                    </td>

                                                    <td className="p-4 text-xs">
                                                        <span className="bg-teal-50 text-teal-700 font-bold px-2 py-0.5 rounded-md block mb-1 inline-block">
                                                            {p.sectorLabel}
                                                        </span>
                                                        <div className="text-gray-500">📍 {p.ciudad}</div>
                                                    </td>

                                                    <td className="p-4 text-right font-black text-teal-700">
                                                        {formatCurrency(p.gastoBiocambioMes)} /mes
                                                    </td>

                                                    <td className="p-4 text-right font-black text-green-600">
                                                        {formatCurrency(p.ahorroMes)} <span className="text-xs text-gray-400">(-{p.ahorroPct}%)</span>
                                                    </td>

                                                    <td className="p-4 text-center">
                                                        <select
                                                            value={p.status}
                                                            onChange={(e) => handleStatusChange(p.id!, e.target.value as any)}
                                                            className={`px-3 py-1 rounded-lg text-xs font-black border border-gray-200 cursor-pointer ${stDef.bg} ${stDef.fg}`}
                                                        >
                                                            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                                                <option key={k} value={k}>{v.label}</option>
                                                            ))}
                                                        </select>
                                                    </td>

                                                    <td className="p-4 text-right space-y-1.5">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={() => handleOpenEditModal(p)}
                                                                title="Editar precios, cantidades y productos de esta cotización"
                                                                className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold rounded-lg text-xs flex items-center gap-1 border border-teal-200 cursor-pointer"
                                                            >
                                                                <Edit3 size={13} /> Modificar Precios
                                                            </button>

                                                            <button
                                                                onClick={() => handleGeneratePDF(p)}
                                                                title="Descargar / Imprimir PDF Oficial"
                                                                className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg cursor-pointer"
                                                            >
                                                                <Printer size={15} />
                                                            </button>

                                                            <button
                                                                onClick={() => handleOpenWhatsApp(p)}
                                                                title="Contactar al cliente por WhatsApp"
                                                                className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg cursor-pointer"
                                                            >
                                                                <MessageCircle size={15} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: SECTOR PRICING CONFIG */}
            {activeTab === 'tarifas' && (
                <div className="space-y-6">
                    <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <span className="bg-teal-500/20 text-teal-300 font-black text-[10px] uppercase px-3 py-1 rounded-full border border-teal-400/30 inline-block mb-2">
                                Matriz Maestra de Precios B2B
                            </span>
                            <h2 className="text-xl sm:text-2xl font-black">Editor de Tarifas y Fórmulas por Sector</h2>
                            <p className="text-xs text-gray-300 max-w-2xl mt-1">
                                Los valores configurados aquí se reflejarán en tiempo real en la página pública del Cotizador B2B (<code>/cotizador-b2b</code>) y en los PDFs generados.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={handleResetSectors}
                                disabled={isSavingSectors}
                                className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white border border-white/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                                <RotateCcw size={14} /> Restablecer Fábrica
                            </button>

                            <button
                                onClick={handleAddSector}
                                className="px-3.5 py-2.5 rounded-xl bg-teal-500/30 hover:bg-teal-500/40 text-xs font-bold text-teal-200 border border-teal-400/40 flex items-center gap-1.5 cursor-pointer"
                            >
                                <Plus size={14} /> Crear Nuevo Sector
                            </button>

                            <button
                                onClick={handleSaveAllSectors}
                                disabled={isSavingSectors}
                                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
                            >
                                <Save size={16} />
                                {isSavingSectors ? 'Guardando...' : 'Guardar Todo en Firestore'}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                        {sectors.map((sec, idx) => {
                            const IconComponent = getSectorIcon(sec.iconKey);
                            const isSelected = idx === selectedSectorIndex;

                            return (
                                <button
                                    key={sec.id || idx}
                                    onClick={() => setSelectedSectorIndex(idx)}
                                    className={`px-4 py-3 rounded-2xl border text-left font-bold text-xs flex items-center gap-2.5 whitespace-nowrap transition-all cursor-pointer ${
                                        isSelected
                                            ? 'bg-teal-600 text-white border-teal-600 shadow-md ring-2 ring-teal-500/30'
                                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    <IconComponent size={18} />
                                    <span>{sec.title}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                                        isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                        {sec.recommendedItems?.length || 0}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {currentSector && (
                        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-6 border-b border-gray-100">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                        Nombre del Sector
                                    </label>
                                    <input
                                        type="text"
                                        value={currentSector.title}
                                        onChange={(e) => handleSectorFieldChange('title', e.target.value)}
                                        className="w-full p-2.5 text-sm font-bold border border-gray-200 rounded-xl focus:border-teal-600 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                        Etiqueta de Escala / Unidades
                                    </label>
                                    <input
                                        type="text"
                                        value={currentSector.defaultUnitsLabel}
                                        onChange={(e) => handleSectorFieldChange('defaultUnitsLabel', e.target.value)}
                                        placeholder="Ej: Número de Apartamentos, Estudiantes, etc."
                                        className="w-full p-2.5 text-sm border border-gray-200 rounded-xl focus:border-teal-600 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                        Unidades por Defecto
                                    </label>
                                    <input
                                        type="number"
                                        value={currentSector.defaultUnits}
                                        onChange={(e) => handleSectorFieldChange('defaultUnits', Number(e.target.value))}
                                        className="w-full p-2.5 text-sm font-bold border border-gray-200 rounded-xl focus:border-teal-600 focus:outline-none"
                                    />
                                </div>

                                <div className="md:col-span-3">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                        Descripción del Sector (visible en el cotizador)
                                    </label>
                                    <input
                                        type="text"
                                        value={currentSector.description}
                                        onChange={(e) => handleSectorFieldChange('description', e.target.value)}
                                        className="w-full p-2.5 text-sm border border-gray-200 rounded-xl focus:border-teal-600 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                                    <div>
                                        <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                                            📦 Productos & Matriz de Precios para este Sector
                                        </h3>
                                        <p className="text-xs text-gray-500">
                                            Edita los precios de mercado, precios de fábrica y el factor de cálculo por unidad.
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleAddProductToSector}
                                            className="px-3.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs flex items-center gap-1.5 border border-teal-200 cursor-pointer"
                                        >
                                            <Plus size={14} /> Añadir Producto
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteSector(selectedSectorIndex)}
                                            className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center gap-1 border border-red-200 cursor-pointer"
                                        >
                                            <Trash2 size={13} /> Eliminar Sector
                                        </button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto border border-gray-200 rounded-2xl">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[11px]">
                                                <th className="p-3 w-1/3">Producto Recomendado</th>
                                                <th className="p-3 w-28">Presentación</th>
                                                <th className="p-3 w-32 text-right">Precio Mercado ($)</th>
                                                <th className="p-3 w-32 text-right">Precio Biocambio ($)</th>
                                                <th className="p-3 w-28 text-center">Factor x Unidad</th>
                                                <th className="p-3 w-28 text-right">Ahorro Unitario</th>
                                                <th className="p-3 w-12 text-center">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {(currentSector.recommendedItems || []).map((item, itemIdx) => {
                                                const unitSavings = (item.precioMercado || 0) - (item.precioBiocambio || 0);
                                                const pct = item.precioMercado > 0 ? Math.round((unitSavings / item.precioMercado) * 100) : 0;

                                                return (
                                                    <tr key={itemIdx} className="hover:bg-teal-50/30 transition-colors">
                                                        <td className="p-2.5">
                                                            <input
                                                                type="text"
                                                                value={item.nombre}
                                                                onChange={(e) => handleSectorItemChange(itemIdx, 'nombre', e.target.value)}
                                                                className="w-full p-2 border border-gray-200 rounded-lg font-bold text-gray-900 focus:border-teal-600 focus:outline-none"
                                                            />
                                                        </td>
                                                        <td className="p-2.5">
                                                            <input
                                                                type="text"
                                                                value={item.presentacion}
                                                                onChange={(e) => handleSectorItemChange(itemIdx, 'presentacion', e.target.value)}
                                                                placeholder="20 Litros"
                                                                className="w-full p-2 border border-gray-200 rounded-lg text-center font-medium focus:border-teal-600 focus:outline-none"
                                                            />
                                                        </td>
                                                        <td className="p-2.5">
                                                            <input
                                                                type="number"
                                                                value={item.precioMercado}
                                                                onChange={(e) => handleSectorItemChange(itemIdx, 'precioMercado', Number(e.target.value))}
                                                                className="w-full p-2 border border-gray-200 rounded-lg text-right font-medium text-gray-500 line-through focus:border-teal-600 focus:outline-none"
                                                            />
                                                        </td>
                                                        <td className="p-2.5">
                                                            <input
                                                                type="number"
                                                                value={item.precioBiocambio}
                                                                onChange={(e) => handleSectorItemChange(itemIdx, 'precioBiocambio', Number(e.target.value))}
                                                                className="w-full p-2 border border-teal-300 bg-teal-50/50 rounded-lg text-right font-black text-teal-800 focus:border-teal-600 focus:outline-none"
                                                            />
                                                        </td>
                                                        <td className="p-2.5">
                                                            <input
                                                                type="number"
                                                                step="0.005"
                                                                value={item.factorUnidad}
                                                                onChange={(e) => handleSectorItemChange(itemIdx, 'factorUnidad', Number(e.target.value))}
                                                                title="Multiplicador según escala de unidades (ej: 0.02 = 2 garrafas por cada 100 aptos)"
                                                                className="w-full p-2 border border-gray-200 rounded-lg text-center font-mono focus:border-teal-600 focus:outline-none"
                                                            />
                                                        </td>
                                                        <td className="p-2.5 text-right font-black text-green-600">
                                                            +{formatCurrency(unitSavings)}
                                                            <span className="block text-[10px] text-gray-400 font-normal">(-{pct}%)</span>
                                                        </td>
                                                        <td className="p-2.5 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveProductFromSector(itemIdx)}
                                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleSaveAllSectors}
                                        disabled={isSavingSectors}
                                        className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                                    >
                                        <Save size={16} />
                                        {isSavingSectors ? 'Guardando en Firestore...' : 'Guardar y Publicar Tarifas'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL EDIT PROPOSAL */}
            <AnimatePresence>
                {isEditingProposalModalOpen && selectedProposal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto"
                        >
                            <div className="p-5 bg-gradient-to-r from-teal-900 to-slate-900 text-white flex items-center justify-between">
                                <div>
                                    <span className="bg-teal-500/20 text-teal-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-teal-400/30 inline-block mb-1">
                                        {selectedProposal.code}
                                    </span>
                                    <h2 className="text-xl font-black">
                                        Modificar Cotización · {selectedProposal.nombreEmpresa}
                                    </h2>
                                    <p className="text-xs text-gray-300">
                                        Atn: {selectedProposal.nombreEncargado} | 📍 {selectedProposal.ciudad} | 📱 {selectedProposal.whatsapp}
                                    </p>
                                </div>

                                <button
                                    onClick={() => setIsEditingProposalModalOpen(false)}
                                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold cursor-pointer"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-black text-gray-900 text-sm flex items-center gap-1.5">
                                            <span>📋 Productos Cotizados</span>
                                            <span className="text-xs text-gray-500 font-normal">({editingProposalItems.length} items)</span>
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={handleAddItemToProposal}
                                            className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold rounded-lg text-xs flex items-center gap-1 border border-teal-200 cursor-pointer"
                                        >
                                            <Plus size={13} /> Añadir Producto
                                        </button>
                                    </div>

                                    <div className="border border-gray-200 rounded-2xl overflow-x-auto">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                                                    <th className="p-2.5">Producto</th>
                                                    <th className="p-2.5 w-24">Presentación</th>
                                                    <th className="p-2.5 w-16 text-center">Cant.</th>
                                                    <th className="p-2.5 w-24 text-right">P. Mercado</th>
                                                    <th className="p-2.5 w-24 text-right">P. Biocambio</th>
                                                    <th className="p-2.5 w-24 text-right">Total Biocambio</th>
                                                    <th className="p-2.5 w-8 text-center"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {editingProposalItems.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50">
                                                        <td className="p-2">
                                                            <input
                                                                type="text"
                                                                value={item.nombre}
                                                                onChange={(e) => handleItemChange(idx, 'nombre', e.target.value)}
                                                                className="w-full p-1.5 border border-gray-200 rounded-md font-bold text-gray-900 text-xs"
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <input
                                                                type="text"
                                                                value={item.presentacion}
                                                                onChange={(e) => handleItemChange(idx, 'presentacion', e.target.value)}
                                                                className="w-full p-1.5 border border-gray-200 rounded-md text-center text-xs"
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={item.cantidad}
                                                                onChange={(e) => handleItemChange(idx, 'cantidad', Number(e.target.value))}
                                                                className="w-full p-1.5 border border-gray-200 rounded-md text-center font-bold text-xs"
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <input
                                                                type="number"
                                                                value={item.precioMercado}
                                                                onChange={(e) => handleItemChange(idx, 'precioMercado', Number(e.target.value))}
                                                                className="w-full p-1.5 border border-gray-200 rounded-md text-right text-gray-500 text-xs"
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <input
                                                                type="number"
                                                                value={item.precioBiocambio}
                                                                onChange={(e) => handleItemChange(idx, 'precioBiocambio', Number(e.target.value))}
                                                                className="w-full p-1.5 border border-teal-300 bg-teal-50 rounded-md text-right font-black text-teal-800 text-xs"
                                                            />
                                                        </td>
                                                        <td className="p-2 text-right font-black text-gray-900">
                                                            {formatCurrency(item.subtotalBiocambio || 0)}
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveItemFromProposal(idx)}
                                                                className="text-gray-400 hover:text-red-600 p-1 rounded"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gradient-to-br from-teal-50 to-emerald-50 p-4 rounded-2xl border border-teal-200">
                                    <div>
                                        <span className="text-[10px] uppercase font-bold text-gray-500">Gasto Mercado / Mes</span>
                                        <p className="text-sm font-bold text-gray-500 line-through">
                                            {formatCurrency(editedFinancials.gastoMercadoMes)}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] uppercase font-bold text-teal-800">Total Biocambio / Mes</span>
                                        <p className="text-base font-black text-teal-900">
                                            {formatCurrency(editedFinancials.gastoBiocambioMes)}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] uppercase font-bold text-green-800">Ahorro Mensual</span>
                                        <p className="text-base font-black text-green-700">
                                            +{formatCurrency(editedFinancials.ahorroMes)}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] uppercase font-bold text-green-800">Ahorro Anual</span>
                                        <p className="text-base font-black text-green-700">
                                            +{formatCurrency(editedFinancials.ahorroAnual)} <span className="text-xs">(-{editedFinancials.ahorroPct}%)</span>
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                                        Notas de Negociación & Acuerdos Comerciales
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={editingProposalNotes}
                                        onChange={(e) => setEditingProposalNotes(e.target.value)}
                                        placeholder="Ej: Se acordó descuento especial por pedido mensual superior a $1.000.000, pago a 15 días, etc."
                                        className="w-full p-2.5 text-xs border border-gray-200 rounded-xl focus:border-teal-600 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={() => handleGeneratePDF({ ...selectedProposal, items: editingProposalItems, ...editedFinancials, notasAdmin: editingProposalNotes })}
                                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-gray-100 text-gray-800 font-bold text-xs border border-gray-200 flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Printer size={15} /> Ver PDF con estos Precios
                                </button>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingProposalModalOpen(false)}
                                        className="px-4 py-2.5 rounded-xl text-gray-600 hover:text-gray-900 font-bold text-xs cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveProposalEdits}
                                        disabled={isSavingProposal}
                                        className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
                                    >
                                        <Save size={15} />
                                        {isSavingProposal ? 'Guardando...' : 'Guardar Cambios de Cotización'}
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
