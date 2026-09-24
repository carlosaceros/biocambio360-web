'use client';

import { useState } from 'react';
import { FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { auth } from '@/lib/firebase';

interface Change {
    guia: string;
    orderId: string;
    from: string;
    to: string;
    estado: string;
    linkedByPhone?: boolean;
}
interface Result {
    dryRun: boolean;
    rows: number;
    changes: Change[];
    alreadyUpToDate: number;
    notFound: number;
    ignored: number;
    applied: number;
    errors: string[];
}

/**
 * Imports the "Envíos Completos" report exported from the 99 Envíos panel.
 * 99 Envíos' API has no delivery webhook, so this is how real delivery states reach the orders.
 */
export default function NinetyNineReportImport() {
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<Result | null>(null);
    const [error, setError] = useState('');

    const run = async (dryRun: boolean) => {
        if (!file) return;
        setBusy(true);
        setError('');
        try {
            const token = await auth.currentUser?.getIdToken();
            const body = new FormData();
            body.append('file', file);
            body.append('dryRun', dryRun ? '1' : '0');
            const res = await fetch('/api/envios/importar-reporte', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Error al procesar el archivo');
            setResult(data as Result);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al procesar el archivo');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-4 space-y-3">
            <div>
                <h2 className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <FileSpreadsheet size={15} className="text-emerald-600" />
                    Actualizar entregas desde el reporte de 99 Envíos
                </h2>
                <p className="text-[11px] text-gray-500 mt-1">
                    99 Envíos no avisa las entregas por sí solo. Descarga el reporte <strong>“Envíos Completos”</strong> (Excel) desde su panel y súbelo aquí:
                    los pedidos con guía entregada pasan a <em>Entregado</em> y los devueltos a <em>No entregado</em>. Solo cambian pedidos que aún no estaban finalizados.
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <input
                    type="file"
                    accept=".xlsx"
                    onChange={e => { setFile(e.target.files?.[0] ?? null); setResult(null); setError(''); }}
                    className="text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-emerald-700"
                />
                <button
                    onClick={() => run(true)}
                    disabled={!file || busy}
                    className="px-4 py-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white text-xs font-black rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                    {busy ? <Loader2 size={13} className="animate-spin" /> : null} Analizar (vista previa)
                </button>
            </div>

            {error && <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle size={13} /> {error}</p>}

            {result && (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                        {[
                            ['Filas', result.rows],
                            [result.dryRun ? 'Cambiarían' : 'Aplicados', result.dryRun ? result.changes.length : result.applied],
                            ['Ya al día', result.alreadyUpToDate],
                            ['Sin pedido', result.notFound],
                            ['Sin cambio', result.ignored],
                        ].map(([label, value]) => (
                            <div key={String(label)} className="bg-gray-50 rounded-xl p-2">
                                <p className="text-lg font-black text-gray-900">{value}</p>
                                <p className="text-[10px] font-bold uppercase text-gray-400">{label}</p>
                            </div>
                        ))}
                    </div>

                    {result.changes.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead>
                                    <tr className="text-[10px] uppercase text-gray-400 border-b border-gray-100">
                                        <th className="py-1 pr-3">Guía</th><th className="py-1 pr-3">Pedido</th><th className="py-1 pr-3">Cambio</th><th className="py-1">Estado en 99 Envíos</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {result.changes.map(c => (
                                        <tr key={c.orderId}>
                                            <td className="py-1 pr-3 font-mono">{c.guia}</td>
                                            <td className="py-1 pr-3 font-mono">#{c.orderId.slice(-8)}</td>
                                            <td className="py-1 pr-3 font-bold">{c.from} → {c.to}{c.linkedByPhone ? ' (vinculado por teléfono)' : ''}</td>
                                            <td className="py-1 text-gray-600">{c.estado}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {result.dryRun && result.changes.length > 0 && (
                        <button
                            onClick={() => run(false)}
                            disabled={busy}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-black rounded-xl flex items-center gap-1.5 cursor-pointer"
                        >
                            <CheckCircle2 size={13} /> Aplicar {result.changes.length} cambio(s) (se avisará a los clientes)
                        </button>
                    )}
                    {result.dryRun && result.changes.length === 0 && (
                        <p className="text-xs text-gray-500">No hay pedidos por actualizar con este reporte.</p>
                    )}
                    {result.errors.length > 0 && <p className="text-xs text-red-600">Errores: {result.errors.join(' | ')}</p>}
                </div>
            )}
        </div>
    );
}
