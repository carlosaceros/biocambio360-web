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
        // Subscribe to real-time config changes
        const unsubscribe = subscribePromoConfig((cfg) => {
            setConfig(cfg);
            // Auto-open when activated, if not already dismissed in this session
            if (cfg?.isActive) {
                const dismissed = sessionStorage.getItem(STORAGE_KEY);
                if (!dismissed) {
                    // Small delay so it doesn't flash immediately on load
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
        sessionStorage.setItem(STORAGE_KEY, '1');
    }, []);

    const handleCopy = useCallback(() => {
        if (!config) return;
        navigator.clipboard.writeText(config.couponCode).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        });
    }, [config]);

    const handleApply = useCallback(async () => {
        if (!config) return;
        await applyCoupon(config.couponCode, '', '');
        setApplied(true);
        setTimeout(() => {
            setIsOpen(false);
            setIsCartOpen(true);
            sessionStorage.setItem(STORAGE_KEY, '1');
        }, 1000);
    }, [config, applyCoupon, setIsCartOpen]);

    if (!config?.isActive) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    {/* Backdrop — very subtle, not heavy */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                        onClick={handleDismiss}
                    />

                    {/* Card */}
                    <motion.div
                        initial={{ y: 60, opacity: 0, scale: 0.97 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 40, opacity: 0, scale: 0.97 }}
                        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                        className="relative w-full sm:max-w-sm z-10 sm:rounded-3xl overflow-hidden shadow-2xl"
                        style={{
                            background: 'linear-gradient(145deg, #0f172a 0%, #0f3443 50%, #0f172a 100%)'
                        }}
                    >
                        {/* Subtle pattern overlay */}
                        <div className="absolute inset-0 opacity-[0.04] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:14px_14px] pointer-events-none" />

                        {/* Close button */}
                        <button
                            onClick={handleDismiss}
                            className="absolute top-4 right-4 z-20 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
                        >
                            <X size={15} />
                        </button>

                        <div className="relative z-10 px-7 pt-8 pb-7 flex flex-col items-center text-center gap-4">
                            {/* Badge */}
                            <div className="flex items-center gap-1.5 bg-teal-500/15 border border-teal-500/30 text-teal-300 text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                                <Zap size={11} className="fill-teal-400" />
                                {config.badgeText}
                            </div>

                            {/* Discount — the big number */}
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-[64px] font-black leading-none text-white tracking-tight">
                                    {config.discountText}
                                </span>
                                <p className="text-sm text-white/60 font-medium max-w-[220px] leading-snug">
                                    {config.headline}
                                </p>
                            </div>

                            {/* Subheadline */}
                            <p className="text-[12px] text-white/45 leading-relaxed max-w-[240px]">
                                {config.subheadline}
                            </p>

                            {/* Countdown timer */}
                            {config.countdownMinutes > 0 && (
                                <div className="flex items-center gap-2 text-amber-400">
                                    <Clock size={13} />
                                    <span className="text-xs font-black tabular-nums tracking-widest">
                                        {expired ? 'EXPIRADO' : `${mins}:${secs}`}
                                    </span>
                                    <span className="text-[10px] text-white/40 font-medium">para activar</span>
                                </div>
                            )}

                            {/* Coupon code box */}
                            <button
                                onClick={handleCopy}
                                className="group flex items-center gap-3 w-full bg-white/5 hover:bg-white/10 border border-white/15 hover:border-teal-400/40 rounded-2xl px-5 py-3.5 transition-all"
                            >
                                <span className="font-mono font-black text-lg text-white tracking-[0.18em] flex-1 text-left">
                                    {config.couponCode}
                                </span>
                                <span className={`transition-all ${copied ? 'text-teal-400 scale-110' : 'text-white/40 group-hover:text-white/70'}`}>
                                    {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                                </span>
                            </button>
                            {copied && (
                                <p className="text-[11px] text-teal-400 font-bold -mt-2">¡Código copiado! 🎉</p>
                            )}

                            {/* Min order text */}
                            <p className="text-[10px] text-white/30 font-medium -mt-1">
                                {config.minOrderText}
                            </p>

                            {/* CTA */}
                            <button
                                onClick={handleApply}
                                disabled={applied}
                                className={`w-full flex items-center justify-center gap-2 font-black text-sm py-3.5 rounded-2xl transition-all shadow-lg ${
                                    applied
                                        ? 'bg-teal-500 text-white'
                                        : 'bg-white text-slate-900 hover:bg-teal-50 active:scale-[0.98]'
                                }`}
                            >
                                {applied ? (
                                    <>
                                        <CheckCircle2 size={17} />
                                        ¡Cupón aplicado! Abriendo carrito…
                                    </>
                                ) : (
                                    <>
                                        Aplicar descuento ahora
                                        <ArrowRight size={17} />
                                    </>
                                )}
                            </button>

                            {/* Soft dismiss */}
                            <button
                                onClick={handleDismiss}
                                className="text-[11px] text-white/25 hover:text-white/50 transition-colors mt-1"
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
