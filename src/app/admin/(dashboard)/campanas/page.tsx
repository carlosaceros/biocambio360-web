'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Megaphone,
    Search,
    RefreshCw,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Users,
    ClipboardList,
    Send,
    History,
    X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { auth } from '@/lib/firebase';
import { getCustomersWithPagination } from '@/lib/customers-service';
import { Customer } from '@/types/customer';
import { CRM_STAGE_CONFIG, CRMStage } from '@/types/crm';
import { WHATSAPP_ACCOUNTS, WhatsAppAccountKey } from '@/types/inbox';

interface Template {
    id: string;
    name: string;
    status: string;
    language: string;
    category: string;
    components: Array<{ type: string; text?: string }>;
}

interface VariableMappingItem {
    index: number;
    source: 'nombre' | 'fixed';
    value: string;
}

interface CampaignLog {
    id: string;
    campaignName: string;
    templateName: string;
    total: number;
    sent: number;
    failed: number;
    estimatedCostUsd: number;
    accountKey?: string;
    createdAt?: { seconds?: number } | string;
}

const getBodyText = (t: Template) => t.components?.find(c => c.type === 'BODY')?.text ?? '';
const countVariables = (text: string) => new Set(text.match(/\{\{(\d+)\}\}/g) ?? []).size;

