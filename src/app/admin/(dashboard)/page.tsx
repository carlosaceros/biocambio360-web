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
    CheckCircle2,
    BarChart3,
    Target,
    Store,
    FlaskConical,
    Award,
    Mail,
    Zap,
    MessageSquare,
    ShieldAlert
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { subscribeToOrders } from '@/lib/orders-service';
import { Order, OrderStatus } from '@/types/order';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import NotificationBell from '@/components/NotificationBell';
import ChangePasswordModal from '@/components/admin/ChangePasswordModal';
import { UserModuleCapabilities, SystemRole, ROLE_DEFINITIONS } from '@/types/user';

export default function AdminDashboard() {
    const { user, userProfile, role, signOut } = useAuth();
    const router = useRouter();
    const { notifications, unreadCount, permissionGranted, markAllAsRead, markAsRead, requestPermission } = useAdminNotifications();
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isSendingReport, setIsSendingReport] = useState(false);
    const [reportToast, setReportToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const handleSendDailyReport = async () => {
        if (!confirm('¿Deseas generar y enviar el reporte consolidado diario a los correos de administración ahora mismo?')) {
            return;
        }
        setIsSendingReport(true);
        try {
            const res = await fetch('/api/cron/daily-alerts');
            const data = await res.json();
            if (res.ok && data.status === 'ok') {
                const formattedTotal = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(data.summary?.todaySales || 0);
                setReportToast({
                    message: `✅ Reporte diario enviado exitosamente: ${data.summary?.todayOrdersCount || 0} pedidos de hoy (${formattedTotal})`,
                    type: 'success'
                });
            } else {
                setReportToast({
                    message: `❌ Error al enviar reporte: ${data.message || 'Error desconocido'}`,
                    type: 'error'
                });
            }
        } catch (err: any) {
            setReportToast({
                message: `❌ Error de conexión: ${err?.message || err}`,
                type: 'error'
            });
        } finally {
            setIsSendingReport(false);
            setTimeout(() => setReportToast(null), 7000);
        }
    };

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
            borrador: 0,
            pendiente: 0,
            confirmado: 0,
            enviado: 0,
            en_camino: 0,
            no_entregado: 0,
            entregado: 0,
            preparacion: 0,
            cancelado: 0
        };

        orders.forEach(order => {
            const orderDate = safeToDate(order.createdAt);
            
            // Only count non-cancelled and non-draft orders for sales metrics
            if (order.status !== 'cancelado' && order.status !== 'borrador') {
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
    const isSuperAdmin = role === 'superadmin';
    const isGestor = !isSuperAdmin;

    // Verificador de capacidades específicas asignadas al usuario
    const hasCap = (capKey: keyof UserModuleCapabilities) => {
        if (isSuperAdmin) return true;
        if (userProfile?.capacidades) {
            return !!userProfile.capacidades[capKey];
        }
        const roleDef = ROLE_DEFINITIONS[role as SystemRole];
        if (roleDef?.defaultCapabilities?.[capKey]) return true;
        if (role === 'asesor') {
            return ['asesores', 'clientes', 'reabastecimiento'].includes(capKey);
        }
        if (role === 'cajero') {
            return ['pos'].includes(capKey);
        }
        if (role === 'produccion_calidad') {
            return ['produccion'].includes(capKey);
        }
        if (role === 'gestor' || role === 'gestor_pedidos' || role === 'logistico' || role === 'logistica') {
            return ['pedidos', 'clientes', 'reabastecimiento', 'envios', 'mensajeria'].includes(capKey);
        }
        if (role === 'mensajero') {
            return ['mensajeria'].includes(capKey);
        }
        return false;
    };

    const roleDisplayName = isSuperAdmin
        ? 'Super Administrador'
        : role === 'asesor'
        ? 'Asesor Comercial'
        : role === 'cajero'
        ? 'Cajero Mostrador'
        : role === 'produccion_calidad'
        ? 'Jefe de Planta'
        : 'Gestor Operativo';

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Top Bar */}
            <header className="bg-white border-b shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 md:gap-4">
                        <Link href="/admin" className="flex items-center group">
                            <img
                                src="/images/logo-biocambio360.png"
                                alt="Biocambio360 Fábrica"
                                className="h-9 sm:h-10 w-auto object-contain transition-transform group-hover:scale-105"
                            />
                        </Link>
                        {isSuperAdmin ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <Shield size={12} className="text-indigo-600" />
                                SUPER ADMIN
                            </span>
                        ) : role === 'asesor' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-200">
                                <Award size={12} className="text-amber-600" />
                                ASESOR COMERCIAL
                            </span>
                        ) : role === 'cajero' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-teal-50 text-teal-800 border border-teal-200">
                                <Store size={12} className="text-teal-600" />
                                CAJERO MOSTRADOR
                            </span>
                        ) : role === 'produccion_calidad' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <FlaskConical size={12} className="text-emerald-600" />
                                PLANTA & CALIDAD
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-800 border border-blue-200">
                                <Shield size={12} className="text-blue-600" />
                                GESTOR OPERATIVO
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

                        {/* Botón Enviar Reporte Diario */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            disabled={isSendingReport}
                            onClick={handleSendDailyReport}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition-colors disabled:opacity-50"
                            title="Enviar Reporte Diario a Administradores"
                        >
                            <Mail size={15} className="text-emerald-600" />
                            <span className="hidden sm:inline">{isSendingReport ? 'Enviando...' : 'Reporte Diario'}</span>
                        </motion.button>

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
                            <p className="text-[10px] text-gray-500 font-medium">{roleDisplayName}</p>
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

            {reportToast && (
                <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4">
                    <div className={`p-4 rounded-xl text-sm font-bold flex items-center justify-between border ${
                        reportToast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
                    }`}>
                        <span>{reportToast.message}</span>
                        <button onClick={() => setReportToast(null)} className="text-xs underline opacity-70 hover:opacity-100 ml-4">Cerrar</button>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">
                {/* ─── VISTA ESPECIAL GESTOR / ASESOR / OPERATIVO ─────────────────── */}
                {isGestor ? (
                    <>
                        {/* Contextual Welcome Banner */}
                        {role === 'asesor' ? (
                            <div className="bg-gradient-to-r from-indigo-800 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <Award size={12} /> ESTACIÓN COMERCIAL
                                        </span>
                                    </div>
                                    <h2 className="text-2xl font-black mb-1">Cockpit de Ventas & Cierre</h2>
                                    <p className="text-sm text-indigo-100">
                                        Registro ágil de pedidos por llamada o WhatsApp, CRM de clientes y seguimiento de comisiones en tiempo real.
                                    </p>
                                </div>
                                <button
                                    onClick={() => router.push('/admin/asesores')}
                                    className="px-5 py-2.5 bg-amber-400 text-slate-950 rounded-xl text-sm font-black hover:bg-amber-300 transition-all shadow flex items-center gap-2 cursor-pointer"
                                >
                                    <Zap size={16} />
                                    Ir al Cockpit de Ventas
                                </button>
                            </div>
                        ) : role === 'cajero' ? (
                            <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-black mb-1">Terminal Punto de Venta POS</h2>
                                    <p className="text-sm text-teal-100">
                                        Facturación rápida en mostrador, arqueo de caja y cobros directos.
                                    </p>
                                </div>
                                <button
                                    onClick={() => router.push('/admin/pos')}
                                    className="px-5 py-2.5 bg-white text-teal-900 rounded-xl text-sm font-black hover:bg-teal-50 transition-all shadow flex items-center gap-2 cursor-pointer"
                                >
                                    <Store size={16} />
                                    Abrir TPV Mostrador
                                </button>
                            </div>
                        ) : (
                            <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-indigo-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-black mb-1">Módulo de Despachos & Logística</h2>
                                    <p className="text-sm text-emerald-100">
                                        Gestión de pedidos, generación de guías 99 Envíos, auditoría de fletes e inventario operativo.
                                    </p>
                                </div>
                                <button
                                    onClick={() => router.push('/admin/pedidos')}
                                    className="px-5 py-2.5 bg-white text-emerald-900 rounded-xl text-sm font-black hover:bg-emerald-50 transition-all shadow flex items-center gap-2 cursor-pointer"
                                >
                                    <Package size={16} />
                                    Ir a Pedidos Pendientes ({stats.pipeline.pendiente + stats.pipeline.confirmado + stats.pipeline.preparacion})
                                </button>
                            </div>
                        )}

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

                        {/* Quick Actions / Capacidades Habilitadas */}
                        <div>
                            <h2 className="text-lg font-black text-gray-900 mb-4">MÓDULOS HABILITADOS PARA TU PERFIL</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* Cockpit Asesores */}
                                {hasCap('asesores') && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => router.push('/admin/asesores')}
                                        className="bg-white rounded-2xl p-5 shadow-sm border-2 border-amber-300 text-left hover:border-amber-500 hover:shadow-md transition-all group ring-1 ring-amber-100"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                                            <Award size={22} />
                                        </div>
                                        <h3 className="text-base font-black text-gray-900 mb-1">Cockpit Asesores</h3>
                                        <p className="text-xs text-gray-500 mb-2">
                                            Toma de pedidos ágil, metas $30M, llamadas y comisiones.
                                        </p>
                                        <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                                            Abrir Cockpit <ArrowUpRight size={14} />
                                        </span>
                                    </motion.button>
                                )}

                                {/* Banco de Guiones & Textos Respuesta 2025 */}
                                {(hasCap('asesores') || hasCap('clientes')) && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => router.push('/admin/banco-textos')}
                                        className="bg-white rounded-2xl p-5 shadow-sm border-2 border-indigo-300 text-left hover:border-indigo-500 hover:shadow-md transition-all group ring-1 ring-indigo-100"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                            <MessageSquare size={22} />
                                        </div>
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="text-base font-black text-gray-900">Banco de Guiones</h3>
                                            <span className="text-[10px] font-black bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-full">Word 2025</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mb-2">
                                            Respuestas comerciales, precios en vivo, objeciones y alertas operativas.
                                        </p>
                                        <span className="text-xs font-bold text-indigo-700 flex items-center gap-1">
                                            Abrir Guiones <ArrowUpRight size={14} />
                                        </span>
                                    </motion.button>
                                )}

                                {/* Pedidos & Guías */}
                                {hasCap('pedidos') && (
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
                                )}

                                {/* Mensajeros & Flota Propia */}
                                {(hasCap('envios') || hasCap('pedidos') || hasCap('mensajeria')) && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => router.push('/admin/mensajeros')}
                                        className="bg-white rounded-2xl p-5 shadow-sm border-2 border-orange-200 text-left hover:border-orange-500 hover:shadow-md transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center mb-3 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                            <Truck size={22} />
                                        </div>
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="text-base font-black text-gray-900">Mensajeros & Flota</h3>
                                            <span className="text-[10px] font-black bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded-full">Bogotá/Sabana</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mb-2">
                                            Rutas locales, control de recaudo COD y liquidación de fletes.
                                        </p>
                                        <span className="text-xs font-bold text-orange-700 flex items-center gap-1">
                                            Gestionar Flota <ArrowUpRight size={14} />
                                        </span>
                                    </motion.button>
                                )}

                                {/* Clientes & CRM */}
                                {hasCap('clientes') && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => router.push('/admin/clientes')}
                                        className="bg-white rounded-2xl p-5 shadow-sm border-2 border-blue-200 text-left hover:border-blue-500 hover:shadow-md transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <Users size={22} />
                                        </div>
                                        <h3 className="text-base font-black text-gray-900 mb-1">Clientes & CRM</h3>
                                        <p className="text-xs text-gray-500 mb-2">
                                            Pipeline de etapas, asignación de cartera y SARLAFT.
                                        </p>
                                        <span className="text-xs font-bold text-blue-700 flex items-center gap-1">
                                            Abrir CRM <ArrowUpRight size={14} />
                                        </span>
                                    </motion.button>
                                )}

                                {/* Reabastecimiento & Recompra */}
                                {hasCap('reabastecimiento') && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => router.push('/admin/reabastecimiento')}
                                        className="bg-white rounded-2xl p-5 shadow-sm border-2 border-rose-200 text-left hover:border-rose-500 hover:shadow-md transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mb-3 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                                            <Clock size={22} />
                                        </div>
                                        <h3 className="text-base font-black text-gray-900 mb-1">Reabastecimiento BI</h3>
                                        <p className="text-xs text-gray-500 mb-2">
                                            Timers de consumo de clientes, recompra y fidelización.
                                        </p>
                                        <span className="text-xs font-bold text-rose-700 flex items-center gap-1">
                                            Ver Alertas <ArrowUpRight size={14} />
                                        </span>
                                    </motion.button>
                                )}

                                {/* Bandeja de Mensajes — WhatsApp / Messenger / Instagram */}
                                {hasCap('mensajeria') && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => router.push('/admin/inbox')}
                                        className="bg-white rounded-2xl p-5 shadow-sm border-2 border-green-300 text-left hover:border-green-500 hover:shadow-md transition-all group ring-1 ring-green-100"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="w-10 h-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center group-hover:bg-green-600 group-hover:text-white transition-colors">
                                                <MessageSquare size={22} />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-base font-black text-gray-900">Bandeja Inbox</h3>
                                            <span className="text-[10px] font-black bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">WhatsApp</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mb-2">
                                            Mensajes en tiempo real. WhatsApp, Messenger e Instagram unificados.
                                        </p>
                                        <span className="text-xs font-bold text-green-700 flex items-center gap-1">
                                            Abrir Bandeja <ArrowUpRight size={14} />
                                        </span>
                                    </motion.button>
                                )}

                                {/* PQRS — peticiones, quejas, reclamos y sugerencias */}
                                {hasCap('mensajeria') && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => router.push('/admin/pqrs')}
                                        className="bg-white rounded-2xl p-5 shadow-sm border-2 border-red-200 text-left hover:border-red-500 hover:shadow-md transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center mb-3 group-hover:bg-red-600 group-hover:text-white transition-colors">
                                            <ShieldAlert size={22} />
                                        </div>
                                        <h3 className="text-base font-black text-gray-900 mb-1">PQRS</h3>
                                        <p className="text-xs text-gray-500 mb-2">
                                            Peticiones, quejas, reclamos y sugerencias recibidos por WhatsApp.
                                        </p>
                                        <span className="text-xs font-bold text-red-700 flex items-center gap-1">
                                            Ver casos <ArrowUpRight size={14} />
                                        </span>
                                    </motion.button>
                                )}

                                {/* Entrenamiento del Agente IA (directores y administradores) */}
                                {hasCap('mensajeria') && (role as string) === 'director' && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => router.push('/admin/entrenamiento-ia')}
                                        className="bg-white rounded-2xl p-5 shadow-sm border-2 border-violet-200 text-left hover:border-violet-500 hover:shadow-md transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center mb-3 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                                            <Zap size={22} />
                                        </div>
                                        <h3 className="text-base font-black text-gray-900 mb-1">Entrenar Agente IA</h3>
                                        <p className="text-xs text-gray-500 mb-2">
                                            Simula conversaciones, corrige respuestas y enséñale reglas del negocio.
                                        </p>
                                        <span className="text-xs font-bold text-violet-700 flex items-center gap-1">
                                            Abrir entrenamiento <ArrowUpRight size={14} />
                                        </span>
                                    </motion.button>
                                )}

                                {/* KPIs del Agente IA y marketing (directores) */}
                                {hasCap('mensajeria') && (role as string) === 'director' && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => router.push('/admin/kpis-ia')}
                                        className="bg-white rounded-2xl p-5 shadow-sm border-2 border-violet-200 text-left hover:border-violet-500 hover:shadow-md transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center mb-3 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                                            <BarChart3 size={22} />
                                        </div>
                                        <h3 className="text-base font-black text-gray-900 mb-1">Tablero de KPIs</h3>
                                        <p className="text-xs text-gray-500 mb-2">
                                            Conversaciones, anuncios, embudo de ventas, asesores y costo del agente.
                                        </p>
                                        <span className="text-xs font-bold text-violet-700 flex items-center gap-1">
                                            Ver KPIs <ArrowUpRight size={14} />
                                        </span>
                                    </motion.button>
                                )}

                                {/* TPV Mostrador Soacha */}
                                {hasCap('pos') && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => router.push('/admin/pos')}
                                        className="bg-white rounded-2xl p-5 shadow-sm border-2 border-emerald-200 text-left hover:border-emerald-500 hover:shadow-md transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                            <Store size={22} />
                                        </div>
                                        <h3 className="text-base font-black text-gray-900 mb-1">TPV Mostrador Soacha</h3>
                                        <p className="text-xs text-gray-500 mb-2">
                                            Cobro táctil rápido, cambio en efectivo y arqueo ciego.
                                        </p>
                                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                                            Abrir TPV <ArrowUpRight size={14} />
                                        </span>
                                    </motion.button>
                                )}

                                {/* Cotizador & Tarifas B2B */}
                                {hasCap('pedidos') && (
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
                                            Gestión de cotizaciones, tarifas institucionales y leads.
                                        </p>
                                        <span className="text-xs font-bold text-teal-700 flex items-center gap-1">
                                            Editar Tarifas & CRM <ArrowUpRight size={14} />
                                        </span>
                                    </motion.button>
                                )}

                                {/* Producción & MRP */}
                                {hasCap('produccion') && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => router.push('/admin/produccion')}
                                        className="bg-white rounded-2xl p-5 shadow-sm border-2 border-teal-200 text-left hover:border-teal-500 hover:shadow-md transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-3 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                                            <FlaskConical size={22} />
                                        </div>
                                        <h3 className="text-base font-black text-gray-900 mb-1">Producción & MRP</h3>
                                        <p className="text-xs text-gray-500 mb-2">
                                            Recetas BOM, lotes INVIMA y control de calidad.
                                        </p>
                                        <span className="text-xs font-bold text-teal-700 flex items-center gap-1">
                                            Ver Planta <ArrowUpRight size={14} />
                                        </span>
                                    </motion.button>
                                )}

                                {/* Auditoría Envíos */}
                                {hasCap('envios') && (
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
                                            Trazabilidad de cotizaciones y tarifas de fletes 99 Envíos.
                                        </p>
                                        <span className="text-xs font-bold text-indigo-700 flex items-center gap-1">
                                            Consultar Envíos <ArrowUpRight size={14} />
                                        </span>
                                    </motion.button>
                                )}

                                {/* Productos & Precios */}
                                {hasCap('pedidos') && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => router.push('/admin/productos')}
                                        className="bg-white rounded-2xl p-5 shadow-sm border-2 border-purple-200 text-left hover:border-purple-500 hover:shadow-md transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-3 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                            <Layers size={22} />
                                        </div>
                                        <h3 className="text-base font-black text-gray-900 mb-1">Productos & Precios</h3>
                                        <p className="text-xs text-gray-500 mb-2">
                                            Gestión de catálogo, stock y precios de venta.
                                        </p>
                                        <span className="text-xs font-bold text-purple-700 flex items-center gap-1">
                                            Ver Catálogo <ArrowUpRight size={14} />
                                        </span>
                                    </motion.button>
                                )}

                                {/* Carritos Abandonados */}
                                {hasCap('pedidos') && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => router.push('/admin/carritos-abandonados')}
                                        className="bg-white rounded-2xl p-5 shadow-sm border-2 border-rose-200 text-left hover:border-rose-500 hover:shadow-md transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mb-3 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                                            <ShoppingCart size={22} />
                                        </div>
                                        <h3 className="text-base font-black text-gray-900 mb-1">Carritos Abandonados</h3>
                                        <p className="text-xs text-gray-500 mb-2">
                                            Recuperación WhatsApp 1-clic y correos automáticos.
                                        </p>
                                        <span className="text-xs font-bold text-rose-700 flex items-center gap-1">
                                            Recuperar Clientes <ArrowUpRight size={14} />
                                        </span>
                                    </motion.button>
                                )}

                                {/* Análisis Financiero */}
                                {hasCap('finanzas') && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => router.push('/admin/finanzas')}
                                        className="bg-white rounded-2xl p-5 shadow-sm border-2 border-emerald-200 text-left hover:border-emerald-500 hover:shadow-md transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                            <TrendingUp size={22} />
                                        </div>
                                        <h3 className="text-base font-black text-gray-900 mb-1">Análisis Financiero</h3>
                                        <p className="text-xs text-gray-500 mb-2">
                                            Histórico por meses, ticket promedio y balances.
                                        </p>
                                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                                            Ver Finanzas <ArrowUpRight size={14} />
                                        </span>
                                    </motion.button>
                                )}

                                {/* Comunidad & Referidos / Cupones */}
                                {hasCap('cupones') && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => router.push('/admin/referidos')}
                                        className="bg-white rounded-2xl p-5 shadow-sm border-2 border-purple-200 text-left hover:border-purple-500 hover:shadow-md transition-all group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-3 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                            <Users size={22} />
                                        </div>
                                        <h3 className="text-base font-black text-gray-900 mb-1">Comunidad & Referidos</h3>
                                        <p className="text-xs text-gray-500 mb-2">
                                            Red de embajadores, cupones y saldos a favor.
                                        </p>
                                        <span className="text-xs font-bold text-purple-700 flex items-center gap-1">
                                            Gestionar Referidos <ArrowUpRight size={14} />
                                        </span>
                                    </motion.button>
                                )}
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
                                    <p className="font-black text-gray-900 mb-1">Clientes & CRM</p>
                                    <p className="text-xs text-gray-600">Pipeline y seguimiento 360°</p>
                                </motion.button>

                                {role === 'superadmin' && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => router.push('/admin/usuarios')}
                                        className="bg-gradient-to-br from-purple-900 to-slate-900 text-white rounded-xl p-6 shadow-md border-2 border-purple-400 text-left hover:border-purple-300 transition-colors"
                                    >
                                        <Shield className="text-purple-300 mb-3" size={24} />
                                        <p className="font-black text-white mb-1">Usuarios & Auditoría ISO</p>
                                        <p className="text-xs text-purple-200">CRUD roles, permisos y bitácora</p>
                                    </motion.button>
                                )}

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => router.push('/admin/informe-ventas')}
                                    className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-xl p-6 shadow-md border-2 border-indigo-400 text-left hover:border-amber-400 transition-colors"
                                >
                                    <BarChart3 className="text-amber-400 mb-3" size={24} />
                                    <p className="font-black text-white mb-1">Informe Ventas a 2026</p>
                                    <p className="text-xs text-indigo-200">Metas, Asesores y POS (Power BI)</p>
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => router.push('/admin/pos')}
                                    className="bg-white rounded-xl p-6 shadow-md border border-gray-100 text-left hover:border-emerald-200 transition-colors"
                                >
                                    <Store className="text-emerald-600 mb-3" size={24} />
                                    <p className="font-black text-gray-900 mb-1">TPV Mostrador Soacha</p>
                                    <p className="text-xs text-gray-600">Punto de venta táctil y arqueo ciego</p>
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => router.push('/admin/inbox')}
                                    className="bg-white rounded-xl p-6 shadow-md border-2 border-green-300 text-left hover:border-green-500 transition-colors ring-1 ring-green-100"
                                >
                                    <MessageSquare className="text-green-600 mb-3" size={24} />
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-black text-gray-900">Bandeja Inbox</p>
                                        <span className="text-[10px] font-black bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">WhatsApp</span>
                                    </div>
                                    <p className="text-xs text-gray-600">Mensajes en tiempo real. WhatsApp, Messenger e Instagram unificados.</p>
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => router.push('/admin/pqrs')}
                                    className="bg-white rounded-xl p-6 shadow-md border-2 border-red-200 text-left hover:border-red-400 transition-colors"
                                >
                                    <ShieldAlert className="text-red-600 mb-3" size={24} />
                                    <p className="font-black text-gray-900 mb-1">PQRS</p>
                                    <p className="text-xs text-gray-600">Peticiones, quejas, reclamos y sugerencias por WhatsApp.</p>
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => router.push('/admin/entrenamiento-ia')}
                                    className="bg-white rounded-xl p-6 shadow-md border-2 border-violet-200 text-left hover:border-violet-400 transition-colors"
                                >
                                    <Zap className="text-violet-600 mb-3" size={24} />
                                    <p className="font-black text-gray-900 mb-1">Entrenar Agente IA</p>
                                    <p className="text-xs text-gray-600">Simulador, correcciones y reglas del negocio.</p>
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => router.push('/admin/kpis-ia')}
                                    className="bg-white rounded-xl p-6 shadow-md border-2 border-violet-200 text-left hover:border-violet-400 transition-colors"
                                >
                                    <BarChart3 className="text-violet-600 mb-3" size={24} />
                                    <p className="font-black text-gray-900 mb-1">KPIs Agente IA y Marketing</p>
                                    <p className="text-xs text-gray-600">Embudo, anuncios, asesores, intenciones y costo.</p>
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => router.push('/admin/asesores')}
                                    className="bg-white rounded-xl p-6 shadow-md border border-gray-100 text-left hover:border-amber-200 transition-colors"
                                >
                                    <Award className="text-amber-600 mb-3" size={24} />
                                    <p className="font-black text-gray-900 mb-1">Cockpit Asesores</p>
                                    <p className="text-xs text-gray-600">Gamificación y metas $30M</p>
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => router.push('/admin/produccion')}
                                    className="bg-white rounded-xl p-6 shadow-md border border-gray-100 text-left hover:border-teal-200 transition-colors"
                                >
                                    <FlaskConical className="text-teal-600 mb-3" size={24} />
                                    <p className="font-black text-gray-900 mb-1">Producción & MRP</p>
                                    <p className="text-xs text-gray-600">Recetas BOM y trazabilidad INVIMA</p>
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

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => router.push('/admin/carritos-abandonados')}
                                    className="bg-white rounded-xl p-6 shadow-md border border-gray-100 text-left hover:border-rose-200 transition-colors"
                                >
                                    <ShoppingCart className="text-rose-600 mb-3" size={24} />
                                    <p className="font-black text-gray-900 mb-1">Carritos Abandonados</p>
                                    <p className="text-xs text-gray-600">Recuperación WhatsApp 1-clic y correos</p>
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => router.push('/admin/finanzas')}
                                    className="bg-white rounded-xl p-6 shadow-md border border-gray-100 text-left hover:border-emerald-200 transition-colors"
                                >
                                    <TrendingUp className="text-emerald-600 mb-3" size={24} />
                                    <p className="font-black text-gray-900 mb-1">Histórico & Análisis Financiero</p>
                                    <p className="text-xs text-gray-600">Histórico de meses, AOV, fletes y CSV</p>
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => router.push('/admin/referidos')}
                                    className="bg-white rounded-xl p-6 shadow-md border border-gray-100 text-left hover:border-purple-200 transition-colors"
                                >
                                    <Users className="text-purple-600 mb-3" size={24} />
                                    <p className="font-black text-gray-900 mb-1">Comunidad & Referidos</p>
                                    <p className="text-xs text-gray-600">Embajadores, métricas CAC y saldos</p>
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
