'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, 
    Gift, 
    ArrowRight, 
    CheckCircle2, 
    Copy, 
    Share2, 
    Wallet, 
    ShoppingBag, 
    Search,
    Sparkles,
    MessageCircle,
    HelpCircle
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { formatCurrency } from '@/lib/checkout-utils';
import { ReferralProfile, ReferralTier } from '@/types/referral';
import Link from 'next/link';

export default function ComunidadPage() {
    const [searchPhone, setSearchPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [profile, setProfile] = useState<ReferralProfile | null>(null);
    const [searched, setSearched] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);

    // Registro rápido si no existe
    const [isRegistering, setIsRegistering] = useState(false);
    const [regName, setRegName] = useState('');
    const [regCedula, setRegCedula] = useState('');
    const [regCity, setRegCity] = useState('');
    const [regSuccess, setRegSuccess] = useState('');

    // Redención de saldo
    const [isRedeeming, setIsRedeeming] = useState(false);
    const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);
    const [redeemError, setRedeemError] = useState<string | null>(null);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const clean = searchPhone.replace(/\D/g, '');
        if (clean.length < 10) {
            setErrorMessage('Ingresa un número de celular válido de 10 dígitos.');
            return;
        }

        setIsLoading(true);
        setErrorMessage('');
        setProfile(null);
        setSearched(true);
        setRedeemSuccess(null);
        setRedeemError(null);

        try {
            const res = await fetch(`/api/referrals/lookup?phone=${clean}`);
            const data = await res.json();
            if (data.exists && data.profile) {
                setProfile(data.profile);
            } else {
                setErrorMessage('No encontramos un perfil de embajador con este celular. ¡Regístrate gratis a continuación!');
            }
        } catch (err: any) {
            setErrorMessage('Error al consultar. Inténtalo de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        const clean = searchPhone.replace(/\D/g, '');
        if (!regName.trim() || clean.length < 10) {
            setErrorMessage('Por favor completa nombre y celular.');
            return;
        }

        setIsLoading(true);
        setErrorMessage('');
        try {
            const res = await fetch('/api/referrals/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: regName.trim(),
                    celular: clean,
                    cedula: regCedula.trim() || '000000',
                    ciudad: regCity.trim() || 'Colombia'
                })
            });
            const data = await res.json();
            if (data.success && data.profile) {
                setProfile(data.profile);
                setIsRegistering(false);
                setRegSuccess('¡Bienvenido a la Comunidad BioCambio360! Tu código ya está activo.');
            } else {
                setErrorMessage(data.message || 'Error al registrar.');
            }
        } catch (err: any) {
            setErrorMessage('Error al registrar.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyLink = () => {
        if (!profile) return;
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://biocambio360-web.vercel.app';
        const link = `${origin}/?ref=${profile.code}`;
        navigator.clipboard.writeText(link);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2500);
    };

    const handleRedeemBalance = async () => {
        if (!profile || profile.balanceAvailable < 10000) return;
        setIsRedeeming(true);
        setRedeemSuccess(null);
        setRedeemError(null);

        try {
            const res = await fetch('/api/referrals/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: profile.celular,
                    amount: profile.balanceAvailable
                })
            });
            const data = await res.json();
            if (data.success && data.couponCode) {
                setRedeemSuccess(`¡Cupón generado! Usa el código ${data.couponCode} en tu carrito.`);
                setProfile({
                    ...profile,
                    balanceRedeemed: profile.balanceRedeemed + profile.balanceAvailable,
                    balanceAvailable: 0
                });
            } else {
                setRedeemError(data.message || 'No se pudo redimir el saldo.');
            }
        } catch (err: any) {
            setRedeemError('Error al procesar la redención.');
        } finally {
            setIsRedeeming(false);
        }
    };

    const getTierBadge = (tier: ReferralTier) => {
        switch (tier) {
            case 'embajador':
                return { label: 'Embajador VIP 🏆', color: 'bg-amber-100 text-amber-900 border-amber-300' };
            case 'aliado':
                return { label: 'Aliado Frecuente ⭐', color: 'bg-indigo-100 text-indigo-900 border-indigo-300' };
            default:
                return { label: 'Cliente Referidor 🌱', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
        }
    };

    const shareUrl = profile && typeof window !== 'undefined' 
        ? `${window.location.origin}/?ref=${profile.code}` 
        : 'https://biocambio360-web.vercel.app';
    const whatsappMsg = `¡Hola! Te recomiendo Biocambio360, compran directo a fábrica productos de aseo concentrados biodegradables. Entra con mi enlace y te dan $10.000 COP de descuento en tu primer pedido: ${shareUrl}`;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <Header />

            {/* Hero Section */}
            <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 text-white py-14 px-4 sm:px-6">
                <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none"></div>
                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-black uppercase tracking-wider mb-4 border border-blue-400/30">
                        <Sparkles size={14} className="text-amber-400" />
                        Comunidad BioCambio360
                    </span>
                    <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">
                        Gana hasta <span className="text-emerald-400">$10.000 COP</span> por cada compra de tus recomendados
                    </h1>
                    <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto mb-8 leading-relaxed">
                        Recomienda insumos de limpieza y aseo concentrados directo de fábrica. Tus conocidos obtienen <strong>$10.000 COP de descuento</strong> en su primera compra y tú acumulas <strong>saldo para tus próximos pedidos</strong>.
                    </p>

                    {/* Buscador / Acceso con Celular */}
                    <div className="max-w-md mx-auto bg-white/10 backdrop-blur-md p-2 sm:p-2.5 rounded-2xl border border-white/20 shadow-2xl">
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="tel"
                                    value={searchPhone}
                                    onChange={(e) => setSearchPhone(e.target.value)}
                                    placeholder="Ingresa tu celular (ej. 3201234567)"
                                    className="w-full px-4 py-3 bg-white text-gray-900 rounded-xl text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500 placeholder-gray-400"
                                    maxLength={10}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm rounded-xl transition-all shadow-md flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <Search size={16} />
                                        <span>Consultar</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {errorMessage && (
                        <p className="mt-3 text-sm text-pink-300 font-bold">{errorMessage}</p>
                    )}
                    {regSuccess && (
                        <p className="mt-3 text-sm text-emerald-300 font-bold">{regSuccess}</p>
                    )}
                </div>
            </section>

            {/* Main Content Area */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 flex-1 w-full">
                {/* Si ya encontró el perfil de embajador */}
                <AnimatePresence>
                    {profile && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-gray-200 mb-10"
                        >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                                <div>
                                    <div className="flex items-center gap-2.5 mb-1">
                                        <h2 className="text-2xl font-black text-gray-900">Hola, {profile.nombre}</h2>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${getTierBadge(profile.tier).color}`}>
                                            {getTierBadge(profile.tier).label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 font-medium">
                                        Celular: {profile.celular} • Miembro desde {new Date((profile.createdAt as any)?.seconds ? (profile.createdAt as any).seconds * 1000 : Date.now()).toLocaleDateString('es-CO')}
                                    </p>
                                </div>

                                <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl text-center sm:text-right">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 block">Tu Código Único</span>
                                    <span className="text-lg font-black font-mono text-blue-900">{profile.code}</span>
                                </div>
                            </div>

                            {/* Tarjetas de Saldos */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
                                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 mb-1">
                                        <Wallet size={15} /> Saldo Disponible
                                    </span>
                                    <p className="text-2xl font-black text-emerald-900">{formatCurrency(profile.balanceAvailable)}</p>
                                    <p className="text-[11px] text-emerald-600 font-medium mt-1">Listo para redimir en compras</p>
                                </div>

                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                                    <span className="text-xs font-bold text-amber-700 flex items-center gap-1.5 mb-1">
                                        ⏳ Saldo Pendiente
                                    </span>
                                    <p className="text-2xl font-black text-amber-900">{formatCurrency(profile.balancePending)}</p>
                                    <p className="text-[11px] text-amber-600 font-medium mt-1">Se libera al entregar el pedido</p>
                                </div>

                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                                        <ShoppingBag size={15} /> Pedidos Exitosos
                                    </span>
                                    <p className="text-2xl font-black text-slate-900">{profile.totalDeliveredOrders}</p>
                                    <p className="text-[11px] text-slate-500 font-medium mt-1">De {profile.totalReferredOrders} referidos totales</p>
                                </div>
                            </div>

                            {/* Acciones de Redención */}
                            {profile.balanceAvailable >= 10000 && (
                                <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div>
                                        <h4 className="font-black text-base">¡Tienes saldo disponible para usar!</h4>
                                        <p className="text-xs text-emerald-100">Convierte tu saldo en un cupón de descuento para aplicar en tu próximo pedido.</p>
                                    </div>
                                    <button
                                        onClick={handleRedeemBalance}
                                        disabled={isRedeeming}
                                        className="px-5 py-2.5 bg-white text-emerald-800 font-black rounded-xl text-xs hover:bg-emerald-50 transition-all shadow-md shrink-0 cursor-pointer disabled:opacity-50"
                                    >
                                        {isRedeeming ? 'Generando cupón...' : `Redimir ${formatCurrency(profile.balanceAvailable)}`}
                                    </button>
                                </div>
                            )}

                            {redeemSuccess && (
                                <div className="mb-6 p-4 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-sm flex items-center gap-2">
                                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                                    <span>{redeemSuccess}</span>
                                </div>
                            )}

                            {redeemError && (
                                <div className="mb-6 p-4 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 font-bold text-sm">
                                    {redeemError}
                                </div>
                            )}

                            {/* Compartir por WhatsApp y Enlace */}
                            <div className="bg-slate-900 text-white rounded-2xl p-6 relative overflow-hidden">
                                <h3 className="text-lg font-black mb-2 flex items-center gap-2">
                                    <Share2 size={18} className="text-blue-400" />
                                    Tu Enlace Personal de Recomendación
                                </h3>
                                <p className="text-xs text-gray-300 mb-4 leading-relaxed">
                                    Tus amigos reciben automáticamente su descuento al ingresar con este link. Tú ganas apenas reciban su compra.
                                </p>

                                <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
                                    <div className="flex-1 bg-white/10 rounded-xl px-4 py-3 font-mono text-xs text-amber-300 truncate border border-white/10">
                                        {shareUrl}
                                    </div>
                                    <button
                                        onClick={handleCopyLink}
                                        className="px-4 py-3 bg-white/20 hover:bg-white/30 text-white text-xs font-black rounded-xl transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                                    >
                                        {copySuccess ? <CheckCircle2 size={15} className="text-emerald-400" /> : <Copy size={15} />}
                                        <span>{copySuccess ? '¡Copiado!' : 'Copiar Link'}</span>
                                    </button>
                                </div>

                                <a
                                    href={`https://wa.me/?text=${encodeURIComponent(whatsappMsg)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3.5 px-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm cursor-pointer"
                                >
                                    <MessageCircle size={18} />
                                    Compartir Ahora en WhatsApp
                                </a>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Formulario de Registro si no existe perfil */}
                {searched && !profile && (
                    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-lg border border-gray-200 mb-10 max-w-lg mx-auto">
                        <h3 className="text-xl font-black text-gray-900 mb-2 flex items-center gap-2">
                            <Gift className="text-indigo-600" size={22} />
                            Activar mi Código de Embajador
                        </h3>
                        <p className="text-xs text-gray-500 mb-6">
                            Es 100% gratis. Completa tus datos para asignarte tu código y empezar a acumular saldo.
                        </p>

                        <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Nombre Completo *</label>
                                <input
                                    type="text"
                                    value={regName}
                                    onChange={(e) => setRegName(e.target.value)}
                                    placeholder="Ej: Carlos Andrés Aceros"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Cédula o NIT (Opcional)</label>
                                <input
                                    type="text"
                                    value={regCedula}
                                    onChange={(e) => setRegCedula(e.target.value)}
                                    placeholder="Para validación antifraude"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Ciudad</label>
                                <input
                                    type="text"
                                    value={regCity}
                                    onChange={(e) => setRegCity(e.target.value)}
                                    placeholder="Ej: Bogotá, Soacha, Medellín"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                            >
                                {isLoading ? 'Generando tu código...' : 'Activar mi Código de Embajador Gratis'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Explicación de las 3 Capas Unificadas */}
                <div className="my-10">
                    <div className="text-center max-w-xl mx-auto mb-8">
                        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">
                            ¿Cómo Funciona la Comunidad?
                        </h2>
                        <p className="text-sm text-gray-600">
                            Un solo programa que crece contigo a medida que tus amigos y negocios compran.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Capa 1 */}
                        <div className="bg-white rounded-2xl p-6 border-2 border-emerald-100 shadow-sm relative">
                            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black mb-4 text-xl">
                                1
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                Nivel Básico
                            </span>
                            <h3 className="text-lg font-black text-gray-900 mt-2 mb-2">Cliente Referidor</h3>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Comparte con amigos y familiares. Por cada nuevo cliente que reciba su compra ganas <strong>$10.000 COP</strong> en saldo para tus compras.
                            </p>
                        </div>

                        {/* Capa 2 */}
                        <div className="bg-white rounded-2xl p-6 border-2 border-indigo-100 shadow-sm relative">
                            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black mb-4 text-xl">
                                2
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                3+ Ventas Entregadas
                            </span>
                            <h3 className="text-lg font-black text-gray-900 mt-2 mb-2">Aliado Frecuente</h3>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Accede a <strong>producto gratis de 1L o ½ Galón</strong> de obsequio en tus pedidos, además de acumular tu saldo en cada compra recomendada.
                            </p>
                        </div>

                        {/* Capa 3 */}
                        <div className="bg-white rounded-2xl p-6 border-2 border-amber-200 shadow-sm relative">
                            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black mb-4 text-xl">
                                3
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                                10+ Ventas Entregadas
                            </span>
                            <h3 className="text-lg font-black text-gray-900 mt-2 mb-2">Embajador BioCambio360</h3>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Beneficios VIP, kit de muestras para demostración a restaurantes/negocios y créditos especiales de fábrica.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Preguntas Frecuentes */}
                <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200">
                    <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                        <HelpCircle className="text-blue-600" size={20} />
                        Preguntas Frecuentes
                    </h3>
                    <div className="space-y-4 text-xs sm:text-sm text-gray-700 divide-y divide-gray-100">
                        <div className="pt-3">
                            <p className="font-bold text-gray-900 mb-1">¿Cuándo se me acredita el saldo?</p>
                            <p className="text-gray-600 leading-relaxed">
                                El saldo queda en estado &quot;Pendiente&quot; cuando tu amigo hace la compra, y pasa a &quot;Disponible&quot; una vez la transportadora confirma la entrega efectiva y el recaudo del pedido.
                            </p>
                        </div>
                        <div className="pt-3">
                            <p className="font-bold text-gray-900 mb-1">¿Cómo uso mi saldo para comprar?</p>
                            <p className="text-gray-600 leading-relaxed">
                                Desde este portal, cuando tengas $10.000 COP o más acumulados, haces clic en &quot;Redimir&quot; y el sistema generará un cupón de un solo uso para aplicar directamente en el carrito de compras.
                            </p>
                        </div>
                        <div className="pt-3">
                            <p className="font-bold text-gray-900 mb-1">¿Puedo recomendar a mi propio negocio o casa?</p>
                            <p className="text-gray-600 leading-relaxed">
                                Por políticas antifraude de la empresa, el beneficio solo aplica para compras de personas o empresas distintas (no se admiten autorreferidos con el mismo celular o cédula).
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
