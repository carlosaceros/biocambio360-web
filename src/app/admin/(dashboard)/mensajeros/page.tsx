'use client';

import { useState, useEffect } from 'react';
import {
    Truck,
    Users,
    DollarSign,
    Calendar,
    CheckCircle2,
    AlertTriangle,
    Settings,
    Plus,
    Phone,
    Navigation,
    Clock,
    Search,
    Filter,
    ShieldCheck,
    Download,
    Edit2,
    FileText,
    Check,
    X,
    UserCheck,
    UserX,
    ExternalLink,
} from 'lucide-react';
import {
    Messenger,
    MessengerRateConfig,
    MessengerSettlement,
    getMessengers,
    saveMessenger,
    toggleMessengerStatus,
    getMessengerRates,
    saveMessengerRates,
    assignOrderToMessenger,
    getMessengerSettlementSummary,
    saveMessengerSettlement,
    getMessengerSettlements,
} from '@/lib/messengers-service';
import { subscribeToOrders } from '@/lib/orders-service';
import { Order } from '@/types/order';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

export default function MensajerosAdminPage() {
    const { user, userProfile } = useAuth();
    const [activeTab, setActiveTab] = useState<'asignacion' | 'directorio' | 'liquidacion' | 'tarifas'>('asignacion');

    const [messengers, setMessengers] = useState<Messenger[]>([]);
    const [rates, setRates] = useState<MessengerRateConfig | null>(null);
    const [settlements, setSettlements] = useState<MessengerSettlement[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Filtros de asignación
    const [searchOrderQuery, setSearchOrderQuery] = useState<string>('');
    const [filterDate, setFilterDate] = useState<string>(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    });

    // Modal de edición / creación de mensajero
    const [editingMessenger, setEditingMessenger] = useState<Partial<Messenger> | null>(null);
    const [isSavingMessenger, setIsSavingMessenger] = useState<boolean>(false);

    // Modal de asignación rápida
    const [assigningOrder, setAssigningOrder] = useState<Order | null>(null);
    const [selectedMessengerForAssign, setSelectedMessengerForAssign] = useState<string>('');
    const [selectedDateForAssign, setSelectedDateForAssign] = useState<string>(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    });
    const [selectedFranjaForAssign, setSelectedFranjaForAssign] = useState<string>('todo_el_dia');
    const [isAssigning, setIsAssigning] = useState<boolean>(false);

    // Estado para módulo de liquidación
    const [settlementMessengerId, setSettlementMessengerId] = useState<string>('');
    const [settlementDate, setSettlementDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
    const [settlementSummary, setSettlementSummary] = useState<any>(null);
    const [isCalculatingSettlement, setIsCalculatingSettlement] = useState<boolean>(false);
    const [isSavingSettlement, setIsSavingSettlement] = useState<boolean>(false);

    // Formulario de edición de tarifas
    const [formRates, setFormRates] = useState({
        tarifaUrbanaBogota: 10000,
        tarifaSabanaAledanos: 15000,
        tarifaReintentoNovedad: 5000,
    });
    const [isSavingRates, setIsSavingRates] = useState<boolean>(false);

    // Carga inicial
    const reloadData = async () => {
        setIsLoading(true);
        try {
            const [msgList, currentRates, pastSettlements] = await Promise.all([
                getMessengers(),
                getMessengerRates(),
                getMessengerSettlements(),
            ]);
            setMessengers(msgList);
            setRates(currentRates);
            setFormRates({
                tarifaUrbanaBogota: currentRates.tarifaUrbanaBogota,
                tarifaSabanaAledanos: currentRates.tarifaSabanaAledanos,
                tarifaReintentoNovedad: currentRates.tarifaReintentoNovedad,
            });
            setSettlements(pastSettlements);
            if (msgList.length > 0 && !settlementMessengerId) {
                setSettlementMessengerId(msgList[0].id);
            }
        } catch (err) {
            console.error('Error cargando datos de mensajería:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        reloadData();
    }, []);

    // Suscripción a pedidos
    useEffect(() => {
        const unsubscribe = subscribeToOrders((allOrders) => {
            setOrders(allOrders);
        });
        return () => unsubscribe();
    }, []);

    // Actualizar resumen de liquidación cuando cambie mensajero o fecha
    useEffect(() => {
        if (settlementMessengerId) {
            loadSettlementPreview(settlementMessengerId, settlementDate);
        }
    }, [settlementMessengerId, settlementDate, orders]);

    const loadSettlementPreview = async (msgId: string, date: string) => {
        setIsCalculatingSettlement(true);
        try {
            const summary = await getMessengerSettlementSummary(msgId, date);
            setSettlementSummary(summary);
        } catch (err) {
            console.error('Error calculando liquidación:', err);
        } finally {
            setIsCalculatingSettlement(false);
        }
    };

    // Pedidos candidatos para flota propia (Bogotá y Sabana que estén en preparación o confirmados)
    const candidatesForDispatch = orders.filter(ord => {
        if (ord.status === 'cancelado' || ord.status === 'borrador') return false;

        const isLocalFleet = ord.tipoEnvio === 'flota_propia' || (!ord.tipoEnvio && !ord.guiaTransportadora);
        const matchesQuery = !searchOrderQuery.trim() ||
            ord.cliente?.nombre?.toLowerCase().includes(searchOrderQuery.toLowerCase()) ||
            ord.cliente?.direccion?.toLowerCase().includes(searchOrderQuery.toLowerCase()) ||
            ord.cliente?.ciudad?.toLowerCase().includes(searchOrderQuery.toLowerCase()) ||
            ord.id.toLowerCase().includes(searchOrderQuery.toLowerCase());

        return isLocalFleet && matchesQuery;
    });

    const formatMoney = (val: number) => `$${(val || 0).toLocaleString('es-CO')}`;

    // Handlers
    const handleOpenAssignModal = (order: Order) => {
        setAssigningOrder(order);
        setSelectedMessengerForAssign(order.mensajeroId || (messengers[0]?.id || ''));
        setSelectedDateForAssign(order.fechaProgramadaEntrega || filterDate);
        setSelectedFranjaForAssign(order.franjaHorariaEntrega || 'todo_el_dia');
    };

    const handleConfirmAssign = async () => {
        if (!assigningOrder || !selectedMessengerForAssign) return;

        setIsAssigning(true);
        try {
            await assignOrderToMessenger(
                assigningOrder.id,
                selectedMessengerForAssign,
                selectedDateForAssign,
                selectedFranjaForAssign,
                {
                    nombre: userProfile?.nombre || 'Gestor Logístico',
                    email: user?.email || 'logistica@biocambio360.com',
                    role: 'gestor',
                }
            );
            setAssigningOrder(null);
            alert('¡Pedido asignado exitosamente a la ruta de flota propia!');
        } catch (err: any) {
            alert(`Error al asignar pedido: ${err?.message || err}`);
        } finally {
            setIsAssigning(false);
        }
    };

    const handleSaveMessengerSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingMessenger || !editingMessenger.nombre || !editingMessenger.cedula) {
            alert('Nombre y cédula son obligatorios');
            return;
        }

        setIsSavingMessenger(true);
        try {
            const messengerToSave: Messenger = {
                id: editingMessenger.id || `msg-${Date.now()}`,
                nombre: editingMessenger.nombre,
                cedula: editingMessenger.cedula,
                telefono: editingMessenger.telefono || '',
                tipoVehiculo: editingMessenger.tipoVehiculo || 'moto',
                placaVehiculo: (editingMessenger.placaVehiculo || '').toUpperCase(),
                zonaPrincipal: editingMessenger.zonaPrincipal || 'Bogotá y Sabana',
                activo: editingMessenger.activo ?? true,
                fechaIngreso: editingMessenger.fechaIngreso || new Date().toISOString().split('T')[0],
                notas: editingMessenger.notas || '',
            };

            await saveMessenger(messengerToSave);
            setEditingMessenger(null);
            await reloadData();
            alert('Mensajero guardado exitosamente.');
        } catch (err: any) {
            alert(`Error guardando mensajero: ${err?.message || err}`);
        } finally {
            setIsSavingMessenger(false);
        }
    };

    const handleToggleStatus = async (m: Messenger) => {
        try {
            await toggleMessengerStatus(m.id, !m.activo);
            setMessengers(prev => prev.map(item => item.id === m.id ? { ...item, activo: !m.activo } : item));
        } catch (err: any) {
            alert(`Error al cambiar estado: ${err?.message || err}`);
        }
    };

    const handleSaveRatesSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingRates(true);
        try {
            await saveMessengerRates(formRates, user?.email || 'admin');
            alert('Tarifas de mensajería actualizadas exitosamente.');
            await reloadData();
        } catch (err: any) {
            alert(`Error guardando tarifas: ${err?.message || err}`);
        } finally {
            setIsSavingRates(false);
        }
    };

    const handleExecuteSettlement = async () => {
        if (!settlementSummary || settlementSummary.pedidos.length === 0) {
            alert('No hay pedidos en la jornada para liquidar.');
            return;
        }

        if (!confirm(`¿Confirmas liquidar la jornada del ${settlementDate} para ${settlementSummary.messengerNombre}?\n\nFletes devengados: ${formatMoney(settlementSummary.totalFletesDevengados)}\nEfectivo recaudado: ${formatMoney(settlementSummary.totalRecaudadoEfectivo)}\nBalance neto a entregar: ${formatMoney(settlementSummary.balanceNetoEntregar)}`)) {
            return;
        }

        setIsSavingSettlement(true);
        try {
            const settlementId = await saveMessengerSettlement({
                messengerId: settlementSummary.messengerId,
                messengerNombre: settlementSummary.messengerNombre,
                fecha: settlementDate,
                pedidosTotales: settlementSummary.pedidosTotales,
                pedidosEntregados: settlementSummary.pedidosEntregados,
                pedidosNovedad: settlementSummary.pedidosNovedad,
                totalRecaudadoEfectivo: settlementSummary.totalRecaudadoEfectivo,
                totalFletesDevengados: settlementSummary.totalFletesDevengados,
                balanceNetoEntregar: settlementSummary.balanceNetoEntregar,
                pedidosIds: settlementSummary.pedidos.map((p: Order) => p.id),
                estado: 'liquidado',
                liquidadoPor: userProfile?.nombre || user?.email || 'Coordinador Logístico',
                liquidadoAt: new Date().toISOString(),
                observaciones: `Cierre de jornada ejecutado desde panel administrativo.`,
            });

            alert(`Liquidación guardada exitosamente (#${settlementId.slice(-8)}). Los pedidos han sido marcados como liquidados.`);
            await reloadData();
            if (settlementMessengerId) {
                await loadSettlementPreview(settlementMessengerId, settlementDate);
            }
        } catch (err: any) {
            alert(`Error guardando liquidación: ${err?.message || err}`);
        } finally {
            setIsSavingSettlement(false);
        }
    };

    return (
        <div className="space-y-6 pb-20">
            {/* ENCABEZADO PRINCIPAL */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center font-black">
                            <Truck size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                <span>Mensajeros & Flota Propia</span>
                                <span className="text-[11px] font-black uppercase bg-orange-100 text-orange-800 border border-orange-200 px-2 py-0.5 rounded-full">
                                    Bogotá & Sabana
                                </span>
                            </h1>
                            <p className="text-xs text-slate-500 font-medium">
                                Asignación de rutas, seguimiento en vivo, control de recaudo (COD) y liquidación de fletes.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        href="/mensajero"
                        target="_blank"
                        className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all"
                    >
                        <span>📱 Abrir App Mensajero</span>
                        <ExternalLink size={14} />
                    </Link>

                    <button
                        onClick={() => setEditingMessenger({ activo: true, tipoVehiculo: 'moto' })}
                        className="px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                        <Plus size={16} />
                        <span>Nuevo Mensajero</span>
                    </button>
                </div>
            </div>

            {/* PESTAÑAS DE NAVEGACIÓN */}
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 max-w-2xl">
                <button
                    onClick={() => setActiveTab('asignacion')}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        activeTab === 'asignacion'
                            ? 'bg-white text-orange-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <Truck size={15} />
                    <span>Despachos & Rutas</span>
                </button>

                <button
                    onClick={() => setActiveTab('directorio')}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        activeTab === 'directorio'
                            ? 'bg-white text-orange-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <Users size={15} />
                    <span>Directorio ({messengers.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab('liquidacion')}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        activeTab === 'liquidacion'
                            ? 'bg-white text-orange-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <DollarSign size={15} />
                    <span>Liquidación de Fletes</span>
                </button>

                <button
                    onClick={() => setActiveTab('tarifas')}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        activeTab === 'tarifas'
                            ? 'bg-white text-orange-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <Settings size={15} />
                    <span>Tarifario</span>
                </button>
            </div>

            {/* TAB 1: ASIGNACIÓN DE DESPACHOS */}
            {activeTab === 'asignacion' && (
                <div className="space-y-4">
                    {/* BARRA DE BÚSQUEDA Y FILTROS */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <input
                                type="text"
                                value={searchOrderQuery}
                                onChange={(e) => setSearchOrderQuery(e.target.value)}
                                placeholder="Buscar por cliente, dirección o ID..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <span className="text-xs font-bold text-slate-500">Filtrar Fecha:</span>
                            <input
                                type="date"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>
                    </div>

                    {/* TABLA DE PEDIDOS CANDIDATOS */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                                Pedidos Locales Bogotá & Sabana ({candidatesForDispatch.length})
                            </h3>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-200">
                                        <th className="p-3">Pedido</th>
                                        <th className="p-3">Cliente & Destino</th>
                                        <th className="p-3">Cobro Contraentrega</th>
                                        <th className="p-3">Estado</th>
                                        <th className="p-3">Mensajero Asignado</th>
                                        <th className="p-3 text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {candidatesForDispatch.map((ord) => {
                                        const isCod = ord.metodoPago === 'contraentrega';
                                        const hasMessenger = !!ord.mensajeroId;
                                        return (
                                            <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="p-3 font-mono font-bold text-slate-900">
                                                    #{ord.id.slice(-6).toUpperCase()}
                                                    <span className="block text-[10px] text-slate-400 font-normal">
                                                        {ord.productos?.length || 1} producto(s)
                                                    </span>
                                                </td>

                                                <td className="p-3">
                                                    <strong className="text-slate-900 block">{ord.cliente?.nombre}</strong>
                                                    <span className="text-slate-600 block">{ord.cliente?.direccion}</span>
                                                    <span className="text-[10px] text-slate-400">
                                                        {ord.cliente?.ciudad}{ord.cliente?.barrio ? ` (${ord.cliente.barrio})` : ''} · {ord.cliente?.celular}
                                                    </span>
                                                </td>

                                                <td className="p-3">
                                                    {isCod ? (
                                                        <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                            {formatMoney(ord.total)}
                                                        </span>
                                                    ) : (
                                                        <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                                            Pagado en línea ($0)
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="p-3">
                                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                        ord.status === 'entregado'
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : ord.status === 'no_entregado'
                                                            ? 'bg-rose-100 text-rose-800'
                                                            : 'bg-amber-100 text-amber-800'
                                                    }`}>
                                                        {ord.status}
                                                    </span>
                                                </td>

                                                <td className="p-3">
                                                    {hasMessenger ? (
                                                        <div>
                                                            <strong className="text-orange-900 block flex items-center gap-1">
                                                                <Truck size={12} className="text-orange-600" />
                                                                {ord.mensajeroNombre}
                                                            </strong>
                                                            <span className="text-[10px] text-slate-500 block">
                                                                Fecha: {ord.fechaProgramadaEntrega || 'Hoy'} ({ord.franjaHorariaEntrega || 'Todo el día'})
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 italic text-[11px]">
                                                            Sin asignar
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="p-3 text-right">
                                                    <button
                                                        onClick={() => handleOpenAssignModal(ord)}
                                                        className="px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-900 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                                                    >
                                                        {hasMessenger ? 'Reasignar' : 'Asignar Ruta'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: DIRECTORIO DE MENSAJEROS */}
            {activeTab === 'directorio' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {messengers.map(m => (
                        <div
                            key={m.id}
                            className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4"
                        >
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-mono font-bold text-slate-400">
                                        ID: {m.id}
                                    </span>
                                    <button
                                        onClick={() => handleToggleStatus(m)}
                                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border cursor-pointer ${
                                            m.activo
                                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                                : 'bg-slate-100 text-slate-600 border-slate-300'
                                        }`}
                                    >
                                        {m.activo ? 'Activo' : 'Inactivo'}
                                    </button>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center font-black shrink-0">
                                        <Truck size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 text-base leading-tight">
                                            {m.nombre}
                                        </h3>
                                        <p className="text-xs text-slate-500 font-medium">
                                            CC: {m.cedula} · Tel: {m.telefono}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-3 bg-slate-50 rounded-2xl space-y-1 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400 font-bold uppercase text-[10px]">Vehículo:</span>
                                        <span className="font-black text-slate-800 uppercase">{m.tipoVehiculo} ({m.placaVehiculo})</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400 font-bold uppercase text-[10px]">Zona habitual:</span>
                                        <span className="font-bold text-slate-700 text-right">{m.zonaPrincipal}</span>
                                    </div>
                                    {m.notas && (
                                        <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                                            {m.notas}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                                <button
                                    onClick={() => setEditingMessenger(m)}
                                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                                >
                                    <Edit2 size={13} />
                                    <span>Editar</span>
                                </button>

                                <a
                                    href={`https://wa.me/57${(m.telefono || '').replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors cursor-pointer"
                                    title="Contactar por WhatsApp"
                                >
                                    <Phone size={15} />
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* TAB 3: LIQUIDACIÓN DE FLETES */}
            {activeTab === 'liquidacion' && (
                <div className="space-y-6">
                    {/* PANEL DE CONTROL DE LA LIQUIDACIÓN */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                        <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                            <DollarSign size={20} className="text-orange-600" />
                            <span>Arqueo y Liquidación Diaria de Flota Propia</span>
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                                    Selecciona Mensajero:
                                </label>
                                <select
                                    value={settlementMessengerId}
                                    onChange={(e) => setSettlementMessengerId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black focus:outline-none focus:ring-2 focus:ring-orange-500"
                                >
                                    {messengers.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.nombre} ({m.placaVehiculo})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                                    Fecha de la Jornada:
                                </label>
                                <input
                                    type="date"
                                    value={settlementDate}
                                    onChange={(e) => setSettlementDate(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                        </div>

                        {/* RESUMEN FINANCIERO DE LA JORNADA */}
                        {settlementSummary && (
                            <div className="pt-4 border-t border-slate-100 space-y-4">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Entregas Exitosas</span>
                                        <span className="text-xl font-black text-emerald-700">
                                            {settlementSummary.pedidosEntregados} / {settlementSummary.pedidosTotales}
                                        </span>
                                    </div>

                                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Novedades</span>
                                        <span className="text-xl font-black text-rose-700">
                                            {settlementSummary.pedidosNovedad}
                                        </span>
                                    </div>

                                    <div className="bg-orange-50/50 p-3.5 rounded-2xl border border-orange-200 text-center">
                                        <span className="text-[10px] font-black text-orange-800 uppercase block">Fletes a Pagar Mensajero</span>
                                        <span className="text-xl font-black text-orange-700">
                                            {formatMoney(settlementSummary.totalFletesDevengados)}
                                        </span>
                                    </div>

                                    <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-200 text-center">
                                        <span className="text-[10px] font-black text-emerald-800 uppercase block">Total Efectivo Recaudado (COD)</span>
                                        <span className="text-xl font-black text-emerald-700">
                                            {formatMoney(settlementSummary.totalRecaudadoEfectivo)}
                                        </span>
                                    </div>
                                </div>

                                {/* BALANCE FINAL NETO */}
                                <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div>
                                        <span className="text-xs font-bold text-slate-400 uppercase block">
                                            Balance Neto a Consignar en Tesorería:
                                        </span>
                                        <span className="text-2xl font-black text-emerald-400">
                                            {formatMoney(settlementSummary.balanceNetoEntregar)}
                                        </span>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            Fórmula: Recaudo Efectivo ({formatMoney(settlementSummary.totalRecaudadoEfectivo)}) - Fletes Devengados ({formatMoney(settlementSummary.totalFletesDevengados)})
                                        </p>
                                    </div>

                                    <button
                                        onClick={handleExecuteSettlement}
                                        disabled={isSavingSettlement || settlementSummary.pedidosTotales === 0}
                                        className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-2xl font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                                    >
                                        <ShieldCheck size={18} />
                                        <span>{isSavingSettlement ? 'Guardando...' : 'Cerrar y Liquidar Jornada'}</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* HISTORIAL DE LIQUIDACIONES GUARDADAS */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <FileText size={16} className="text-slate-500" />
                            <span>Historial de Liquidaciones Archivadas ({settlements.length})</span>
                        </h3>

                        {settlements.length === 0 ? (
                            <p className="text-xs text-slate-400 italic text-center py-6">
                                Aún no se han registrado liquidaciones de jornada.
                            </p>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {settlements.map(st => (
                                    <div key={st.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                        <div>
                                            <strong className="text-slate-900 block">{st.messengerNombre}</strong>
                                            <span className="text-slate-500">
                                                Fecha: {st.fecha} · {st.pedidosEntregados} entregas · Liquidado por: {st.liquidadoPor}
                                            </span>
                                        </div>
                                        <div className="text-right flex items-center gap-4">
                                            <div>
                                                <span className="text-[10px] text-slate-400 block uppercase">Efectivo a tesorería:</span>
                                                <span className="font-black text-emerald-700 text-sm">
                                                    {formatMoney(st.balanceNetoEntregar)}
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                                {st.estado}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 4: TARIFARIO DE MENSAJERÍA */}
            {activeTab === 'tarifas' && (
                <div className="max-w-xl bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
                    <div>
                        <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                            <Settings size={20} className="text-orange-600" />
                            <span>Configuración de Tarifas de Flota Propia</span>
                        </h2>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                            Estos valores se aplican automáticamente para liquidar a los domiciliarios de Biocambio360 en cada entrega exitosa o reintento.
                        </p>
                    </div>

                    <form onSubmit={handleSaveRatesSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Tarifa Urbana Bogotá / Soacha (Entrega Exitosa):
                            </label>
                            <input
                                type="number"
                                value={formRates.tarifaUrbanaBogota}
                                onChange={(e) => setFormRates({ ...formRates, tarifaUrbanaBogota: Number(e.target.value) || 0 })}
                                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-black focus:outline-none focus:border-orange-500"
                            />
                            <span className="text-[11px] text-slate-400">Valor de referencia oficial: $10.000 COP</span>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Tarifa Sabana & Municipios Aledaños (Entrega Exitosa):
                            </label>
                            <input
                                type="number"
                                value={formRates.tarifaSabanaAledanos}
                                onChange={(e) => setFormRates({ ...formRates, tarifaSabanaAledanos: Number(e.target.value) || 0 })}
                                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-black focus:outline-none focus:border-orange-500"
                            />
                            <span className="text-[11px] text-slate-400">Aplica para Chía, Cota, Cajicá, Mosquera, Funza, Madrid, Zipaquirá, Fusagasugá ($15.000 COP)</span>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Tarifa por Novedad / Reintento no imputable:
                            </label>
                            <input
                                type="number"
                                value={formRates.tarifaReintentoNovedad}
                                onChange={(e) => setFormRates({ ...formRates, tarifaReintentoNovedad: Number(e.target.value) || 0 })}
                                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 text-sm font-black focus:outline-none focus:border-orange-500"
                            />
                            <span className="text-[11px] text-slate-400">Reconocimiento al mensajero por desplazamiento cuando el cliente está ausente ($5.000 COP)</span>
                        </div>

                        <div className="pt-3">
                            <button
                                type="submit"
                                disabled={isSavingRates}
                                className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-xs shadow-md transition-all cursor-pointer"
                            >
                                {isSavingRates ? 'Guardando...' : '✓ Guardar Nuevas Tarifas'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODAL DE ASIGNACIÓN DE PEDIDO */}
            {assigningOrder && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-3xl p-5 space-y-4 shadow-2xl border border-slate-200">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="flex items-center gap-2">
                                <Truck size={18} className="text-orange-600" />
                                <h3 className="text-base font-black text-slate-900">
                                    Asignar Pedido #{assigningOrder.id.slice(-6).toUpperCase()}
                                </h3>
                            </div>
                            <button onClick={() => setAssigningOrder(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1">
                            <div><strong>Cliente:</strong> {assigningOrder.cliente?.nombre}</div>
                            <div><strong>Dirección:</strong> {assigningOrder.cliente?.direccion}, {assigningOrder.cliente?.ciudad}</div>
                            <div><strong>Total:</strong> {formatMoney(assigningOrder.total)} ({assigningOrder.metodoPago})</div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Seleccionar Mensajero Flota Propia:
                                </label>
                                <select
                                    value={selectedMessengerForAssign}
                                    onChange={(e) => setSelectedMessengerForAssign(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black focus:outline-none focus:border-orange-500"
                                >
                                    {messengers.filter(m => m.activo).map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.nombre} - {m.tipoVehiculo} ({m.placaVehiculo})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Fecha Programada de Entrega:
                                </label>
                                <input
                                    type="date"
                                    value={selectedDateForAssign}
                                    onChange={(e) => setSelectedDateForAssign(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-orange-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Franja Horaria de Entrega:
                                </label>
                                <select
                                    value={selectedFranjaForAssign}
                                    onChange={(e) => setSelectedFranjaForAssign(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-orange-500"
                                >
                                    <option value="todo_el_dia">Todo el día (8:00 AM - 6:00 PM)</option>
                                    <option value="manana">Mañana (8:00 AM - 12:00 PM)</option>
                                    <option value="tarde">Tarde (1:00 PM - 6:00 PM)</option>
                                </select>
                            </div>
                        </div>

                        <div className="pt-2 flex items-center gap-2">
                            <button
                                onClick={() => setAssigningOrder(null)}
                                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmAssign}
                                disabled={isAssigning}
                                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-xs shadow-sm cursor-pointer"
                            >
                                {isAssigning ? 'Asignando...' : '✓ Confirmar Asignación'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE EDICIÓN O ALTA DE MENSAJERO */}
            {editingMessenger && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-3xl p-5 space-y-4 shadow-2xl border border-slate-200">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h3 className="text-base font-black text-slate-900">
                                {editingMessenger.id ? 'Editar Mensajero' : 'Nuevo Mensajero'}
                            </h3>
                            <button onClick={() => setEditingMessenger(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveMessengerSubmit} className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-0.5">Nombre Completo *</label>
                                <input
                                    type="text"
                                    required
                                    value={editingMessenger.nombre || ''}
                                    onChange={(e) => setEditingMessenger({ ...editingMessenger, nombre: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-orange-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-0.5">Cédula *</label>
                                    <input
                                        type="text"
                                        required
                                        value={editingMessenger.cedula || ''}
                                        onChange={(e) => setEditingMessenger({ ...editingMessenger, cedula: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-orange-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-0.5">Teléfono / WhatsApp *</label>
                                    <input
                                        type="text"
                                        required
                                        value={editingMessenger.telefono || ''}
                                        onChange={(e) => setEditingMessenger({ ...editingMessenger, telefono: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-orange-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-0.5">Tipo Vehículo</label>
                                    <select
                                        value={editingMessenger.tipoVehiculo || 'moto'}
                                        onChange={(e) => setEditingMessenger({ ...editingMessenger, tipoVehiculo: e.target.value as any })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-orange-500"
                                    >
                                        <option value="moto">Moto</option>
                                        <option value="carro">Carro</option>
                                        <option value="furgon">Furgón / Camioneta</option>
                                        <option value="bicicleta">Bicicleta</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-0.5">Placa</label>
                                    <input
                                        type="text"
                                        value={editingMessenger.placaVehiculo || ''}
                                        onChange={(e) => setEditingMessenger({ ...editingMessenger, placaVehiculo: e.target.value.toUpperCase() })}
                                        placeholder="XYZ-123"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold uppercase focus:outline-none focus:border-orange-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-0.5">Zona Principal Asignada</label>
                                <input
                                    type="text"
                                    value={editingMessenger.zonaPrincipal || ''}
                                    onChange={(e) => setEditingMessenger({ ...editingMessenger, zonaPrincipal: e.target.value })}
                                    placeholder="Ej: Bogotá Sur, Soacha & Sibaté"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-orange-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-0.5">Notas Operativas</label>
                                <input
                                    type="text"
                                    value={editingMessenger.notas || ''}
                                    onChange={(e) => setEditingMessenger({ ...editingMessenger, notas: e.target.value })}
                                    placeholder="Observaciones de capacidad o rutas..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-orange-500"
                                />
                            </div>

                            <div className="pt-2 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingMessenger(null)}
                                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingMessenger}
                                    className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-xs shadow-sm cursor-pointer"
                                >
                                    {isSavingMessenger ? 'Guardando...' : '✓ Guardar Mensajero'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
