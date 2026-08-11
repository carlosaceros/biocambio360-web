'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ToastProps {
    message: string;
    productName?: string;
    size?: string;
    show: boolean;
    onClose: () => void;
}

export default function Toast({ message, productName, size, show, onClose }: ToastProps) {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [show, onClose]);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: -100, scale: 0.3 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                    transition={{
                        type: "spring",
                        damping: 15,
                        stiffness: 300
                    }}
                    className="fixed top-24 right-4 z-[100] max-w-sm"
                >
                    <div className="bg-white rounded-2xl shadow-2xl border-2 border-[var(--brand-blue)] p-4 flex items-start gap-3">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 500 }}
                        >
                            <CheckCircle className="text-[var(--brand-blue)] shrink-0" size={28} />
                        </motion.div>
                        <div className="flex-1 min-w-0">
                            <p className="font-extrabold text-[var(--brand-dark)] text-sm mb-1">
                                ¡Agregado al carrito!
                            </p>
                            {productName && (
                                <p className="text-xs text-gray-600">
                                    <span className="font-bold">{productName}</span>
                                    {size && <span className="text-gray-400"> - {size}</span>}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
