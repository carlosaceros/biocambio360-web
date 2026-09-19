'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Copy,
    Check,
    X,
    MessageCircle,
    FileText,
    Sparkles,
    Tag,
    ShoppingBag,
    Truck,
    CreditCard,
    Shield,
    Users,
    Clock,
    RefreshCw,
    ExternalLink,
    Zap,
    Send
} from 'lucide-react';
import {
    RAW_SALES_SCRIPTS_CATALOG,
    compileSalesScript,
    getLiveCatalogPrices,
    formatScriptCurrency,
    SalesScriptTemplate,
    ScriptVariables
} from '@/lib/sales-scripts-catalog-service';

interface SalesScriptsBankModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialClientName?: string;
    initialClientPhone?: string;
    initialAdvisorName?: string;
    clientName?: string;
    clientPhone?: string;
    advisorName?: string;
}

const CATEGORY_TABS: { id: string; label: string; icon: any }[] = [
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

export default function SalesScriptsBankModal({
    isOpen,
    onClose,
    initialClientName = '',
    initialClientPhone = '',
    initialAdvisorName = 'Asesor Comercial',
    clientName: propClientName,
    clientPhone: propClientPhone,
    advisorName: propAdvisorName
}: SalesScriptsBankModalProps) {
    const effectiveClientName = propClientName || initialClientName || '';
    const effectiveClientPhone = propClientPhone || initialClientPhone || '';
    const effectiveAdvisorName = propAdvisorName || initialAdvisorName || 'Asesor Comercial';

    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null);

    // Variables interactivas en caliente
    const [clientName, setClientName] = useState(effectiveClientName);
    const [clientPhone, setClientPhone] = useState(effectiveClientPhone);
    const [advisorName, setAdvisorName] = useState(effectiveAdvisorName);
    const [customTotal, setCustomTotal] = useState<string>('');
    const [deliveryAddress, setDeliveryAddress] = useState<string>('');
    const [deliveryDate, setDeliveryDate] = useState<string>('MAÑANA');

    // Precios dinámicos sincronizados de la tienda (Sin IA)
    const livePrices = useMemo(() => getLiveCatalogPrices(), []);

    // Preparar objeto de variables
    const scriptVars: ScriptVariables = useMemo(() => ({
        cliente: clientName || undefined,
        asesor: advisorName || undefined,
        total: customTotal ? parseInt(customTotal.replace(/\D/g, ''), 10) || customTotal : livePrices.detergente20L,
        direccion: deliveryAddress || undefined,
        fechaEntrega: deliveryDate || 'MAÑANA',
        codigoReferido: clientPhone ? clientPhone.slice(-6) : undefined
    }), [clientName, advisorName, customTotal, deliveryAddress, deliveryDate, clientPhone, livePrices]);

    // Filtrar guiones
    const filteredScripts = useMemo(() => {
        return RAW_SALES_SCRIPTS_CATALOG.filter(script => {
            if (selectedCategory !== 'all' && script.categoria !== selectedCategory) {
                return false;
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const inTitle = script.titulo.toLowerCase().includes(q);
                const inDesc = script.descripcion.toLowerCase().includes(q);
                const inRef = (script.referenciaWord || '').toLowerCase().includes(q);
                const inTags = script.etiquetas.some(t => t.toLowerCase().includes(q));
                const inText = script.template.toLowerCase().includes(q);
                return inTitle || inDesc || inRef || inTags || inText;
            }
            return true;
        });
    }, [selectedCategory, searchQuery]);

    // Manejar copiado
    const handleCopy = async (script: SalesScriptTemplate) => {
        const textToCopy = compileSalesScript(script, scriptVars);
        try {
            await navigator.clipboard.writeText(textToCopy);
            setCopiedScriptId(script.id);
            setTimeout(() => setCopiedScriptId(null), 2500);
        } catch (err) {
            console.error('Error al copiar:', err);
        }
    };

    // Abrir en WhatsApp directo
    const handleOpenWhatsApp = (script: SalesScriptTemplate) => {
        const text = compileSalesScript(script, scriptVars);
        const cleanPhoneDigits = clientPhone.replace(/\D/g, '');
        const phoneParam = cleanPhoneDigits ? (cleanPhoneDigits.startsWith('57') ? cleanPhoneDigits : `57${cleanPhoneDigits}`) : '';
        const url = `https://wa.me/${phoneParam}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden my-auto"
            >
                {/* ─── HEADER DEL BANCO DE TEXTOS ─────────────────────────── */}
                <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-900/50">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 uppercase tracking-wide flex items-center gap-1">
                                <Sparkles size={11} /> BASE OFICIAL WORD 2025
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                ⚡ Precios Sincronizados de Tienda (Sin IA)
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2">
                            💬 Banco de Textos Respuesta & Guiones Comerciales
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-300">
                            Protocolo de respuestas rápidas para WhatsApp y Kommo CRM con flete subsidiado de fábrica y copiado en 1 clic.
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="self-end md:self-center p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
                        title="Cerrar ventana"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* ─── BARRA DE VARIABLES DINÁMICAS (EN VIVO) ──────────────── */}
                <div className="bg-indigo-50/70 border-b border-indigo-100 p-4 sm:px-6">
                    <div className="text-[11px] font-black text-indigo-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Zap size={14} className="text-indigo-600" />
                        Variables Rápidas del Cliente (Se inyectan automáticamente en todos los textos)
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                        <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Nombre Cliente</label>
                            <input
                                type="text"
                                placeholder="Ej: Doña Carmen"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">WhatsApp / Teléfono</label>
                            <input
                                type="text"
                                placeholder="300 123 4567"
                                value={clientPhone}
                                onChange={(e) => setClientPhone(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Asesor</label>
                            <input
                                type="text"
                                placeholder="Nombre asesor"
                                value={advisorName}
                                onChange={(e) => setAdvisorName(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Monto Total Pedido</label>
                            <input
                                type="text"
                                placeholder={`Ej: ${formatScriptCurrency(livePrices.detergente20L)}`}
                                value={customTotal}
                                onChange={(e) => setCustomTotal(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Día de Entrega</label>
                            <input
                                type="text"
                                placeholder="MAÑANA / Martes"
                                value={deliveryDate}
                                onChange={(e) => setDeliveryDate(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Dirección / Barrio</label>
                            <input
                                type="text"
                                placeholder="Cra 7 # 45-10"
                                value={deliveryAddress}
                                onChange={(e) => setDeliveryAddress(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* ─── FILTROS Y CATEGORÍAS ─────────────────────────────────── */}
                <div className="p-4 sm:px-6 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Buscador */}
                    <div className="relative flex-1 max-w-md">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar en guiones por palabra clave, producto, flete, pago..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Precios de Referencia Rápidos */}
                    <div className="flex items-center gap-2 overflow-x-auto text-[11px] font-bold text-slate-600 py-1">
                        <span className="text-slate-400">Precios Tienda:</span>
                        <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs">
                            Detergente 20L: <strong className="text-indigo-700">{formatScriptCurrency(livePrices.detergente20L)}</strong>
                        </span>
                        <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs">
                            Desengrasante 20L: <strong className="text-indigo-700">{formatScriptCurrency(livePrices.desengrasante20L)}</strong>
                        </span>
                        <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-2xs">
                            Combo Dúo: <strong className="text-indigo-700">{formatScriptCurrency(livePrices.comboDuo)}</strong>
                        </span>
                    </div>
                </div>

                {/* ─── PESTAÑAS DE CATEGORÍA ─────────────────────────────────── */}
                <div className="px-4 sm:px-6 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto scrollbar-none py-2">
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
                                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                <Icon size={13} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* ─── LISTA DE GUIONES COMERCIALES ──────────────────────────── */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-100/60">
                    {filteredScripts.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8">
                            <FileText size={36} className="mx-auto text-slate-400 mb-2 opacity-60" />
                            <h3 className="text-base font-bold text-slate-800">No se encontraron guiones con ese filtro</h3>
                            <p className="text-xs text-slate-500 mt-1">Prueba con otra categoría o término de búsqueda.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {filteredScripts.map(script => {
                                const compiledText = compileSalesScript(script, scriptVars);
                                const isCopied = copiedScriptId === script.id;

                                return (
                                    <div
                                        key={script.id}
                                        className={`bg-white rounded-2xl border transition-all p-4 sm:p-5 flex flex-col justify-between shadow-2xs hover:shadow-md ${
                                            script.destacado ? 'border-indigo-300 ring-1 ring-indigo-200' : 'border-slate-200'
                                        }`}
                                    >
                                        <div>
                                            {/* Cabecera del Guión */}
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
                                                    </div>
                                                    <h4 className="text-sm font-black text-slate-900 leading-snug">
                                                        {script.titulo}
                                                    </h4>
                                                </div>
                                            </div>

                                            <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                                                {script.descripcion}
                                            </p>

                                            {/* Caja de Texto Compilada (Visualización WhatsApp) */}
                                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 font-sans whitespace-pre-line leading-relaxed select-all max-h-56 overflow-y-auto mb-4 relative group">
                                                {compiledText}
                                            </div>
                                        </div>

                                        {/* Acciones Rápidas */}
                                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                                <span>{compiledText.length} caracteres</span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {/* Botón WhatsApp */}
                                                <button
                                                    onClick={() => handleOpenWhatsApp(script)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 transition-colors cursor-pointer"
                                                    title="Abrir WhatsApp con este texto cargado"
                                                >
                                                    <Send size={13} className="text-emerald-600" />
                                                    WhatsApp
                                                </button>

                                                {/* Botón Copiar 1-Clic */}
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
                    )}
                </div>
            </motion.div>
        </div>
    );
}
