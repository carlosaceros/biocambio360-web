'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    GraduationCap,
    Sparkles,
    ChevronRight,
    X,
    BookOpen,
    Play,
    RotateCcw,
    Compass,
    Clock,
    Shield
} from 'lucide-react';
import { useTour } from './TourContext';
import { TOURS_CONFIG } from './tourDefinitions';

export default function TourLauncherButton() {
    const { startTour, isTourActive, openManual } = useTour();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Cerrar al hacer clic afuera
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Ocultar el botón si ya hay un tour activo
    if (isTourActive) return null;

    const toursList = Object.values(TOURS_CONFIG);

    const handleSelectTour = (tourId: string) => {
        setIsOpen(false);
        startTour(tourId);
    };

    const handleOpenManual = () => {
        setIsOpen(false);
        openManual();
    };

    return (
        <div ref={menuRef} className="fixed bottom-6 left-6 z-40">
            {/* Botón Flotante Discreto */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(prev => !prev)}
                className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl shadow-xl hover:shadow-2xl font-black text-xs flex items-center gap-2.5 transition-all cursor-pointer border border-slate-700/60 group"
                title="Centro de Tours Guiados y Manual de Usuario"
            >
                <div className="p-1.5 bg-emerald-500 text-white rounded-xl shadow-2xs group-hover:rotate-12 transition-transform">
                    <GraduationCap size={16} />
                </div>
                <div className="text-left hidden sm:block">
                    <span className="text-[10px] text-emerald-400 font-bold block uppercase tracking-wider leading-none">
                        Capacitación
                    </span>
                    <span className="text-xs font-black leading-none mt-0.5 block">
                        Tours & Manual
                    </span>
                </div>
                <span className="sm:hidden text-xs font-black">Ayuda</span>
            </motion.button>

            {/* Menú Flotante de Selección de Tours */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 12, scale: 0.95 }}
                        transition={{ duration: 0.18 }}
                        className="absolute bottom-16 left-0 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-50"
                    >
                        {/* Header del Menú */}
                        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles size={18} className="text-amber-400" />
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-wider text-amber-300">
                                        Tours Guiados & Aha Moments
                                    </h3>
                                    <p className="text-[11px] text-slate-300">
                                        Elige un recorrido para repetirlo cuantas veces desees:
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Lista de Tours Disponibles */}
                        <div className="p-3 space-y-2 max-h-[380px] overflow-y-auto">
                            {toursList.map(tour => (
                                <button
                                    key={tour.id}
                                    onClick={() => handleSelectTour(tour.id)}
                                    className="w-full text-left p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-100 hover:border-emerald-300 transition-all cursor-pointer group flex items-start justify-between gap-3"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black uppercase bg-slate-200 group-hover:bg-emerald-200 text-slate-800 group-hover:text-emerald-900 px-2 py-0.5 rounded-md transition-colors">
                                                {tour.badge}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                                <Clock size={11} /> {tour.estimatedMinutes} min
                                            </span>
                                        </div>
                                        <h4 className="text-xs font-black text-slate-900 group-hover:text-emerald-950 transition-colors">
                                            {tour.title}
                                        </h4>
                                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                                            {tour.description}
                                        </p>
                                    </div>

                                    <div className="p-2 bg-white rounded-xl border border-slate-200 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-all shrink-0 mt-2 shadow-2xs">
                                        <Play size={12} className="fill-current" />
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Botón de Acceso al Manual de Usuario */}
                        <div className="p-3 bg-slate-50 border-t border-slate-200">
                            <button
                                onClick={handleOpenManual}
                                className="w-full py-2.5 px-3 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-black text-indigo-900 flex items-center justify-between transition-colors cursor-pointer shadow-2xs"
                            >
                                <div className="flex items-center gap-2">
                                    <BookOpen size={15} className="text-indigo-600" />
                                    <span>Manual de Usuario por Roles (SWEBOK)</span>
                                </div>
                                <ChevronRight size={14} className="text-indigo-400" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
