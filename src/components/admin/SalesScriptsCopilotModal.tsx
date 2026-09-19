'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    FileText,
    Search,
    Copy,
    Check,
    Sparkles,
    MessageSquare,
    Send,
    Shield,
    Target,
    Zap,
    ExternalLink,
    RefreshCw,
    Sliders,
    HeartHandshake,
    DollarSign,
    CheckCircle2,
    Truck,
    ArrowRight,
    Users,
    Edit3
} from 'lucide-react';
import {
    SALES_SCRIPTS_CATALOG,
    SCRIPT_CATEGORIES,
    SalesScript,
    SalesScriptCategory
} from '@/lib/sales-scripts-data';

interface SalesScriptsCopilotModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentAdvisorName?: string;
    preloadedClientName?: string;
    preloadedClientPhone?: string;
    advisorSalesMonth?: number;
    advisorGoalMonth?: number;
}

export default function SalesScriptsCopilotModal({
    isOpen,
    onClose,
    currentAdvisorName = 'Karen',
    preloadedClientName = '',
    preloadedClientPhone = '',
    advisorSalesMonth = 18500000,
    advisorGoalMonth = 30000000,
}: SalesScriptsCopilotModalProps) {
    // Mode: 'scripts' (Word interactivo de guiones) | 'ai' (Copilot IA con Gemini)
    const [activeView, setActiveView] = useState<'scripts' | 'ai'>('scripts');

    // Variables interactivas para interpolar en vivo (como plantilla Word)
    const [variables, setVariables] = useState({
        cliente: preloadedClientName || 'Apreciado/a cliente',
        asesor: currentAdvisorName || 'Karen',
        producto: 'Detergente Líquido Concentrado 20L',
        total: '$118.000',
        ciudad: 'Bogotá / Soacha',
        enlace_referido: 'https://biocambio360.com?ref=BIOCAMBIO'
    });

    // Filtros de guiones
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('todas');
    const [copiedScriptId, setCopiedScriptId] = useState<string | null>(null);

    // Estado Copilot IA
    const [aiMode, setAiMode] = useState<'objecion' | 'analizar_chat' | 'meta_tactica'>('objecion');
    const [objectionText, setObjectionText] = useState('');
    const [chatText, setChatText] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState<any>(null);
    const [copiedAiField, setCopiedAiField] = useState<string | null>(null);

    // Interpolación de variables en los textos
    const interpolateText = (template: string) => {
        return template
            .replace(/{cliente}/g, variables.cliente)
            .replace(/{asesor}/g, variables.asesor)
            .replace(/{producto}/g, variables.producto)
            .replace(/{total}/g, variables.total)
            .replace(/{ciudad}/g, variables.ciudad)
            .replace(/{enlace_referido}/g, variables.enlace_referido);
    };

    // Guiones filtrados
    const filteredScripts = useMemo(() => {
        return SALES_SCRIPTS_CATALOG.filter(script => {
            const matchesCategory = selectedCategory === 'todas' || script.categoria === selectedCategory;
            const matchesSearch = searchQuery === '' ||
                script.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                script.descripcion.toLowerCase().includes(searchQuery.toLowerCase()) ||
                script.texto.toLowerCase().includes(searchQuery.toLowerCase()) ||
                script.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesCategory && matchesSearch;
        });
    }, [searchQuery, selectedCategory]);

    const handleCopy = (id: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedScriptId(id);
        setTimeout(() => setCopiedScriptId(null), 2500);
    };

    const handleCopyAi = (fieldName: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedAiField(fieldName);
        setTimeout(() => setCopiedAiField(null), 2500);
    };

    const handleOpenWhatsApp = (text: string) => {
        const cleanPhone = preloadedClientPhone.replace(/\D/g, '');
        const url = cleanPhone
            ? `https://wa.me/57${cleanPhone}?text=${encodeURIComponent(text)}`
            : `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    // Llamadas al Endpoint Gemini AI
    const handleRunAi = async () => {
        setIsAiLoading(true);
        setAiResult(null);
        try {
            let payload: any = { action: aiMode };

            if (aiMode === 'objecion') {
                payload = {
                    ...payload,
                    objecion: objectionText,
                    cliente: variables.cliente,
                    producto: variables.producto,
                };
            } else if (aiMode === 'analizar_chat') {
                payload = {
                    ...payload,
                    chatTranscript: chatText,
                    clienteNombre: variables.cliente,
                };
            } else if (aiMode === 'meta_tactica') {
                payload = {
                    ...payload,
                    advisorName: variables.asesor,
                    metaMensual: advisorGoalMonth,
                    ventasActuales: advisorSalesMonth,
                    diasRestantes: 12,
                    ticketPromedio: 85000,
                };
            }

            const res = await fetch('/api/ai/sales-copilot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Error al conectar con Copilot IA');
            const data = await res.json();
            setAiResult(data);
        } catch (error) {
            console.error('Error llamando a Gemini:', error);
            alert('No fue posible procesar con IA en este instante. Se cargó una respuesta táctica recomendada.');
        } finally {
            setIsAiLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs">
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 15 }}
                    className="bg-white w-full max-w-6xl h-[92vh] max-h-[900px] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
                >
                    {/* Header Principal */}
                    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-4 flex items-center justify-between text-white shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                                <Sparkles size={22} className="animate-pulse text-amber-400" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black tracking-widest text-indigo-300 uppercase">
                                        Biocambio360 Commercial Suite
                                    </span>
                                    <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                        Gemini IA Live
                                    </span>
                                </div>
                                <h2 className="text-lg font-black text-white flex items-center gap-2">
                                    Word Interactivo de Guiones & Copilot Comercial
                                </h2>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Selector de Vista: Guiones vs IA */}
                            <div className="bg-white/10 p-1 rounded-2xl flex gap-1 border border-white/10">
                                <button
                                    onClick={() => setActiveView('scripts')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                                        activeView === 'scripts'
                                            ? 'bg-white text-slate-950 shadow-xs'
                                            : 'text-slate-300 hover:text-white'
                                    }`}
                                >
                                    <FileText size={14} />
                                    <span>Guiones Oficiales (Word)</span>
                                </button>
                                <button
                                    onClick={() => setActiveView('ai')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                                        activeView === 'ai'
                                            ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-xs font-black'
                                            : 'text-slate-300 hover:text-white'
                                    }`}
                                >
                                    <Sparkles size={14} className="text-amber-400" />
                                    <span>Copilot IA (Gemini)</span>
                                </button>
                            </div>

                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Barra Dinámica de Variables (Word Interactivo: Modifica y actualiza todo en vivo) */}
                    <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 shrink-0">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 shrink-0">
                                <Sliders size={14} className="text-indigo-600" />
                                <span className="uppercase tracking-wider text-[11px]">Variables en Vivo:</span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full max-w-4xl text-xs">
                                <div>
                                    <input
                                        type="text"
                                        value={variables.cliente}
                                        onChange={(e) => setVariables({ ...variables, cliente: e.target.value })}
                                        placeholder="Nombre Cliente"
                                        title="Nombre del cliente"
                                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <input
                                        type="text"
                                        value={variables.asesor}
                                        onChange={(e) => setVariables({ ...variables, asesor: e.target.value })}
                                        placeholder="Nombre Asesor"
                                        title="Nombre del asesor"
                                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <input
                                        type="text"
                                        value={variables.producto}
                                        onChange={(e) => setVariables({ ...variables, producto: e.target.value })}
                                        placeholder="Producto principal"
                                        title="Producto"
                                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <input
                                        type="text"
                                        value={variables.total}
                                        onChange={(e) => setVariables({ ...variables, total: e.target.value })}
                                        placeholder="Total $ COP"
                                        title="Total en COP"
                                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <input
                                        type="text"
                                        value={variables.ciudad}
                                        onChange={(e) => setVariables({ ...variables, ciudad: e.target.value })}
                                        placeholder="Ciudad destino"
                                        title="Ciudad de destino"
                                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CUERPO: VISTA 1 - GUIONES OFICIALES (WORD INTERACTIVO) */}
                    {activeView === 'scripts' && (
                        <div className="flex flex-1 overflow-hidden">
                            {/* Panel Lateral: Categorías y Búsqueda */}
                            <div className="w-64 border-r border-slate-200 bg-slate-50/50 p-4 flex flex-col gap-3 shrink-0">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Buscar guión o palabra..."
                                        className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                                    />
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-1 pr-1 no-scrollbar">
                                    <button
                                        onClick={() => setSelectedCategory('todas')}
                                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                                            selectedCategory === 'todas'
                                                ? 'bg-indigo-600 text-white shadow-xs'
                                                : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        <span>Todos los Guiones</span>
                                        <span className="text-[10px] opacity-80">{SALES_SCRIPTS_CATALOG.length}</span>
                                    </button>

                                    {SCRIPT_CATEGORIES.map(cat => {
                                        const count = SALES_SCRIPTS_CATALOG.filter(s => s.categoria === cat.id).length;
                                        return (
                                            <button
                                                key={cat.id}
                                                onClick={() => setSelectedCategory(cat.id)}
                                                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                                                    selectedCategory === cat.id
                                                        ? 'bg-indigo-600 text-white shadow-xs'
                                                        : 'text-slate-600 hover:bg-slate-100'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    <span>{cat.emoji}</span>
                                                    <span className="truncate">{cat.label}</span>
                                                </div>
                                                <span className="text-[10px] opacity-80">{count}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                                    <p className="font-bold flex items-center gap-1">
                                        <HeartHandshake size={12} className="text-amber-600" />
                                        <span>Cultura Biocambio360:</span>
                                    </p>
                                    <p className="mt-0.5 text-slate-600">
                                        Siempre comunica el flete como un beneficio subsidiado en un alto % por la fábrica. Cero fricción.
                                    </p>
                                </div>
                            </div>

                            {/* Contenido Principal de Guiones (Documento Word) */}
                            <div className="flex-1 overflow-y-auto p-6 bg-slate-100/60 space-y-4">
                                {filteredScripts.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                                        <FileText size={40} className="mb-2 opacity-40" />
                                        <p className="font-bold text-slate-600">No se encontraron guiones con ese filtro</p>
                                        <p className="text-xs">Prueba buscando otra palabra clave o selecciona otra categoría.</p>
                                    </div>
                                ) : (
                                    filteredScripts.map(script => {
                                        const interpolated = interpolateText(script.texto);
                                        const isCopied = copiedScriptId === script.id;

                                        return (
                                            <div
                                                key={script.id}
                                                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow relative group"
                                            >
                                                {/* Header del Guión */}
                                                <div className="flex items-start justify-between gap-4 mb-2">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                                                                {script.categoria.toUpperCase()}
                                                            </span>
                                                            {script.tags.map(t => (
                                                                <span key={t} className="text-[10px] text-slate-400">
                                                                    #{t}
                                                                </span>
                                                            ))}
                                                        </div>
                                                        <h3 className="text-sm font-black text-slate-900">
                                                            {script.titulo}
                                                        </h3>
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            {script.descripcion}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            onClick={() => handleCopy(script.id, interpolated)}
                                                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                                                                isCopied
                                                                    ? 'bg-emerald-600 text-white'
                                                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                                            }`}
                                                        >
                                                            {isCopied ? <Check size={14} /> : <Copy size={14} />}
                                                            <span>{isCopied ? '¡Copiado!' : 'Copiar'}</span>
                                                        </button>

                                                        <button
                                                            onClick={() => handleOpenWhatsApp(interpolated)}
                                                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                                                            title="Abrir en WhatsApp"
                                                        >
                                                            <MessageSquare size={14} />
                                                            <span>WhatsApp</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Cuerpo del Guión (Caja de Texto Estilo Documento) */}
                                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-sans text-xs text-slate-800 whitespace-pre-line leading-relaxed selection:bg-indigo-100">
                                                    {interpolated}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {/* CUERPO: VISTA 2 - COPILOT COMERCIAL IA (GEMINI) */}
                    {activeView === 'ai' && (
                        <div className="flex flex-1 overflow-hidden">
                            {/* Panel de Modos IA */}
                            <div className="w-72 border-r border-slate-200 bg-slate-50/50 p-4 flex flex-col gap-3 shrink-0">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    Modo de Asistencia IA
                                </span>

                                <button
                                    onClick={() => { setAiMode('objecion'); setAiResult(null); }}
                                    className={`w-full text-left p-3 rounded-2xl text-xs font-bold transition-all flex items-start gap-3 cursor-pointer ${
                                        aiMode === 'objecion'
                                            ? 'bg-indigo-600 text-white shadow-md'
                                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                                    }`}
                                >
                                    <Shield size={18} className={aiMode === 'objecion' ? 'text-amber-300' : 'text-indigo-600'} />
                                    <div>
                                        <p className="font-black">Resolver Objeción</p>
                                        <p className={`text-[10px] mt-0.5 ${aiMode === 'objecion' ? 'text-indigo-100' : 'text-slate-500'}`}>
                                            Genera 3 opciones (cálida, directa, cierre) ante dudas de flete o precio.
                                        </p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => { setAiMode('analizar_chat'); setAiResult(null); }}
                                    className={`w-full text-left p-3 rounded-2xl text-xs font-bold transition-all flex items-start gap-3 cursor-pointer ${
                                        aiMode === 'analizar_chat'
                                            ? 'bg-indigo-600 text-white shadow-md'
                                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                                    }`}
                                >
                                    <MessageSquare size={18} className={aiMode === 'analizar_chat' ? 'text-amber-300' : 'text-emerald-600'} />
                                    <div>
                                        <p className="font-black">Analizar Chat WhatsApp</p>
                                        <p className={`text-[10px] mt-0.5 ${aiMode === 'analizar_chat' ? 'text-indigo-100' : 'text-slate-500'}`}>
                                            Pega el mensaje del cliente y recibe la respuesta perfecta redactada.
                                        </p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => { setAiMode('meta_tactica'); setAiResult(null); }}
                                    className={`w-full text-left p-3 rounded-2xl text-xs font-bold transition-all flex items-start gap-3 cursor-pointer ${
                                        aiMode === 'meta_tactica'
                                            ? 'bg-indigo-600 text-white shadow-md'
                                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                                    }`}
                                >
                                    <Target size={18} className={aiMode === 'meta_tactica' ? 'text-amber-300' : 'text-rose-600'} />
                                    <div>
                                        <p className="font-black">Táctica de Metas</p>
                                        <p className={`text-[10px] mt-0.5 ${aiMode === 'meta_tactica' ? 'text-indigo-100' : 'text-slate-500'}`}>
                                            Calcula pedidos diarios y combos estrella para superar la cuota mensual.
                                        </p>
                                    </div>
                                </button>

                                <div className="mt-auto p-3 bg-indigo-50/70 rounded-2xl border border-indigo-100 text-indigo-950 text-[11px]">
                                    <span className="font-bold flex items-center gap-1 text-indigo-700">
                                        <Zap size={12} /> Inteligencia con Propósito:
                                    </span>
                                    <p className="mt-1 text-slate-600">
                                        Copilot entrena con los guiones de Diego & Fernando, enfatizando el subsidio de fábrica y fidelización ética.
                                    </p>
                                </div>
                            </div>

                            {/* Contenido Copilot IA */}
                            <div className="flex-1 overflow-y-auto p-6 bg-slate-100/60 space-y-6">
                                {/* SUB-MODO 1: OBJECIÓN */}
                                {aiMode === 'objecion' && (
                                    <div className="space-y-4">
                                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                                            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                                <Shield size={16} className="text-indigo-600" />
                                                ¿Qué objeción o duda tiene el cliente?
                                            </h3>

                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    'El envío me parece muy costoso para mi ciudad',
                                                    'En el D1 el galón sale más barato, ¿por qué comprarles a ustedes?',
                                                    '¿El producto de verdad rinde o es pura agua?',
                                                    'No me da confianza pagar antes, ¿tienen contraentrega?',
                                                    '¿Tienen descuento si llevo dos garrafas de 20L?'
                                                ].map((quickObj, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setObjectionText(quickObj)}
                                                        className="text-[11px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 px-3 py-1 rounded-full text-slate-600 transition-colors cursor-pointer text-left"
                                                    >
                                                        "{quickObj}"
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={objectionText}
                                                    onChange={(e) => setObjectionText(e.target.value)}
                                                    placeholder="Escribe la objeción del cliente..."
                                                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleRunAi();
                                                    }}
                                                />
                                                <button
                                                    onClick={handleRunAi}
                                                    disabled={isAiLoading || !objectionText.trim()}
                                                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                                                >
                                                    {isAiLoading ? (
                                                        <RefreshCw size={14} className="animate-spin" />
                                                    ) : (
                                                        <Sparkles size={14} className="text-amber-300" />
                                                    )}
                                                    <span>{isAiLoading ? 'Generando...' : 'Generar Respuestas'}</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Resultados de Objeción */}
                                        {aiResult && (
                                            <div className="space-y-4">
                                                {/* Opción Cálida */}
                                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-black text-rose-600 flex items-center gap-1.5 bg-rose-50 px-2.5 py-1 rounded-lg">
                                                            🌿 Opción Cálida & Límbica (Hogar y Bienestar)
                                                        </span>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleCopyAi('calida', aiResult.opcion_calida)}
                                                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                                                            >
                                                                {copiedAiField === 'calida' ? <Check size={12} /> : <Copy size={12} />}
                                                                <span>{copiedAiField === 'calida' ? 'Copiado' : 'Copiar'}</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleOpenWhatsApp(aiResult.opcion_calida)}
                                                                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                                                            >
                                                                <MessageSquare size={12} />
                                                                <span>WhatsApp</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-slate-800 whitespace-pre-line leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                                        {aiResult.opcion_calida}
                                                    </p>
                                                </div>

                                                {/* Opción Directa / Números */}
                                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-black text-indigo-600 flex items-center gap-1.5 bg-indigo-50 px-2.5 py-1 rounded-lg">
                                                            📊 Opción Directa (Rendimiento Matemático & Ahorro)
                                                        </span>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleCopyAi('directa', aiResult.opcion_directa)}
                                                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                                                            >
                                                                {copiedAiField === 'directa' ? <Check size={12} /> : <Copy size={12} />}
                                                                <span>{copiedAiField === 'directa' ? 'Copiado' : 'Copiar'}</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleOpenWhatsApp(aiResult.opcion_directa)}
                                                                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                                                            >
                                                                <MessageSquare size={12} />
                                                                <span>WhatsApp</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-slate-800 whitespace-pre-line leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                                        {aiResult.opcion_directa}
                                                    </p>
                                                </div>

                                                {/* Opción Cierre de Valor */}
                                                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-black text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg">
                                                            🚀 Opción Cierre Inmediato (Flete Subsidiado + Contraentrega)
                                                        </span>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleCopyAi('cierre', aiResult.opcion_cierre_valor)}
                                                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                                                            >
                                                                {copiedAiField === 'cierre' ? <Check size={12} /> : <Copy size={12} />}
                                                                <span>{copiedAiField === 'cierre' ? 'Copiado' : 'Copiar'}</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleOpenWhatsApp(aiResult.opcion_cierre_valor)}
                                                                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                                                            >
                                                                <MessageSquare size={12} />
                                                                <span>WhatsApp</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-slate-800 whitespace-pre-line leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                                        {aiResult.opcion_cierre_valor}
                                                    </p>
                                                </div>

                                                {/* Consejo Táctico Asesor */}
                                                {aiResult.consejo_asesor && (
                                                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                                                        <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                                        <div>
                                                            <span className="font-black">Consejo Táctico del Director:</span>
                                                            <p className="mt-0.5 text-amber-950">{aiResult.consejo_asesor}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* SUB-MODO 2: ANALIZAR CHAT */}
                                {aiMode === 'analizar_chat' && (
                                    <div className="space-y-4">
                                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                                            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                                <MessageSquare size={16} className="text-emerald-600" />
                                                Pega la conversación o mensaje del cliente:
                                            </h3>
                                            <textarea
                                                value={chatText}
                                                onChange={(e) => setChatText(e.target.value)}
                                                rows={4}
                                                placeholder="Ejemplo: Cliente: Hola buenas tardes, me interesa el jabón de 20 litros pero vivo en Duitama, ¿cuánto vale el envío y cuándo llega?"
                                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                                            />
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={handleRunAi}
                                                    disabled={isAiLoading || !chatText.trim()}
                                                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                                                >
                                                    {isAiLoading ? (
                                                        <RefreshCw size={14} className="animate-spin" />
                                                    ) : (
                                                        <Zap size={14} />
                                                    )}
                                                    <span>{isAiLoading ? 'Analizando...' : 'Analizar Sentimiento & Redactar'}</span>
                                                </button>
                                            </div>
                                        </div>

                                        {aiResult && (
                                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-bold text-slate-500">Nivel de Interés:</span>
                                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black rounded-full">
                                                        {aiResult.nivel_interes || 'Alto'}
                                                    </span>
                                                </div>

                                                {aiResult.puntos_dolor && (
                                                    <div>
                                                        <span className="text-xs font-bold text-slate-500">Puntos de atención detectados:</span>
                                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                                            {aiResult.puntos_dolor.map((p: string, idx: number) => (
                                                                <span key={idx} className="text-[11px] bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md border border-slate-200">
                                                                    • {p}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-black text-slate-900">
                                                            Respuesta recomendada lista para WhatsApp:
                                                        </span>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleCopyAi('chat_res', aiResult.respuesta_whatsapp)}
                                                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                                                            >
                                                                {copiedAiField === 'chat_res' ? <Check size={12} /> : <Copy size={12} />}
                                                                <span>{copiedAiField === 'chat_res' ? 'Copiado' : 'Copiar'}</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleOpenWhatsApp(aiResult.respuesta_whatsapp)}
                                                                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                                                            >
                                                                <MessageSquare size={12} />
                                                                <span>Enviar a WhatsApp</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-slate-800 whitespace-pre-line leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                                        {aiResult.respuesta_whatsapp}
                                                    </p>
                                                </div>

                                                {aiResult.siguiente_paso && (
                                                    <div className="p-3 bg-indigo-50 rounded-xl text-indigo-900 text-xs flex items-center gap-2">
                                                        <ArrowRight size={14} className="text-indigo-600 shrink-0" />
                                                        <span><strong>Siguiente paso:</strong> {aiResult.siguiente_paso}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* SUB-MODO 3: TÁCTICA DE METAS */}
                                {aiMode === 'meta_tactica' && (
                                    <div className="space-y-4">
                                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                                        <Target size={16} className="text-rose-600" />
                                                        Estrategia de Cierre de Meta Comercial
                                                    </h3>
                                                    <p className="text-xs text-slate-500">
                                                        Asesor: {variables.asesor} • Meta Mensual: ${(advisorGoalMonth / 1000000).toFixed(0)}M COP
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={handleRunAi}
                                                    disabled={isAiLoading}
                                                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                                                >
                                                    {isAiLoading ? (
                                                        <RefreshCw size={14} className="animate-spin" />
                                                    ) : (
                                                        <Zap size={14} className="text-amber-300" />
                                                    )}
                                                    <span>{isAiLoading ? 'Calculando Plan...' : 'Generar Plan de Cierre'}</span>
                                                </button>
                                            </div>
                                        </div>

                                        {aiResult && (
                                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                                                <div className="p-4 bg-indigo-900 text-white rounded-2xl">
                                                    <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                                                        Objetivo Diario Recomendado
                                                    </p>
                                                    <p className="text-2xl font-black text-amber-400 mt-1">
                                                        {aiResult.meta_diaria_pedidos || 3} pedidos / día
                                                    </p>
                                                    <p className="text-xs text-slate-200 mt-1">
                                                        {aiResult.resumen}
                                                    </p>
                                                </div>

                                                {aiResult.combos_recomendados && (
                                                    <div>
                                                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
                                                            Combos Estrella para Elevar Ticket
                                                        </h4>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            {aiResult.combos_recomendados.map((combo: any, idx: number) => (
                                                                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                                                    <div className="flex justify-between items-start">
                                                                        <span className="font-black text-xs text-slate-900">{combo.nombre}</span>
                                                                        <span className="font-bold text-xs text-emerald-600">
                                                                            ${Number(combo.precio_cop).toLocaleString('es-CO')}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[11px] text-slate-600 mt-1">
                                                                        {combo.argumento_venta}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {aiResult.acciones_prioritarias && (
                                                    <div>
                                                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
                                                            Acciones Tácticas Inmediatas
                                                        </h4>
                                                        <div className="space-y-1.5">
                                                            {aiResult.acciones_prioritarias.map((acc: string, idx: number) => (
                                                                <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                                                    <CheckCircle2 size={14} className="text-indigo-600 shrink-0 mt-0.5" />
                                                                    <span>{acc}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {aiResult.mensaje_motivacional && (
                                                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 text-xs">
                                                        <p className="font-black">Mensaje de los Fundadores (Julián & Danilo):</p>
                                                        <p className="mt-1 leading-relaxed text-emerald-950">
                                                            "{aiResult.mensaje_motivacional}"
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
