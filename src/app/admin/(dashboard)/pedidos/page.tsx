'use client';

import { useState, useEffect, useMemo } from 'react';
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
    ArrowRight,
    AlertTriangle,
    Truck,
    Copy,
    Check,
    Link2,
    Sparkles
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { subscribeToOrders, updateOrderStatus, addOrderInternalNote, searchOrdersRemotely } from '@/lib/orders-service';
import { Order, OrderStatus, ORDER_STATUS_CONFIG, TimelineEvent, OrderInternalNote } from '@/types/order';
import { formatCurrency } from '@/lib/checkout-utils';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';
import ChangePasswordModal from '@/components/admin/ChangePasswordModal';
import { Product } from '@/lib/products';
import { getProductImage } from '@/lib/product-utils';
import { getAllProducts } from '@/lib/products-service';
import DeliveryExceptionModal from '@/components/admin/DeliveryExceptionModal';

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

/**
 * Resolves the accurate, size-specific image filename for an order item.
 * Searches in the real catalog map first (to get updated imgFiles for 20L, 10L, 1/2G, etc.),
 * falling back to item.product image resolution or placeholder.
 */
function resolveOrderItemImage(item: any, catalogMap?: Map<string, Product>): string {
    if (!item) return 'placeholder.png';
    const size = item.size || 'DEFAULT';
    const prodId = item.product?.id || item.id;

    // 1. If we have the live catalog loaded, use it to get the latest custom size images
    if (prodId && catalogMap && catalogMap.has(prodId)) {
        const fullProduct = catalogMap.get(prodId)!;
        const resolved = getProductImage(fullProduct, size);
        if (resolved && resolved !== 'placeholder.png' && resolved !== 'logo-biocambio360.png') {
            return resolved;
        }
    }

    // 2. If item.product itself contains imgFiles or properties, evaluate with getProductImage
    if (item.product && typeof item.product === 'object') {
        const resolved = getProductImage(item.product, size);
        if (resolved && resolved !== 'placeholder.png' && resolved !== 'logo-biocambio360.png') {
            return resolved;
        }
        if (item.product.imgFile && item.product.imgFile !== 'placeholder.png') {
            return item.product.imgFile;
        }
    }

    // 3. Fallback direct image property if present on item
    if (item.imgFile && item.imgFile !== 'placeholder.png') {
        return item.imgFile;
    }

    return 'placeholder.png';
}

