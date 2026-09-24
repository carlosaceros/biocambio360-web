'use client';

import { useState, useEffect } from 'react';
import {
    User,
    ShoppingBag,
    Phone,
    Mail,
    MapPin,
    Calendar,
    Tag,
    ChevronRight,
    ExternalLink,
    Clock,
    UserCheck,
    AlertCircle,
    CheckCircle2,
    Sparkles,
} from 'lucide-react';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import type { ConversationDoc } from '@/types/inbox';
import Link from 'next/link';
import { confirmPreOrder } from '@/lib/inbox-service';

interface CustomerData {
    name: string;
    email?: string;
    phone: string;
    city?: string;
    type?: 'b2c' | 'b2b';
    totalOrders?: number;
    totalSpent?: number;
    lastOrderDate?: string;
    lastOrderId?: string;
    lastOrderItems?: string;
}

interface ContactPanelProps {
    conversation: ConversationDoc | null;
    canAssign: boolean; // true for superadmin, director, gestor
    advisors: Array<{ uid: string; nombre: string; openConversations?: number }>;
    onAssign: (advisorUid: string) => Promise<void>;
    onAutoAssign: () => Promise<{ assigned: boolean; advisorName?: string; reason?: string; detail?: string } | null>;
}

export default function ContactPanel({
    conversation,
    canAssign,
    advisors,
    onAssign,
    onAutoAssign,
}: ContactPanelProps) {
    const [customer, setCustomer] = useState<CustomerData | null>(null);
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [selectedAdvisor, setSelectedAdvisor] = useState('');
    const [showHowItWorks, setShowHowItWorks] = useState(false);
    const [autoAssignResult, setAutoAssignResult] = useState<{ advisorName?: string; detail?: string; assigned: boolean } | null>(null);
    const [confirmingPreOrder, setConfirmingPreOrder] = useState(false);
    const [saleAmount, setSaleAmount] = useState('');
    const [savingSale, setSavingSale] = useState(false);
    const [saleFeedback, setSaleFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        if (!conversation?.contactPhone) {
            setCustomer(null);
            return;
        }
        loadCustomerData(conversation.contactPhone);
    }, [conversation?.contactPhone]);

    useEffect(() => {
        setSaleAmount('');
        setSaleFeedback(null);
        setAutoAssignResult(null);
        setSelectedAdvisor('');
    }, [conversation?.id]);

    const loadCustomerData = async (phone: string) => {
        setLoading(true);
        try {
            const cleanPhone = phone.replace(/\D/g, '');

            // Try searching in orders by phone
            const ordersRef = collection(db, 'orders');
            const phoneVariants = [cleanPhone, `+${cleanPhone}`, `+57${cleanPhone.slice(-10)}`];

            let customerData: CustomerData | null = null;

            for (const variant of phoneVariants) {
                const q = query(
                    ordersRef,
                    where('customerPhone', '==', variant),
                    orderBy('createdAt', 'desc'),
                    limit(1)
                );
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const order = snap.docs[0].data();
                    // Get all orders to calculate totals
                    const allOrdersQ = query(
                        ordersRef,
                        where('customerPhone', '==', variant),
                        where('status', '!=', 'cancelado')
                    );
                    const allSnap = await getDocs(allOrdersQ);
                    const totalOrders = allSnap.size;
                    const totalSpent = allSnap.docs.reduce((acc, d) => acc + (d.data().total ?? 0), 0);

                    customerData = {
                        name: order.customerName ?? conversation?.contactName ?? 'Desconocido',
                        email: order.customerEmail,
                        phone: variant,
                        city: order.shippingCity ?? order.customerCity,
                        type: order.orderType === 'b2b' ? 'b2b' : 'b2c',
                        totalOrders,
                        totalSpent,
                        lastOrderDate: order.createdAt?.seconds
                            ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('es-CO')
                            : undefined,
                        lastOrderId: snap.docs[0].id,
                        lastOrderItems: Array.isArray(order.items)
                            ? order.items.slice(0, 2).map((i: any) => i.product?.nombre ?? i.nombre ?? '').join(', ')
                            : '',
                    };
                    break;
                }
            }

            setCustomer(customerData);
        } catch (err) {
            console.error('[ContactPanel] Error loading customer:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleManualAssign = async () => {
        if (!selectedAdvisor) return;
        setAssigning(true);
        try {
            await onAssign(selectedAdvisor);
            setSelectedAdvisor('');
            setAutoAssignResult(null);
        } finally {
            setAssigning(false);
        }
    };

    const handleAutoAssign = async () => {
        setAssigning(true);
        try {
            const result = await onAutoAssign();
            if (result) setAutoAssignResult(result);
        } finally {
            setAssigning(false);
        }
    };

    const handleConfirmPreOrder = async () => {
        if (!conversation) return;
        setConfirmingPreOrder(true);
        try {
            await confirmPreOrder(conversation.id);
        } finally {
            setConfirmingPreOrder(false);
        }
    };

    const handleMarkSaleClosed = async () => {
        if (!conversation?.contactPhone) return;
        const value = Number(saleAmount.replace(/[^\d]/g, ''));
        if (!value || value <= 0) {
            setSaleFeedback({ type: 'error', message: 'Ingresa un valor válido' });
            return;
        }

        setSavingSale(true);
        setSaleFeedback(null);
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('No autenticado');
            const token = await user.getIdToken();

            const res = await fetch('/api/inbox/mark-sale', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    conversationId: conversation.id,
                    contactPhone: conversation.contactPhone,
                    contactName: conversation.contactName,
                    email: customer?.email,
                    value,
                    orderId: customer?.lastOrderId,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Error al registrar la venta');
            }

            setSaleAmount('');
            setSaleFeedback({ type: 'success', message: 'Venta registrada y reportada a Meta' });
        } catch (err: any) {
            setSaleFeedback({ type: 'error', message: err?.message || 'Error al registrar la venta' });
        } finally {
            setSavingSale(false);
        }
    };

    if (!conversation) {
        return (
            <div className="flex items-center justify-center h-full px-4 text-center">
                <p className="text-xs text-gray-400">Selecciona una conversación</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            {/* Contact header */}
            <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-100 to-teal-100 flex items-center justify-center font-bold text-green-700 text-lg uppercase">
                        {conversation.contactName?.charAt(0) ?? '?'}
                    </div>
                    <div>
                        <p className="font-bold text-gray-900 text-sm">{conversation.contactName}</p>
                        {conversation.contactPhone && (
                            <p className="text-xs text-gray-500">+{conversation.contactPhone}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Pre-order drafted by the AI agent (after hours) */}
            {conversation.preOrder && (conversation.preOrder.items?.length > 0 || !!conversation.preOrder.horarioContacto) && (
                <div className="p-4 border-b border-gray-100 space-y-2 bg-violet-50/40">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-extrabold uppercase text-violet-700 tracking-wider flex items-center gap-1">
                            <Sparkles size={11} /> Lead del Asistente IA
                        </p>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            conversation.preOrder.estado === 'confirmado'
                                ? 'bg-emerald-100 text-emerald-700'
                                : conversation.preOrder.estado === 'listo'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-amber-100 text-amber-700'
                        }`}>
                            {conversation.preOrder.estado === 'confirmado' ? 'Confirmado' : conversation.preOrder.estado === 'listo' ? 'Listo para confirmar' : 'Borrador'}
                        </span>
                    </div>
                    <ul className="text-xs text-gray-700 space-y-0.5">
                        {conversation.preOrder.items.map((it, i) => (
                            <li key={i} className="flex justify-between gap-2">
                                <span className="truncate">{it.producto}{it.presentacion ? ` · ${it.presentacion}` : ''}</span>
                                <span className="font-black shrink-0">x{it.cantidad}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="text-[11px] text-gray-500 space-y-0.5">
                        {conversation.preOrder.nombreCliente && <p><strong>Cliente:</strong> {conversation.preOrder.nombreCliente}</p>}
                        {(conversation.preOrder.direccion || conversation.preOrder.ciudad) && (
                            <p><strong>Entrega:</strong> {[conversation.preOrder.direccion, conversation.preOrder.ciudad].filter(Boolean).join(', ')}</p>
                        )}
                        {conversation.preOrder.metodoPago && <p><strong>Pago:</strong> {conversation.preOrder.metodoPago}</p>}
                        {conversation.preOrder.horarioContacto && (
                            <p><strong>Contactar:</strong> {{ manana: 'en la mañana', tarde: 'en la tarde', '7-9pm': 'entre 7 y 9 p.m.' }[conversation.preOrder.horarioContacto] ?? conversation.preOrder.horarioContacto}</p>
                        )}
                        {conversation.preOrder.notas && <p><strong>Notas:</strong> {conversation.preOrder.notas}</p>}
                    </div>
                    <p className="text-[10px] text-gray-400">Precios y disponibilidad los confirma el asesor.</p>
                    {conversation.preOrder.estado !== 'confirmado' && (
                        <button
                            onClick={handleConfirmPreOrder}
                            disabled={confirmingPreOrder}
                            className="w-full py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                        >
                            {confirmingPreOrder ? 'Confirmando...' : 'Confirmar pre-pedido'}
                        </button>
                    )}
                </div>
            )}

            {/* Mark closed sale (reports Purchase to Meta Conversions API) */}
            <div className="p-4 border-b border-gray-100 space-y-2">
                <p className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">
                    Venta cerrada por WhatsApp
                </p>
                <div className="flex flex-wrap gap-2">
                    <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Valor en COP"
                        value={saleAmount}
                        onChange={e => setSaleAmount(e.target.value)}
                        disabled={savingSale}
                        className="flex-1 min-w-[7rem] text-xs border border-gray-200 rounded-xl px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-green-400 disabled:opacity-50"
                    />
                    <button
                        onClick={handleMarkSaleClosed}
                        disabled={savingSale || !saleAmount}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
                    >
                        {savingSale ? (
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <CheckCircle2 size={12} />
                        )}
                        Marcar venta cerrada
                    </button>
                </div>
                {saleFeedback && (
                    <p className={`text-[11px] font-semibold ${saleFeedback.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                        {saleFeedback.message}
                    </p>
                )}
            </div>

            {/* Assignment panel (coordinators / superadmin only) */}
            {canAssign && (
                <div className="p-4 border-b border-gray-100 space-y-2">
                    <p className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">
                        Asignación de Lead
                    </p>
                    {conversation.assignedTo ? (
                        <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 rounded-xl px-3 py-2">
                            <UserCheck size={13} />
                            <span>Asignada a <strong>{conversation.assignedToName ?? 'Asesor'}</strong></span>
                        </div>
                    ) : (
                        <div className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2 flex items-center gap-2">
                            <AlertCircle size={12} />
                            Sin asignar
                        </div>
                    )}

                    {/* Result of the last smart assignment: who and why */}
                    {autoAssignResult && (
                        <div className={`text-[11px] rounded-xl px-3 py-2 ${autoAssignResult.assigned ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
                            {autoAssignResult.assigned ? (
                                <>
                                    <p className="font-bold">Asignada a {autoAssignResult.advisorName}</p>
                                    <p className="opacity-90">{autoAssignResult.detail}</p>
                                </>
                            ) : (
                                <p className="font-bold">No hay asesores activos para asignar. Crea usuarios con rol Asesor en Usuarios &amp; Auditoría.</p>
                            )}
                        </div>
                    )}

                    {/* Smart assignment */}
                    <button
                        onClick={handleAutoAssign}
                        disabled={assigning || advisors.length === 0}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                        {assigning ? (
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <UserCheck size={12} />
                        )}
                        Asignar automáticamente
                    </button>
                    <p className="text-[11px] text-gray-500 leading-snug">
                        Elige al asesor que corresponde según su historial con este cliente y su carga de trabajo. Puedes reasignarla a mano después.
                    </p>
                    <button
                        type="button"
                        onClick={() => setShowHowItWorks(v => !v)}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                        {showHowItWorks ? 'Ocultar cómo decide' : '¿Cómo decide?'}
                    </button>
                    {showHowItWorks && (
                        <ol className="text-[11px] text-gray-600 bg-indigo-50/60 rounded-xl px-3 py-2 space-y-1.5 list-decimal list-inside">
                            <li>
                                <strong>Historial:</strong> si este cliente ya fue atendido antes por un asesor activo, vuelve con el mismo.
                            </li>
                            <li>
                                <strong>Carga:</strong> si no, elige al asesor con menos conversaciones abiertas o asignadas en este momento.
                            </li>
                            <li>
                                <strong>Rotación:</strong> si hay empate, elige a quien lleva más tiempo sin recibir un cliente.
                            </li>
                            <li className="list-none -ml-4 pt-1 text-gray-500">
                                Solo participan usuarios con rol Asesor en estado activo. No envía ningún mensaje al cliente.
                            </li>
                        </ol>
                    )}

                    {/* Manual assign */}
                    <p className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider pt-1">Asignar manualmente</p>
                    {advisors.length === 0 ? (
                        <p className="text-[11px] text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
                            No hay asesores activos. Crea usuarios con rol <strong>Asesor</strong> (estado activo) en Usuarios &amp; Auditoría para poder asignar.
                        </p>
                    ) : (
                        <div className="flex gap-2">
                            <select
                                value={selectedAdvisor}
                                onChange={e => setSelectedAdvisor(e.target.value)}
                                className="flex-1 min-w-0 text-xs border border-gray-200 rounded-xl px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-indigo-400"
                            >
                                <option value="">Elegir asesor...</option>
                                {advisors.map(a => (
                                    <option key={a.uid} value={a.uid}>
                                        {a.nombre}
                                        {a.openConversations !== undefined ? ` (${a.openConversations} activas)` : ''}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={handleManualAssign}
                                disabled={!selectedAdvisor || assigning}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                            >
                                Asignar
                            </button>
                        </div>
                    )}

                    {/* Advisor workload preview */}
                    {advisors.length > 0 && (
                        <div className="mt-1 space-y-1">
                            <p className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">Carga actual</p>
                            {advisors.slice(0, 6).map(a => (
                                <div key={a.uid} className="flex items-center justify-between text-[11px] text-gray-500">
                                    <span>{a.nombre}</span>
                                    <span className={`font-bold ${(a.openConversations ?? 0) > 10 ? 'text-red-500' : 'text-green-600'}`}>
                                        {a.openConversations ?? 0} activas
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Customer data from CRM */}
            <div className="p-4 space-y-3">
                <p className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">Perfil CRM</p>

                {loading ? (
                    <div className="animate-pulse space-y-2">
                        <div className="h-3 bg-gray-100 rounded w-3/4" />
                        <div className="h-3 bg-gray-100 rounded w-1/2" />
                        <div className="h-3 bg-gray-100 rounded w-2/3" />
                    </div>
                ) : customer ? (
                    <div className="space-y-2 text-xs text-gray-600">
                        {customer.email && (
                            <div className="flex items-center gap-2">
                                <Mail size={12} className="text-gray-400 shrink-0" />
                                <span className="truncate">{customer.email}</span>
                            </div>
                        )}
                        {customer.city && (
                            <div className="flex items-center gap-2">
                                <MapPin size={12} className="text-gray-400 shrink-0" />
                                {customer.city}
                            </div>
                        )}
                        {customer.type && (
                            <div className="flex items-center gap-2">
                                <Tag size={12} className="text-gray-400 shrink-0" />
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${customer.type === 'b2b' ? 'bg-teal-50 text-teal-700' : 'bg-slate-50 text-slate-700'}`}>
                                    {customer.type === 'b2b' ? '🏢 B2B Empresa' : '🛒 B2C Hogar'}
                                </span>
                            </div>
                        )}

                        {/* Purchase stats */}
                        {customer.totalOrders !== undefined && (
                            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 mt-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Total pedidos</span>
                                    <span className="font-bold text-gray-900">{customer.totalOrders}</span>
                                </div>
                                {customer.totalSpent !== undefined && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Total gastado</span>
                                        <span className="font-bold text-green-700">
                                            {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(customer.totalSpent)}
                                        </span>
                                    </div>
                                )}
                                {customer.lastOrderDate && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Último pedido</span>
                                        <span className="font-semibold text-gray-700">{customer.lastOrderDate}</span>
                                    </div>
                                )}
                                {customer.lastOrderItems && (
                                    <div className="text-[10px] text-gray-400 mt-1 truncate" title={customer.lastOrderItems}>
                                        📦 {customer.lastOrderItems}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Links */}
                        <div className="flex flex-col gap-1.5 mt-2">
                            <Link
                                href={`/admin/clientes?phone=${conversation.contactPhone}`}
                                className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-semibold"
                            >
                                <User size={11} />
                                Ver perfil completo
                                <ExternalLink size={10} />
                            </Link>
                            <Link
                                href={`/admin/reabastecimiento?phone=${conversation.contactPhone}`}
                                className="flex items-center gap-1.5 text-amber-600 hover:text-amber-800 font-semibold"
                            >
                                <Clock size={11} />
                                Ver timer reabastecimiento
                                <ExternalLink size={10} />
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3 text-center">
                        <ShoppingBag size={20} className="mx-auto mb-1 text-gray-200" />
                        No hay pedidos registrados para este número
                    </div>
                )}
            </div>

            {/* Conversation tags */}
            {conversation.tags && conversation.tags.length > 0 && (
                <div className="px-4 pb-4">
                    <p className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider mb-2">Etiquetas</p>
                    <div className="flex flex-wrap gap-1">
                        {conversation.tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-semibold">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
