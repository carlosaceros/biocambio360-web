'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart3, Bot, Megaphone, MessageSquare, RefreshCw, ShoppingBag, Users } from 'lucide-react';
import { auth } from '@/lib/firebase';

type Counter = Record<string, number>;

interface Kpis {
    days: number;
    since: string;
    totals: {
        newConversations: number;
        agentTurns: number;
        conversationsAgent: number;
        preOrdersReady: number;
        organic: number;
        conversations: number;
        withPreOrder: number;
        preOrderReady: number;
        preOrderConfirmed: number;
        closedSales: number;
        revenue: number;
    };
    daily: Array<{ date: string; newConversations: number; agentConversations: number; preOrdersReady: number }>;
    byChannel: Counter;
    byHour: Counter;
    bySchedule: Counter;
    byIntent: Counter;
    byProduct: Counter;
    byPqrs: Counter;
    pqrsState: Counter;
    byContactWindow: Counter;
    byMode: Counter;
    channelFunnel: Counter;
    ads: Array<{ id: string; headline: string; conversations: number; preOrders: number; sales: number; revenue: number }>;
    advisors: Array<{ name: string; assigned: number; sales: number; revenue: number }>;
    usage: { llmCalls: number; responseCacheHits: number; promptTokens: number; cachedTokens: number; outputTokens: number; estimatedCostUsd: number; savedByCacheUsd: number };
    truncated: boolean;
}

const money = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
const int = (n: number) => new Intl.NumberFormat('es-CO').format(Math.round(n));
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : '—');
const pretty = (slug: string) => slug.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());

const LABELS: Record<string, string> = {
    compra: 'Quiere comprar',
    consulta_precio: 'Consulta de precio',
    consulta_producto: 'Consulta de producto',
    pqrs: 'PQRS',
    otro: 'Otro',
    manana: 'En la mañana',
    tarde: 'En la tarde',
    '7-9pm': '7 a 9 p.m.',
    whatsapp: 'WhatsApp',
    messenger: 'Messenger',
    instagram: 'Instagram',
    nuevo: 'Cliente nuevo',
    continuacion: 'Chat en curso con asesor',
    demanda: 'Activado a demanda',
    peticion: 'Petición',
    queja: 'Queja',
    reclamo: 'Reclamo',
    sugerencia: 'Sugerencia',
    equipo: 'En horario del equipo',
    agente: 'Fuera de horario (agente)',
};
const label = (k: string) => LABELS[k] ?? pretty(k);

function Card({ icon, title, value, sub, tone = 'violet' }: { icon: React.ReactNode; title: string; value: string; sub?: string; tone?: 'violet' | 'emerald' | 'amber' | 'sky' }) {
    const tones = { violet: 'bg-violet-100 text-violet-700', emerald: 'bg-emerald-100 text-emerald-700', amber: 'bg-amber-100 text-amber-700', sky: 'bg-sky-100 text-sky-700' };
    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${tones[tone]}`}>{icon}</div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{title}</p>
            <p className="text-2xl font-black text-gray-900">{value}</p>
            {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        </div>
    );
}

function Section({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
    return (
        <section className={`bg-white rounded-2xl border border-gray-200 p-4 shadow-xs ${className}`}>
            <h2 className="text-sm font-black text-gray-900 mb-3">{title}</h2>
            {children}
        </section>
    );
}

function Bars({ data, colorClass = 'bg-violet-500', format = int, top = 8 }: { data: Counter; colorClass?: string; format?: (n: number) => string; top?: number }) {
    const rows = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, top);
    const max = Math.max(1, ...rows.map(r => r[1]));
    if (rows.length === 0) return <p className="text-xs text-gray-400">Sin datos todavía.</p>;
    return (
        <ul className="space-y-1.5">
            {rows.map(([k, v]) => (
                <li key={k} className="text-xs">
                    <div className="flex justify-between gap-2 mb-0.5">
                        <span className="text-gray-700 truncate">{label(k)}</span>
                        <span className="font-bold text-gray-900">{format(v)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${(v / max) * 100}%` }} />
                    </div>
                </li>
            ))}
        </ul>
    );
}

