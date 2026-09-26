'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Lock, MapPin, Plus, Search, Trash2, Truck, X } from 'lucide-react';
import { db } from '@/lib/firebase';
import { SEED_ROUTES } from '@/lib/delivery-routes-seed';
import { formatDayEs, matchZones, monthName, nextRouteDates, routesOn, weekdayName, type DeliveryRoute } from '@/lib/delivery-schedule';

const COLORS = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500', 'bg-violet-500', 'bg-teal-500', 'bg-orange-500', 'bg-pink-500', 'bg-lime-600'];
const bogotaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
const daysInMonth = (ym: string) => new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).getUTCDate();
const shiftMonth = (ym: string, n: number) => {
    const d = new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1 + n, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
const monthLabel = (ym: string) => `${monthName(Number(ym.slice(5, 7)) - 1)} ${ym.slice(0, 4)}`;

const EMPTY: DeliveryRoute = { id: '', name: '', zones: [], mode: 'dates', weekdays: [], dates: {}, active: true };

export default function RutasEntregaPage() {
    const router = useRouter();
    const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(bogotaToday().slice(0, 7));
    const [selectedDay, setSelectedDay] = useState<string | null>(bogotaToday());
    const [editing, setEditing] = useState<DeliveryRoute | null>(null);
    const [zoneQuery, setZoneQuery] = useState('');

    useEffect(
        () =>
            onSnapshot(
                collection(db, 'delivery_routes'),
                snap => {
                    setRoutes(snap.docs.map(d => ({ ...(d.data() as Omit<DeliveryRoute, 'id'>), id: d.id })).sort((a, b) => a.name.localeCompare(b.name)));
                    setLoading(false);
                },
                () => setLoading(false)
            ),
        []
    );

    const colorOf = useMemo(() => {
        const map = new Map<string, string>();
        routes.forEach((r, i) => map.set(r.id, COLORS[i % COLORS.length]));
        return (id: string) => map.get(id) ?? 'bg-slate-400';
    }, [routes]);

    // Calendar cells (weeks start on Monday)
    const cells = useMemo(() => {
        const first = `${month}-01`;
        const offset = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7;
        const total = daysInMonth(month);
        return [...Array(offset).fill(null), ...Array.from({ length: total }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)];
    }, [month]);

    const today = bogotaToday();
    const dayRoutes = selectedDay ? routesOn(routes, selectedDay) : [];

    // "What the agent would answer" for a zone
    const zoneAnswer = useMemo(() => {
        if (!zoneQuery.trim()) return null;
        const matches = matchZones(routes, zoneQuery);
        if (matches.length === 0) return { none: true as const, lines: [] as string[] };
        const seen = new Set<string>();
        const lines: string[] = [];
        for (const { zone, route } of matches) {
            const key = `${route.id}|${zone}`;
            if (seen.has(key)) continue;
            seen.add(key);
            const dates = nextRouteDates(route, today, 2);
            lines.push(route.mode === 'daily' ? `Tenemos entregas todos los días para tu zona: ${zone}.` : dates.length ? `Para el día ${dates.map(formatDayEs).join(' y el ')} tenemos programada entrega para tu zona: ${zone}.` : `Por ahora no hay entregas programadas para tu zona: ${zone}.`);
        }
        return { none: false as const, lines };
    }, [zoneQuery, routes, today]);

    const save = async (route: DeliveryRoute) => {
        const id = route.id || `route_${Date.now().toString(36)}`;
        const { id: _omit, ...data } = route;
        void _omit;
        const clean = JSON.parse(JSON.stringify(data));
        await setDoc(doc(db, 'delivery_routes', id), clean);
        setEditing(null);
    };
    const remove = async (route: DeliveryRoute) => {
        if (!confirm(`¿Eliminar la ruta "${route.name}"?`)) return;
        await deleteDoc(doc(db, 'delivery_routes', route.id));
    };
    const loadSeed = async () => {
        if (!confirm('Se cargarán las rutas del formato impreso de septiembre 2026 (puedes editarlas después). ¿Continuar?')) return;
        for (const r of SEED_ROUTES) {
            const { id, ...data } = r;
            await setDoc(doc(db, 'delivery_routes', id), JSON.parse(JSON.stringify(data)));
        }
    };

    return (
        <div className="space-y-5 pb-16 max-w-7xl mx-auto px-4 sm:px-6 pt-6 overflow-x-clip">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-100 pb-4">
                <div>
                    <button onClick={() => router.push('/admin')} className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1 mb-2 cursor-pointer">
                        <ArrowLeft size={14} /> Volver al Dashboard
                    </button>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-2">
                        <Truck className="text-indigo-600" size={28} /> Calendario de entregas — Flota propia
                    </h1>
                    <p className="text-xs text-gray-500 max-w-2xl">
                        Qué zonas cubre cada ruta y en qué días. El agente de IA usa este calendario para responder fechas de entrega (solo zona y fecha con día de la semana; nunca nombres ni teléfonos de mensajeros).
                    </p>
                </div>
                <div className="flex gap-2">
                    {routes.length === 0 && !loading && (
                        <button onClick={loadSeed} className="px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-black cursor-pointer">
                            Cargar formato de septiembre 2026
                        </button>
                    )}
                    <button onClick={() => setEditing({ ...EMPTY })} className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-1 cursor-pointer">
                        <Plus size={14} /> Nueva ruta
                    </button>
                </div>
            </div>

            {/* Zone lookup = what the agent answers */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                    <Search size={15} className="text-gray-400" />
                    <input
                        value={zoneQuery}
                        onChange={e => setZoneQuery(e.target.value)}
                        placeholder="Prueba una zona: Kennedy, Chía, Rafael Uribe…"
                        className="flex-1 text-sm outline-none"
                    />
                </div>
                {zoneAnswer && (
                    <div className="text-xs bg-indigo-50 border border-indigo-100 rounded-xl p-3 space-y-1">
                        <p className="font-bold text-indigo-900">Así respondería el agente:</p>
                        {zoneAnswer.none ? <p className="text-indigo-900">Esa zona no está en el calendario: pregunta la localidad y dice que un asesor confirma.</p> : zoneAnswer.lines.map((l, i) => <p key={i} className="text-indigo-900">• {l}</p>)}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Calendar */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-sm font-black text-gray-900 capitalize"><CalendarDays size={16} className="text-indigo-600" /> {monthLabel(month)}</div>
                        <div className="flex gap-1">
                            <button onClick={() => setMonth(shiftMonth(month, -1))} className="p-1.5 rounded-lg border border-gray-200 cursor-pointer"><ChevronLeft size={14} /></button>
                            <button onClick={() => setMonth(bogotaToday().slice(0, 7))} className="px-2 rounded-lg border border-gray-200 text-xs font-bold cursor-pointer">Hoy</button>
                            <button onClick={() => setMonth(shiftMonth(month, 1))} className="p-1.5 rounded-lg border border-gray-200 cursor-pointer"><ChevronRight size={14} /></button>
                        </div>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-[10px] font-bold text-gray-400 text-center mb-1">
                        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => <div key={d}>{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {cells.map((ymd, i) =>
                            ymd === null ? (
                                <div key={`e${i}`} />
                            ) : (
                                <button
                                    key={ymd}
                                    onClick={() => setSelectedDay(ymd)}
                                    className={`min-h-[64px] rounded-lg border p-1 text-left flex flex-col gap-0.5 cursor-pointer ${selectedDay === ymd ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 hover:border-gray-300'} ${ymd === today ? 'ring-1 ring-indigo-400' : ''}`}
                                >
                                    <span className="text-[11px] font-black text-gray-700">{Number(ymd.slice(8))}</span>
                                    <span className="flex flex-wrap gap-0.5">
                                        {routesOn(routes, ymd).slice(0, 8).map(r => <span key={r.id} className={`w-2 h-2 rounded-full ${colorOf(r.id)}`} title={r.name} />)}
                                    </span>
                                </button>
                            )
                        )}
                    </div>
                </div>

                {/* Day detail */}
                <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
                    <h2 className="text-sm font-black text-gray-900 mb-2 first-letter:uppercase">{selectedDay ? formatDayEs(selectedDay) : 'Selecciona un día'}</h2>
                    {dayRoutes.length === 0 ? (
                        <p className="text-xs text-gray-400">Sin entregas programadas este día.</p>
                    ) : (
                        <ul className="space-y-3">
                            {dayRoutes.map(r => (
                                <li key={r.id} className="text-xs">
                                    <div className="flex items-center gap-1.5 font-bold text-gray-900"><span className={`w-2.5 h-2.5 rounded-full ${colorOf(r.id)}`} />{r.name}</div>
                                    <p className="text-gray-600 mt-0.5"><MapPin size={11} className="inline mr-1 text-gray-400" />{r.zones.join(', ')}</p>
                                    {(r.driverName || r.driverPhone) && <p className="text-[11px] text-amber-700 mt-0.5"><Lock size={10} className="inline mr-1" />Interno: {r.driverName} {r.driverPhone}</p>}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Routes */}
            <div>
                <h2 className="text-sm font-black text-gray-900 mb-2">Rutas ({routes.length})</h2>
                {loading ? (
                    <p className="text-sm text-gray-400">Cargando…</p>
                ) : routes.length === 0 ? (
                    <p className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-2xl p-6 text-center">Aún no hay rutas. Crea una o carga el formato de septiembre 2026.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {routes.map(r => {
                            const monthDays = r.mode === 'dates' ? (r.dates?.[month] ?? []) : [];
                            return (
                                <div key={r.id} className={`bg-white rounded-2xl border p-4 shadow-xs space-y-2 ${r.active ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-1.5 font-black text-sm text-gray-900"><span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colorOf(r.id)}`} />{r.name}</div>
                                        <div className="flex gap-1 shrink-0">
                                            <button onClick={() => setEditing(r)} className="text-[11px] font-bold text-indigo-700 underline cursor-pointer">Editar</button>
                                            <button onClick={() => remove(r)} className="text-gray-400 hover:text-red-600 cursor-pointer"><Trash2 size={13} /></button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-600">{r.zones.join(' · ')}</p>
                                    <p className="text-[11px] font-bold text-indigo-800">
                                        {r.mode === 'daily' ? 'Todos los días' : r.mode === 'weekdays' ? (r.weekdays ?? []).map(weekdayName).join(', ') : monthDays.length ? `${monthLabel(month)}: ${monthDays.join(' · ')}` : `Sin fechas en ${monthLabel(month)}`}
                                        {(r.validFrom || r.validTo) && <span className="ml-1 font-normal text-gray-500">({r.validFrom ?? '…'} a {r.validTo ?? '…'})</span>}
                                    </p>
                                    {(r.driverName || r.driverPhone) && <p className="text-[11px] text-amber-700"><Lock size={10} className="inline mr-1" />{r.driverName} {r.driverPhone}</p>}
                                    {!r.active && <p className="text-[11px] text-gray-500">Ruta inactiva</p>}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {editing && <RouteEditor route={editing} initialMonth={month} onClose={() => setEditing(null)} onSave={save} />}
        </div>
    );
}

// ─── Editor ───────────────────────────────────────────────────────────────────

function RouteEditor({ route, initialMonth, onClose, onSave }: { route: DeliveryRoute; initialMonth: string; onClose: () => void; onSave: (r: DeliveryRoute) => Promise<void> }) {
    const [r, setR] = useState<DeliveryRoute>({ ...route, dates: { ...(route.dates ?? {}) }, weekdays: [...(route.weekdays ?? [])] });
    const [zonesText, setZonesText] = useState(route.zones.join('\n'));
    const [ym, setYm] = useState(initialMonth);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const selected = r.dates?.[ym] ?? [];
    const toggleDay = (d: number) => setR(prev => ({ ...prev, dates: { ...(prev.dates ?? {}), [ym]: selected.includes(d) ? selected.filter(x => x !== d) : [...selected, d].sort((a, b) => a - b) } }));
    const toggleWeekday = (w: number) => setR(prev => ({ ...prev, weekdays: (prev.weekdays ?? []).includes(w) ? (prev.weekdays ?? []).filter(x => x !== w) : [...(prev.weekdays ?? []), w].sort() }));

    const submit = async () => {
        const zones = zonesText.split(/[\n,]+/).map(z => z.trim()).filter(Boolean);
        if (!r.name.trim()) return setError('Ponle un nombre a la ruta.');
        if (zones.length === 0) return setError('Agrega al menos una zona (localidad o municipio).');
        if (r.mode === 'weekdays' && (r.weekdays ?? []).length === 0) return setError('Elige al menos un día de la semana.');
        setSaving(true);
        try {
            await onSave({ ...r, name: r.name.trim(), zones });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo guardar');
            setSaving(false);
        }
    };

    const input = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400';
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h2 className="font-black text-gray-900">{route.id ? 'Editar ruta' : 'Nueva ruta'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 cursor-pointer"><X size={18} /></button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="text-xs font-bold text-gray-700 sm:col-span-2">Nombre de la ruta
                        <input className={input} value={r.name} onChange={e => setR({ ...r, name: e.target.value })} placeholder="Ej: Sur y centro (Daniel)" />
                    </label>
                    <label className="text-xs font-bold text-gray-700 sm:col-span-2">Zonas (una por línea): localidades o municipios que cubre
                        <textarea className={`${input} h-28`} value={zonesText} onChange={e => setZonesText(e.target.value)} placeholder={'Antonio Nariño\nRafael Uribe Uribe\nSan Cristóbal'} />
                    </label>
                    <label className="text-xs font-bold text-gray-700">Frecuencia
                        <select className={input} value={r.mode} onChange={e => setR({ ...r, mode: e.target.value as DeliveryRoute['mode'] })}>
                            <option value="dates">Fechas específicas por mes</option>
                            <option value="weekdays">Días fijos de la semana</option>
                            <option value="daily">Todos los días</option>
                        </select>
                    </label>
                    <label className="text-xs font-bold text-gray-700 flex items-end gap-2 pb-2">
                        <input type="checkbox" checked={r.active} onChange={e => setR({ ...r, active: e.target.checked })} className="w-4 h-4 accent-indigo-600" /> Ruta activa
                    </label>
                </div>

                {r.mode === 'dates' && (
                    <div className="border border-gray-100 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-700">Días de entrega en <span className="capitalize">{monthLabel(ym)}</span></span>
                            <div className="flex gap-1">
                                <button onClick={() => setYm(shiftMonth(ym, -1))} className="p-1 rounded border border-gray-200 cursor-pointer"><ChevronLeft size={13} /></button>
                                <button onClick={() => setYm(shiftMonth(ym, 1))} className="p-1 rounded border border-gray-200 cursor-pointer"><ChevronRight size={13} /></button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {Array.from({ length: daysInMonth(ym) }, (_, i) => i + 1).map(d => {
                                const ymd = `${ym}-${String(d).padStart(2, '0')}`;
                                const wd = weekdayName(new Date(`${ymd}T12:00:00Z`).getUTCDay()).slice(0, 3);
                                return (
                                    <button key={d} type="button" onClick={() => toggleDay(d)} title={wd} className={`w-9 h-9 rounded-lg text-xs font-bold border cursor-pointer ${selected.includes(d) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'}`}>
                                        {d}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-[11px] text-gray-500">Días marcados: {selected.length ? selected.join(', ') : 'ninguno'}. Cambia de mes con las flechas para cargar el siguiente.</p>
                    </div>
                )}

                {r.mode === 'weekdays' && (
                    <div className="border border-gray-100 rounded-xl p-3 flex flex-wrap gap-2">
                        {[1, 2, 3, 4, 5, 6, 0].map(w => (
                            <button key={w} type="button" onClick={() => toggleWeekday(w)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer capitalize ${(r.weekdays ?? []).includes(w) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200'}`}>
                                {weekdayName(w)}
                            </button>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs font-bold text-gray-700">Vigente desde (opcional)
                        <input type="date" className={input} value={r.validFrom ?? ''} onChange={e => setR({ ...r, validFrom: e.target.value || undefined })} />
                    </label>
                    <label className="text-xs font-bold text-gray-700">Vigente hasta (opcional)
                        <input type="date" className={input} value={r.validTo ?? ''} onChange={e => setR({ ...r, validTo: e.target.value || undefined })} />
                    </label>
                    <label className="text-xs font-bold text-gray-700 col-span-2">Nota pública para el cliente (opcional; el agente puede mencionarla)
                        <input className={input} value={r.publicNote ?? ''} onChange={e => setR({ ...r, publicNote: e.target.value || undefined })} placeholder="Ej: pedido mínimo de 2 productos" />
                    </label>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-black text-amber-900 flex items-center gap-1"><Lock size={12} /> Datos internos — el agente nunca los muestra</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input className={input} value={r.driverName ?? ''} onChange={e => setR({ ...r, driverName: e.target.value || undefined })} placeholder="Mensajero(s)" />
                        <input className={input} value={r.driverPhone ?? ''} onChange={e => setR({ ...r, driverPhone: e.target.value || undefined })} placeholder="Teléfono(s)" />
                    </div>
                    <textarea className={`${input} h-16`} value={r.notes ?? ''} onChange={e => setR({ ...r, notes: e.target.value || undefined })} placeholder="Notas internas" />
                </div>

                {error && <p className="text-xs font-bold text-red-600">{error}</p>}
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold cursor-pointer">Cancelar</button>
                    <button onClick={submit} disabled={saving} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black disabled:opacity-50 cursor-pointer">{saving ? 'Guardando…' : 'Guardar ruta'}</button>
                </div>
            </div>
        </div>
    );
}

