'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
    TrendingDown
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getAllB2BProposals, updateB2BProposalStatus, B2BProposal } from '@/lib/b2b-proposal-service';
import { formatCurrency } from '@/lib/checkout-utils';

const STATUS_CONFIG: Record<B2BProposal['status'], { label: string; bg: string; fg: string }> = {
    nuevo: { label: 'Nueva Cotización', bg: 'bg-blue-100', fg: 'text-blue-800' },
    descargado: { label: 'PDF Descargado', bg: 'bg-purple-100', fg: 'text-purple-800' },
    contactado: { label: 'Contactado', bg: 'bg-amber-100', fg: 'text-amber-800' },
    negociacion: { label: 'En Negociación', bg: 'bg-cyan-100', fg: 'text-cyan-800' },
    cerrado: { label: 'Cerrado ✅', bg: 'bg-green-100', fg: 'text-green-800' },
    no_aplica: { label: 'No Aplica', bg: 'bg-red-100', fg: 'text-red-800' }
};

export default function CotizacionesB2BAdminPage() {
    const router = useRouter();
    const [proposals, setProposals] = useState<B2BProposal[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedProposal, setSelectedProposal] = useState<B2BProposal | null>(null);

    useEffect(() => {
        loadProposals();
    }, []);

    const loadProposals = async () => {
        setIsLoading(true);
        const data = await getAllB2BProposals();
        setProposals(data);
        setIsLoading(false);
    };

    const handleStatusChange = async (proposalId: string, newStatus: B2BProposal['status']) => {
        await updateB2BProposalStatus(proposalId, newStatus);
        setProposals(prev => prev.map(p => p.id === proposalId ? { ...p, status: newStatus } : p));
        if (selectedProposal && selectedProposal.id === proposalId) {
            setSelectedProposal(prev => prev ? { ...prev, status: newStatus } : null);
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

    const handleOpenWhatsApp = (p: B2BProposal) => {
        const msg = `Hola ${p.nombreEncargado} 👋, te saludamos de Biocambio360. Respecto a la cotización *${p.code}* generada para *${p.nombreEmpresa}* (Ahorro estimado: *$${p.ahorroMes.toLocaleString('es-CO')}/mes*), ¿tuviste oportunidad de revisar la propuesta de fábrica?`;
        window.open(`https://wa.me/57${p.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                    <button
                        onClick={() => router.push('/admin')}
                        className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1 mb-2"
                    >
                        <ArrowLeft size={14} /> Volver al Dashboard
                    </button>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <Building2 className="text-teal-600" size={28} />
                        Gestor CRM de Cotizaciones B2B & Leads
                    </h1>
                    <p className="text-xs text-gray-500">
                        Trazabilidad completa de cotizaciones corporativas generadas y descargadas desde la tienda.
                    </p>
                </div>
            </div>

            {/* KPI Cards */}
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

            {/* Search Bar */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por código (COT-2026-...), nombre de empresa, encargado, ciudad o sector..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-teal-600 focus:outline-none"
                    />
                </div>
            </div>

            {/* Proposals Table */}
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
                                <th className="p-4 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
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

                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => handleOpenWhatsApp(p)}
                                                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 ml-auto shadow-xs"
                                                >
                                                    <MessageCircle size={14} /> WhatsApp 1-Clic
                                                </button>
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
    );
}
