'use client';

import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Radio } from 'lucide-react';
import { db } from '@/lib/firebase';

interface WebhookEvent {
    id: string;
    receivedAt: string;
    decision: 'entregado' | 'novedad' | 'informativo' | 'ignorado' | 'no_encontrado' | 'rechazado' | 'error';
    guia?: string | null;
    matchedOrderId?: string | null;
    statusRaw?: string | null;
    eventRaw?: string | null;
    detail?: string | null;
}

const DECISION_STYLE: Record<WebhookEvent['decision'], { label: string; cls: string }> = {
    entregado: { label: 'Marcado entregado', cls: 'bg-emerald-100 text-emerald-700' },
    novedad: { label: 'Novedad', cls: 'bg-orange-100 text-orange-700' },
    informativo: { label: 'Informativo', cls: 'bg-blue-100 text-blue-700' },
    ignorado: { label: 'Ignorado', cls: 'bg-gray-100 text-gray-600' },
    no_encontrado: { label: 'Pedido no encontrado', cls: 'bg-amber-100 text-amber-700' },
    rechazado: { label: 'Rechazado (token)', cls: 'bg-red-100 text-red-700' },
    error: { label: 'Error', cls: 'bg-red-100 text-red-700' },
};

/** Live list of the latest events received from 99 Envíos (proves whether the webhook is connected). */
export default function NinetyNineWebhookEvents() {
    const [events, setEvents] = useState<WebhookEvent[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'envios_webhook_events'), orderBy('receivedAt', 'desc'), limit(15));
        return onSnapshot(
            q,
            snap => {
                setEvents(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<WebhookEvent, 'id'>) })));
                setLoaded(true);
            },
            () => setLoaded(true)
        );
    }, []);

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-4">
            <h2 className="text-sm font-black text-gray-900 flex items-center gap-2 mb-1">
                <Radio size={15} className="text-indigo-600" />
                Historial de entregas actualizadas automáticamente
            </h2>
            <p className="text-[11px] text-gray-500 mb-3">
                Cada cambio de estado hecho desde el reporte de 99 Envíos (o desde un webhook, si 99 Envíos lo habilita) queda registrado aquí.
            </p>

            {!loaded ? (
                <p className="text-xs text-gray-400">Cargando...</p>
            ) : events.length === 0 ? (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
                    Aún no hay actualizaciones automáticas. Sube el reporte “Envíos Completos” de 99 Envíos arriba para actualizar las entregas.
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="text-[10px] uppercase text-gray-400 font-bold border-b border-gray-100">
                                <th className="py-1.5 pr-3">Hora</th>
                                <th className="py-1.5 pr-3">Resultado</th>
                                <th className="py-1.5 pr-3">Guía</th>
                                <th className="py-1.5 pr-3">Pedido</th>
                                <th className="py-1.5">Estado recibido</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {events.map(e => {
                                const style = DECISION_STYLE[e.decision] ?? DECISION_STYLE.informativo;
                                return (
                                    <tr key={e.id} title={e.detail ?? ''}>
                                        <td className="py-1.5 pr-3 text-gray-500 whitespace-nowrap">
                                            {new Date(e.receivedAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                                        </td>
                                        <td className="py-1.5 pr-3">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${style.cls}`}>{style.label}</span>
                                        </td>
                                        <td className="py-1.5 pr-3 font-mono">{e.guia ?? '-'}</td>
                                        <td className="py-1.5 pr-3 font-mono">{e.matchedOrderId ? `#${e.matchedOrderId.slice(-8)}` : '-'}</td>
                                        <td className="py-1.5 text-gray-600">{[e.statusRaw, e.eventRaw].filter(Boolean).join(' · ') || '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
