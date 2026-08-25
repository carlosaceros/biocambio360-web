'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Package, MapPin, Phone, MessageCircle, Home } from 'lucide-react';
import { formatCurrency } from '@/lib/checkout-utils';
import { useCart } from '@/lib/cart-context';
import Link from 'next/link';

interface Order {
    id: string;
    cliente: {
        nombre: string;
        cedula: string;
        celular: string;
        email?: string;
        departamento: string;
        ciudad: string;
        direccion: string;
        notas?: string;
    };
    productos: any[];
    subtotal: number;
    envio: number;
    total: number;
    metodoPago: string;
    estado: string;
    createdAt: string;
    cuponAplicado?: {
        code: string;
        type: string;
        value: number;
        discountAmount: number;
    };
}

export default function ConfirmacionPage({ params }: { params: Promise<{ orderId: string }> }) {
    const router = useRouter();
    const { clearCart } = useCart();
    const [order, setOrder] = useState<Order | null>(null);
    const [orderId, setOrderId] = useState<string>('');

    useEffect(() => {
        params.then(({ orderId }) => {
            setOrderId(orderId);
            // Get order from sessionStorage
            const orderData = sessionStorage.getItem(`order_${orderId}`);

            if (!orderData) {
                router.push('/');
                return;
            }

            const parsedOrder = JSON.parse(orderData);
            setOrder(parsedOrder);

            // Clear cart after successful order
            clearCart();
        });
    }, [params, router, clearCart]);

    if (!order) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-4 text-gray-600">
                    <div className="w-12 h-12 border-4 border-gray-200 border-t-[var(--brand-blue)] rounded-full animate-spin"></div>
                    <p className="font-bold">Cargando detalles del pedido...</p>
                </div>
            </div>
        );
    }

    const whatsappMessage = `Hola! Acabo de hacer un pedido (${orderId}) por ${formatCurrency(order.total)} y quiero confirmar los detalles.`;
    const whatsappUrl = `https://wa.me/573241005353?text=${encodeURIComponent(whatsappMessage)}`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-gray-50 py-12">
            <div className="max-w-3xl mx-auto px-4">
                {/* Success Animation */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="text-center mb-8"
                >
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-green-500 rounded-full mb-4">
                        <CheckCircle className="text-white" size={56} />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-2" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
                        ¡PEDIDO RECIBIDO!
                    </h1>
                    <p className="text-gray-600 text-lg">
                        {order.metodoPago === 'wompi'
                            ? 'Estamos confirmando tu pago. Pronto recibirás noticias.'
                            : 'Tu pedido ha sido recibido exitosamente'}
                    </p>
                </motion.div>

                {/* Order Details */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-6"
                >
                    {/* Order ID */}
                    <div className="bg-gradient-to-r from-[var(--brand-blue-50)] to-[var(--brand-pink-50)] border-2 border-[var(--brand-blue)]/20 rounded-xl p-4 mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Número de Orden</p>
                                <p className="text-2xl font-black text-gray-900">{orderId}</p>
                            </div>
                            <Package className="text-[var(--brand-blue)]" size={40} />
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div className="mb-6">
                        <h2 className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
                            <MapPin className="text-blue-600" size={20} />
                            Información de Envío
                        </h2>
                        <div className="bg-gray-100 rounded-lg p-4 space-y-2 text-sm text-gray-800 border-2 border-gray-200">
                            <p><span className="font-bold">Nombre:</span> {order.cliente.nombre}</p>
                            <p><span className="font-bold">Cédula:</span> {order.cliente.cedula}</p>
                            <p><span className="font-bold">Celular:</span> {order.cliente.celular}</p>
                            {order.cliente.email && (
                                <p><span className="font-bold">Email:</span> {order.cliente.email}</p>
                            )}
                            <p><span className="font-bold">Dirección:</span> {order.cliente.direccion}</p>
                            <p><span className="font-bold">Ciudad:</span> {order.cliente.ciudad}, {order.cliente.departamento}</p>
                            {order.cliente.notas && (
                                <p><span className="font-bold">Notas:</span> {order.cliente.notas}</p>
                            )}
                        </div>
                    </div>

                    {/* Products */}
                    <div className="mb-6">
                        <h2 className="text-lg font-black text-gray-900 mb-3">Productos</h2>
                        <div className="space-y-2">
                            {order.productos.map((item, index) => (
                                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <div>
                                        <p className="font-bold text-gray-900">{item.product.nombre} {item.size}</p>
                                        <p className="text-sm text-gray-600">Cantidad: {item.cantidad}</p>
                                    </div>
                                    <p className="font-bold">{formatCurrency(item.price * item.cantidad)}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="border-t pt-4 space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Subtotal</span>
                            <span className="font-bold">{formatCurrency(order.subtotal)}</span>
                        </div>
                        {order.cuponAplicado && (
                            <div className="flex justify-between items-center text-sm text-purple-800 font-bold bg-purple-50 p-2.5 rounded-lg border border-purple-200">
                                <span>
                                    🎟️ Descuento Cupón ({order.cuponAplicado.code})
                                    {order.cuponAplicado.type === 'percentage' && ` -${order.cuponAplicado.value}%`}
                                </span>
                                <span className="font-black text-purple-900">
                                    -{formatCurrency(order.cuponAplicado.discountAmount || (order.subtotal - order.total + order.envio))}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-gray-600">Envío</span>
                            <span className="font-bold text-green-600">
                                {order.envio === 0 ? 'GRATIS' : formatCurrency(order.envio)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center border-t pt-2 mt-2">
                            <span className="text-xl font-black">Total</span>
                            <span className="text-2xl font-black text-[var(--brand-blue)]">{formatCurrency(order.total)}</span>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <div className={`mt-6 border-2 rounded-xl p-4 ${order.metodoPago === 'wompi' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                        }`}>
                        <p className="text-sm font-bold text-gray-700 mb-1">Método de Pago</p>
                        <p className="text-gray-900 font-black">
                            {order.metodoPago === 'wompi' ? '💳 Pago en Línea (Wompi)' : '💵 Pago Contraentrega'}
                        </p>
                        <p className="text-xs text-gray-600 mt-2">
                            {order.metodoPago === 'wompi'
                                ? 'Tu pago está siendo procesado o ya fue confirmado. Te notificaremos cualquier novedad.'
                                : 'Pagarás al recibir tu pedido. Puedes pagar en efectivo o transferencia Nequi.'}
                        </p>
                    </div>
                </motion.div>

                {/* Next Steps */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-6"
                >
                    <h2 className="text-xl font-black text-gray-900 mb-4">Próximos Pasos</h2>
                    <div className="space-y-3">
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-[var(--brand-blue-50)] rounded-full flex items-center justify-center">
                                <span className="font-black text-[var(--brand-blue)]">1</span>
                            </div>
                            <div>
                                <p className="font-bold text-gray-900">Confirmación por WhatsApp</p>
                                <p className="text-sm text-gray-600">Te contactaremos para confirmar tu pedido y coordinar la entrega</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-[var(--brand-blue-50)] rounded-full flex items-center justify-center">
                                <span className="font-black text-[var(--brand-blue)]">2</span>
                            </div>
                            <div>
                                <p className="font-bold text-gray-900">Preparación del Pedido</p>
                                <p className="text-sm text-gray-600">Prepararemos tu pedido con cuidado (1-2 días hábiles)</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-[var(--brand-blue-50)] rounded-full flex items-center justify-center">
                                <span className="font-black text-[var(--brand-blue)]">3</span>
                            </div>
                            <div>
                                <p className="font-bold text-gray-900">Envío y Entrega</p>
                                <p className="text-sm text-gray-600">Recibirás tu pedido en 3-7 días hábiles según tu ubicación</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <motion.a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                        <MessageCircle size={20} />
                        CONTACTAR POR WHATSAPP
                    </motion.a>
                    <motion.a
                        href="/"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-900 font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        <Home size={20} />
                        VOLVER AL INICIO
                    </motion.a>
                </div>

                {/* Confirmation Mini Footer */}
                <div className="mt-12 text-center text-xs text-gray-400 space-y-1.5 pb-6">
                    <p>© 2026 Biocambio360 S.A.S. Todos los derechos reservados.</p>
                    <p className="flex items-center justify-center gap-1.5 flex-wrap text-xs text-gray-500 font-medium">
                        <span>Diseñado y desarrollado con amor por</span>
                        <a 
                            href="https://thinktic.co" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="font-bold text-gray-700 hover:text-orange-600 underline decoration-orange-500/60 hover:decoration-orange-500 transition-colors"
                        >
                            THINK TIC
                        </a>
                        <span className="text-orange-500">🧡</span>
                        <span>🇨🇴</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
