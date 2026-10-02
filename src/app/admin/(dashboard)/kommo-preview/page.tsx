'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, Loader2, RefreshCw, Search, ChevronLeft, ChevronRight, Users, UserPlus, Eye, EyeOff, ShoppingBag, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import FastOrderModal from '@/components/admin/FastOrderModal';
import { StatCard, Button } from '@/components/ui';

interface PreviewMeta {
    totalContacts: number;
    matched: number;
    unmatched: number;
    noPhone: number;
    withEtapa: number;
    withLocalidad: number;
    withDireccion: number;
    withObservacion: number;
    withApellido: number;
    withCedula?: number;
    withTipoCliente?: number;
    withTelefono2?: number;
    matchedByTelefono2?: number;
    withLeadNota?: number;
    unsortedChats?: number;
    unmatchedPendientes?: number;
}

interface MatchedItem {
    id: string;
    kommoContactId: string;
    kommoContactIdNum: number;
    customerId: string;
    celular: string;
    emparejadoPorTelefono2?: boolean;
    clienteActualNombre: string;
    clienteActualDireccion: string;
    clienteActualCiudad: string;
    clienteActualExternalTags: string[];
    clienteActualTotalSpent: number;
    clienteActualOrdersCount: number;
    kommoNombre: string;
    kommoApellido: string;
    kommoEtiquetasNuevas: string[];
    kommoEtapa: string;
    kommoLocalidad: string;
    kommoDireccion: string;
    kommoObservacion: string;
    kommoTipoCliente?: string;
    kommoCedula?: string;
    kommoLeadNota?: string;
}

interface UnmatchedItem {
    id: string;
    kommoContactId: string;
    kommoContactIdNum: number;
    nombre: string;
    apellido: string;
    celular: string;
    etiquetas: string[];
    etapa: string;
    localidad: string;
    direccion: string;
    observacion: string;
    tipoCliente?: string;
    cedula?: string;
    leadNota?: string;
    revisadoManualmente?: boolean;
    revisadoPor?: string;
}

const PAGE_SIZE = 50;
const ALLOWED_EMAILS = new Set(['fernando@biocambio360.com', 'diego@biocambio360.com']);

// Debe reflejar las mismas claves que FILTER_FIELD_MAP en /api/admin/kommo-preview/route.ts
const FIELD_FILTER_LABELS: Record<string, string> = {
    apellido: 'Apellido',
    etapa: 'Etapa',
    localidad: 'Localidad',
    direccion: 'Dirección',
    observacion: 'Observación',
    tipoCliente: 'Tipo de cliente',
    cedula: 'Cédula',
    leadNota: 'Nota de Lead',
    matchedByTelefono2: 'Emparejado solo por Teléfono 2',
    sinCelular: 'Sin celular utilizable',
    seguimiento: 'Observación o Nota de Seguimiento',
};

interface FilterRow {
    id: string;
    _source: 'matched' | 'unmatched';
    [key: string]: unknown;
}

