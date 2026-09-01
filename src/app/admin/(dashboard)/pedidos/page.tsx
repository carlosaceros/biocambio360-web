'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    useDraggable,
    useDroppable,
    defaultDropAnimationSideEffects,
    DropAnimation
} from '@dnd-kit/core';
import {
    Search,
    Filter,
    MessageCircle,
    Phone,
    Package,
    ArrowLeft,
    Clock,
    MapPin,
    CreditCard,
    User,
    Calendar,
    X,
    Key,
    Shield,
    Ticket,
    RefreshCw,
    ExternalLink,
    ShieldCheck,
    Target,
    Globe,
    Send,
    FileText,
    ArrowRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { subscribeToOrders, updateOrderStatus, addOrderInternalNote } from '@/lib/orders-service';
import { Order, OrderStatus, ORDER_STATUS_CONFIG, TimelineEvent, OrderInternalNote } from '@/types/order';
import { formatCurrency } from '@/lib/checkout-utils';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';
import ChangePasswordModal from '@/components/admin/ChangePasswordModal';

/**
 * Safely convert a Firestore Timestamp (or serialized version) to a JS Date.
 */
function safeToDate(timestamp: any): Date {
    if (!timestamp) return new Date();
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
    if (typeof timestamp === 'string' || typeof timestamp === 'number') return new Date(timestamp);
    return new Date();
}

/**
 * Safely convert a Firestore value to an array.
 * Firestore may serialize arrays as objects with numeric keys ({0: ..., 1: ...}).
 */
function safeToArray<T>(value: any): T[] {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'object') {
        // Convert object with numeric keys to array
        return Object.keys(value)
            .sort((a, b) => Number(a) - Number(b))
            .map(key => value[key]);
    }
    return [];
}

const ALL_STATUSES: OrderStatus[] = [
    'pendiente',
    'confirmado',
    'preparacion',
    'enviado',
    'en_camino',
    'entregado',
    'cancelado'
];

interface OrderCardProps {
    order: Order & { id: string };
    onClick: () => void;
    isOverlay?: boolean;
}

function getOriginBadge(origen?: Order['origen']) {
    if (!origen || !origen.etiqueta) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-50 text-gray-500 border border-gray-200" title="Tráfico Directo">
                Directo
            </span>
        );
    }

    const { tipo, etiqueta } = origen;
    const label = etiqueta || 'Directo';

    if (tipo === 'pauta_meta') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-pink-50 text-pink-700 border border-pink-200" title="Tráfico de Pauta Meta / Instagram Ads">
                🎯 {label}
            </span>
        );
    }
    if (tipo === 'pauta_google') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200" title="Tráfico de Google Ads">
                🎯 {label}
            </span>
        );
    }
    if (tipo === 'organico') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200" title="Tráfico Orgánico">
                🌱 {label}
            </span>
        );
    }
    if (tipo === 'referido') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200" title="Tráfico Referido">
                🔗 {label}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-50 text-gray-500 border border-gray-200">
            {label}
        </span>
    );
}

