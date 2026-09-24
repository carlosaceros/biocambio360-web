'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Bot,
    Check,
    Link2,
    Megaphone,
    Pencil,
    Plus,
    RotateCcw,
    Send,
    Sparkles,
    ThumbsUp,
    Trash2,
    X,
} from 'lucide-react';
import { auth } from '@/lib/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentTurn {
    role: 'model';
    messages: string[];
    options: string[];
    webButton: boolean;
    kind: string;
}
interface CustomerTurn {
    role: 'user';
    text: string;
}
type Turn = AgentTurn | CustomerTurn;

interface PreOrderView {
    items: Array<{ producto: string; presentacion: string; cantidad: number }>;
    nombreCliente?: string;
    direccion?: string;
    ciudad?: string;
    metodoPago?: string;
    horarioContacto?: string;
    notas?: string;
}

interface TrainingItem {
    id: string;
    kind: 'rule' | 'example';
    text: string;
    customer: string;
    ideal: string;
    badReply: string;
    note: string;
    active: boolean;
    createdBy: string;
    verified: boolean;
}

interface AdItem {
    id: string;
    headline: string;
    body: string;
    conversations: number;
    lastSeenAt: string;
    productName: string;
    notes: string;
}

async function api<T = Record<string, unknown>>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch(path, {
        ...init,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
    return data as T;
}

const HORARIO: Record<string, string> = { manana: 'En la mañana', tarde: 'En la tarde', '7-9pm': 'Entre 7 y 9 p.m.' };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EntrenamientoIAPage() {
    const router = useRouter();
    const [tab, setTab] = useState<'sim' | 'reglas' | 'anuncios'>('sim');
    const [forbidden, setForbidden] = useState('');
    const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

    const notify = useCallback((text: string, ok = true) => {
        setToast({ text, ok });
        setTimeout(() => setToast(null), 3500);
    }, []);

    // ── Shared data ──
    const [items, setItems] = useState<TrainingItem[]>([]);
    const [ads, setAds] = useState<AdItem[]>([]);
    const [catalog, setCatalog] = useState<string[]>([]);

    const loadItems = useCallback(async () => {
        try {
            const data = await api<{ items: TrainingItem[] }>('/api/ai-training/items');
            setItems(data.items);
        } catch (e) {
            setForbidden(e instanceof Error ? e.message : 'Error');
        }
    }, []);
    const loadAds = useCallback(async () => {
        try {
            const data = await api<{ ads: AdItem[]; catalog: string[] }>('/api/ai-training/ads');
            setAds(data.ads);
            setCatalog(data.catalog);
        } catch {
            /* handled by loadItems */
        }
    }, []);

    useEffect(() => {
        // wait for the Firebase session to be ready
        const unsub = auth.onAuthStateChanged(user => {
            if (user) {
                loadItems();
                loadAds();
            }
        });
        return unsub;
    }, [loadItems, loadAds]);

    // ── Simulator state ──
    const [turns, setTurns] = useState<Turn[]>([]);
    const [preOrder, setPreOrder] = useState<PreOrderView | null>(null);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [adMode, setAdMode] = useState<string>('none'); // none | custom | <ad id>
    const [customAd, setCustomAd] = useState({ headline: '', body: '', productName: '', notes: '' });
    const [correcting, setCorrecting] = useState<{ index: number; ideal: string; note: string } | null>(null);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [turns, busy]);

    const history = useMemo(
        () =>
            turns.map(t => ({
                role: t.role,
                text: t.role === 'user' ? t.text : t.messages.join('\n') + (t.options.length ? `\n[Opciones: ${t.options.join(' · ')}]` : ''),
            })),
        [turns]
    );

    const send = async (text: string) => {
        const clean = text.trim();
        if (!clean || busy) return;
        const next: Turn[] = [...turns, { role: 'user', text: clean }];
        setTurns(next);
        setInput('');
        setBusy(true);
        try {
            const payloadHistory = next.map(t => ({
                role: t.role,
                text: t.role === 'user' ? t.text : t.messages.join('\n'),
            }));
            const ad =
                adMode === 'none'
                    ? null
                    : adMode === 'custom'
                    ? customAd
                    : { sourceId: adMode, headline: ads.find(a => a.id === adMode)?.headline, body: ads.find(a => a.id === adMode)?.body };
            const res = await api<{ messages: string[]; options?: string[]; webButton?: boolean; kind: string; preOrder?: PreOrderView }>('/api/ai-training/simulate', {
                method: 'POST',
                body: JSON.stringify({ history: payloadHistory, preOrder, ad }),
            });
            setTurns(prev => [...prev, { role: 'model', messages: res.messages, options: res.options ?? [], webButton: !!res.webButton, kind: res.kind }]);
            if (res.preOrder) setPreOrder(res.preOrder);
        } catch (e) {
            notify(e instanceof Error ? e.message : 'Error en la simulación', false);
        } finally {
            setBusy(false);
        }
    };

    const reset = () => {
        setTurns([]);
        setPreOrder(null);
    };

    const lastCustomerBefore = (index: number): string => {
        for (let i = index - 1; i >= 0; i--) {
            const t = turns[i];
            if (t.role === 'user') return t.text;
        }
        return '';
    };

    const saveExample = async (index: number, ideal: string, note: string, bad: string) => {
        try {
            await api('/api/ai-training/items', {
                method: 'POST',
                body: JSON.stringify({ kind: 'example', customer: lastCustomerBefore(index), ideal, badReply: bad, note }),
            });
            notify('Ejemplo guardado: el agente lo usará en situaciones parecidas');
            setCorrecting(null);
            loadItems();
        } catch (e) {
            notify(e instanceof Error ? e.message : 'No se pudo guardar', false);
        }
    };

    // ── Rules tab state ──
    const [newRule, setNewRule] = useState('');
    const [newScenario, setNewScenario] = useState({ customer: '', ideal: '', note: '' });

    const createItem = async (payload: Record<string, unknown>, done: () => void) => {
        try {
            await api('/api/ai-training/items', { method: 'POST', body: JSON.stringify(payload) });
            done();
            notify('Guardado');
            loadItems();
        } catch (e) {
            notify(e instanceof Error ? e.message : 'No se pudo guardar', false);
        }
    };
    const toggleItem = async (item: TrainingItem) => {
        await api('/api/ai-training/items', { method: 'PATCH', body: JSON.stringify({ id: item.id, active: !item.active }) }).catch(e => notify(e.message, false));
        loadItems();
    };
    const removeItem = async (item: TrainingItem) => {
        if (!confirm('¿Eliminar este elemento del entrenamiento?')) return;
        await api(`/api/ai-training/items?id=${item.id}`, { method: 'DELETE' }).catch(e => notify(e.message, false));
        loadItems();
    };

    // ── Ads tab ──
    const saveAd = async (ad: AdItem, productName: string, notes: string) => {
        try {
            await api('/api/ai-training/ads', { method: 'PATCH', body: JSON.stringify({ sourceId: ad.id, productName, notes }) });
            notify('Anuncio configurado');
            loadAds();
        } catch (e) {
            notify(e instanceof Error ? e.message : 'No se pudo guardar', false);
        }
    };

    if (forbidden) {
        return (
            <div className="p-6 max-w-xl mx-auto text-center space-y-3">
                <Bot className="mx-auto text-gray-300" size={40} />
                <p className="font-black text-gray-900">Acceso restringido</p>
                <p className="text-sm text-gray-500">{forbidden}</p>
                <button onClick={() => router.push('/admin')} className="text-xs font-bold text-indigo-600 cursor-pointer">Volver al dashboard</button>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-2xl shadow-xl font-bold text-xs text-white ${toast.ok ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    {toast.text}
                </div>
            )}

            <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                    <button onClick={() => router.push('/admin')} className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1 mb-2 cursor-pointer">
                        <ArrowLeft size={14} /> Volver al Dashboard
                    </button>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-2">
                        <Sparkles className="text-violet-600" size={28} /> Entrenamiento del Agente IA
                    </h1>
                    <p className="text-xs text-gray-500 max-w-2xl">
                        Conversa con el agente como si fueras un cliente, corrígelo cuando se equivoque y enséñale reglas y escenarios de tu negocio. Nada de aquí se envía por WhatsApp.
                    </p>
                </div>
                <div className="flex items-center gap-1 bg-gray-100 p-1.5 rounded-2xl border border-gray-200 self-start">
                    {([['sim', 'Simulador'], ['reglas', `Reglas y ejemplos (${items.filter(i => i.active).length})`], ['anuncios', `Anuncios (${ads.length})`]] as const).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${tab === key ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── SIMULATOR ── */}
            {tab === 'sim' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200 shadow-xs flex flex-col h-[70vh]">
                        <div className="p-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
                            <Megaphone size={14} className="text-gray-400" />
                            <select value={adMode} onChange={e => { setAdMode(e.target.value); reset(); }} className="text-xs border border-gray-200 rounded-xl px-2 py-1.5 bg-white">
                                <option value="none">Cliente sin anuncio</option>
                                <option value="custom">Anuncio personalizado…</option>
                                {ads.map(a => <option key={a.id} value={a.id}>Anuncio: {(a.headline || a.id).slice(0, 50)}</option>)}
                            </select>
                            <button onClick={reset} className="ml-auto text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1 cursor-pointer">
                                <RotateCcw size={12} /> Reiniciar
                            </button>
                        </div>

                        {adMode === 'custom' && (
                            <div className="p-3 border-b border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-amber-50/40">
                                <input value={customAd.headline} onChange={e => setCustomAd({ ...customAd, headline: e.target.value })} placeholder="Titular del anuncio" className="text-xs border border-gray-200 rounded-xl px-2 py-1.5" />
                                <select value={customAd.productName} onChange={e => setCustomAd({ ...customAd, productName: e.target.value })} className="text-xs border border-gray-200 rounded-xl px-2 py-1.5 bg-white">
                                    <option value="">Producto del anuncio (opcional)</option>
                                    {catalog.map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                                <input value={customAd.body} onChange={e => setCustomAd({ ...customAd, body: e.target.value })} placeholder="Texto del anuncio" className="text-xs border border-gray-200 rounded-xl px-2 py-1.5" />
                                <input value={customAd.notes} onChange={e => setCustomAd({ ...customAd, notes: e.target.value })} placeholder="Notas/oferta (ej: envío gratis en Bogotá)" className="text-xs border border-gray-200 rounded-xl px-2 py-1.5" />
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                            {turns.length === 0 && (
                                <p className="text-center text-xs text-gray-400 py-10">
                                    Escribe abajo como si fueras un cliente. Prueba: “Buenas noches, necesito detergente para ropa” o un reclamo.
                                </p>
                            )}
                            {turns.map((t, i) =>
                                t.role === 'user' ? (
                                    <div key={i} className="flex justify-start">
                                        <div className="max-w-[75%] bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-3 py-2 text-sm">{t.text}</div>
                                    </div>
                                ) : (
                                    <div key={i} className="flex flex-col items-end gap-1">
                                        {t.messages.map((m, j) => (
                                            <div key={j} className="max-w-[75%] bg-green-600 text-white rounded-2xl rounded-br-sm px-3 py-2 text-sm whitespace-pre-wrap">{m}</div>
                                        ))}
                                        {t.options.length > 0 && (
                                            <div className="flex flex-wrap justify-end gap-1.5 max-w-[80%]">
                                                {t.options.map(o => (
                                                    <button key={o} onClick={() => send(o)} className="text-xs font-bold bg-white text-sky-600 border border-sky-200 rounded-lg px-2.5 py-1.5 shadow-sm hover:bg-sky-50 cursor-pointer">
                                                        {o}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {t.webButton && (
                                            <span className="text-xs font-bold bg-white text-sky-600 border border-sky-200 rounded-lg px-2.5 py-1.5 shadow-sm flex items-center gap-1">
                                                <Link2 size={12} /> Pedir en la web
                                            </span>
                                        )}
                                        {t.kind !== 'reply' && (
                                            <span className="text-[10px] font-bold text-red-500">{t.kind === 'refusal' ? 'Respuesta de rechazo (filtro de seguridad)' : 'Fallo del modelo'}</span>
                                        )}
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => saveExample(i, t.messages.join('\n'), 'Aprobado por el equipo', '')}
                                                className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg px-2 py-1 flex items-center gap-1 cursor-pointer"
                                                title="Guardar como buen ejemplo"
                                            >
                                                <ThumbsUp size={11} /> Bien
                                            </button>
                                            <button
                                                onClick={() => setCorrecting({ index: i, ideal: t.messages.join('\n'), note: '' })}
                                                className="text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg px-2 py-1 flex items-center gap-1 cursor-pointer"
                                                title="Corregir la respuesta"
                                            >
                                                <Pencil size={11} /> Corregir
                                            </button>
                                        </div>
                                    </div>
                                )
                            )}
                            {busy && <p className="text-xs text-gray-400 text-right">El agente está escribiendo…</p>}
                            <div ref={endRef} />
                        </div>

                        <form onSubmit={e => { e.preventDefault(); send(input); }} className="p-3 border-t border-gray-100 flex gap-2">
                            <input value={input} onChange={e => setInput(e.target.value)} placeholder="Escribe como cliente…" className="flex-1 text-sm border border-gray-200 rounded-2xl px-3 py-2 focus:outline-none focus:border-violet-400" />
                            <button disabled={busy || !input.trim()} className="p-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-xl cursor-pointer">
                                <Send size={16} />
                            </button>
                        </form>
                    </div>

                    <div className="lg:col-span-4 space-y-3">
                        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
                            <p className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">Lo que el agente ha entendido</p>
                            {!preOrder || (!preOrder.items?.length && !preOrder.horarioContacto) ? (
                                <p className="text-xs text-gray-400">Aún no hay pre-pedido.</p>
                            ) : (
                                <div className="text-xs text-gray-700 space-y-1">
                                    {preOrder.items.map((it, i) => (
                                        <p key={i}><strong>x{it.cantidad}</strong> {it.producto} {it.presentacion && `· ${it.presentacion}`}</p>
                                    ))}
                                    {preOrder.nombreCliente && <p><strong>Cliente:</strong> {preOrder.nombreCliente}</p>}
                                    {(preOrder.direccion || preOrder.ciudad) && <p><strong>Entrega:</strong> {[preOrder.direccion, preOrder.ciudad].filter(Boolean).join(', ')}</p>}
                                    {preOrder.metodoPago && <p><strong>Pago:</strong> {preOrder.metodoPago}</p>}
                                    {preOrder.horarioContacto && <p><strong>Contactar:</strong> {HORARIO[preOrder.horarioContacto] ?? preOrder.horarioContacto}</p>}
                                </div>
                            )}
                        </div>
                        <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 text-xs text-violet-900 space-y-1.5">
                            <p className="font-black">Cómo entrenarlo</p>
                            <p><strong>Bien:</strong> guarda la respuesta como ejemplo a imitar.</p>
                            <p><strong>Corregir:</strong> escribe cómo debió responder; el agente lo usará cuando vea algo parecido.</p>
                            <p><strong>Reglas:</strong> instrucciones generales de tu negocio (pestaña “Reglas y ejemplos”).</p>
                            <p className="text-violet-700/80">Las reglas nunca pueden quitarle sus protecciones de seguridad.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── RULES & EXAMPLES ── */}
            {tab === 'reglas' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
                            <p className="font-black text-sm text-gray-900">Nueva regla</p>
                            <p className="text-[11px] text-gray-500">Instrucción general que el agente sigue siempre. Ej: “Si preguntan por envío a Bogotá, dile que un asesor calcula el flete según la zona.”</p>
                            <textarea value={newRule} onChange={e => setNewRule(e.target.value)} rows={3} maxLength={300} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2" placeholder="Escribe la regla…" />
                            <button onClick={() => createItem({ kind: 'rule', text: newRule }, () => setNewRule(''))} disabled={newRule.trim().length < 8} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-black rounded-xl flex items-center gap-1 cursor-pointer">
                                <Plus size={13} /> Añadir regla
                            </button>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
                            <p className="font-black text-sm text-gray-900">Nuevo escenario</p>
                            <p className="text-[11px] text-gray-500">Un caso concreto: qué dice el cliente y cómo debe responder el agente.</p>
                            <input value={newScenario.customer} onChange={e => setNewScenario({ ...newScenario, customer: e.target.value })} placeholder="El cliente dice…" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2" />
                            <textarea value={newScenario.ideal} onChange={e => setNewScenario({ ...newScenario, ideal: e.target.value })} rows={3} placeholder="Respuesta ideal…" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2" />
                            <input value={newScenario.note} onChange={e => setNewScenario({ ...newScenario, note: e.target.value })} placeholder="Nota / por qué (opcional)" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2" />
                            <button onClick={() => createItem({ kind: 'example', ...newScenario }, () => setNewScenario({ customer: '', ideal: '', note: '' }))} disabled={newScenario.customer.trim().length < 2 || newScenario.ideal.trim().length < 2} className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-black rounded-xl flex items-center gap-1 cursor-pointer">
                                <Plus size={13} /> Añadir escenario
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3 max-h-[75vh] overflow-y-auto">
                        <p className="font-black text-sm text-gray-900">Lo que el agente ha aprendido</p>
                        {items.length === 0 && <p className="text-xs text-gray-400">Todavía nada. Prueba el simulador y guarda ejemplos.</p>}
                        {items.map(item => (
                            <div key={item.id} className={`border rounded-xl p-3 text-xs space-y-1.5 ${item.active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${item.kind === 'rule' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>{item.kind === 'rule' ? 'Regla' : 'Ejemplo'}</span>
                                    {!item.verified && <span className="text-[10px] font-black text-red-600">No verificado (ignorado)</span>}
                                    <span className="ml-auto text-[10px] text-gray-400">{item.createdBy}</span>
                                </div>
                                {item.kind === 'rule' ? (
                                    <p className="text-gray-800">{item.text}</p>
                                ) : (
                                    <>
                                        <p><strong>Cliente:</strong> {item.customer}</p>
                                        {item.badReply && <p className="text-red-600/80"><strong>Respondió mal:</strong> {item.badReply}</p>}
                                        <p className="text-emerald-700"><strong>Ideal:</strong> {item.ideal}</p>
                                        {item.note && <p className="text-gray-500">{item.note}</p>}
                                    </>
                                )}
                                <div className="flex gap-2 pt-1">
                                    <button onClick={() => toggleItem(item)} className="text-[11px] font-bold text-gray-600 hover:text-gray-900 flex items-center gap-1 cursor-pointer">
                                        {item.active ? <><X size={11} /> Desactivar</> : <><Check size={11} /> Activar</>}
                                    </button>
                                    <button onClick={() => removeItem(item)} className="text-[11px] font-bold text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer">
                                        <Trash2 size={11} /> Eliminar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── ADS ── */}
            {tab === 'anuncios' && (
                <div className="space-y-3">
                    <p className="text-xs text-gray-500 max-w-3xl">
                        Cada anuncio de Meta que trae clientes aparece aquí automáticamente. Indica qué producto promociona y añade notas (oferta, condiciones): así el agente no vuelve a preguntar lo que el anuncio ya dice y se enfoca en cerrar la venta.
                    </p>
                    {ads.length === 0 && (
                        <p className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-2xl p-8 text-center">
                            Aún no ha llegado ningún cliente desde un anuncio. Cuando llegue el primero, aparecerá aquí.
                        </p>
                    )}
                    {ads.map(ad => (
                        <AdCard key={ad.id} ad={ad} catalog={catalog} onSave={saveAd} />
                    ))}
                </div>
            )}

            {/* Correction modal */}
            {correcting && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 space-y-3">
                        <p className="font-black text-gray-900">Corregir respuesta</p>
                        <p className="text-xs text-gray-500">Cliente: “{lastCustomerBefore(correcting.index)}”</p>
                        <p className="text-xs text-red-600/80 whitespace-pre-wrap"><strong>Respondió:</strong> {(turns[correcting.index] as AgentTurn).messages.join('\n')}</p>
                        <label className="text-xs font-bold text-gray-700">¿Cómo debió responder?</label>
                        <textarea value={correcting.ideal} onChange={e => setCorrecting({ ...correcting, ideal: e.target.value })} rows={4} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2" />
                        <input value={correcting.note} onChange={e => setCorrecting({ ...correcting, note: e.target.value })} placeholder="¿Por qué? (opcional, ayuda al agente a entender)" className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2" />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setCorrecting(null)} className="px-4 py-2 text-xs font-bold text-gray-600 cursor-pointer">Cancelar</button>
                            <button
                                onClick={() => saveExample(correcting.index, correcting.ideal, correcting.note, (turns[correcting.index] as AgentTurn).messages.join('\n'))}
                                disabled={correcting.ideal.trim().length < 2}
                                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-black rounded-xl cursor-pointer"
                            >
                                Guardar corrección
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function AdCard({ ad, catalog, onSave }: { ad: AdItem; catalog: string[]; onSave: (ad: AdItem, productName: string, notes: string) => void }) {
    const [productName, setProductName] = useState(ad.productName);
    const [notes, setNotes] = useState(ad.notes);
    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                <Megaphone size={14} className="text-amber-500" />
                <p className="font-black text-sm text-gray-900">{ad.headline || 'Anuncio sin titular'}</p>
                <span className="ml-auto text-[11px] text-gray-400">{ad.conversations} conversación(es) · ID {ad.id.slice(0, 14)}</span>
            </div>
            {ad.body && <p className="text-xs text-gray-500">{ad.body}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <select value={productName} onChange={e => setProductName(e.target.value)} className="text-xs border border-gray-200 rounded-xl px-2 py-2 bg-white">
                    <option value="">Producto que promociona…</option>
                    {catalog.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <input value={notes} onChange={e => setNotes(e.target.value)} maxLength={300} placeholder="Notas: oferta, condiciones, envío…" className="text-xs border border-gray-200 rounded-xl px-2 py-2" />
            </div>
            <button
                onClick={() => onSave(ad, productName, notes)}
                disabled={productName === ad.productName && notes === ad.notes}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-black rounded-xl cursor-pointer"
            >
                Guardar
            </button>
        </div>
    );
}
