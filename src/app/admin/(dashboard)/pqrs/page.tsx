'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ArrowLeft, ChevronDown, ChevronUp, MessageSquare, Phone, ShieldAlert } from 'lucide-react';
import { db } from '@/lib/firebase';

type PqrsEstado = 'nuevo' | 'en_gestion' | 'resuelto';

interface Pqrs {
    id: string;
    tipo: 'peticion' | 'queja' | 'reclamo' | 'sugerencia';
    descripcion: string;
    pedidoRef?: string;
    producto?: string;
    nombreCliente?: string;
    telefono?: string;
    contactoPreferido?: string;
    prioridad?: 'alta' | 'normal';
    estado: PqrsEstado;
    mensajes?: string[];
    createdAt?: { toDate?: () => Date };
}

const TIPO_STYLE: Record<Pqrs['tipo'], { label: string; cls: string }> = {
    reclamo: { label: 'Reclamo', cls: 'bg-red-100 text-red-700' },
    queja: { label: 'Queja', cls: 'bg-orange-100 text-orange-700' },
    peticion: { label: 'Petición', cls: 'bg-blue-100 text-blue-700' },
    sugerencia: { label: 'Sugerencia', cls: 'bg-emerald-100 text-emerald-700' },
};

const ESTADOS: Array<{ key: PqrsEstado; label: string }> = [
    { key: 'nuevo', label: 'Nuevo' },
    { key: 'en_gestion', label: 'En gestión' },
    { key: 'resuelto', label: 'Resuelto' },
];

const CONTACTO: Record<string, string> = { manana: 'en la mañana', tarde: 'en la tarde', '7-9pm': 'entre 7 y 9 p.m.' };

export default function PqrsPage() {
    const router = useRouter();
    const [items, setItems] = useState<Pqrs[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<PqrsEstado | 'todos'>('todos');
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => {
        const q = query(collection(db, 'pqrs'), orderBy('createdAt', 'desc'), limit(200));
        return onSnapshot(
            q,
            snap => {
                setItems(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Pqrs, 'id'>) })));
                setLoading(false);
            },
            () => setLoading(false)
        );
    }, []);

    const counts = useMemo(() => {
        const c: Record<string, number> = { todos: items.length, nuevo: 0, en_gestion: 0, resuelto: 0 };
        items.forEach(i => { c[i.estado] = (c[i.estado] ?? 0) + 1; });
        return c;
    }, [items]);

    const visible = filter === 'todos' ? items : items.filter(i => i.estado === filter);

    const setEstado = async (id: string, estado: PqrsEstado) => {
        await updateDoc(doc(db, 'pqrs', id), { estado, updatedAt: serverTimestamp() });
    };

    return (
        <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto">
            <div className="border-b border-gray-100 pb-4">
                <button
                    onClick={() => router.push('/admin')}
                    className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1 mb-2 cursor-pointer"
                >
                    <ArrowLeft size={14} /> Volver al Dashboard
                </button>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-2">
                    <ShieldAlert className="text-red-600" size={28} />
                    PQRS
                </h1>
                <p className="text-xs text-gray-500">
                    Peticiones, quejas, reclamos y sugerencias recibidos por WhatsApp. Cada caso llega con el resumen del cliente y su horario de contacto preferido.
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                {(['todos', ...ESTADOS.map(e => e.key)] as Array<PqrsEstado | 'todos'>).map(key => (
                    <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-colors cursor-pointer ${
                            filter === key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        {key === 'todos' ? 'Todos' : ESTADOS.find(e => e.key === key)?.label} ({counts[key] ?? 0})
                    </button>
                ))}
            </div>

            {loading ? (
                <p className="text-sm text-gray-400 text-center py-10">Cargando...</p>
            ) : visible.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-10 border border-dashed border-gray-200 rounded-2xl">
                    No hay casos en esta vista.
                </p>
            ) : (
                <div className="space-y-3">
                    {visible.map(p => {
                        const tipo = TIPO_STYLE[p.tipo] ?? TIPO_STYLE.peticion;
                        const created = p.createdAt?.toDate?.();
                        const isOpen = expanded === p.id;
                        return (
                            <div key={p.id} className="bg-white rounded-2xl border border-gray-200 shadow-xs p-4 space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${tipo.cls}`}>{tipo.label}</span>
                                    {p.prioridad === 'alta' && (
                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-600 text-white">Prioridad alta</span>
                                    )}
                                    <span className="text-xs text-gray-400 ml-auto">
                                        {created ? created.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                                    </span>
                                </div>

                                <p className="text-sm text-gray-900 font-semibold">{p.descripcion}</p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600">
                                    <p><strong>Cliente:</strong> {p.nombreCliente || 'Sin nombre'}</p>
                                    <p className="flex items-center gap-1">
                                        <Phone size={11} />
                                        {p.telefono ? (
                                            <a href={`https://wa.me/${p.telefono.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-emerald-700 font-bold hover:underline">
                                                +{p.telefono.replace(/\D/g, '')}
                                            </a>
                                        ) : 'Sin teléfono'}
                                    </p>
                                    {p.producto && <p><strong>Producto:</strong> {p.producto}</p>}
                                    {p.pedidoRef && <p><strong>Pedido / fecha:</strong> {p.pedidoRef}</p>}
                                    {p.contactoPreferido && <p><strong>Contactar:</strong> {CONTACTO[p.contactoPreferido] ?? p.contactoPreferido}</p>}
                                </div>

                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                    {ESTADOS.map(e => (
                                        <button
                                            key={e.key}
                                            onClick={() => setEstado(p.id, e.key)}
                                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer ${
                                                p.estado === e.key
                                                    ? e.key === 'resuelto'
                                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                                        : e.key === 'en_gestion'
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : 'bg-amber-500 text-white border-amber-500'
                                                    : 'text-gray-500 border-gray-200 hover:bg-gray-50'
                                            }`}
                                        >
                                            {p.estado === e.key ? '✓ ' : ''}{e.label}
                                        </button>
                                    ))}
                                    <Link href="/admin/inbox" className="ml-auto text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                                        <MessageSquare size={12} /> Abrir bandeja
                                    </Link>
                                </div>

                                {p.mensajes && p.mensajes.length > 0 && (
                                    <div>
                                        <button
                                            onClick={() => setExpanded(isOpen ? null : p.id)}
                                            className="text-[11px] font-bold text-gray-500 hover:text-gray-800 flex items-center gap-1 cursor-pointer"
                                        >
                                            {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                            Conversación reciente
                                        </button>
                                        {isOpen && (
                                            <div className="mt-2 bg-gray-50 rounded-xl p-3 space-y-1 text-[11px] text-gray-600">
                                                {p.mensajes.map((m, i) => <p key={i}>{m}</p>)}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
