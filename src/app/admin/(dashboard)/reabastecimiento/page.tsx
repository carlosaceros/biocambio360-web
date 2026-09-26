'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Clock,
    AlertTriangle,
    CheckCircle2,
    Calendar,
    MessageCircle,
    Search,
    ArrowLeft,
    RefreshCw,
    User,
    Building2,
    ShoppingBag,
    TrendingUp,
    Filter,
    Send,
    Megaphone,
    DollarSign,
    X,
    Loader2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { doc as fsDoc, onSnapshot as fsOnSnapshot, setDoc as fsSetDoc, serverTimestamp as fsServerTimestamp } from 'firebase/firestore';
import { db as fsDb } from '@/lib/firebase';
import {
    getAllReplenishmentRecords,
    markReminderSent,
    updateCustomerType,
    CustomerReplenishment
} from '@/lib/replenishment-service';
import { formatCurrency } from '@/lib/checkout-utils';
import { auth } from '@/lib/firebase';

const BIOCAMBIO_PHONE_ID = '236893662847270';
const COST_PER_MARKETING_MSG = 0.0125; // USD — Colombia +57, Meta pricing 2025

export default function ReabastecimientoBIAdminPage() {
    const router = useRouter();
    const [records, setRecords] = useState<CustomerReplenishment[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [filterType, setFilterType] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    // 1-clic individual
    const [sendingId, setSendingId] = useState<string | null>(null);
    const [emailAuto, setEmailAuto] = useState(true);

    // Daily automatic e-mail (9 a.m.) can be paused; the WhatsApp buttons are independent
    useEffect(
        () => fsOnSnapshot(fsDoc(fsDb, 'bot_config', 'replenishment'), snap => setEmailAuto(snap.data()?.emailEnabled !== false), () => undefined),
        []
    );
    const toggleEmailAuto = (enabled: boolean) =>
        fsSetDoc(fsDoc(fsDb, 'bot_config', 'replenishment'), { emailEnabled: enabled, updatedAt: fsServerTimestamp() }, { merge: true });

    // Bulk campaign modal
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkDryRun, setBulkDryRun] = useState<{ total: number; estimatedCostUsd: number; template?: { name: string; found: boolean; languages: string[] } } | null>(null);
    const [bulkResult, setBulkResult] = useState<{ sent: number; failed: number; estimatedCostUsd: number } | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const data = await getAllReplenishmentRecords();
        setRecords(data);
        setIsLoading(false);
    };

    const handleToggleCustomerType = async (r: CustomerReplenishment) => {
        if (!r.id) return;
        const newType: 'b2c' | 'b2b' = r.customerType === 'b2b' ? 'b2c' : 'b2b';
        try {
            await updateCustomerType(r.id, newType);
            setRecords(prev => prev.map(rec => rec.id === r.id ? { ...rec, customerType: newType } : rec));
        } catch (e) {
            console.error(e);
            alert('Error al actualizar tipo de cliente en Firestore.');
        }
    };

    /**
     * Envía recordatorio 1-clic vía WhatsApp Cloud API (plantilla aprobada).
     * Fallback: abre wa.me si no hay token configurado.
     */
    const toPayload = (r: CustomerReplenishment) => ({
        id: r.id,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        customerEmail: r.customerEmail,
        customerCity: r.customerCity,
        itemsSummary: r.itemsSummary,
        lastOrderId: r.lastOrderId,
    });

    const handleSendReminder = async (r: CustomerReplenishment) => {
        if (!r.id || !r.customerPhone) return;
        setSendingId(r.id);
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('No autenticado');
            const token = await user.getIdToken();

            const markSent = async () => {
                await markReminderSent(r.id as string);
                setRecords(prev => prev.map(rec => rec.id === r.id ? { ...rec, lastReminderSentAt: new Date().toISOString() } : rec));
            };

            // Try API first — sends via Cloud API with template
            const cleanPhone = r.customerPhone.replace(/\D/g, '');
            const phone = `57${cleanPhone.slice(-10)}`;
            const dueDateStr = new Date(r.nextOrderDueDate).toLocaleDateString('es-CO');

            let templateError = '';

            // 1) Approved template: works even when the customer has not written in the last 24 h
            try {
                const tplRes = await fetch('/api/inbox/bulk-reminder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        customerIds: [r.id],
                        customers: [toPayload(r)],
                        phoneId: BIOCAMBIO_PHONE_ID,
                        templateName: 'reabastecimiento_recordatorio',
                        templateType: 'marketing',
                    }),
                });
                const tplData = await tplRes.json().catch(() => ({}));
                if (tplRes.ok && tplData.sent === 1) {
                    await markSent();
                    return;
                }
                templateError = tplData.results?.[0]?.error || tplData.errors?.[0]?.error || tplData.error || `Error ${tplRes.status}`;
            } catch (e) {
                templateError = e instanceof Error ? e.message : 'Error de red';
            }

            // 2) Free text (only valid inside the 24 h window), then 3) wa.me as last resort
            const res = await fetch('/api/inbox/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    conversationId: `wa_${BIOCAMBIO_PHONE_ID}_${phone}`,
                    contactName: r.customerName,
                    channel: 'whatsapp',
                    to: phone,
                    phoneId: BIOCAMBIO_PHONE_ID,
                    type: 'text',
                    text: r.customerType === 'b2c'
                        ? `Hola ${r.customerName} 👋. En Biocambio360 queremos que tu hogar nunca se quede sin *${r.itemsSummary}*. Tu fecha sugerida de reabastecimiento es el ${dueDateStr}. ¿Te programamos el despacho directo de fábrica? 👉 https://biocambio360.com/`
                        : `Hola ${r.customerName} 👋, saludos de Biocambio360 Fábrica. El stock de *${r.itemsSummary}* tiene fecha estimada de reabastecimiento para el ${dueDateStr}. ¿Autorizamos la orden de reabastecimiento corporativo?`,
                }),
            });

            if (res.ok) {
                await markSent();
            } else {
                const detail = await res.json().catch(() => ({}));
                alert(`No se pudo enviar el WhatsApp desde la plataforma.\n\nPlantilla: ${templateError}\nTexto libre: ${detail.error ?? res.status}`);
            }
        } catch (err: any) {
            console.error('[reabastecimiento] Reminder error:', err);
            alert(`No se pudo enviar el recordatorio: ${err instanceof Error ? err.message : 'error desconocido'}`);
        } finally {
            setSendingId(null);
        }
    };

    // ── Bulk campaign handlers ─────────────────────────────────────────────────

    const criticalCustomers = records.filter(r => r.status === 'critico_10_dias' || r.status === 'vencido');

    const handleBulkDryRun = async () => {
        setBulkLoading(true);
        setBulkDryRun(null);
        try {
            const user = auth.currentUser;
            if (!user) return;
            const token = await user.getIdToken();
            const res = await fetch('/api/inbox/bulk-reminder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    customerIds: criticalCustomers.map(r => r.id).filter(Boolean),
                    customers: criticalCustomers.map(toPayload),
                    phoneId: BIOCAMBIO_PHONE_ID,
                    templateName: 'reabastecimiento_recordatorio',
                    templateType: 'marketing',
                    dryRun: true,
                }),
            });
            const data = await res.json();
            setBulkDryRun({ total: data.total, estimatedCostUsd: data.estimatedCostUsd, template: data.template });
        } catch (err) {
            console.error('[bulk-dry-run]', err);
        } finally {
            setBulkLoading(false);
        }
    };

    const handleBulkSend = async () => {
        if (!bulkDryRun) return;
        if (!confirm(`¿Confirmas el envío de ${bulkDryRun.total} mensajes por un costo estimado de $${bulkDryRun.estimatedCostUsd.toFixed(2)} USD?`)) return;
        setBulkLoading(true);
        setBulkResult(null);
        try {
            const user = auth.currentUser;
            if (!user) return;
            const token = await user.getIdToken();
            const res = await fetch('/api/inbox/bulk-reminder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    customerIds: criticalCustomers.map(r => r.id).filter(Boolean),
                    customers: criticalCustomers.map(toPayload),
                    phoneId: BIOCAMBIO_PHONE_ID,
                    templateName: 'reabastecimiento_recordatorio',
                    templateType: 'marketing',
                    dryRun: false,
                }),
            });
            const data = await res.json();
            setBulkResult({ sent: data.sent, failed: data.failed, estimatedCostUsd: data.estimatedCostUsd });
            loadData(); // refresh records
        } catch (err) {
            console.error('[bulk-send]', err);
        } finally {
            setBulkLoading(false);
        }
    };

    const filteredRecords = records.filter(r => {
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchName = r.customerName.toLowerCase().includes(q);
            const matchEmail = r.customerEmail.toLowerCase().includes(q);
            const matchPhone = r.customerPhone.toLowerCase().includes(q);
            const matchCity = r.customerCity.toLowerCase().includes(q);
            if (!matchName && !matchEmail && !matchPhone && !matchCity) return false;
        }

        if (filterStatus) {
            if (filterStatus === 'critico' && r.status !== 'critico_10_dias' && r.status !== 'vencido') return false;
            if (filterStatus === 'alerta' && r.status !== 'alerta_temprana') return false;
            if (filterStatus === 'surtido' && r.status !== 'surtido') return false;
        }

        if (filterType && r.customerType !== filterType) return false;

        return true;
    });

    const totalClientes = records.length;
    const criticos10Dias = records.filter(r => r.status === 'critico_10_dias' || r.status === 'vencido').length;
    const alertasTempranas = records.filter(r => r.status === 'alerta_temprana').length;
    const clientesB2C = records.filter(r => r.customerType === 'b2c').length;
    const clientesB2B = records.filter(r => r.customerType === 'b2b').length;

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
                        <Clock className="text-red-600" size={28} />
                        Business Intelligence: Timers de Reabastecimiento Recurrente
                    </h1>
                    <p className="text-xs text-gray-500">
                        Automatización de ciclo de consumo y alertas 10 días antes para clientes B2C (Hogar) y B2B (Empresas).
                    </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <label
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 cursor-pointer"
                        title="Correo automático diario a las 9 a.m. a clientes en alerta o críticos (máx. 1 cada 7 días). Los botones de WhatsApp son independientes."
                    >
                        <input type="checkbox" checked={emailAuto} onChange={e => toggleEmailAuto(e.target.checked)} className="w-3.5 h-3.5 accent-blue-600" />
                        ✉ Correo automático (9 a.m.)
                    </label>
                    <button
                        onClick={() => { setShowBulkModal(true); handleBulkDryRun(); }}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                        <Megaphone size={14} />
                        📤 Campaña Masiva WhatsApp
                        {criticalCustomers.length > 0 && (
                            <span className="bg-white text-green-700 px-1.5 py-0.5 rounded-full text-[10px] font-black">
                                {criticalCustomers.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={loadData}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer"
                    >
                        <RefreshCw size={14} /> Actualizar
                    </button>
                </div>
            </div>

            {/* KPI Summary Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
                    <span className="text-[10px] font-extrabold uppercase text-gray-400">Total Monitoreados</span>
                    <div className="text-2xl font-black text-gray-900 mt-1">{totalClientes}</div>
                </div>

                <div className="bg-white rounded-2xl border border-red-200 bg-red-50/40 p-4 shadow-xs">
                    <span className="text-[10px] font-extrabold uppercase text-red-600">🔴 Críticos (≤ 10 Días)</span>
                    <div className="text-2xl font-black text-red-700 mt-1">{criticos10Dias}</div>
                </div>

                <div className="bg-white rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-xs">
                    <span className="text-[10px] font-extrabold uppercase text-amber-700">🟡 Alerta Temprana</span>
                    <div className="text-2xl font-black text-amber-800 mt-1">{alertasTempranas}</div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
                    <span className="text-[10px] font-extrabold uppercase text-gray-400">🛒 B2C Hogares</span>
                    <div className="text-2xl font-black text-slate-800 mt-1">{clientesB2C}</div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs">
                    <span className="text-[10px] font-extrabold uppercase text-gray-400">🏢 B2B Empresas</span>
                    <div className="text-2xl font-black text-teal-700 mt-1">{clientesB2B}</div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative col-span-1 sm:col-span-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por cliente, teléfono o ciudad..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-xs focus:border-red-600 focus:outline-none"
                    />
                </div>

                <div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold bg-white text-gray-800"
                    >
                        <option value="">Todos los Estados de Consumo</option>
                        <option value="critico">🔴 Críticos / Vencidos (≤ 10 días)</option>
                        <option value="alerta">🟡 Alerta Temprana (11-25 días)</option>
                        <option value="surtido">🟢 Surtidos Satisfechos (&gt; 25 días)</option>
                    </select>
                </div>

                <div>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold bg-white text-gray-800"
                    >
                        <option value="">Todos los Tipos de Cliente</option>
                        <option value="b2c">🛒 B2C Hogar (Consumidor)</option>
                        <option value="b2b">🏢 B2B Empresa (Corporativo / Institucional)</option>
                    </select>
                </div>
            </div>

            {/* Table of Customer Replenishments */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                <th className="p-4">Cliente & Tipo (Clic para alternar)</th>
                                <th className="p-4">Resumen Última Compra</th>
                                <th className="p-4 text-center">Ciclo de Consumo</th>
                                <th className="p-4 text-center">Próximo Reabastecimiento</th>
                                <th className="p-4 text-center">Estado / Timer BI</th>
                                <th className="p-4 text-right">Acción Recordatorio</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-400">Calculando timers de consumo BI...</td>
                                </tr>
                            ) : filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-400">No hay registros de reabastecimiento para el filtro seleccionado.</td>
                                </tr>
                            ) : (
                                filteredRecords.map((r) => {
                                    const dueDate = new Date(r.nextOrderDueDate);
                                    const now = Date.now();
                                    const daysLeft = Math.ceil((dueDate.getTime() - now) / (1000 * 60 * 60 * 24));

                                    let badgeBg = 'bg-green-100 text-green-800';
                                    let badgeText = `🟢 ${daysLeft} Días Restantes`;

                                    if (daysLeft < 0) {
                                        badgeBg = 'bg-red-100 text-red-800 font-black animate-pulse';
                                        badgeText = `🔴 VENCIDO (${Math.abs(daysLeft)} días sin reorden)`;
                                    } else if (daysLeft <= 10) {
                                        badgeBg = 'bg-red-100 text-red-700 font-extrabold';
                                        badgeText = `🔴 REABASTECER (Faltan ${daysLeft} días)`;
                                    } else if (daysLeft <= 25) {
                                        badgeBg = 'bg-amber-100 text-amber-800 font-bold';
                                        badgeText = `🟡 Alerta (${daysLeft} días restantes)`;
                                    }

                                    return (
                                        <tr key={r.id || r.customerPhone} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleToggleCustomerType(r)}
                                                        title="Clic para cambiar entre B2C Hogar y B2B Empresa"
                                                        className={`text-[10px] font-black px-2 py-0.5 rounded-md cursor-pointer transition-all hover:scale-105 ${r.customerType === 'b2b' ? 'bg-teal-100 hover:bg-teal-200 text-teal-800' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                                                    >
                                                        {r.customerType === 'b2b' ? '🏢 B2B Empresa ⇄' : '🛒 B2C Hogar ⇄'}
                                                    </button>
                                                </div>
                                                <div className="font-bold text-gray-900 mt-1">{r.customerName}</div>
                                                <div className="text-xs text-gray-500">📱 {r.customerPhone} · 📍 {r.customerCity}</div>
                                            </td>

                                            <td className="p-4 text-xs text-gray-700 max-w-xs">
                                                <div className="font-medium line-clamp-2">{r.itemsSummary}</div>
                                                <div className="text-[11px] text-gray-400 mt-0.5">Comprado: {new Date(r.lastOrderDate).toLocaleDateString('es-CO')}</div>
                                            </td>

                                            <td className="p-4 text-center font-bold text-xs text-gray-700">
                                                ~{r.estimatedCycleDays} Días
                                            </td>

                                            <td className="p-4 text-center font-mono font-bold text-xs text-gray-900">
                                                {dueDate.toLocaleDateString('es-CO')}
                                            </td>

                                            <td className="p-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-xs inline-block ${badgeBg}`}>
                                                    {badgeText}
                                                </span>
                                            </td>

                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => handleSendReminder(r)}
                                                    disabled={sendingId === r.id}
                                                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1 ml-auto shadow-xs cursor-pointer transition-colors"
                                                >
                                                    {sendingId === r.id ? (
                                                        <Loader2 size={13} className="animate-spin" />
                                                    ) : (
                                                        <MessageCircle size={14} />
                                                    )}
                                                    {sendingId === r.id ? 'Enviando...' : '📱 Recordatorio 1-Clic'}
                                                </button>
                                                {r.lastReminderSentAt && (
                                                    <span className="block text-[10px] text-gray-400 mt-1">
                                                        Enviado: {new Date(r.lastReminderSentAt).toLocaleDateString('es-CO')}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Bulk Campaign Modal ─────────────────────────────────────────── */}
            {showBulkModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <Megaphone size={18} className="text-green-600" />
                                <h2 className="font-black text-gray-900 text-sm">Campaña Masiva WhatsApp</h2>
                            </div>
                            <button onClick={() => { setShowBulkModal(false); setBulkDryRun(null); setBulkResult(null); }} className="p-1.5 text-gray-400 hover:text-gray-600">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                                <p className="font-bold mb-1">⚠️ Clientes críticos seleccionados:</p>
                                <p className="text-amber-700">
                                    {criticalCustomers.length} clientes con estado <strong>Vencido</strong> o <strong>Crítico (≤10 días)</strong> recibirán la plantilla aprobada <code className="bg-amber-100 px-1 rounded">reabastecimiento_recordatorio</code>.
                                </p>
                            </div>

                            {bulkLoading && (
                                <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-500">
                                    <Loader2 size={16} className="animate-spin" />
                                    {bulkDryRun ? 'Enviando...' : 'Calculando costo estimado...'}
                                </div>
                            )}

                            {bulkDryRun && !bulkResult && !bulkLoading && (
                                <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
                                    {bulkDryRun.template && !bulkDryRun.template.found && (
                                        <div className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
                                            ⚠️ La plantilla &quot;{bulkDryRun.template.name}&quot; no existe en la cuenta de WhatsApp Business de este número (+57 324 1005353). Créala en esa cuenta antes de enviar.
                                        </div>
                                    )}
                                    {bulkDryRun.template?.found && (
                                        <div className="text-[11px] text-green-800">✓ Plantilla encontrada: {bulkDryRun.template.languages.join(', ')}</div>
                                    )}
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Mensajes a enviar</span>
                                        <span className="font-black text-gray-900">{bulkDryRun.total}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Costo estimado (USD)</span>
                                        <span className="font-black text-green-700">${bulkDryRun.estimatedCostUsd.toFixed(4)} USD</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Costo en COP (~4.200)</span>
                                        <span className="font-bold text-gray-700">~${(bulkDryRun.estimatedCostUsd * 4200).toFixed(0)} COP</span>
                                    </div>
                                    <div className="flex justify-between text-[11px] text-gray-500 pt-1 border-t border-green-100">
                                        <span>Plantilla: Marketing · Colombia</span>
                                        <span>$0.0125 USD/msg</span>
                                    </div>
                                </div>
                            )}

                            {bulkResult && (
                                <div className={`rounded-xl p-4 space-y-1 text-sm ${bulkResult.failed === 0 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                                    <p className="font-black text-gray-900">
                                        {bulkResult.failed === 0 ? '✅ Campaña enviada exitosamente' : '⚠️ Campaña completada con errores'}
                                    </p>
                                    <div className="flex justify-between"><span>Enviados</span><span className="font-bold text-green-700">{bulkResult.sent}</span></div>
                                    <div className="flex justify-between"><span>Fallidos</span><span className="font-bold text-red-600">{bulkResult.failed}</span></div>
                                    <div className="flex justify-between"><span>Costo real</span><span className="font-bold">${bulkResult.estimatedCostUsd.toFixed(4)} USD</span></div>
                                </div>
                            )}

                            {!bulkResult && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setShowBulkModal(false); setBulkDryRun(null); }}
                                        className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-bold text-xs rounded-xl hover:bg-gray-50 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleBulkSend}
                                        disabled={!bulkDryRun || bulkLoading}
                                        className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
                                    >
                                        {bulkLoading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                                        Confirmar y Enviar
                                    </button>
                                </div>
                            )}
                            {bulkResult && (
                                <button
                                    onClick={() => { setShowBulkModal(false); setBulkDryRun(null); setBulkResult(null); }}
                                    className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors"
                                >
                                    Cerrar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