export default function KommoPreviewPage() {
    const router = useRouter();
    const { user, userProfile, role, loading: authLoading } = useAuth();
    const email = (user?.email || userProfile?.email || '').toLowerCase();
    const isAllowed = role === 'superadmin' || ALLOWED_EMAILS.has(email);

    const [tab, setTab] = useState<'matched' | 'unmatched'>('matched');
    const [items, setItems] = useState<Array<MatchedItem | UnmatchedItem>>([]);
    const [meta, setMeta] = useState<PreviewMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cursorStack, setCursorStack] = useState<Array<number | null>>([null]);
    const [pageIndex, setPageIndex] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [activeSearch, setActiveSearch] = useState('');
    const [hideReviewed, setHideReviewed] = useState(true);
    const [markingId, setMarkingId] = useState<string | null>(null);
    const [isFastOrderOpen, setIsFastOrderOpen] = useState(false);
    const [preloadedCustomer, setPreloadedCustomer] = useState<{ nombre: string; celular: string; direccion?: string } | null>(null);
    const [activeFilterKey, setActiveFilterKey] = useState<string | null>(null);
    // meta.withObservacion/meta.noPhone vienen del resumen de la última corrida del script (campos
    // crudos, sin combinar) -- se recalculan aquí con el conteo real y deduplicado que usa el modal,
    // para que la tarjeta no muestre un número más bajo/engañoso que lo que el modal realmente tiene.
    const [seguimientoTotal, setSeguimientoTotal] = useState<number | null>(null);
    const [sinCelularTotal, setSinCelularTotal] = useState<number | null>(null);

    const fetchPage = useCallback(async (cursor: number | null, search: string) => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const idToken = await user.getIdToken();
            const params = new URLSearchParams({ tab, pageSize: String(PAGE_SIZE) });
            if (cursor !== null) params.set('cursor', String(cursor));
            if (search) params.set('search', search);
            const res = await fetch(`/api/admin/kommo-preview?${params.toString()}`, {
                headers: { Authorization: `Bearer ${idToken}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error cargando la revisión');
            setItems(data.items || []);
            setHasMore(!!data.hasMore);
            if (data.meta) setMeta(data.meta);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error cargando la revisión');
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [tab, user]);

    // Reset paginación al cambiar de pestaña o al buscar
    useEffect(() => {
        if (authLoading || !isAllowed || !user) return;
        setCursorStack([null]);
        setPageIndex(0);
        fetchPage(null, activeSearch);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, activeSearch, authLoading, isAllowed, user]);

    // Totales reales (deduplicados) para las tarjetas "Sin celular" y "Con Observación/Nota" --
    // una sola vez al entrar, independiente de la paginación/búsqueda de la tabla principal.
    useEffect(() => {
        if (authLoading || !isAllowed || !user) return;
        (async () => {
            try {
                const idToken = await user.getIdToken();
                const [seguimientoRes, sinCelularRes] = await Promise.all([
                    fetch('/api/admin/kommo-preview?filter=seguimiento', { headers: { Authorization: `Bearer ${idToken}` } }),
                    fetch('/api/admin/kommo-preview?filter=sinCelular', { headers: { Authorization: `Bearer ${idToken}` } }),
                ]);
                const [seguimientoData, sinCelularData] = await Promise.all([seguimientoRes.json(), sinCelularRes.json()]);
                if (seguimientoRes.ok) setSeguimientoTotal(seguimientoData.filterTotal);
                if (sinCelularRes.ok) setSinCelularTotal(sinCelularData.filterTotal);
            } catch {
                // Si falla, las tarjetas simplemente muestran el número crudo del resumen -- no bloquea la pantalla.
            }
        })();
    }, [authLoading, isAllowed, user]);

    const goNext = () => {
        const last = items[items.length - 1];
        const nextCursor = last?.kommoContactIdNum ?? null;
        if (nextCursor === null) return;
        const newStack = [...cursorStack.slice(0, pageIndex + 1), nextCursor];
        setCursorStack(newStack);
        setPageIndex(pageIndex + 1);
        fetchPage(nextCursor, activeSearch);
    };

    const goPrev = () => {
        if (pageIndex === 0) return;
        const prevCursor = cursorStack[pageIndex - 1];
        setPageIndex(pageIndex - 1);
        fetchPage(prevCursor, activeSearch);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setActiveSearch(searchInput.trim());
    };

    const clearSearch = () => {
        setSearchInput('');
        setActiveSearch('');
    };

    const handleMarkReviewed = async (kommoContactId: string, value: boolean) => {
        if (!user) return;
        setMarkingId(kommoContactId);
        try {
            const idToken = await user.getIdToken();
            await fetch('/api/admin/kommo-preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ kommoContactId, revisadoManualmente: value }),
            });
            setItems(prev => prev.map(it => (it as UnmatchedItem).kommoContactId === kommoContactId
                ? { ...it, revisadoManualmente: value } as UnmatchedItem
                : it));
        } finally {
            setMarkingId(null);
        }
    };

    const handleCreateCustomer = (it: UnmatchedItem) => {
        setPreloadedCustomer({ nombre: it.nombre || '', celular: it.celular || '', direccion: it.direccion || '' });
        setIsFastOrderOpen(true);
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-gray-400" size={28} />
            </div>
        );
    }

    if (!isAllowed) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-md p-8 max-w-sm text-center space-y-3">
                    <AlertCircle className="mx-auto text-amber-500" size={32} />
                    <p className="font-black text-gray-900">Acceso restringido</p>
                    <p className="text-sm text-gray-500">
                        La revisión de migración de Kommo es solo para superadministradores, Fernando y Diego.
                    </p>
                    <button onClick={() => router.push('/admin')} className="mt-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold cursor-pointer">
                        Volver al panel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push('/admin')} className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 cursor-pointer">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Migración Kommo</div>
                            <h1 className="text-xl font-black text-slate-900">Revisión antes de --execute</h1>
                        </div>
                    </div>
                    <Button
                        variant="secondary"
                        onClick={() => fetchPage(cursorStack[pageIndex], activeSearch)}
                        icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
                    >
                        Recargar
                    </Button>
                </div>
            </header>

            <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 space-y-5">
                {meta && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-3">
                        <StatCard label="Contactos Kommo" value={meta.totalContacts} />
                        <StatCard label="Se agrega a existentes" value={meta.matched} color="emerald" onClick={() => setTab('matched')} />
                        <StatCard label="Para revisión (nuevo)" value={meta.unmatched} color="amber" onClick={() => setTab('unmatched')} />
                        <StatCard label="Pendientes de revisar" value={meta.unmatchedPendientes ?? meta.unmatched} color="amber" onClick={() => setTab('unmatched')} />
                        <StatCard label="Sin celular" value={sinCelularTotal ?? meta.noPhone} onClick={() => setActiveFilterKey('sinCelular')} />
                        <StatCard label="Con Apellido" value={meta.withApellido} onClick={() => setActiveFilterKey('apellido')} />
                        <StatCard label="Con Etapa" value={meta.withEtapa} onClick={() => setActiveFilterKey('etapa')} />
                        <StatCard label="Con Localidad" value={meta.withLocalidad} onClick={() => setActiveFilterKey('localidad')} />
                        <StatCard label="Con Dirección" value={meta.withDireccion} onClick={() => setActiveFilterKey('direccion')} />
                        <StatCard label="Con Observación o Nota" value={seguimientoTotal ?? meta.withObservacion} color="indigo" onClick={() => setActiveFilterKey('seguimiento')} hint="Observación de contacto + nota/nota 1 del lead" />
                        <StatCard label="Con Tipo de cliente" value={meta.withTipoCliente || 0} onClick={() => setActiveFilterKey('tipoCliente')} />
                        <StatCard label="Con Cédula" value={meta.withCedula || 0} onClick={() => setActiveFilterKey('cedula')} />
                        <StatCard label="Con Teléfono 2" value={meta.withTelefono2 || 0} />
                        <StatCard label="Match solo por Tel. 2" value={meta.matchedByTelefono2 || 0} onClick={() => setActiveFilterKey('matchedByTelefono2')} />
                        <StatCard label="Con Nota de Lead" value={meta.withLeadNota || 0} onClick={() => setActiveFilterKey('leadNota')} />
                        <StatCard label="Chats sin clasificar" value={meta.unsortedChats || 0} color="amber" />
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setTab('matched')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                                tab === 'matched' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                            <Users size={14} />
                            Se agregará a clientes existentes{meta ? ` (${meta.matched.toLocaleString('es-CO')})` : ''}
                        </button>
                        <button
                            onClick={() => setTab('unmatched')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                                tab === 'unmatched' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                            <UserPlus size={14} />
                            Contactos nuevos para revisión{meta ? ` (${meta.unmatched.toLocaleString('es-CO')})` : ''}
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        {tab === 'unmatched' && (
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={hideReviewed}
                                    onChange={(e) => setHideReviewed(e.target.checked)}
                                    className="cursor-pointer"
                                />
                                Ocultar ya revisados
                            </label>
                        )}
                        <form onSubmit={handleSearch} className="flex items-center gap-2">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    placeholder="Buscar por celular exacto..."
                                    className="pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs w-56 focus:outline-hidden"
                                />
                            </div>
                            <Button type="submit">Buscar</Button>
                            {activeSearch && (
                                <Button type="button" variant="secondary" onClick={clearSearch}>Limpiar</Button>
                            )}
                        </form>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
                )}

                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        {tab === 'matched' ? (
                            <MatchedTable items={items as MatchedItem[]} loading={loading} />
                        ) : (
                            <UnmatchedTable
                                items={(items as UnmatchedItem[]).filter(it => !hideReviewed || !it.revisadoManualmente)}
                                loading={loading}
                                markingId={markingId}
                                onMarkReviewed={handleMarkReviewed}
                                onCreateCustomer={handleCreateCustomer}
                            />
                        )}
                    </div>

                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/60">
                        <span className="text-xs text-slate-500">
                            Página {pageIndex + 1} · {items.length} registros en esta página · {PAGE_SIZE} por página
                        </span>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={goPrev} disabled={pageIndex === 0 || loading} icon={<ChevronLeft size={14} />}>
                                Anterior
                            </Button>
                            <Button variant="ghost" size="sm" onClick={goNext} disabled={!hasMore || loading}>
                                Siguiente <ChevronRight size={14} />
                            </Button>
                        </div>
                    </div>
                </div>
            </main>

            <FastOrderModal
                isOpen={isFastOrderOpen}
                onClose={() => { setIsFastOrderOpen(false); setPreloadedCustomer(null); }}
                preloadedCustomer={preloadedCustomer || undefined}
            />

            {activeFilterKey && (
                <FieldCoverageModal
                    filterKey={activeFilterKey}
                    label={FIELD_FILTER_LABELS[activeFilterKey] || activeFilterKey}
                    onClose={() => setActiveFilterKey(null)}
                />
            )}
        </div>
    );
}

function FieldCoverageModal({ filterKey, label, onClose }: { filterKey: string; label: string; onClose: () => void }) {
    const { user } = useAuth();
    const [rows, setRows] = useState<FilterRow[]>([]);
    const [total, setTotal] = useState(0);
    const [truncated, setTruncated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!user) return;
            setLoading(true);
            setError(null);
            try {
                const idToken = await user.getIdToken();
                const res = await fetch(`/api/admin/kommo-preview?filter=${encodeURIComponent(filterKey)}`, {
                    headers: { Authorization: `Bearer ${idToken}` },
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Error cargando el filtro');
                if (cancelled) return;
                setRows(data.filterRows || []);
                setTotal(data.filterTotal || 0);
                setTruncated(!!data.truncated);
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Error cargando el filtro');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [filterKey, user]);

    const fieldFor = (row: FilterRow) => {
        // matchedByTelefono2 no sigue el patrón kommo<Capitalizado> -- su campo real es emparejadoPorTelefono2
        // (debe reflejar FILTER_FIELD_MAP en /api/admin/kommo-preview/route.ts)
        const candidates = filterKey === 'matchedByTelefono2'
            ? ['emparejadoPorTelefono2']
            : [`kommo${filterKey.charAt(0).toUpperCase()}${filterKey.slice(1)}`, filterKey];
        for (const key of candidates) {
            const val = row[key];
            if (typeof val === 'string' && val.trim()) return val;
            if (typeof val === 'boolean') return val ? 'Sí' : 'No';
        }
        return '—';
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Cobertura de campo</p>
                        <h2 className="font-black text-lg">Con {label}{!loading ? ` · ${total.toLocaleString('es-CO')}` : ''}</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer">
                        <X size={18} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1">
                    {loading ? (
                        <div className="py-16 flex items-center justify-center">
                            <Loader2 className="animate-spin text-slate-300" size={24} />
                        </div>
                    ) : error ? (
                        <div className="p-6 text-sm text-red-600">{error}</div>
                    ) : rows.length === 0 ? (
                        <div className="p-6 text-sm text-slate-400 text-center">Sin registros para este filtro.</div>
                    ) : filterKey === 'seguimiento' ? (
                        <table className="w-full text-left text-xs text-slate-600">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider sticky top-0">
                                <tr>
                                    <th className="px-4 py-2.5">Kommo ID</th>
                                    <th className="px-4 py-2.5">Fuente</th>
                                    <th className="px-4 py-2.5">Celular</th>
                                    <th className="px-4 py-2.5">Observación (contacto)</th>
                                    <th className="px-4 py-2.5">Nota de Lead (nota + nota 1)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rows.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50/80">
                                        <td className="px-4 py-2 font-mono text-slate-400">#{row.kommoContactId as string}</td>
                                        <td className="px-4 py-2">
                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${row._source === 'matched' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                                                {row._source === 'matched' ? 'Existente' : 'Nuevo'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 font-mono">{(row.celular as string) || '—'}</td>
                                        <td className="px-4 py-2 max-w-[260px] truncate" title={(row._observacion as string) || ''}>{(row._observacion as string) || '—'}</td>
                                        <td className="px-4 py-2 max-w-[260px] truncate" title={(row._leadNota as string) || ''}>{(row._leadNota as string) || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : filterKey === 'sinCelular' ? (
                        <table className="w-full text-left text-xs text-slate-600">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider sticky top-0">
                                <tr>
                                    <th className="px-4 py-2.5">Kommo ID</th>
                                    <th className="px-4 py-2.5">Nombre</th>
                                    <th className="px-4 py-2.5">Apellido</th>
                                    <th className="px-4 py-2.5">Etapa</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rows.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50/80">
                                        <td className="px-4 py-2 font-mono text-slate-400">#{row.kommoContactId as string}</td>
                                        <td className="px-4 py-2">{(row.kommoNombre as string) || (row.nombre as string) || '—'}</td>
                                        <td className="px-4 py-2">{(row.kommoApellido as string) || (row.apellido as string) || '—'}</td>
                                        <td className="px-4 py-2">{(row.etapa as string) || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-left text-xs text-slate-600">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider sticky top-0">
                                <tr>
                                    <th className="px-4 py-2.5">Kommo ID</th>
                                    <th className="px-4 py-2.5">Fuente</th>
                                    <th className="px-4 py-2.5">Celular</th>
                                    <th className="px-4 py-2.5">{label}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rows.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50/80">
                                        <td className="px-4 py-2 font-mono text-slate-400">#{row.kommoContactId as string}</td>
                                        <td className="px-4 py-2">
                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${row._source === 'matched' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                                                {row._source === 'matched' ? 'Existente' : 'Nuevo'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 font-mono">{(row.celular as string) || '—'}</td>
                                        <td className="px-4 py-2 max-w-[320px] truncate" title={fieldFor(row)}>{fieldFor(row)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {truncated && (
                    <div className="px-5 py-2.5 border-t border-slate-100 bg-amber-50 text-amber-800 text-[11px] font-bold">
                        Mostrando los primeros {rows.length} de {total.toLocaleString('es-CO')} registros.
                    </div>
                )}
            </div>
        </div>
    );
}


function TagPills({ tags }: { tags?: string[] }) {
    if (!tags || tags.length === 0) return <span className="text-slate-300">—</span>;
    return (
        <div className="flex flex-wrap gap-1 max-w-[220px]">
            {tags.map((t, i) => (
                <span key={i} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{t}</span>
            ))}
        </div>
    );
}

function EmptyOrLoading({ loading, colSpan, emptyText }: { loading: boolean; colSpan: number; emptyText: string }) {
    if (loading) {
        return (
            <tr>
                <td colSpan={colSpan} className="py-10 text-center">
                    <Loader2 className="animate-spin text-slate-300 mx-auto" size={22} />
                </td>
            </tr>
        );
    }
    return (
        <tr>
            <td colSpan={colSpan} className="py-10 text-center text-sm text-slate-400">{emptyText}</td>
        </tr>
    );
}

function MatchedTable({ items, loading }: { items: MatchedItem[]; loading: boolean }) {
    return (
        <table className="w-full text-left text-xs text-slate-600 min-w-[2100px]">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider sticky top-0">
                <tr>
                    <th className="px-3 py-3">Kommo ID</th>
                    <th className="px-3 py-3">Celular</th>
                    <th className="px-3 py-3">Cliente actual (existe hoy)</th>
                    <th className="px-3 py-3">Dirección actual</th>
                    <th className="px-3 py-3">Ciudad actual</th>
                    <th className="px-3 py-3">Compras / $ actual</th>
                    <th className="px-3 py-3">Etiquetas actuales</th>
                    <th className="px-3 py-3 bg-emerald-50">+ Nombre (Kommo)</th>
                    <th className="px-3 py-3 bg-emerald-50">+ Apellido (Kommo)</th>
                    <th className="px-3 py-3 bg-emerald-50">+ Etapa</th>
                    <th className="px-3 py-3 bg-emerald-50">+ Localidad</th>
                    <th className="px-3 py-3 bg-emerald-50">+ Dirección (Kommo)</th>
                    <th className="px-3 py-3 bg-emerald-50">+ Observación</th>
                    <th className="px-3 py-3 bg-emerald-50">+ Tipo de cliente</th>
                    <th className="px-3 py-3 bg-emerald-50">+ Cédula</th>
                    <th className="px-3 py-3 bg-emerald-50">+ Nota de Lead</th>
                    <th className="px-3 py-3 bg-emerald-50">+ Etiquetas nuevas</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                    <EmptyOrLoading loading={loading} colSpan={17} emptyText="No hay más registros en esta página." />
                ) : (
                    items.map((it) => (
                        <tr key={it.id} className="hover:bg-slate-50/80">
                            <td className="px-3 py-2.5 font-mono text-slate-400">#{it.kommoContactId}</td>
                            <td className="px-3 py-2.5 font-mono">
                                {it.celular || '—'}
                                {it.emparejadoPorTelefono2 && (
                                    <span className="ml-1 text-[9px] font-black bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded">Tel. 2</span>
                                )}
                            </td>
                            <td className="px-3 py-2.5">
                                <div className="font-bold text-slate-900">{it.clienteActualNombre || '—'}</div>
                                <div className="text-[10px] text-slate-400 font-mono">id: {it.customerId}</div>
                            </td>
                            <td className="px-3 py-2.5 max-w-[220px] truncate" title={it.clienteActualDireccion}>{it.clienteActualDireccion || '—'}</td>
                            <td className="px-3 py-2.5">{it.clienteActualCiudad || '—'}</td>
                            <td className="px-3 py-2.5">{it.clienteActualOrdersCount} · ${it.clienteActualTotalSpent?.toLocaleString('es-CO')}</td>
                            <td className="px-3 py-2.5"><TagPills tags={it.clienteActualExternalTags} /></td>
                            <td className="px-3 py-2.5 bg-emerald-50/40 font-semibold">{it.kommoNombre || <span className="text-slate-300 font-normal">—</span>}</td>
                            <td className="px-3 py-2.5 bg-emerald-50/40 font-semibold">{it.kommoApellido || <span className="text-slate-300 font-normal">—</span>}</td>
                            <td className="px-3 py-2.5 bg-emerald-50/40">{it.kommoEtapa || <span className="text-slate-300">—</span>}</td>
                            <td className="px-3 py-2.5 bg-emerald-50/40">{it.kommoLocalidad || <span className="text-slate-300">—</span>}</td>
                            <td className="px-3 py-2.5 bg-emerald-50/40 max-w-[220px] truncate" title={it.kommoDireccion}>{it.kommoDireccion || <span className="text-slate-300">—</span>}</td>
                            <td className="px-3 py-2.5 bg-emerald-50/40 max-w-[220px] truncate" title={it.kommoObservacion}>{it.kommoObservacion || <span className="text-slate-300">—</span>}</td>
                            <td className="px-3 py-2.5 bg-emerald-50/40">{it.kommoTipoCliente || <span className="text-slate-300">—</span>}</td>
                            <td className="px-3 py-2.5 bg-emerald-50/40 font-mono">{it.kommoCedula || <span className="text-slate-300">—</span>}</td>
                            <td className="px-3 py-2.5 bg-emerald-50/40 max-w-[220px] truncate" title={it.kommoLeadNota}>{it.kommoLeadNota || <span className="text-slate-300">—</span>}</td>
                            <td className="px-3 py-2.5 bg-emerald-50/40"><TagPills tags={it.kommoEtiquetasNuevas} /></td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
    );
}

function UnmatchedTable({
    items, loading, markingId, onMarkReviewed, onCreateCustomer,
}: {
    items: UnmatchedItem[];
    loading: boolean;
    markingId: string | null;
    onMarkReviewed: (kommoContactId: string, value: boolean) => void;
    onCreateCustomer: (it: UnmatchedItem) => void;
}) {
    return (
        <table className="w-full text-left text-xs text-slate-600 min-w-[1800px]">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider sticky top-0">
                <tr>
                    <th className="px-3 py-3">Acciones</th>
                    <th className="px-3 py-3">Kommo ID</th>
                    <th className="px-3 py-3">Nombre completo (Kommo)</th>
                    <th className="px-3 py-3">Apellido</th>
                    <th className="px-3 py-3">Celular</th>
                    <th className="px-3 py-3">Etapa</th>
                    <th className="px-3 py-3">Localidad</th>
                    <th className="px-3 py-3">Dirección</th>
                    <th className="px-3 py-3">Observación</th>
                    <th className="px-3 py-3">Tipo de cliente</th>
                    <th className="px-3 py-3">Cédula</th>
                    <th className="px-3 py-3">Nota de Lead</th>
                    <th className="px-3 py-3">Etiquetas</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                    <EmptyOrLoading loading={loading} colSpan={13} emptyText="No hay más registros en esta página." />
                ) : (
                    items.map((it) => (
                        <tr key={it.id} className={`hover:bg-slate-50/80 ${it.revisadoManualmente ? 'opacity-50' : ''}`}>
                            <td className="px-3 py-2.5">
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => onMarkReviewed(it.kommoContactId, !it.revisadoManualmente)}
                                        disabled={markingId === it.kommoContactId}
                                        title={it.revisadoManualmente ? 'Revisado -- clic para volver a pendiente (solo este registro)' : 'Marcar este registro como revisado'}
                                        className={`p-1.5 rounded-lg cursor-pointer disabled:opacity-40 ${
                                            it.revisadoManualmente ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                        }`}
                                    >
                                        {it.revisadoManualmente ? <Eye size={13} /> : <EyeOff size={13} />}
                                    </button>
                                    <button
                                        onClick={() => onCreateCustomer(it)}
                                        title="Crear pedido/cliente con los datos de ESTE registro (no afecta a otros)"
                                        className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 cursor-pointer"
                                    >
                                        <ShoppingBag size={13} />
                                    </button>
                                </div>
                            </td>
                            <td className="px-3 py-2.5 font-mono text-slate-400">#{it.kommoContactId}</td>
                            <td className="px-3 py-2.5 font-bold text-slate-900">{it.nombre || '—'}</td>
                            <td className="px-3 py-2.5">{it.apellido || '—'}</td>
                            <td className="px-3 py-2.5 font-mono">{it.celular || '—'}</td>
                            <td className="px-3 py-2.5">{it.etapa || '—'}</td>
                            <td className="px-3 py-2.5">{it.localidad || '—'}</td>
                            <td className="px-3 py-2.5 max-w-[220px] truncate" title={it.direccion}>{it.direccion || '—'}</td>
                            <td className="px-3 py-2.5 max-w-[220px] truncate" title={it.observacion}>{it.observacion || '—'}</td>
                            <td className="px-3 py-2.5">{it.tipoCliente || '—'}</td>
                            <td className="px-3 py-2.5 font-mono">{it.cedula || '—'}</td>
                            <td className="px-3 py-2.5 max-w-[220px] truncate" title={it.leadNota}>{it.leadNota || '—'}</td>
                            <td className="px-3 py-2.5"><TagPills tags={it.etiquetas} /></td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
    );
}
