'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import {
    subscribeToConversations,
    subscribeToUnreadCount,
    setConversationStatus,
    markConversationAsRead,
} from '@/lib/inbox-service';
import ConversationList from '@/components/admin/inbox/ConversationList';
import ChatWindow from '@/components/admin/inbox/ChatWindow';
import ContactPanel from '@/components/admin/inbox/ContactPanel';
import TemplatePickerModal from '@/components/admin/inbox/TemplatePickerModal';
import WhatsAppAlertsBanner from '@/components/admin/inbox/WhatsAppAlertsBanner';
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

// ─── Page Component ───────────────────────────────────────────────────────────

export default function InboxPage() {
    const { user, role, userProfile } = useAuth();
    const router = useRouter();

    // Conversations state
    const [conversations, setConversations] = useState<ConversationDoc[]>([]);
    const [selectedConv, setSelectedConv] = useState<ConversationDoc | null>(null);
    const [loading, setLoading] = useState(true);
    const [totalUnread, setTotalUnread] = useState(0);

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
    useEffect(() => {
        setLoading(true);
        const unsub = subscribeToConversations((convs) => {
            setConversations(convs);
            setLoading(false);
        });
        return unsub;
    }, []);

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
        return conversations.filter(conv => {
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
    }, [conversations, channelFilter, statusFilter, accountFilter, searchQuery]);

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
        setSelectedConv(conv);
        setShowMobileList(false);
        markConversationAsRead(conv.id).catch(() => {});
    }, []);

    const handleAssign = useCallback(async (advisorUid: string) => {
        if (!selectedConv) return;
        const u = auth.currentUser;
        if (!u) return;
        const token = await u.getIdToken();
        await fetch('/api/inbox/assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ conversationId: selectedConv.id, advisorUid, mode: 'manual' }),
        });
        // Refresh workloads
        const res = await fetch('/api/inbox/assign', { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            const data = await res.json();
            setAdvisors(data.workloads ?? []);
        }
    }, [selectedConv]);

    const handleAutoAssign = useCallback(async () => {
        if (!selectedConv) return;
        const u = auth.currentUser;
        if (!u) return;
        const token = await u.getIdToken();
        await fetch('/api/inbox/assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                conversationId: selectedConv.id,
                contactPhone: selectedConv.contactPhone,
                mode: 'auto',
            }),
        });
    }, [selectedConv]);

    const handleStatusChange = useCallback(async (status: ConversationStatus) => {
        if (!selectedConv) return;
        await setConversationStatus(selectedConv.id, status);
    }, [selectedConv]);

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
                            {filteredConversations.length} conversaciones
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
                                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors ${
                                        selectedConv.status === s
                                            ? 'bg-green-100 text-green-700'
                                            : 'text-gray-500 hover:bg-gray-100'
                                    }`}
                                >
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
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
                    <div className="hidden xl:flex w-72 border-l border-gray-100 bg-white flex-col overflow-hidden">
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
