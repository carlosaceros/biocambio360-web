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
    const originCoords = { x: 306, y: 355 };

    // Coordenadas calibradas del Destino según ciudad y departamento
    const destCoords = getCoordinatesForLocation(data.destino.ciudad, data.destino.departamento);
    const targetDeptName = destCoords.dept;

    // Distancia aproximada en km para telemetría
    const distUnits = Math.hypot(destCoords.x - originCoords.x, destCoords.y - originCoords.y);
    const estimatedKm = Math.max(15, Math.round(distUnits * 1.85));

    // Progreso numérico de la entrega
    let progressFactor = 0.12;
    if (data.estado === 'en_transporte') progressFactor = 0.52;
    if (data.estado === 'en_reparto') progressFactor = 0.86;
    if (data.estado === 'entregado') progressFactor = 1.0;

    // Control point para la Curva Bézier Cuadrática natural (Arco aerodinámico)
    const dx = destCoords.x - originCoords.x;
    const dy = destCoords.y - originCoords.y;
    const dist = Math.hypot(dx, dy);
    const nx = -dy / (dist || 1);
    const ny = dx / (dist || 1);
    const arcSide = dx > 0 ? -1 : 1;
    const arcMagnitude = Math.min(Math.max(dist * 0.16, 14), 40);
    const midX = (originCoords.x + destCoords.x) / 2;
    const midY = (originCoords.y + destCoords.y) / 2;
    const ctrlX = Math.round(midX + nx * arcMagnitude * arcSide);
    const ctrlY = Math.round(midY + ny * arcMagnitude * arcSide - 12);

    // Subdivisión de De Casteljau en t = progressFactor
    const t = Math.max(0.04, Math.min(0.98, progressFactor));
    const q0x = Number(((1 - t) * originCoords.x + t * ctrlX).toFixed(1));
    const q0y = Number(((1 - t) * originCoords.y + t * ctrlY).toFixed(1));
    const q1x = Number(((1 - t) * ctrlX + t * destCoords.x).toFixed(1));
    const q1y = Number(((1 - t) * ctrlY + t * destCoords.y).toFixed(1));

    const truckX = Math.round((1 - t) * q0x + t * q1x);
    const truckY = Math.round((1 - t) * q0y + t * q1y);

    const fullPathD = `M ${originCoords.x} ${originCoords.y} Q ${ctrlX} ${ctrlY} ${destCoords.x} ${destCoords.y}`;
    const pathCompletedD = `M ${originCoords.x} ${originCoords.y} Q ${q0x} ${q0y} ${truckX} ${truckY}`;
    const pathRemainingD = `M ${truckX} ${truckY} Q ${q1x} ${q1y} ${destCoords.x} ${destCoords.y}`;

    // Anti-colisión inteligente de cartelas e hitos
    const isVeryClose = dist < 95;
    const isDestSouth = destCoords.y >= originCoords.y - 10;
    const destCardY = isVeryClose || isDestSouth ? 16 : -30;
    const destCardX = destCoords.x > 380 ? -104 : 8;
    const destLeaderY = isVeryClose || isDestSouth ? 16 : -12;
    const isDelivered = data.estado === 'entregado';

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
                        <span className="text-slate-400 text-sm font-medium">Planta Soacha (Cundinamarca)</span>
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
                <div className="lg:col-span-7 relative flex items-center justify-center min-h-[460px] bg-slate-950/80 rounded-2xl border border-slate-800/80 p-2 sm:p-4 overflow-hidden">
                    {/* Grilla sutil de fondo tipo radar táctico */}
                    <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none rounded-2xl" />

                    {/* Resplandor ambiental de marca en el fondo */}
                    <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

                    {/* Telemetría Satelital en Esquina Superior Derecha */}
                    <div className="absolute top-3 right-3 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800/90 text-right shadow-lg z-10 pointer-events-none">
                        <div className="flex items-center justify-end gap-1.5 text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            Trazabilidad Activa
                        </div>
                        <p className="text-[11px] font-bold text-white mt-0.5">
                            Distancia ~{estimatedKm} km
                        </p>
                        <p className="text-[9px] text-slate-400 font-mono">
                            {data.estado === 'entregado' ? '100% completado' : `${Math.round(progressFactor * 100)}% de recorrido`}
                        </p>
                    </div>

                    <svg
                        viewBox="85 10 525 705"
                        className="w-full h-auto max-h-[520px] drop-shadow-[0_0_30px_rgba(45,110,181,0.25)] select-none"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <defs>
                            {/* Filtro de glow para ruta y balizas */}
                            <filter id="routeGlow" x="-30%" y="-30%" width="160%" height="160%">
                                <feGaussianBlur stdDeviation="3" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                            <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
                                <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.85" />
                            </filter>
                            {/* Gradiente del tramo completado */}
                            <linearGradient id="completedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#10B981" />
                                <stop offset="100%" stopColor="#06B6D4" />
                            </linearGradient>
                            {/* Estilos de animación inline garantizados para SVG */}
                            <style>{`
                                @keyframes dashFlowAnim {
                                    from {
                                        stroke-dashoffset: 24;
                                    }
                                    to {
                                        stroke-dashoffset: 0;
                                    }
                                }
                                .route-dash-flow {
                                    animation: dashFlowAnim 1.2s linear infinite;
                                }
                            `}</style>
                        </defs>

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

                        {/* 5. 🛣️ TRAZABILIDAD DE LA RUTA */}
                        {/* 5.1 Carril Guía de Fondo (Autopista Nacional Sólida) */}
                        <path
                            d={fullPathD}
                            stroke="#0B1120"
                            strokeWidth="7"
                            strokeLinecap="round"
                            opacity="0.9"
                        />
                        <path
                            d={fullPathD}
                            stroke="#1E293B"
                            strokeWidth="4.5"
                            strokeLinecap="round"
                            opacity="0.8"
                        />

                        {/* 5.2 Tramo Recorrido (Completado: Soacha ➔ Camión) */}
                        <path
                            d={pathCompletedD}
                            stroke="#10B981"
                            strokeWidth="9"
                            strokeLinecap="round"
                            opacity="0.35"
                            filter="url(#routeGlow)"
                        />
                        <path
                            d={pathCompletedD}
                            stroke="url(#completedGrad)"
                            strokeWidth="3.8"
                            strokeLinecap="round"
                        />
                        <path
                            d={pathCompletedD}
                            stroke="#FFFFFF"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            opacity="0.9"
                        />

                        {/* 5.3 Tramo Pendiente (En Ruta Satelital: Camión ➔ Destino) */}
                        {data.estado !== 'entregado' && (
                            <>
                                <path
                                    d={pathRemainingD}
                                    stroke="#334155"
                                    strokeWidth="2.8"
                                    strokeLinecap="round"
                                    opacity="0.45"
                                />
                                {/* Línea punteada de alta visibilidad que fluye continuamente */}
                                <path
                                    d={pathRemainingD}
                                    stroke="#38BDF8"
                                    strokeWidth="3.2"
                                    strokeLinecap="round"
                                    strokeDasharray="5 7"
                                    className="route-dash-flow"
                                />
                                <path
                                    d={pathRemainingD}
                                    stroke="#FFFFFF"
                                    strokeWidth="1.2"
                                    strokeLinecap="round"
                                    strokeDasharray="5 7"
                                    className="route-dash-flow"
                                    opacity="0.85"
                                />
                            </>
                        )}

                        {/* 6. 🏭 ORIGEN: PLANTA BIOCAMBIO360 (SOACHA, CUNDINAMARCA) */}
                        <g transform={`translate(${originCoords.x}, ${originCoords.y})`}>
                            {/* Anillos de anclaje geográfico concéntricos */}
                            <circle r="14" fill="#10B981" opacity="0.25" className="animate-ping" />
                            <circle r="6.5" fill="#047857" stroke="#FFFFFF" strokeWidth="2" />
                            <circle r="2.5" fill="#FFFFFF" />

                            {/* Puntero de conexión al badge de la planta */}
                            <line x1="0" y1="0" x2="8" y2="-12" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" />

                            {/* Cartela de Planta Soacha (Ubicada al ESTE/NORTE sobre Cundinamarca / Bogotá, CERO contacto con Tolima) */}
                            <g transform="translate(8, -32)" filter="url(#badgeShadow)">
                                <rect
                                    x="0"
                                    y="0"
                                    width="104"
                                    height="24"
                                    rx="6"
                                    fill="#042F2E"
                                    stroke="#10B981"
                                    strokeWidth="1.2"
                                />
                                <text x="6" y="16" fontSize="11">🏭</text>
                                <text x="23" y="11" fill="#FFFFFF" fontSize="7.5" fontWeight="900" letterSpacing="0.4">
                                    PLANTA SOACHA
                                </text>
                                <text x="23" y="19" fill="#34D399" fontSize="6" fontWeight="800" letterSpacing="0.6">
                                    CUNDINAMARCA · ORIGEN
                                </text>
                            </g>
                        </g>

                        {/* 7. 📍 DESTINO: CIUDAD DE ENTREGA */}
                        <g transform={`translate(${destCoords.x}, ${destCoords.y})`}>
                            {/* Anillo de pulso expansivo destino */}
                            <circle
                                r={isDelivered ? 20 : 16}
                                fill={isDelivered ? '#10B981' : '#E91E8C'}
                                opacity="0.3"
                                className="animate-ping"
                            />

                            {/* Puntero conector dinámico */}
                            <line
                                x1="0"
                                y1="0"
                                x2={destCardX > 0 ? 8 : -8}
                                y2={destLeaderY}
                                stroke={isDelivered ? '#10B981' : '#E91E8C'}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            />

                            {/* Icono de Anclaje en Tierra */}
                            {isDelivered ? (
                                <g filter="url(#badgeShadow)">
                                    <circle r="12" fill="#059669" stroke="#FFFFFF" strokeWidth="2" />
                                    <g transform="translate(-6.5, -6.5) scale(0.55)">
                                        <path
                                            d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"
                                            fill="#ffffff"
                                        />
                                        <circle cx="5.5" cy="18.5" r="2.5" fill="#ffffff" />
                                        <circle cx="18.5" cy="18.5" r="2.5" fill="#ffffff" />
                                    </g>
                                </g>
                            ) : (
                                <>
                                    <circle r="7" fill="#E91E8C" stroke="#FFFFFF" strokeWidth="2" />
                                    <circle r="2.5" fill="#FFFFFF" />
                                </>
                            )}

                            {/* Cartela Inteligente de Destino (Anti-colisión: abajo si está al sur/cerca, arriba si está al norte) */}
                            <g transform={`translate(${destCardX}, ${destCardY})`} filter="url(#badgeShadow)">
                                <rect
                                    x="0"
                                    y="0"
                                    width="106"
                                    height="25"
                                    rx="6"
                                    fill={isDelivered ? '#042F2E' : '#370D28'}
                                    stroke={isDelivered ? '#10B981' : '#E91E8C'}
                                    strokeWidth="1.2"
                                />
                                <text x="6" y="17" fontSize="12">{isDelivered ? '✅' : '📍'}</text>
                                <text x="24" y="11" fill="#FFFFFF" fontSize="7.5" fontWeight="900" letterSpacing="0.4">
                                    {data.destino.ciudad.toUpperCase().slice(0, 14)}
                                </text>
                                <text
                                    x="24"
                                    y="19"
                                    fill={isDelivered ? '#34D399' : '#FDA4AF'}
                                    fontSize="6"
                                    fontWeight="800"
                                    letterSpacing="0.6"
                                >
                                    {isDelivered
                                        ? `✓ ENTREGADO · ${destCoords.dept.toUpperCase().slice(0, 8)}`
                                        : `${destCoords.dept.toUpperCase().slice(0, 14)} · DESTINO`}
                                </text>
                            </g>
                        </g>

                        {/* 8. 🚚 FURGÓN ECOLÓGICO EN RUTA (Solo visible durante el viaje, se acopla al destino al ser entregado) */}
                        {!isDelivered && (
                            <g
                                transform={`translate(${truckX}, ${truckY})`}
                                className="transition-transform duration-700 ease-out"
                            >
                                {/* Halo brillante del vehículo */}
                                <circle r="18" fill="#10b981" opacity="0.35" className="animate-pulse" />
                                
                                {/* Carrocería del Furgón */}
                                <g filter="url(#badgeShadow)">
                                    <rect
                                        x="-15"
                                        y="-15"
                                        width="30"
                                        height="30"
                                        rx="9"
                                        fill="#059669"
                                        stroke="#ffffff"
                                        strokeWidth="2"
                                    />
                                    <g transform="translate(-9, -9) scale(0.72)">
                                        <path
                                            d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"
                                            fill="#ffffff"
                                        />
                                        <circle cx="5.5" cy="18.5" r="2.5" fill="#ffffff" />
                                        <circle cx="18.5" cy="18.5" r="2.5" fill="#ffffff" />
                                    </g>
                                </g>

                                {/* Mini Pill de Estado flotante bajo el furgón */}
                                <g transform="translate(0, 19)" filter="url(#badgeShadow)">
                                    <rect
                                        x="-32"
                                        y="0"
                                        width="64"
                                        height="13"
                                        rx="6.5"
                                        fill="#06281E"
                                        stroke="#10B981"
                                        strokeWidth="0.8"
                                    />
                                    <text
                                        x="0"
                                        y="9"
                                        fill="#34D399"
                                        fontSize="6"
                                        fontWeight="900"
                                        textAnchor="middle"
                                        letterSpacing="0.5"
                                    >
                                        {data.estado === 'en_reparto' ? 'EN REPARTO' : 'EN TRÁNSITO'}
                                    </text>
                                </g>
                            </g>
                        )}
                    </svg>

                    {/* Leyenda flotante táctica en la esquina inferior izquierda */}
                    <div className="absolute bottom-3 left-3 bg-slate-900/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1 shadow-lg pointer-events-none">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shrink-0 shadow-xs" />
                            <span className="font-semibold">Origen: Planta Biocambio360 (Soacha, Cundinamarca)</span>
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