export default function CampanasPage() {
    const router = useRouter();
    const { role } = useAuth();
    const isSuperAdmin = role === 'superadmin';
    const isDirector = role === 'director';
    const canSend = isSuperAdmin || isDirector;

    // Línea de envío
    const [accountKey, setAccountKey] = useState<WhatsAppAccountKey>('biocambio360');

    // Plantillas
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [templateSearch, setTemplateSearch] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [variableMapping, setVariableMapping] = useState<VariableMappingItem[]>([]);

    // Audiencia
    const [audienceTab, setAudienceTab] = useState<'clientes' | 'manual'>('clientes');
    const [custSearch, setCustSearch] = useState('');
    const [custStage, setCustStage] = useState<'all' | CRMStage>('all');
    const [custActiveOnly, setCustActiveOnly] = useState(false);
    const [custResults, setCustResults] = useState<Customer[]>([]);
    const [custLoading, setCustLoading] = useState(false);
    const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
    const [manualText, setManualText] = useState('');

    // Campaña
    const [campaignName, setCampaignName] = useState('');
    const [dryRunResult, setDryRunResult] = useState<{ total: number; estimatedCostUsd: number; skipped: Array<{ phone: string; reason: string }>; template?: { found: boolean } } | null>(null);
    const [sendResult, setSendResult] = useState<{ sent: number; failed: number; estimatedCostUsd: number } | null>(null);
    const [isWorking, setIsWorking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Historial
    const [history, setHistory] = useState<CampaignLog[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    const fetchTemplates = useCallback(async () => {
        setLoadingTemplates(true);
        setSelectedTemplate(null);
        setVariableMapping([]);
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('No autenticado');
            const idToken = await user.getIdToken();
            const res = await fetch(`/api/inbox/templates?accountKey=${accountKey}`, {
                headers: { Authorization: `Bearer ${idToken}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Error cargando plantillas');
            setTemplates(data.templates ?? []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error cargando plantillas');
        } finally {
            setLoadingTemplates(false);
        }
    }, [accountKey]);

    useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

    const handleSelectTemplate = (t: Template) => {
        setSelectedTemplate(t);
        const count = countVariables(getBodyText(t));
        setVariableMapping(Array.from({ length: count }, (_, i) => ({ index: i + 1, source: 'nombre' as const, value: '' })));
        setDryRunResult(null);
        setSendResult(null);
    };

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(templateSearch.toLowerCase()) || getBodyText(t).toLowerCase().includes(templateSearch.toLowerCase())
    );

    const previewText = selectedTemplate
        ? getBodyText(selectedTemplate).replace(/\{\{(\d+)\}\}/g, (_, idx) => {
              const m = variableMapping.find(v => v.index === Number(idx));
              if (!m) return `[${idx}]`;
              return m.source === 'nombre' ? '*(nombre del cliente)*' : m.value ? `*${m.value}*` : `[texto fijo ${idx}]`;
          })
        : '';

    // ── Audiencia: clientes por filtro ──────────────────────────────────────
    const runCustomerSearch = useCallback(async () => {
        setCustLoading(true);
        try {
            const res = await getCustomersWithPagination({
                search: custSearch || undefined,
                stage: custStage !== 'all' ? custStage : undefined,
                activeOnly: custActiveOnly,
                limit: 200,
            });
            setCustResults(res.customers);
            setExcludedIds(new Set());
        } catch {
            setCustResults([]);
        } finally {
            setCustLoading(false);
        }
    }, [custSearch, custStage, custActiveOnly]);

    useEffect(() => { if (audienceTab === 'clientes') runCustomerSearch(); }, [audienceTab, runCustomerSearch]);

    const manualRecipients = useMemo(() => {
        return manualText
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean)
            .map(line => {
                const parts = line.split(',').map(p => p.trim());
                if (parts.length >= 2) return { nombre: parts[0], phone: parts[1] };
                return { nombre: '', phone: parts[0] };
            })
            .filter(r => r.phone.replace(/\D/g, '').length >= 10);
    }, [manualText]);

    const recipients = useMemo(() => {
        if (audienceTab === 'manual') return manualRecipients;
        return custResults
            .filter(c => !excludedIds.has(c.id))
            .map(c => ({ nombre: c.nombre, phone: c.celular }));
    }, [audienceTab, manualRecipients, custResults, excludedIds]);

    const toggleExcluded = (id: string) => {
        setExcludedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    // ── Dry run / envío ──────────────────────────────────────────────────────
    const callSendApi = async (dryRun: boolean) => {
        const user = auth.currentUser;
        if (!user || !selectedTemplate) throw new Error('Falta autenticación o plantilla');
        const idToken = await user.getIdToken();
        const res = await fetch('/api/campanas/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({
                accountKey,
                templateName: selectedTemplate.name,
                templateLanguage: selectedTemplate.language,
                templateCategory: selectedTemplate.category,
                recipients,
                variableMapping,
                campaignName: campaignName || selectedTemplate.name,
                dryRun,
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Error en la campaña');
        return data;
    };

    const handleDryRun = async () => {
        setError(null);
        setSendResult(null);
        setIsWorking(true);
        try {
            const data = await callSendApi(true);
            setDryRunResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error calculando el costo');
        } finally {
            setIsWorking(false);
        }
    };

    const handleSend = async () => {
        if (!dryRunResult) return;
        const costCop = (dryRunResult.estimatedCostUsd * 4200).toFixed(0);
        if (!confirm(`¿Confirmas el envío de esta campaña a ${dryRunResult.total} clientes?\n\nCosto estimado: $${dryRunResult.estimatedCostUsd.toFixed(2)} USD (~$${costCop} COP)\n\nEsta acción no se puede deshacer.`)) return;

        setError(null);
        setIsWorking(true);
        try {
            const data = await callSendApi(false);
            setSendResult(data);
            setDryRunResult(null);
            loadHistory();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error enviando la campaña');
        } finally {
            setIsWorking(false);
        }
    };

    const loadHistory = useCallback(async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;
            const idToken = await user.getIdToken();
            const res = await fetch('/api/campanas/send', { headers: { Authorization: `Bearer ${idToken}` } });
            const data = await res.json();
            if (res.ok) setHistory(data.logs ?? []);
        } catch {
            // silencioso: el historial es informativo, no bloquea el flujo principal
        }
    }, []);

    useEffect(() => { if (showHistory) loadHistory(); }, [showHistory, loadHistory]);

    if (!canSend) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-md p-8 max-w-sm text-center space-y-3">
                    <AlertCircle className="mx-auto text-amber-500" size={32} />
                    <p className="font-black text-gray-900">Acceso restringido</p>
                    <p className="text-sm text-gray-500">
                        Los envíos masivos por WhatsApp cuestan dinero y llegan a muchos clientes reales — solo
                        directores y superadministradores pueden enviarlos.
                    </p>
                    <button onClick={() => router.push('/admin')} className="mt-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold">
                        Volver al panel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-16">
            <header className="bg-white border-b border-gray-100 shadow-xs px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
                <button onClick={() => router.push('/admin')} className="text-gray-500 hover:text-gray-800">
                    <ArrowLeft size={18} />
                </button>
                <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
                    <Megaphone size={14} className="text-white" />
                </div>
                <div>
                    <h1 className="font-black text-gray-900 text-sm leading-tight">Campañas de WhatsApp</h1>
                    <p className="text-[10px] text-gray-400">Difusiones masivas con plantillas, integradas a la bandeja</p>
                </div>
                <button
                    onClick={() => setShowHistory(v => !v)}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-xl text-gray-600 hover:text-gray-900"
                >
                    <History size={13} />
                    Historial
                </button>
            </header>

            <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
                {/* Paso 1: línea de envío */}
                <section className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-5">
                    <p className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider mb-2">1. Línea de envío</p>
                    <div className="flex gap-2">
                        {(Object.keys(WHATSAPP_ACCOUNTS) as WhatsAppAccountKey[]).map(key => (
                            <button
                                key={key}
                                onClick={() => setAccountKey(key)}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                                    accountKey === key ? 'bg-emerald-600 text-white border-emerald-600' : 'text-gray-600 border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                {WHATSAPP_ACCOUNTS[key].label} <span className="opacity-70">({WHATSAPP_ACCOUNTS[key].phoneNumber})</span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Paso 2: plantilla */}
                <section className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">2. Plantilla aprobada</p>
                        <button onClick={fetchTemplates} className="text-gray-400 hover:text-gray-700">
                            <RefreshCw size={13} className={loadingTemplates ? 'animate-spin' : ''} />
                        </button>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <div className="relative mb-2">
                                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    value={templateSearch}
                                    onChange={e => setTemplateSearch(e.target.value)}
                                    placeholder="Buscar plantilla..."
                                    className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400"
                                />
                            </div>
                            <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
                                {loadingTemplates ? (
                                    <div className="py-8 flex justify-center"><Loader2 size={18} className="animate-spin text-gray-400" /></div>
                                ) : filteredTemplates.length === 0 ? (
                                    <p className="text-xs text-gray-400 text-center py-8">Sin plantillas aprobadas para esta línea</p>
                                ) : filteredTemplates.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => handleSelectTemplate(t)}
                                        className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 ${selectedTemplate?.id === t.id ? 'bg-emerald-50' : ''}`}
                                    >
                                        <p className="text-xs font-bold text-gray-800">{t.name}</p>
                                        <p className="text-[10px] text-gray-400 line-clamp-1">{getBodyText(t)}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            {selectedTemplate ? (
                                <div className="space-y-3">
                                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs whitespace-pre-wrap">{previewText}</div>
                                    {variableMapping.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-extrabold uppercase text-gray-400">Variables</p>
                                            {variableMapping.map((v, i) => (
                                                <div key={v.index} className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-gray-500 w-8 shrink-0">{`{{${v.index}}}`}</span>
                                                    <select
                                                        value={v.source}
                                                        onChange={e => setVariableMapping(prev => prev.map((m, mi) => mi === i ? { ...m, source: e.target.value as 'nombre' | 'fixed' } : m))}
                                                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5"
                                                    >
                                                        <option value="nombre">Nombre del cliente</option>
                                                        <option value="fixed">Texto fijo</option>
                                                    </select>
                                                    {v.source === 'fixed' && (
                                                        <input
                                                            value={v.value}
                                                            onChange={e => setVariableMapping(prev => prev.map((m, mi) => mi === i ? { ...m, value: e.target.value } : m))}
                                                            placeholder="Valor..."
                                                            className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5"
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-center py-8">
                                    <p className="text-xs text-gray-400">Selecciona una plantilla para previsualizar</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Paso 3: audiencia */}
                <section className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-5">
                    <p className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider mb-2">3. Audiencia</p>
                    <div className="flex gap-2 mb-3">
                        <button onClick={() => setAudienceTab('clientes')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${audienceTab === 'clientes' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            <Users size={12} className="inline mr-1" /> Clientes por filtro
                        </button>
                        <button onClick={() => setAudienceTab('manual')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${audienceTab === 'manual' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            <ClipboardList size={12} className="inline mr-1" /> Lista manual
                        </button>
                    </div>

                    {audienceTab === 'clientes' ? (
                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                                <input
                                    value={custSearch}
                                    onChange={e => setCustSearch(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && runCustomerSearch()}
                                    placeholder="Buscar por nombre, celular, ciudad..."
                                    className="flex-1 min-w-[180px] text-xs border border-gray-200 rounded-xl px-3 py-2"
                                />
                                <select value={custStage} onChange={e => setCustStage(e.target.value as 'all' | CRMStage)} className="text-xs border border-gray-200 rounded-xl px-2 py-2">
                                    <option value="all">Todas las etapas</option>
                                    {Object.entries(CRM_STAGE_CONFIG).map(([key, cfg]) => (
                                        <option key={key} value={key}>{cfg.emoji} {cfg.label}</option>
                                    ))}
                                </select>
                                <label className="flex items-center gap-1.5 text-xs text-gray-600 px-2">
                                    <input type="checkbox" checked={custActiveOnly} onChange={e => setCustActiveOnly(e.target.checked)} />
                                    Solo activos
                                </label>
                                <button onClick={runCustomerSearch} className="px-3 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5">
                                    {custLoading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                                    Buscar
                                </button>
                            </div>
                            <p className="text-[11px] text-gray-500">
                                {custResults.length} clientes encontrados · {custResults.length - excludedIds.size} seleccionados para el envío
                                <span className="text-gray-400"> (los datos vienen del índice de Clientes; se recalcula periódicamente)</span>
                            </p>
                            <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
                                {custResults.map(c => (
                                    <label key={c.id} className="flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-gray-50 cursor-pointer">
                                        <input type="checkbox" checked={!excludedIds.has(c.id)} onChange={() => toggleExcluded(c.id)} />
                                        <span className="font-bold text-gray-800 flex-1 truncate">{c.nombre}</span>
                                        <span className="font-mono text-gray-400">{c.celular}</span>
                                        <span className="text-gray-400">{c.ciudad}</span>
                                    </label>
                                ))}
                                {custResults.length === 0 && !custLoading && (
                                    <p className="text-xs text-gray-400 text-center py-6">Sin resultados para este filtro</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <textarea
                                value={manualText}
                                onChange={e => setManualText(e.target.value)}
                                placeholder={'Un cliente por línea:\nAna Morales, 3232230601\n3111234567 (sin nombre también funciona)'}
                                rows={6}
                                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 font-mono"
                            />
                            <p className="text-[11px] text-gray-500">{manualRecipients.length} números válidos detectados</p>
                        </div>
                    )}
                </section>

                {/* Paso 4: confirmar y enviar */}
                <section className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-5 space-y-3">
                    <p className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">4. Enviar</p>
                    <input
                        value={campaignName}
                        onChange={e => setCampaignName(e.target.value)}
                        placeholder="Nombre de la campaña (para el historial)"
                        className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2"
                    />

                    {error && (
                        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-xl p-2.5">
                            <AlertCircle size={13} /> {error}
                        </div>
                    )}

                    {dryRunResult && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs space-y-1">
                            <p className="font-bold text-emerald-900">
                                {dryRunResult.total} destinatarios · costo estimado ${dryRunResult.estimatedCostUsd.toFixed(2)} USD (~${(dryRunResult.estimatedCostUsd * 4200).toFixed(0)} COP)
                            </p>
                            {dryRunResult.skipped.length > 0 && (
                                <p className="text-amber-700">{dryRunResult.skipped.length} excluidos (número inválido u optaron por no recibir promociones)</p>
                            )}
                            {dryRunResult.template && !dryRunResult.template.found && (
                                <p className="text-red-600 font-bold">⚠️ La plantilla no aparece aprobada en esta línea — revisa antes de enviar.</p>
                            )}
                        </div>
                    )}

                    {sendResult && (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-indigo-600" />
                            <span className="font-bold text-indigo-900">
                                Campaña enviada: {sendResult.sent} exitosos, {sendResult.failed} fallidos · ${sendResult.estimatedCostUsd.toFixed(2)} USD reales
                            </span>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={handleDryRun}
                            disabled={!selectedTemplate || recipients.length === 0 || isWorking}
                            className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-bold disabled:opacity-40"
                        >
                            {isWorking && !dryRunResult ? 'Calculando...' : `Calcular costo (${recipients.length} destinatarios)`}
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={!dryRunResult || isWorking}
                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                            {isWorking && dryRunResult ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            Enviar campaña
                        </button>
                    </div>
                </section>
            </div>

            {showHistory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowHistory(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                            <h2 className="font-black text-sm text-gray-900">Historial de campañas</h2>
                            <button onClick={() => setShowHistory(false)}><X size={16} className="text-gray-400" /></button>
                        </div>
                        <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
                            {history.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-10">Sin campañas enviadas todavía</p>
                            ) : history.map(h => (
                                <div key={h.id} className="px-5 py-3 text-xs">
                                    <p className="font-bold text-gray-800">{h.campaignName}</p>
                                    <p className="text-gray-500">{h.templateName} · {h.sent} enviados / {h.failed} fallidos de {h.total} · ${h.estimatedCostUsd?.toFixed(2)} USD</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
