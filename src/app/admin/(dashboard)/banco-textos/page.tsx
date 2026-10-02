'use client';

import { useState, useMemo } from 'react';
import {
    Search,
    Copy,
    Check,
    MessageCircle,
    FileText,
    Sparkles,
    ShoppingBag,
    Truck,
    CreditCard,
    Shield,
    Users,
    Clock,
    RefreshCw,
    Zap,
    Send,
    ArrowLeft,
    Plus,
    Pencil,
    Trash2,
    RotateCcw,
    X,
    EyeOff
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
    RAW_SALES_SCRIPTS_CATALOG,
    SALES_SCRIPT_CATEGORIES,
    compileSalesScript,
    getLiveCatalogPrices,
    formatScriptCurrency,
    SalesScriptTemplate,
    ScriptVariables
} from '@/lib/sales-scripts-catalog-service';
import { useAuth } from '@/lib/auth-context';
import { useApiResource } from '@/hooks/useApiResource';
import { Button } from '@/components/ui';

const CATEGORY_TABS: { id: string; label: string; icon: LucideIcon }[] = [
    { id: 'all', label: 'Todos los Guiones', icon: FileText },
    { id: 'alertas_entrega', label: '🔔 Alertas Entrega', icon: Clock },
    { id: 'alertas_recompra', label: '🔄 Alertas Recompra', icon: RefreshCw },
    { id: 'productos_precios', label: '🧴 Fichas & Precios', icon: ShoppingBag },
    { id: 'combos_promociones', label: '🎁 Súper Combos', icon: Zap },
    { id: 'fletes_cobertura', label: '🚚 Fletes & Fábrica', icon: Truck },
    { id: 'pagos_cuentas', label: '💳 Cuentas & Pagos', icon: CreditCard },
    { id: 'objeciones_confianza', label: '🛡️ Objeciones', icon: Shield },
    { id: 'programa_referidos', label: '👥 Referidos', icon: Users },
    { id: 'toma_pedido', label: '📋 Toma de Datos', icon: MessageCircle }
];

const EMPTY_FORM = {
    titulo: '', categoria: SALES_SCRIPT_CATEGORIES[0].id, etiquetas: '', descripcion: '', template: '', referenciaWord: '', destacado: false,
};

