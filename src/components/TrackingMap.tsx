'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Truck, CheckCircle2, Clock, MapPin, Building2, ShieldCheck, AlertCircle } from 'lucide-react';

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

// Coordenadas calibradas dentro del viewBox SVG de Colombia (0 0 800 900)
const COLOMBIA_CITIES_COORDS: Record<string, { x: number; y: number }> = {
    'SOACHA': { x: 425, y: 490 },
    'BOGOTA': { x: 430, y: 485 },
    'BOGOTÁ': { x: 430, y: 485 },
    'MEDELLIN': { x: 375, y: 395 },
    'MEDELLÍN': { x: 375, y: 395 },
    'BELLO': { x: 376, y: 390 },
    'ITAGUI': { x: 374, y: 400 },
    'ITAGÜÍ': { x: 374, y: 400 },
    'ENVIGADO': { x: 375, y: 402 },
    'SABANETA': { x: 374, y: 405 },
    'CALI': { x: 325, y: 575 },
    'PALMIRA': { x: 335, y: 565 },
    'JAMUNDI': { x: 320, y: 585 },
    'JAMUNDÍ': { x: 320, y: 585 },
    'BARRANQUILLA': { x: 410, y: 135 },
    'SOLEDAD': { x: 415, y: 140 },
    'CARTAGENA': { x: 375, y: 165 },
    'SANTA MARTA': { x: 445, y: 125 },
    'BUCARAMANGA': { x: 485, y: 335 },
    'FLORIDABLANCA': { x: 485, y: 340 },
    'GIRON': { x: 482, y: 338 },
    'GIRÓN': { x: 482, y: 338 },
    'CUCUTA': { x: 535, y: 295 },
    'CÚCUTA': { x: 535, y: 295 },
    'IBAGUE': { x: 395, y: 505 },
    'IBAGUÉ': { x: 395, y: 505 },
    'VILLAVICENCIO': { x: 470, y: 510 },
    'PEREIRA': { x: 370, y: 470 },
    'DOSQUEBRADAS': { x: 372, y: 468 },
    'MANIZALES': { x: 380, y: 450 },
    'ARMENIA': { x: 370, y: 485 },
    'NEIVA': { x: 395, y: 620 },
    'PASTO': { x: 290, y: 720 },
    'POPAYAN': { x: 315, y: 640 },
    'POPAYÁN': { x: 315, y: 640 },
    'MONTERIA': { x: 360, y: 245 },
    'MONTERÍA': { x: 360, y: 245 },
    'SINCELEJO': { x: 380, y: 220 },
    'VALLEDUPAR': { x: 475, y: 175 },
    'TUNJA': { x: 465, y: 440 },
    'SOGAMOSO': { x: 480, y: 430 },
    'DUITAMA': { x: 478, y: 428 },
    'YOPAL': { x: 535, y: 450 },
    'RIOHACHA': { x: 505, y: 95 },
    'FLORENCIA': { x: 410, y: 700 },
    'QUIBDO': { x: 325, y: 430 },
    'QUIBDÓ': { x: 325, y: 430 },
    'GIRARDOT': { x: 410, y: 510 },
    'FLANDES': { x: 408, y: 512 },
    'FUSAGASUGA': { x: 420, y: 515 },
    'FUSAGASUGÁ': { x: 420, y: 515 },
    'CHIA': { x: 435, y: 465 },
    'CHÍA': { x: 435, y: 465 },
    'CAJICA': { x: 435, y: 462 },
    'CAJICÁ': { x: 435, y: 462 },
    'ZIPAQUIRA': { x: 435, y: 455 },
    'ZIPAQUIRÁ': { x: 435, y: 455 },
    'FACATATIVA': { x: 415, y: 480 },
    'FACATATIVÁ': { x: 415, y: 480 },
    'MADRID': { x: 420, y: 482 },
    'MOSQUERA': { x: 422, y: 484 },
    'FUNZA': { x: 423, y: 483 },
    'TENJO': { x: 428, y: 470 },
};

