'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    User,
    ArrowLeft,
    ShoppingBag,
    Calendar,
    MapPin,
    Phone,
    Mail,
    X,
    ExternalLink,
    MessageCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getCustomers } from '@/lib/customers-service';
import { getOrdersByCustomer } from '@/lib/orders-service';
import { Customer } from '@/types/customer';
import { Order, ORDER_STATUS_CONFIG } from '@/types/order';
import { formatCurrency } from '@/lib/checkout-utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ClientesPage() {
    const router = useRouter();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerOrders, setCustomerOrders] = useState<(Order & { id: string })[]>([]);
    const [isLoadingOrders, setIsLoadingOrders] = useState(false);

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        setIsLoading(true);
        try {
            const data = await getCustomers();
            setCustomers(data);
        } catch (error) {
            console.error('Error loading customers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCustomerClick = async (customer: Customer) => {
        setSelectedCustomer(customer);
        setIsLoadingOrders(true);
        try {
            // Try with normalized ID (phone) and also the raw string if different
            // In upsert we strip non-digits. In order we save raw.
            // So we might need to query by the formatted phone stored in customer if available, 
            // or we might miss orders if formatting changed.
            // unique key is ID which is stripped.
            // We need to pass the formatted phone to find orders.
            // Let's assume customer.celular has the formatted version (saved from order).
            const orders = await getOrdersByCustomer(customer.celular);
            setCustomerOrders(orders);
        } catch (error) {
            console.error('Error loading customer orders:', error);
        } finally {
            setIsLoadingOrders(false);
        }
    };

    const filteredCustomers = customers.filter(customer => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        const nombre = (customer.nombre || '').toLowerCase();
        const celular = (customer.celular || '');
        const email = (customer.email || '').toLowerCase();
        const ciudad = (customer.ciudad || '').toLowerCase();

        return (
            nombre.includes(query) ||
            celular.includes(query) ||
            email.includes(query) ||
            ciudad.includes(query)
        );
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Top Bar */}
            <header className="bg-white border-b shadow-sm sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => router.push('/admin')}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft size={20} className="text-gray-600" />
                            </motion.button>
                            <div>
                                <h1 className="text-2xl font-black text-gray-900" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
                                    CLIENTES
                                </h1>
                                <p className="text-sm text-gray-500">{customers.length} clientes registrados</p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={async () => {
                                    setIsLoading(true);
                                    try {
                                        const { syncCustomersFromOrders } = await import('@/lib/customers-service');
                                        const result = await syncCustomersFromOrders();
                                        alert(`Sincronización completada. Procesados: ${result.processed}, Nuevos/Actualizados: ${result.updated}`);
                                        await loadCustomers();
                                    } catch (error) {
                                        console.error('Error syncing:', error);
                                        alert('Error al sincronizar clientes');
                                    } finally {
                                        setIsLoading(false);
                                    }
                                }}
                                className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm flex items-center gap-2"
                            >
                                <ExternalLink size={16} />
                                Sincronizar
                            </motion.button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative max-w-2xl mt-4">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar por nombre, teléfono, email o ciudad..."
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none transition-colors"
                        />
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                        <p className="text-gray-500">Cargando clientes...</p>
                    </div>
                ) : filteredCustomers.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <User className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <h3 className="text-lg font-medium text-gray-900">No se encontraron clientes</h3>
                        <p className="text-gray-500">Intenta con otra búsqueda o espera a que lleguen pedidos.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCustomers.map((customer) => (
                            <motion.div
                                key={customer.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ y: -5 }}
                                onClick={() => handleCustomerClick(customer)}
                                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-red-100 transition-all cursor-pointer group"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-red-50 text-red-600 p-3 rounded-full group-hover:bg-red-600 group-hover:text-white transition-colors">
                                            <User size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-gray-900 line-clamp-1">{customer.nombre}</h3>
                                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                                <MapPin size={12} />
                                                {customer.ciudad}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Phone size={14} />
                                        {customer.celular}
                                    </div>
                                    {customer.email && (
                                        <div className="flex items-center gap-2 text-sm text-gray-600 truncate">
                                            <Mail size={14} />
                                            {customer.email}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Total Gastado</p>
                                        <p className="font-black text-gray-900">{formatCurrency(customer.totalSpent)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500 mb-1">Pedidos</p>
                                        <p className="font-black text-gray-900">{customer.ordersCount}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>

            {/* Customer Detail Modal */}
            <AnimatePresence>
                {selectedCustomer && (
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => setSelectedCustomer(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
                                <div className="flex items-center gap-4">
                                    <div className="bg-red-100 text-red-600 p-3 rounded-full">
                                        <User size={32} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-900">{selectedCustomer.nombre}</h2>
                                        <p className="text-gray-500 flex items-center gap-2 text-sm">
                                            <span>Cliente desde {format(selectedCustomer.createdAt.toDate(), 'MMMM yyyy', { locale: es })}</span>
                                            {selectedCustomer.ordersCount > 1 && (
                                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold">
                                                    Recurrente
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedCustomer(null)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X size={24} className="text-gray-400" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    {/* Sidebar Info */}
                                    <div className="space-y-6">
                                        <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                                            <h3 className="font-bold text-gray-900 uppercase text-xs tracking-wider">Información de Contacto</h3>

                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-xs text-gray-500 mb-1">Celular</p>
                                                    <div className="flex items-center gap-2">
                                                        <Phone size={16} className="text-gray-400" />
                                                        <span className="font-medium">{selectedCustomer.celular}</span>
                                                    </div>
                                                </div>

                                                {selectedCustomer.email && (
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1">Email</p>
                                                        <div className="flex items-center gap-2">
                                                            <Mail size={16} className="text-gray-400" />
                                                            <span className="font-medium break-all">{selectedCustomer.email}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                <div>
                                                    <p className="text-xs text-gray-500 mb-1">Ubicación</p>
                                                    <div className="flex items-start gap-2">
                                                        <MapPin size={16} className="text-gray-400 mt-0.5" />
                                                        <div>
                                                            <span className="block font-medium">{selectedCustomer.direccion}</span>
                                                            <span className="text-sm text-gray-600">{selectedCustomer.ciudad}, {selectedCustomer.departamento}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-gray-200">
                                                <a
                                                    href={`https://wa.me/57${selectedCustomer.celular.replace(/\D/g, '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                                                >
                                                    <MessageCircle size={18} />
                                                    Chat en WhatsApp
                                                </a>
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 rounded-xl p-5 space-y-4">
                                            <h3 className="font-bold text-blue-900 uppercase text-xs tracking-wider">Resumen Financiero</h3>

                                            <div className="flex justify-between items-center">
                                                <span className="text-blue-700 text-sm">Total Gastado</span>
                                                <span className="text-blue-900 font-black text-xl">{formatCurrency(selectedCustomer.totalSpent)}</span>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className="text-blue-700 text-sm">Ticket Promedio</span>
                                                <span className="text-blue-900 font-bold">
                                                    {formatCurrency(selectedCustomer.totalSpent / selectedCustomer.ordersCount)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Orders History */}
                                    <div className="lg:col-span-2">
                                        <h3 className="font-bold text-gray-900 uppercase text-xs tracking-wider mb-4 flex items-center justify-between">
                                            <span>Historial de Pedidos ({customerOrders.length})</span>
                                            {isLoadingOrders && <span className="text-xs text-gray-500 font-normal">Cargando...</span>}
                                        </h3>

                                        {isLoadingOrders ? (
                                            <div className="space-y-3">
                                                {[1, 2, 3].map(i => (
                                                    <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                                                ))}
                                            </div>
                                        ) : customerOrders.length > 0 ? (
                                            <div className="space-y-4">
                                                {customerOrders.map(order => (
                                                    <div key={order.id} className="bg-white border hover:border-red-200 rounded-xl p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`${ORDER_STATUS_CONFIG[order.status].bgColor} p-3 rounded-lg text-2xl`}>
                                                                {ORDER_STATUS_CONFIG[order.status].icon}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="font-bold text-gray-900">Pedido #{order.id.slice(-8)}</span>
                                                                    <span className={`${ORDER_STATUS_CONFIG[order.status].color} bg-opacity-10 text-xs px-2 py-0.5 rounded-full font-bold border border-current`}>
                                                                        {ORDER_STATUS_CONFIG[order.status].label}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-gray-500">
                                                                    {format(order.createdAt.toDate(), "d MMM yyyy, HH:mm", { locale: es })}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pl-14 sm:pl-0">
                                                            <div className="text-right">
                                                                <p className="text-xs text-gray-500">Total</p>
                                                                <p className="font-black text-gray-900">{formatCurrency(order.total)}</p>
                                                            </div>
                                                            {/* We could add a button to view order details here if needed */}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                                <ShoppingBag className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                                                <p className="text-gray-500 text-sm">No se encontraron pedidos para este cliente.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
