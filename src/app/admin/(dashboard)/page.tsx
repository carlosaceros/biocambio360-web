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
    Ticket,
    Building2,
    Clock,
    Key,
    Shield,
    Eye,
    Layers,
    CheckCircle2
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { subscribeToOrders } from '@/lib/orders-service';
import { Order, OrderStatus } from '@/types/order';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import NotificationBell from '@/components/NotificationBell';
import ChangePasswordModal from '@/components/admin/ChangePasswordModal';

export default function AdminDashboard() {
    const { user, userProfile, role, signOut } = useAuth();
    const router = useRouter();
    const { notifications, unreadCount, permissionGranted, markAllAsRead, markAsRead, requestPermission } = useAdminNotifications();
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

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
                conversion: 4.2,
                conversionChange: '+0%',
                ltv: 124000,
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

    const email = user?.email?.toLowerCase().trim();
    const isSuperAdmin = (role === 'superadmin' || email === 'thinktic.thinktic@gmail.com') && email !== 'infobiocambio360@gmail.com';
    const isGestor = !isSuperAdmin;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Top Bar */}
            <header className="bg-white border-b shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 md:gap-4">
                        <h1 className="text-xl md:text-2xl font-black text-gray-900" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
                            BIOCAMBIO360
                        </h1>
                        {isGestor ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Shield size={12} className="text-emerald-600" />
                                GESTOR DE PEDIDOS
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <Shield size={12} className="text-indigo-600" />
                                SUPER ADMIN
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        <NotificationBell
                            notifications={notifications}
                            unreadCount={unreadCount}
                            permissionGranted={permissionGranted}
                            onMarkAllRead={markAllAsRead}
                            onMarkRead={markAsRead}
                            onRequestPermission={requestPermission}
                        />

                        {/* Botón Cambiar Contraseña */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsPasswordModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition-colors"
                            title="Modificar mi contraseña"
                        >
                            <Key size={15} className="text-indigo-600" />
                            <span className="hidden sm:inline">Cambiar Clave</span>
                        </motion.button>

                        <div className="text-right hidden lg:block">
                            <p className="text-xs font-bold text-gray-900 truncate max-w-[200px]">{user?.email}</p>
                            <p className="text-[10px] text-gray-500 font-medium">{isGestor ? 'Gestor Logístico' : 'Super Administrador'}</p>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleSignOut}
                            className="p-2 hover:bg-red-50 text-gray-600 hover:text-red-600 rounded-xl border border-transparent hover:border-red-100 transition-colors"
                            title="Cerrar Sesión"
                        >
                            <LogOut size={18} />
                        </motion.button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">
                {/* ─── VISTA ESPECIAL GESTOR DE PEDIDOS ────────────────────────── */}
                {isGestor ? (
                    <>
                        {/* Welcome Banner */}
                        <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-indigo-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-black mb-1">Módulo de Despachos & Logística</h2>
                                <p className="text-sm text-emerald-100">
                                    Gestión de pedidos, generación de guías 99 Envíos, auditoría de fletes e inventario operativo.
                                </p>
                            </div>
                            <button
                                onClick={() => router.push('/admin/pedidos')}
                                className="px-5 py-2.5 bg-white text-emerald-900 rounded-xl text-sm font-black hover:bg-emerald-50 transition-all shadow flex items-center gap-2"
                            >
                                <Package size={16} />
                                Ir a Pedidos Pendientes ({stats.pipeline.pendiente + stats.pipeline.confirmado + stats.pipeline.preparacion})
                            </button>
                        </div>

                        {/* Operational Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                <p className="text-xs text-gray-400 font-bold uppercase">Pedidos Hoy</p>
                                <p className="text-3xl font-black text-gray-900 mt-1">{stats.today.orders}</p>
                                <p className="text-xs text-emerald-600 font-bold mt-1">Registrados en la fecha</p>
                            </div>
                            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                <p className="text-xs text-gray-400 font-bold uppercase">Pendientes / Prep</p>
                                <p className="text-3xl font-black text-amber-600 mt-1">
                                    {stats.pipeline.pendiente + stats.pipeline.preparacion}
                                </p>
                                <p className="text-xs text-amber-600 font-bold mt-1">Por embalar y despachar</p>
                            </div>
                            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                <p className="text-xs text-gray-400 font-bold uppercase">Enviados / En Camino</p>
                                <p className="text-3xl font-black text-purple-600 mt-1">
                                    {stats.pipeline.enviado + stats.pipeline.en_camino}
                                </p>
                                <p className="text-xs text-purple-600 font-bold mt-1">En tránsito con guía</p>
                            </div>
                            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                <p className="text-xs text-gray-400 font-bold uppercase">Entregados (Total)</p>
                                <p className="text-3xl font-black text-green-600 mt-1">{stats.pipeline.entregado}</p>
                                <p className="text-xs text-green-600 font-bold mt-1">Completados con éxito</p>
                            </div>
                        </div>

                        {/* Order Pipeline */}
                        <div>
                            <h2 className="text-lg font-black text-gray-900 mb-4">ESTADO DE FLUJO DE PEDIDOS</h2>
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    <div className="text-center p-3 bg-yellow-50/80 rounded-xl border border-yellow-100">
                                        <p className="text-2xl font-black text-yellow-800">{stats.pipeline.pendiente}</p>
                                        <p className="text-xs text-yellow-700 font-bold mt-1">Pendiente</p>
                                    </div>
                                    <div className="text-center p-3 bg-indigo-50/80 rounded-xl border border-indigo-100">
                                        <p className="text-2xl font-black text-indigo-800">{stats.pipeline.preparacion}</p>
                                        <p className="text-xs text-indigo-700 font-bold mt-1">En Preparación</p>
                                    </div>
                                    <div className="text-center p-3 bg-purple-50/80 rounded-xl border border-purple-100">
                                        <p className="text-2xl font-black text-purple-800">{stats.pipeline.enviado}</p>
                                        <p className="text-xs text-purple-700 font-bold mt-1">Enviado</p>
                                    </div>
                                    <div className="text-center p-3 bg-orange-50/80 rounded-xl border border-orange-100">
                                        <p className="text-2xl font-black text-orange-800">{stats.pipeline.en_camino}</p>
                                        <p className="text-xs text-orange-700 font-bold mt-1">En Camino</p>
                                    </div>
                                    <div className="text-center p-3 bg-green-50/80 rounded-xl border border-green-100">
                                        <p className="text-2xl font-black text-green-800">{stats.pipeline.entregado}</p>
                                        <p className="text-xs text-green-700 font-bold mt-1">Entregado</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Gestor Quick Actions */}
                        <div>
                            <h2 className="text-lg font-black text-gray-900 mb-4">MÓDULOS HABILITADOS</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => router.push('/admin/pedidos')}
                                    className="bg-white rounded-2xl p-5 shadow-sm border-2 border-emerald-200 text-left hover:border-emerald-500 hover:shadow-md transition-all group"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                        <Package size={22} />
                                    </div>
                                    <h3 className="text-base font-black text-gray-900 mb-1">Pedidos & Guías</h3>
                                    <p className="text-xs text-gray-500 mb-2">
                                        Kanban de órdenes y emisión de guías 99 Envíos.
                                    </p>
                                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                                        Acceso Total <ArrowUpRight size={14} />
                                    </span>
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => router.push('/admin/cotizaciones-b2b')}
                                    className="bg-white rounded-2xl p-5 shadow-sm border-2 border-teal-200 text-left hover:border-teal-500 hover:shadow-md transition-all group"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-3 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                                        <Building2 size={22} />
                                    </div>
                                    <h3 className="text-base font-black text-gray-900 mb-1">Cotizador & Tarifas B2B</h3>
                                    <p className="text-xs text-gray-500 mb-2">
                                        Gestión de cotizaciones, tarifas de sectores y edición.
                                    </p>
                                    <span className="text-xs font-bold text-teal-700 flex items-center gap-1">
                                        Editar Tarifas & CRM <ArrowUpRight size={14} />
                                    </span>
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => router.push('/admin/auditoria-envios')}
                                    className="bg-white rounded-2xl p-5 shadow-sm border-2 border-indigo-200 text-left hover:border-indigo-500 hover:shadow-md transition-all group"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        <Activity size={22} />
                                    </div>
                                    <h3 className="text-base font-black text-gray-900 mb-1">Auditoría Envíos</h3>
                                    <p className="text-xs text-gray-500 mb-2">
                                        Trazabilidad de cotizaciones y tarifas de fletes.
                                    </p>
                                    <span className="text-xs font-bold text-indigo-700 flex items-center gap-1">
                                        Solo Consulta <ArrowUpRight size={14} />
                                    </span>
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => router.push('/admin/inventario')}
                                    className="bg-white rounded-2xl p-5 shadow-sm border-2 border-purple-200 text-left hover:border-purple-500 hover:shadow-md transition-all group"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-3 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                        <Eye size={22} />
                                    </div>
                                    <h3 className="text-base font-black text-gray-900 mb-1">Inventario Stock</h3>
                                    <p className="text-xs text-gray-500 mb-2">
                                        Vista de catálogo, stock y precios oficiales.
                                    </p>
                                    <span className="text-xs font-bold text-purple-700 flex items-center gap-1">
                                        Solo Vista <ArrowUpRight size={14} />
                                    </span>
                                </motion.button>
                            </div>
                        </div>
                    </>
                ) : (
                    /* ─── VISTA SUPER ADMINISTRADOR (THINK TIC) ─────────────────────── */
                    <>
                        {/* Period Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Today */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-bold opacity-90">VENTAS HOY</h2>
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
                                    <h2 className="text-lg font-bold opacity-90">VENTAS ESTE MES</h2>
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
                        <div>
                            <h2 className="text-lg font-black text-gray-900 mb-4">MÉTRICAS CRÍTICAS</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <div>
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
                                    <p className="font-black text-gray-900 mb-1">Productos & Edición</p>
                                    <p className="text-xs text-gray-600">Catálogo maestro y precios</p>
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

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => router.push('/admin/cotizaciones-b2b')}
                                    className="bg-white rounded-xl p-6 shadow-md border border-gray-100 text-left hover:border-teal-200 transition-colors"
                                >
                                    <Building2 className="text-teal-600 mb-3" size={24} />
                                    <p className="font-black text-gray-900 mb-1">Cotizaciones B2B</p>
                                    <p className="text-xs text-gray-600">Embudo CRM & leads de empresas</p>
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => router.push('/admin/reabastecimiento')}
                                    className="bg-white rounded-xl p-6 shadow-md border border-gray-100 text-left hover:border-red-200 transition-colors"
                                >
                                    <Clock className="text-red-600 mb-3" size={24} />
                                    <p className="font-black text-gray-900 mb-1">Reabastecimiento BI</p>
                                    <p className="text-xs text-gray-600">Timers de consumo B2C y B2B</p>
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => router.push('/admin/inventario')}
                                    className="bg-white rounded-xl p-6 shadow-md border border-gray-100 text-left hover:border-purple-200 transition-colors"
                                >
                                    <Eye className="text-purple-600 mb-3" size={24} />
                                    <p className="font-black text-gray-900 mb-1">Inventario Solo Vista</p>
                                    <p className="text-xs text-gray-600">Vista rápida operativa de stock</p>
                                </motion.button>
                            </div>
                        </div>
                    </>
                )}
            </main>

            {/* Modal Cambiar Contraseña */}
            <ChangePasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
            />
        </div>
    );
}
