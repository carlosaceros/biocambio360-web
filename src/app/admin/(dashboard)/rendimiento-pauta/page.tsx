'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    TrendingUp,
    AlertCircle,
    Loader2,
    RefreshCw,
    DollarSign,
    Target,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@/lib/checkout-utils';

interface CampaignPerformance {
    campaignId: string;
    campaignName: string;
    spend: number;
    revenue: number;
    ventas: number;
    roas: number | null;
    roiPct: number | null;
}

interface AdsPerformanceReport {
    since: string;
    until: string;
    campanas: CampaignPerformance[];
    totales: { spend: number; revenue: number; ventas: number; roas: number | null; roiPct: number | null };
    sinAtribuir: { revenue: number; ventas: number };
    negocioTotal: { revenue: number; roas: number | null; roiPct: number | null };
}

const toISODate = (d: Date) => d.toISOString().slice(0, 10);

export default function RendimientoPautaPage() {
    const router = useRouter();
    const { user, role } = useAuth();
    const canView = role === 'superadmin' || role === 'director';

    const [since, setSince] = useState(toISODate(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)));
    const [until, setUntil] = useState(toISODate(new Date()));
    const [report, setReport] = useState<AdsPerformanceReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        try {
            const idToken = await user.getIdToken();
            const res = await fetch(`/api/admin/ads-performance?since=${since}&until=${until}`, {
                headers: { Authorization: `Bearer ${idToken}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Error cargando el reporte');
            setReport(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error cargando el reporte');
        } finally {
            setLoading(false);
        }
    }, [user, since, until]);

    useEffect(() => { if (canView) load(); }, [canView, load]);

    if (!canView) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-md p-8 max-w-sm text-center space-y-3">
                    <AlertCircle className="mx-auto text-amber-500" size={32} />
                    <p className="font-black text-gray-900">Acceso restringido</p>
                    <p className="text-sm text-gray-500">Este reporte financiero es solo para directores y superadministradores.</p>
                    <button onClick={() => router.push('/admin')} className="mt-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold">
                        Volver al panel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-16">
            <header className="bg-white border-b border-gray-100 shadow-xs px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
                <button onClick={() => router.push('/admin')} className="text-gray-500 hover:text-gray-800">
                    <ArrowLeft size={18} />
                </button>
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                    <TrendingUp size={14} className="text-white" />
                </div>
                <div>
                    <h1 className="font-black text-gray-900 text-sm leading-tight">Rendimiento de Pauta</h1>
                    <p className="text-[10px] text-gray-400">Gasto real en Meta Ads vs. ingreso real por campaña</p>
                </div>
                <button onClick={load} className="ml-auto text-gray-400 hover:text-gray-700">
                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                </button>
            </header>

            <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
                <section className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 sm:p-5 flex flex-wrap items-end gap-3">
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1">Desde</label>
                        <input type="date" value={since} onChange={e => setSince(e.target.value)} className="text-xs border border-gray-200 rounded-xl px-3 py-2" />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-gray-500 mb-1">Hasta</label>
                        <input type="date" value={until} onChange={e => setUntil(e.target.value)} className="text-xs border border-gray-200 rounded-xl px-3 py-2" />
                    </div>
                    <button onClick={load} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold">
                        Actualizar
                    </button>
                </section>

                {error && (
                    <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
                        <AlertCircle size={14} /> {error}
                    </div>
                )}

                {loading ? (
                    <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-gray-400" size={28} /></div>
                ) : report && (
                    <>
                        <section className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-5 text-white shadow-md">
                            <p className="text-[10px] font-extrabold uppercase text-indigo-200 tracking-wider mb-1">
                                ¿Somos rentables? · Ingreso total del negocio vs. gasto en pauta
                            </p>
                            <p className="text-[11px] text-indigo-200 mb-4 max-w-xl">
                                Todo el ingreso real (tienda online, mostrador y asesores), venga o no de un anuncio —
                                es la cifra más confiable, aunque no diga qué campaña específica lo generó.
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-[10px] font-bold text-indigo-200 uppercase">Gasto en pauta</p>
                                    <p className="text-xl font-black mt-0.5">{formatCurrency(report.totales.spend)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-indigo-200 uppercase">Ingreso total del negocio</p>
                                    <p className="text-xl font-black mt-0.5">{formatCurrency(report.negocioTotal.revenue)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-indigo-200 uppercase">ROAS del negocio</p>
                                    <p className="text-xl font-black mt-0.5">{report.negocioTotal.roas !== null ? `${report.negocioTotal.roas}x` : '—'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-indigo-200 uppercase">ROI del negocio</p>
                                    <p className={`text-xl font-black mt-0.5 ${(report.negocioTotal.roiPct ?? 0) >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                                        {report.negocioTotal.roiPct !== null ? `${report.negocioTotal.roiPct}%` : '—'}
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <p className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider mb-2">
                                Atribución directa por campaña (parcial — solo ventas cerradas por WhatsApp)
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                                    <p className="text-[10px] font-extrabold uppercase text-gray-400">Gasto en pauta</p>
                                    <p className="text-lg font-black text-gray-900 mt-1">{formatCurrency(report.totales.spend)}</p>
                                </div>
                                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                                    <p className="text-[10px] font-extrabold uppercase text-gray-400">Ingreso atribuido (WhatsApp)</p>
                                    <p className="text-lg font-black text-emerald-700 mt-1">{formatCurrency(report.totales.revenue)}</p>
                                </div>
                                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                                    <p className="text-[10px] font-extrabold uppercase text-gray-400">ROAS atribuido</p>
                                    <p className="text-lg font-black text-gray-900 mt-1">{report.totales.roas !== null ? `${report.totales.roas}x` : '—'}</p>
                                </div>
                                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                                    <p className="text-[10px] font-extrabold uppercase text-gray-400">ROI atribuido</p>
                                    <p className={`text-lg font-black mt-1 ${(report.totales.roiPct ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                        {report.totales.roiPct !== null ? `${report.totales.roiPct}%` : '—'}
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                            <table className="w-full text-xs">
                                <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-extrabold">
                                    <tr>
                                        <th className="text-left py-2.5 px-4">Campaña</th>
                                        <th className="text-right py-2.5 px-4">Gasto</th>
                                        <th className="text-right py-2.5 px-4">Ingreso real</th>
                                        <th className="text-right py-2.5 px-4">Ventas</th>
                                        <th className="text-right py-2.5 px-4">ROAS</th>
                                        <th className="text-right py-2.5 px-4">ROI</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {report.campanas.map(c => (
                                        <tr key={c.campaignId}>
                                            <td className="py-2.5 px-4 font-bold text-gray-800">{c.campaignName}</td>
                                            <td className="py-2.5 px-4 text-right text-gray-600">{formatCurrency(c.spend)}</td>
                                            <td className="py-2.5 px-4 text-right text-emerald-700 font-bold">{formatCurrency(c.revenue)}</td>
                                            <td className="py-2.5 px-4 text-right text-gray-500">{c.ventas}</td>
                                            <td className="py-2.5 px-4 text-right font-bold">{c.roas !== null ? `${c.roas}x` : '—'}</td>
                                            <td className={`py-2.5 px-4 text-right font-bold ${(c.roiPct ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                                {c.roiPct !== null ? `${c.roiPct}%` : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                    {report.campanas.length === 0 && (
                                        <tr><td colSpan={6} className="text-center py-8 text-gray-400">Sin gasto ni ventas atribuidas en este rango</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </section>

                        {report.sinAtribuir.ventas > 0 && (
                            <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                                <DollarSign size={12} />
                                {formatCurrency(report.sinAtribuir.revenue)} en {report.sinAtribuir.ventas} venta(s) llegaron por anuncio pero no se pudo resolver la campaña exacta (se incluyen en el ingreso total).
                            </p>
                        )}
                        <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                            <Target size={12} />
                            El ingreso es la venta real registrada en la plataforma (marcada por el asesor o cerrada vía Kommo), no el valor de compra que reporta el píxel de Meta.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
