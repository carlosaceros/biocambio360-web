'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RecentPurchaseItem {
    id: string;
    customerName: string;
    location: string;
    productName: string;
    productSize: string;
    productSlug: string;
    timeAgo: string;
    imgFile?: string;
}

export default function RecentSalesNotification() {
    const pathname = usePathname();
    const [purchases, setPurchases] = useState<RecentPurchaseItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);
    const [imgFailed, setImgFailed] = useState(false);
    const isPausedRef = useRef(false);

    // Disable completely on checkout or admin pages
    const isHiddenRoute = pathname?.startsWith('/checkout') || pathname?.startsWith('/admin');

    useEffect(() => {
        if (isHiddenRoute) return;

        let isMounted = true;
        fetch('/api/recent-purchases')
            .then(res => res.json())
            .then(data => {
                if (isMounted && data?.purchases?.length > 0) {
                    // Pick a random starting index so notifications alternate differently on each session
                    const randomStart = Math.floor(Math.random() * data.purchases.length);
                    setCurrentIndex(randomStart);
                    setPurchases(data.purchases);
                }
            })
            .catch(() => {});

        return () => {
            isMounted = false;
        };
    }, [isHiddenRoute]);

    // Reset image error state on each purchase change
    useEffect(() => {
        setImgFailed(false);
    }, [currentIndex]);

    // Self-sustaining notification cycle: shows 1 notification every 35 seconds
    useEffect(() => {
        if (isDismissed || isHiddenRoute || purchases.length === 0) return;

        let active = true;
        let hideTimer: NodeJS.Timeout | null = null;
        let nextTimer: NodeJS.Timeout | null = null;

        const scheduleNext = (delayMs: number) => {
            if (!active) return;
            nextTimer = setTimeout(() => {
                if (!active) return;
                showNotification();
            }, delayMs);
        };

        const showNotification = () => {
            if (!active) return;
            setIsVisible(true);

            let elapsed = 0;
            const VISIBLE_DURATION = 6000; // Visible for 6 seconds
            const TICK = 500;

            const checkHide = () => {
                if (!active) return;
                // Keep showing if user is hovering over notification
                if (isPausedRef.current) {
                    hideTimer = setTimeout(checkHide, TICK);
                    return;
                }

                elapsed += TICK;
                if (elapsed >= VISIBLE_DURATION) {
                    setIsVisible(false);
                    // Rotate to the next purchase in the list
                    setCurrentIndex(prev => (prev + 1) % purchases.length);
                    // Schedule next notification in 35 seconds
                    scheduleNext(35000);
                } else {
                    hideTimer = setTimeout(checkHide, TICK);
                }
            };

            hideTimer = setTimeout(checkHide, TICK);
        };

        // First notification appears after 4 seconds of entering the page
        const initialTimer = setTimeout(showNotification, 4000);

        return () => {
            active = false;
            clearTimeout(initialTimer);
            if (hideTimer) clearTimeout(hideTimer);
            if (nextTimer) clearTimeout(nextTimer);
        };
    }, [purchases.length, isDismissed, isHiddenRoute]);

    if (isHiddenRoute || isDismissed || purchases.length === 0) {
        return null;
    }

    const currentItem = purchases[currentIndex];
    if (!currentItem) return null;

    const handleDismiss = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsVisible(false);
        setIsDismissed(true);
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    onMouseEnter={() => { isPausedRef.current = true; }}
                    onMouseLeave={() => { isPausedRef.current = false; }}
                    className="fixed bottom-4 left-4 z-40 max-w-[340px] sm:max-w-[380px]"
                >
                    <Link
                        href={`/producto/${currentItem.productSlug}`}
                        className="group flex items-start gap-3 p-3.5 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xl hover:shadow-2xl hover:border-blue-400 transition-all text-slate-800 relative overflow-hidden"
                    >
                        {/* Subtle top indicator line */}
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-500" />

                        {/* Product Thumbnail or Icon */}
                        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0 overflow-hidden relative group-hover:scale-105 transition-transform bg-white">
                            {currentItem.imgFile && !imgFailed ? (
                                <img
                                    src={currentItem.imgFile}
                                    alt={currentItem.productName}
                                    className="w-full h-full object-contain p-1"
                                    onError={() => setImgFailed(true)}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-600">
                                    <ShoppingBag size={20} />
                                </div>
                            )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                                <span className="text-slate-900 font-black truncate">{currentItem.customerName}</span>
                                <span>•</span>
                                <span className="text-slate-600 truncate">{currentItem.location}</span>
                            </div>

                            <p className="text-xs font-black text-slate-900 mt-0.5 leading-snug line-clamp-1 group-hover:text-blue-600 transition-colors">
                                Compró {currentItem.productName}
                            </p>

                            <div className="mt-1 flex items-center gap-2 text-[10px]">
                                <span className="bg-blue-50 text-blue-700 font-extrabold px-2 py-0.5 rounded-md">
                                    {currentItem.productSize}
                                </span>
                                <span className="text-slate-400 font-medium">
                                    {currentItem.timeAgo}
                                </span>
                                <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                                    <CheckCircle2 size={11} className="text-emerald-500" /> Verificada
                                </span>
                            </div>
                        </div>

                        {/* Close button */}
                        <button
                            onClick={handleDismiss}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors absolute top-2 right-2"
                            aria-label="Cerrar notificación"
                        >
                            <X size={14} />
                        </button>
                    </Link>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
