'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, ShieldCheck, Zap, CreditCard, CheckCircle2 } from 'lucide-react';

interface AddiPromoBannerProps {
  className?: string;
  onExploreClick?: () => void;
}

export default function AddiPromoBanner({ className = '', onExploreClick }: AddiPromoBannerProps) {
  const handleScroll = () => {
    if (onExploreClick) {
      onExploreClick();
      return;
    }
    const el = document.getElementById('catalogo') || document.getElementById('combos');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className={`px-4 md:px-6 my-6 ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0d1b3e] via-[#14234d] to-[#1e1338] text-white p-6 sm:p-8 md:p-10 shadow-2xl border border-white/10"
      >
        {/* Glow ambient effects */}
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-[#0050FF]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[#FF3366]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 md:gap-8">
          
          {/* Content Column */}
          <div className="max-w-2xl">
            {/* Badges Header */}
            <div className="flex flex-wrap items-center gap-2.5 mb-3.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#0050FF] to-[#0070FF] text-white text-xs font-black tracking-wide uppercase shadow-sm">
                <Zap size={14} className="animate-pulse" />
                Nuevo Aliado Oficial
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#FF3366]/20 text-[#FF6688] border border-[#FF3366]/30 text-xs font-black tracking-wide">
                <Sparkles size={13} />
                0% DE INTERÉS
              </span>
            </div>

            {/* Headline */}
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight tracking-tight mb-3">
              ¡Lleva tus productos hoy y paga a cuotas con{' '}
              <span className="bg-gradient-to-r from-blue-400 via-pink-400 to-[#FF3366] bg-clip-text text-transparent font-black underline decoration-blue-400/30 decoration-2">
                ADDI
              </span>
              !
            </h2>

            {/* Subtitle */}
            <p className="text-gray-200 text-sm sm:text-base leading-relaxed mb-5">
              Dile adiós a pagar todo de contado. Divide tu compra hasta en <strong className="text-white font-black">3 cuotas sin interés</strong> y sin tarjeta de crédito. Solo necesitas tu cédula y número de WhatsApp.
            </p>

            {/* Value Props / Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span className="font-semibold text-gray-200">0% Interés en 3 cuotas</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10">
                <CreditCard size={16} className="text-blue-400 shrink-0" />
                <span className="font-semibold text-gray-200">Sin tarjeta de crédito</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10">
                <ShieldCheck size={16} className="text-pink-400 shrink-0" />
                <span className="font-semibold text-gray-200">Aprobación en 2 min</span>
              </div>
            </div>
          </div>

          {/* Action Column */}
          <div className="w-full lg:w-auto flex flex-col items-center sm:items-start lg:items-center justify-center shrink-0">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleScroll}
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-gradient-to-r from-[#0050FF] hover:from-[#0040E0] to-[#0066FF] text-white font-black text-sm tracking-wide shadow-xl shadow-blue-900/50 hover:shadow-blue-700/60 flex items-center justify-center gap-2.5 transition-all cursor-pointer border border-blue-400/30"
            >
              <span>COMPRAR A CUOTAS CON ADDI</span>
              <ArrowRight size={18} />
            </motion.button>
            <span className="text-[11px] text-gray-400 mt-2.5 text-center font-medium">
              Válido para compras desde $50.000 COP
            </span>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
