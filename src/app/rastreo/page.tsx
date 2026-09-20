'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Package, Truck, ArrowLeft, MessageCircle, MapPin, Sparkles, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import TrackingMap, { TrackingData } from '@/components/TrackingMap';

function RastreoContent() {
    const searchParams = useSearchParams();
    const queryGuia = searchParams.get('guia') || searchParams.get('orderId') || '';

    const [searchInput, setSearchInput] = useState(queryGuia);
    const [enviosData, setEnviosData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTracking, setActiveTracking] = useState<TrackingData | null>(null);
    const [notFound, setNotFound] = useState(false);

    // Cargar base de datos local de 99 Envíos
    useEffect(() => {
        fetch('/data_envios_99_conciliados.json')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data.records)) {
                    setEnviosData(data.records);
                    // Si vino con query param, buscar de una vez
                    if (queryGuia) {
                        performSearch(queryGuia, data.records);
                    }
                }
            })
            .catch(err => console.warn('Error cargando base de envíos:', err))
            .finally(() => setIsLoading(false));
    }, [queryGuia]);

    const performSearch = (term: string, dataset = enviosData) => {
        const cleanTerm = term.trim().toLowerCase().replace(/\D/g, '');
        const cleanText = term.trim().toLowerCase();

        setNotFound(false);

        if (!cleanTerm && cleanText.length < 3) {
            setActiveTracking(null);
            return;
        }

        // 1. Buscar por número de guía exacto o parcial
        let match = dataset.find(r => r.guia && r.guia.includes(cleanTerm || cleanText));

        // 2. Buscar por teléfono celular
        if (!match && cleanTerm.length >= 7) {
            match = dataset.find(r => r.telefono && r.telefono.includes(cleanTerm.slice(-10)));
        }

        // 3. Buscar por nombre de cliente
        if (!match && cleanText.length >= 4) {
            match = dataset.find(r => r.nombre_clean && r.nombre_clean.includes(cleanText));
        }

        if (match) {
            // Mapear estado
            const st = (match.estado_envio || '').toLowerCase();
            let estadoKey: TrackingData['estado'] = 'en_transporte';
            let estadoTexto = match.estado_envio || 'En Transporte';

            if (st.includes('entregad')) {
                estadoKey = 'entregado';
                estadoTexto = 'Entregado a Satisfacción';
            } else if (st.includes('reparto') || st.includes('droop') || st.includes('distribucion')) {
                estadoKey = 'en_reparto';
                estadoTexto = 'En Reparto Urbano';
            } else if (st.includes('origen') || st.includes('recibir')) {
                estadoKey = 'en_preparacion';
                estadoTexto = 'En Preparación / Despacho';
            }

            setActiveTracking({
                guia: match.guia,
                transportadora: match.transportadora?.toUpperCase() || 'COORDINADORA',
                origen: {
                    ciudad: 'Soacha',
                    departamento: 'Cundinamarca',
                    instalacion: 'Planta Principal Biocambio360 S.A.S.'
                },
                destino: {
                    ciudad: match.ciudad || 'Colombia',
                    direccion: match.direccion,
                    destinatario: match.nombre
                },
                estado: estadoKey,
                estadoTexto,
                fechaEnvio: match.fecha,
                fechaEntregaReal: estadoKey === 'entregado' ? match.fecha : undefined
            });
        } else {
            setNotFound(true);
            setActiveTracking(null);
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        performSearch(searchInput);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col selection:bg-emerald-500 selection:text-white">
            {/* Barra de Navegación Superior */}
            <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 px-4 py-3.5">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-white hover:text-emerald-400 transition-colors font-black text-sm"
                    >
                        <ArrowLeft size={18} />
                        <span>Volver a la Tienda</span>
                    </Link>

                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                            Radar de Envíos Biocambio360
                        </span>
                    </div>

                    <a
                        href="https://wa.me/573027504568?text=Hola%20Biocambio360,%20deseo%20consultar%20el%20estado%20de%20mi%20guía"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/30 transition-colors"
                    >
                        <MessageCircle size={14} />
                        Soporte WhatsApp
                    </a>
                </div>
            </header>

            {/* Contenido Central */}
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 sm:py-12 space-y-8">
                {/* Hero & Buscador */}
                <div className="text-center space-y-3 max-w-2xl mx-auto">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-black rounded-full border border-emerald-500/20 uppercase tracking-widest">
                        <Sparkles size={13} /> Sistema de Rastreo Satelital
                    </span>
                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                        Rastrea tu Envío en Vivo
                    </h1>
                    <p className="text-sm text-slate-400 leading-relaxed">
                        Ingresa tu número de guía de <strong>99 Envíos o Coordinadora</strong>, número de teléfono o nombre para ver el mapa de tu despacho en tiempo real.
                    </p>

                    <form onSubmit={handleSearchSubmit} className="pt-2 flex flex-col sm:flex-row items-center gap-2 max-w-lg mx-auto">
                        <div className="relative w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="Ej: 64532769010 o 3125818176"
                                className="w-full bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm pl-11 pr-4 py-3.5 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono transition-all"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full sm:w-auto px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-sm rounded-2xl transition-colors shadow-lg shadow-emerald-500/20 shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            <Truck size={16} />
                            Rastrear
                        </button>
                    </form>
                </div>

                {/* Resultado: Componente Interactivo TrackingMap */}
                {activeTracking && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <TrackingMap data={activeTracking} />
                    </div>
                )}

                {/* Mensaje de no encontrado */}
                {notFound && (
                    <div className="max-w-md mx-auto p-6 bg-slate-900/80 border border-red-500/30 rounded-2xl text-center space-y-3">
                        <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto">
                            <Package size={24} />
                        </div>
                        <h3 className="font-black text-base text-white">Guía no localizada</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            No encontramos un despacho asociado al número ingresado. Verifica que los dígitos sean correctos o contacta a nuestro equipo por WhatsApp.
                        </p>
                        <a
                            href={`https://wa.me/573027504568?text=${encodeURIComponent(`Hola, necesito ayuda para rastrear mi despacho: ${searchInput}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors"
                        >
                            <MessageCircle size={15} />
                            Consultar con un Asesor
                        </a>
                    </div>
                )}

                {/* Si no hay búsqueda aún: Ejemplos de guías para probar */}
                {!activeTracking && !notFound && (
                    <div className="max-w-xl mx-auto p-6 bg-slate-900/40 rounded-2xl border border-slate-800/80 text-center space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Prueba buscando estas guías reales de Coordinadora / 99 Envíos:
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                            {['64532769010', '64532763598', '64532767270', '64532752581'].map((exGuia) => (
                                <button
                                    key={exGuia}
                                    type="button"
                                    onClick={() => {
                                        setSearchInput(exGuia);
                                        performSearch(exGuia);
                                    }}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-mono font-bold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
                                >
                                    #{exGuia}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-800/80 py-6 px-4 text-center text-xs text-slate-500">
                <p>© 2026 Biocambio360 S.A.S. · Planta de Operaciones Soacha, Cundinamarca · Todos los derechos reservados.</p>
            </footer>
        </div>
    );
}

export default function RastreoPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-emerald-400">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                    <span className="font-bold font-mono text-sm">Cargando radar de envíos...</span>
                </div>
            </div>
        }>
            <RastreoContent />
        </Suspense>
    );
}
