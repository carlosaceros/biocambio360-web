'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, BellRing, ShoppingCart, CreditCard, Clock, AlertTriangle, CheckCircle2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminNotification } from '@/hooks/useAdminNotifications';
import { useRouter } from 'next/navigation';

interface NotificationBellProps {
    notifications: AdminNotification[];
    unreadCount: number;
    permissionGranted: boolean;
    onMarkAllRead: () => void;
    onMarkRead: (id: string) => void;
    onRequestPermission: () => void;
}

function timeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Hace un momento';
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)}h`;
    return date.toLocaleDateString('es-CO');
}

const getNotificationStyle = (type: AdminNotification['type']) => {
    switch (type) {
        case 'payment_confirmed':
            return {
                icon: <CheckCircle2 size={15} />,
                bg: 'bg-emerald-100 text-emerald-700',
                dot: 'bg-emerald-500',
                rowBg: 'hover:bg-emerald-50/40'
            };
        case 'payment_declined':
            return {
                icon: <AlertTriangle size={15} />,
                bg: 'bg-red-100 text-red-700',
                dot: 'bg-red-500',
                rowBg: 'hover:bg-red-50/40'
            };
        case 'payment_pending':
            return {
                icon: <Clock size={15} />,
                bg: 'bg-amber-100 text-amber-700',
                dot: 'bg-amber-500',
                rowBg: 'hover:bg-amber-50/40'
            };
        case 'new_order':
        default:
            return {
                icon: <ShoppingCart size={15} />,
                bg: 'bg-blue-100 text-blue-700',
                dot: 'bg-blue-500',
                rowBg: 'hover:bg-blue-50/40'
            };
    }
};

export default function NotificationBell({
    notifications,
    unreadCount,
    permissionGranted,
    onMarkAllRead,
    onMarkRead,
    onRequestPermission,
}: NotificationBellProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = (notif: AdminNotification) => {
        onMarkRead(notif.id);
        setIsOpen(false);
        router.push('/admin/pedidos');
    };

    return (
        <div ref={dropdownRef} className="relative">
            {/* Bell Button */}
            <button
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen && unreadCount > 0) {
                        // Mark all as read when opening
                    }
                }}
                className="relative p-2 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 hover:border-gray-200"
                title="Notificaciones"
            >
                <AnimatePresence mode="wait">
                    {unreadCount > 0 ? (
                        <motion.div
                            key="ringing"
                            animate={{ rotate: [0, -15, 15, -10, 10, -5, 5, 0] }}
                            transition={{ repeat: Infinity, repeatDelay: 3, duration: 0.6 }}
                        >
                            <BellRing size={20} className="text-amber-500" />
                        </motion.div>
                    ) : (
                        <motion.div key="still">
                            <Bell size={20} className="text-gray-500" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Badge */}
                <AnimatePresence>
                    {unreadCount > 0 && (
                        <motion.span
                            key="badge"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center"
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </motion.span>
                    )}
                </AnimatePresence>
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                            <div className="flex items-center gap-2">
                                <Bell size={16} className="text-gray-600" />
                                <span className="font-semibold text-sm text-gray-800">Notificaciones</span>
                                {unreadCount > 0 && (
                                    <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                                        {unreadCount} nuevas
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={onMarkAllRead}
                                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        Leer todas
                                    </button>
                                )}
                                <button onClick={() => setIsOpen(false)}>
                                    <X size={16} className="text-gray-400 hover:text-gray-600" />
                                </button>
                            </div>
                        </div>

                        {/* Permission prompt */}
                        {!permissionGranted && (
                            <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between gap-3">
                                <p className="text-xs text-amber-700">
                                    Activa las notificaciones del navegador para alertas en tiempo real
                                </p>
                                <button
                                    onClick={onRequestPermission}
                                    className="text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded-lg whitespace-nowrap transition-colors"
                                >
                                    Activar
                                </button>
                            </div>
                        )}

                        {/* List */}
                        <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                            {notifications.length === 0 ? (
                                <div className="py-10 text-center">
                                    <Bell size={32} className="text-gray-200 mx-auto mb-2" />
                                    <p className="text-sm text-gray-400">Sin notificaciones aún</p>
                                    <p className="text-xs text-gray-300 mt-1">Los nuevos pedidos aparecerán aquí</p>
                                </div>
                            ) : (
                                notifications.map((notif) => {
                                    const style = getNotificationStyle(notif.type);

                                    return (
                                        <button
                                            key={notif.id}
                                            onClick={() => handleNotificationClick(notif)}
                                            className={`w-full text-left px-4 py-3 transition-colors flex items-start gap-3 ${style.rowBg} ${!notif.read ? 'bg-slate-50 font-medium' : ''}`}
                                        >
                                            {/* Icon */}
                                            <div className={`mt-0.5 p-2 rounded-xl flex-shrink-0 ${style.bg}`}>
                                                {style.icon}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-xs font-black text-gray-900 truncate">
                                                        {notif.title}
                                                    </p>
                                                    {!notif.read && (
                                                        <span className={`w-2 h-2 rounded-full ${style.dot} flex-shrink-0`} />
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-600 mt-0.5 line-clamp-2 leading-relaxed">
                                                    {notif.body}
                                                </p>
                                                <p className="text-[10px] font-bold text-gray-400 mt-1">
                                                    {timeAgo(notif.timestamp)}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                                <button
                                    onClick={() => { router.push('/admin/pedidos'); setIsOpen(false); }}
                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium w-full text-center"
                                >
                                    Ver todos los pedidos →
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
