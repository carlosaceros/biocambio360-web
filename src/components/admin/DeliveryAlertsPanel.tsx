'use client';

import { useEffect, useState } from 'react';
import { collection, deleteField, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { Truck, Send } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';

const tomorrow = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date(Date.now() + 86400000));

interface Row {
    id: string;
    nombre: string;
    ciudad: string;
    metodoPago: string;
    status: string;
    alertado: boolean;
    confirmado: boolean;
    modificar: boolean;
    ubicacion: boolean;
}

export default function DeliveryAlertsPanel() {
    const { user } = useAuth();
    const [enabled, setEnabled] = useState(false);
    const [rows, setRows] = useState<Row[]>([]);
    const date = tomorrow();
    const [open, setOpen] = useState<Array<{ id: string; nombre: string; ciudad: string; status: string; total: number }>>([]);
    const [showOpen, setShowOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSendingBulk, setIsSendingBulk] = useState(false);
    const [bulkResult, setBulkResult] = useState<string | null>(null);

    const toggleSelected = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const handleBulkSend = async () => {
        if (!user || selectedIds.size === 0) return;
        if (!confirm(`¿Enviar la alerta de entrega de mañana a ${selectedIds.size} cliente(s) ahora mismo?`)) return;
        setIsSendingBulk(true);
        setBulkResult(null);
        try {
            const idToken = await user.getIdToken();
            const res = await fetch('/api/admin/delivery-alerts/bulk-send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ orderIds: Array.from(selectedIds) }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al enviar');
            setBulkResult(`✅ Enviadas: ${data.sent} · Omitidas: ${data.skipped} · Fallidas: ${data.failed}`);
            setSelectedIds(new Set());
        } catch (err) {
            setBulkResult(`❌ ${err instanceof Error ? err.message : 'Error al enviar'}`);
        } finally {
            setIsSendingBulk(false);
        }
    };

    // Active orders that do not have a delivery date yet: the team marks the ones that go out tomorrow
    useEffect(
        () =>
            onSnapshot(
                query(collection(db, 'orders'), where('status', 'in', ['confirmado', 'preparacion'])),
                snap =>
                    setOpen(
                        snap.docs
                            .filter(d => !d.data().fechaProgramadaEntrega)
                            .map(d => ({ id: d.id, nombre: d.data().cliente?.nombre ?? 'Cliente', ciudad: d.data().cliente?.ciudad ?? '', status: d.data().status, total: Number(d.data().total) || 0 }))
                            .slice(0, 60)
                    ),
                () => undefined
            ),
        []
    );
    const schedule = (id: string, value: string | null) =>
        updateDoc(doc(db, 'orders', id), { fechaProgramadaEntrega: value ?? deleteField(), ...(value ? {} : { alertaEntregaEnviada: deleteField() }) });

    useEffect(() => onSnapshot(doc(db, 'bot_config', 'delivery_alerts'), s => setEnabled(s.data()?.enabled === true), () => undefined), []);
    useEffect(
        () =>
            onSnapshot(
                query(collection(db, 'orders'), where('fechaProgramadaEntrega', '==', date)),
                snap =>
                    setRows(
                        snap.docs
                            .map(d => {
                                const o = d.data();
                                return {
                                    id: d.id,
                                    nombre: o.cliente?.nombre ?? 'Cliente',
                                    ciudad: o.cliente?.ciudad ?? '',
                                    metodoPago: o.metodoPago ?? '',
                                    status: o.status ?? '',
                                    alertado: o.alertaEntregaEnviada === true,
                                    confirmado: o.entregaConfirmadaPorCliente === true,
                                    modificar: o.entregaModificacionSolicitada === true,
                                    ubicacion: !!o.ubicacionEntrega,
                                };
                            })
                            .filter(r => !['entregado', 'cancelado', 'borrador', 'no_entregado'].includes(r.status))
                    ),
                () => undefined
            ),
        [date]
    );

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Truck size={16} className="text-indigo-600" />
                    <h3 className="text-sm font-black text-gray-900">Alerta automática de entrega de mañana</h3>
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={enabled}
                        onChange={e => setDoc(doc(db, 'bot_config', 'delivery_alerts'), { enabled: e.target.checked, updatedAt: serverTimestamp() }, { merge: true })}
                        className="w-4 h-4 accent-indigo-600"
                    />
                    {enabled ? 'Activada' : 'Desactivada'}
                </label>
            </div>
            <p className="text-xs text-gray-500">
                Todos los días a las <strong>4:00 p.m.</strong> se envía por WhatsApp (línea principal 324) el aviso a los clientes con pedido programado para mañana ({date}): con el total a cobrar si es contraentrega.
                El cliente responde <strong>Confirmar</strong> o <strong>Modificar</strong> y puede compartir su ubicación; todo queda en el pedido y en la bandeja.
                La fecha sale de <em>Fecha programada de entrega</em> al asignar mensajero.
            </p>
            <div>
                <button onClick={() => setShowOpen(v => !v)} className="text-xs font-bold text-indigo-700 cursor-pointer">
                    {showOpen ? '▾' : '▸'} Marcar pedidos que se entregan mañana ({open.length} sin fecha)
                </button>
                {showOpen && (
                    <div className="mt-2 max-h-60 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
                        {open.length === 0 && <p className="p-3 text-xs text-gray-400">No hay pedidos confirmados o en preparación sin fecha.</p>}
                        {open.map(o => (
                            <div key={o.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
                                <span className="text-gray-800 truncate">{o.nombre} · {o.ciudad} · ${o.total.toLocaleString('es-CO')} · <span className="text-gray-400">{o.status}</span></span>
                                <button onClick={() => schedule(o.id, date)} className="shrink-0 px-2 py-1 rounded-lg bg-indigo-600 text-white font-bold cursor-pointer">Entrega mañana</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {rows.length === 0 ? (
                <p className="text-xs text-gray-400">No hay pedidos programados para mañana.</p>
            ) : (
                <>
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-gray-500 font-medium">
                            Selecciona pedidos pendientes para enviar la alerta ahora, sin esperar al envío automático de las 4pm.
                        </span>
                        <button
                            onClick={handleBulkSend}
                            disabled={selectedIds.size === 0 || isSendingBulk}
                            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-[11px] font-bold cursor-pointer"
                        >
                            <Send size={12} />
                            {isSendingBulk ? 'Enviando...' : `Enviar ahora (${selectedIds.size})`}
                        </button>
                    </div>
                    {bulkResult && <p className="text-[11px] font-bold text-gray-700">{bulkResult}</p>}
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-left text-gray-500 border-b border-gray-100">
                                    <th className="py-1.5 pr-2 font-bold w-6"></th>
                                    <th className="py-1.5 pr-2 font-bold">Cliente</th>
                                    <th className="py-1.5 px-2 font-bold">Ciudad</th>
                                    <th className="py-1.5 px-2 font-bold">Pago</th>
                                    <th className="py-1.5 px-2 font-bold">Alerta</th>
                                    <th className="py-1.5 pl-2 font-bold">Respuesta del cliente</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(r => (
                                    <tr key={r.id} className="border-b border-gray-50">
                                        <td className="py-1.5 pr-2">
                                            {!r.alertado && (
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(r.id)}
                                                    onChange={() => toggleSelected(r.id)}
                                                    className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer"
                                                />
                                            )}
                                        </td>
                                        <td className="py-1.5 pr-2 text-gray-800">{r.nombre}</td>
                                        <td className="py-1.5 px-2">{r.ciudad}</td>
                                        <td className="py-1.5 px-2">{r.metodoPago} {!r.alertado && <button onClick={() => schedule(r.id, null)} className="ml-1 text-[10px] text-red-500 underline cursor-pointer">quitar fecha</button>}</td>
                                        <td className="py-1.5 px-2">{r.alertado ? '✅ Enviada' : 'Pendiente'}</td>
                                        <td className="py-1.5 pl-2">
                                            {r.confirmado && <span className="text-emerald-700 font-bold">Confirmó </span>}
                                            {r.modificar && <span className="text-amber-700 font-bold">Pidió modificar </span>}
                                            {r.ubicacion && <span className="text-sky-700 font-bold">📍 Ubicación</span>}
                                            {!r.confirmado && !r.modificar && !r.ubicacion && <span className="text-gray-400">—</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
