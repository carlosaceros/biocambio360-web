'use client';

import { useEffect, useMemo, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { MessageSquare, Instagram, Facebook, CheckCheck, Check, Clock } from 'lucide-react';
import type { ConversationDoc, Channel, ConversationStatus } from '@/types/inbox';

interface ConversationListProps {
    conversations: ConversationDoc[];
    selectedId: string | null;
    onSelect: (conv: ConversationDoc) => void;
    loading?: boolean;
    /** More (older) conversations can be loaded */
    hasMore?: boolean;
    loadingMore?: boolean;
    onLoadMore?: () => void;
}

const CHANNEL_ICONS: Record<Channel, React.ReactNode> = {
    whatsapp: (
        <span className="flex items-center justify-center w-4 h-4 rounded-full bg-green-500">
            <svg viewBox="0 0 24 24" fill="white" className="w-2.5 h-2.5">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M11.996 2C6.477 2 2 6.477 2 11.996a9.96 9.96 0 001.385 5.099L2 22l5.047-1.364A9.955 9.955 0 0011.996 22C17.515 22 22 17.523 22 11.996 22 6.477 17.515 2 11.996 2z" />
            </svg>
        </span>
    ),
    messenger: <Facebook size={14} className="text-blue-500" />,
    instagram: <Instagram size={14} className="text-pink-500" />,
};

const STATUS_COLORS: Record<ConversationStatus, string> = {
    abierto: 'bg-green-400',
    asignado: 'bg-blue-400',
    bot: 'bg-purple-400',
    cerrado: 'bg-gray-300',
};

const STATUS_LABELS: Record<ConversationStatus, string> = {
    abierto: 'Abierto',
    asignado: 'Asignado',
    bot: 'Bot',
    cerrado: 'Cerrado',
};

function formatTime(ts: any): string {
    if (!ts) return '';
    try {
        let date: Date;
        if (ts?.toDate) {
            date = ts.toDate();
        } else if (ts?.seconds) {
            date = new Date(ts.seconds * 1000);
        } else {
            date = new Date(ts);
        }
        return formatDistanceToNow(date, { locale: es, addSuffix: false });
    } catch {
        return '';
    }
}

export default function ConversationList({
    conversations,
    selectedId,
    onSelect,
    loading = false,
    hasMore = false,
    loadingMore = false,
    onLoadMore,
}: ConversationListProps) {
    // Loads the next page automatically when the end of the list scrolls into view
    const sentinelRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = sentinelRef.current;
        if (!el || !hasMore || loadingMore || !onLoadMore) return;
        const observer = new IntersectionObserver(entries => {
            if (entries[0]?.isIntersecting) onLoadMore();
        }, { rootMargin: '200px' });
        observer.observe(el);
        return () => observer.disconnect();
    }, [hasMore, loadingMore, onLoadMore, conversations.length]);

    if (loading) {
        return (
            <div className="flex flex-col gap-2 p-3">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse flex gap-3 p-3 rounded-xl bg-gray-50">
                        <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="h-3 bg-gray-200 rounded w-3/4" />
                            <div className="h-2.5 bg-gray-100 rounded w-full" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (conversations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
                <MessageSquare size={36} className="text-gray-200 mb-3" />
                <p className="text-sm font-semibold text-gray-400">Sin conversaciones</p>
                <p className="text-xs text-gray-300 mt-1">Los mensajes aparecerán aquí en tiempo real</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col divide-y divide-gray-50">
            {conversations.map(conv => {
                const isSelected = conv.id === selectedId;
                const hasUnread = conv.unreadCount > 0;

                return (
                    <button
                        key={conv.id}
                        onClick={() => onSelect(conv)}
                        className={`w-full text-left flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50 focus:outline-none ${
                            isSelected ? 'bg-green-50 border-l-2 border-green-500' : ''
                        }`}
                    >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-100 to-teal-100 flex items-center justify-center font-bold text-green-700 text-sm uppercase">
                                {conv.contactName?.charAt(0) ?? '?'}
                            </div>
                            {/* Channel badge */}
                            <span className="absolute -bottom-0.5 -right-0.5">
                                {CHANNEL_ICONS[conv.channel]}
                            </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                                <span className={`text-sm truncate ${hasUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                    {conv.contactName}
                                </span>
                                <span className="text-[10px] text-gray-400 shrink-0">
                                    {formatTime(conv.lastMessageAt)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-1 mt-0.5">
                                <p className={`text-xs truncate ${hasUnread ? 'text-gray-700' : 'text-gray-400'}`}>
                                    {conv.lastMessage || '...'}
                                </p>
                                {hasUnread && (
                                    <span className="shrink-0 min-w-[18px] h-[18px] px-1 bg-green-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                                        {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2 mt-1">
                                {/* Status dot */}
                                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[conv.status]}`} />
                                <span className="text-[10px] text-gray-400">
                                    {STATUS_LABELS[conv.status]}
                                </span>
                                {conv.assignedToName && (
                                    <>
                                        <span className="text-[10px] text-gray-300">·</span>
                                        <span className="text-[10px] text-blue-500 truncate max-w-[80px]">
                                            {conv.assignedToName}
                                        </span>
                                    </>
                                )}
                                {conv.preOrder?.horarioContacto && (
                                    <>
                                        <span className="text-[10px] text-gray-300">·</span>
                                        <span className="text-[10px] bg-violet-50 text-violet-700 px-1 rounded font-semibold" title="Horario de contacto preferido">
                                            📞 {({ manana: 'Mañana', tarde: 'Tarde', '7-9pm': '7-9 p.m.' } as Record<string, string>)[conv.preOrder.horarioContacto] ?? conv.preOrder.horarioContacto}
                                        </span>
                                    </>
                                )}
                                {conv.accountKey === 'totalLimpieza' && (
                                    <>
                                        <span className="text-[10px] text-gray-300">·</span>
                                        <span className="text-[10px] bg-teal-50 text-teal-600 px-1 rounded font-semibold">
                                            T.Limpieza
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </button>
                );
            })}

            {(hasMore || loadingMore) && (
                <div ref={sentinelRef} className="p-3 flex justify-center">
                    <button
                        onClick={onLoadMore}
                        disabled={loadingMore}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 disabled:text-gray-400 cursor-pointer"
                    >
                        {loadingMore ? 'Cargando conversaciones…' : 'Cargar más conversaciones'}
                    </button>
                </div>
            )}
        </div>
    );
}
