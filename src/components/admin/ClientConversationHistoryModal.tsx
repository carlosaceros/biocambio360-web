'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, MessageCircle, AlertCircle, Image as ImageIcon, FileText, Mic, Video } from 'lucide-react';
import { getConversationHistoryByPhone } from '@/lib/inbox-service';
import type { ConversationDoc, MessageDoc } from '@/types/inbox';

interface Props {
    phone: string;
    customerName: string;
    onClose: () => void;
}

function formatTimestamp(ts: MessageDoc['timestamp']): string {
    try {
        const date = typeof ts === 'string' ? new Date(ts)
            : ts instanceof Date ? ts
            : ts?.toDate?.() ?? new Date(0);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
}

function MessageIcon({ type }: { type: MessageDoc['type'] }) {
    switch (type) {
        case 'image': return <ImageIcon size={13} />;
        case 'audio': return <Mic size={13} />;
        case 'video': return <Video size={13} />;
        case 'document': return <FileText size={13} />;
        default: return null;
    }
}

/**
 * Historial de conversación de WhatsApp de un cliente, de solo lectura — para que un asesor con
 * acceso a su cartera (capacidad `clientes`) pueda ver el contexto sin necesitar la bandeja completa
 * del inbox (capacidad `mensajeria`, que no todos los roles tienen).
 */
export default function ClientConversationHistoryModal({ phone, customerName, onClose }: Props) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [conversation, setConversation] = useState<ConversationDoc | null>(null);
    const [messages, setMessages] = useState<MessageDoc[]>([]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const result = await getConversationHistoryByPhone(phone);
                if (cancelled) return;
                if (!result) {
                    setError('Este cliente no tiene conversación de WhatsApp registrada en el sistema.');
                } else {
                    setConversation(result.conversation);
                    setMessages(result.messages);
                }
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar el historial.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [phone]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden border border-gray-100"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-gradient-to-r from-emerald-700 to-emerald-900 p-4 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                            <MessageCircle size={18} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-black text-sm truncate">{customerName || 'Cliente'}</h3>
                            <p className="text-[11px] text-emerald-100 font-mono">{phone}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-emerald-100 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer shrink-0">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-2">
                    {loading && (
                        <div className="h-full flex items-center justify-center py-16">
                            <Loader2 className="animate-spin text-slate-300" size={26} />
                        </div>
                    )}
                    {error && !loading && (
                        <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                            <AlertCircle className="text-slate-300" size={28} />
                            <p className="text-sm text-slate-500">{error}</p>
                        </div>
                    )}
                    {!loading && !error && messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                            <MessageCircle className="text-slate-300" size={28} />
                            <p className="text-sm text-slate-500">La conversación existe pero no tiene mensajes todavía.</p>
                        </div>
                    )}
                    {!loading && !error && messages.map((m) => (
                        <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-xs shadow-xs ${
                                m.direction === 'outbound'
                                    ? 'bg-emerald-600 text-white rounded-br-sm'
                                    : 'bg-white text-slate-800 rounded-bl-sm border border-slate-200'
                            }`}>
                                {m.type !== 'text' && (
                                    <div className={`flex items-center gap-1.5 mb-1 text-[10px] font-bold uppercase ${m.direction === 'outbound' ? 'text-emerald-100' : 'text-slate-400'}`}>
                                        <MessageIcon type={m.type} />
                                        {m.type}
                                    </div>
                                )}
                                {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                                {m.mediaUrl && m.type === 'image' && (
                                    <img src={m.mediaUrl} alt="Adjunto" className="mt-1.5 rounded-lg max-h-48 object-cover" />
                                )}
                                <p className={`text-[9px] mt-1 ${m.direction === 'outbound' ? 'text-emerald-200' : 'text-slate-400'}`}>
                                    {formatTimestamp(m.timestamp)}{m.agentName ? ` · ${m.agentName}` : ''}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {conversation && (
                    <div className="px-4 py-2.5 border-t border-slate-100 bg-white text-[10px] text-slate-400 shrink-0">
                        Solo lectura · {conversation.tags?.includes('venta-cerrada') ? '✅ Venta cerrada registrada · ' : ''}
                        Canal: {conversation.channel}
                    </div>
                )}
            </div>
        </div>
    );
}
