'use client';

import { useState, useEffect, useCallback } from 'react';
import { auth } from '@/lib/firebase';
import {
    X,
    FileText,
    Search,
    Send,
    ChevronRight,
    Loader2,
    RefreshCw,
    AlertCircle,
} from 'lucide-react';
import type { ConversationDoc } from '@/types/inbox';

interface Template {
    id: string;
    name: string;
    status: string;
    language: string;
    category: string;
    components: Array<{
        type: string;
        format?: string;
        text?: string;
        example?: { body_text?: string[][] };
        buttons?: Array<{ type: string; text: string; url?: string }>;
    }>;
}

interface TemplatePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    conversation: ConversationDoc | null;
    wabaId?: string;
}

export default function TemplatePickerModal({
    isOpen,
    onClose,
    conversation,
    wabaId,
}: TemplatePickerModalProps) {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Template | null>(null);
    const [variables, setVariables] = useState<string[]>([]);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const fetchTemplates = useCallback(async () => {
        if (!wabaId) return;
        setLoading(true);
        setError(null);
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('No autenticado');
            const idToken = await user.getIdToken();
            const res = await fetch(`/api/inbox/templates?wabaId=${wabaId}`, {
                headers: { 'Authorization': `Bearer ${idToken}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Error cargando plantillas');
            setTemplates(data.templates ?? []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [wabaId]);

    useEffect(() => {
        if (isOpen && templates.length === 0) {
            fetchTemplates();
        }
    }, [isOpen, fetchTemplates, templates.length]);

    const getBodyText = (template: Template): string => {
        const body = template.components?.find(c => c.type === 'BODY');
        return body?.text ?? '';
    };

    const countVariables = (text: string): number => {
        const matches = text.match(/\{\{(\d+)\}\}/g);
        return matches ? new Set(matches).size : 0;
    };

    const handleSelectTemplate = (t: Template) => {
        setSelected(t);
        const bodyText = getBodyText(t);
        const varCount = countVariables(bodyText);
        setVariables(Array(varCount).fill(''));
        setError(null);
        setSuccess(false);
    };

    const previewText = selected ? getBodyText(selected).replace(/\{\{(\d+)\}\}/g, (_, idx) => {
        const val = variables[parseInt(idx) - 1];
        return val ? `*${val}*` : `[variable ${idx}]`;
    }) : '';

    const handleSend = async () => {
        if (!selected || !conversation) return;
        setSending(true);
        setError(null);
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('No autenticado');
            const idToken = await user.getIdToken();

            // Build template components if variables exist
            const components = variables.length > 0 ? [{
                type: 'body',
                parameters: variables.map(v => ({ type: 'text', text: v })),
            }] : undefined;

            const res = await fetch('/api/inbox/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    conversationId: conversation.id,
                    channel: conversation.channel,
                    to: conversation.contactPhone ?? conversation.contactPsid ?? '',
                    phoneId: conversation.phoneId,
                    type: 'template',
                    template: {
                        name: selected.name,
                        language: selected.language,
                        components,
                    },
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Error al enviar');
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSelected(null);
                setSuccess(false);
            }, 1200);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSending(false);
        }
    };

    const filtered = templates.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        getBodyText(t).toLowerCase().includes(search.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <FileText size={18} className="text-green-600" />
                        <h2 className="font-black text-gray-900 text-sm">Plantillas Aprobadas</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={fetchTemplates} className="p-1.5 text-gray-400 hover:text-gray-600">
                            <RefreshCw size={14} />
                        </button>
                        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Template list */}
                    <div className="w-1/2 border-r border-gray-100 flex flex-col">
                        <div className="p-3">
                            <div className="relative">
                                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Buscar plantilla..."
                                    className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-green-400"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 size={20} className="animate-spin text-gray-400" />
                                </div>
                            ) : filtered.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-8">
                                    {templates.length === 0 ? 'No hay plantillas aprobadas' : 'Sin resultados'}
                                </p>
                            ) : (
                                filtered.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => handleSelectTemplate(t)}
                                        className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                                            selected?.id === t.id ? 'bg-green-50 border-l-2 border-green-500' : ''
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="text-xs font-bold text-gray-800 truncate">{t.name}</span>
                                            <ChevronRight size={12} className="text-gray-300 shrink-0" />
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                                t.category === 'MARKETING' ? 'bg-orange-50 text-orange-600' :
                                                t.category === 'UTILITY' ? 'bg-blue-50 text-blue-600' :
                                                'bg-gray-50 text-gray-500'
                                            }`}>
                                                {t.category}
                                            </span>
                                            <span className="text-[10px] text-gray-400">{t.language}</span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">
                                            {getBodyText(t)}
                                        </p>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Preview & variables */}
                    <div className="w-1/2 flex flex-col p-4">
                        {!selected ? (
                            <div className="flex-1 flex items-center justify-center text-center">
                                <p className="text-xs text-gray-400">Selecciona una plantilla para previsualizar</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4 flex-1">
                                <div>
                                    <p className="text-[10px] font-extrabold uppercase text-gray-400 mb-2">Vista previa</p>
                                    <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed border border-gray-100">
                                        {previewText}
                                    </div>
                                </div>

                                {/* Variable inputs */}
                                {variables.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-extrabold uppercase text-gray-400 mb-2">
                                            Variables ({variables.length})
                                        </p>
                                        <div className="space-y-2">
                                            {variables.map((v, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-gray-500 w-12 shrink-0">
                                                        {`{{${i + 1}}}`}
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={v}
                                                        onChange={e => {
                                                            const newVars = [...variables];
                                                            newVars[i] = e.target.value;
                                                            setVariables(newVars);
                                                        }}
                                                        placeholder={`Variable ${i + 1}...`}
                                                        className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-green-400"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {error && (
                                    <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-xl p-2">
                                        <AlertCircle size={12} />
                                        {error}
                                    </div>
                                )}

                                {success && (
                                    <div className="text-xs text-green-700 bg-green-50 rounded-xl p-2 text-center font-bold">
                                        ✅ Plantilla enviada exitosamente
                                    </div>
                                )}

                                <button
                                    onClick={handleSend}
                                    disabled={sending || success || variables.some(v => !v.trim()) }
                                    className="mt-auto py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
                                >
                                    {sending ? (
                                        <Loader2 size={13} className="animate-spin" />
                                    ) : (
                                        <Send size={13} />
                                    )}
                                    Enviar plantilla a {conversation?.contactName}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
