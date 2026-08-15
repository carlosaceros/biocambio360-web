'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, TruckIcon, Factory, Percent, Droplet } from 'lucide-react';

const MESSAGES = [
    {
        icon: Percent,
        textFull: 'Ahorra hasta 60% vs marcas comerciales',
        textMobile: 'Ahorra hasta 60%',
        color: 'text-[var(--brand-success)]'
    },
    {
        icon: TruckIcon,
        textFull: '🎁 10% OFF en 1ra compra con cupón PRIMERAZO10',
        textMobile: '10% OFF 1ra compra',
        color: 'text-[var(--brand-blue)]'
    },
    {
        icon: Factory,
        textFull: 'Calidad premium directo de fábrica',
        textMobile: 'Directo de fábrica',
        color: 'text-[var(--brand-pink)]'
    },
    {
        icon: Droplet,
        textFull: 'Productos concentrados que rinden 3x más',
        textMobile: 'Rinde 3x más',
        color: 'text-[var(--brand-blue)]'
    },
    {
        icon: Sparkles,
        textFull: 'Más de 1,000 familias confían en nosotros',
        textMobile: '+1,000 familias',
        color: 'text-[var(--brand-pink)]'
    }
];

export default function HeaderMessage() {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % MESSAGES.length);
        }, 4000);

        return () => clearInterval(interval);
    }, []);

    const currentMessage = MESSAGES[currentIndex];
    const Icon = currentMessage.icon;

    return (
        <div className="flex items-center justify-center gap-2 min-w-0 flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center gap-2"
                >
                    <Icon className={`w-4 h-4 md:w-5 md:h-5 ${currentMessage.color} flex-shrink-0`} />
                    {/* Mobile text */}
                    <span className="text-xs font-bold text-[var(--brand-dark)] md:hidden">
                        {currentMessage.textMobile}
                    </span>
                    {/* Desktop text */}
                    <span className="hidden md:block text-sm lg:text-base font-semibold text-[var(--brand-dark)]">
                        {currentMessage.textFull}
                    </span>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
