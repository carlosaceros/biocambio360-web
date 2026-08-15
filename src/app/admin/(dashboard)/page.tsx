'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    TrendingUp,
    ShoppingCart,
    Users,
    DollarSign,
    Package,
    ArrowUpRight,
    LogOut,
    Truck,
    Activity,
    Ticket
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { subscribeToOrders } from '@/lib/orders-service';
import { Order, OrderStatus } from '@/types/order';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import NotificationBell from '@/components/NotificationBell';

export default function AdminDashboard() {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const { notifications, unreadCount, permissionGranted, markAllAsRead, markAsRead, requestPermission } = useAdminNotifications();

    const handleSignOut = async () => {
        await signOut();
        router.push('/admin/login');
    };

    const [orders, setOrders] = useState<(Order & { id: string })[]>([]);

    useEffect(() => {
        const unsubscribe = subscribeToOrders((fetchedOrders) => {
            setOrders(fetchedOrders);
        });
        return unsubscribe;
    }, []);

    // Helper to safely convert firestore timestamps
    const safeToDate = (timestamp: any): Date => {
        if (!timestamp) return new Date();
        if (typeof timestamp.toDate === 'function') return timestamp.toDate();
        if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
        if (typeof timestamp === 'string' || typeof timestamp === 'number') return new Date(timestamp);
        return new Date();
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    const isThisMonth = (date: Date) => {
        const today = new Date();
        return date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    // Calculate dynamic stats
    const calculateStats = () => {
        let todaySales = 0;
        let todayOrdersCount = 0;
        let monthSales = 0;
        let monthOrdersCount = 0;
        
        const statusCounts: Record<OrderStatus, number> = {
            pendiente: 0,
            confirmado: 0,
            enviado: 0,
            en_camino: 0,
            entregado: 0,
            preparacion: 0,
            cancelado: 0
        };

        orders.forEach(order => {
            const orderDate = safeToDate(order.createdAt);
            
            // Only count non-cancelled orders for sales metrics
            if (order.status !== 'cancelado') {
                if (isToday(orderDate)) {
                    todaySales += order.total;
                    todayOrdersCount++;
                }
                
                if (isThisMonth(orderDate)) {
                    monthSales += order.total;
                    monthOrdersCount++;
                }
            }

            // Count pipelines
            if (statusCounts[order.status] !== undefined) {
                statusCounts[order.status]++;
            }
        });

        // Avg Ticket calculation (this month)
        const avgTicket = monthOrdersCount > 0 ? (monthSales / monthOrdersCount) : 0;
        
        return {
            today: {
                sales: todaySales,
                orders: todayOrdersCount,
                change: '+0%'
            },
            month: {
                sales: monthSales,
                orders: monthOrdersCount,
                change: '+0%'
            },
            metrics: {
                avgTicket: avgTicket,
                avgTicketChange: '+0%',
                conversion: 4.2, // Need traffic data for true conversion
                conversionChange: '+0%',
                ltv: 124000, // Complex metric, keeping mock for now
                ltvChange: '+0%'
            },
            pipeline: statusCounts
        };
    };

    const stats = calculateStats();

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(value);
    };

    const formatNumber = (value: number) => {
        return new Intl.NumberFormat('es-CO').format(value);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Top Bar */}
            <header className="bg-white border-b shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-black text-gray-900" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
                            BIOCAMBIO360 ADMIN
                        </h1>
                        <span className="hidden md:inline-block text-sm text-gray-500">
                            Dashboard Ejecutivo
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <NotificationBell
                            notifications={notifications}
                            unreadCount={unreadCount}
                            permissionGranted={permissionGranted}
                            onMarkAllRead={markAllAsRead}
                            onMarkRead={markAsRead}
                            onRequestPermission={requestPermission}
                        />
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                            <p className="text-xs text-gray-500">Administrador</p>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleSignOut}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <LogOut size={20} className="text-gray-600" />
                        </motion.button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
                {/* Period Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Today */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold opacity-90">HOY</h2>
                            <div className="bg-white/20 backdrop-blur rounded-lg px-3 py-1">
                                <span className="text-sm font-black">{stats.today.change}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-4xl font-black">{formatCurrency(stats.today.sales)}</p>
                            <p className="text-blue-100">{stats.today.orders} pedidos</p>
                        </div>
                    </motion.div>

                    {/* Month */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold opacity-90">ESTE MES</h2>
                            <div className="bg-white/20 backdrop-blur rounded-lg px-3 py-1">
                                <span className="text-sm font-black">{stats.month.change}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-4xl font-black">{formatCurrency(stats.month.sales)}</p>
                            <p className="text-green-100">{stats.month.orders} pedidos</p>
                        </div>
                    </motion.div>
                </div>

                {/* Key Metrics */}
                <div className="mb-8">
                    <h2 className="text-lg font-black text-gray-900 mb-4">MÉTRICAS CRÍTICAS</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Avg Ticket */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-xl p-6 shadow-md border border-gray-100"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Ticket Promedio</p>
                                    <p className="text-2xl font-black text-gray-900">{formatCurrency(stats.metrics.avgTicket)}</p>
                                </div>
                                <div className="bg-green-100 rounded-lg p-2">
                                    <TrendingUp className="text-green-600" size={20} />
                                </div>
                            </div>
                            <p className="text-xs text-green-600 font-bold">{stats.metrics.avgTicketChange} vs mes anterior</p>
                        </motion.div>

                        {/* Conversion Rate */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white rounded-xl p-6 shadow-md border border-gray-100"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Tasa Conversión</p>
                                    <p className="text-2xl font-black text-gray-900">{stats.metrics.conversion}%</p>
                                </div>
                                <div className="bg-blue-100 rounded-lg p-2">
                                    <ShoppingCart className="text-blue-600" size={20} />
                                </div>
                            </div>
                            <p className="text-xs text-green-600 font-bold">{stats.metrics.conversionChange} vs mes anterior</p>
                        </motion.div>

                        {/* LTV */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 }}
                            className="bg-white rounded-xl p-6 shadow-md border border-gray-100"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">LTV Cliente</p>
                                    <p className="text-2xl font-black text-gray-900">{formatCurrency(stats.metrics.ltv)}</p>
                                </div>
                                <div className="bg-purple-100 rounded-lg p-2">
                                    <Users className="text-purple-600" size={20} />
                                </div>
                            </div>
                            <p className="text-xs text-green-600 font-bold">{stats.metrics.ltvChange} vs mes anterior</p>
                        </motion.div>
                    </div>
                </div>

                {/* Order Pipeline */}
                <div className="mb-8">
                    <h2 className="text-lg font-black text-gray-900 mb-4">PIPELINE DE PEDIDOS</h2>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="bg-white rounded-xl p-6 shadow-md border border-gray-100"
                    >
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="text-center">
                                <div className="bg-yellow-100 text-yellow-700 rounded-lg py-3 px-4 mb-2">
                                    <p className="text-2xl font-black">{stats.pipeline.pendiente}</p>
                                </div>
                                <p className="text-xs text-gray-600 font-medium">Pendiente</p>
                            </div>
                            <div className="text-center flex gap-1 justify-center">
                                <div className="text-center">
                                    <div className="bg-blue-100 text-blue-700 rounded-lg py-3 px-4 mb-2">
                                        <p className="text-2xl font-black">{stats.pipeline.confirmado}</p>
                                    </div>
                                    <p className="text-xs text-gray-600 font-medium w-full truncate">Confir.</p>
                                </div>
                                <div className="text-center">
                                    <div className="bg-indigo-100 text-indigo-700 rounded-lg py-3 px-4 mb-2">
                                        <p className="text-2xl font-black">{stats.pipeline.preparacion}</p>
                                    </div>
                                    <p className="text-xs text-gray-600 font-medium w-full truncate">Prep.</p>
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="bg-purple-100 text-purple-700 rounded-lg py-3 px-4 mb-2">
                                    <p className="text-2xl font-black">{stats.pipeline.enviado}</p>
                                </div>
                                <p className="text-xs text-gray-600 font-medium">Enviado</p>
                            </div>
                            <div className="text-center">
                                <div className="bg-orange-100 text-orange-700 rounded-lg py-3 px-4 mb-2">
                                    <p className="text-2xl font-black">{stats.pipeline.en_camino}</p>
                                </div>
                                <p className="text-xs text-gray-600 font-medium">En Camino</p>
                            </div>
                            <div className="text-center">
                                <div className="bg-green-100 text-green-700 rounded-lg py-3 px-4 mb-2">
                                    <p className="text-2xl font-black">{stats.pipeline.entregado}</p>
                                </div>
                                <p className="text-xs text-gray-600 font-medium">Entregado</p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Quick Actions */}
                <div>
                    <h2 className="text-lg font-black text-gray-900 mb-4">ACCESOS RÁPIDOS</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => router.push('/admin/pedidos')}
                            className="bg-white rounded-xl p-6 shadow-md border border-gray-100 text-left hover:border-red-200 transition-colors"
                        >
                            <Package className="text-red-600 mb-3" size={24} />
                            <p className="font-black text-gray-900 mb-1">Gestionar Pedidos</p>
                            <p className="text-xs text-gray-600">Ver y actualizar estados</p>
                        </motion.button>
                        
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => router.push('/admin/productos')}
                            className="bg-white rounded-xl p-6 shadow-md border border-gray-100 text-left hover:border-red-200 transition-colors"
                        >
                            <Package className="text-purple-600 mb-3" size={24} />
                            <p className="font-black text-gray-900 mb-1">Inventario</p>
                            <p className="text-xs text-gray-600">Catálogo de productos</p>
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => router.push('/admin/clientes')}
                            className="bg-white rounded-xl p-6 shadow-md border border-gray-100 text-left hover:border-blue-200 transition-colors">
                            <Users className="text-blue-600 mb-3" size={24} />
                            <p className="font-black text-gray-900 mb-1">Clientes</p>
                            <p className="text-xs text-gray-600">Base de datos completa</p>
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => router.push('/admin/cupones')}
                            className="bg-white rounded-xl p-6 shadow-md border border-gray-100 text-left hover:border-red-200 transition-colors"
                        >
                            <Ticket className="text-red-600 mb-3" size={24} />
                            <p className="font-black text-gray-900 mb-1">Cupones & Ruleta</p>
                            <p className="text-xs text-gray-600">Promociones y reglas 2026</p>
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => router.push('/admin/envios')}
                            className="bg-white rounded-xl p-6 shadow-md border border-gray-100 text-left hover:border-orange-200 transition-colors"
                        >
                            <Truck className="text-orange-500 mb-3" size={24} />
                            <p className="font-black text-gray-900 mb-1">Zonas de Envío</p>
                            <p className="text-xs text-gray-600">Tarifas y cobertura por ciudad</p>
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => router.push('/admin/auditoria-envios')}
                            className="bg-white rounded-xl p-6 shadow-md border border-gray-100 text-left hover:border-indigo-200 transition-colors"
                        >
                            <Activity className="text-indigo-600 mb-3" size={24} />
                            <p className="font-black text-gray-900 mb-1">Auditoría Envíos</p>
                            <p className="text-xs text-gray-600">Logs en tiempo real API 99Envíos</p>
                        </motion.button>
                    </div>
                </div>

                {/* Coming Soon */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="mt-8 text-center"
                >
                    <p className="text-gray-400 text-sm">
                        🚀 Próximamente: Order Management Kanban, Customer Intelligence, AI Assistant y más...
                    </p>
                </motion.div>
            </main>
        </div>
    );
}
