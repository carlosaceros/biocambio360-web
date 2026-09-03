'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
    Utensils, 
    Hotel, 
    ShieldCheck, 
    Truck, 
    CheckCircle2, 
    Building2, 
    ArrowRight, 
    Sparkles, 
    Phone, 
    MapPin, 
    Clock, 
    ChevronDown, 
    ShoppingCart, 
    Award, 
    FileText, 
    HelpCircle, 
    Star, 
    Zap, 
    Video, 
    Flame, 
    Droplet, 
    Calculator, 
    Layers, 
    DollarSign 
} from 'lucide-react';
import { Product, formatCurrency, ProductSize } from '@/lib/products';
import { useCart } from '@/lib/cart-context';
import Toast from '@/components/Toast';

interface HorecaViewProps {
    products: Product[];
}

export default function HorecaView({ products }: HorecaViewProps) {
    const { addToCart } = useCart();
    const [activeFaq, setActiveFaq] = useState<number | null>(null);
    const [monthlyMeals, setMonthlyMeals] = useState<number>(3000); // 100 meals/day
    const [toastMessage, setToastMessage] = useState<{ show: boolean; name: string; size: string }>({
        show: false,
        name: '',
        size: ''
    });

    // Targeted HORECA products
    const horecaIds = [
        'desengrasante',
        'lavaloza-liquido',
        'bactokill',
        'detergente-liquido-multiusos',
        'suavizante',
        'blanqueador'
    ];

    const horecaProducts = products.filter(p => horecaIds.includes(p.id));

    const handleQuickAdd = (product: Product, size: string) => {
        const price = product.precios[size] || 0;
        addToCart(product, size as ProductSize, price, 1);
        setToastMessage({ show: true, name: product.nombre, size });
    };

    // Calculator values:
    // Commercial distributor benchmark for restaurant cleaning supplies per 1000 meals: ~$320.000 COP
    // Biocambio360 direct from factory per 1000 meals: ~$185.000 COP
    const monthlyCostDistributor = Math.round((monthlyMeals / 1000) * 320000);
    const monthlyCostBiocambio = Math.round((monthlyMeals / 1000) * 185000);
    const monthlySavings = monthlyCostDistributor - monthlyCostBiocambio;
    const annualSavings = monthlySavings * 12;

    const faqs = [
        {
            q: '¿Los insumos de Biocambio360 cumplen con la Resolución 2674 de 2013 de MinSalud para restaurantes?',
            a: 'Sí. Todos nuestros productos de grado alimentario e institucional cuentan con Notificación Sanitaria INVIMA vigente, Fichas Técnicas (TDS) y Hojas de Seguridad (MSDS) bajo el Sistema Globalmente Armonizado (SGA), listas para presentar a los inspectores de la Secretaría de Salud.'
        },
        {
            q: '¿Tienen desengrasante alcalino apto para campanas extractoras, freidoras y planchas?',
            a: 'Sí. Nuestro Desengrasante Industrial Pesado en caneca de 20 Litros ($108.000 COP) tiene alto poder alcalino saponificante. Actúa en 10 a 15 minutos emulsionando aceites saturados y grasas quemadas sin rayar ni manchar el acero inoxidable 304.'
        },
        {
            q: '¿Cómo funciona la entrega urgente para cocinas y hoteles en Bogotá?',
            a: 'Entregamos con flota local propia en 24 a 48 horas en las 20 localidades de Bogotá y municipios de la sabana. En caso de una urgencia operativa durante el fin de semana, puedes recoger tu pedido inmediatamente en nuestra sede de Soacha (Cra. 7C #44-17 Sur).'
        },
        {
            q: '¿El amonio cuaternario Bactokill reemplaza el cloro en áreas de preparación de alimentos?',
            a: 'Bactokill (amonio cuaternario de quinta generación) es ideal para desinfección de mesas de acero, pisos y paredes sin olor irritante ni corrosión. Para superficies en contacto directo con comida, se usa diluido y se enjuaga fácilmente sin dejar trazas de sabor ni olores químicos.'
        },
        {
            q: '¿Manejan facturación electrónica DIAN para empresas y personas jurídicas?',
            a: 'Sí. Emitimos Factura Electrónica DIAN para cada compra con todos los datos fiscales de tu razón social (RUT), facilitando la deducibilidad tributaria y la auditoría contable de tu negocio.'
        }
    ];

    return (
        <div className="bg-slate-50 min-h-screen text-slate-800">
            {/* Toast notification */}
            <Toast 
                show={toastMessage.show}
                message="Agregado al carrito institucional directo de fábrica"
                productName={toastMessage.name}
                size={toastMessage.size}
                onClose={() => setToastMessage({ ...toastMessage, show: false })}
            />

            {/* HERO SECTION WITH AMBIENT VIDEO */}
            <section className="relative overflow-hidden bg-gradient-to-b from-[#0a1628] via-[#0f2547] to-[#0a1628] text-white pt-14 pb-24 px-4 sm:px-6 lg:px-8">
                {/* Ambient Video Background */}
                <div className="absolute inset-0 z-0 overflow-hidden opacity-20 mix-blend-luminosity pointer-events-none">
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover scale-105"
                    >
                        <source src="/videos/fabrica-biocambio360.mp4" type="video/mp4" />
                        <source src="/videos/fabrica-biocambio360.mov" type="video/quicktime" />
                    </video>
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628]/85 via-[#0f2547]/90 to-[#0a1628] z-[1] pointer-events-none" />

                <div className="max-w-6xl mx-auto relative z-10">
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-3 mb-6">
                        <div className="inline-flex items-center gap-2.5 bg-amber-500/25 border border-amber-400/40 px-4 py-2 rounded-full text-sm font-black text-amber-300">
                            <Utensils size={18} className="text-amber-400" />
                            <span>ESPECIALIZADO EN HOTELES, RESTAURANTES Y CASINOS (HORECA)</span>
                        </div>
                        <div className="inline-flex items-center gap-2.5 bg-emerald-500/25 border border-emerald-400/40 px-4 py-2 rounded-full text-sm font-black text-emerald-300">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                            <span>Resolución 2674 de 2013 · Fichas Técnicas & Factura DIAN</span>
                        </div>
                    </div>

                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-tight max-w-5xl">
                        Insumos de Aseo para Hoteles y Restaurantes en Bogotá:{' '}
                        <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-white bg-clip-text text-transparent">
                            Químicos Pesados Directo de Fábrica
                        </span>
                    </h1>

                    {/* Enlarged Hero Paragraph (+90%) */}
                    <p className="mt-8 text-xl sm:text-2xl lg:text-3xl text-slate-200 max-w-4xl leading-relaxed font-semibold">
                        Suministro industrial para cocinas de alto rendimiento, lencería hotelera y desinfección sanitaria. 
                        Elimina grasa carbonizada en campanas, desmancha toallas sin percudir y ahorra hasta un <strong className="text-white font-black underline decoration-amber-400 underline-offset-4">45% comprando canecas de 20L directo a planta</strong>.
                    </p>

                    {/* Enlarged Direct Answer Box for AEO / AI Overview */}
                    <div className="mt-10 bg-white/10 backdrop-blur-md border-2 border-amber-400/50 rounded-3xl p-6 sm:p-8 max-w-4xl shadow-2xl">
                        <div className="flex items-center gap-2.5 text-amber-300 font-black text-sm sm:text-base uppercase tracking-wider mb-3">
                            <Sparkles size={20} className="text-yellow-400" />
                            <span>RESPUESTA DIRECTA / PROVEEDOR QUÍMICO HORECA BOGOTÁ</span>
                        </div>
                        <p className="text-lg sm:text-2xl text-slate-100 font-semibold leading-relaxed">
                            <strong className="text-white font-black">Biocambio360</strong> fabrica y distribuye insumos químicos de aseo institucional en Bogotá y Soacha para el canal HORECA (hoteles, restaurantes, casinos y cafeterías). Suministra canecas de 20L de <strong>Desengrasante Pesado a $108.000 COP</strong> ($5.400/L), <strong>Detergente Líquido a $86.000 COP</strong> ($4.300/L) y <strong>Bactokill Amonio 5ta Gen a $86.000 COP</strong>. Todos los productos cuentan con Notificación Sanitaria INVIMA y Fichas Técnicas para auditorías de Secretaría de Salud.
                        </p>
                    </div>

                    {/* CTA Buttons */}
                    <div className="mt-10 flex flex-wrap items-center gap-5">
                        <a 
                            href="#catalogo-horeca" 
                            className="bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black px-8 py-4 rounded-2xl shadow-xl shadow-amber-500/25 transition-all text-base sm:text-lg flex items-center gap-2.5"
                        >
                            <ShoppingCart size={22} />
                            Ver Catálogo HORECA y Precios
                        </a>
                        <Link 
                            href="/cotizador-b2b" 
                            className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-black px-8 py-4 rounded-2xl transition-all text-base sm:text-lg flex items-center gap-2.5"
                        >
                            <Building2 size={22} />
                            Cotización Formal B2B en PDF
                        </Link>
                        <a 
                            href="https://wa.me/573223600360?text=Hola,%20quisiera%20cotizar%20insumos%20de%20aseo%20para%20mi%20restaurante/hotel%20directo%20de%20f%C3%A1brica" 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:text-emerald-300 font-black text-base sm:text-lg flex items-center gap-2 px-4 py-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20"
                        >
                            <Phone size={20} /> Asesor HORECA WhatsApp
                        </a>
                    </div>

                    {/* Trust Micro-badges */}
                    <div className="mt-14 pt-10 border-t border-white/15 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="flex items-center gap-3.5 bg-white/5 border border-white/15 p-4 rounded-2xl">
                            <CheckCircle2 size={28} className="text-amber-400 shrink-0" />
                            <span className="text-base sm:text-lg font-black text-white leading-tight">Registro Sanitario INVIMA</span>
                        </div>
                        <div className="flex items-center gap-3.5 bg-white/5 border border-white/15 p-4 rounded-2xl">
                            <Flame size={28} className="text-amber-400 shrink-0" />
                            <span className="text-base sm:text-lg font-black text-white leading-tight">Corta Grasa de Campanas en 15m</span>
                        </div>
                        <div className="flex items-center gap-3.5 bg-white/5 border border-white/15 p-4 rounded-2xl">
                            <Truck size={28} className="text-amber-400 shrink-0" />
                            <span className="text-base sm:text-lg font-black text-white leading-tight">Despachos 24h a Restaurantes</span>
                        </div>
                        <div className="flex items-center gap-3.5 bg-white/5 border border-white/15 p-4 rounded-2xl">
                            <FileText size={28} className="text-amber-400 shrink-0" />
                            <span className="text-base sm:text-lg font-black text-white leading-tight">Fichas TDS & MSDS 16 Secciones</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                NARRATIVA 1: REACTORES INDUSTRIALES & VIDEO 1 EMBEBIDO
               ═══════════════════════════════════════════════════════════════ */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="bg-white rounded-3xl p-8 sm:p-14 border border-slate-200 shadow-sm">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                        
                        {/* Left: Video 1 (Planta de Producción) */}
                        <div className="lg:col-span-6">
                            <div className="relative rounded-3xl overflow-hidden border-2 border-slate-200 shadow-xl bg-slate-950 aspect-[4/5] group">
                                <video
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    controls
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                >
                                    <source src="/videos/fabrica-biocambio360.mp4" type="video/mp4" />
                                    <source src="/videos/fabrica-biocambio360.mov" type="video/quicktime" />
                                </video>
                                <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-xs font-black text-amber-300 flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                                    <span>🏭 FORMULACIÓN INDUSTRIAL SOACHA</span>
                                </div>
                                <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-md p-4 rounded-2xl border border-white/15 text-xs text-white/90">
                                    <p className="font-extrabold text-white text-sm">Reactores de Grado Alimentario</p>
                                    <p className="text-xs text-slate-300 mt-0.5">
                                        Cumplimiento estricto de estándares sanitarios para inocuidad en cocinas de restaurantes.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Right: Narrative Copy */}
                        <div className="lg:col-span-6 space-y-6">
                            <span className="text-amber-700 font-black text-sm uppercase tracking-widest bg-amber-50 px-4 py-1.5 rounded-full border border-amber-200">
                                Estándar Sanitario para Gastronomía
                            </span>
                            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 leading-tight">
                                Reactores Industriales: Inocuidad y Potencia para Cocinas Profesionales
                            </h2>
                            <p className="text-base sm:text-lg text-slate-700 font-medium leading-relaxed">
                                En una cocina donde se preparan cientos de platos al día, utilizar químicos improvisados o comprados a intermediarios sin trazabilidad es una ruleta rusa ante una inspección sanitaria.
                            </p>
                            <p className="text-base sm:text-lg text-slate-700 font-medium leading-relaxed">
                                En <strong>Biocambio360</strong> producimos insumos con materias primas biodegradables bajo estrictos protocolos de buenas prácticas de manufactura. Nuestros químicos para restaurantes y hoteles ofrecen:
                            </p>
                            <ul className="space-y-3 text-base sm:text-lg text-slate-700 font-medium">
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 size={22} className="text-emerald-600 shrink-0 mt-1" />
                                    <span><strong>Desengrase por saponificación real:</strong> Corta la grasa animal y vegetal carbonizada sin rayar superficies de acero 304.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 size={22} className="text-emerald-600 shrink-0 mt-1" />
                                    <span><strong>Cero residuos tóxicos:</strong> Lavaloza y desinfectantes diseñados para enjuague rápido sin transferencia de olor ni sabor a la comida.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 size={22} className="text-emerald-600 shrink-0 mt-1" />
                                    <span><strong>Carpeta Sanitaria Lista:</strong> Fichas técnicas (TDS) y hojas de seguridad (MSDS) bajo SGA para auditorías de Secretaría de Salud.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                CATÁLOGO HORECA Y COMPRA DIRECTA
               ═══════════════════════════════════════════════════════════════ */}
            <section id="catalogo-horeca" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
                    <div>
                        <span className="text-amber-600 font-black text-sm uppercase tracking-widest">
                            Línea Especializada HORECA
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-black text-slate-900 mt-2 leading-tight">
                            Productos de Limpieza para Cocinas y Hoteles
                        </h2>
                        <p className="text-base sm:text-lg text-slate-600 font-medium mt-2">
                            Canecas de 20 Litros, bidones de 10L y galones de 3.8L con despacho inmediato.
                        </p>
                    </div>
                    <Link 
                        href="/cotizador-b2b" 
                        className="text-amber-700 hover:text-amber-800 font-black text-base flex items-center gap-1.5 shrink-0"
                    >
                        Abrir Cotizador B2B <ArrowRight size={18} />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {horecaProducts.map(product => {
                        const has20L = !!product.precios['20L'];
                        const has10L = !!product.precios['10L'];
                        const hasGal = !!product.precios['3.8L'];

                        const mainSize = has20L ? '20L' : (has10L ? '10L' : (hasGal ? '3.8L' : Object.keys(product.precios)[0]));
                        const mainPrice = product.precios[mainSize] || 0;

                        return (
                            <div 
                                key={product.id}
                                className="bg-white rounded-3xl p-7 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <span className="bg-amber-50 text-amber-800 text-xs font-black uppercase px-3 py-1 rounded-full">
                                            {product.id === 'desengrasante' ? '🔥 Cocinas Industriales' : (product.id === 'lavaloza-liquido' ? '🍽 Vajilla & Cristalería' : '🏨 Línea Hotelera')}
                                        </span>
                                        {has20L && (
                                            <span className="bg-emerald-50 text-emerald-700 font-black text-xs uppercase px-3 py-1 rounded-full">
                                                Caneca 20L Fábrica
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="text-xl font-black text-slate-900 leading-snug">
                                        {product.nombre}
                                    </h3>
                                    <p className="text-base sm:text-lg text-slate-600 font-medium mt-2 leading-relaxed line-clamp-2">
                                        {product.descripcion}
                                    </p>

                                    {/* Price Highlight */}
                                    <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="text-sm text-slate-500 font-bold">Presentación {mainSize}:</div>
                                        <div className="text-3xl font-black text-slate-900 mt-1">
                                            {formatCurrency(mainPrice)} COP
                                        </div>
                                        {has20L && (
                                            <div className="text-sm text-emerald-700 font-black mt-1">
                                                Litro a solo {formatCurrency(Math.round(mainPrice / 20))} COP
                                            </div>
                                        )}
                                    </div>

                                    {/* Available Sizes Pills */}
                                    <div className="mt-5 flex flex-wrap gap-2">
                                        {Object.keys(product.precios).map(size => (
                                            <button
                                                key={size}
                                                onClick={() => handleQuickAdd(product, size)}
                                                className="text-xs sm:text-sm font-bold bg-slate-100 hover:bg-amber-50 hover:text-amber-800 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                                                title={`Agregar ${size} al carrito`}
                                            >
                                                {size}: {formatCurrency(product.precios[size])} +
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-8 pt-5 border-t border-slate-100 flex items-center gap-3">
                                    <button
                                        onClick={() => handleQuickAdd(product, mainSize)}
                                        className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm sm:text-base py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                                    >
                                        <ShoppingCart size={18} />
                                        Comprar {mainSize}
                                    </button>
                                    <Link
                                        href={`/producto/${product.id}`}
                                        className="p-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors text-sm font-black"
                                        title="Ver ficha técnica"
                                    >
                                        Ficha
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                NARRATIVA 2: POTENCIA CORTAGRASA & VIDEO 2 EMBEBIDO
               ═══════════════════════════════════════════════════════════════ */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="bg-gradient-to-br from-slate-900 via-[#1b1e2e] to-slate-900 text-white rounded-3xl p-8 sm:p-14 border border-amber-500/30 shadow-xl">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                        
                        {/* Left: Narrative Copy */}
                        <div className="lg:col-span-6 space-y-6">
                            <span className="text-amber-400 font-black text-sm uppercase tracking-widest bg-amber-950/80 px-4 py-1.5 rounded-full border border-amber-800/50">
                                Eficacia Química Demostrada
                            </span>
                            <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
                                Densidad Pesada sin Sal de Relleno: Adiós al Restregado Eterno
                            </h2>
                            <p className="text-base sm:text-lg text-slate-200 font-medium leading-relaxed">
                                Los químicos diluidos de supermercado obligan al personal de cocina a gastar horas raspando ollas, planchas y campanas con esponjas metálicas que arruinan los equipos de acero inoxidable.
                            </p>
                            <p className="text-base sm:text-lg text-slate-200 font-medium leading-relaxed">
                                Las fórmulas de <strong>Biocambio360</strong> utilizan tensoactivos de alta potencia combinados con álcalis que disuelven la grasa por contacto (dwell time). Solo requieres aplicar, esperar 10 a 15 minutos y retirar con paño húmedo o hidrolavadora.
                            </p>
                            <div className="p-6 bg-white/10 rounded-2xl border border-white/15 space-y-2">
                                <h3 className="text-xl font-black text-amber-300">Protección para tu Lencería Hotelera:</h3>
                                <p className="text-base sm:text-lg text-slate-100 font-medium leading-relaxed">
                                    En lavandería de hoteles, nuestro detergente con bicarbonato activo micronizado previene el percudido amarillento en sábanas y toallas sin necesidad de quemar el tejido con cloro corrosivo.
                                </p>
                            </div>
                        </div>

                        {/* Right: Video 2 (Prueba de Densidad y Textura) */}
                        <div className="lg:col-span-6">
                            <div className="relative rounded-3xl overflow-hidden border-2 border-white/20 shadow-xl bg-slate-950 aspect-[4/5] group">
                                <video
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    controls
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                >
                                    <source src="/videos/detergente-tipo-rey.mp4" type="video/mp4" />
                                    <source src="/videos/detergente-tipo-rey.mov" type="video/quicktime" />
                                </video>
                                <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-xs font-black text-amber-300 flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                                    <span>🔬 PRUEBA REAL DE DENSIDAD Y CONCENTRACIÓN</span>
                                </div>
                                <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-md p-4 rounded-2xl border border-white/15 text-xs text-white/90">
                                    <p className="font-extrabold text-white text-sm">Fórmula Textil e Industrial</p>
                                    <p className="text-xs text-slate-300 mt-0.5">
                                        Textura espesa auténtica sin sal marina añadida: alto rendimiento en agua fría de Bogotá.
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                CALCULADORA DE AHORRO HORECA
               ═══════════════════════════════════════════════════════════════ */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm">
                    <div className="text-center max-w-2xl mx-auto mb-10">
                        <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-800 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-2">
                            <Calculator size={16} />
                            <span>Calculadora de Ahorro Gastronómico & Hotelero</span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2 leading-tight">
                            ¿Cuánto Dinero Ahorra tu Cocina u Hotel al Mes?
                        </h2>
                        <p className="text-base sm:text-lg text-slate-600 font-medium mt-3">
                            Ajusta el número estimado de platos o servicios mensuales de tu negocio y conoce la reducción neta en tu factura de insumos químicos.
                        </p>
                    </div>

                    {/* Slider Control */}
                    <div className="max-w-xl mx-auto bg-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-200">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-base sm:text-lg font-black text-slate-800">
                                Platos / Servicios al Mes:
                            </span>
                            <span className="text-2xl sm:text-3xl font-black text-amber-600">
                                {monthlyMeals.toLocaleString()} platos/mes
                            </span>
                        </div>
                        <input 
                            type="range" 
                            min="500" 
                            max="15000" 
                            step="500"
                            value={monthlyMeals}
                            onChange={(e) => setMonthlyMeals(Number(e.target.value))}
                            className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                        <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-400 mt-2">
                            <span>500 (Cafetería)</span>
                            <span>3.000 (Restaurante Típico)</span>
                            <span>15.000+ (Casino / Hotel)</span>
                        </div>
                    </div>

                    {/* Results Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-10 text-center">
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="text-sm font-bold text-slate-500">Costo Mensual con Distribuidores:</div>
                            <div className="text-2xl sm:text-3xl font-black text-red-600 mt-1">
                                {formatCurrency(monthlyCostDistributor)}
                            </div>
                            <div className="text-xs font-semibold text-slate-500 mt-1">
                                Promedio marcas comerciales
                            </div>
                        </div>

                        <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200">
                            <div className="text-sm font-bold text-amber-800">Costo Mensual con Biocambio360:</div>
                            <div className="text-2xl sm:text-3xl font-black text-amber-800 mt-1">
                                {formatCurrency(monthlyCostBiocambio)}
                            </div>
                            <div className="text-xs font-bold text-emerald-700 mt-1">
                                Tarifa directa de fábrica (-42%)
                            </div>
                        </div>

                        <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200">
                            <div className="text-sm font-bold text-emerald-800">Ahorro Neto Anual:</div>
                            <div className="text-3xl sm:text-4xl font-black text-emerald-700 mt-1">
                                +{formatCurrency(annualSavings)}
                            </div>
                            <div className="text-xs font-bold text-emerald-700 mt-1">
                                Mayor margen de ganancia para tu negocio
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                NARRATIVA 3: LOGÍSTICA DE URGENCIA & VIDEO 3 EMBEBIDO
               ═══════════════════════════════════════════════════════════════ */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="bg-white rounded-3xl p-8 sm:p-14 border border-slate-200 shadow-sm">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                        
                        {/* Left: Narrative Copy */}
                        <div className="lg:col-span-6 space-y-6">
                            <span className="text-emerald-700 font-black text-sm uppercase tracking-widest bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-200 inline-flex items-center gap-2">
                                <Clock size={16} />
                                Despachos Inmediatos sin Fricciones
                            </span>
                            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 leading-tight">
                                Tu Cocina u Hotel Nunca se Quedará sin Insumos
                            </h2>
                            <p className="text-base sm:text-lg text-slate-700 font-medium leading-relaxed">
                                Un viernes en la noche con lleno total o una temporada alta de reservas en hotel no admiten demoras de 5 días de transportadoras nacionales.
                            </p>
                            <p className="text-base sm:text-lg text-slate-700 font-medium leading-relaxed">
                                Operamos con flota propia en Bogotá cubriendo las zonas gastronómicas de Chapinero, Usaquén, Zona T, La Candelaria, Parkway y Fontibón. Y si necesitas canecas de emergencia en menos de 2 horas, puedes enviar un vehículo a retirar directamente en nuestra sede de Soacha (Cra. 7C #44-17 Sur).
                            </p>
                            <div className="pt-2 flex flex-wrap gap-4 text-sm sm:text-base font-black">
                                <div className="flex items-center gap-2 text-amber-600">
                                    <Truck size={20} /> Despacho 24h a Restaurantes
                                </div>
                                <div className="flex items-center gap-2 text-emerald-600">
                                    <MapPin size={20} /> Retiro en Planta (0% Flete)
                                </div>
                            </div>
                        </div>

                        {/* Right: Video 3 (Punto de Venta y Despacho Vecino) */}
                        <div className="lg:col-span-6">
                            <div className="relative rounded-3xl overflow-hidden border-2 border-slate-200 shadow-xl bg-slate-950 aspect-[4/5] group">
                                <video
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    controls
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                >
                                    <source src="/videos/punto-de-venta-soacha.mp4" type="video/mp4" />
                                    <source src="/videos/punto-de-venta-soacha.mov" type="video/quicktime" />
                                </video>
                                <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-xs font-black text-emerald-300 flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                                    <span>📍 ATENCIÓN DIRECTA Y RETIRO EN SOACHA</span>
                                </div>
                                <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-md p-4 rounded-2xl border border-white/15 text-xs text-white/90">
                                    <p className="font-extrabold text-white text-sm">Equipo Listo para Despachar</p>
                                    <p className="text-xs text-slate-300 mt-0.5">
                                        Atención ágil para pedidos urgentes de restaurantes y cadenas hoteleras.
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                TESTIMONIOS HORECA VERIFICADOS (EEAT)
               ═══════════════════════════════════════════════════════════════ */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <span className="text-amber-600 font-black text-sm uppercase tracking-widest bg-amber-50 px-4 py-1.5 rounded-full">
                        Experiencias del Sector Gastronómico
                    </span>
                    <h2 className="text-3xl sm:text-5xl font-black text-slate-900 mt-3 leading-tight">
                        Chefs y Administradores que Trabajan con Biocambio360
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Testimonial 1 */}
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-1.5 text-amber-400 mb-4">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={20} className="fill-amber-400" />
                                ))}
                            </div>
                            <p className="text-base sm:text-lg text-slate-700 leading-relaxed font-medium italic">
                                "Limpiar los filtros y el ducto de la campana era la pesadilla del cierre de cocina los domingos. Con el desengrasante pesado de Biocambio360 dejamos actuar 12 minutos y la grasa carbonizada se cae sola. En la visita de Secretaría de Salud nos felicitaron por el estado impecable del acero."
                            </p>
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-800 font-black flex items-center justify-center text-sm">
                                CR
                            </div>
                            <div>
                                <div className="text-base sm:text-lg font-black text-slate-900">Chef Camilo Restrepo</div>
                                <div className="text-sm text-slate-500 font-semibold">Restaurante Parrilla & Carbón, Zona G Bogotá</div>
                            </div>
                        </div>
                    </div>

                    {/* Testimonial 2 */}
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-1.5 text-amber-400 mb-4">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={20} className="fill-amber-400" />
                                ))}
                            </div>
                            <p className="text-base sm:text-lg text-slate-700 leading-relaxed font-medium italic">
                                "Teníamos un grave problema con el olor a humedad en toallas debido al clima frío de Bogotá. Pasamos al detergente con bicarbonato y suavizante hotelero de Biocambio360: las toallas quedan esponjosas, blancas y con un aroma fresco que los huéspedes mencionan en sus reseñas."
                            </p>
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-sm">
                                MV
                            </div>
                            <div>
                                <div className="text-base sm:text-lg font-black text-slate-900">Mariana Valencia</div>
                                <div className="text-sm text-slate-500 font-semibold">Gobernanta General Hotel 4 Estrellas, Chapinero</div>
                            </div>
                        </div>
                    </div>

                    {/* Testimonial 3 */}
                    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-1.5 text-amber-400 mb-4">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={20} className="fill-amber-400" />
                                ))}
                            </div>
                            <p className="text-base sm:text-lg text-slate-700 leading-relaxed font-medium italic">
                                "En nuestro casino de alimentación servimos 800 almuerzos diarios. El lavaloza concentrado y el amonio Bactokill nos permiten cumplir al pie de la letra el protocolo de desinfección de vajilla y mesones ahorrando más de $800.000 COP al mes."
                            </p>
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 font-black flex items-center justify-center text-sm">
                                JM
                            </div>
                            <div>
                                <div className="text-base sm:text-lg font-black text-slate-900">Javier Morales</div>
                                <div className="text-sm text-slate-500 font-semibold">Jefe de Compras Casino Industrial, Puente Aranda</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                PREGUNTAS FRECUENTES (FAQS)
               ═══════════════════════════════════════════════════════════════ */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center mb-12">
                    <span className="text-amber-600 font-black text-sm uppercase tracking-widest">
                        Dudas del Sector Gastronómico y Hotelero
                    </span>
                    <h2 className="text-3xl sm:text-5xl font-black text-slate-900 mt-2 leading-tight">
                        Preguntas Frecuentes sobre Insumos de Aseo HORECA
                    </h2>
                </div>

                <div className="space-y-4">
                    {faqs.map((faq, idx) => (
                        <div 
                            key={idx}
                            className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all shadow-xs"
                        >
                            <button
                                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                                className="w-full text-left p-6 font-black text-base sm:text-xl text-slate-900 flex items-center justify-between gap-4 hover:text-amber-600 transition-colors cursor-pointer"
                            >
                                <span className="flex items-center gap-3">
                                    <HelpCircle size={22} className="text-amber-600 shrink-0" />
                                    {faq.q}
                                </span>
                                <ChevronDown 
                                    size={22} 
                                    className={`transition-transform duration-200 shrink-0 ${activeFaq === idx ? 'rotate-180 text-amber-600' : 'text-slate-400'}`} 
                                />
                            </button>
                            {activeFaq === idx && (
                                <div className="px-6 pb-6 pt-2 text-base sm:text-lg text-slate-700 font-medium leading-relaxed border-t border-slate-100">
                                    {faq.a}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                INTERLINKING FOOTER CLUSTER
               ═══════════════════════════════════════════════════════════════ */}
            <section className="bg-slate-100 border-t border-slate-200 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto">
                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-wider mb-5">
                        Soluciones Relacionadas para Empresas y Mayoristas:
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-sm sm:text-base">
                        <Link 
                            href="/productos-aseo-al-por-mayor-bogota"
                            className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-amber-500 transition-colors font-bold text-slate-800 flex items-center justify-between"
                        >
                            <span>Catálogo Mayorista de Productos de Aseo</span>
                            <ArrowRight size={18} className="text-amber-600" />
                        </Link>
                        <Link 
                            href="/detergente-liquido-por-mayor-bogota"
                            className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-amber-500 transition-colors font-bold text-slate-800 flex items-center justify-between"
                        >
                            <span>Detergente Líquido 20 Litros Bogotá</span>
                            <ArrowRight size={18} className="text-amber-600" />
                        </Link>
                        <Link 
                            href="/blog/como-desengrasar-campanas-extractores-cocinas-industriales"
                            className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-amber-500 transition-colors font-bold text-slate-800 flex items-center justify-between"
                        >
                            <span>Protocolo: Desengrasar Campanas de Cocina</span>
                            <ArrowRight size={18} className="text-amber-600" />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
