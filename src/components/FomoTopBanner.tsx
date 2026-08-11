'use client';

import { useFomoTimer } from '@/lib/fomo-timer';
import { Clock, Flame, Sparkles, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FomoTopBanner() {
    const { isVisible, formattedTime } = useFomoTimer();

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-gradient-to-r from-[var(--brand-dark)] via-[#1e102d] to-[var(--brand-dark)] text-white text-xs py-2 px-4 border-b border-pink-500/20 shadow-md relative z-[51]"
            >
                <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-center sm:text-left">
                    
                    <div className="flex items-center gap-2 mx-auto sm:mx-0 font-extrabold tracking-tight">
                        <span className="flex items-center justify-center bg-pink-500/20 text-pink-400 p-1 rounded-full animate-bounce">
                            <Flame size={14} className="fill-pink-400" />
                        </span>
                        <span>
                            🔥 ¡OFICIAL DIRECTO DE FÁBRICA! <span className="text-[var(--brand-blue-light)]">HASTA 45% OFF</span> EN KITS ESPECIALES DE ASEO
                        </span>
                    </div>

                    <div className="flex items-center gap-4 mx-auto sm:mx-0 font-black">
                        {/* Countdown Pill */}
                        <div className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md border border-white/20 font-mono text-[11px]">
                            <Clock size={13} className="animate-spin-slow" />
                            <span>OFERTA EXPIRA EN: <strong className="text-yellow-300 font-extrabold tracking-wider">{formattedTime}</strong></span>
                        </div>

                        <button
                            onClick={() => document.getElementById('kits-especiales')?.scrollIntoView({ behavior: 'smooth' })}
                            className="hidden md:flex items-center gap-1 text-[11px] text-pink-300 hover:text-white font-extrabold underline transition-colors cursor-pointer"
                        >
                            VER KITS
                            <ArrowRight size={12} />
                        </button>
                    </div>

                </div>
            </motion.div>
        </AnimatePresence>
    );
}
