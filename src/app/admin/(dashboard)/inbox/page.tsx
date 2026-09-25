'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import {
    subscribeToConversations,
    subscribeToUnreadCount,
    setConversationStatus,
    markConversationAsRead,
    subscribeToAgentEnabled,
    setAgentEnabled,
    fetchConversationsPage,
} from '@/lib/inbox-service';
import ConversationList from '@/components/admin/inbox/ConversationList';
import ChatWindow from '@/components/admin/inbox/ChatWindow';
import ContactPanel from '@/components/admin/inbox/ContactPanel';
import TemplatePickerModal from '@/components/admin/inbox/TemplatePickerModal';
import WhatsAppAlertsBanner from '@/components/admin/inbox/WhatsAppAlertsBanner';
import {
    getAlertsEnabled,
    setAlertsEnabled,
    getNotificationPermission,
    requestNotificationPermission,
    playNotificationSound,
    showBrowserNotification,
} from '@/lib/inbox-notifications';
import type { ConversationDoc, Channel, ConversationStatus } from '@/types/inbox';
import { WHATSAPP_ACCOUNTS } from '@/types/inbox';
import {
    ArrowLeft,
    Search,
    Filter,
    RefreshCw,
    MessageSquare,
    Instagram,
    Facebook,
    Users,
    ChevronDown,
    X,
    Menu,
    Settings,
    Inbox,
    CheckCircle2,
    Circle,
    Bot,
    UserCheck,
    Bell,
    BellOff,
    Sparkles,
} from 'lucide-react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

type ChannelFilter = Channel | 'all';
type AccountFilter = 'all' | 'biocambio360' | 'totalLimpieza';
type StatusFilter = ConversationStatus | 'all';

interface AdvisorWorkload {
    uid: string;
    nombre: string;
    email: string;
    openConversations: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CHANNEL_TABS: Array<{ key: ChannelFilter; label: string; icon: React.ReactNode }> = [
    { key: 'all', label: 'Todos', icon: <Inbox size={14} /> },
    {
        key: 'whatsapp',
        label: 'WhatsApp',
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM11.996 2C6.477 2 2 6.477 2 11.996a9.96 9.96 0 001.385 5.099L2 22l5.047-1.364A9.955 9.955 0 0011.996 22C17.515 22 22 17.523 22 11.996 22 6.477 17.515 2 11.996 2z"/>
            </svg>
        ),
    },
    { key: 'messenger', label: 'Messenger', icon: <Facebook size={14} /> },
    { key: 'instagram', label: 'Instagram', icon: <Instagram size={14} /> },
];

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string; icon: React.ReactNode }> = [
    { key: 'all', label: 'Todos', icon: <Inbox size={12} /> },
    { key: 'abierto', label: 'Abiertos', icon: <Circle size={12} className="text-green-500" /> },
    { key: 'asignado', label: 'Asignados', icon: <UserCheck size={12} className="text-blue-500" /> },
    { key: 'bot', label: 'Bot', icon: <Bot size={12} className="text-purple-500" /> },
    { key: 'cerrado', label: 'Cerrados', icon: <CheckCircle2 size={12} className="text-gray-400" /> },
];

const PAGE_SIZE = 40;

// ─── Page Component ───────────────────────────────────────────────────────────

