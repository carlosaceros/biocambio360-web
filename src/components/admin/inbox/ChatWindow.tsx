'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { auth } from '@/lib/firebase';
import {
    Send,
    Paperclip,
    Smile,
    CheckCheck,
    Check,
    Clock,
    AlertCircle,
    Image,
    FileText,
    Mic,
    ChevronDown,
    MessageSquare,
} from 'lucide-react';
import EmojiPicker from './EmojiPicker';
import MediaAttachment from './MediaAttachment';
import type { ConversationDoc, MessageDoc, MessageStatus } from '@/types/inbox';
import { subscribeToMessages, markConversationAsRead, type MessagesStatus } from '@/lib/inbox-service';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ChatWindowProps {
    conversation: ConversationDoc | null;
    onOpenTemplates?: () => void;
    currentUserName?: string;
}

const STATUS_ICONS: Record<MessageStatus, React.ReactNode> = {
    sent: <Check size={12} className="text-gray-400" />,
    delivered: <CheckCheck size={12} className="text-gray-400" />,
    read: <CheckCheck size={12} className="text-blue-400" />,
    failed: <AlertCircle size={12} className="text-red-400" />,
};

function formatTimestamp(ts: any): string {
    if (!ts) return '';
    try {
        let date: Date;
        if (ts?.toDate) date = ts.toDate();
        else if (ts?.seconds) date = new Date(ts.seconds * 1000);
        else date = new Date(ts);
        return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
}

function isWithin24hWindow(lastInboundAt: any): boolean {
    if (!lastInboundAt) return false;
    try {
        let date: Date;
        if (lastInboundAt?.toDate) date = lastInboundAt.toDate();
        else if (lastInboundAt?.seconds) date = new Date(lastInboundAt.seconds * 1000);
        else date = new Date(lastInboundAt);
        const diffHours = (Date.now() - date.getTime()) / (1000 * 60 * 60);
        return diffHours < 24;
    } catch {
        return false;
    }
}

export default function ChatWindow({ conversation, onOpenTemplates, currentUserName }: ChatWindowProps) {
    const [messages, setMessages] = useState<MessageDoc[]>([]);
    const [msgStatus, setMsgStatus] = useState<MessagesStatus>({ loading: true });
    const [reloadKey, setReloadKey] = useState(0);
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const withinWindow = conversation ? isWithin24hWindow(conversation.lastInboundAt) : false;

    // Subscribe to messages in real-time
    useEffect(() => {
        setMessages([]);
        setMsgStatus({ loading: true });
        if (!conversation?.id) return;

        const unsub = subscribeToMessages(conversation.id, (msgs) => {
            setMessages(msgs);
        }, 200, setMsgStatus);

        // Mark as read when opening
        markConversationAsRead(conversation.id).catch(() => {});

        return unsub;
    }, [conversation?.id, reloadKey]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const insertEmoji = useCallback((emoji: string) => {
        const el = inputRef.current;
        if (!el) {
            setInputText(prev => prev + emoji);
            return;
        }
        const start = el.selectionStart ?? inputText.length;
        const end = el.selectionEnd ?? inputText.length;
        const next = inputText.slice(0, start) + emoji + inputText.slice(end);
        setInputText(next);
        requestAnimationFrame(() => {
            el.focus();
            const pos = start + emoji.length;
            el.setSelectionRange(pos, pos);
        });
    }, [inputText]);

    const handleSend = useCallback(async () => {
        if (!inputText.trim() || !conversation || isSending) return;
        const text = inputText.trim();
        setInputText('');
        setIsSending(true);
        setSendError(null);

        try {
            const user = auth.currentUser;
            if (!user) throw new Error('No autenticado');
            const idToken = await user.getIdToken();

            const res = await fetch('/api/inbox/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    conversationId: conversation.id,
                    channel: conversation.channel,
                    to: conversation.contactPhone ?? conversation.contactUserId ?? conversation.contactPsid ?? '',
                    phoneId: conversation.phoneId,
                    type: 'text',
                    text,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error ?? 'Error desconocido');
            }
        } catch (err: any) {
            setSendError(err.message);
            setInputText(text); // restore
        } finally {
            setIsSending(false);
        }
    }, [inputText, conversation, isSending]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!conversation) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mb-4">
                    <MessageSquare size={28} className="text-green-300" />
                </div>
                <p className="text-sm font-semibold text-gray-500">Selecciona una conversación</p>
                <p className="text-xs text-gray-400 mt-1">Los mensajes aparecen aquí en tiempo real</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="border-b border-gray-100 px-4 py-3 flex items-center gap-3 bg-white">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-100 to-teal-100 flex items-center justify-center font-bold text-green-700 text-sm uppercase">
                    {conversation.contactName?.charAt(0) ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm truncate">{conversation.contactName}</p>
                    <p className="text-xs text-gray-400 truncate">
                        {conversation.contactPhone ? `+${conversation.contactPhone}` : conversation.contactUserId ? 'Usuario de WhatsApp (sin número)' : conversation.contactPsid}
                        {conversation.accountKey === 'totalLimpieza' && (
                            <span className="ml-2 text-[10px] bg-teal-50 text-teal-600 px-1.5 py-0.5 rounded-full font-semibold">
                                Total Limpieza
                            </span>
                        )}
                    </p>
                </div>
                {!withinWindow && (
                    <div className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-lg font-semibold">
                        {conversation?.channel === 'whatsapp' ? '⏱ Ventana 24h expirada — usa plantilla' : '⏱ Ventana 24h expirada — solo el cliente puede reabrir el chat'}
                    </div>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-gray-50/50">
                {msgStatus.error && (
                    <div className="mx-auto max-w-sm text-center text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-3 py-2">
                        {msgStatus.error}{' '}
                        <button className="font-bold underline cursor-pointer" onClick={() => setReloadKey(k => k + 1)}>Reintentar</button>
                    </div>
                )}
                {messages.length === 0 && (
                    <div className="text-center py-8 text-xs text-gray-500">
                        {msgStatus.loading ? 'Cargando conversación…' : msgStatus.error ? '' : 'Sin mensajes aún'}
                    </div>
                )}
                {messages.map((msg) => {
                    const isOutbound = msg.direction === 'outbound';
                    return (
                        <div
                            key={msg.id}
                            className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-xs ${
                                    isOutbound
                                        ? 'bg-green-600 text-white rounded-br-sm'
                                        : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'
                                }`}
                            >
                                {/* Media preview: image / audio / video / document */}
                                {msg.mediaUrl && ['image', 'audio', 'video', 'document', 'sticker'].includes(msg.type) ? (
                                    <div className="mb-1">
                                        <MediaAttachment
                                            mediaId={msg.mediaUrl}
                                            type={msg.type}
                                            mimeType={msg.mimeType}
                                            fileName={msg.fileName}
                                        />
                                    </div>
                                ) : (
                                    <>
                                        {msg.type === 'document' && (
                                            <div className="flex items-center gap-1 mb-1 text-xs opacity-80">
                                                <FileText size={12} />
                                                {msg.fileName ?? 'Documento'}
                                            </div>
                                        )}
                                        {msg.type === 'audio' && (
                                            <div className="flex items-center gap-1 text-xs opacity-80">
                                                <Mic size={12} />
                                                Nota de voz
                                            </div>
                                        )}
                                    </>
                                )}
                                {msg.type === 'template' && (
                                    <span className="text-xs opacity-75 italic">📋 </span>
                                )}
                                {/* Message content */}
                                {(() => {
                                    // Older messages stored the options inside the text as "[Opciones: a · b]"
                                    const legacy = msg.content?.match(/\n?\[Opciones: (.+?)\]\s*$/);
                                    const text = legacy ? msg.content.replace(legacy[0], '').trim() : msg.content;
                                    const options = msg.options ?? (legacy ? legacy[1].split(' · ') : []);
                                    return (
                                        <>
                                            {(!msg.mediaUrl || !/^(📷 Imagen|🎤 Nota de voz|🎥 Video|📄 .*)$/.test(text)) && (
                                                <p className="whitespace-pre-wrap break-words">{text}</p>
                                            )}
                                            {options.length > 0 && (
                                                <div className="mt-2 flex flex-col gap-1">
                                                    {options.map((opt, i) => (
                                                        <span
                                                            key={i}
                                                            className="text-center text-xs font-bold rounded-lg py-1.5 px-2 bg-white/95 text-sky-600 shadow-sm border border-black/5"
                                                            title="Botón enviado al cliente"
                                                        >
                                                            {opt}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {msg.cta && (
                                                <a
                                                    href={msg.cta.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="mt-2 flex items-center justify-center gap-1 text-xs font-bold rounded-lg py-1.5 px-2 bg-white/95 text-sky-600 shadow-sm border border-black/5"
                                                    title="Botón enviado al cliente"
                                                >
                                                    🔗 {msg.cta.label}
                                                </a>
                                            )}
                                        </>
                                    );
                                })()}
                                {/* Footer */}
                                <div className={`flex items-center justify-end gap-1 mt-1 ${isOutbound ? 'text-green-200' : 'text-gray-400'}`}>
                                    {isOutbound && msg.agentName && (
                                        <span className="text-[10px] opacity-70">{msg.agentName} ·</span>
                                    )}
                                    <span className="text-[10px]">{formatTimestamp(msg.timestamp)}</span>
                                    {isOutbound && msg.status && STATUS_ICONS[msg.status]}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Error banner */}
            {sendError && (
                <div className="px-4 py-2 bg-red-50 border-t border-red-100 flex items-center gap-2 text-xs text-red-600">
                    <AlertCircle size={12} />
                    {sendError}
                    <button className="ml-auto text-red-400 hover:text-red-600" onClick={() => setSendError(null)}>✕</button>
                </div>
            )}

            {/* Input area */}
            <div className="border-t border-gray-100 bg-white p-3">
                {!withinWindow ? (
                    /* Outside 24h window — must use template */
                    <div className="flex flex-col items-center gap-2 py-2">
                        {conversation?.channel === 'whatsapp' ? (
                            <>
                                <p className="text-xs text-gray-500 text-center">
                                    La ventana de 24 horas expiró. Solo puedes enviar plantillas aprobadas.
                                </p>
                                <button
                                    onClick={onOpenTemplates}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors"
                                >
                                    <FileText size={13} />
                                    Enviar Plantilla
                                </button>
                            </>
                        ) : (
                            <p className="text-xs text-gray-500 text-center">
                                Pasaron más de 24 horas desde el último mensaje del cliente. En {conversation?.channel === 'instagram' ? 'Instagram' : 'Messenger'} solo puedes volver a escribirle cuando él te escriba de nuevo.
                            </p>
                        )}
                    </div>
                ) : (
                    /* Within 24h window — free text */
                    <div className="flex items-end gap-2">
                        <button
                            onClick={onOpenTemplates}
                            className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                            title="Enviar plantilla"
                        >
                            <FileText size={18} />
                        </button>
                        <EmojiPicker onSelect={insertEmoji} disabled={isSending} />
                        <textarea
                            ref={inputRef}
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Escribe un mensaje... (Enter para enviar)"
                            className="flex-1 resize-none border border-gray-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:border-green-400 max-h-28 min-h-[40px]"
                            rows={1}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!inputText.trim() || isSending}
                            className="p-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white rounded-xl transition-colors shrink-0"
                        >
                            {isSending ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Send size={16} />
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
