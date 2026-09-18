'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Award,
    Target,
    Users,
    DollarSign,
    Phone,
    MessageCircle,
    ArrowLeft,
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    Calendar,
    Sparkles,
    ShoppingBag,
    Send
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/checkout-utils';
import {
    getAdvisorPortfolio,
    AdvisorPortfolioSummary,
    DEFAULT_ADVISOR_GOALS
} from '@/lib/advisors-service';
import { CustomerCRM } from '@/types/crm';
import { addCRMActivity } from '@/lib/crm-service';
import { useAuth } from '@/lib/auth-context';

const ADVISORS = ['Karen', 'Katherine', 'Andrea', 'Diego', 'Laura', 'Camilo'];

export default function AsesoresCockpitPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [selectedAdvisor, setSelectedAdvisor] = useState<string>('Karen');
    const [portfolio, setPortfolio] = useState<AdvisorPortfolioSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [quickNoteText, setQuickNoteText] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        loadData(selectedAdvisor);
    }, [selectedAdvisor]);

    const loadData = async (advName: string) => {
        setIsLoading(true);
        try {
            const data = await getAdvisorPortfolio(advName);
            setPortfolio(data);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendQuickNote = async (customerId: string) => {
        const text = quickNoteText[customerId];
        if (!text || !text.trim()) return;

        try {
            await addCRMActivity({
                customerId,
                type: 'call',
                description: text.trim(),
                authorName: selectedAdvisor,
                authorEmail: `${selectedAdvisor.toLowerCase()}@biocambio360.com`,
            });
            setQuickNoteText(prev => ({ ...prev, [customerId]: '' }));
            alert('Llamada/compromiso registrado en el CRM.');
        } catch (e) {
            console.error('Error registrando nota:', e);
        }
    };

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
                                <span>Biocambio360</span>
                                <span>•</span>
                                <span>Espacio Comercial</span>
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full">Gamificación</span>
                            </div>
                            <h1 className="text-xl font-black text-slate-900 mt-0.5">
                                Cockpit del Asesor Comercial
                            </h1>
                        </div>
                    </div>

                    {/* Selector de Asesor Activo */}
                    <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                        <span className="text-xs font-bold text-slate-500 pl-2">Asesor:</span>
                        <div className="flex gap-1 overflow-x-auto no-scrollbar">
                            {ADVISORS.map(adv => (
                                <button
                                    key={adv}
                                    onClick={() => setSelectedAdvisor(adv)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                                        selectedAdvisor === adv
                                            ? 'bg-white text-indigo-600 shadow-xs'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    {adv}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </header>

            {/* Contenido Principal */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
                {/* Banner de Metas & Comisiones */}
                {portfolio && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Meta Mensual & Cumplimiento */}
                        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-5 rounded-2xl text-white shadow-sm flex flex-col justify-between">
                            <div>
                                <span className="text-[11px] font-bold text-indigo-300 uppercase">Meta Mensual ($30M)</span>
                                <p className="text-3xl font-black text-amber-400 mt-1">
                                    {portfolio.porcentajeCumplimiento}%
                                </p>
                                <p className="text-xs text-slate-300 mt-0.5">
                                    {formatCurrency(portfolio.ventasAcumuladasMes)} acumulados
                                </p>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2 mt-4 overflow-hidden">
                                <div
                                    className="bg-amber-400 h-full rounded-full transition-all"
                                    style={{ width: `${Math.min(100, portfolio.porcentajeCumplimiento)}%` }}
                                />
                            </div>
                        </div>

                        {/* Comisiones Devengadas */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase">Comisiones Estimadas</span>
                                <p className="text-2xl font-black text-emerald-600 mt-1">
                                    {formatCurrency(portfolio.comisionesEstimadasCOP)}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {portfolio.porcentajeCumplimiento >= 100 ? 'Bono Meta 3.5%' : 'Base 2.0%'}
                                </p>
                            </div>
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-md w-fit">
                                {portfolio.porcentajeCumplimiento >= 100 ? '🎉 ¡Meta Superada!' : 'Acelerador al 100%'}
                            </span>
                        </div>

                        {/* Cartera Asignada */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase">Clientes en Cartera</span>
                                <p className="text-2xl font-black text-slate-900 mt-1">
                                    {portfolio.totalClientes}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {portfolio.clientesNuevosEsteMes} nuevos captados
                                </p>
                            </div>
                            <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-2 py-1 rounded-md w-fit">
                                Cartera Protegida Biocambio360
                            </span>
                        </div>

                        {/* Clientes en Riesgo */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                            <div>
                                <span className="text-[11px] font-bold text-slate-400 uppercase">Alertas de Recompra</span>
                                <p className="text-2xl font-black text-rose-600 mt-1">
                                    {portfolio.clientesEnRiesgo}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Sin compra en +45 días
                                </p>
                            </div>
                            <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-2 py-1 rounded-md w-fit">
                                Tareas Prioritarias Hoy
                            </span>
                        </div>
                    </div>
                )}

                {/* Lista de Tareas Diarias y Clientes Prioritarios */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-base font-black text-slate-900">
                                Clientes Prioritarios de {selectedAdvisor} (Acción Inmediata)
                            </h2>
                            <p className="text-xs text-slate-500">
                                Clientes en ciclo de recompra o en riesgo de fuga asignados a tu cartera.
                            </p>
                        </div>
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                            {portfolio?.clientesPrioritarios.length || 0} pendientes
                        </span>
                    </div>

                    <div className="space-y-3">
                        {portfolio?.clientesPrioritarios.map(client => {
                            const cleanPhone = client.celular.replace(/\D/g, '');
                            const whatsappMsg = encodeURIComponent(
                                `Hola ${client.nombre}, te saluda ${selectedAdvisor} de Biocambio360. Vemos que tu último pedido fue de productos concentrados. ¿Cómo va tu stock de detergente? Recuerda que tenemos envío subsidiado para ti.`
                            );

                            return (
                                <div
                                    key={client.id}
                                    className="p-4 bg-slate-50/75 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-slate-900">{client.nombre}</span>
                                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                                                {client.stage}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            Tel: {client.celular} · {client.ciudad || 'Colombia'} · {client.ordersCount} pedidos ({formatCurrency(client.totalSpent)})
                                        </p>
                                    </div>

                                    {/* Acciones de Contacto */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <div className="flex items-center gap-1.5">
                                            <input
                                                type="text"
                                                placeholder="Nota de llamada..."
                                                value={quickNoteText[client.id] || ''}
                                                onChange={(e) => setQuickNoteText({ ...quickNoteText, [client.id]: e.target.value })}
                                                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs w-48 focus:outline-hidden"
                                            />
                                            <button
                                                onClick={() => handleSendQuickNote(client.id)}
                                                className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold"
                                                title="Guardar nota en CRM"
                                            >
                                                <Send size={14} />
                                            </button>
                                        </div>

                                        <a
                                            href={`https://wa.me/57${cleanPhone}?text=${whatsappMsg}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                                        >
                                            <MessageCircle size={14} />
                                            WhatsApp 1-Clic
                                        </a>

                                        <a
                                            href={`tel:${client.celular}`}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                                        >
                                            <Phone size={14} />
                                            Llamar
                                        </a>
                                    </div>
                                </div>
                            );
                        })}

                        {(!portfolio?.clientesPrioritarios || portfolio.clientesPrioritarios.length === 0) && (
                            <div className="text-center py-8 text-slate-400 text-xs italic">
                                No hay tareas pendientes para este asesor en este momento.
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