function getCityCoords(cityName?: string): { x: number; y: number } {
    if (!cityName) return { x: 375, y: 395 }; // default Medellín
    const clean = cityName.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const [key, coords] of Object.entries(COLOMBIA_CITIES_COORDS)) {
        const normKey = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (clean.includes(normKey) || normKey.includes(clean)) {
            return coords;
        }
    }
    return { x: 375, y: 395 };
}

export default function TrackingMap({ data }: { data: TrackingData }) {
    const originCoords = COLOMBIA_CITIES_COORDS['SOACHA']; // Planta Principal
    const destCoords = getCityCoords(data.destino.ciudad);

    // Progreso numérico según estado
    let progressFactor = 0.15;
    if (data.estado === 'en_transporte') progressFactor = 0.52;
    if (data.estado === 'en_reparto') progressFactor = 0.85;
    if (data.estado === 'entregado') progressFactor = 1.0;

    // Calcular punto medio con curva para la ruta (Bézier Cuadrática)
    const midX = (originCoords.x + destCoords.x) / 2 - 35;
    const midY = (originCoords.y + destCoords.y) / 2 - 25;
    const pathD = `M ${originCoords.x} ${originCoords.y} Q ${midX} ${midY} ${destCoords.x} ${destCoords.y}`;

    // Posición interpolada del camión en la curva Bézier cuadrática: B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
    const t = progressFactor;
    const truckX = Math.round((1 - t) * (1 - t) * originCoords.x + 2 * (1 - t) * t * midX + t * t * destCoords.x);
    const truckY = Math.round((1 - t) * (1 - t) * originCoords.y + 2 * (1 - t) * t * midY + t * t * destCoords.y);

    return (
        <div className="w-full bg-slate-900 rounded-3xl p-4 sm:p-8 text-white border border-slate-800 shadow-2xl overflow-hidden relative">
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
                        <span>{data.destino.ciudad.toUpperCase()}</span>
                        <span className="text-slate-500 text-sm font-normal">←</span>
                        <span className="text-slate-400 text-sm font-medium">Planta Soacha</span>
                    </h2>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <div className="bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-700/60 text-right">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Transportadora</span>
                        <span className="text-sm font-black text-emerald-400 uppercase tracking-wide">
                            {data.transportadora || 'Coordinadora'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Layout Principal: Mapa SVG Animado + Panel Lateral de Hitos */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 items-center">
                {/* 🗺️ MAPA SVG DE COLOMBIA CON RUTA ANIMADA */}
                <div className="lg:col-span-7 relative flex items-center justify-center min-h-[380px] bg-slate-950/60 rounded-2xl border border-slate-800/70 p-4">
                    {/* Grilla sutil de fondo tipo radar táctico */}
                    <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none rounded-2xl" />

                    <svg
                        viewBox="180 50 450 780"
                        className="w-full h-auto max-h-[460px] drop-shadow-[0_0_25px_rgba(16,185,129,0.15)]"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        {/* Silueta estilizada y moderna de Colombia */}
                        <path
                            d="M 370 120 
                               C 410 80, 480 70, 510 95
                               C 530 115, 480 180, 480 230
                               C 490 280, 545 285, 545 330
                               C 545 370, 490 410, 485 460
                               C 485 490, 555 490, 570 550
                               C 580 600, 510 650, 490 710
                               C 480 740, 430 790, 390 810
                               C 350 820, 310 810, 300 760
                               C 285 710, 275 660, 290 610
                               C 300 570, 295 510, 310 460
                               C 315 410, 350 340, 345 270
                               C 340 220, 360 170, 370 120 Z"
                            fill="#0f172a"
                            stroke="#334155"
                            strokeWidth="2.5"
                            strokeLinejoin="round"
                            className="transition-all duration-700"
                        />

                        {/* Relieve interno sutil (Líneas de cordilleras) */}
                        <path
                            d="M 340 680 Q 380 520 420 380"
                            stroke="#1e293b"
                            strokeWidth="3"
                            strokeDasharray="4 6"
                        />
                        <path
                            d="M 390 720 Q 420 540 470 340"
                            stroke="#1e293b"
                            strokeWidth="3"
                            strokeDasharray="4 6"
                        />

                        {/* Ruta Trazada (Glow de fondo) */}
                        <path
                            d={pathD}
                            stroke="#10b981"
                            strokeWidth="6"
                            strokeLinecap="round"
                            opacity="0.25"
                        />

                        {/* Línea principal animada con dash flow */}
                        <path
                            d={pathD}
                            stroke="#34d399"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray="8 8"
                            className="animate-[dash_2s_linear_infinite]"
                        />

                        {/* Origen: Soacha (Planta Biocambio360) */}
                        <g transform={`translate(${originCoords.x}, ${originCoords.y})`}>
                            {/* Onda expansiva */}
                            <circle r="14" fill="#10b981" opacity="0.3" className="animate-ping" />
                            <circle r="8" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                            {/* Label */}
                            <text
                                x="-10"
                                y="-14"
                                fill="#6ee7b7"
                                fontSize="11"
                                fontWeight="900"
                                textAnchor="end"
                                className="drop-shadow-md tracking-wider font-mono"
                            >
                                🏭 PLANTA SOACHA
                            </text>
                        </g>

                        {/* Destino: Ciudad de Entrega */}
                        <g transform={`translate(${destCoords.x}, ${destCoords.y})`}>
                            {/* Onda expansiva de destino */}
                            <circle r="18" fill="#818cf8" opacity="0.3" className="animate-ping" />
                            <circle r="9" fill="#6366f1" stroke="#ffffff" strokeWidth="2.5" />
                            {/* Icono / Pin */}
                            <text
                                x="14"
                                y="4"
                                fill="#c7d2fe"
                                fontSize="12"
                                fontWeight="900"
                                textAnchor="start"
                                className="drop-shadow-md tracking-wider font-mono uppercase"
                            >
                                📍 {data.destino.ciudad}
                            </text>
                        </g>

                        {/* 🚚 Camión / Furgón Biocambio360 Animado desplazándose en la ruta */}
                        <g
                            transform={`translate(${truckX}, ${truckY})`}
                            className="transition-transform duration-1000 ease-out"
                        >
                            {/* Halo brillante del vehículo */}
                            <circle r="18" fill="#10b981" opacity="0.4" className="animate-pulse" />
                            
                            {/* Fondo del icono */}
                            <rect
                                x="-14"
                                y="-14"
                                width="28"
                                height="28"
                                rx="8"
                                fill="#059669"
                                stroke="#ffffff"
                                strokeWidth="2"
                                className="shadow-lg"
                            />
                            {/* Icono camión centrado */}
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

                    {/* Leyenda flotante en la esquina inferior del mapa */}
                    <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                            <span>Origen: Planta Biocambio360 (Soacha)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block" />
                            <span>Destino: {data.destino.ciudad}</span>
                        </div>
                    </div>
                </div>

                {/* 📋 PANEL LATERAL: ESTADO EN VIVO & HITOS DE ENTREGA */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Tarjeta de Estado Actual */}
                    <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60 space-y-3">
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
                            <div className="w-full h-2.5 bg-slate-700/60 rounded-full overflow-hidden p-0.5">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressFactor * 100}%` }}
                                    transition={{ duration: 1.2, ease: 'easeOut' }}
                                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-400 rounded-full shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="pt-2 border-t border-slate-700/40 text-xs text-slate-300 space-y-1 leading-relaxed">
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
                    <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/40 space-y-4">
                        <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                            <Clock size={15} className="text-emerald-400" />
                            Trazabilidad del Despacho
                        </h4>

                        <div className="relative pl-6 border-l-2 border-slate-700 space-y-5">
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
