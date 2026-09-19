'use client';

import { useState, useEffect } from 'react';
import {
    Truck,
    MapPin,
    Phone,
    MessageCircle,
    CheckCircle2,
    AlertTriangle,
    Navigation,
    DollarSign,
    Calendar,
    RefreshCw,
    User,
    Package,
    ShieldCheck,
    ArrowLeft,
    Clock,
    Check,
    X,
    PhoneCall,
} from 'lucide-react';
import {
    Messenger,
    getMessengers,
    markMessengerDelivered,
    reportMessengerException,
} from '@/lib/messengers-service';
import { subscribeToOrders } from '@/lib/orders-service';
import { Order, OrderStatus } from '@/types/order';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

export default function MensajeroAppPage() {
    const { user, userProfile } = useAuth();
    const [messengers, setMessengers] = useState<Messenger[]>([]);
    const [selectedMessengerId, setSelectedMessengerId] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });

    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Modales operativos
    const [deliveryModalOrder, setDeliveryModalOrder] = useState<Order | null>(null);
    const [recipientName, setRecipientName] = useState<string>('');
    const [recipientDoc, setRecipientDoc] = useState<string>('');
    const [codCollected, setCodCollected] = useState<number>(0);
    const [deliveryNotes, setDeliveryNotes] = useState<string>('');
    const [isSubmittingDelivery, setIsSubmittingDelivery] = useState<boolean>(false);

    const [exceptionModalOrder, setExceptionModalOrder] = useState<Order | null>(null);
    const [exceptionReason, setExceptionReason] = useState<string>('cliente_ausente');
    const [exceptionDetail, setExceptionDetail] = useState<string>('');
    const [isSubmittingException, setIsSubmittingException] = useState<boolean>(false);

    // Cargar mensajeros
    useEffect(() => {
        async function loadData() {
            try {
                const list = await getMessengers();
                setMessengers(list);
                if (list.length > 0) {
                    // Si el usuario logueado coincide con algún mensajero por email o nombre, preseleccionarlo
                    const matched = list.find(m =>
                        (user?.email && m.email === user.email) ||
                        (userProfile?.nombre && m.nombre.toLowerCase().includes(userProfile.nombre.toLowerCase()))
                    );
                    setSelectedMessengerId(matched ? matched.id : list[0].id);
                }
            } catch (err) {
                console.error('Error cargando mensajeros:', err);
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [user, userProfile]);

    // Suscribirse en tiempo real a los pedidos
    useEffect(() => {
        const unsubscribe = subscribeToOrders((allOrders) => {
            setOrders(allOrders);
        });
        return () => unsubscribe();
    }, []);

    const selectedMessenger = messengers.find(m => m.id === selectedMessengerId);

    // Filtrar pedidos asignados al mensajero para la fecha seleccionada
    const myOrders = orders.filter(ord => {
        // Pedidos asignados explícitamente a este mensajero
        if (ord.mensajeroId === selectedMessengerId) {
            if (ord.fechaProgramadaEntrega) {
                return ord.fechaProgramadaEntrega === selectedDate;
            }
            return true;
        }
        return false;
    });

    // Cálculos de métricas rápidas del día
    const totalAssigned = myOrders.length;
    const deliveredCount = myOrders.filter(o => o.status === 'entregado').length;
    const exceptionCount = myOrders.filter(o => o.status === 'no_entregado').length;
    const pendingCount = myOrders.filter(o => o.status !== 'entregado' && o.status !== 'no_entregado' && o.status !== 'cancelado').length;

    // Total efectivo recaudado en mano por entregar
    const cashCollectedTotal = myOrders.reduce((sum, ord) => {
        if (ord.status === 'entregado') {
            const val = ord.recaudoEfectivoRecibido ?? (ord.metodoPago === 'contraentrega' ? ord.total : 0);
            return sum + (val || 0);
        }
        return sum;
    }, 0);

    // Handlers para modales
    const handleOpenDeliveryModal = (ord: Order) => {
        setDeliveryModalOrder(ord);
        setRecipientName(ord.cliente?.nombre || '');
        setRecipientDoc('');
        setCodCollected(ord.metodoPago === 'contraentrega' ? ord.total : 0);
        setDeliveryNotes('');
    };

    const handleConfirmDelivery = async () => {
        if (!deliveryModalOrder || !selectedMessenger) return;
        if (!recipientName.trim()) {
            alert('Por favor escribe el nombre de la persona que recibe.');
            return;
        }

        setIsSubmittingDelivery(true);
        try {
            await markMessengerDelivered(
                deliveryModalOrder.id,
                selectedMessenger.id,
                {
                    recibidoPor: recipientName.trim(),
                    documentoRecibido: recipientDoc.trim(),
                    recaudoEfectivo: codCollected,
                    notas: deliveryNotes.trim(),
                },
                {
                    nombre: selectedMessenger.nombre,
                    email: selectedMessenger.email || `${selectedMessenger.id}@biocambio360.com`,
                    role: 'mensajero',
                }
            );
            setDeliveryModalOrder(null);
        } catch (err: any) {
            alert(`Error confirmando entrega: ${err?.message || err}`);
        } finally {
            setIsSubmittingDelivery(false);
        }
    };

    const handleOpenExceptionModal = (ord: Order) => {
        setExceptionModalOrder(ord);
        setExceptionReason('cliente_ausente');
        setExceptionDetail('');
    };

    const handleConfirmException = async () => {
        if (!exceptionModalOrder || !selectedMessenger) return;

        setIsSubmittingException(true);
        try {
            await reportMessengerException(
                exceptionModalOrder.id,
                selectedMessenger.id,
                {
                    motivo: exceptionReason,
                    motivoDetalle: exceptionDetail.trim(),
                },
                {
                    nombre: selectedMessenger.nombre,
                    email: selectedMessenger.email || `${selectedMessenger.id}@biocambio360.com`,
                    role: 'mensajero',
                }
            );
            setExceptionModalOrder(null);
        } catch (err: any) {
            alert(`Error registrando novedad: ${err?.message || err}`);
        } finally {
            setIsSubmittingException(false);
        }
    };

    const formatMoney = (val: number) => `$${(val || 0).toLocaleString('es-CO')}`;

    return (
        <div className="min-h-screen bg-slate-100 pb-20 text-slate-900 font-sans">
            {/* CABECERA ROBUSTA MOBILE FIRST */}
            <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-md px-4 py-3 border-b-4 border-emerald-500">
                <div className="max-w-md mx-auto flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black shadow-inner">
                            <Truck size={22} />
                        </div>
                        <div>
                            <h1 className="text-sm font-black tracking-tight flex items-center gap-1.5 leading-tight">
                                <span>Biocambio360</span>
                                <span className="bg-emerald-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded uppercase">
                                    Ruta
                                </span>
                            </h1>
                            <p className="text-[11px] text-slate-300 font-medium">
                                Flota Propia · Última Milla
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <Link
                            href="/admin"
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs flex items-center gap-1 transition-colors border border-slate-700"
                            title="Ir al panel principal"
                        >
                            <ArrowLeft size={14} />
                            <span className="hidden sm:inline">Admin</span>
                        </Link>
                    </div>
                </div>

                {/* SELECTOR DE MENSAJERO Y FECHA */}
                <div className="max-w-md mx-auto mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                            Mensajero:
                        </label>
                        <select
                            value={selectedMessengerId}
                            onChange={(e) => setSelectedMessengerId(e.target.value)}
                            className="w-full bg-slate-800 text-white border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-black focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        >
                            {messengers.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.nombre} ({m.placaVehiculo})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                            Fecha de entrega:
                        </label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full bg-slate-800 text-white border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                    </div>
                </div>
            </header>

            <main className="max-w-md mx-auto p-4 space-y-4">
                {/* TARJETA DEL MENSAJERO ACTIVO */}
                {selectedMessenger && (
                    <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-black">
                                <User size={22} />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-slate-900 leading-tight">
                                    {selectedMessenger.nombre}
                                </h2>
                                <p className="text-xs text-slate-500 flex items-center gap-1 font-semibold">
                                    <span className="uppercase">{selectedMessenger.tipoVehiculo}:</span>
                                    <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono font-black text-[11px]">
                                        {selectedMessenger.placaVehiculo}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                {selectedMessenger.activo ? 'En Turno' : 'Inactivo'}
                            </span>
                        </div>
                    </div>
                )}

                {/* 4 KPIS DE ALTO IMPACTO */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Asignados</span>
                        <span className="text-2xl font-black text-slate-900 leading-tight">{totalAssigned}</span>
                    </div>

                    <div className="bg-white rounded-2xl p-3 border border-emerald-200 bg-emerald-50/40 shadow-xs text-center">
                        <span className="text-[10px] font-black text-emerald-800 uppercase block">Entregados</span>
                        <span className="text-2xl font-black text-emerald-700 leading-tight">{deliveredCount}</span>
                    </div>

                    <div className="bg-white rounded-2xl p-3 border border-amber-200 bg-amber-50/40 shadow-xs text-center">
                        <span className="text-[10px] font-black text-amber-800 uppercase block">Novedades</span>
                        <span className="text-2xl font-black text-amber-700 leading-tight">{exceptionCount}</span>
                    </div>

                    <div className="bg-white rounded-2xl p-3 border border-indigo-200 bg-indigo-50/40 shadow-xs text-center">
                        <span className="text-[10px] font-black text-indigo-800 uppercase block">Pendientes</span>
                        <span className="text-2xl font-black text-indigo-700 leading-tight">{pendingCount}</span>
                    </div>
                </div>

                {/* CAJA DE EFECTIVO EN MANO (ARQUEO EN VIVO) */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-4 shadow-md flex items-center justify-between">
                    <div>
                        <span className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider block">
                            Efectivo Recaudado en Mano (COD)
                        </span>
                        <span className="text-2xl font-black tracking-tight">
                            {formatMoney(cashCollectedTotal)}
                        </span>
                        <p className="text-[10px] text-emerald-100/90 mt-0.5 font-medium">
                            Total a entregar a tesorería al finalizar la jornada
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white shrink-0">
                        <DollarSign size={28} />
                    </div>
                </div>

                {/* LISTA DE PEDIDOS EN RUTA */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Package size={14} className="text-slate-500" />
                            <span>Entregas de la Jornada ({myOrders.length})</span>
                        </h3>
                    </div>

                    {myOrders.length === 0 ? (
                        <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-300 text-center space-y-2">
                            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                                <Truck size={24} />
                            </div>
                            <h4 className="text-sm font-bold text-slate-800">No hay pedidos asignados</h4>
                            <p className="text-xs text-slate-500">
                                No tienes pedidos de flota propia asignados para el día {selectedDate}.
                            </p>
                        </div>
                    ) : (
                        myOrders.map((ord, idx) => {
                            const isDelivered = ord.status === 'entregado';
                            const isException = ord.status === 'no_entregado';
                            const cleanPhone = (ord.cliente?.celular || '').replace(/\D/g, '');
                            const fullAddress = `${ord.cliente?.direccion || ''}, ${ord.cliente?.ciudad || 'Bogotá'}`;
                            const isCod = ord.metodoPago === 'contraentrega';

                            const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(fullAddress)}`;
                            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;

                            const whatsappText = `¡Hola ${ord.cliente?.nombre || 'Cliente'}! Te saluda ${selectedMessenger?.nombre || 'el mensajero'} de Biocambio360 🚚. Voy en camino a entregarte tu pedido de aseo y llego en aproximadamente 15 a 20 minutos a tu dirección: *${ord.cliente?.direccion || ''}*. ${isCod ? `Total a cobrar en efectivo: *${formatMoney(ord.total)}*.` : 'Tu pedido ya está pagado.'} Por favor confirma si estás atento/a para recibir. ¡Muchas gracias!`;

                            const ventasPhone = '573027504568';
                            const ventasNoContestaText = `Hola equipo de ventas Biocambio360 👋, les saluda el domiciliario ${selectedMessenger?.nombre || 'de ruta'}. Me encuentro en la dirección ${ord.cliente?.direccion || ''} para entregar el pedido #${ord.id.slice(-6).toUpperCase()} a ${ord.cliente?.nombre || 'cliente'} (${ord.cliente?.celular || ''}) pero no responde al llamado ni timbres. ¿Me ayudan a contactarlo para culminar la entrega y no devolver el pedido?`;
                            const ventasVerificarPagoText = `Hola equipo de ventas Biocambio360 👋, el cliente ${ord.cliente?.nombre || 'cliente'} del pedido #${ord.id.slice(-6).toUpperCase()} indica que realizó pago por transferencia bancaria por valor de ${formatMoney(ord.total)}. ¿Me confirman si el pago fue verificado y aprobado para entregar los productos?`;

                            return (
                                <div
                                    key={ord.id}
                                    className={`bg-white rounded-2xl border-2 transition-all shadow-xs overflow-hidden ${
                                        isDelivered
                                            ? 'border-emerald-300 bg-emerald-50/20'
                                            : isException
                                            ? 'border-rose-300 bg-rose-50/20'
                                            : 'border-slate-200'
                                    }`}
                                >
                                    {/* CABECERA DE LA TARJETA */}
                                    <div className="p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center font-mono">
                                                    {idx + 1}
                                                </span>
                                                <span className="text-xs font-mono font-bold text-slate-500">
                                                    #{ord.id.slice(-6).toUpperCase()}
                                                </span>
                                            </div>

                                            <div>
                                                {isDelivered && (
                                                    <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                                        <Check size={13} /> Entregado
                                                    </span>
                                                )}
                                                {isException && (
                                                    <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                                                        <AlertTriangle size={13} /> Con Novedad
                                                    </span>
                                                )}
                                                {!isDelivered && !isException && (
                                                    <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">
                                                        <Clock size={13} /> En Ruta
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* DIRECCIÓN Y DESTINO (TEXTO GIGANTE Y CLARO) */}
                                        <div>
                                            <h4 className="text-base font-black text-slate-900 leading-tight">
                                                {ord.cliente?.direccion}
                                            </h4>
                                            <p className="text-xs text-slate-600 font-bold flex items-center gap-1 mt-0.5">
                                                <MapPin size={13} className="text-slate-400 shrink-0" />
                                                <span>{ord.cliente?.ciudad || 'Bogotá'}{ord.cliente?.barrio ? ` · B. ${ord.cliente.barrio}` : ''}</span>
                                            </p>
                                            <p className="text-xs text-slate-500 font-medium mt-1">
                                                Cliente: <strong className="text-slate-800">{ord.cliente?.nombre}</strong>
                                            </p>
                                        </div>

                                        {/* CAJA DESTACADA DE COBRO */}
                                        <div className={`p-3 rounded-xl border-2 flex items-center justify-between ${
                                            isCod
                                                ? 'bg-amber-50 border-amber-300 text-amber-900'
                                                : 'bg-blue-50 border-blue-300 text-blue-900'
                                        }`}>
                                            <div>
                                                <span className="text-[10px] font-black uppercase tracking-wider block">
                                                    {isCod ? '💵 Cobrar en Efectivo (Contraentrega):' : '✅ Pagado en Línea:'}
                                                </span>
                                                <span className="text-xl font-black">
                                                    {isCod ? formatMoney(ord.total) : '$0 COP'}
                                                </span>
                                            </div>
                                            <div className="text-right text-[10px] font-bold">
                                                <span className="block">{ord.productos?.length || 1} producto(s)</span>
                                                <span className="opacity-80 uppercase">{ord.metodoPago}</span>
                                            </div>
                                        </div>

                                        {/* DETALLE DE NOVEDAD SI YA EXISTE */}
                                        {isException && ord.novedadEntrega && (
                                            <div className="p-2.5 bg-rose-100/70 border border-rose-200 rounded-xl text-xs text-rose-900">
                                                <strong>Novedad registrada:</strong> {ord.novedadEntrega.motivoDetalle || ord.novedadEntrega.motivo}
                                            </div>
                                        )}

                                        {/* DETALLE DE ENTREGA SI YA ESTÁ ENTREGADO */}
                                        {isDelivered && ord.pruebaEntrega && (
                                            <div className="p-2.5 bg-emerald-100/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-0.5">
                                                <div><strong>Recibió:</strong> {ord.pruebaEntrega.recibidoPor} {ord.pruebaEntrega.documentoRecibido ? `(CC: ${ord.pruebaEntrega.documentoRecibido})` : ''}</div>
                                                <div><strong>Efectivo cobrado:</strong> {formatMoney(ord.recaudoEfectivoRecibido || 0)}</div>
                                            </div>
                                        )}

                                        {/* BOTONES DE NAVEGACIÓN Y CONTACTO A 1-CLIC */}
                                        <div className="grid grid-cols-3 gap-2 pt-1">
                                            {/* WAZE / MAPS */}
                                            <a
                                                href={wazeUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="py-2.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs flex flex-col items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
                                            >
                                                <Navigation size={18} />
                                                <span>Waze</span>
                                            </a>

                                            {/* LLAMADA TELEFÓNICA */}
                                            <a
                                                href={`tel:${cleanPhone}`}
                                                className="py-2.5 px-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-black text-xs flex flex-col items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
                                            >
                                                <Phone size={18} />
                                                <span>Llamar</span>
                                            </a>

                                            {/* WHATSAPP */}
                                            <a
                                                href={`https://wa.me/57${cleanPhone}?text=${encodeURIComponent(whatsappText)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="py-2.5 px-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs flex flex-col items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
                                            >
                                                <MessageCircle size={18} />
                                                <span>WhatsApp</span>
                                            </a>
                                        </div>

                                        {/* CANALES DE ASISTENCIA CON VENTAS EN CALLE */}
                                        {!isDelivered && (
                                            <div className="pt-2 border-t border-slate-100 space-y-1.5">
                                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                    <span>Canales de Asistencia en Calle:</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <a
                                                        href={`https://wa.me/${ventasPhone}?text=${encodeURIComponent(ventasNoContestaText)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="py-2.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                                        title="Pedir apoyo a ventas si el cliente no contesta el teléfono o timbre"
                                                    >
                                                        <PhoneCall size={14} className="text-rose-600 shrink-0" />
                                                        <span className="truncate">Ventas: No Contesta</span>
                                                    </a>

                                                    <a
                                                        href={`https://wa.me/${ventasPhone}?text=${encodeURIComponent(ventasVerificarPagoText)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="py-2.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                                        title="Pedir a ventas verificación de pago por transferencia"
                                                    >
                                                        <ShieldCheck size={14} className="text-blue-600 shrink-0" />
                                                        <span className="truncate">Verificar Pago</span>
                                                    </a>
                                                </div>
                                            </div>
                                        )}

                                        {/* BOTONES DE RESOLUCIÓN DE ENTREGA */}
                                        {!isDelivered && (
                                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                                                <button
                                                    onClick={() => handleOpenDeliveryModal(ord)}
                                                    className="py-3 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
                                                >
                                                    <CheckCircle2 size={16} />
                                                    <span>Marcar Entregado</span>
                                                </button>

                                                <button
                                                    onClick={() => handleOpenExceptionModal(ord)}
                                                    className="py-3 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
                                                >
                                                    <AlertTriangle size={16} />
                                                    <span>Novedad</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </main>

            {/* MODAL GIGANTE PARA CONFIRMAR ENTREGA */}
            {deliveryModalOrder && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-3">
                    <div className="bg-white w-full max-w-md rounded-3xl p-5 space-y-4 shadow-2xl border border-slate-200">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                    <CheckCircle2 size={18} />
                                </div>
                                <h3 className="text-base font-black text-slate-900">
                                    Confirmar Entrega Exitosa
                                </h3>
                            </div>
                            <button
                                onClick={() => setDeliveryModalOrder(null)}
                                className="text-slate-400 hover:text-slate-600 p-1"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    ¿Quién recibe el pedido? *
                                </label>
                                <input
                                    type="text"
                                    value={recipientName}
                                    onChange={(e) => setRecipientName(e.target.value)}
                                    placeholder="Nombre completo de quien recibe"
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:bg-white focus:border-emerald-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Cédula de quien recibe (Opcional):
                                </label>
                                <input
                                    type="text"
                                    value={recipientDoc}
                                    onChange={(e) => setRecipientDoc(e.target.value)}
                                    placeholder="Número de cédula"
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold focus:bg-white focus:border-emerald-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Dinero en Efectivo Recaudado (COP) *:
                                </label>
                                <input
                                    type="number"
                                    value={codCollected}
                                    onChange={(e) => setCodCollected(Number(e.target.value) || 0)}
                                    className="w-full bg-emerald-50 border-2 border-emerald-300 text-emerald-950 rounded-xl px-3 py-2.5 text-lg font-black focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <p className="text-[11px] text-slate-500 mt-1">
                                    {deliveryModalOrder.metodoPago === 'contraentrega'
                                        ? `Valor de la orden: ${formatMoney(deliveryModalOrder.total)}`
                                        : 'Esta orden ya fue pagada en línea (recaudo sugerido: $0)'}
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Observaciones / Notas (Opcional):
                                </label>
                                <input
                                    type="text"
                                    value={deliveryNotes}
                                    onChange={(e) => setDeliveryNotes(e.target.value)}
                                    placeholder="Ej: Se entregó al portero Don Luis"
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:border-emerald-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="pt-2 flex items-center gap-2">
                            <button
                                onClick={() => setDeliveryModalOrder(null)}
                                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmDelivery}
                                disabled={isSubmittingDelivery}
                                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                            >
                                {isSubmittingDelivery ? 'Guardando...' : '✓ Confirmar Entrega'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL GIGANTE PARA REPORTAR NOVEDAD */}
            {exceptionModalOrder && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-3">
                    <div className="bg-white w-full max-w-md rounded-3xl p-5 space-y-4 shadow-2xl border border-slate-200">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                                    <AlertTriangle size={18} />
                                </div>
                                <h3 className="text-base font-black text-slate-900">
                                    Reportar Novedad de Entrega
                                </h3>
                            </div>
                            <button
                                onClick={() => setExceptionModalOrder(null)}
                                className="text-slate-400 hover:text-slate-600 p-1"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <label className="block text-xs font-bold text-slate-700">
                                Selecciona el motivo de la novedad *:
                            </label>

                            <div className="space-y-1.5">
                                {[
                                    { id: 'cliente_ausente', label: '❌ Cliente ausente / No contestan' },
                                    { id: 'direccion_erronea', label: '📍 Dirección errada o incompleta' },
                                    { id: 'sin_dinero', label: '💸 No tiene el dinero completo' },
                                    { id: 'solicito_reprogramacion', label: '📅 Cliente pide entregar otro día' },
                                    { id: 'rechazado', label: '🛑 Cliente rechazó el pedido' },
                                    { id: 'averiado', label: '💥 Producto averiado / derrame' },
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setExceptionReason(item.id)}
                                        className={`w-full text-left p-3 rounded-xl border-2 text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                                            exceptionReason === item.id
                                                ? 'bg-amber-50 border-amber-500 text-amber-950 shadow-xs'
                                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                        }`}
                                    >
                                        <span>{item.label}</span>
                                        {exceptionReason === item.id && <Check size={16} className="text-amber-600" />}
                                    </button>
                                ))}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Detalle adicional (Opcional):
                                </label>
                                <input
                                    type="text"
                                    value={exceptionDetail}
                                    onChange={(e) => setExceptionDetail(e.target.value)}
                                    placeholder="Ej: Se llamó 3 veces y mandó a buzón"
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        <div className="pt-2 flex items-center gap-2">
                            <button
                                onClick={() => setExceptionModalOrder(null)}
                                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmException}
                                disabled={isSubmittingException}
                                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black text-xs shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                            >
                                {isSubmittingException ? 'Guardando...' : '⚠️ Registrar Novedad'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