const ALL_STATUSES: OrderStatus[] = [
    'pendiente',
    'confirmado',
    'preparacion',
    'enviado',
    'en_camino',
    'no_entregado',
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
                    ) : order.metodoPago === 'addi' ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black border ${
                            order.addiTransaction?.status === 'APPROVED'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : order.addiTransaction?.status === 'DECLINED' || order.addiTransaction?.status === 'REJECTED' || order.status === 'cancelado'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                            <span className="text-[10px]">✨</span>
                            {order.addiTransaction?.status === 'APPROVED'
                                ? 'Addi: Pagado'
                                : order.addiTransaction?.status === 'DECLINED' || order.addiTransaction?.status === 'REJECTED' || order.status === 'cancelado'
                                ? 'Addi: Cancelado'
                                : 'Addi: Cuotas'}
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                            💵 Contraentrega
                        </span>
                    )}
                </div>

                {/* Miniaturas de productos con su foto de tamaño exacto */}
                <div className="flex items-center gap-1.5 py-1 overflow-x-hidden">
                    {safeToArray(order.productos).slice(0, 3).map((prodItem: any, pIdx: number) => {
                        const thumbImg = resolveOrderItemImage(prodItem);
                        const sLabel = prodItem.size || 'STD';
                        const is20L = sLabel === '20L' || sLabel.includes('20');
                        return (
                            <div key={pIdx} className="relative flex items-center gap-1 bg-gray-50 rounded-lg p-1 pr-1.5 border border-gray-100 max-w-[150px]">
                                <div className="relative w-7 h-7 bg-white rounded border border-gray-200 overflow-hidden shrink-0">
                                    <Image
                                        src={`/images/${thumbImg}`}
                                        alt={prodItem.product?.nombre || 'Producto'}
                                        fill
                                        unoptimized
                                        className="object-contain p-0.5"
                                    />
                                </div>
                                <span className={`text-[10px] font-black px-1 py-0.2 rounded shrink-0 ${is20L ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                                    {sLabel}
                                </span>
                            </div>
                        );
                    })}
                    {safeToArray(order.productos).length > 3 && (
                        <span className="text-[10px] font-bold text-gray-400">
                            +{safeToArray(order.productos).length - 3}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                    {getOriginBadge(order.origen)}
                    {order.guiaTransportadora ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200" title={`Guía: ${order.guiaTransportadora} (${order.transportadora || '99 Envíos'})`}>
                            <Truck size={11} className="text-emerald-600" />
                            {order.guiaTransportadora}
                        </span>
                    ) : order.status === 'en_camino' && !order.mensajeroId && order.tipoEnvio !== 'recogida_mostrador' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 animate-pulse" title="En camino sin guía asignada">
                            ⚠️ Sin guía
                        </span>
                    ) : null}
                    {order.cuponAplicado && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200" title={`Cupón ${order.cuponAplicado.code}`}>
                            <Ticket size={11} className="text-purple-600" />
                            {order.cuponAplicado.code} (-{formatCurrency(order.cuponAplicado.discountAmount || 0)})
                        </span>
                    )}
                    {order.alertaDireccionReciente && (
                        <span 
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300" 
                            title={order.alertaDireccionDetalle?.mensaje || "Esta dirección de entrega coincide con un pedido de los últimos 30 días"}
                        >
                            ⚠️ Misma dirección (&lt;30d)
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
    const [displayLimit, setDisplayLimit] = useState(25);

    // Visible orders sliced for high-performance rendering (keeps DOM lean)
    const visibleOrders = orders.slice(0, displayLimit);
    const remainingCount = orders.length - visibleOrders.length;

    const handleLoadMore = () => {
        setDisplayLimit(prev => prev + 25);
    };

    return (
        <div className="flex-shrink-0 w-80 flex flex-col h-full bg-gray-50/50 rounded-xl border border-gray-100">
            {/* Column Header */}
            <div className={`${config.bgColor} rounded-t-xl p-4 sticky top-0 z-10 border-b border-gray-100`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{config.icon}</span>
                        <div>
                            <h3 className={`font-black ${config.color}`}>{config.label}</h3>
                            <p className="text-xs text-gray-600">
                                {orders.length} pedido{orders.length !== 1 ? 's' : ''}
                                {orders.length > 25 && (
                                    <span className="text-[10px] font-bold text-gray-500 ml-1">
                                        (viendo {visibleOrders.length})
                                    </span>
                                )}
                            </p>
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
                {visibleOrders.map((order) => (
                    <OrderCard
                        key={order.id}
                        order={order}
                        onClick={() => onOrderClick(order)}
                    />
                ))}

                {remainingCount > 0 && (
                    <div className="pt-2 pb-1 text-center">
                        <button
                            onClick={handleLoadMore}
                            className="w-full py-2 px-3 bg-white hover:bg-gray-100 border border-gray-200 text-xs font-bold text-gray-700 rounded-xl transition-all shadow-xs hover:shadow flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <span>Cargar más (+25)</span>
                            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px] font-mono">
                                Restan {remainingCount}
                            </span>
                        </button>
                    </div>
                )}

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
    const [deliveryExceptionOrder, setDeliveryExceptionOrder] = useState<(Order & { id: string }) | null>(null);

    // Filtro de ventana de tiempo para aligerar la carga del tablero
    type TimeWindow = '5_dias' | '15_dias' | '30_dias' | 'activos' | 'todos';
    const [timeWindow, setTimeWindow] = useState<TimeWindow>('5_dias');
    const [isSearchingRemote, setIsSearchingRemote] = useState(false);
    const [remoteSearchMessage, setRemoteSearchMessage] = useState<string | null>(null);

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

    const handleRemoteSearch = async () => {
        const term = searchQuery.trim();
        if (!term) return;
        setIsSearchingRemote(true);
        setRemoteSearchMessage(null);
        try {
            const found = await searchOrdersRemotely(term);
            if (found.length > 0) {
                setOrders(prev => {
                    const existing = new Set(prev.map(o => o.id));
                    const newOrders = found.filter(o => !existing.has(o.id));
                    return [...newOrders, ...prev];
                });
                setRemoteSearchMessage(`✅ ${found.length} pedido(s) encontrado(s) en histórico`);
            } else {
                setRemoteSearchMessage('ℹ️ No se encontraron pedidos con ese ID o teléfono');
            }
        } catch (e: any) {
            setRemoteSearchMessage(`❌ Error en búsqueda remota: ${e.message}`);
        } finally {
            setIsSearchingRemote(false);
        }
    };

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

    const [isCheckingAddi, setIsCheckingAddi] = useState(false);
    const [addiStatusFeedback, setAddiStatusFeedback] = useState<string | null>(null);

    const handleCheckAddi = async (orderId: string) => {
        setIsCheckingAddi(true);
        setAddiStatusFeedback(null);
        try {
            const res = await fetch(`/api/admin/addi-status?orderId=${orderId}`);
            const data = await res.json();
            if (data.addiTransaction) {
                setActiveOrder(prev => prev && prev.id === orderId ? { ...prev, addiTransaction: data.addiTransaction, status: data.orderStatus || prev.status } : prev);
                setOrders(prev => prev.map(o => o.id === orderId ? { ...o, addiTransaction: data.addiTransaction, status: data.orderStatus || o.status } : o));
                setAddiStatusFeedback(`✅ Sincronizado: ${data.addiTransaction.status || data.orderStatus}`);
            } else {
                setAddiStatusFeedback(`ℹ️ ${data.message || 'Sin transacción Addi confirmada aún'}`);
            }
        } catch (e: any) {
            setAddiStatusFeedback(`❌ Error al consultar Addi: ${e.message}`);
        } finally {
            setIsCheckingAddi(false);
        }
    };

    // Estados y funciones para Vinculación y Gestión de Guías (99 Envíos / Transportadoras Externas)
    const [manualGuiaInput, setManualGuiaInput] = useState('');
    const [manualTransportadoraInput, setManualTransportadoraInput] = useState('99envios');
    const [isLinkingGuia, setIsLinkingGuia] = useState(false);
    const [isGenerating99Guia, setIsGenerating99Guia] = useState(false);
    const [linkingGuiaFeedback, setLinkingGuiaFeedback] = useState<string | null>(null);
    const [copiedGuia, setCopiedGuia] = useState(false);
    const [showManualGuiaForm, setShowManualGuiaForm] = useState(false);

    useEffect(() => {
        if (activeOrder) {
            setManualGuiaInput(activeOrder.guiaTransportadora || '');
            setManualTransportadoraInput(activeOrder.transportadora || '99envios');
            setLinkingGuiaFeedback(null);
            setShowManualGuiaForm(!activeOrder.guiaTransportadora);
        }
    }, [activeOrder?.id]);

    const handleVincularGuia = async (orderId: string) => {
        if (!manualGuiaInput.trim()) {
            alert('Por favor escribe el número de guía a vincular.');
            return;
        }
        setIsLinkingGuia(true);
        setLinkingGuiaFeedback(null);
        try {
            const res = await fetch('/api/envios/vincular-guia', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId,
                    guiaTransportadora: manualGuiaInput.trim(),
                    numeroGuia: manualGuiaInput.trim(),
                    transportadora: manualTransportadoraInput,
                    user: userProfile?.nombre || user?.email || 'Logística'
                })
            });
            const data = await res.json();
            if (data.success || data.exito) {
                const finalGuia = data.guiaTransportadora || data.numeroGuia || manualGuiaInput.trim();
                const finalStatus = data.status || 'en_camino';
                setLinkingGuiaFeedback(`✅ Guía #${finalGuia} vinculada con éxito.`);
                setActiveOrder(prev => prev && prev.id === orderId ? {
                    ...prev,
                    guiaTransportadora: finalGuia,
                    transportadora: data.transportadora || manualTransportadoraInput,
                    trackingUrl: data.trackingUrl,
                    status: finalStatus as OrderStatus
                } : prev);
                setOrders(prev => prev.map(o => o.id === orderId ? {
                    ...o,
                    guiaTransportadora: finalGuia,
                    transportadora: data.transportadora || manualTransportadoraInput,
                    trackingUrl: data.trackingUrl,
                    status: finalStatus as OrderStatus
                } : o));
            } else {
                setLinkingGuiaFeedback(`❌ Error: ${data.error || 'No se pudo vincular la guía'}`);
            }
        } catch (e: any) {
            setLinkingGuiaFeedback(`❌ Error de conexión: ${e.message}`);
        } finally {
            setIsLinkingGuia(false);
        }
    };

    const handleGenerarGuia99 = async (order: Order & { id: string }) => {
        if (order.guiaTransportadora) {
            if (!confirm(`Este pedido ya tiene la guía #${order.guiaTransportadora}. ¿Deseas solicitar una nueva guía a 99 Envíos?`)) {
                return;
            }
        }
        setIsGenerating99Guia(true);
        try {
            const res = await fetch('/api/envios/crear-guia', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: order.id,
                    transportadora: 'interrapidisimo',
                    destinatario: {
                        nombre: order.cliente.nombre,
                        telefono: order.cliente.celular,
                        direccion: order.cliente.direccion,
                        correo: order.cliente.email || '',
                        idLocalidad: '11001000'
                    },
                    valorDeclarado: order.subtotal || 80000,
                    valorContrapago: order.metodoPago === 'contraentrega' ? order.total : 0
                })
            });
            const data = await res.json();
            if (data.exito && data.numeroGuia) {
                alert(`¡Guía #${data.numeroGuia} generada con éxito! Abriendo rótulo/sticker PDF...`);
                window.open(`/api/envios/pdf-guia?guia=${data.numeroGuia}`, '_blank');
                setActiveOrder(prev => prev && prev.id === order.id ? {
                    ...prev,
                    guiaTransportadora: data.numeroGuia,
                    transportadora: '99envios',
                    status: 'en_camino' as OrderStatus
                } : prev);
                setOrders(prev => prev.map(o => o.id === order.id ? {
                    ...o,
                    guiaTransportadora: data.numeroGuia,
                    transportadora: '99envios',
                    status: 'en_camino' as OrderStatus
                } : o));
            } else {
                alert(`Error al generar guía: ${data.error || 'Verifica credenciales o saldo en 99 Envíos'}`);
            }
        } catch (e: any) {
            alert(`Error al conectar con 99 Envíos: ${e.message}`);
        } finally {
            setIsGenerating99Guia(false);
        }
    };

    // ── Conciliación Automática desde Reporte Completo 99 Envíos ──
    const [envios99Records, setEnvios99Records] = useState<any[]>([]);
    const [isAutoConciliando, setIsAutoConciliando] = useState(false);
    const [autoConciliarProgress, setAutoConciliarProgress] = useState<{ current: number; total: number } | null>(null);
    const [reconcileDismissed, setReconcileDismissed] = useState(false);

    useEffect(() => {
        try {
            if (localStorage.getItem('conciliacion_99_dismissed') === 'true') {
                setReconcileDismissed(true);
            }
        } catch (_) {}
    }, []);

    useEffect(() => {
        fetch('/data_envios_99_conciliados.json')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data.records)) {
                    setEnvios99Records(data.records);
                }
            })
            .catch(err => console.warn('[Pedidos] Error cargando data_envios_99_conciliados:', err));
    }, []);

    const find99MatchesForOrder = (order: Order & { id: string }) => {
        if (!envios99Records.length) return [];
        const phone = (order.cliente?.celular || '').replace(/\D/g, '').slice(-10);
        const nameClean = (order.cliente?.nombre || '').toLowerCase().trim();
        
        return envios99Records.filter(r => {
            if (phone && phone.length >= 7 && r.telefono && r.telefono.includes(phone)) {
                return true;
            }
            if (nameClean.length > 5 && r.nombre_clean && (r.nombre_clean.includes(nameClean) || nameClean.includes(r.nombre_clean))) {
                return true;
            }
            return false;
        });
    };

    // Pedidos en vista que aún no tienen guía y cuentan con coincidencia en 99 Envíos
    const pendingMatches = useMemo(() => {
        if (!envios99Records.length) return [];
        const unlinked = orders.filter(o => !o.guiaTransportadora);
        const list: { order: Order & { id: string }; match: any }[] = [];
        for (const order of unlinked) {
            const found = find99MatchesForOrder(order);
            if (found.length > 0) {
                list.push({ order, match: found[0] });
            }
        }
        return list;
    }, [orders, envios99Records]);

    const handleVincularGuiaDirect = async (orderId: string, guia: string, transportadora: string, estado?: string) => {
        setIsLinkingGuia(true);
        setLinkingGuiaFeedback(null);
        const isDelivered = (estado || '').toLowerCase().includes('entreg');
        const finalGuia = guia.trim();
        const finalCarrier = (transportadora || 'coordinadora').toLowerCase();
        const targetStatus = isDelivered ? 'entregado' : undefined;

        let linkedSuccess = false;
        let trackingUrl = '';

        try {
            const res = await fetch('/api/envios/vincular-guia', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId,
                    guiaTransportadora: finalGuia,
                    numeroGuia: finalGuia,
                    transportadora: finalCarrier,
                    status: targetStatus,
                    user: userProfile?.nombre || user?.email || 'Conciliador 99 Envíos'
                })
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && (data.success || data.exito)) {
                linkedSuccess = true;
                trackingUrl = data.trackingUrl || '';
            }
        } catch (fetchErr) {
            console.warn('[VincularGuiaDirect] Error en endpoint, usando fallback de Firestore:', fetchErr);
        }

        // Fallback directo a Firestore
        if (!linkedSuccess) {
            try {
                if (finalCarrier.includes('coordinadora')) {
                    trackingUrl = `https://coordinadora.com/rastreo/rastreo-de-guia/?guia=${finalGuia}`;
                } else if (finalCarrier.includes('servientrega')) {
                    trackingUrl = `https://www.servientrega.com/wps/portal/rastreo-envio?guia=${finalGuia}`;
                } else if (finalCarrier.includes('envia')) {
                    trackingUrl = `https://envia.co/rastreo?guia=${finalGuia}`;
                } else {
                    trackingUrl = `https://www.interrapidisimo.com/sigue-tu-envio/?guia=${finalGuia}`;
                }

                const orderDocRef = doc(db, 'orders', orderId);
                await updateDoc(orderDocRef, {
                    guiaTransportadora: finalGuia,
                    numeroGuia: finalGuia,
                    transportadora: finalCarrier,
                    tipoEnvio: '99envios',
                    ...(targetStatus ? { status: targetStatus } : {}),
                    trackingUrl,
                    updatedAt: new Date().toISOString(),
                    timeline: arrayUnion({
                        status: targetStatus || 'en_camino',
                        timestamp: new Date().toISOString(),
                        user: userProfile?.nombre || user?.email || 'Conciliador 99 Envíos',
                        note: `Guía ${finalCarrier.toUpperCase()} #${finalGuia} vinculada (directo)`
                    })
                });
                linkedSuccess = true;
            } catch (fsErr: any) {
                setLinkingGuiaFeedback(`❌ Error: ${fsErr.message}`);
            }
        }

        if (linkedSuccess) {
            setLinkingGuiaFeedback(`✅ Guía #${finalGuia} vinculada con éxito.`);
            setActiveOrder(prev => prev && prev.id === orderId ? {
                ...prev,
                guiaTransportadora: finalGuia,
                transportadora: finalCarrier,
                trackingUrl,
                ...(targetStatus ? { status: targetStatus as OrderStatus } : {})
            } : prev);
            setOrders(prev => prev.map(o => o.id === orderId ? {
                ...o,
                guiaTransportadora: finalGuia,
                transportadora: finalCarrier,
                trackingUrl,
                ...(targetStatus ? { status: targetStatus as OrderStatus } : {})
            } : o));
        }

        setIsLinkingGuia(false);
    };

    const handleAutoConciliarTodos = async () => {
        if (!envios99Records.length) {
            alert('Cargando base de datos de 99 Envíos...');
            return;
        }

        if (pendingMatches.length === 0) {
            alert('No se encontraron pedidos pendientes en el tablero actual que coincidan con las guías del reporte de 99 Envíos.');
            setReconcileDismissed(true);
            return;
        }

        if (!confirm(`Se encontraron ${pendingMatches.length} pedidos en este tablero que coinciden con guías del reporte de 99 Envíos.\n\n¿Deseas auto-vincular sus números de guía y transportadoras ahora?`)) {
            return;
        }

        setIsAutoConciliando(true);
        setAutoConciliarProgress({ current: 0, total: pendingMatches.length });
        let vinculadosCount = 0;

        // Procesar concurrentemente en lotes de 5 para máxima velocidad y sin congelar la UI
        const chunkSize = 5;
        for (let i = 0; i < pendingMatches.length; i += chunkSize) {
            const chunk = pendingMatches.slice(i, i + chunkSize);
            await Promise.allSettled(chunk.map(async (item) => {
                const isDelivered = (item.match.estado_envio || '').toLowerCase().includes('entreg');
                const finalGuia = String(item.match.guia).trim();
                const finalCarrier = (item.match.transportadora || 'coordinadora').toLowerCase();
                const targetStatus = isDelivered ? 'entregado' : item.order.status;

                let linkedSuccess = false;
                let trackingUrl = '';

                // 1. Intento principal vía API de servidor
                try {
                    const res = await fetch('/api/envios/vincular-guia', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            orderId: item.order.id,
                            guiaTransportadora: finalGuia,
                            numeroGuia: finalGuia,
                            transportadora: finalCarrier,
                            status: isDelivered ? 'entregado' : undefined,
                            user: userProfile?.nombre || user?.email || 'Auto-Conciliador Masivo'
                        })
                    });
                    const data = await res.json().catch(() => ({}));
                    if (res.ok && (data.success || data.exito)) {
                        linkedSuccess = true;
                        trackingUrl = data.trackingUrl || '';
                    }
                } catch (fetchErr) {
                    console.warn('[Auto-Conciliar] Fallo API backend, recurriendo a fallback cliente:', fetchErr);
                }

                // 2. Fallback de cliente directo con Firestore SDK (si la API arrojó error de cuota o timeout)
                if (!linkedSuccess) {
                    try {
                        if (finalCarrier.includes('coordinadora')) {
                            trackingUrl = `https://coordinadora.com/rastreo/rastreo-de-guia/?guia=${finalGuia}`;
                        } else if (finalCarrier.includes('servientrega')) {
                            trackingUrl = `https://www.servientrega.com/wps/portal/rastreo-envio?guia=${finalGuia}`;
                        } else if (finalCarrier.includes('envia')) {
                            trackingUrl = `https://envia.co/rastreo?guia=${finalGuia}`;
                        } else {
                            trackingUrl = `https://www.interrapidisimo.com/sigue-tu-envio/?guia=${finalGuia}`;
                        }

                        const orderDocRef = doc(db, 'orders', item.order.id);
                        await updateDoc(orderDocRef, {
                            guiaTransportadora: finalGuia,
                            numeroGuia: finalGuia,
                            transportadora: finalCarrier,
                            tipoEnvio: '99envios',
                            status: targetStatus,
                            trackingUrl,
                            updatedAt: new Date().toISOString(),
                            timeline: arrayUnion({
                                status: targetStatus,
                                timestamp: new Date().toISOString(),
                                user: userProfile?.nombre || user?.email || 'Auto-Conciliador Masivo',
                                note: `Guía ${finalCarrier.toUpperCase()} #${finalGuia} vinculada automáticamente (99 Envíos)`
                            })
                        });
                        linkedSuccess = true;
                    } catch (firestoreErr) {
                        console.error('[Auto-Conciliar] Error en fallback de Firestore:', firestoreErr);
                    }
                }

                if (linkedSuccess) {
                    vinculadosCount++;
                    setOrders(prev => prev.map(o => o.id === item.order.id ? {
                        ...o,
                        guiaTransportadora: finalGuia,
                        transportadora: finalCarrier,
                        trackingUrl: trackingUrl || o.trackingUrl,
                        status: targetStatus as OrderStatus
                    } : o));
                }
            }));

            setAutoConciliarProgress({ 
                current: Math.min(i + chunkSize, pendingMatches.length), 
                total: pendingMatches.length 
            });
        }

        setIsAutoConciliando(false);
        setAutoConciliarProgress(null);
        setReconcileDismissed(true);
        try { localStorage.setItem('conciliacion_99_dismissed', 'true'); } catch (_) {}
        alert(`¡Conciliación finalizada!\nSe vincularon exitosamente ${vinculadosCount} guías de ${pendingMatches.length} pedidos detectados.`);
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const [catalogMap, setCatalogMap] = useState<Map<string, Product>>(new Map());

    useEffect(() => {
        getAllProducts({ includeDrafts: true, includeArchived: true })
            .then(prods => {
                const map = new Map<string, Product>();
                prods.forEach(p => {
                    if (p.id) map.set(p.id, p);
                });
                setCatalogMap(map);
            })
            .catch(err => console.warn('[Admin/Pedidos] Error fetching catalog for image resolution:', err));
    }, []);

    useEffect(() => {
        // Carga ligera: Por defecto trae los pedidos más recientes (~350).
        // Si el usuario elige "Histórico Completo", consulta sin límite.
        const limitCount = timeWindow === 'todos' ? undefined : 350;
        const unsubscribe = subscribeToOrders((fetchedOrders) => {
            setOrders(fetchedOrders);
        }, { limitCount });

        return unsubscribe;
    }, [timeWindow]);

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

    const isOrderInWindow = (order: Order & { id: string }) => {
        const ACTIVE_STATUSES: OrderStatus[] = ['pendiente', 'confirmado', 'preparacion', 'enviado', 'en_camino', 'no_entregado'];
        // Regla Innegociable: Las órdenes activas SIEMPRE se muestran para no perder despachos
        if (ACTIVE_STATUSES.includes(order.status)) return true;

        if (timeWindow === 'activos') return false;
        if (timeWindow === 'todos') return true;

        const days = timeWindow === '5_dias' ? 5 : timeWindow === '15_dias' ? 15 : 30;
        const orderDate = safeToDate(order.createdAt);
        const cutoffMs = Date.now() - (days * 24 * 60 * 60 * 1000);
        return orderDate.getTime() >= cutoffMs;
    };

    const filteredOrders = orders.filter(order => {
        // When searching, bypass window filter so loaded orders match immediately
        if (!searchQuery && !isOrderInWindow(order)) {
            return false;
        }

        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase().trim();
        return (
            order.id.toLowerCase().includes(query) ||
            (order.cliente?.nombre && order.cliente.nombre.toLowerCase().includes(query)) ||
            (order.cliente?.celular && order.cliente.celular.includes(query)) ||
            (order.cliente?.ciudad && order.cliente.ciudad.toLowerCase().includes(query)) ||
            (order.guiaTransportadora && order.guiaTransportadora.toLowerCase().includes(query)) ||
            (order.metodoPago && order.metodoPago.toLowerCase().includes(query)) ||
            (order.addiTransaction?.status && order.addiTransaction.status.toLowerCase().includes(query)) ||
            (order.wompiTransaction?.status && order.wompiTransaction.status.toLowerCase().includes(query))
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
                    <div className="flex items-center justify-between mb-3">
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
                                <p className="text-xs text-gray-500 font-medium">
                                    {filteredOrders.length} pedido{filteredOrders.length !== 1 ? 's' : ''} en vista · {orders.length} cargados en memoria
                                </p>
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

                    {/* Banner de Conciliación Masiva 99 Envíos (Un solo uso / Descartable) */}
                    {!reconcileDismissed && pendingMatches.length > 0 && (
                        <div className="mb-3 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border border-purple-200/80 p-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                            <div className="flex items-start sm:items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5 sm:mt-0">
                                    <Sparkles size={16} />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-purple-950">
                                        Conciliación retroactiva pendiente: {pendingMatches.length} pedido{pendingMatches.length !== 1 ? 's coinciden' : ' coincide'} con el reporte de 99 Envíos
                                    </p>
                                    <p className="text-[11px] text-purple-700">
                                        Detectamos guías de Coordinadora listas para vincular masivamente en un solo clic.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                <button
                                    onClick={handleAutoConciliarTodos}
                                    disabled={isAutoConciliando}
                                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    {isAutoConciliando ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                                    <span>
                                        {isAutoConciliando 
                                            ? (autoConciliarProgress ? `Vinculando (${autoConciliarProgress.current}/${autoConciliarProgress.total})...` : 'Vinculando...') 
                                            : `Auto-Vincular (${pendingMatches.length})`}
                                    </span>
                                </button>
                                <button
                                    onClick={() => {
                                        setReconcileDismissed(true);
                                        try { localStorage.setItem('conciliacion_99_dismissed', 'true'); } catch (_) {}
                                    }}
                                    className="p-1.5 text-purple-400 hover:text-purple-700 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
                                    title="Descartar aviso"
                                >
                                    <X size={15} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Selector de Ventana de Tiempo (Optimización de Carga) */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3" data-tour="pedidos-ventana-tiempo">
                        <span className="text-[10px] font-black uppercase text-gray-400 mr-1 flex items-center gap-1">
                            <Clock size={12} /> Ventana:
                        </span>
                        {[
                            { id: '5_dias', label: '⚡ Últimos 5 Días (Rápido)' },
                            { id: '15_dias', label: '15 Días' },
                            { id: '30_dias', label: '30 Días' },
                            { id: 'activos', label: '🎯 Solo Activos / En Tránsito' },
                            { id: 'todos', label: '📦 Histórico Completo' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setTimeWindow(tab.id as any)}
                                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                    timeWindow === tab.id
                                        ? 'bg-red-600 text-white shadow-xs'
                                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Search Bar con Soporte Remoto */}
                    <div className="relative" data-tour="pedidos-search-bar">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setRemoteSearchMessage(null);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRemoteSearch();
                            }}
                            placeholder="Buscar por ID, cliente, teléfono, ciudad o guía (Enter para buscar en todo el histórico)..."
                            className="w-full pl-11 pr-28 py-2.5 bg-gray-100 border-2 border-transparent rounded-xl focus:bg-white focus:border-red-500 focus:outline-none transition-colors text-xs font-medium"
                        />
                        {searchQuery && (
                            <button
                                onClick={handleRemoteSearch}
                                disabled={isSearchingRemote}
                                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                                {isSearchingRemote ? (
                                    <RefreshCw size={12} className="animate-spin" />
                                ) : (
                                    <Search size={12} />
                                )}
                                <span>{isSearchingRemote ? 'Buscando...' : 'Buscar Histórico'}</span>
                            </button>
                        )}
                    </div>
                    {remoteSearchMessage && (
                        <p className="mt-1.5 text-xs font-bold text-indigo-700">
                            {remoteSearchMessage}
                        </p>
                    )}
                </div>
            </header>

            {/* Kanban Board */}
            <main className="flex-1 p-6 overflow-x-auto" data-tour="pedidos-kanban-board">
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
                                <div className="flex items-center gap-2">
                                    {(activeOrder.status === 'no_entregado' || activeOrder.metodoPago === 'contraentrega' || activeOrder.status === 'enviado' || activeOrder.status === 'en_camino') && (
                                        <button
                                            onClick={() => setDeliveryExceptionOrder(activeOrder)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
                                            title="Gestionar novedad, reprogramar reintento con tarifa especial o declarar siniestro"
                                        >
                                            <AlertTriangle size={14} className="text-rose-600" />
                                            <span>Tratar Novedad</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setActiveOrder(null)}
                                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                    >
                                        <X size={24} className="text-gray-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 overflow-y-auto custom-scrollbar">
                                {activeOrder.novedadEntrega && (
                                    <div className="mb-6 p-4 bg-rose-50/80 border border-rose-200 rounded-2xl flex items-start justify-between gap-4">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 flex items-center gap-1 mb-1">
                                                <AlertTriangle size={13} className="text-rose-600" />
                                                Novedad en Entrega Contraentrega ({activeOrder.novedadEntrega.intentosPrevios || 1}° Intento)
                                            </span>
                                            <p className="text-xs font-bold text-rose-900">
                                                Motivo: {activeOrder.novedadEntrega.motivo} — {activeOrder.novedadEntrega.motivoDetalle || 'Reportado por transportadora'}
                                            </p>
                                            {activeOrder.novedadEntrega.resolucion === 'reintento_programado' && (
                                                <p className="text-xs text-indigo-700 font-bold mt-1">
                                                    🔄 Reintento programado: {activeOrder.novedadEntrega.fechaReintentoProgramada} ({activeOrder.novedadEntrega.franjaHoraria}) | Flete especial: +${activeOrder.novedadEntrega.tarifaEspecialReintento?.toLocaleString('es-CO')}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setDeliveryExceptionOrder(activeOrder)}
                                            className="px-3 py-1.5 bg-white hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold shrink-0 transition-colors"
                                        >
                                            Editar Resolución
                                        </button>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Left Column: Products & Financials */}
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <Package className="text-red-600" size={18} />
                                                Productos
                                            </h3>
                                            <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                                                {safeToArray(activeOrder.productos).map((item: any, idx: number) => {
                                                    const resolvedImg = resolveOrderItemImage(item, catalogMap);
                                                    const sizeLabel = item.size || 'Estándar';
                                                    const isLarge = sizeLabel === '20L' || sizeLabel.includes('20');
                                                    const isMedium = sizeLabel === '10L' || sizeLabel.includes('10');
                                                    const isGal = sizeLabel === '3.8L' || sizeLabel.includes('Gal') || sizeLabel === '1/2G';
                                                    
                                                    const badgeColor = isLarge
                                                        ? 'bg-red-100 text-red-700 border-red-200'
                                                        : isMedium
                                                        ? 'bg-blue-100 text-blue-700 border-blue-200'
                                                        : isGal
                                                        ? 'bg-amber-100 text-amber-800 border-amber-200'
                                                        : 'bg-gray-100 text-gray-700 border-gray-200';

                                                    return (
                                                        <div key={idx} className="flex gap-4 items-center bg-white p-3 rounded-xl border border-gray-100 shadow-xs">
                                                            <div className="relative w-20 h-20 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                                                                <Image
                                                                    src={`/images/${resolvedImg}`}
                                                                    alt={item.product?.nombre || item.nombre || 'Producto'}
                                                                    fill
                                                                    unoptimized
                                                                    className="object-contain p-1.5"
                                                                />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-bold text-gray-900 line-clamp-2 text-sm">
                                                                    {item.product?.nombre || item.nombre || 'Producto'}
                                                                </p>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-black border uppercase tracking-wider ${badgeColor}`}>
                                                                        📦 {sizeLabel}
                                                                    </span>
                                                                    <span className="text-xs font-bold text-gray-500">
                                                                        x{item.cantidad || 1} {item.cantidad > 1 ? 'unidades' : 'unidad'}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-gray-50">
                                                                    <span className="text-xs text-gray-400">
                                                                        {formatCurrency(item.price || 0)} c/u
                                                                    </span>
                                                                    <span className="font-black text-sm text-gray-900">
                                                                        {formatCurrency((item.price || 0) * (item.cantidad || 1))}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
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
                                                {activeOrder.alertaDireccionReciente && (
                                                    <div className="bg-amber-50 border border-amber-300 p-3 rounded-xl text-amber-900 text-xs space-y-1">
                                                        <p className="font-black flex items-center gap-1.5 text-amber-950">
                                                            <span className="text-sm">⚠️</span> Alerta de Dirección Recurrente (&lt;30 días)
                                                        </p>
                                                        <p className="leading-relaxed font-medium">
                                                            {activeOrder.alertaDireccionDetalle?.mensaje || "Esta dirección de entrega coincide con otro pedido registrado en los últimos 30 días."}
                                                        </p>
                                                        {activeOrder.alertaDireccionDetalle?.pedidoPrevioId && (
                                                            <p className="text-[11px] text-amber-850 bg-amber-100/70 p-1.5 rounded-lg font-mono">
                                                                Previo: #{activeOrder.alertaDireccionDetalle.pedidoPrevioId.slice(-8)} • {activeOrder.alertaDireccionDetalle.clientePrevio} ({activeOrder.alertaDireccionDetalle.celularPrevio}) • Hace {activeOrder.alertaDireccionDetalle.diasAtras} días.
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
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

                                        {/* Despacho & Guía de Transporte */}
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <Truck className="text-blue-600" size={18} />
                                                Despacho & Guía de Transporte
                                            </h3>

                                            {/* Alerta si está 'En Camino' sin guía ni mensajero */}
                                            {activeOrder.status === 'en_camino' && !activeOrder.guiaTransportadora && !activeOrder.mensajeroId && activeOrder.tipoEnvio !== 'recogida_mostrador' && (
                                                <div className="mb-3 bg-amber-50 border-2 border-amber-300 p-3.5 rounded-xl text-amber-900 space-y-1 animate-pulse">
                                                    <div className="flex items-center gap-1.5 font-black text-xs text-amber-950">
                                                        <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                                                        <span>⚠️ PEDIDO "EN CAMINO" SIN GUÍA REGISTRADA</span>
                                                    </div>
                                                    <p className="text-xs text-amber-900 leading-snug">
                                                        El pedido figura en tránsito pero aún no tiene número de guía asignado. Si ya generaste la guía en la plataforma web de 99 Envíos u otra transportadora, vincúlala aquí abajo para mantener la trazabilidad sincronizada.
                                                    </p>
                                                </div>
                                            )}

                                            <div className="bg-white border rounded-xl p-4 space-y-3">
                                                {/* Caso 1: Tiene Guía Registrada */}
                                                {activeOrder.guiaTransportadora ? (
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs text-gray-500 font-bold uppercase">Estado de Despacho</span>
                                                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-black rounded-full border border-emerald-300 flex items-center gap-1">
                                                                <Truck size={12} />
                                                                GUÍA ASIGNADA
                                                            </span>
                                                        </div>

                                                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                            <div>
                                                                <span className="text-[10px] text-gray-500 block uppercase font-bold">
                                                                    Transportadora: <strong className="text-slate-800 uppercase">{activeOrder.transportadora || '99 Envíos'}</strong>
                                                                </span>
                                                                <span className="text-lg font-black font-mono text-gray-900 break-all">
                                                                    {activeOrder.guiaTransportadora}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(activeOrder.guiaTransportadora || '');
                                                                        setCopiedGuia(true);
                                                                        setTimeout(() => setCopiedGuia(false), 2000);
                                                                    }}
                                                                    className="px-2.5 py-1.5 hover:bg-white text-gray-700 rounded-lg text-xs font-bold border border-gray-300 flex items-center gap-1 transition-colors"
                                                                >
                                                                    {copiedGuia ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                                                                    <span>{copiedGuia ? 'Copiada' : 'Copiar'}</span>
                                                                </button>
                                                                <a
                                                                    href={`/rastreo?guia=${activeOrder.guiaTransportadora}&ciudad=${encodeURIComponent(activeOrder.cliente?.ciudad || '')}&depto=${encodeURIComponent(activeOrder.cliente?.departamento || '')}&transportadora=${encodeURIComponent(activeOrder.transportadora || '')}&estado=${encodeURIComponent(activeOrder.status || '')}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                                                                    title="Ver seguimiento animado e interactivo con mapa de Colombia"
                                                                >
                                                                    <MapPin size={13} />
                                                                    <span>Mapa En Vivo</span>
                                                                </a>
                                                                <a
                                                                    href={activeOrder.trackingUrl || `https://www.google.com/search?q=rastreo+guia+${activeOrder.guiaTransportadora}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                                                >
                                                                    <ExternalLink size={13} />
                                                                    <span>Rastrear</span>
                                                                </a>
                                                                <a
                                                                    href={`/api/envios/pdf-guia?guia=${activeOrder.guiaTransportadora}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                                                >
                                                                    <Package size={13} />
                                                                    <span>Rótulo PDF</span>
                                                                </a>
                                                            </div>
                                                        </div>

                                                        {/* Toggle para cambiar o corregir guía */}
                                                        <div className="pt-1 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowManualGuiaForm(!showManualGuiaForm)}
                                                                className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                                                            >
                                                                {showManualGuiaForm ? 'Ocultar reasignación de guía' : '¿Deseas corregir o cambiar la guía?'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    /* Caso 2: Sin Guía Registrada */
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs text-gray-500 font-bold uppercase">Estado de Despacho</span>
                                                            <span className={`px-2.5 py-1 text-[11px] font-black rounded-full border ${
                                                                activeOrder.status === 'entregado'
                                                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                                                    : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                                                            }`}>
                                                                {activeOrder.status === 'entregado' ? '✅ ENTREGADO (SIN GUÍA EN SISTEMA)' : 'PENDIENTE DE GUÍA'}
                                                            </span>
                                                        </div>

                                                        {/* Sugerencia Automática desde Reporte 99 Envíos */}
                                                        {(() => {
                                                            const matches = find99MatchesForOrder(activeOrder);
                                                            if (!matches.length) return null;
                                                            return (
                                                                <div className="bg-purple-500/10 border-2 border-purple-500/40 rounded-xl p-3.5 text-purple-950 space-y-2">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-1.5 font-black text-xs text-purple-900">
                                                                            <Sparkles size={16} className="text-purple-600 shrink-0" />
                                                                            <span>🎯 GUÍA ENCONTRADA EN REPORTE 99 ENVÍOS ({matches.length})</span>
                                                                        </div>
                                                                        <span className="text-[10px] bg-purple-200 text-purple-900 px-2 py-0.5 rounded-full font-bold uppercase">
                                                                            Coincidencia Detectada
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[11px] text-purple-800 leading-snug">
                                                                        Localizamos el despacho de este cliente en el archivo oficial de 99 Envíos. Pulsa para vincularlo de inmediato:
                                                                    </p>
                                                                    <div className="space-y-1.5">
                                                                        {matches.slice(0, 3).map((m: any) => (
                                                                            <div key={m.guia} className="bg-white p-3 rounded-xl border border-purple-200/90 shadow-xs space-y-2 text-xs">
                                                                                <div className="flex flex-wrap items-center gap-1.5 font-bold">
                                                                                    <span className="font-mono text-gray-900 font-black">Guía #{m.guia}</span>
                                                                                    <span className="text-[10px] uppercase px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-black">{m.transportadora}</span>
                                                                                    <span className="text-[10px] uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-black">{m.estado_envio}</span>
                                                                                </div>
                                                                                <p className="text-[11px] text-gray-600">
                                                                                    {m.nombre} · {m.ciudad} · Fecha: {m.fecha?.slice(0, 10)}
                                                                                </p>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleVincularGuiaDirect(activeOrder.id, m.guia, m.transportadora, m.estado_envio)}
                                                                                    disabled={isLinkingGuia}
                                                                                    className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                                                                                >
                                                                                    <Check size={14} />
                                                                                    <span>Auto-Vincular Guía #{m.guia}</span>
                                                                                </button>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}

                                                        {activeOrder.tipoEnvio === 'flota_propia' || activeOrder.mensajeroId ? (
                                                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 space-y-1">
                                                                <p className="font-bold flex items-center gap-1.5">
                                                                    <Truck size={14} /> Asignado a Flota Propia Biocambio360
                                                                </p>
                                                                <p className="text-blue-800 text-[11px]">
                                                                    Mensajero: <strong>{activeOrder.mensajeroNombre || 'Por asignar'}</strong> · {activeOrder.mensajeroTelefono || ''}
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                                                                <p className="text-xs text-slate-700">
                                                                    {activeOrder.status === 'entregado' ? (
                                                                        <span>Este pedido ya fue entregado al cliente. Si se despachó por <strong>99 Envíos</strong> u otra transportadora externa, puedes documentar la guía histórica aquí:</span>
                                                                    ) : (
                                                                        <span>Puedes generar la guía de forma automática con la API de <strong>99 Envíos</strong> o vincular una guía creada manualmente:</span>
                                                                    )}
                                                                </p>
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    {activeOrder.status !== 'entregado' && activeOrder.status !== 'cancelado' && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleGenerarGuia99(activeOrder)}
                                                                            disabled={isGenerating99Guia}
                                                                            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                                                                        >
                                                                            <Package size={14} />
                                                                            {isGenerating99Guia ? 'Generando en 99 Envíos...' : '📦 Generar en 99 Envíos'}
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setShowManualGuiaForm(!showManualGuiaForm)}
                                                                        className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                                                                    >
                                                                        <Link2 size={14} />
                                                                        {showManualGuiaForm ? 'Cerrar Formulario' : 'Vincular Guía Histórica / Manual'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Formulario de Vinculación Manual */}
                                                {showManualGuiaForm && (
                                                    <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl space-y-3 mt-3">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="text-xs font-black text-blue-950 uppercase flex items-center gap-1.5">
                                                                <Link2 size={14} className="text-blue-600" />
                                                                Vincular Guía Manual / Externa
                                                            </h4>
                                                        </div>
                                                        <p className="text-[11px] text-blue-900 leading-snug">
                                                            Si generaste la guía directamente en la web de <strong>99envios.app</strong>, Inter Rapidísimo, Servientrega u otra empresa, pega el número aquí para asociarla al pedido de inmediato.
                                                        </p>
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                            <div className="sm:col-span-2">
                                                                <label className="block text-[10px] font-bold uppercase text-gray-600 mb-1">
                                                                    Número de Guía
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={manualGuiaInput}
                                                                    onChange={(e) => setManualGuiaInput(e.target.value)}
                                                                    placeholder="Ej: 700012345678"
                                                                    className="w-full text-xs p-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-gray-900"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold uppercase text-gray-600 mb-1">
                                                                    Transportadora
                                                                </label>
                                                                <select
                                                                    value={manualTransportadoraInput}
                                                                    onChange={(e) => setManualTransportadoraInput(e.target.value)}
                                                                    className="w-full text-xs p-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900"
                                                                >
                                                                    <option value="99envios">99 Envíos</option>
                                                                    <option value="interrapidisimo">Inter Rapidísimo</option>
                                                                    <option value="coordinadora">Coordinadora</option>
                                                                    <option value="servientrega">Servientrega</option>
                                                                    <option value="envia">Envía</option>
                                                                    <option value="flota_propia">Flota Propia</option>
                                                                    <option value="otra">Otra Transportadora</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {linkingGuiaFeedback && (
                                                            <p className="text-xs font-bold text-slate-800">{linkingGuiaFeedback}</p>
                                                        )}

                                                        <div className="flex justify-end gap-2 pt-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleVincularGuia(activeOrder.id)}
                                                                disabled={isLinkingGuia || !manualGuiaInput.trim()}
                                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                                                            >
                                                                <Check size={14} />
                                                                {isLinkingGuia ? 'Guardando...' : 'Vincular Guía al Pedido'}
                                                            </button>
                                                        </div>
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

                                        {/* Payment Method & Technical Transaction Card */}
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <CreditCard className={activeOrder.metodoPago === 'addi' ? 'text-purple-600' : activeOrder.metodoPago === 'wompi' ? 'text-blue-600' : 'text-amber-600'} size={18} />
                                                Método de Pago & Transacción
                                            </h3>
                                            <div className={`border rounded-xl p-4 space-y-3 ${
                                                activeOrder.metodoPago === 'addi'
                                                    ? 'bg-purple-50/40 border-purple-200'
                                                    : activeOrder.metodoPago === 'wompi'
                                                    ? 'bg-blue-50/40 border-blue-200'
                                                    : 'bg-amber-50/40 border-amber-200'
                                            }`}>
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xl">
                                                            {activeOrder.metodoPago === 'addi' ? '✨' : activeOrder.metodoPago === 'wompi' ? '💳' : '💵'}
                                                        </span>
                                                        <div>
                                                            <p className="font-black text-gray-900 text-sm">
                                                                {activeOrder.metodoPago === 'addi'
                                                                    ? 'Pago a Cuotas con ADDI'
                                                                    : activeOrder.metodoPago === 'wompi'
                                                                    ? 'Pago en Línea (Wompi)'
                                                                    : 'Pago Contraentrega (Efectivo/Nequi)'}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {activeOrder.metodoPago === 'addi'
                                                                    ? 'Pasarela ADDI · 0% Interés en hasta 3 cuotas'
                                                                    : activeOrder.metodoPago === 'wompi'
                                                                    ? 'Pasarela Wompi · Bancolombia'
                                                                    : 'Cobro por repartidor / transportadora'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Badge de Estado Wompi */}
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

                                                    {/* Badge de Estado Addi */}
                                                    {activeOrder.metodoPago === 'addi' && (
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1 ${
                                                            activeOrder.addiTransaction?.status === 'APPROVED'
                                                                ? 'bg-green-100 text-green-800 border border-green-300'
                                                                : activeOrder.addiTransaction?.status === 'DECLINED' || activeOrder.addiTransaction?.status === 'REJECTED' || activeOrder.status === 'cancelado'
                                                                ? 'bg-red-100 text-red-800 border border-red-300'
                                                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                                                        }`}>
                                                            {activeOrder.addiTransaction?.status === 'APPROVED'
                                                                ? '✅ CRÉDITO APROBADO (ADDI)'
                                                                : activeOrder.addiTransaction?.status === 'DECLINED' || activeOrder.addiTransaction?.status === 'REJECTED' || activeOrder.status === 'cancelado'
                                                                ? '❌ SOLICITUD CANCELADA / RECHAZADA'
                                                                : '⏳ SOLICITUD EN TRÁMITE / PENDIENTE'}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Detalle Wompi */}
                                                {activeOrder.metodoPago === 'wompi' && (
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
                                                )}

                                                {/* Detalle Addi */}
                                                {activeOrder.metodoPago === 'addi' && (
                                                    <div className="bg-white rounded-lg p-3.5 border border-purple-100 space-y-3 text-xs">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <span className="text-gray-500 block font-medium">Referencia Pedido:</span>
                                                                <span className="font-mono font-bold text-gray-900 break-all">{activeOrder.id}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500 block font-medium">ID Solicitud Addi:</span>
                                                                <span className={`font-mono font-bold break-all ${activeOrder.addiTransaction?.applicationId ? 'text-purple-700' : 'text-gray-500'}`}>
                                                                    {activeOrder.addiTransaction?.applicationId || 'Sin ID asignado aún'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                                                            <div>
                                                                <span className="text-gray-500 block font-medium">Estado en Addi:</span>
                                                                <span className={`font-black uppercase ${
                                                                    activeOrder.addiTransaction?.status === 'APPROVED'
                                                                        ? 'text-green-700'
                                                                        : activeOrder.addiTransaction?.status === 'DECLINED' || activeOrder.addiTransaction?.status === 'REJECTED' || activeOrder.status === 'cancelado'
                                                                        ? 'text-red-700'
                                                                        : 'text-amber-700'
                                                                }`}>
                                                                    {activeOrder.addiTransaction?.status || (activeOrder.status === 'cancelado' ? 'DECLINED' : 'PENDING')}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-500 block font-medium">Monto Aprobado Addi:</span>
                                                                <span className="font-black text-gray-900">
                                                                    {formatCurrency(
                                                                        activeOrder.addiTransaction?.approvedAmount != null
                                                                            ? Number(activeOrder.addiTransaction.approvedAmount)
                                                                            : (activeOrder.addiTransaction?.status === 'APPROVED' ? activeOrder.total : 0)
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {activeOrder.addiTransaction?.attemptId && (
                                                            <div className="pt-2 border-t border-gray-100">
                                                                <span className="text-gray-500 block text-[11px]">ID de Intento Interno:</span>
                                                                <span className="font-mono text-gray-600 text-[11px] break-all">{activeOrder.addiTransaction.attemptId}</span>
                                                            </div>
                                                        )}

                                                        {/* Status explanation for Admin / Logistics */}
                                                        {activeOrder.addiTransaction?.status === 'APPROVED' ? (
                                                            <div className="p-2.5 bg-green-50 border border-green-200 rounded-lg text-green-900 flex items-start gap-2">
                                                                <span className="text-base leading-none">✅</span>
                                                                <div>
                                                                    <p className="font-bold">Crédito 100% verificado y aprobado por ADDI</p>
                                                                    <p className="text-[11px] text-green-700 mt-0.5">
                                                                        Addi transfiere los fondos a Biocambio360. <strong>NO cobrar ningún valor al cliente al momento de la entrega</strong>. Despachar este pedido con normalidad.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ) : activeOrder.addiTransaction?.status === 'DECLINED' || activeOrder.addiTransaction?.status === 'REJECTED' || activeOrder.status === 'cancelado' ? (
                                                            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-900 space-y-1">
                                                                <div className="flex items-center gap-1.5 font-bold text-[11px] text-red-800">
                                                                    <span>❌ Solicitud Cancelada o Declinada en ADDI:</span>
                                                                </div>
                                                                <p className="text-[11px] text-red-800 leading-snug">
                                                                    El cliente canceló el proceso o la solicitud de crédito no fue aprobada por la pasarela de Addi.
                                                                </p>
                                                                <p className="text-[11px] text-red-900 font-medium">
                                                                    • <strong>NO despachar este pedido</strong> a menos que el cliente acuerde pagar contraentrega o por transferencia.<br />
                                                                    • Puedes contactarlo por WhatsApp para brindarle alternativas de compra.
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 space-y-1">
                                                                <div className="flex items-center gap-1.5 font-bold text-[11px] text-amber-800">
                                                                    <span>⏳ Solicitud en Trámite:</span>
                                                                </div>
                                                                <p className="text-[11px] text-amber-800 leading-snug">
                                                                    El cliente inició la solicitud en Addi pero aún no se ha registrado confirmación final.
                                                                </p>
                                                                <p className="text-[11px] text-amber-900 font-medium">
                                                                    • Pulsa el botón morado <strong>"Consultar / Sincronizar en ADDI"</strong> para refrescar el estado en vivo.
                                                                </p>
                                                            </div>
                                                        )}

                                                        {/* Live check button */}
                                                        <div className="pt-2 flex items-center justify-between gap-2 flex-wrap border-t border-gray-100">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCheckAddi(activeOrder.id)}
                                                                disabled={isCheckingAddi}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                                                            >
                                                                <RefreshCw size={13} className={isCheckingAddi ? 'animate-spin' : ''} />
                                                                {isCheckingAddi ? 'Consultando Addi...' : '🔍 Consultar / Sincronizar en ADDI'}
                                                            </button>
                                                            {addiStatusFeedback && (
                                                                <span className="text-[11px] font-bold text-gray-700">{addiStatusFeedback}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Detalle Contraentrega */}
                                                {activeOrder.metodoPago === 'contraentrega' && (
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
                            <div className="p-6 border-t bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky bottom-0">
                                <div>
                                    {activeOrder.guiaTransportadora ? (
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-mono font-bold text-gray-700 bg-white px-3 py-1.5 rounded-lg border border-gray-200 flex items-center gap-1.5 shadow-xs">
                                                <Truck size={14} className="text-emerald-600" />
                                                Guía #{activeOrder.guiaTransportadora} ({activeOrder.transportadora || '99 Envíos'})
                                            </span>
                                             <a
                                                href={`/rastreo?guia=${activeOrder.guiaTransportadora}&ciudad=${encodeURIComponent(activeOrder.cliente?.ciudad || '')}&depto=${encodeURIComponent(activeOrder.cliente?.departamento || '')}&transportadora=${encodeURIComponent(activeOrder.transportadora || '')}&estado=${encodeURIComponent(activeOrder.status || '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                                                title="Ver ruta en mapa satelital animado"
                                            >
                                                <MapPin size={14} />
                                                Tracking Satelital
                                            </a>
                                            <a
                                                href={`/api/envios/pdf-guia?guia=${activeOrder.guiaTransportadora}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                                            >
                                                <Package size={14} />
                                                Rótulo / Sticker PDF
                                            </a>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-500 font-medium hidden sm:block">
                                            {activeOrder.tipoEnvio === 'flota_propia' ? 'Despacho local por flota propia' : 'Guía de transporte pendiente'}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2.5">
                                    {!activeOrder.guiaTransportadora && activeOrder.tipoEnvio !== 'flota_propia' && activeOrder.status !== 'entregado' && activeOrder.status !== 'cancelado' && (
                                        <button
                                            type="button"
                                            onClick={() => handleGenerarGuia99(activeOrder)}
                                            disabled={isGenerating99Guia}
                                            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                                        >
                                            <Package size={16} />
                                            {isGenerating99Guia ? 'Generando...' : '📦 Generar Guía 99 Envíos'}
                                        </button>
                                    )}
                                    <a
                                        href={`https://wa.me/57${activeOrder.cliente.celular.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${activeOrder.cliente.nombre}, respecto a tu pedido #${activeOrder.id}...`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors shadow-xs"
                                    >
                                        <MessageCircle size={16} />
                                        Contactar por WhatsApp
                                    </a>
                                </div>
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

                            {/* Alerta preventiva al pasar a 'en_camino' sin guía ni mensajero */}
                            {stageChangePrompt.targetStatus === 'en_camino' && (() => {
                                const targetOrder = orders.find(o => o.id === stageChangePrompt.orderId);
                                const missingCarrier = !targetOrder?.guiaTransportadora && !targetOrder?.mensajeroId && targetOrder?.tipoEnvio !== 'recogida_mostrador';
                                if (!missingCarrier) return null;
                                return (
                                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs space-y-1">
                                        <p className="font-black flex items-center gap-1.5 text-amber-950">
                                            <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                                            Recordatorio de Despacho:
                                        </p>
                                        <p className="leading-snug">
                                            Este pedido no tiene guía de transporte ni mensajero asignado. Recuerda generar la guía en <strong>99 Envíos</strong> o vincular el número de guía externa en el detalle del pedido para no perder la trazabilidad.
                                        </p>
                                    </div>
                                );
                            })()}

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

            {/* Modal de Tratamiento Especial de Novedades Contraentrega */}
            <DeliveryExceptionModal
                isOpen={!!deliveryExceptionOrder}
                onClose={() => setDeliveryExceptionOrder(null)}
                order={deliveryExceptionOrder}
                onSuccess={() => {
                    setDeliveryExceptionOrder(null);
                    setActiveOrder(null);
                }}
            />

            {/* Modal Cambiar Contraseña */}
            <ChangePasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
            />
        </div>
    );
}