function OrderCard({ order, onClick, isOverlay }: OrderCardProps) {
    const config = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG['pendiente'];
    const timeAgo = formatDistanceToNow(safeToDate(order.createdAt), {
        addSuffix: true,
        locale: es
    });

    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: order.id,
        data: { order }
    });

    const customerPhone = (order.cliente?.celular || '').replace(/\D/g, '');
    const customerName = order.cliente?.nombre || 'Cliente';
    const whatsappUrl = customerPhone
        ? `https://wa.me/57${customerPhone}?text=${encodeURIComponent(
            `Hola ${customerName}, tu pedido ${order.id} está en proceso.`
        )}`
        : '#';

    if (isDragging && !isOverlay) {
        return (
            <div
                ref={setNodeRef}
                className="bg-gray-100 rounded-xl p-4 h-32 border-2 border-dashed border-gray-300 opacity-50"
            />
        );
    }

    return (
        <div
            ref={setNodeRef}
            {...attributes}
            {...listeners}
            className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-red-200 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group ${isOverlay ? 'rotate-3 scale-105 shadow-xl border-red-500/50' : ''}`}
            onClick={onClick}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div>
                    <p className="text-xs text-gray-500 mb-1">#{order.id.slice(-8)}</p>
                    <p className="font-black text-gray-900 text-sm">{customerName}</p>
                </div>
                <div className={`${config.bgColor} ${config.color} rounded-lg px-2 py-1 text-xs font-bold`}>
                    {config.icon}
                </div>
            </div>

            {/* Location */}
            <p className="text-xs text-gray-600 mb-2 truncate">
                📍 {order.cliente?.ciudad || 'Colombia'}{order.cliente?.departamento ? `, ${order.cliente.departamento}` : ''}
            </p>

            {/* Products Summary, Payment Method, Coupon & Origen Badge */}
            <div className="mb-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                        {safeToArray(order.productos).length} producto{safeToArray(order.productos).length > 1 ? 's' : ''}
                    </span>
                    {order.metodoPago === 'wompi' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                            <CreditCard size={11} className="text-blue-600" />
                            {order.wompiTransaction?.status === 'APPROVED' ? 'Wompi: Pagado' : 'Wompi'}
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                            💵 Contraentrega
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                    {getOriginBadge(order.origen)}
                    {order.cuponAplicado && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200" title={`Cupón ${order.cuponAplicado.code}`}>
                            <Ticket size={11} className="text-purple-600" />
                            {order.cuponAplicado.code} (-{formatCurrency(order.cuponAplicado.discountAmount || 0)})
                        </span>
                    )}
                </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between mb-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-600">Total:</span>
                <span className="font-black text-lg text-gray-900">{formatCurrency(order.total)}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()} // Prevent drag start on button
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                    <MessageCircle size={14} />
                    WhatsApp
                </a>
                <div className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={12} />
                    {timeAgo}
                </div>
            </div>
        </div>
    );
}

interface KanbanColumnProps {
    status: OrderStatus;
    orders: (Order & { id: string })[];
    onOrderClick: (order: Order & { id: string }) => void;
}

function KanbanColumn({ status, orders, onOrderClick }: KanbanColumnProps) {
    const config = ORDER_STATUS_CONFIG[status];
    const { setNodeRef, isOver } = useDroppable({
        id: status
    });

    return (
        <div className="flex-shrink-0 w-80 flex flex-col h-full bg-gray-50/50 rounded-xl border border-gray-100">
            {/* Column Header */}
            <div className={`${config.bgColor} rounded-t-xl p-4 sticky top-0 z-10 border-b border-gray-100`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{config.icon}</span>
                        <div>
                            <h3 className={`font-black ${config.color}`}>{config.label}</h3>
                            <p className="text-xs text-gray-600">{orders.length} pedido{orders.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Orders List */}
            <div
                ref={setNodeRef}
                className={`flex-1 p-3 space-y-3 overflow-y-auto transition-colors ${isOver ? 'bg-red-50/50' : ''}`}
                style={{ maxHeight: 'calc(100vh - 220px)', minHeight: '200px' }}
            >
                {orders.map((order) => (
                    <OrderCard
                        key={order.id}
                        order={order}
                        onClick={() => onOrderClick(order)}
                    />
                ))}
                {orders.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                        Arrastra pedidos aquí
                    </div>
                )}
            </div>
        </div>
    );
}

export default function PedidosPage() {
    const router = useRouter();
    const { user, userProfile, role } = useAuth();
    const [orders, setOrders] = useState<(Order & { id: string })[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeOrder, setActiveOrder] = useState<(Order & { id: string }) | null>(null);
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isCheckingWompi, setIsCheckingWompi] = useState(false);
    const [wompiStatusFeedback, setWompiStatusFeedback] = useState<string | null>(null);

    // Modal de Cambio de Etapa con Comentario Logístico
    const [stageChangePrompt, setStageChangePrompt] = useState<{
        isOpen: boolean;
        orderId: string;
        orderTitle: string;
        prevStatus: OrderStatus;
        targetStatus: OrderStatus;
    } | null>(null);
    const [stageNoteText, setStageNoteText] = useState('');
    const [isSubmittingStageChange, setIsSubmittingStageChange] = useState(false);

    // Estado para nueva nota interna en modal de detalle
    const [newInternalNoteText, setNewInternalNoteText] = useState('');
    const [isAddingInternalNote, setIsAddingInternalNote] = useState(false);

    const handleCheckWompi = async (orderId: string) => {
        setIsCheckingWompi(true);
        setWompiStatusFeedback(null);
        try {
            const res = await fetch(`/api/admin/wompi-status?orderId=${orderId}`);
            const data = await res.json();
            if (data.wompiTransaction) {
                setActiveOrder(prev => prev && prev.id === orderId ? { ...prev, wompiTransaction: data.wompiTransaction, status: data.orderStatus || prev.status } : prev);
                setOrders(prev => prev.map(o => o.id === orderId ? { ...o, wompiTransaction: data.wompiTransaction, status: data.orderStatus || o.status } : o));
                setWompiStatusFeedback(`✅ ${data.message || 'Datos de Wompi actualizados'}`);
            } else {
                setWompiStatusFeedback(`ℹ️ ${data.message || 'Sin transacción confirmada en Wompi aún'}`);
            }
        } catch (e: any) {
            setWompiStatusFeedback(`❌ Error al consultar Wompi: ${e.message}`);
        } finally {
            setIsCheckingWompi(false);
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    useEffect(() => {
        const unsubscribe = subscribeToOrders((fetchedOrders) => {
            setOrders(fetchedOrders);
        });

        return unsubscribe;
    }, []);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragId(null);

        if (!over) return;

        const orderId = active.id as string;
        const newStatus = over.id as OrderStatus;
        const order = orders.find(o => o.id === orderId);
        const previousStatus = order?.status;

        if (order && previousStatus && previousStatus !== newStatus) {
            setStageNoteText('');
            setStageChangePrompt({
                isOpen: true,
                orderId,
                orderTitle: `Pedido #${order.id.slice(-8)} · ${order.cliente.nombre}`,
                prevStatus: previousStatus,
                targetStatus: newStatus
            });
        }
    };

    const handleConfirmStageChange = async (withNote = true) => {
        if (!stageChangePrompt) return;
        const { orderId, prevStatus, targetStatus } = stageChangePrompt;
        const noteToSend = withNote && stageNoteText.trim() 
            ? stageNoteText.trim() 
            : `Estado actualizado a ${ORDER_STATUS_CONFIG[targetStatus].label}`;

        setIsSubmittingStageChange(true);
        // Optimistic update
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: targetStatus } : o));
        if (activeOrder && activeOrder.id === orderId) {
            setActiveOrder(prev => prev ? { ...prev, status: targetStatus } : null);
        }

        try {
            await updateOrderStatus(
                orderId,
                targetStatus,
                noteToSend,
                {
                    email: user?.email || '',
                    nombre: userProfile?.nombre || (role === 'superadmin' ? 'Super Admin' : 'Rol Logístico'),
                    role: role || 'logistico'
                }
            );
            setStageChangePrompt(null);
            setStageNoteText('');
        } catch (error: any) {
            console.error('[Kanban] Error updating order status:', error?.message || error);
            // Revert
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: prevStatus } : o));
            if (activeOrder && activeOrder.id === orderId) {
                setActiveOrder(prev => prev ? { ...prev, status: prevStatus } : null);
            }
            alert(`No se pudo actualizar el estado del pedido: ${error?.message || 'Error de conexión'}`);
        } finally {
            setIsSubmittingStageChange(false);
        }
    };

    const handleAddDirectNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeOrder || !newInternalNoteText.trim()) return;

        setIsAddingInternalNote(true);
        try {
            const addedNote = await addOrderInternalNote(
                activeOrder.id,
                newInternalNoteText.trim(),
                {
                    email: user?.email || '',
                    nombre: userProfile?.nombre || (role === 'superadmin' ? 'Super Admin' : 'Rol Logístico'),
                    role: role || 'logistico'
                },
                activeOrder.status
            );

            setActiveOrder(prev => prev ? {
                ...prev,
                notasInternas: [...(prev.notasInternas || []), addedNote]
            } : null);

            setOrders(prev => prev.map(o => o.id === activeOrder.id ? {
                ...o,
                notasInternas: [...(o.notasInternas || []), addedNote]
            } : o));

            setNewInternalNoteText('');
        } catch (err: any) {
            alert(`Error al guardar la nota: ${err.message}`);
        } finally {
            setIsAddingInternalNote(false);
        }
    };

    const dropAnimation: DropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.5',
                },
            },
        }),
    };

    const filteredOrders = orders.filter(order => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            order.id.toLowerCase().includes(query) ||
            order.cliente.nombre.toLowerCase().includes(query) ||
            order.cliente.celular.includes(query) ||
            order.cliente.ciudad.toLowerCase().includes(query)
        );
    });

    const ordersByStatus = ALL_STATUSES.reduce((acc, status) => {
        acc[status] = filteredOrders
            .filter(order => order.status === status)
            .sort((a, b) => {
                // Más reciente primero dentro de cada columna
                const getMs = (ts: any): number => {
                    if (!ts) return 0;
                    if (typeof ts.toMillis === 'function') return ts.toMillis();
                    if (ts.seconds) return ts.seconds * 1000;
                    return new Date(ts).getTime();
                };
                return getMs(b.createdAt) - getMs(a.createdAt);
            });
        return acc;
    }, {} as Record<OrderStatus, (Order & { id: string })[]>);

    const activeDragOrder = activeDragId ? orders.find(o => o.id === activeDragId) : null;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Top Bar */}
            <header className="bg-white border-b shadow-sm sticky top-0 z-20">
                <div className="max-w-full px-4 md:px-6 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => router.push('/admin')}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft size={20} className="text-gray-600" />
                            </motion.button>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl md:text-2xl font-black text-gray-900" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
                                        GESTIÓN DE PEDIDOS
                                    </h1>
                                    {(role === 'gestor_pedidos' || role === 'logistico' || role === 'logistica') && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            <Shield size={11} className="text-emerald-600" />
                                            {role === 'logistico' || role === 'logistica' ? 'LOGÍSTICA' : 'GESTOR'}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500">{orders.length} pedidos totales</p>
                            </div>
                        </div>

                        {/* Botón Cambiar Contraseña */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsPasswordModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition-colors"
                                title="Cambiar mi contraseña"
                            >
                                <Key size={14} className="text-indigo-600" />
                                <span className="hidden sm:inline">Cambiar Clave</span>
                            </button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar por ID, nombre, teléfono o ciudad..."
                            className="w-full pl-12 pr-4 py-3 bg-gray-100 border-2 border-transparent rounded-xl focus:bg-white focus:border-red-500 focus:outline-none transition-colors"
                        />
                    </div>
                </div>
            </header>

            {/* Kanban Board */}
            <main className="flex-1 p-6 overflow-x-auto">
                <DndContext
                    sensors={sensors}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex gap-4 min-w-max h-full">
                        {ALL_STATUSES.map((status) => (
                            <KanbanColumn
                                key={status}
                                status={status}
                                orders={ordersByStatus[status]}
                                onOrderClick={setActiveOrder}
                            />
                        ))}
                    </div>

                    <DragOverlay dropAnimation={dropAnimation}>
                        {activeDragOrder ? (
                            <div className="w-80">
                                <OrderCard
                                    order={activeDragOrder}
                                    onClick={() => { }}
                                    isOverlay
                                />
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </main>

            {/* Order Detail Modal */}
            <AnimatePresence>
                {activeOrder && (
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setActiveOrder(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h2 className="text-2xl font-black">Pedido #{activeOrder.id.slice(-8)}</h2>
                                        <span className={`${ORDER_STATUS_CONFIG[activeOrder.status].bgColor} ${ORDER_STATUS_CONFIG[activeOrder.status].color} px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1`}>
                                            {ORDER_STATUS_CONFIG[activeOrder.status].icon}
                                            {ORDER_STATUS_CONFIG[activeOrder.status].label}
                                        </span>
                                    </div>
                                    <p className="text-gray-500 text-sm flex items-center gap-1">
                                        <Calendar size={14} />
                                        {format(safeToDate(activeOrder.createdAt), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setActiveOrder(null)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X size={24} className="text-gray-400" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Left Column: Products & Financials */}
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <Package className="text-red-600" size={18} />
                                                Productos
                                            </h3>
                                            <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                                                {safeToArray(activeOrder.productos).map((item: any, idx: number) => (
                                                    <div key={idx} className="flex gap-4">
                                                        <div className="relative w-16 h-16 bg-white rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
                                                            <Image
                                                                src={`/images/${item.product?.imgFile || 'placeholder.png'}`}
                                                                alt={item.product?.nombre || item.nombre || 'Producto'}
                                                                fill
                                                                className="object-contain p-1"
                                                            />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="font-bold text-gray-900 line-clamp-2">{item.product?.nombre || item.nombre || 'Producto'}</p>
                                                            <p className="text-sm text-gray-500">{item.size || 'Estándar'}</p>
                                                            <div className="flex justify-between items-center mt-1">
                                                                <span className="text-sm font-medium">x{item.cantidad || 1}</span>
                                                                <span className="font-bold">{formatCurrency((item.price || 0) * (item.cantidad || 1))}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Subtotal</span>
                                                <span className="font-medium">{formatCurrency(activeOrder.subtotal || 0)}</span>
                                            </div>

                                            {activeOrder.cuponAplicado && (
                                                <div className="flex justify-between items-center text-sm text-purple-800 font-bold bg-purple-50 p-2.5 rounded-lg border border-purple-200">
                                                    <div className="flex items-center gap-1.5">
                                                        <Ticket size={15} className="text-purple-600 flex-shrink-0" />
                                                        <span>Cupón {activeOrder.cuponAplicado.code}</span>
                                                        {activeOrder.cuponAplicado.type === 'percentage' && (
                                                            <span className="text-[11px] text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded font-black">
                                                                -{activeOrder.cuponAplicado.value}%
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="font-black text-purple-900">
                                                        -{formatCurrency(activeOrder.cuponAplicado.discountAmount || ((activeOrder.subtotal || 0) - (activeOrder.total || 0) + (activeOrder.envio || 0)))}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Envío</span>
                                                <span className="font-medium text-green-600">
                                                    {activeOrder.envio === 0 ? 'GRATIS' : formatCurrency(activeOrder.envio || 0)}
                                                </span>
                                            </div>
                                            <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                                                <span className="font-black text-lg">Total</span>
                                                <span className="font-black text-xl text-red-600">{formatCurrency(activeOrder.total || 0)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Customer & Shipping */}
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <User className="text-blue-600" size={18} />
                                                Cliente
                                            </h3>
                                            <div className="bg-white border rounded-xl p-4 space-y-3">
                                                <div>
                                                    <p className="text-xs text-gray-500">Nombre</p>
                                                    <p className="font-bold text-gray-900">{activeOrder.cliente?.nombre || 'Sin nombre'}</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-xs text-gray-500">Cédula</p>
                                                        <p className="font-medium">{activeOrder.cliente?.cedula || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Celular</p>
                                                        <p className="font-medium">{activeOrder.cliente?.celular || 'N/A'}</p>
                                                    </div>
                                                </div>
                                                {activeOrder.cliente?.email && (
                                                    <div>
                                                        <p className="text-xs text-gray-500">Email</p>
                                                        <p className="font-medium break-all">{activeOrder.cliente.email}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <MapPin className="text-orange-600" size={18} />
                                                Envío
                                            </h3>
                                            <div className="bg-white border rounded-xl p-4 space-y-3">
                                                <div>
                                                    <p className="text-xs text-gray-500">Dirección</p>
                                                    <p className="font-bold text-gray-900">{activeOrder.cliente?.direccion || 'N/A'}</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-xs text-gray-500">Ciudad</p>
                                                        <p className="font-medium">{activeOrder.cliente?.ciudad || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500">Departamento</p>
                                                        <p className="font-medium">{activeOrder.cliente?.departamento || 'N/A'}</p>
                                                    </div>
                                                </div>
                                                {activeOrder.cliente?.notas && (
                                                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 mt-2">
                                                        <p className="text-xs text-yellow-800 font-bold mb-1">Notas de entrega:</p>
                                                        <p className="text-sm text-yellow-900 italic">"{activeOrder.cliente.notas}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Traffic Attribution & Origin */}
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <Target className="text-pink-600" size={18} />
                                                Origen & Trazabilidad de Marketing
                                            </h3>
                                            <div className="bg-white border rounded-xl p-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-gray-500 font-bold uppercase">Fuente Detectada</span>
                                                    {getOriginBadge(activeOrder.origen)}
                                                </div>
                                                {activeOrder.origen?.campana && (
                                                    <div>
                                                        <p className="text-xs text-gray-500">Campaña de Pauta</p>
                                                        <p className="font-bold text-gray-900 text-xs font-mono bg-pink-50 text-pink-800 p-2 rounded-lg border border-pink-100 mt-0.5">
                                                            {activeOrder.origen.campana}
                                                        </p>
                                                    </div>
                                                )}
                                                {activeOrder.origen?.medio && (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <p className="text-xs text-gray-500">Medio / Formato</p>
                                                            <p className="font-medium text-xs text-gray-800 mt-0.5">{activeOrder.origen.medio}</p>
                                                        </div>
                                                        {activeOrder.origen?.contenido && (
                                                            <div>
                                                                <p className="text-xs text-gray-500">Anuncio / Creativo</p>
                                                                <p className="font-medium text-xs text-gray-800 mt-0.5">{activeOrder.origen.contenido}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {activeOrder.origen?.landingPage && (
                                                    <div>
                                                        <p className="text-xs text-gray-500">Página de Entrada (Landing)</p>
                                                        <p className="font-mono text-xs text-blue-600 bg-blue-50/50 p-1.5 rounded-lg border border-blue-100 truncate mt-0.5">
                                                            {activeOrder.origen.landingPage}
                                                        </p>
                                                    </div>
                                                )}
                                                {activeOrder.origen?.referrer && (
                                                    <div>
                                                        <p className="text-xs text-gray-500">Referrer URL</p>
                                                        <p className="font-mono text-[11px] text-gray-400 truncate mt-0.5">
                                                            {activeOrder.origen.referrer}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Payment Method & Wompi Technical Transaction Card */}
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <CreditCard className="text-blue-600" size={18} />
                                                Método de Pago & Transacción
                                            </h3>
                                            <div className={`border rounded-xl p-4 space-y-3 ${
                                                activeOrder.metodoPago === 'wompi'
                                                    ? 'bg-blue-50/40 border-blue-200'
                                                    : 'bg-amber-50/40 border-amber-200'
                                            }`}>
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xl">
                                                            {activeOrder.metodoPago === 'wompi' ? '💳' : '💵'}
                                                        </span>
                                                        <div>
                                                            <p className="font-black text-gray-900 text-sm">
                                                                {activeOrder.metodoPago === 'wompi'
                                                                    ? 'Pago en Línea (Wompi)'
                                                                    : 'Pago Contraentrega (Efectivo/Nequi)'}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {activeOrder.metodoPago === 'wompi'
                                                                    ? 'Pasarela Wompi · Bancolombia'
                                                                    : 'Cobro por repartidor / transportadora'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {activeOrder.metodoPago === 'wompi' && (
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1 ${
                                                            activeOrder.wompiTransaction?.status === 'APPROVED'
                                                                ? 'bg-green-100 text-green-800 border border-green-300'
                                                                : activeOrder.wompiTransaction?.status === 'DECLINED'
                                                                ? 'bg-red-100 text-red-800 border border-red-300'
                                                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                                                        }`}>
                                                            {activeOrder.wompiTransaction?.status === 'APPROVED'
                                                                ? '✅ PAGADO (WOMPI APROBADO)'
                                                                : activeOrder.wompiTransaction?.status === 'DECLINED'
                                                                ? '❌ PAGO RECHAZADO'
                                                                : '⏳ SIN PAGO EN PASARELA'}
                                                        </span>
                                                    )}
                                                </div>

                                                {activeOrder.metodoPago === 'wompi' ? (
                                                    <div className="bg-white rounded-lg p-3.5 border border-blue-100 space-y-3 text-xs">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <span className="text-gray-500 block font-medium">Referencia Wompi (ID Pedido):</span>
                                                                <span className="font-mono font-bold text-gray-900 break-all">{activeOrder.id}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500 block font-medium">ID Transacción Wompi:</span>
                                                                <span className={`font-mono font-bold break-all ${activeOrder.wompiTransaction?.id ? 'text-green-700' : 'text-amber-700'}`}>
                                                                    {activeOrder.wompiTransaction?.id || 'No asignado aún (Sin pago)'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Status explanation for Admin / Logistics */}
                                                        {activeOrder.wompiTransaction?.status === 'APPROVED' ? (
                                                            <div className="p-2.5 bg-green-50 border border-green-200 rounded-lg text-green-900 flex items-start gap-2">
                                                                <span className="text-base leading-none">✅</span>
                                                                <div>
                                                                    <p className="font-bold">Pago 100% verificado y aprobado por Wompi</p>
                                                                    <p className="text-[11px] text-green-700 mt-0.5">
                                                                        El dinero ingresó a tu cuenta de Wompi/Bancolombia. Puedes despachar este pedido con total seguridad.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 space-y-1">
                                                                <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-800">
                                                                    <span>ℹ️ Guía para Admin y Logística:</span>
                                                                </div>
                                                                <p className="text-[11px] text-amber-800 leading-snug">
                                                                    El cliente seleccionó Wompi en la web pero <strong>aún no registra pago completado en la pasarela</strong> (cerró la pestaña o no ingresó los datos).
                                                                </p>
                                                                <p className="text-[11px] text-amber-900 font-medium">
                                                                    • Si el cliente pagó por WhatsApp (link manual / transferencia), puedes despachar según el comprobante.<br />
                                                                    • Si tienes duda, pulsa el botón azul <strong>"Consultar en Wompi"</strong> para verificar en tiempo real.
                                                                </p>
                                                            </div>
                                                        )}

                                                        {activeOrder.wompiTransaction && (
                                                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                                                                <div>
                                                                    <span className="text-gray-500 block">Medio de Pago:</span>
                                                                    <span className="font-bold text-indigo-900">
                                                                        {activeOrder.wompiTransaction.paymentMethodType || 'Nequi / Tarjeta / PSE'}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-500 block">Monto Transacción:</span>
                                                                    <span className="font-black text-gray-900">
                                                                        {formatCurrency(activeOrder.wompiTransaction.amountInCents ? activeOrder.wompiTransaction.amountInCents / 100 : activeOrder.total)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {activeOrder.wompiTransaction?.statusMessage && (
                                                            <div className="p-2 bg-gray-50 rounded text-gray-600 italic border border-gray-100">
                                                                Respuesta Wompi: {activeOrder.wompiTransaction.statusMessage}
                                                            </div>
                                                        )}

                                                        {/* Live check button */}
                                                        <div className="pt-2 flex items-center justify-between gap-2 flex-wrap border-t border-gray-100">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCheckWompi(activeOrder.id)}
                                                                disabled={isCheckingWompi}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                                                            >
                                                                <RefreshCw size={13} className={isCheckingWompi ? 'animate-spin' : ''} />
                                                                {isCheckingWompi ? 'Consultando Wompi...' : '🔍 Consultar / Sincronizar en Wompi'}
                                                            </button>
                                                            {wompiStatusFeedback && (
                                                                <span className="text-[11px] font-bold text-gray-700">{wompiStatusFeedback}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="bg-white rounded-lg p-3 border border-amber-100 text-xs text-amber-900 space-y-1">
                                                        <p className="font-bold flex items-center gap-1">
                                                            ⚠️ Cobro en destino: {formatCurrency(activeOrder.total)}
                                                        </p>
                                                        <p className="text-gray-600 text-[11px]">
                                                            El transportador o domiciliario recaudará este valor al entregar la mercancía al cliente.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 📝 Bitácora & Notas Internas de Logística */}
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                                    <FileText className="text-emerald-600" size={18} />
                                                    Notas Internas de Logística
                                                </h3>
                                                <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                                                    {safeToArray<OrderInternalNote>(activeOrder.notasInternas).length} nota{safeToArray<OrderInternalNote>(activeOrder.notasInternas).length !== 1 ? 's' : ''}
                                                </span>
                                            </div>

                                            {/* Form to add note */}
                                            <form onSubmit={handleAddDirectNote} className="space-y-2">
                                                <div className="relative">
                                                    <textarea
                                                        rows={2}
                                                        value={newInternalNoteText}
                                                        onChange={(e) => setNewInternalNoteText(e.target.value)}
                                                        placeholder="Escribe una observación interna (Ej: Cliente confirmó entrega por la tarde, número de guía alterno, etc.)..."
                                                        className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none text-slate-900"
                                                    />
                                                </div>
                                                <div className="flex justify-end">
                                                    <button
                                                        type="submit"
                                                        disabled={isAddingInternalNote || !newInternalNoteText.trim()}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                                                    >
                                                        <Send size={12} />
                                                        <span>{isAddingInternalNote ? 'Guardando...' : 'Agregar Nota'}</span>
                                                    </button>
                                                </div>
                                            </form>

                                            {/* Notes history list */}
                                            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                                                {safeToArray<OrderInternalNote>(activeOrder.notasInternas).length === 0 ? (
                                                    <p className="text-xs text-slate-400 italic text-center py-2">
                                                        No hay notas internas registradas en este pedido aún.
                                                    </p>
                                                ) : (
                                                    safeToArray<OrderInternalNote>(activeOrder.notasInternas)
                                                        .slice()
                                                        .reverse()
                                                        .map((n: OrderInternalNote, nIdx: number) => {
                                                            const noteDate = new Date(n.createdAt);
                                                            const formattedNoteDate = isNaN(noteDate.getTime())
                                                                ? n.createdAt
                                                                : noteDate.toLocaleString('es-CO', {
                                                                    day: '2-digit',
                                                                    month: 'short',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                });

                                                            return (
                                                                <div key={n.id || nIdx} className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs space-y-1.5">
                                                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="font-bold text-xs text-slate-900">{n.authorName}</span>
                                                                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                                                                                n.authorRole === 'superadmin'
                                                                                    ? 'bg-indigo-100 text-indigo-700'
                                                                                    : 'bg-emerald-100 text-emerald-700'
                                                                            }`}>
                                                                                {n.authorRole === 'superadmin' ? 'Admin' : 'Logística'}
                                                                            </span>
                                                                        </div>
                                                                        <span className="text-[10px] font-mono text-slate-400">{formattedNoteDate}</span>
                                                                    </div>

                                                                    {n.isStatusChangeNote && n.previousStatus && n.newStatus && (
                                                                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded w-fit">
                                                                            <span>{ORDER_STATUS_CONFIG[n.previousStatus]?.label || n.previousStatus}</span>
                                                                            <ArrowRight size={10} />
                                                                            <span className="text-slate-900">{ORDER_STATUS_CONFIG[n.newStatus]?.label || n.newStatus}</span>
                                                                        </div>
                                                                    )}

                                                                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                                                                        {n.text}
                                                                    </p>
                                                                </div>
                                                            );
                                                        })
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <Clock className="text-purple-600" size={18} />
                                                Historial
                                            </h3>
                                            <div className="relative pl-4 border-l-2 border-gray-100 space-y-4">
                                                {safeToArray<TimelineEvent>(activeOrder.timeline).map((event: TimelineEvent, idx: number) => {
                                                    const statusKey = event.status as OrderStatus;
                                                    return (
                                                        <div key={idx} className="relative">
                                                            <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full ${ORDER_STATUS_CONFIG[statusKey].bgColor} border-2 border-white ring-1 ring-gray-200`} />
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <p className="text-sm font-bold text-gray-900">{ORDER_STATUS_CONFIG[statusKey].label}</p>
                                                                {event.user && (
                                                                    <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded font-medium">
                                                                        {event.user}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-gray-500">
                                                                {format(safeToDate(event.timestamp), "d MMM, HH:mm", { locale: es })}
                                                            </p>
                                                            {event.note && (
                                                                <p className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                                                                    {event.note}
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 sticky bottom-0">
                                <button
                                    onClick={async () => {
                                        try {
                                            alert(`Generando guía 99 Envíos para el pedido #${activeOrder.id}...`);
                                            const res = await fetch('/api/envios/crear-guia', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    orderId: activeOrder.id,
                                                    transportadora: 'interrapidisimo',
                                                    destinatario: {
                                                        nombre: activeOrder.cliente.nombre,
                                                        telefono: activeOrder.cliente.celular,
                                                        direccion: activeOrder.cliente.direccion,
                                                        correo: activeOrder.cliente.email || '',
                                                        idLocalidad: '11001000'
                                                    },
                                                    valorDeclarado: activeOrder.subtotal || 80000,
                                                    valorContrapago: activeOrder.metodoPago === 'contraentrega' ? activeOrder.total : 0
                                                })
                                            });
                                            const data = await res.json();
                                            if (data.exito && data.numeroGuia) {
                                                alert(`¡Guía #${data.numeroGuia} generada con éxito! Abriendo PDF...`);
                                                window.open(`/api/envios/pdf-guia`, '_blank');
                                            } else {
                                                alert(`Error al generar guía: ${data.error || 'Verifica las credenciales de 99 Envíos'}`);
                                            }
                                        } catch (e: any) {
                                            alert(`Error al conectar con 99 Envíos: ${e.message}`);
                                        }
                                    }}
                                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center gap-2 transition-colors"
                                >
                                    📦 Generar Guía 99 Envíos
                                </button>
                                <a
                                    href={`https://wa.me/57${activeOrder.cliente.celular.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${activeOrder.cliente.nombre}, respecto a tu pedido #${activeOrder.id}...`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl flex items-center gap-2 transition-colors"
                                >
                                    <MessageCircle size={20} />
                                    Contactar por WhatsApp
                                </a>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal de Confirmación de Cambio de Etapa con Comentario */}
            <AnimatePresence>
                {stageChangePrompt && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-gray-100"
                        >
                            <div className="flex items-center justify-between pb-3 border-b">
                                <h3 className="text-base font-black text-gray-900">
                                    Cambiar Estado de Pedido
                                </h3>
                                <button
                                    onClick={() => setStageChangePrompt(null)}
                                    className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <p className="text-xs font-bold text-gray-500">
                                {stageChangePrompt.orderTitle}
                            </p>

                            {/* State transition badges */}
                            <div className="flex items-center justify-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                                <span className={`${ORDER_STATUS_CONFIG[stageChangePrompt.prevStatus].bgColor} ${ORDER_STATUS_CONFIG[stageChangePrompt.prevStatus].color} px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1`}>
                                    {ORDER_STATUS_CONFIG[stageChangePrompt.prevStatus].icon} {ORDER_STATUS_CONFIG[stageChangePrompt.prevStatus].label}
                                </span>
                                <ArrowRight size={16} className="text-gray-400" />
                                <span className={`${ORDER_STATUS_CONFIG[stageChangePrompt.targetStatus].bgColor} ${ORDER_STATUS_CONFIG[stageChangePrompt.targetStatus].color} px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1`}>
                                    {ORDER_STATUS_CONFIG[stageChangePrompt.targetStatus].icon} {ORDER_STATUS_CONFIG[stageChangePrompt.targetStatus].label}
                                </span>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-gray-700">
                                    Nota o Comentario Logístico (Opcional):
                                </label>
                                <textarea
                                    rows={3}
                                    value={stageNoteText}
                                    onChange={(e) => setStageNoteText(e.target.value)}
                                    placeholder="Ej: Empacado con 2 galones adicionales, cliente confirmó recepción para mañana, despachado con mensajero Juan..."
                                    className="w-full text-xs p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-gray-900 resize-none"
                                />
                                <p className="text-[11px] text-gray-400">
                                    Esta nota se guardará en la bitácora del pedido con tu nombre y rol.
                                </p>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setStageChangePrompt(null)}
                                    disabled={isSubmittingStageChange}
                                    className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleConfirmStageChange(true)}
                                    disabled={isSubmittingStageChange}
                                    className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    {isSubmittingStageChange ? 'Guardando...' : 'Confirmar Cambio'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal Cambiar Contraseña */}
            <ChangePasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
            />
        </div>
    );
}
