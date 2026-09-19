'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    AlertTriangle,
    RefreshCw,
    RotateCcw,
    ShieldAlert,
    Truck,
    Calendar,
    DollarSign,
    MapPin,
    Phone,
    CheckCircle2,
    MessageCircle
} from 'lucide-react';
import { Order, OrderDeliveryException } from '@/types/order';
import { processDeliveryException, ProcessDeliveryExceptionParams } from '@/lib/orders-service';
import { useAuth } from '@/lib/auth-context';

interface DeliveryExceptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: (Order & { id: string }) | null;
    onSuccess?: () => void;
}

const MOTIVOS_NOVEDAD: { id: OrderDeliveryException['motivo']; label: string; desc: string }[] = [
    { id: 'cliente_ausente', label: 'Cliente Ausente / No Atendió', desc: 'El repartidor llegó a la dirección pero nadie abrió o contestó la llamada.' },
    { id: 'sin_dinero', label: 'Sin Dinero en Efectivo', desc: 'El cliente no contaba con el efectivo o medio de pago contraentrega al momento.' },
    { id: 'direccion_erronea', label: 'Dirección Errónea o Incompleta', desc: 'Nomenclatura incorrecta, falta torre/apto o barrio no coincide.' },
    { id: 'solicito_reprogramacion', label: 'Cliente Solicitó Otra Fecha', desc: 'Pidió que se le entregue el día de quincena, fin de semana o en otro horario.' },
    { id: 'rechazado', label: 'Rechazó el Pedido', desc: 'El cliente manifestó que ya no desea el pedido o que demoró mucho.' },
    { id: 'zona_dificil', label: 'Zona de Difícil Acceso / Cobertura', desc: 'Transportadora no pudo ingresar por problemas viales, orden público o lejanía.' },
    { id: 'otro', label: 'Otro Motivo Logístico', desc: 'Novedad particular reportada por la transportadora.' }
];

const TRANSPORTADORAS_OPTIONS = [
    'Flota Propia Biocambio360 (Entrega Directa)',
    '99 Envíos (Same Day / Next Day)',
    'Interrapidísimo',
    'Coordinadora',
    'Servientrega',
    'Envía',
    'TCC'
];

