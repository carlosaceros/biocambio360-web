// Componente de Tracking Satelital Interactivo con Mapa Oficial de Colombia (IGAC / Natural Earth)
'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Truck, CheckCircle2, Clock, MapPin, Building2, ShieldCheck, AlertCircle, Compass } from 'lucide-react';
import { COLOMBIA_DEPARTMENTS, getCoordinatesForLocation, ColombiaDepartment } from './colombia-map-data';

export interface TrackingData {
    guia: string;
    transportadora: string;
    origen: {
        ciudad: string;
        departamento: string;
        instalacion: string;
    };
    destino: {
        ciudad: string;
        departamento?: string;
        direccion?: string;
        destinatario?: string;
    };
    estado: 'en_preparacion' | 'en_transporte' | 'en_reparto' | 'entregado' | 'novedad';
    estadoTexto: string;
    fechaEnvio?: string;
    fechaEntregaEstimada?: string;
    fechaEntregaReal?: string;
    pesoKg?: number;
    historial?: {
        titulo: string;
        descripcion?: string;
        fecha: string;
        completado: boolean;
        activo?: boolean;
    }[];
}

export default function TrackingMap({ data }: { data: TrackingData }) {
    const [hoveredDept, setHoveredDept] = useState<string | null>(null);

    // Origen Fijo Oficial: Planta Biocambio360 en Soacha, Cundinamarca
    const originCoords = { x: 304, y: 356 };

    // Coordenadas calibradas del Destino según ciudad y departamento
    const destCoords = getCoordinatesForLocation(data.destino.ciudad, data.destino.departamento);
    const targetDeptName = destCoords.dept;

    // Progreso numérico de la entrega
    let progressFactor = 0.12;
    if (data.estado === 'en_transporte') progressFactor = 0.52;
    if (data.estado === 'en_reparto') progressFactor = 0.86;
    if (data.estado === 'entregado') progressFactor = 1.0;

    // Control point para la Curva Bézier Cuadrática
    const dx = destCoords.x - originCoords.x;
    const dy = destCoords.y - originCoords.y;
    const midX = (originCoords.x + destCoords.x) / 2;
    const midY = (originCoords.y + destCoords.y) / 2;
    const curveOffset = Math.min(Math.max(-35, -dx * 0.25), 35);
    const ctrlX = midX + (dy > 0 ? curveOffset : -curveOffset);
    const ctrlY = midY - 18;

    const pathD = `M ${originCoords.x} ${originCoords.y} Q ${ctrlX} ${ctrlY} ${destCoords.x} ${destCoords.y}`;

    // Posición interpolada del camión en la curva Bézier cuadrática: B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
    const t = progressFactor;
    const truckX = Math.round((1 - t) * (1 - t) * originCoords.x + 2 * (1 - t) * t * ctrlX + t * t * destCoords.x);
    const truckY = Math.round((1 - t) * (1 - t) * originCoords.y + 2 * (1 - t) * t * ctrlY + t * t * destCoords.y);

    return (
        <div className="w-full bg-[#0B1120] rounded-3xl p-4 sm:p-8 text-white border border-slate-800/80 shadow-2xl overflow-hidden relative">
            {/* Header del Tracker */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800 relative z-10">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-black rounded-full border border-emerald-500/30 flex items-center gap-1.5 uppercase tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            Tracking en Vivo
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                            Guía #{data.guia}
                        </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white mt-1.5 flex items-center gap-2">
                        <span className="text-emerald-400">{data.destino.ciudad.toUpperCase()}</span>
                        <span className="text-slate-500 text-sm font-normal">←</span>
                        <span className="text-slate-400 text-sm font-medium">Planta Soacha</span>
                    </h2>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <div className="bg-slate-900/80 px-4 py-2 rounded-2xl border border-slate-700/60 text-right">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Transportadora</span>
                        <span className="text-sm font-black text-blue-400 uppercase tracking-wide">
                            {data.transportadora || 'Coordinadora'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Layout Principal: Mapa SVG de Colombia + Panel Lateral de Hitos */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 items-center">
                {/* 🗺️ MAPA SVG EXACTO DE COLOMBIA CON PALETA BIOCAMBIO360 */}
                <div className="lg:col-span-7 relative flex items-center justify-center min-h-[440px] bg-slate-950/70 rounded-2xl border border-slate-800/80 p-2 sm:p-4 overflow-hidden">
                    {/* Grilla sutil de fondo tipo radar táctico */}
                    <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none rounded-2xl" />

                    {/* Resplandor ambiental de marca en el fondo */}
                    <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

                    <svg
                        viewBox="85 10 525 705"
                        className="w-full h-auto max-h-[520px] drop-shadow-[0_0_30px_rgba(45,110,181,0.25)] select-none"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        {/* 1. Recuadro Recorte de San Andrés y Providencia (Esquina Noroccidental) */}
                        <g>
                            <rect
                                x="92"
                                y="14"
                                width="78"
                                height="82"
                                rx="8"
                                fill="#090D16"
                                stroke="#1e293b"
                                strokeWidth="1"
                                className="shadow-sm"
                            />
                            <text
                                x="131"
                                y="26"
                                fill="#94a3b8"
                                fontSize="6.5"
                                fontWeight="800"
                                textAnchor="middle"
                                className="font-sans uppercase tracking-wider"
                            >
                                San Andrés y Prov.
                            </text>
                            {/* Silueta miniatura de San Andrés */}
                            <path
                                d="M 125 45 C 126 40, 132 40, 133 46 C 134 52, 128 58, 126 62 C 124 58, 123 50, 125 45 Z"
                                fill="#06B6D4"
                                stroke="#334155"
                                strokeWidth="0.8"
                            />
                        </g>

                        {/* 2. Todos los 33 Departamentos con Formas Geográficas Oficiales y Colores Biocambio360 */}
                        <g id="departamentos-colombia">
                            {COLOMBIA_DEPARTMENTS.map((dept: ColombiaDepartment) => {
                                if (dept.id === 'CO.SA') return null; // Ya renderizado en recuadro especial

                                const isTargetDept = targetDeptName && (
                                    dept.name.toLowerCase().includes(targetDeptName.toLowerCase()) ||
                                    targetDeptName.toLowerCase().includes(dept.name.toLowerCase())
                                );

                                const isOriginDept = dept.name === 'Cundinamarca' || dept.name === 'Bogota';

                                return (
                                    <path
                                        key={dept.id}
                                        d={dept.d}
                                        fill={isTargetDept ? '#E91E8C' : isOriginDept ? '#2D6EB5' : dept.brandColor}
                                        fillOpacity={isTargetDept ? 0.95 : hoveredDept === dept.name ? 0.8 : 0.55}
                                        stroke={isTargetDept ? '#FFFFFF' : '#0B1120'}
                                        strokeWidth={isTargetDept ? 2 : 0.9}
                                        strokeLinejoin="round"
                                        strokeLinecap="round"
                                        className="transition-all duration-300 cursor-pointer"
                                        onMouseEnter={() => setHoveredDept(dept.name)}
                                        onMouseLeave={() => setHoveredDept(null)}
                                    >
                                        <title>{dept.name}</title>
                                    </path>
                                );
                            })}
                        </g>

                        {/* 3. Nombres de Departamentos Principales */}
                        {COLOMBIA_DEPARTMENTS.filter(d => ['Antioquia', 'Cundinamarca', 'Valle del Cauca', 'Santander', 'Boyacá', 'Meta', 'Tolima', 'Atlántico', 'Bolívar'].includes(d.name)).map(dept => (
                            <text
                                key={`label-${dept.id}`}
                                x={dept.cx}
                                y={dept.cy}
                                fill="rgba(255, 255, 255, 0.75)"
                                fontSize="7"
                                fontWeight="800"
                                textAnchor="middle"
                                className="pointer-events-none font-sans drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] uppercase tracking-wider"
                            >
                                {dept.name === 'Valle del Cauca' ? 'Valle' : dept.name}
                            </text>
                        ))}

                        {/* 4. Resplandor / Halo en el Departamento de Destino si existe */}
                        {targetDeptName && (
                            <circle
                                cx={destCoords.x}
                                cy={destCoords.y}
                                r="32"
                                fill="#E91E8C"
                                opacity="0.18"
                                className="animate-pulse pointer-events-none"
                            />
                        )}

                        {/* 5. Ruta Trazada: Línea de Glow de Fondo */}
                        <path
                            d={pathD}
                            stroke="#38bdf8"
                            strokeWidth="6"
                            strokeLinecap="round"
                            opacity="0.25"
                        />

                        {/* 6. Línea Principal Animada (Autopista Troncal con Dash Flow) */}
                        <path
                            d={pathD}
                            stroke="#10b981"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeDasharray="6 6"
                            className="animate-[dash_2s_linear_infinite]"
                        />

                        {/* 7. Origen: Planta Biocambio360 (Soacha, Cundinamarca) */}
                        <g transform={`translate(${originCoords.x}, ${originCoords.y})`}>
                            {/* Anillo de pulso expansivo */}
                            <circle r="15" fill="#10b981" opacity="0.25" className="animate-ping" />
                            <circle r="8" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                            <circle r="3" fill="#ffffff" />
                            {/* Etiqueta */}
                            <text
                                x="-12"
                                y="-12"
                                fill="#34d399"
                                fontSize="9"
                                fontWeight="900"
                                textAnchor="end"
                                className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] font-sans tracking-wide"
                            >
                                🏭 PLANTA SOACHA
                            </text>
                        </g>

                        {/* 8. Destino: Ciudad de Entrega */}
                        <g transform={`translate(${destCoords.x}, ${destCoords.y})`}>
                            {/* Anillo de pulso expansivo destino */}
                            <circle r="18" fill="#E91E8C" opacity="0.3" className="animate-ping" />
                            <circle r="9" fill="#E91E8C" stroke="#ffffff" strokeWidth="2" />
                            <circle r="3.5" fill="#ffffff" />
                            {/* Etiqueta */}
                            <text
                                x="14"
                                y="3"
                                fill="#fda4af"
                                fontSize="10"
                                fontWeight="900"
                                textAnchor="start"
                                className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] font-sans tracking-wider uppercase"
                            >
                                📍 {data.destino.ciudad}
                            </text>
                        </g>

                        {/* 9. 🚚 Furgón Ecológico Biocambio360 SVG Animado sobre la Ruta */}
                        <g
                            transform={`translate(${truckX}, ${truckY})`}
                            className="transition-transform duration-700 ease-out"
                        >
                            {/* Halo brillante del vehículo */}
                            <circle r="16" fill="#10b981" opacity="0.4" className="animate-pulse" />
                            
                            {/* Carrocería del Furgón */}
                            <rect
                                x="-14"
                                y="-14"
                                width="28"
                                height="28"
                                rx="8"
                                fill="#059669"
                                stroke="#ffffff"
                                strokeWidth="2"
                                className="shadow-xl"
                            />
                            {/* Icono de camión centrado */}
                            <g transform="translate(-8, -8) scale(0.65)">
                                <path
                                    d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"
                                    fill="#ffffff"
                                />
                                <circle cx="5.5" cy="18.5" r="2.5" fill="#ffffff" />
                                <circle cx="18.5" cy="18.5" r="2.5" fill="#ffffff" />
                            </g>
                        </g>
                    </svg>

                    {/* Leyenda flotante táctica en la esquina inferior izquierda */}
                    <div className="absolute bottom-3 left-3 bg-slate-900/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1 shadow-lg">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shrink-0 shadow-xs" />
                            <span className="font-semibold">Origen: Planta Biocambio360 (Soacha)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#E91E8C] inline-block shrink-0 shadow-xs" />
                            <span className="font-semibold">Destino: {data.destino.ciudad} ({destCoords.dept})</span>
                        </div>
                        <div className="pt-1 text-[9px] text-slate-400 border-t border-slate-800 flex items-center gap-1">
                            <Compass size={11} className="text-blue-400" />
                            <span>Mapa oficial de Colombia · Paleta de marca Biocambio360</span>
                        </div>
                    </div>
                </div>

                {/* 📋 PANEL LATERAL: ESTADO EN VIVO & HITOS DE ENTREGA */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Tarjeta de Estado Actual */}
                    <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3 shadow-lg">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Estado Actual</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase flex items-center gap-1.5 ${
                                data.estado === 'entregado'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : data.estado === 'en_reparto'
                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                    : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            }`}>
                                <Truck size={14} />
                                {data.estadoTexto}
                            </span>
                        </div>

                        {/* Barra de Progreso Fluida */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[11px] font-bold text-slate-400">
                                <span>Preparación</span>
                                <span>En Ruta Nacional</span>
                                <span>Reparto</span>
                                <span>Entregado</span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressFactor * 100}%` }}
                                    transition={{ duration: 1.2, ease: 'easeOut' }}
                                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-[#E91E8C] rounded-full shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="pt-2 border-t border-slate-800 text-xs text-slate-300 space-y-1 leading-relaxed">
                            {data.estado === 'entregado' ? (
                                <p className="text-emerald-300 font-bold flex items-center gap-1.5">
                                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                                    ¡Paquete entregado a satisfacción en destino!
                                </p>
                            ) : data.estado === 'en_reparto' ? (
                                <p className="text-blue-300 font-bold flex items-center gap-1.5">
                                    <Truck size={16} className="text-blue-400 shrink-0" />
                                    El repartidor está en tu zona realizando entregas.
                                </p>
                            ) : (
                                <p className="text-slate-300 font-medium">
                                    Tu pedido viaja protegido con embalaje reforzado y precintos de seguridad Biocambio360.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Timeline de Hitos */}
                    <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 space-y-4 shadow-lg">
                        <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                            <Clock size={15} className="text-emerald-400" />
                            Trazabilidad del Despacho
                        </h4>

                        <div className="relative pl-6 border-l-2 border-slate-800 space-y-5">
                            {/* Hito 1: Despachado */}
                            <div className="relative">
                                <span className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 ring-2 ring-emerald-500/40" />
                                <p className="text-xs font-bold text-white">Despachado desde Fábrica</p>
                                <p className="text-[11px] text-slate-400">Soacha, Cundinamarca · Biocambio360 S.A.S.</p>
                                {data.fechaEnvio && (
                                    <p className="text-[10px] text-emerald-400 font-mono mt-0.5">{data.fechaEnvio}</p>
                                )}
                            </div>

                            {/* Hito 2: Troncal */}
                            <div className="relative">
                                <span className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 border-slate-900 ${
                                    progressFactor >= 0.5 ? 'bg-emerald-500 ring-2 ring-emerald-500/40' : 'bg-slate-700'
                                }`} />
                                <p className="text-xs font-bold text-white">En Tránsito Troncal Nacional</p>
                                <p className="text-[11px] text-slate-400">Transportado por {data.transportadora || 'Coordinadora'}</p>
                            </div>

                            {/* Hito 3: Reparto Urbano */}
                            <div className="relative">
                                <span className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 border-slate-900 ${
                                    progressFactor >= 0.85 ? 'bg-emerald-500 ring-2 ring-emerald-500/40' : 'bg-slate-700'
                                }`} />
                                <p className="text-xs font-bold text-white">En Reparto Urbano / Última Milla</p>
                                <p className="text-[11px] text-slate-400">Centro logístico {data.destino.ciudad}</p>
                            </div>

                            {/* Hito 4: Entrega */}
                            <div className="relative">
                                <span className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 border-slate-900 ${
                                    progressFactor >= 1.0 ? 'bg-emerald-500 ring-2 ring-emerald-500/40' : 'bg-slate-700'
                                }`} />
                                <p className="text-xs font-bold text-white">Entrega en Destino</p>
                                <p className="text-[11px] text-slate-400">{data.destino.ciudad} · {data.destino.direccion || 'Dirección del cliente'}</p>
                                {data.fechaEntregaReal && (
                                    <p className="text-[10px] text-emerald-400 font-mono mt-0.5">Entregado: {data.fechaEntregaReal}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sello de Garantía */}
                    <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs font-medium">
                        <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
                        <span>Envío 100% asegurado y verificado por Biocambio360</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