export default function KpisIaPage() {
    const router = useRouter();
    const [days, setDays] = useState(30);
    const [data, setData] = useState<Kpis | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const load = useCallback(async (range: number) => {
        setLoading(true);
        setError('');
        try {
            const token = await auth.currentUser?.getIdToken();
            const res = await fetch(`/api/ai-kpis?days=${range}`, { headers: { Authorization: `Bearer ${token}` } });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json.error ?? `Error ${res.status}`);
            setData(json as Kpis);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const unsub = auth.onAuthStateChanged(user => {
            if (user) load(days);
        });
        return unsub;
    }, [days, load]);

    const hours = useMemo(() => Array.from({ length: 24 }, (_, h) => data?.byHour[String(h).padStart(2, '0')] ?? 0), [data]);
    const maxHour = Math.max(1, ...hours);
    const dailyMax = Math.max(1, ...(data?.daily.map(d => d.newConversations) ?? [1]));

    const t = data?.totals;
    const hoursCovered = data ? (data.bySchedule.agente ?? 0) : 0;

    return (
        <div className="space-y-5 pb-10">
            <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                    <button onClick={() => router.push('/admin')} className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1 mb-2 cursor-pointer">
                        <ArrowLeft size={14} /> Volver al Dashboard
                    </button>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-2">
                        <BarChart3 className="text-violet-600" size={28} /> KPIs de Marketing y Ventas
                    </h1>
                    <p className="text-xs text-gray-500 max-w-2xl">
                        Conversaciones, anuncios, pre-pedidos, ventas y rendimiento del agente IA desde {data?.since ?? '…'}. Los contadores del agente se acumulan desde su activación.
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start">
                    <div className="flex items-center gap-1 bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
                        {[7, 30, 90].map(d => (
                            <button key={d} onClick={() => setDays(d)} className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer ${days === d ? 'bg-violet-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                                {d} días
                            </button>
                        ))}
                    </div>
                    <button onClick={() => load(days)} title="Actualizar" className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-900 cursor-pointer">
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm font-medium">{error}</div>}
            {!data && loading && <p className="text-sm text-gray-500">Cargando…</p>}

            {data && t && (
                <>
                    {data.truncated && <div className="p-3 rounded-xl bg-amber-50 text-amber-800 text-xs font-medium">El periodo tiene más de 4.000 conversaciones: el embudo y las tablas usan las 4.000 primeras. Reduce el rango.</div>}

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <Card icon={<MessageSquare size={18} />} title="Conversaciones nuevas" value={int(t.newConversations || t.conversations)} sub={`${int(t.organic)} orgánicas · ${int((t.newConversations || t.conversations) - t.organic)} de anuncios`} />
                        <Card icon={<Bot size={18} />} title="Atendidas por el agente" value={int(t.conversationsAgent)} sub={`${int(t.agentTurns)} respuestas · ${int(hoursCovered)} fuera de horario`} tone="sky" />
                        <Card icon={<ShoppingBag size={18} />} title="Ventas cerradas" value={int(t.closedSales)} sub={`${money(t.revenue)} · conversión ${pct(t.closedSales, t.conversations)}`} tone="emerald" />
                        <Card icon={<Users size={18} />} title="Pre-pedidos listos" value={int(t.preOrdersReady)} sub={`${pct(t.preOrderReady, t.conversations)} de las conversaciones`} tone="amber" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <Section title="Embudo de ventas" className="lg:col-span-1">
                            {[
                                ['Conversaciones', t.conversations],
                                ['Con pre-pedido', t.withPreOrder],
                                ['Pre-pedido listo', t.preOrderReady],
                                ['Confirmado por asesor', t.preOrderConfirmed],
                                ['Venta cerrada', t.closedSales],
                            ].map(([name, value], i, arr) => {
                                const v = value as number;
                                const first = (arr[0][1] as number) || 1;
                                const prev = i > 0 ? (arr[i - 1][1] as number) : 0;
                                return (
                                    <div key={name as string} className="mb-2 text-xs">
                                        <div className="flex justify-between mb-0.5">
                                            <span className="text-gray-700">{name as string}</span>
                                            <span className="font-bold text-gray-900">
                                                {int(v)} {i > 0 && <span className="text-gray-400 font-medium">({pct(v, prev)} del paso anterior)</span>}
                                            </span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-violet-500 rounded-full" style={{ width: `${(v / first) * 100}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                            <p className="text-[11px] text-gray-400 mt-2">Las ventas salen del botón &quot;Marcar venta cerrada&quot; del inbox.</p>
                        </Section>

                        <Section title="Conversaciones por día" className="lg:col-span-2">
                            {data.daily.length === 0 ? (
                                <p className="text-xs text-gray-400">Sin datos todavía: se llena con cada conversación nueva.</p>
                            ) : (
                                <div className="flex items-end gap-1 h-36">
                                    {data.daily.map(d => (
                                        <div key={d.date} className="flex-1 min-w-[6px] flex flex-col justify-end group relative" title={`${d.date}: ${d.newConversations} nuevas, ${d.agentConversations} con el agente`}>
                                            <div className="bg-violet-500 rounded-t" style={{ height: `${(d.newConversations / dailyMax) * 100}%`, minHeight: d.newConversations ? 2 : 0 }} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Section>
                    </div>

                    <Section title="¿A qué hora escriben los clientes? (conversaciones nuevas)">
                        <div className="flex items-end gap-1 h-28">
                            {hours.map((v, h) => (
                                <div key={h} className="flex-1 flex flex-col justify-end items-center" title={`${h}:00 — ${v}`}>
                                    <div className="w-full bg-sky-500 rounded-t" style={{ height: `${(v / maxHour) * 100}%`, minHeight: v ? 2 : 0 }} />
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                            <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
                        </div>
                    </Section>

                    <Section title="Rendimiento por anuncio de Meta">
                        {data.ads.length === 0 ? (
                            <p className="text-xs text-gray-400">Aún no hay conversaciones desde anuncios en este periodo.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="text-left text-gray-500 border-b border-gray-100">
                                            <th className="py-1.5 pr-2 font-bold"><Megaphone size={12} className="inline mr-1" />Anuncio</th>
                                            <th className="py-1.5 px-2 font-bold text-right">Conversaciones</th>
                                            <th className="py-1.5 px-2 font-bold text-right">Pre-pedidos</th>
                                            <th className="py-1.5 px-2 font-bold text-right">Ventas</th>
                                            <th className="py-1.5 px-2 font-bold text-right">Ingresos</th>
                                            <th className="py-1.5 pl-2 font-bold text-right">Conversión</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.ads.map(a => (
                                            <tr key={a.id} className="border-b border-gray-50">
                                                <td className="py-1.5 pr-2 text-gray-800 max-w-[260px] truncate" title={a.headline}>{a.headline}</td>
                                                <td className="py-1.5 px-2 text-right">{int(a.conversations)}</td>
                                                <td className="py-1.5 px-2 text-right">{int(a.preOrders)}</td>
                                                <td className="py-1.5 px-2 text-right">{int(a.sales)}</td>
                                                <td className="py-1.5 px-2 text-right">{money(a.revenue)}</td>
                                                <td className="py-1.5 pl-2 text-right font-bold">{pct(a.sales, a.conversations)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Section>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Section title="Qué piden los clientes (intención)"><Bars data={data.byIntent} /></Section>
                        <Section title="Productos más pedidos"><Bars data={Object.fromEntries(Object.entries(data.byProduct).map(([k, v]) => [k, v]))} colorClass="bg-emerald-500" top={10} /></Section>
                        <Section title="Canales"><Bars data={Object.keys(data.byChannel).length ? data.byChannel : data.channelFunnel} colorClass="bg-sky-500" /></Section>
                        <Section title="Quién atendió primero"><Bars data={data.bySchedule} colorClass="bg-amber-500" /></Section>
                        <Section title="Tipo de conversación del agente"><Bars data={data.byMode} colorClass="bg-violet-400" /></Section>
                        <Section title="Horario de contacto elegido"><Bars data={data.byContactWindow} colorClass="bg-pink-500" /></Section>
                        <Section title="PQRS por tipo"><Bars data={data.byPqrs} colorClass="bg-red-500" /></Section>
                        <Section title="PQRS por estado"><Bars data={data.pqrsState} colorClass="bg-orange-500" /></Section>
                    </div>

                    <Section title="Asesores (conversaciones asignadas y ventas)">
                        {data.advisors.length === 0 ? (
                            <p className="text-xs text-gray-400">Sin conversaciones asignadas en este periodo.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="text-left text-gray-500 border-b border-gray-100">
                                            <th className="py-1.5 pr-2 font-bold">Asesor</th>
                                            <th className="py-1.5 px-2 font-bold text-right">Asignadas</th>
                                            <th className="py-1.5 px-2 font-bold text-right">Ventas</th>
                                            <th className="py-1.5 px-2 font-bold text-right">Ingresos</th>
                                            <th className="py-1.5 pl-2 font-bold text-right">Conversión</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.advisors.map(a => (
                                            <tr key={a.name} className="border-b border-gray-50">
                                                <td className="py-1.5 pr-2 text-gray-800">{a.name}</td>
                                                <td className="py-1.5 px-2 text-right">{int(a.assigned)}</td>
                                                <td className="py-1.5 px-2 text-right">{int(a.sales)}</td>
                                                <td className="py-1.5 px-2 text-right">{money(a.revenue)}</td>
                                                <td className="py-1.5 pl-2 text-right font-bold">{pct(a.sales, a.assigned)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Section>

                    <Section title="Costo del agente IA (estimado)">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div><p className="text-gray-500">Llamadas al modelo</p><p className="text-lg font-black">{int(data.usage.llmCalls)}</p></div>
                            <div><p className="text-gray-500">Respuestas desde caché</p><p className="text-lg font-black">{int(data.usage.responseCacheHits)}</p></div>
                            <div><p className="text-gray-500">Tokens desde caché</p><p className="text-lg font-black">{pct(data.usage.cachedTokens, data.usage.promptTokens)}</p></div>
                            <div><p className="text-gray-500">Costo estimado</p><p className="text-lg font-black">US$ {data.usage.estimatedCostUsd.toFixed(2)}</p><p className="text-gray-400">Ahorro por caché: US$ {data.usage.savedByCacheUsd.toFixed(2)}</p></div>
                        </div>
                    </Section>
                </>
            )}
        </div>
    );
}