export default function DeliveryExceptionModal({
    isOpen,
    onClose,
    order,
    onSuccess
}: DeliveryExceptionModalProps) {
    const { user, userProfile, role } = useAuth();

    const [resolucion, setResolucion] = useState<'reintento_programado' | 'devuelto_bodega' | 'perdido_transportadora'>('reintento_programado');
    const [motivo, setMotivo] = useState<OrderDeliveryException['motivo']>('cliente_ausente');
    const [motivoDetalle, setMotivoDetalle] = useState('');
    
    // Reintento options
    const [fechaReintento, setFechaReintento] = useState('');
    const [franjaHoraria, setFranjaHoraria] = useState<'manana' | 'tarde' | 'todo_el_dia'>('todo_el_dia');
    const [tarifaEspecial, setTarifaEspecial] = useState<number>(0);
    const [transportadora, setTransportadora] = useState(TRANSPORTADORAS_OPTIONS[0]);
    
    // Dirección updates
    const [direccion, setDireccion] = useState('');
    const [barrio, setBarrio] = useState('');
    const [celular, setCelular] = useState('');
    
    // Devolución o siniestro
    const [notasSeguimiento, setNotasSeguimiento] = useState('');
    const [radicadoSiniestro, setRadicadoSiniestro] = useState('');
    const [montoReclamado, setMontoReclamado] = useState<number>(0);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Precargar datos del pedido al abrir
    useEffect(() => {
        if (order) {
            setDireccion(order.cliente?.direccion || '');
            setBarrio(order.cliente?.barrio || '');
            setCelular(order.cliente?.celular || '');
            setMontoReclamado(order.total || 0);
            
            // Sugerir fecha de reintento mañana
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setFechaReintento(tomorrow.toISOString().split('T')[0]);

            if (order.novedadEntrega) {
                setMotivo(order.novedadEntrega.motivo || 'cliente_ausente');
                setMotivoDetalle(order.novedadEntrega.motivoDetalle || '');
                if (order.novedadEntrega.tarifaEspecialReintento) {
                    setTarifaEspecial(order.novedadEntrega.tarifaEspecialReintento);
                }
            } else {
                setMotivo('cliente_ausente');
                setMotivoDetalle('');
                setTarifaEspecial(0);
            }
            setResolucion('reintento_programado');
            setErrorMsg(null);
        }
    }, [order]);

    if (!isOpen || !order) return null;

    const currentTotal = order.total || 0;
    const newTotalCalculated = currentTotal + (resolucion === 'reintento_programado' ? Math.max(0, tarifaEspecial) : 0);

    const handleOpenWhatsApp = () => {
        const cleanPhone = (celular || order.cliente?.celular || '').replace(/\D/g, '');
        if (!cleanPhone) return;

        const asesor = userProfile?.nombre || user?.displayName || 'Asesor Biocambio360';
        const orderShort = order.id.slice(-6).toUpperCase();
        const motivoLabel = MOTIVOS_NOVEDAD.find(m => m.id === motivo)?.label || 'una novedad';

        let msg = `Hola *${order.cliente?.nombre}*, te saluda *${asesor}* del equipo de atención al cliente de *Biocambio360* 🌿.\n\n`;
        msg += `Nos reportaron que la transportadora tuvo una novedad en la entrega contraentrega de tu pedido *#${orderShort}* (${motivoLabel.toLowerCase()}).\n\n`;
        msg += `Queremos coordinar contigo para programar un reintento y que no te quedes sin tus productos. ¿Te parece bien si te lo entregamos mañana o qué fecha y horario te queda mejor? Quedo atento/a para ayudarte 😊.`;

        window.open(`https://wa.me/57${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setIsSubmitting(true);

        try {
            const params: ProcessDeliveryExceptionParams = {
                orderId: order.id,
                resolucion,
                motivo,
                motivoDetalle: motivoDetalle.trim() || undefined,
                fechaReintentoProgramada: resolucion === 'reintento_programado' ? fechaReintento : undefined,
                franjaHoraria: resolucion === 'reintento_programado' ? franjaHoraria : undefined,
                tarifaEspecialReintento: resolucion === 'reintento_programado' ? tarifaEspecial : 0,
                transportadoraReintento: resolucion === 'reintento_programado' ? transportadora : undefined,
                nuevaDireccion: direccion.trim() !== order.cliente?.direccion ? direccion.trim() : undefined,
                nuevoBarrio: barrio.trim() !== order.cliente?.barrio ? barrio.trim() : undefined,
                nuevoTelefono: celular.trim() !== order.cliente?.celular ? celular.trim() : undefined,
                notasSeguimiento: notasSeguimiento.trim() || undefined,
                radicadoSiniestro: resolucion === 'perdido_transportadora' ? radicadoSiniestro.trim() : undefined,
                montoReclamado: resolucion === 'perdido_transportadora' ? montoReclamado : undefined,
                userContext: {
                    email: user?.email || undefined,
                    nombre: userProfile?.nombre || user?.displayName || 'Asesor / Gestor',
                    role: role || 'asesor'
                }
            };

            await processDeliveryException(params);

            if (onSuccess) onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error al procesar novedad de entrega:', err);
            setErrorMsg(err?.message || 'Ocurrió un error al procesar el caso.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 10 }}
                    className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-amber-700 p-5 text-white flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-xs">
                                <AlertTriangle size={24} className="text-white" />
                            </div>
                            <div>
                                <span className="text-[10px] font-black tracking-widest uppercase text-rose-200">
                                    Módulo de Logística y Rescate Contraentrega
                                </span>
                                <h2 className="text-lg font-black" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
                                    TRATAMIENTO DE NOVEDAD / NO ENTREGADO
                                </h2>
                                <p className="text-xs text-rose-100 font-medium">
                                    Pedido #{order.id.slice(-8).toUpperCase()} · {order.cliente?.nombre}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Resumen del Pedido y Acción Rápida WhatsApp */}
                    <div className="p-4 bg-rose-50/60 border-b border-rose-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-4 text-slate-700">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Cobro Contraentrega</span>
                                <span className="font-black text-rose-700 text-sm">
                                    ${order.total?.toLocaleString('es-CO')} COP
                                </span>
                            </div>
                            <div className="border-l border-rose-200 pl-3">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Ciudad & Destino</span>
                                <span className="font-bold text-slate-900">
                                    {order.cliente?.ciudad}, {order.cliente?.departamento}
                                </span>
                            </div>
                            <div className="border-l border-rose-200 pl-3">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Intentos Registrados</span>
                                <span className="font-black text-slate-900">
                                    {(order.novedadEntrega?.intentosPrevios || 0) + 1}° Intento
                                </span>
                            </div>
                        </div>

                        {/* Botón WhatsApp de Contacto Inmediato */}
                        <button
                            type="button"
                            onClick={handleOpenWhatsApp}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-all cursor-pointer text-xs"
                            title="Contactar al cliente por WhatsApp con mensaje de novedad"
                        >
                            <MessageCircle size={14} />
                            <span>Contactar por WhatsApp</span>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
                        {errorMsg && (
                            <div className="p-3.5 bg-rose-100 border border-rose-300 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2">
                                <AlertTriangle size={16} className="shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        {/* Selector de Ruta de Resolución */}
                        <div>
                            <label className="text-xs font-black uppercase text-slate-600 tracking-wider mb-2 block">
                                1. Selecciona la Resolución del Caso:
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setResolucion('reintento_programado')}
                                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                        resolucion === 'reintento_programado'
                                            ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200'
                                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <RefreshCw size={16} className={resolucion === 'reintento_programado' ? 'text-indigo-600' : 'text-slate-500'} />
                                        <span className="font-black text-xs text-slate-900">Reintentar Entrega</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500">
                                        Reprogramar fecha, ajustar tarifa especial de flete o cambiar flota.
                                    </p>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setResolucion('devuelto_bodega')}
                                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                        resolucion === 'devuelto_bodega'
                                            ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-200'
                                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <RotateCcw size={16} className={resolucion === 'devuelto_bodega' ? 'text-amber-600' : 'text-slate-500'} />
                                        <span className="font-black text-xs text-slate-900">Devolver a Bodega</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500">
                                        Cliente desistió. Cancelar pedido y <strong>restituir stock físico</strong>.
                                    </p>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setResolucion('perdido_transportadora')}
                                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                        resolucion === 'perdido_transportadora'
                                            ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-200'
                                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <ShieldAlert size={16} className={resolucion === 'perdido_transportadora' ? 'text-rose-600' : 'text-slate-500'} />
                                        <span className="font-black text-xs text-slate-900">Pérdida / Siniestro</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500">
                                        Extravío/hurto en ruta. <strong>Sin retorno de stock</strong>. Cobro seguro.
                                    </p>
                                </button>
                            </div>
                        </div>

                        {/* Motivo de la Novedad */}
                        <div>
                            <label className="text-xs font-black uppercase text-slate-600 tracking-wider mb-1.5 block">
                                2. Motivo del Fallo de Entrega:
                            </label>
                            <select
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value as any)}
                                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                            >
                                {MOTIVOS_NOVEDAD.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.label} — ({m.desc})
                                    </option>
                                ))}
                            </select>
                            <input
                                type="text"
                                value={motivoDetalle}
                                onChange={(e) => setMotivoDetalle(e.target.value)}
                                placeholder="Detalle adicional del motivo (ej: portería no autorizada, teléfono apagado)..."
                                className="mt-2 w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:border-indigo-500 focus:outline-none"
                            />
                        </div>

                        {/* ────── SECCIÓN A: REINTENTO DE ENTREGA ────── */}
                        {resolucion === 'reintento_programado' && (
                            <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100 space-y-4">
                                <span className="text-xs font-black uppercase text-indigo-900 flex items-center gap-1.5">
                                    <Calendar size={14} className="text-indigo-600" />
                                    Parámetros del Nuevo Intento de Entrega
                                </span>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                                            Fecha de Reintento Acordada
                                        </label>
                                        <input
                                            type="date"
                                            required
                                            value={fechaReintento}
                                            onChange={(e) => setFechaReintento(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                                            Franja Horaria Preferida
                                        </label>
                                        <select
                                            value={franjaHoraria}
                                            onChange={(e) => setFranjaHoraria(e.target.value as any)}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none"
                                        >
                                            <option value="todo_el_dia">Cualquier horario (8:00 AM - 6:00 PM)</option>
                                            <option value="manana">Jornada Mañana (8:00 AM - 12:30 PM)</option>
                                            <option value="tarde">Jornada Tarde (1:30 PM - 6:00 PM)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Tarifa Especial de Reintento */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                                            <DollarSign size={12} className="text-indigo-600" />
                                            Tarifa Especial de Reintento (Flete Adicional):
                                        </label>
                                        <span className="text-xs font-black text-indigo-700">
                                            +${tarifaEspecial.toLocaleString('es-CO')} COP
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {[
                                            { label: 'Cortesía ($0)', val: 0 },
                                            { label: 'Reintento Estándar (+$10.000)', val: 10000 },
                                            { label: 'Reexpedición Urbana (+$15.000)', val: 15000 },
                                            { label: 'Nacional Lejana (+$20.000)', val: 20000 }
                                        ].map((pill) => (
                                            <button
                                                key={pill.val}
                                                type="button"
                                                onClick={() => setTarifaEspecial(pill.val)}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                    tarifaEspecial === pill.val
                                                        ? 'bg-indigo-600 text-white shadow-xs'
                                                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                                                }`}
                                            >
                                                {pill.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500 font-bold">O ingresar valor manual:</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1000"
                                            value={tarifaEspecial}
                                            onChange={(e) => setTarifaEspecial(Number(e.target.value))}
                                            className="w-32 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>

                                    {/* Indicador de Nuevo Total a Cobrar */}
                                    <div className="mt-3 p-3 bg-white rounded-xl border border-indigo-100 flex items-center justify-between text-xs">
                                        <span className="text-slate-600 font-medium">
                                            Cobro anterior: <strong>${currentTotal.toLocaleString('es-CO')}</strong>
                                        </span>
                                        <span className="text-slate-900 font-black flex items-center gap-1">
                                            Nuevo Total Contraentrega a Cobrar: 
                                            <span className="text-emerald-700 text-sm">
                                                ${newTotalCalculated.toLocaleString('es-CO')} COP
                                            </span>
                                        </span>
                                    </div>
                                </div>

                                {/* Transportadora Asignada para el Reintento */}
                                <div>
                                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                                        Transportadora o Logística para el Reintento:
                                    </label>
                                    <select
                                        value={transportadora}
                                        onChange={(e) => setTransportadora(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none"
                                    >
                                        {TRANSPORTADORAS_OPTIONS.map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-slate-500 mt-1">
                                        💡 Si el fallo fue en Bogotá o Sabana, asignar a <strong>Flota Propia Biocambio360</strong> asegura coordinación directa por WhatsApp con el conductor.
                                    </p>
                                </div>

                                {/* Actualización de Dirección si era errónea */}
                                <div className="pt-2 border-t border-indigo-100 space-y-2">
                                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                        <MapPin size={12} className="text-indigo-600" />
                                        Validación / Corrección de Dirección de Entrega:
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            value={direccion}
                                            onChange={(e) => setDireccion(e.target.value)}
                                            placeholder="Dirección completa (Calle, Carrera, Nomenclatura)"
                                            className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800"
                                        />
                                        <input
                                            type="text"
                                            value={barrio}
                                            onChange={(e) => setBarrio(e.target.value)}
                                            placeholder="Barrio / Edificio / Apto"
                                            className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800"
                                        />
                                    </div>
                                    <input
                                        type="tel"
                                        value={celular}
                                        onChange={(e) => setCelular(e.target.value)}
                                        placeholder="Teléfono móvil confirmado con el cliente"
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800"
                                    />
                                </div>
                            </div>
                        )}

                        {/* ────── SECCIÓN B: DEVOLUCIÓN A BODEGA ────── */}
                        {resolucion === 'devuelto_bodega' && (
                            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-3">
                                <div className="flex items-start gap-2.5">
                                    <CheckCircle2 size={18} className="text-amber-700 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-xs font-black text-amber-900">
                                            Restitución Automática de Stock Físico a Bodega
                                        </h4>
                                        <p className="text-xs text-amber-800 mt-1">
                                            Al confirmar la devolución, las unidades de los productos de este pedido se sumarán de regreso a las existencias disponibles de la bodega central en Soacha, manteniendo el kardex 100% exacto.
                                        </p>
                                    </div>
                                </div>
                                <textarea
                                    rows={2}
                                    value={notasSeguimiento}
                                    onChange={(e) => setNotasSeguimiento(e.target.value)}
                                    placeholder="Nota de devolución a bodega (ej: cliente desistió por demora de transportadora)..."
                                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs text-slate-800 focus:outline-none"
                                />
                            </div>
                        )}

                        {/* ────── SECCIÓN C: PÉRDIDA / SINIESTRO TRANSPORTADORA ────── */}
                        {resolucion === 'perdido_transportadora' && (
                            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 space-y-3">
                                <div className="flex items-start gap-2.5">
                                    <ShieldAlert size={18} className="text-rose-700 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-xs font-black text-rose-900">
                                            Pérdida Física / Siniestro sin Retorno de Stock
                                        </h4>
                                        <p className="text-xs text-rose-800 mt-1">
                                            La mercancía no ingresará al inventario vendible ya que fue hurtada, destruida o extraviada en tránsito. Se abrirá expediente contable para reclamar el seguro comercial con la transportadora.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                                            N° Radicado de Reclamación (Transportadora)
                                        </label>
                                        <input
                                            type="text"
                                            value={radicadoSiniestro}
                                            onChange={(e) => setRadicadoSiniestro(e.target.value)}
                                            placeholder="Ej: REC-99ENV-84920"
                                            className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs font-bold text-slate-900"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                                            Monto a Cobrar / Reclamar ($ COP)
                                        </label>
                                        <input
                                            type="number"
                                            value={montoReclamado}
                                            onChange={(e) => setMontoReclamado(Number(e.target.value))}
                                            className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs font-bold text-slate-900"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Botones de Acción */}
                        <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                            >
                                Cancelar
                            </button>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
                                    resolucion === 'reintento_programado'
                                        ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                                        : resolucion === 'devuelto_bodega'
                                            ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                                            : 'bg-rose-700 hover:bg-rose-800 shadow-rose-200'
                                }`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <RefreshCw size={14} className="animate-spin" />
                                        <span>Procesando resolución...</span>
                                    </>
                                ) : resolucion === 'reintento_programado' ? (
                                    <>
                                        <RefreshCw size={14} />
                                        <span>Programar Reintento de Entrega</span>
                                    </>
                                ) : resolucion === 'devuelto_bodega' ? (
                                    <>
                                        <RotateCcw size={14} />
                                        <span>Confirmar Devolución y Restituir Stock</span>
                                    </>
                                ) : (
                                    <>
                                        <ShieldAlert size={14} />
                                        <span>Registrar Siniestro de Transportadora</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
