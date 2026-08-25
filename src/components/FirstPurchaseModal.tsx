'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, CheckCircle2, ArrowRight, Zap, Clock } from 'lucide-react';
import { PromoModalConfig, subscribePromoConfig } from '@/lib/promo-modal-service';
import { useCart } from '@/lib/cart-context';

const STORAGE_KEY = 'biocambio360_promo_dismissed';

function useCountdown(totalMinutes: number, startedAt: number) {
    const [secondsLeft, setSecondsLeft] = useState(() => {
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        return Math.max(0, totalMinutes * 60 - elapsed);
    });

    useEffect(() => {
        if (totalMinutes === 0) return;
        const interval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startedAt) / 1000);
            setSecondsLeft(Math.max(0, totalMinutes * 60 - elapsed));
        }, 1000);
        return () => clearInterval(interval);
    }, [totalMinutes, startedAt]);

    const mins = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
    const secs = (secondsLeft % 60).toString().padStart(2, '0');
    return { mins, secs, expired: secondsLeft === 0 };
}

export default function FirstPurchaseModal() {
    const { applyCoupon, setIsCartOpen } = useCart();

    const [config, setConfig] = useState<PromoModalConfig | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [applied, setApplied] = useState(false);
    const [startedAt] = useState(() => Date.now());

    const { mins, secs, expired } = useCountdown(config?.countdownMinutes ?? 0, startedAt);

    useEffect(() => {
        const unsubscribe = subscribePromoConfig((cfg) => {
            setConfig(cfg);
            if (cfg?.isActive) {
                try {
                    const dismissed = typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY) : null;
                    if (!dismissed) {
                        setTimeout(() => setIsOpen(true), 1800);
                    }
                } catch (_) {
                    setTimeout(() => setIsOpen(true), 1800);
                }
            } else {
                setIsOpen(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const handleDismiss = useCallback(() => {
        setIsOpen(false);
        try {
            sessionStorage.setItem(STORAGE_KEY, '1');
        } catch (_) {}
    }, []);

    const handleCopy = useCallback(() => {
        if (!config || !config.couponCode) return;
        try {
            navigator.clipboard.writeText(config.couponCode).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
            }).catch(() => {});
        } catch (_) {}
    }, [config]);

    const handleApply = useCallback(async () => {
        if (!config || !config.couponCode) return;
        await applyCoupon(config.couponCode, '', '');
        setApplied(true);
        setTimeout(() => {
            setIsOpen(false);
            setIsCartOpen(true);
            try {
                sessionStorage.setItem(STORAGE_KEY, '1');
            } catch (_) {}
        }, 1000);
    }, [config, applyCoupon, setIsCartOpen]);

    if (!config?.isActive) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 bg-black/50 backdrop-blur-[3px]"
                        onClick={handleDismiss}
                    />

                    {/* Card — más ancho, festivo */}
                    <motion.div
                        initial={{ y: 80, opacity: 0, scale: 0.95 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 50, opacity: 0, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 24, stiffness: 260 }}
                        className="relative w-full sm:max-w-lg z-10 sm:rounded-3xl overflow-hidden shadow-2xl"
                        style={{
                            background: 'linear-gradient(150deg, #0c1a2e 0%, #0d3d45 45%, #0c1a2e 100%)'
                        }}
                    >
                        {/* Dot grid overlay */}
                        <div className="absolute inset-0 opacity-[0.045] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

                        {/* Festive top accent bar */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 via-emerald-300 to-cyan-400" />

                        {/* Decorative glow orbs */}
                        <div className="absolute -top-12 -right-12 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
                        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

                        {/* Close button */}
                        <button
                            onClick={handleDismiss}
                            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all"
                        >
                            <X size={16} />
                        </button>

                        <div className="relative z-10 px-8 pt-10 pb-8 flex flex-col items-center text-center gap-5">

                            {/* Badge */}
                            <div className="flex items-center gap-2 bg-teal-400/15 border border-teal-400/30 text-teal-300 text-[12px] font-black uppercase tracking-[0.15em] px-4 py-1.5 rounded-full">
                                <Zap size={12} className="fill-teal-400" />
                                {config.badgeText}
                            </div>

                            {/* Big discount */}
                            <div className="flex flex-col items-center gap-2">
                                <span
                                    className="font-black leading-none text-white tracking-tight"
                                    style={{ fontSize: 'clamp(72px, 14vw, 96px)' }}
                                >
                                    {config.discountText}
                                </span>
                                <p className="text-[22px] sm:text-[24px] text-white font-extrabold max-w-md leading-tight drop-shadow-sm">
                                    {config.headline}
                                </p>
                            </div>

                            {/* Subheadline */}
                            <p className="text-[16px] sm:text-[17px] text-teal-100/90 font-bold max-w-md leading-snug">
                                {config.subheadline}
                            </p>

                            {/* Countdown */}
                            {config.countdownMinutes > 0 && (
                                <div className="flex items-center gap-2.5 bg-amber-400/10 border border-amber-400/20 rounded-2xl px-5 py-2.5">
                                    <Clock size={16} className="text-amber-400" />
                                    <span className="text-[16px] font-black tabular-nums tracking-widest text-amber-300">
                                        {expired ? 'EXPIRADO' : `${mins}:${secs}`}
                                    </span>
                                    <span className="text-[12px] text-white/40 font-medium">para activar</span>
                                </div>
                            )}

                            {/* Coupon code */}
                            <button
                                onClick={handleCopy}
                                className="group flex items-center gap-4 w-full bg-white/6 hover:bg-white/10 border border-white/15 hover:border-teal-400/50 rounded-2xl px-6 py-4 transition-all"
                            >
                                <span className="font-mono font-black text-[22px] text-white tracking-[0.2em] flex-1 text-left">
                                    {config.couponCode}
                                </span>
                                <span className={`transition-all flex-shrink-0 ${copied ? 'text-teal-400 scale-110' : 'text-white/40 group-hover:text-white/70'}`}>
                                    {copied ? <CheckCircle2 size={22} /> : <Copy size={22} />}
                                </span>
                            </button>

                            {copied && (
                                <p className="text-[13px] text-teal-400 font-bold -mt-2">¡Código copiado al portapapeles! 🎉</p>
                            )}

                            {/* Min order */}
                            <p className="text-[12px] text-white/30 font-medium -mt-1.5">
                                {config.minOrderText}
                            </p>

                            {/* CTA */}
                            <button
                                onClick={handleApply}
                                disabled={applied}
                                className={`w-full flex items-center justify-center gap-2.5 font-black text-[16px] py-4 rounded-2xl transition-all shadow-xl ${
                                    applied
                                        ? 'bg-teal-500 text-white'
                                        : 'bg-white text-slate-900 hover:bg-teal-50 hover:shadow-teal-400/20 active:scale-[0.98]'
                                }`}
                            >
                                {applied ? (
                                    <>
                                        <CheckCircle2 size={20} />
                                        ¡Cupón aplicado! Abriendo carrito…
                                    </>
                                ) : (
                                    <>
                                        Aplicar descuento ahora
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </button>

                            {/* Soft dismiss */}
                            <button
                                onClick={handleDismiss}
                                className="text-[12px] text-white/25 hover:text-white/50 transition-colors"
                            >
                                No gracias, prefiero pagar el precio completo
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
