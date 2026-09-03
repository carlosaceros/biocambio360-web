'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
    Factory, 
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
    Package,
    TrendingDown,
    Calculator,
    Layers,
    DollarSign
} from 'lucide-react';
import { Product, formatCurrency, ProductSize } from '@/lib/products';
import { useCart } from '@/lib/cart-context';
import Toast from '@/components/Toast';

interface MayoristaViewProps {
    products: Product[];
}

export default function MayoristaView({ products }: MayoristaViewProps) {
    const { addToCart } = useCart();
    const [activeFaq, setActiveFaq] = useState<number | null>(null);
    const [selectedSector, setSelectedSector] = useState<string>('todos');
    const [monthlyCanecas, setMonthlyCanecas] = useState<number>(6);
    const [toastMessage, setToastMessage] = useState<{ show: boolean; name: string; size: string }>({
        show: false,
        name: '',
        size: ''
    });

    // High-demand wholesale products
    const wholesaleIds = [
        'detergente-liquido-multiusos',
        'desengrasante',
        'bactokill',
        'suavizante',
        'lavaloza-liquido',
        'cloro'
    ];

    const wholesaleProducts = products.filter(p => wholesaleIds.includes(p.id));

    const handleQuickAdd = (product: Product, size: string) => {
        const price = product.precios[size] || 0;
        addToCart(product, size as ProductSize, price, 1);
        setToastMessage({ show: true, name: product.nombre, size });
    };

    // Savings calculator:
    // Benchmark average distributor price per caneca 20L: $125.000 COP
    // Biocambio360 average price per caneca 20L: $86.000 COP
    // Net savings per caneca: $39.000 COP
    const distributorPricePerCaneca = 125000;
    const biocambioPricePerCaneca = 86000;
    const monthlyDistributorCost = monthlyCanecas * distributorPricePerCaneca;
    const monthlyBiocambioCost = monthlyCanecas * biocambioPricePerCaneca;
    const monthlySavings = monthlyDistributorCost - monthlyBiocambioCost;
    const annualSavings = monthlySavings * 12;

    const faqs = [
        {
            q: '¿Cuál es el pedido mínimo para acceder a los precios mayoristas?',
            a: 'En Biocambio360 no exigimos pedidos mínimos de 500 unidades ni contratos forzosos. Puedes acceder a tarifa mayorista directa de fábrica desde 1 caneca de 20 Litros o 1 galón de 3.8L, permitiendo que tanto pymes como familias ahorren de inmediato.'
        },
        {
            q: '¿Cómo despachan a las 20 localidades de Bogotá y municipios aledaños?',
            a: 'Operamos con flota de distribución local propia. Entregamos en 24 a 48 horas hábiles en todas las zonas de Bogotá (Suba, Usaquén, Fontibón, Chapinero, Kennedy, Engativá, etc.) y municipios de Cundinamarca como Soacha, Chía, Mosquera, Madrid y Funza.'
        },
        {
            q: '¿Entregan factura electrónica DIAN y documentación técnica para auditorías?',
            a: 'Sí. Todos nuestros despachos se facturan electrónicamente ante la DIAN y van respaldados por Fichas Técnicas (TDS), Hojas de Seguridad (MSDS) bajo Sistema Globalmente Armonizado y Notificación Sanitaria INVIMA vigente, cumpliendo todos los requerimientos de la Secretaría de Salud.'
        },
        {
            q: '¿Puedo recoger mi pedido directamente en la fábrica para ahorrar el flete?',
            a: 'Totalmente. Puedes realizar tu pedido online o por WhatsApp y recogerlo en nuestro punto de despacho en Soacha (Cra. 7C #44-17 Sur). Así te ahorras el 100% del costo de transporte.'
        },
        {
            q: '¿Manejan descuentos adicionales por compras de alto volumen o licitaciones?',
            a: 'Sí. Para pedidos superiores a 30 canecas mensuales o requerimientos institucionales de colegios, hoteles y conjuntos residenciales, puedes usar nuestro Cotizador B2B para generar una cotización formal automatizada con escalas especiales en PDF.'
        }
    ];

    return (
        <div className="bg-slate-50 min-h-screen text-slate-800">
            {/* Toast notification */}
            <Toast 
                show={toastMessage.show}
                message="Agregado al carrito mayorista directo de fábrica"
                productName={toastMessage.name}
                size={toastMessage.size}
                onClose={() => setToastMessage({ ...toastMessage, show: false })}
            />

            {/* HERO SECTION WITH AMBIENT VIDEO */}
            <section className="relative overflow-hidden bg-gradient-to-b from-[#091527] via-[#0d213e] to-[#091527] text-white pt-14 pb-24 px-4 sm:px-6 lg:px-8">
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
                <div className="absolute inset-0 bg-gradient-to-b from-[#091527]/85 via-[#0d213e]/90 to-[#091527] z-[1] pointer-events-none" />

                <div className="max-w-6xl mx-auto relative z-10">
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-3 mb-6">
                        <div className="inline-flex items-center gap-2.5 bg-white/10 backdrop-blur-md border border-white/25 px-4 py-2 rounded-full text-sm font-black text-cyan-300">
                            <Layers size={18} className="text-cyan-400" />
                            <span>VENTA MAYORISTA DIRECTA DE FÁBRICA EN BOGOTÁ Y CUNDINAMARCA</span>
                        </div>
                        <div className="inline-flex items-center gap-2.5 bg-emerald-500/25 backdrop-blur-md border border-emerald-400/40 px-4 py-2 rounded-full text-sm font-black text-emerald-300">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                            <span>Precios de Planta · Ahorro de hasta $39.000 COP por Caneca</span>
                        </div>
                    </div>

                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-tight max-w-5xl">
                        Productos de Aseo al por Mayor en Bogotá:{' '}
                        <span className="bg-gradient-to-r from-cyan-300 via-blue-200 to-indigo-200 bg-clip-text text-transparent">
                            Canecas de 20L y Galones a Precio Real de Fábrica
                        </span>
                    </h1>

                    {/* Enlarged Hero Paragraph (+90%) */}
                    <p className="mt-8 text-xl sm:text-2xl lg:text-3xl text-slate-200 max-w-4xl leading-relaxed font-semibold">
                        Abastécete con insumos químicos concentrados para empresas, lavanderías, colegios, conjuntos residenciales y hogares. 
                        Ahorra hasta un <strong className="text-white font-black underline decoration-cyan-400 underline-offset-4">45% frente a distribuidores intermediarios</strong> comprando directo a planta, con factura electrónica DIAN y entrega en 24h.
                    </p>

                    {/* Enlarged Direct Answer Box for AEO / AI Overview */}
                    <div className="mt-10 bg-white/10 backdrop-blur-md border-2 border-cyan-400/50 rounded-3xl p-6 sm:p-8 max-w-4xl shadow-2xl">
                        <div className="flex items-center gap-2.5 text-cyan-300 font-black text-sm sm:text-base uppercase tracking-wider mb-3">
                            <Sparkles size={20} className="text-yellow-400" />
                            <span>RESPUESTA RÁPIDA / PROVEEDOR MAYORISTA EN BOGOTÁ</span>
                        </div>
                        <p className="text-lg sm:text-2xl text-slate-100 font-semibold leading-relaxed">
                            <strong className="text-white font-black">Biocambio360</strong> es fabricante y distribuidor mayorista directo de productos de aseo en Bogotá y Soacha (Cra. 7C #44-17 Sur). Suministra canecas de 20 Litros de detergente líquido concentrado a <strong>$86.000 COP</strong> ($4.300/Litro), desengrasante industrial a <strong>$108.000 COP</strong> y amonio cuaternario Bactokill a <strong>$86.000 COP</strong>. Entrega en 24-48 horas en las 20 localidades de Bogotá sin exigir montos mínimos de 500 unidades.
                        </p>
                    </div>

                    {/* CTA Buttons */}
                    <div className="mt-10 flex flex-wrap items-center gap-5">
                        <a 
                            href="#catalogo-mayorista" 
                            className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-blue-500/30 transition-all text-base sm:text-lg flex items-center gap-2.5"
                        >
                            <ShoppingCart size={22} />
                            Ver Catálogo Mayorista y Precios
                        </a>
                        <Link 
                            href="/cotizador-b2b" 
                            className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-black px-8 py-4 rounded-2xl transition-all text-base sm:text-lg flex items-center gap-2.5"
                        >
                            <Building2 size={22} />
                            Cotizador B2B en PDF (Empresas)
                        </Link>
                        <a 
                            href="https://wa.me/573223600360?text=Hola,%20quisiera%20cotizar%20productos%20de%20aseo%20al%20por%20mayor%20directo%20de%20f%C3%A1brica" 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:text-emerald-300 font-black text-base sm:text-lg flex items-center gap-2 px-4 py-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20"
                        >
                            <Phone size={20} /> Asesor Mayorista WhatsApp
                        </a>
                    </div>

                    {/* Trust Micro-badges */}
                    <div className="mt-14 pt-10 border-t border-white/15 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="flex items-center gap-3.5 bg-white/5 border border-white/15 p-4 rounded-2xl">
                            <CheckCircle2 size={28} className="text-cyan-400 shrink-0" />
                            <span className="text-base sm:text-lg font-black text-white leading-tight">Registro Sanitario INVIMA</span>
                        </div>
                        <div className="flex items-center gap-3.5 bg-white/5 border border-white/15 p-4 rounded-2xl">
                            <Truck size={28} className="text-cyan-400 shrink-0" />
                            <span className="text-base sm:text-lg font-black text-white leading-tight">Despacho 24h en Bogotá y Soacha</span>
                        </div>
                        <div className="flex items-center gap-3.5 bg-white/5 border border-white/15 p-4 rounded-2xl">
                            <Award size={28} className="text-cyan-400 shrink-0" />
                            <span className="text-base sm:text-lg font-black text-white leading-tight">Desde 1 caneca (sin mínimos)</span>
                        </div>
                        <div className="flex items-center gap-3.5 bg-white/5 border border-white/15 p-4 rounded-2xl">
                            <FileText size={28} className="text-cyan-400 shrink-0" />
                            <span className="text-base sm:text-lg font-black text-white leading-tight">Fichas Técnicas y Factura DIAN</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                NARRATIVA 1: CAPACIDAD DE PLANTA Y VIDEO 1 EMBEBIDO
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
                                <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-xs font-black text-cyan-300 flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                                    <span>🏭 PLANTA DE PRODUCCIÓN SOACHA</span>
                                </div>
                                <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-md p-4 rounded-2xl border border-white/15 text-xs text-white/90">
                                    <p className="font-extrabold text-white text-sm">Capacidad Industrial Diaria</p>
                                    <p className="text-xs text-slate-300 mt-0.5">
                                        Formulamos lotes frescos con trazabilidad química y control de calidad lote por lote.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Right: Narrative Copy */}
                        <div className="lg:col-span-6 space-y-6">
                            <span className="text-blue-600 font-black text-sm uppercase tracking-widest bg-blue-50 px-4 py-1.5 rounded-full border border-blue-200">
                                Sin Intermediarios Ni Revendedores
                            </span>
                            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 leading-tight">
                                Capacidad Real de Planta: Fabricamos Insumos para Cargas Pesadas
                            </h2>
                            <p className="text-base sm:text-lg text-slate-700 font-medium leading-relaxed">
                                A diferencia de distribuidores comerciales que compran a terceros, almacenan meses y revenden con márgenes inflados del 40%, en <strong>Biocambio360</strong> formulamos directamente en nuestra planta química en Soacha.
                            </p>
                            <p className="text-base sm:text-lg text-slate-700 font-medium leading-relaxed">
                                Contamos con reactores de mezclado industrial, laboratorio de control de densidad y pH, y líneas de envasado dedicadas para galones de 3.8L, bidones de 10L y canecas de 20 Litros. Esto nos permite garantizar:
                            </p>
                            <ul className="space-y-3 text-base sm:text-lg text-slate-700 font-medium">
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 size={22} className="text-emerald-600 shrink-0 mt-1" />
                                    <span><strong>Stock permanente inmediato:</strong> Despachamos pedidos desde 1 caneca hasta camiones completos sin demoras.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 size={22} className="text-emerald-600 shrink-0 mt-1" />
                                    <span><strong>Homogeneidad garantizada:</strong> Cada lote conserva exactamente la misma densidad y porcentaje de tensoactivos activos.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle2 size={22} className="text-emerald-600 shrink-0 mt-1" />
                                    <span><strong>Respaldo legal completo:</strong> Hojas de seguridad (MSDS) de 16 secciones bajo SGA y fichas técnicas requeridas por Secretaría de Salud.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                CATÁLOGO MAYORISTA POR SECTORES & COMPRA DIRECTA
               ═══════════════════════════════════════════════════════════════ */}
            <section id="catalogo-mayorista" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
                    <div>
                        <span className="text-blue-600 font-black text-sm uppercase tracking-widest">
                            Precios de Fábrica Visibles
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-black text-slate-900 mt-2 leading-tight">
                            Catálogo Mayorista: Presentaciones Industriales
                        </h2>
                        <p className="text-base sm:text-lg text-slate-600 font-medium mt-2">
                            Haz tu pedido online con tarifa mayorista directa o solicita cotización empresarial.
                        </p>
                    </div>
                    <Link 
                        href="/cotizador-b2b" 
                        className="text-blue-600 hover:text-blue-800 font-black text-base flex items-center gap-1.5 shrink-0"
                    >
                        Abrir Cotizador B2B <ArrowRight size={18} />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {wholesaleProducts.map(product => {
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
                                        <span className="bg-blue-50 text-blue-700 text-xs font-black uppercase px-3 py-1 rounded-full">
                                            {product.categoria || 'Limpieza'}
                                        </span>
                                        {has20L && (
                                            <span className="bg-red-50 text-red-600 font-black text-xs uppercase px-3 py-1 rounded-full">
                                                Caneca 20L Mayorista
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
                                        <div className="text-3xl font-black text-blue-600 mt-1">
                                            {formatCurrency(mainPrice)} COP
                                        </div>
                                        {has20L && (
                                            <div className="text-sm text-emerald-600 font-black mt-1">
                                                Litro mayorista a solo {formatCurrency(Math.round(mainPrice / 20))} COP
                                            </div>
                                        )}
                                    </div>

                                    {/* Available Sizes Pills */}
                                    <div className="mt-5 flex flex-wrap gap-2">
                                        {Object.keys(product.precios).map(size => (
                                            <button
                                                key={size}
                                                onClick={() => handleQuickAdd(product, size)}
                                                className="text-xs sm:text-sm font-bold bg-slate-100 hover:bg-blue-50 hover:text-blue-600 px-3 py-1.5 rounded-xl transition-colors"
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
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm sm:text-base py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                                    >
                                        <ShoppingCart size={18} />
                                        Comprar {mainSize}
                                    </button>
                                    <Link
                                        href={`/producto/${product.id}`}
                                        className="p-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors text-sm font-black"
                                        title="Ver ficha técnica"
                                    >
                                        Ver Ficha
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                NARRATIVA 2: PRUEBA DE CONCENTRACIÓN Y VIDEO 2 EMBEBIDO
               ═══════════════════════════════════════════════════════════════ */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-8 sm:p-14 border border-blue-900/60 shadow-xl">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                        
                        {/* Left: Narrative Copy */}
                        <div className="lg:col-span-6 space-y-6">
                            <span className="text-cyan-400 font-black text-sm uppercase tracking-widest bg-cyan-950/80 px-4 py-1.5 rounded-full border border-cyan-800/50">
                                Transparencia Química Demostrada
                            </span>
                            <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
                                Densidad Industrial sin Sal Espesante de Relleno
                            </h2>
                            <p className="text-base sm:text-lg text-slate-200 font-medium leading-relaxed">
                                Muchos distribuidores mayoristas de aseo en Bogotá ofrecen productos aparentemente económicos pero cargados de hasta un 70% de agua y espesados con sal marina barata (cloruro de sodio).
                            </p>
                            <p className="text-base sm:text-lg text-slate-200 font-medium leading-relaxed">
                                Esa sal da una falsa apariencia de viscosidad, pero termina resecando telas, oxidando partes metálicas de lavadoras y dejando velos blancos en pisos de porcelanato.
                            </p>
                            <div className="p-6 bg-white/10 rounded-2xl border border-white/15 space-y-3">
                                <h3 className="text-xl font-black text-cyan-300">La Diferencia Biocambio360:</h3>
                                <p className="text-base sm:text-lg text-slate-100 font-medium leading-relaxed">
                                    Nuestra viscosidad es 100% materia activa tensoactiva potenciada con <strong>bicarbonato de sodio micronizado</strong>. Se disuelve en frío al instante, corta grasa pesada y rinde el doble por cada mililitro dosificado.
                                </p>
                            </div>
                        </div>

                        {/* Right: Video 2 (Prueba de Concentración / Detergente Tipo Rey) */}
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
                                    <span>🔬 PRUEBA REAL DE VISCOSIDAD Y DENSIDAD</span>
                                </div>
                                <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-md p-4 rounded-2xl border border-white/15 text-xs text-white/90">
                                    <p className="font-extrabold text-white text-sm">Fórmula Textil Tipo Rey</p>
                                    <p className="text-xs text-slate-300 mt-0.5">
                                        Observa la caída espesa y el poder espumante controlado diseñado para lavadoras industriales y domésticas.
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                TABLA COMPARATIVA DE MERCADO MAYORISTA
               ═══════════════════════════════════════════════════════════════ */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <span className="text-blue-600 font-black text-sm uppercase tracking-widest bg-blue-50 px-4 py-1.5 rounded-full">
                        Auditoría de Proveedores
                    </span>
                    <h2 className="text-3xl sm:text-5xl font-black text-slate-900 mt-3 leading-tight">
                        Biocambio360 vs Distribuidores Tradicionales en Bogotá
                    </h2>
                    <p className="text-base sm:text-lg text-slate-600 font-semibold mt-3">
                        Compara por qué comprar directo a planta genera ahorros sostenibles mes a mes.
                    </p>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-base sm:text-lg border-collapse">
                            <thead>
                                <tr className="bg-slate-900 text-white font-black text-sm sm:text-base uppercase tracking-wider">
                                    <th className="py-5 px-6">Concepto</th>
                                    <th className="py-5 px-6 bg-blue-600 text-white">Biocambio360 (Fábrica Directa)</th>
                                    <th className="py-5 px-6">Distribuidores Mayoristas</th>
                                    <th className="py-5 px-6">Marketplaces / Terceros</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                <tr>
                                    <td className="py-5 px-6 font-black text-slate-900">Precio Caneca 20L Detergente</td>
                                    <td className="py-5 px-6 font-black text-blue-700 bg-blue-50/70 text-xl sm:text-2xl">$86.000 COP</td>
                                    <td className="py-5 px-6">$119.000 - $135.000 COP</td>
                                    <td className="py-5 px-6 text-red-600 font-bold">$125.000 + comisiones</td>
                                </tr>
                                <tr>
                                    <td className="py-5 px-6 font-black text-slate-900">Costo por Litro</td>
                                    <td className="py-5 px-6 font-black text-emerald-700 bg-blue-50/70 text-lg sm:text-xl">$4.300 COP / L</td>
                                    <td className="py-5 px-6">$5.950 - $6.750 COP / L</td>
                                    <td className="py-5 px-6 text-red-600 font-bold">$6.250 - $7.500 COP / L</td>
                                </tr>
                                <tr>
                                    <td className="py-5 px-6 font-black text-slate-900">Pedido Mínimo Exigido</td>
                                    <td className="py-5 px-6 font-black text-blue-700 bg-blue-50/70">Desde 1 caneca o galón</td>
                                    <td className="py-5 px-6">Desde 10 a 50 canecas</td>
                                    <td className="py-5 px-6">Sin mínimo pero fletes caros</td>
                                </tr>
                                <tr>
                                    <td className="py-5 px-6 font-black text-slate-900">Entrega en Bogotá y Soacha</td>
                                    <td className="py-5 px-6 font-black text-blue-700 bg-blue-50/70">24h a 48h con flota propia</td>
                                    <td className="py-5 px-6">3 a 5 días hábiles</td>
                                    <td className="py-5 px-6">Depende de transportadoras</td>
                                </tr>
                                <tr>
                                    <td className="py-5 px-6 font-black text-slate-900">Retiro Directo en Sede</td>
                                    <td className="py-5 px-6 font-black text-emerald-700 bg-blue-50/70">Sí, en Soacha (0% costo de envío)</td>
                                    <td className="py-5 px-6">Generalmente no habilitado</td>
                                    <td className="py-5 px-6">No disponible</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                NARRATIVA 3: LOGÍSTICA, RETIRO EN PLANTA Y VIDEO 3 EMBEBIDO
               ═══════════════════════════════════════════════════════════════ */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="bg-white rounded-3xl p-8 sm:p-14 border border-slate-200 shadow-sm">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                        
                        {/* Left: Narrative Copy */}
                        <div className="lg:col-span-6 space-y-6">
                            <span className="text-emerald-700 font-black text-sm uppercase tracking-widest bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-200 inline-flex items-center gap-2">
                                <MapPin size={16} />
                                Cobertura 20 Localidades y Punto Físico
                            </span>
                            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 leading-tight">
                                Despachos Diarios en 24h y Opción de Retiro en Fábrica
                            </h2>
                            <p className="text-base sm:text-lg text-slate-700 font-medium leading-relaxed">
                                Sabemos que en un restaurante, lavandería o colegio quedarse sin jabón o desinfectante detiene la operación. Por eso contamos con camiones y furgones propios que cubren rutas diarias en Suba, Usaquén, Fontibón, Chapinero, Kennedy, Puente Aranda y toda la sabana.
                            </p>
                            <p className="text-base sm:text-lg text-slate-700 font-medium leading-relaxed">
                                Y si tu negocio está en Soacha, Bosa, Ciudad Bolívar o Tunjuelito, puedes acercarte directamente a nuestra sede en <strong>Cra. 7C #44-17 Sur</strong> para retirar tus productos en minutos y ahorrar el 100% del costo de envío.
                            </p>
                            <div className="pt-2 flex flex-wrap gap-4 text-sm sm:text-base font-black">
                                <div className="flex items-center gap-2 text-blue-600">
                                    <Clock size={20} /> Entregas Lunes a Sábado
                                </div>
                                <div className="flex items-center gap-2 text-emerald-600">
                                    <ShieldCheck size={20} /> Pago Contraentrega
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
                                    <span>📍 PUNTO DE ATENCIÓN Y DESPACHO VECINO</span>
                                </div>
                                <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-md p-4 rounded-2xl border border-white/15 text-xs text-white/90">
                                    <p className="font-extrabold text-white text-sm">Equipo Humano Cercano</p>
                                    <p className="text-xs text-slate-300 mt-0.5">
                                        Personal capacitado para asesorarte en dosificación y cargue de tus insumos de aseo.
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                CALCULADORA DE AHORRO MAYORISTA
               ═══════════════════════════════════════════════════════════════ */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm">
                    <div className="text-center max-w-2xl mx-auto mb-10">
                        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-2">
                            <Calculator size={16} />
                            <span>Calculadora de Ahorro Mayorista B2B</span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2 leading-tight">
                            ¿Cuánto Ahorra tu Empresa Comprando a Fábrica?
                        </h2>
                        <p className="text-base sm:text-lg text-slate-600 font-medium mt-3">
                            Selecciona el número aproximado de canecas de 20 Litros que consumes al mes en tu operación y calcula el ahorro neto anual.
                        </p>
                    </div>

                    {/* Slider Control */}
                    <div className="max-w-xl mx-auto bg-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-200">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-base sm:text-lg font-black text-slate-800">
                                Canecas de 20L al Mes:
                            </span>
                            <span className="text-2xl sm:text-3xl font-black text-blue-600">
                                {monthlyCanecas} canecas/mes
                            </span>
                        </div>
                        <input 
                            type="range" 
                            min="1" 
                            max="50" 
                            value={monthlyCanecas}
                            onChange={(e) => setMonthlyCanecas(Number(e.target.value))}
                            className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-400 mt-2">
                            <span>1 caneca (Pyme / Hogar)</span>
                            <span>15 canecas (Lavandería)</span>
                            <span>50 canecas (Colegio / Hotel)</span>
                        </div>
                    </div>

                    {/* Results Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-10 text-center">
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="text-sm font-bold text-slate-500">Costo con Distribuidores ($125k/c):</div>
                            <div className="text-2xl sm:text-3xl font-black text-red-600 mt-1">
                                {formatCurrency(monthlyDistributorCost)}
                            </div>
                            <div className="text-xs font-semibold text-slate-500 mt-1">
                                Pago mensual con intermediarios
                            </div>
                        </div>

                        <div className="p-6 bg-blue-50 rounded-2xl border border-blue-200">
                            <div className="text-sm font-bold text-blue-700">Costo con Biocambio360 ($86k/c):</div>
                            <div className="text-2xl sm:text-3xl font-black text-blue-700 mt-1">
                                {formatCurrency(monthlyBiocambioCost)}
                            </div>
                            <div className="text-xs font-bold text-emerald-700 mt-1">
                                Tarifa directa de planta
                            </div>
                        </div>

                        <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200">
                            <div className="text-sm font-bold text-emerald-800">Ahorro Neto Anual:</div>
                            <div className="text-3xl sm:text-4xl font-black text-emerald-700 mt-1">
                                +{formatCurrency(annualSavings)}
                            </div>
                            <div className="text-xs font-bold text-emerald-700 mt-1">
                                Capital que permanece en tu empresa
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                TESTIMONIOS MAYORISTAS VERIFICADOS (EEAT)
               ═══════════════════════════════════════════════════════════════ */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <span className="text-blue-600 font-black text-sm uppercase tracking-widest bg-blue-50 px-4 py-1.5 rounded-full">
                        Casos de Éxito en Bogotá
                    </span>
                    <h2 className="text-3xl sm:text-5xl font-black text-slate-900 mt-3 leading-tight">
                        Empresas que Confían en Nuestra Venta Mayorista
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
                                "Suministramos insumos a 8 sedes de restaurantes. Cambiar a Biocambio360 nos redujo el gasto mensual de desengrasante y lavaloza de $2.800.000 a $1.720.000. Además, las fichas técnicas pasaron la visita de Secretaría de Salud sin ninguna observación."
                            </p>
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-sm">
                                AR
                            </div>
                            <div>
                                <div className="text-base sm:text-lg font-black text-slate-900">Alejandro Rincón</div>
                                <div className="text-sm text-slate-500 font-semibold">Gerente Operaciones Cadena Gastronómica, Bogotá</div>
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
                                "En el colegio necesitábamos desinfección hospitalaria que no dañara los pupitres de madera ni causara alergias en los niños. Bactokill con amonio cuaternario de quinta generación nos dio la solución perfecta a mitad de precio frente a marcas multinacionales."
                            </p>
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 font-black flex items-center justify-center text-sm">
                                CS
                            </div>
                            <div>
                                <div className="text-base sm:text-lg font-black text-slate-900">Claudia Suárez</div>
                                <div className="text-sm text-slate-500 font-semibold">Coordinadora de Servicios Generales, Usaquén</div>
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
                                "Administro dos conjuntos residenciales en Kennedy. Pedir la dotación mensual de limpiapisos, cloro y jabón de manos directamente a fábrica nos ahorra más de $500.000 COP mensuales en cuotas de administración. El servicio de entrega es impecable."
                            </p>
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 font-black flex items-center justify-center text-sm">
                                HP
                            </div>
                            <div>
                                <div className="text-base sm:text-lg font-black text-slate-900">Hernando Parra</div>
                                <div className="text-sm text-slate-500 font-semibold">Consejo de Administración P.H., Bogotá</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                CALLOUT B2B / COTIZADOR AUTOMÁTICO
               ═══════════════════════════════════════════════════════════════ */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-3xl p-8 sm:p-12 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-3">
                        <span className="bg-white/20 text-white text-xs font-black uppercase px-3 py-1 rounded-full">
                            Cotización Inmediata DIAN
                        </span>
                        <h3 className="text-2xl sm:text-4xl font-black leading-tight">
                            ¿Necesitas una cotización formal para presentar a tu junta o compras?
                        </h3>
                        <p className="text-blue-100 text-base sm:text-lg font-medium max-w-2xl leading-relaxed">
                            Genera en 30 segundos un PDF formal con NIT, membrete, descuentos por volumen de fábrica y fichas técnicas adjuntas.
                        </p>
                    </div>
                    <Link
                        href="/cotizador-b2b"
                        className="bg-white text-blue-950 hover:bg-yellow-300 font-black px-8 py-4 rounded-2xl transition-all text-base whitespace-nowrap shadow-md flex items-center gap-2"
                    >
                        <Building2 size={20} /> Ir al Cotizador B2B
                    </Link>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                PREGUNTAS FRECUENTES (FAQS)
               ═══════════════════════════════════════════════════════════════ */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center mb-12">
                    <span className="text-blue-600 font-black text-sm uppercase tracking-widest">
                        Resolvemos tus Dudas
                    </span>
                    <h2 className="text-3xl sm:text-5xl font-black text-slate-900 mt-2 leading-tight">
                        Preguntas Frecuentes sobre Compras de Aseo al por Mayor
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
                                className="w-full text-left p-6 font-black text-base sm:text-xl text-slate-900 flex items-center justify-between gap-4 hover:text-blue-600 transition-colors"
                            >
                                <span className="flex items-center gap-3">
                                    <HelpCircle size={22} className="text-blue-600 shrink-0" />
                                    {faq.q}
                                </span>
                                <ChevronDown 
                                    size={22} 
                                    className={`transition-transform duration-200 shrink-0 ${activeFaq === idx ? 'rotate-180 text-blue-600' : 'text-slate-400'}`} 
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
                        Enlaces Relacionados y Recursos Mayoristas de Aseo:
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-sm sm:text-base">
                        <Link 
                            href="/fabricantes-productos-aseo-bogota"
                            className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-500 transition-colors font-bold text-slate-800 flex items-center justify-between"
                        >
                            <span>Fábrica de Productos de Aseo Bogotá</span>
                            <ArrowRight size={18} className="text-blue-600" />
                        </Link>
                        <Link 
                            href="/detergente-liquido-por-mayor-bogota"
                            className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-500 transition-colors font-bold text-slate-800 flex items-center justify-between"
                        >
                            <span>Detergente Líquido 20 Litros por Mayor</span>
                            <ArrowRight size={18} className="text-blue-600" />
                        </Link>
                        <Link 
                            href="/blog/proveedores-productos-aseo-colegios-conjuntos-bogota"
                            className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-500 transition-colors font-bold text-slate-800 flex items-center justify-between"
                        >
                            <span>Artículo: Proveedores de Aseo para Colegios y P.H.</span>
                            <ArrowRight size={18} className="text-blue-600" />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