export default function InboxPage() {
    const { user, role, userProfile } = useAuth();
    const router = useRouter();

    // Conversations state
    const [conversations, setConversations] = useState<ConversationDoc[]>([]);
    const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [totalUnread, setTotalUnread] = useState(0);

    // History is loaded in pages: the newest PAGE_SIZE stay live, older ones load on scroll
    const [older, setOlder] = useState<ConversationDoc[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const allConversations = useMemo(() => {
        const millis = (c: ConversationDoc) => {
            const v = c.lastMessageAt as unknown as { toMillis?: () => number } | string | Date | undefined;
            if (v && typeof v === 'object' && 'toMillis' in v && v.toMillis) return v.toMillis();
            return v ? new Date(v as string | Date).getTime() : 0;
        };
        const byId = new Map<string, ConversationDoc>();
        [...older, ...conversations].forEach(c => byId.set(c.id, c)); // live data wins over the static page
        return [...byId.values()].sort((a, b) => millis(b) - millis(a));
    }, [conversations, older]);

    const loadMore = useCallback(async () => {
        if (loadingMore || !hasMore) return;
        const oldest = allConversations[allConversations.length - 1];
        if (!oldest) return;
        setLoadingMore(true);
        try {
            const page = await fetchConversationsPage(oldest.lastMessageAt, PAGE_SIZE);
            setOlder(prev => [...prev, ...page]);
            if (page.length < PAGE_SIZE) setHasMore(false);
        } catch {
            setHasMore(false);
        } finally {
            setLoadingMore(false);
        }
    }, [allConversations, hasMore, loadingMore]);

    // Derived from the live list so status/assignment changes show up immediately
    const selectedConv = useMemo(
        () => allConversations.find(c => c.id === selectedConvId) ?? null,
        [allConversations, selectedConvId]
    );

    // Alerts (sound + browser notification) and action feedback
    const [alertsOn, setAlertsOn] = useState(true);
    const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('default');
    const [agentEnabled, setAgentEnabledState] = useState(true);
    const alertsOnRef = useRef(true);
    const prevUnreadRef = useRef<Map<string, number> | null>(null);
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
        setToast({ text, type });
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 3500);
    }, []);

    // Filters
    const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
    const [accountFilter, setAccountFilter] = useState<AccountFilter>('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // UI state
    const [showContactPanel, setShowContactPanel] = useState(true);
    const [showMobileList, setShowMobileList] = useState(true);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

    // Advisor data for assignment (coordinators/superadmin)
    const [advisors, setAdvisors] = useState<AdvisorWorkload[]>([]);

    // Permissions
    const isSuperAdmin = role === 'superadmin';
    const isDirector = role === 'director';
    const isGestor = role === 'gestor';
    const canAssign = isSuperAdmin || isDirector || isGestor;
    const canModerate = isSuperAdmin || isDirector;

    // ── Real-time subscriptions ──────────────────────────────────────────────
    useEffect(() => subscribeToAgentEnabled(setAgentEnabledState), []);

    const toggleAgent = useCallback(async () => {
        try {
            await setAgentEnabled(!agentEnabled);
            showToast(!agentEnabled ? 'Agente IA activado (atiende cuando no hay asesores en línea)' : 'Agente IA pausado');
        } catch {
            showToast('No se pudo cambiar el agente IA', 'error');
        }
    }, [agentEnabled, showToast]);

    useEffect(() => {
        const enabled = getAlertsEnabled();
        setAlertsOn(enabled);
        alertsOnRef.current = enabled;
        setNotifPermission(getNotificationPermission());
    }, []);

    useEffect(() => {
        setLoading(true);
        const unsub = subscribeToConversations((convs) => {
            setConversations(convs);
            setLoading(false);

            // New inbound message = a conversation whose unread counter went up.
            // The first snapshot only seeds the baseline (no alert for existing unread).
            const prev = prevUnreadRef.current;
            if (prev && alertsOnRef.current) {
                const fresh = convs.filter(c => c.unreadCount > (prev.get(c.id) ?? 0));
                if (fresh.length > 0) {
                    playNotificationSound();
                    const first = fresh[0];
                    showBrowserNotification(
                        fresh.length > 1 ? `${fresh.length} mensajes nuevos` : `Nuevo mensaje de ${first.contactName}`,
                        fresh.length > 1 ? 'Abre la bandeja para verlos' : (first.lastMessage || 'Mensaje nuevo'),
                        'inbox-new-message'
                    );
                }
            }
            prevUnreadRef.current = new Map(convs.map(c => [c.id, c.unreadCount]));
        }, { maxResults: PAGE_SIZE });
        return unsub;
    }, []);

    useEffect(() => {
        const base = 'Bandeja de Mensajes';
        document.title = totalUnread > 0 ? `(${totalUnread}) ${base}` : base;
        return () => { document.title = 'Biocambio360'; };
    }, [totalUnread]);

    const toggleAlerts = useCallback(async () => {
        const next = !alertsOn;
        setAlertsOn(next);
        alertsOnRef.current = next;
        setAlertsEnabled(next);
        if (next) {
            playNotificationSound();
            setNotifPermission(await requestNotificationPermission());
        }
    }, [alertsOn]);

    useEffect(() => {
        const unsub = subscribeToUnreadCount(setTotalUnread);
        return unsub;
    }, []);

    // ── Load advisor workloads ────────────────────────────────────────────────
    useEffect(() => {
        if (!canAssign) return;
        const fetchAdvisors = async () => {
            try {
                const u = auth.currentUser;
                if (!u) return;
                const token = await u.getIdToken();
                const res = await fetch('/api/inbox/assign', {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setAdvisors(data.workloads ?? []);
                }
            } catch { /* ignore */ }
        };
        fetchAdvisors();
    }, [canAssign]);

    // ── Filtered conversations ────────────────────────────────────────────────
    const filteredConversations = useMemo(() => {
        return allConversations.filter(conv => {
            if (channelFilter !== 'all' && conv.channel !== channelFilter) return false;
            if (statusFilter !== 'all' && conv.status !== statusFilter) return false;
            if (accountFilter === 'biocambio360' && conv.accountKey !== 'biocambio360') return false;
            if (accountFilter === 'totalLimpieza' && conv.accountKey !== 'totalLimpieza') return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return (
                    conv.contactName?.toLowerCase().includes(q) ||
                    conv.contactPhone?.includes(q) ||
                    conv.lastMessage?.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [allConversations, channelFilter, statusFilter, accountFilter, searchQuery]);

    // ── Badge counts per channel ──────────────────────────────────────────────
    const unreadByChannel = useMemo(() => {
        const counts: Record<string, number> = { all: 0, whatsapp: 0, messenger: 0, instagram: 0 };
        conversations.forEach(c => {
            if (c.unreadCount > 0) {
                counts.all += c.unreadCount;
                counts[c.channel] = (counts[c.channel] ?? 0) + c.unreadCount;
            }
        });
        return counts;
    }, [conversations]);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleSelectConversation = useCallback((conv: ConversationDoc) => {
        setSelectedConvId(conv.id);
        setShowMobileList(false);
        markConversationAsRead(conv.id).catch(() => {});
    }, []);

    const refreshAdvisors = useCallback(async (token: string) => {
        const res = await fetch('/api/inbox/assign', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            const data = await res.json();
            setAdvisors(data.workloads ?? []);
        }
    }, []);

    const handleAssign = useCallback(async (advisorUid: string) => {
        if (!selectedConv) return;
        const u = auth.currentUser;
        if (!u) return;
        try {
            const token = await u.getIdToken();
            const res = await fetch('/api/inbox/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ conversationId: selectedConv.id, advisorUid, mode: 'manual' }),
            });
            if (!res.ok) throw new Error('assign failed');
            const name = advisors.find(a => a.uid === advisorUid)?.nombre ?? 'el asesor';
            showToast(`Conversación asignada a ${name}`);
            await refreshAdvisors(token);
        } catch {
            showToast('No se pudo asignar la conversación', 'error');
        }
    }, [selectedConv, advisors, refreshAdvisors, showToast]);

    const handleAutoAssign = useCallback(async () => {
        if (!selectedConv) return null;
        const u = auth.currentUser;
        if (!u) return null;
        try {
            const token = await u.getIdToken();
            const res = await fetch('/api/inbox/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    conversationId: selectedConv.id,
                    contactPhone: selectedConv.contactPhone,
                    mode: 'auto',
                }),
            });
            if (!res.ok) throw new Error('auto assign failed');
            const result = await res.json();
            showToast(
                result.assigned ? `Asignada a ${result.advisorName}` : 'No hay asesores activos disponibles',
                result.assigned ? 'success' : 'error'
            );
            await refreshAdvisors(token);
            return result as { assigned: boolean; advisorName?: string; reason?: string; detail?: string };
        } catch {
            showToast('No se pudo asignar la conversación', 'error');
            return null;
        }
    }, [selectedConv, refreshAdvisors, showToast]);

    const handleStatusChange = useCallback(async (status: ConversationStatus) => {
        if (!selectedConv || selectedConv.status === status) return;
        try {
            await setConversationStatus(selectedConv.id, status);
            showToast(`Estado cambiado a "${status}"`);
        } catch {
            showToast('No se pudo cambiar el estado', 'error');
        }
    }, [selectedConv, showToast]);

    const wabaId = process.env.NEXT_PUBLIC_META_APP_ID
        ? process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
        : undefined;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
            {/* Top bar */}
            <header className="bg-white border-b border-gray-100 shadow-xs px-4 py-3 flex items-center gap-3 shrink-0 z-10">
                <Link href="/admin" className="text-gray-500 hover:text-gray-800 transition-colors">
                    <ArrowLeft size={18} />
                </Link>
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center">
                        <MessageSquare size={14} className="text-white" />
                    </div>
                    <div>
                        <h1 className="font-black text-gray-900 text-sm leading-tight">Bandeja de Mensajes</h1>
                        <p className="text-[10px] text-gray-400">Biocambio360 · WhatsApp, Messenger, Instagram</p>
                    </div>
                </div>
                {totalUnread > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full">
                        {totalUnread > 99 ? '99+' : totalUnread}
                    </span>
                )}
                <div className="ml-auto flex items-center gap-2">
                    {canModerate && (
                        <button
                            onClick={toggleAgent}
                            title="Agente IA: atiende fuera del horario del equipo (L-M 6am-9pm, J 6am-8pm, V 6am-7pm, S 7am-7pm, D y festivos 9am-6pm), toma pedidos y arma un pre-pedido. Clic para activar/pausar."
                            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold border rounded-xl transition-colors cursor-pointer ${
                                agentEnabled ? 'text-violet-700 border-violet-200 bg-violet-50 hover:bg-violet-100' : 'text-gray-500 border-gray-200 hover:text-gray-800'
                            }`}
                        >
                            <Sparkles size={13} />
                            <span className="hidden sm:inline">{agentEnabled ? 'Agente IA activo' : 'Agente IA pausado'}</span>
                        </button>
                    )}
                    <button
                        onClick={toggleAlerts}
                        title={
                            alertsOn
                                ? notifPermission === 'granted'
                                    ? 'Avisos activos: sonido y notificación en cada mensaje nuevo. Clic para silenciar.'
                                    : 'Sonido activo. Clic en la campana otra vez tras permitir notificaciones del navegador.'
                                : 'Avisos silenciados. Clic para activar sonido y notificaciones.'
                        }
                        className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold border rounded-xl transition-colors cursor-pointer ${
                            alertsOn ? 'text-green-700 border-green-200 bg-green-50 hover:bg-green-100' : 'text-gray-500 border-gray-200 hover:text-gray-800'
                        }`}
                    >
                        {alertsOn ? <Bell size={13} /> : <BellOff size={13} />}
                        <span className="hidden sm:inline">{alertsOn ? 'Avisos activos' : 'Avisos silenciados'}</span>
                    </button>
                    <button
                        onClick={() => setShowContactPanel(v => !v)}
                        className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-xl transition-colors"
                    >
                        <Users size={13} />
                        {showContactPanel ? 'Ocultar panel' : 'Ver contacto'}
                    </button>
                </div>
            </header>

            <WhatsAppAlertsBanner />

            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-2xl shadow-xl font-bold text-xs text-white flex items-center gap-2 ${
                    toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
                }`}>
                    {toast.type === 'success' ? <CheckCircle2 size={15} /> : <X size={15} />}
                    {toast.text}
                </div>
            )}

            {/* Channel tabs */}
            <div className="bg-white border-b border-gray-100 px-4 flex items-center gap-1 shrink-0 overflow-x-auto">
                {CHANNEL_TABS.map(tab => {
                    const badge = unreadByChannel[tab.key] ?? 0;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setChannelFilter(tab.key)}
                            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border-b-2 transition-colors shrink-0 ${
                                channelFilter === tab.key
                                    ? 'border-green-500 text-green-700'
                                    : 'border-transparent text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                            {badge > 0 && (
                                <span className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-black rounded-full min-w-[16px] text-center">
                                    {badge > 99 ? '99+' : badge}
                                </span>
                            )}
                        </button>
                    );
                })}

                {/* Account filter for WhatsApp */}
                {(channelFilter === 'all' || channelFilter === 'whatsapp') && (
                    <div className="ml-auto shrink-0">
                        <select
                            value={accountFilter}
                            onChange={e => setAccountFilter(e.target.value as AccountFilter)}
                            className="text-[11px] font-bold border border-gray-200 rounded-xl px-2 py-1 bg-white text-gray-700 focus:outline-none my-1"
                        >
                            <option value="all">Todas las cuentas</option>
                            <option value="biocambio360">Biocambio360 (+57 324…)</option>
                            <option value="totalLimpieza">Total Limpieza (+57 323…)</option>
                        </select>
                    </div>
                )}
            </div>

            {/* Main content area */}
            <div className="flex flex-1 overflow-hidden">
                {/* ── Left: Conversation list ───────────────────────────────── */}
                <div className={`
                    w-full lg:w-72 xl:w-80 border-r border-gray-100 bg-white flex flex-col shrink-0
                    ${!showMobileList ? 'hidden lg:flex' : 'flex'}
                `}>
                    {/* Search + status filter */}
                    <div className="p-3 space-y-2 border-b border-gray-50">
                        <div className="relative">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Buscar conversación..."
                                className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-green-400"
                            />
                        </div>

                        <div className="flex gap-1 overflow-x-auto pb-0.5">
                            {STATUS_FILTERS.map(f => (
                                <button
                                    key={f.key}
                                    onClick={() => setStatusFilter(f.key)}
                                    className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg whitespace-nowrap transition-colors ${
                                        statusFilter === f.key
                                            ? 'bg-green-100 text-green-700'
                                            : 'text-gray-500 hover:bg-gray-100'
                                    }`}
                                >
                                    {f.icon}
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Conversation count */}
                    <div className="px-4 py-1.5 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            {filteredConversations.length}{hasMore ? '+' : ''} conversaciones
                        </span>
                        {loading && (
                            <RefreshCw size={11} className="text-gray-400 animate-spin" />
                        )}
                    </div>

                    {/* Conversation list */}
                    <div className="flex-1 overflow-y-auto">
                        <ConversationList
                            conversations={filteredConversations}
                            selectedId={selectedConv?.id ?? null}
                            onSelect={handleSelectConversation}
                            loading={loading}
                            hasMore={hasMore}
                            loadingMore={loadingMore}
                            onLoadMore={loadMore}
                        />
                    </div>
                </div>

                {/* ── Center: Chat window ────────────────────────────────────── */}
                <div className={`
                    flex-1 flex flex-col overflow-hidden
                    ${showMobileList ? 'hidden lg:flex' : 'flex'}
                `}>
                    {/* Status change toolbar (for selected conv) */}
                    {selectedConv && canModerate && (
                        <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Estado:</span>
                            {(['abierto', 'asignado', 'cerrado'] as ConversationStatus[]).map(s => (
                                <button
                                    key={s}
                                    onClick={() => handleStatusChange(s)}
                                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-colors cursor-pointer ${
                                        selectedConv.status === s
                                            ? s === 'abierto'
                                                ? 'bg-green-600 text-white border-green-600 shadow-sm'
                                                : s === 'asignado'
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                : 'bg-gray-700 text-white border-gray-700 shadow-sm'
                                            : 'text-gray-500 border-transparent hover:bg-gray-100'
                                    }`}
                                >
                                    {selectedConv.status === s ? '✓ ' : ''}{s.charAt(0).toUpperCase() + s.slice(1)}
                                </button>
                            ))}
                            {/* Mobile: back to list */}
                            <button
                                onClick={() => setShowMobileList(true)}
                                className="ml-auto lg:hidden flex items-center gap-1 text-xs text-gray-500"
                            >
                                <ArrowLeft size={14} />
                                Volver
                            </button>
                        </div>
                    )}

                    <ChatWindow
                        conversation={selectedConv}
                        onOpenTemplates={() => setIsTemplateModalOpen(true)}
                        currentUserName={userProfile?.nombre ?? user?.email ?? undefined}
                    />
                </div>

                {/* ── Right: Contact panel ───────────────────────────────────── */}
                {showContactPanel && (
                    <div className="hidden xl:flex w-96 border-l border-gray-100 bg-white flex-col overflow-hidden">
                        <ContactPanel
                            conversation={selectedConv}
                            canAssign={canAssign}
                            advisors={advisors}
                            onAssign={handleAssign}
                            onAutoAssign={handleAutoAssign}
                        />
                    </div>
                )}
            </div>

            {/* Template picker modal */}
            <TemplatePickerModal
                isOpen={isTemplateModalOpen}
                onClose={() => setIsTemplateModalOpen(false)}
                conversation={selectedConv}
                wabaId={process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_ACCOUNT_ID}
            />
        </div>
    );
}