export default function BancoTextosPage() {
    const router = useRouter();
    const { user, userProfile } = useAuth();

    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null);
    const [showHidden, setShowHidden] = useState(false);

    // Variables interactivas en caliente
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [advisorName, setAdvisorName] = useState(userProfile?.asesorAsignado || userProfile?.nombre || 'Asesor Comercial');
    const [customTotal, setCustomTotal] = useState<string>('');
    const [deliveryAddress, setDeliveryAddress] = useState<string>('');
    const [deliveryDate, setDeliveryDate] = useState<string>('MAÑANA');

    // Precios dinámicos de la tienda virtual
    const livePrices = useMemo(() => getLiveCatalogPrices(), []);

    // Catálogo en vivo (base en código + overrides/custom de Firestore). Mientras carga se muestra
    // el catálogo base compilado en el bundle, para que la pantalla no arranque vacía.
    const { data, error, refetch } = useApiResource<{ scripts: SalesScriptTemplate[] }>('/api/admin/sales-scripts');
    const allScripts = data?.scripts ?? RAW_SALES_SCRIPTS_CATALOG;

    const [formOpen, setFormOpen] = useState(false);
    const [editingScript, setEditingScript] = useState<SalesScriptTemplate | null>(null);

    const scriptVars: ScriptVariables = useMemo(() => ({
        cliente: clientName || undefined,
        asesor: advisorName || undefined,
        total: customTotal ? parseInt(customTotal.replace(/\D/g, ''), 10) || customTotal : livePrices.detergente20L,
        direccion: deliveryAddress || undefined,
        fechaEntrega: deliveryDate || 'MAÑANA',
        codigoReferido: clientPhone ? clientPhone.slice(-6) : undefined
    }), [clientName, advisorName, customTotal, deliveryAddress, deliveryDate, clientPhone, livePrices]);

    const filteredScripts = useMemo(() => {
        return allScripts.filter(script => {
            if (!showHidden && script.hidden) return false;
            if (showHidden && !script.hidden) return false;
            if (selectedCategory !== 'all' && script.categoria !== selectedCategory) {
                return false;
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return (
                    script.titulo.toLowerCase().includes(q) ||
                    script.descripcion.toLowerCase().includes(q) ||
                    (script.referenciaWord || '').toLowerCase().includes(q) ||
                    script.etiquetas.some(t => t.toLowerCase().includes(q)) ||
                    script.template.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [allScripts, selectedCategory, searchQuery, showHidden]);

    const handleCopy = async (script: SalesScriptTemplate) => {
        const text = compileSalesScript(script, scriptVars);
        try {
            await navigator.clipboard.writeText(text);
            setCopiedScriptId(script.id);
            setTimeout(() => setCopiedScriptId(null), 2500);
        } catch (err) {
            console.error('Error al copiar:', err);
        }
    };

    const handleOpenWhatsApp = (script: SalesScriptTemplate) => {
        const text = compileSalesScript(script, scriptVars);
        const cleanPhone = clientPhone.replace(/\D/g, '');
        const phoneParam = cleanPhone ? (cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`) : '';
        const url = `https://wa.me/${phoneParam}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    const openCreate = () => { setEditingScript(null); setFormOpen(true); };
    const openEdit = (script: SalesScriptTemplate) => { setEditingScript(script); setFormOpen(true); };

    const handleDelete = async (script: SalesScriptTemplate) => {
        if (!confirm(`¿${script.isCustom ? 'Eliminar' : 'Ocultar'} el guion "${script.titulo}"?`)) return;
        try {
            const idToken = await user!.getIdToken();
            const res = await fetch(`/api/admin/sales-scripts/${script.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${idToken}` },
            });
            if (!res.ok) throw new Error((await res.json()).error || 'No se pudo eliminar');
            refetch();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'No se pudo eliminar el guion.');
        }
    };

    const handleRestore = async (script: SalesScriptTemplate) => {
        try {
            const idToken = await user!.getIdToken();
            const res = await fetch(`/api/admin/sales-scripts/${script.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ hidden: false }),
            });
            if (!res.ok) throw new Error((await res.json()).error || 'No se pudo restaurar');
            refetch();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'No se pudo restaurar el guion.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-100/70">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg border-b border-indigo-900/40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Link
                                    href="/admin"
                                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                                    title="Volver al panel"
                                >
                                    <ArrowLeft size={18} />
                                </Link>
                                <span className="px-3 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 uppercase tracking-wide flex items-center gap-1">
                                    <Sparkles size={11} /> BASE OFICIAL WORD 2025
                                </span>
                                <span className="px-3 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    ⚡ Precios Dinámicos de Tienda (Sin IA)
                                </span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                                Banco de Textos Respuesta & Guiones Comerciales
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
                                Herramienta operativa para Kommo CRM y WhatsApp. Textos oficiales de Biocambio360 optimizados con flete nacional subsidiado de fábrica y copiado en 1 clic.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button size="sm" icon={<Plus size={14} />} onClick={openCreate}>Nuevo Guion</Button>
                            <button
                                onClick={() => router.push('/admin/asesores')}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition-all cursor-pointer"
                            >
                                Cockpit Asesores
                            </button>
                            <button
                                onClick={() => router.push('/admin/clientes')}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
                            >
                                Base de Clientes (31k)
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Barra de Variables Dinámicas */}
            <div className="bg-white border-b border-slate-200 shadow-2xs">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
                    <div className="text-[11px] font-black text-indigo-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Zap size={14} className="text-indigo-600" />
                        Inyección de Variables en Vivo (Afecta a todos los guiones en tiempo real)
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Nombre Cliente</label>
                            <input
                                type="text"
                                placeholder="Ej: Doña Carmen"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:bg-white"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">WhatsApp / Celular</label>
                            <input
                                type="text"
                                placeholder="300 123 4567"
                                value={clientPhone}
                                onChange={(e) => setClientPhone(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:bg-white"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Asesor</label>
                            <input
                                type="text"
                                placeholder="Nombre asesor"
                                value={advisorName}
                                onChange={(e) => setAdvisorName(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:bg-white"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Monto Total</label>
                            <input
                                type="text"
                                placeholder={`Ej: ${formatScriptCurrency(livePrices.detergente20L)}`}
                                value={customTotal}
                                onChange={(e) => setCustomTotal(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:bg-white"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Fecha Entrega</label>
                            <input
                                type="text"
                                placeholder="MAÑANA / Jueves"
                                value={deliveryDate}
                                onChange={(e) => setDeliveryDate(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:bg-white"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Dirección / Barrio</label>
                            <input
                                type="text"
                                placeholder="Cra 7 # 45-10"
                                value={deliveryAddress}
                                onChange={(e) => setDeliveryAddress(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:bg-white"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenido Principal */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                {/* Barra de Búsqueda y Pestañas de Categoría */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-md">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por palabra clave, producto, cuenta bancaria, flete..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowHidden(v => !v)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                                    showHidden ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <EyeOff size={13} /> {showHidden ? 'Viendo ocultos' : 'Ver ocultos'}
                            </button>
                            {/* Indicadores de Precios de Tienda */}
                            <div className="flex items-center gap-2 overflow-x-auto text-[11px] font-bold text-slate-600">
                                <span className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                                    Detergente 20L: <strong className="text-indigo-700">{formatScriptCurrency(livePrices.detergente20L)}</strong>
                                </span>
                                <span className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                                    Combo Dúo: <strong className="text-indigo-700">{formatScriptCurrency(livePrices.comboDuo)}</strong>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Categorías */}
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-2 border-t border-slate-100">
                        {CATEGORY_TABS.map(tab => {
                            const Icon = tab.icon;
                            const isSelected = selectedCategory === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setSelectedCategory(tab.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                                        isSelected
                                            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                                            : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 hover:text-slate-900'
                                    }`}
                                >
                                    <Icon size={13} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {error && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl px-4 py-2.5">
                        No se pudo cargar el catálogo en vivo ({error}) — mostrando la base oficial del código.
                    </div>
                )}

                {/* Grid de Guiones */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {filteredScripts.map(script => {
                        const compiledText = compileSalesScript(script, scriptVars);
                        const isCopied = copiedScriptId === script.id;

                        return (
                            <div
                                key={script.id}
                                className={`bg-white rounded-2xl border p-5 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all ${
                                    script.hidden ? 'opacity-60 border-slate-200' : script.destacado ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200'
                                }`}
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div>
                                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                                    {script.categoria.replace('_', ' ')}
                                                </span>
                                                {script.referenciaWord && (
                                                    <span className="text-[10px] font-semibold text-slate-400">
                                                        📄 Word: {script.referenciaWord}
                                                    </span>
                                                )}
                                                {script.destacado && (
                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                                        ⭐ Prioritario
                                                    </span>
                                                )}
                                                {script.isCustom && (
                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                                        Nuevo
                                                    </span>
                                                )}
                                                {script.hidden && (
                                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                                                        Oculto
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-base font-black text-slate-900 leading-snug">
                                                {script.titulo}
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => openEdit(script)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                                                title="Editar guion"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            {script.hidden ? (
                                                <button
                                                    onClick={() => handleRestore(script)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                                                    title="Restaurar guion"
                                                >
                                                    <RotateCcw size={14} />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleDelete(script)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                                    title={script.isCustom ? 'Eliminar guion' : 'Ocultar guion'}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                                        {script.descripcion}
                                    </p>

                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-800 font-sans whitespace-pre-line leading-relaxed select-all max-h-60 overflow-y-auto mb-4">
                                        {compiledText}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                                    <span className="text-[11px] text-slate-400 font-medium">
                                        {compiledText.length} caracteres
                                    </span>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleOpenWhatsApp(script)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 transition-colors cursor-pointer"
                                            title="Abrir WhatsApp con este texto precargado"
                                        >
                                            <Send size={13} className="text-emerald-600" />
                                            WhatsApp
                                        </button>

                                        <button
                                            onClick={() => handleCopy(script)}
                                            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs ${
                                                isCopied
                                                    ? 'bg-emerald-600 text-white shadow-emerald-200'
                                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                                            }`}
                                        >
                                            {isCopied ? (
                                                <>
                                                    <Check size={14} />
                                                    ¡Copiado!
                                                </>
                                            ) : (
                                                <>
                                                    <Copy size={14} />
                                                    Copiar Texto
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {formOpen && (
                <ScriptFormModal
                    initial={editingScript}
                    getIdToken={() => user!.getIdToken()}
                    onClose={() => setFormOpen(false)}
                    onSaved={() => { setFormOpen(false); refetch(); }}
                />
            )}
        </div>
    );
}

function ScriptFormModal({
    initial, getIdToken, onClose, onSaved,
}: {
    initial: SalesScriptTemplate | null;
    getIdToken: () => Promise<string>;
    onClose: () => void;
    onSaved: () => void;
}) {
    const isEditing = !!initial;
    const [form, setForm] = useState(
        initial
            ? {
                titulo: initial.titulo,
                categoria: initial.categoria,
                etiquetas: initial.etiquetas.join(', '),
                descripcion: initial.descripcion,
                template: initial.template,
                referenciaWord: initial.referenciaWord || '',
                destacado: !!initial.destacado,
            }
            : EMPTY_FORM
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        setError(null);
        setSaving(true);
        try {
            const idToken = await getIdToken();
            const payload = {
                titulo: form.titulo,
                categoria: form.categoria,
                etiquetas: form.etiquetas.split(',').map(t => t.trim()).filter(Boolean),
                descripcion: form.descripcion,
                template: form.template,
                referenciaWord: form.referenciaWord || undefined,
                destacado: form.destacado,
            };
            const res = await fetch(
                isEditing ? `/api/admin/sales-scripts/${initial!.id}` : '/api/admin/sales-scripts',
                {
                    method: isEditing ? 'PATCH' : 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                    body: JSON.stringify(payload),
                }
            );
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'No se pudo guardar el guion.');
            onSaved();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo guardar el guion.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 sticky top-0 bg-white">
                    <h2 className="font-black text-slate-900 text-sm">{isEditing ? 'Editar guion' : 'Nuevo guion'}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
                </div>

                <div className="p-5 space-y-4">
                    <div>
                        <label className="text-[11px] font-bold text-slate-500">Título</label>
                        <input
                            value={form.titulo}
                            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                            className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg"
                        />
                    </div>

                    <div>
                        <label className="text-[11px] font-bold text-slate-500">Categoría</label>
                        <select
                            value={form.categoria}
                            onChange={(e) => setForm({ ...form, categoria: e.target.value as SalesScriptTemplate['categoria'] })}
                            className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg"
                        >
                            {SALES_SCRIPT_CATEGORIES.map((c) => (
                                <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-[11px] font-bold text-slate-500">Descripción corta</label>
                        <input
                            value={form.descripcion}
                            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                            className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg"
                        />
                    </div>

                    <div>
                        <label className="text-[11px] font-bold text-slate-500">
                            Texto del guion — variables disponibles: {'{cliente} {asesor} {producto} {direccion} {total} {fecha_entrega} {guia_seguimiento} {enlace_referido} {precio_detergente_20l}'}...
                        </label>
                        <textarea
                            value={form.template}
                            rows={8}
                            onChange={(e) => setForm({ ...form, template: e.target.value })}
                            className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[11px] font-bold text-slate-500">Etiquetas (separadas por coma)</label>
                            <input
                                value={form.etiquetas}
                                onChange={(e) => setForm({ ...form, etiquetas: e.target.value })}
                                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-slate-500">Referencia Word (opcional)</label>
                            <input
                                value={form.referenciaWord}
                                onChange={(e) => setForm({ ...form, referenciaWord: e.target.value })}
                                className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg"
                            />
                        </div>
                    </div>

                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.destacado}
                            onChange={(e) => setForm({ ...form, destacado: e.target.checked })}
                        />
                        Marcar como prioritario (⭐)
                    </label>

                    {error && (
                        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                    )}
                </div>

                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 sticky bottom-0 bg-white">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSubmit} loading={saving} disabled={!form.titulo || !form.template}>
                        {isEditing ? 'Guardar cambios' : 'Crear guion'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
