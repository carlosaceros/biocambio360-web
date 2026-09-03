'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Package, MapPin, Phone, MessageCircle, Home } from 'lucide-react';
import { formatCurrency } from '@/lib/checkout-utils';
import { useCart } from '@/lib/cart-context';
import { trackPurchase } from '@/lib/meta-pixel';
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
    const [wompiStatus, setWompiStatus] = useState<string | null>(null);
    const [referralCode, setReferralCode] = useState<string>('');
    const [copiedLink, setCopiedLink] = useState<boolean>(false);

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

            // Look up or auto-register ambassador profile to get official code
            if (parsedOrder.cliente?.celular) {
                const cleanPhone = parsedOrder.cliente.celular.replace(/\D/g, '');
                if (cleanPhone.length >= 10) {
                    fetch(`/api/referrals/lookup?phone=${cleanPhone}`)
                        .then(res => res.json())
                        .then(data => {
                            if (data?.exists && data?.profile?.code) {
                                setReferralCode(data.profile.code);
                            } else {
                                fetch('/api/referrals/register', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        nombre: parsedOrder.cliente.nombre || 'Cliente',
                                        celular: cleanPhone,
                                        cedula: parsedOrder.cliente.cedula || '000000',
                                        ciudad: parsedOrder.cliente.ciudad || 'Colombia',
                                        email: parsedOrder.cliente.email || ''
                                    })
                                })
                                .then(r => r.json())
                                .then(regData => {
                                    if (regData?.profile?.code) {
                                        setReferralCode(regData.profile.code);
                                    }
                                })
                                .catch(err => console.warn('[Confirmacion] Error auto-registering referral:', err));
                            }
                        })
                        .catch(err => console.warn('[Confirmacion] Error looking up referral code:', err));
                }
            }

            // If Wompi was used, check/reconcile status with Wompi API
            if (parsedOrder.metodoPago === 'wompi' && typeof window !== 'undefined') {
                const searchParams = new URLSearchParams(window.location.search);
                const txId = searchParams.get('id');
                
                fetch(`/api/admin/wompi-status?orderId=${orderId}${txId ? `&transactionId=${txId}` : ''}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data?.wompiTransaction?.status) {
                            setWompiStatus(data.wompiTransaction.status);
                        }
                    })
                    .catch(err => console.warn('[Confirmacion] Wompi status check error:', err));
            }

            // Meta Pixel: Track Purchase (Deduplicated with sessionStorage per orderId)
            try {
                const trackedKey = `pixel_purchased_${orderId}`;
                if (typeof window !== 'undefined' && !sessionStorage.getItem(trackedKey)) {
                    const rawItems = Array.isArray(parsedOrder.productos)
                        ? parsedOrder.productos
                        : Object.values(parsedOrder.productos || {});

                    const contentIds = rawItems.map((i: any) => 
                        i.product?.sku || `${i.product?.id || i.id || 'PROD'}-${i.size || 'STD'}`
                    );
                    const numItems = rawItems.reduce((sum: number, item: any) => sum + (Number(item.cantidad) || 1), 0);

                    trackPurchase({
                        content_ids: contentIds,
                        content_type: 'product',
                        currency: 'COP',
                        value: parsedOrder.subtotal || (parsedOrder.total - (parsedOrder.envio || 0)) || parsedOrder.total,
                        num_items: numItems,
                        order_id: orderId,
                        userData: {
                            email: parsedOrder.cliente?.email || undefined,
                            phone: parsedOrder.cliente?.celular || undefined,
                            name: parsedOrder.cliente?.nombre || undefined,
                            city: parsedOrder.cliente?.ciudad || undefined,
                        },
                    });

                    sessionStorage.setItem(trackedKey, 'true');
                }
            } catch (pErr) {
                console.warn('[Meta Pixel] Error tracking purchase:', pErr);
            }

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

    const isWompiApproved = wompiStatus === 'APPROVED';
    const isWompiDeclined = wompiStatus === 'DECLINED' || wompiStatus === 'ERROR' || wompiStatus === 'VOIDED';

    const customerFirstName = order.cliente?.nombre?.trim().split(' ')[0]?.toUpperCase().replace(/[^A-Z0-9]/g, '') || 'BIO';
    const cleanCustomerPhone = order.cliente?.celular?.replace(/\D/g, '') || '';
    const customerPhoneSuffix = cleanCustomerPhone.slice(-3) || '360';
    const activeReferralCode = referralCode || `${customerFirstName}${customerPhoneSuffix}`;
    const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://biocambio360.com';
    const referralShareUrl = `${originUrl}/?ref=${activeReferralCode}`;
    const referralWhatsappText = `¡Hola! Te recomiendo Biocambio360, compran directo a fábrica productos de aseo concentrados biodegradables. Entra con mi enlace y te dan $10.000 COP de descuento en tu primera compra: ${referralShareUrl}`;
    const referralWhatsappUrl = `https://wa.me/?text=${encodeURIComponent(referralWhatsappText)}`;

    const handleCopyReferralLink = async () => {
        let success = false;
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(referralShareUrl);
                success = true;
            }
        } catch (clipErr) {
            console.warn('[Confirmacion] navigator.clipboard error:', clipErr);
        }

        if (!success) {
            try {
                const tempInput = document.createElement('textarea');
                tempInput.value = referralShareUrl;
                tempInput.setAttribute('readonly', '');
                tempInput.style.position = 'fixed';
                tempInput.style.top = '0';
                tempInput.style.left = '0';
                tempInput.style.opacity = '0';
                document.body.appendChild(tempInput);
                tempInput.focus();
                tempInput.select();
                document.execCommand('copy');
                document.body.removeChild(tempInput);
                success = true;
            } catch (execErr) {
                console.warn('[Confirmacion] execCommand copy error:', execErr);
            }
        }

        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 3000);
    };

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
                    <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ${
                        isWompiDeclined ? 'bg-red-500' : 'bg-green-500'
                    }`}>
                        <CheckCircle className="text-white" size={56} />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-2" style={{ fontFamily: '"Archivo Black", sans-serif' }}>
                        {isWompiApproved 
                            ? '¡PAGO CONFIRMADO CON ÉXITO!' 
                            : isWompiDeclined 
                                ? 'PAGO NO COMPLETADO' 
                                : '¡PEDIDO RECIBIDO!'}
                    </h1>
                    <p className="text-gray-600 text-lg">
                        {order.metodoPago === 'wompi'
                            ? isWompiApproved
                                ? 'Tu pago ha sido acreditado correctamente en Wompi. Ya estamos preparando tu despacho.'
                                : isWompiDeclined
                                    ? 'La entidad financiera rechazó la transacción. Puedes intentar nuevamente o pagar contraentrega.'
                                    : 'Estamos confirmando tu pago en línea. Pronto recibirás noticias.'
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

                {/* Referral & Ambassador Share Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 rounded-2xl shadow-xl p-6 md:p-8 mb-6 text-white relative overflow-hidden border border-indigo-700/50"
                >
                    <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-pink-500/10 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-400/30 text-pink-300 text-xs font-black uppercase tracking-wider mb-3">
                            🎁 Comunidad BioCambio360
                        </div>
                        <h2 className="text-xl md:text-2xl font-black mb-2">
                            ¡Regala $10.000 COP y Gana $10.000 COP para tu próximo pedido!
                        </h2>
                        <p className="text-sm text-gray-300 mb-5 leading-relaxed">
                            Comparte tu enlace exclusivo con amigos o familiares. Ellos obtienen <strong className="text-white">$10.000 COP de descuento</strong> en su primera compra y tú acumulas <strong className="text-emerald-400">$10.000 COP en saldo monedero</strong> apenas su pedido sea entregado.
                        </p>

                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 mb-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="text-left w-full sm:w-auto">
                                <p className="text-[11px] uppercase tracking-wider text-gray-400 font-bold">Tu Enlace de Embajador:</p>
                                <p className="text-sm font-mono font-bold text-amber-300 truncate max-w-xs sm:max-w-md">
                                    {referralShareUrl}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleCopyReferralLink}
                                className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-md ${
                                    copiedLink 
                                        ? 'bg-emerald-500 text-white ring-2 ring-emerald-300 scale-105' 
                                        : 'bg-white/20 hover:bg-white/30 text-white'
                                }`}
                            >
                                {copiedLink ? (
                                    <>
                                        <span>✅</span>
                                        <span>¡Enlace Copiado!</span>
                                    </>
                                ) : (
                                    <>
                                        <span>📋</span>
                                        <span>Copiar Enlace</span>
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <a
                                href={referralWhatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3.5 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm cursor-pointer"
                            >
                                <MessageCircle size={18} />
                                Compartir en WhatsApp con 1 Clic
                            </a>
                            <Link
                                href={`/comunidad?phone=${encodeURIComponent(cleanCustomerPhone)}`}
                                className="px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs flex items-center justify-center transition-colors border border-white/10 hover:border-white/25"
                            >
                                Ver Mi Espacio de Embajador →
                            </Link>
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
