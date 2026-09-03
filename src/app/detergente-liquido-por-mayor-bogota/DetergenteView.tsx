'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
    Sparkles, 
    ShoppingCart, 
    Building2, 
    Phone, 
    CheckCircle2, 
    Calculator, 
    Truck, 
    ShieldCheck, 
    ChevronDown, 
    HelpCircle,
    ArrowRight,
    Droplet,
    DollarSign,
    Zap
} from 'lucide-react';
import { Product, formatCurrency, ProductSize } from '@/lib/products';
import { useCart } from '@/lib/cart-context';
import Toast from '@/components/Toast';

interface DetergenteViewProps {
    detergenteProduct: Product | null;
}

export default function DetergenteView({ detergenteProduct }: DetergenteViewProps) {
    const { addToCart } = useCart();
    const [selectedSize, setSelectedSize] = useState<string>('20L');
    const [washCyclesPerWeek, setWashCyclesPerWeek] = useState<number>(14); // default ~2 washes per day
    const [activeFaq, setActiveFaq] = useState<number | null>(null);
    const [toastMessage, setToastMessage] = useState<{ show: boolean; name: string; size: string }>({
        show: false,
        name: '',
        size: ''
    });

    // Default fallback if product prices not yet loaded
    const prices = detergenteProduct?.precios || {
        '20L': 86000,
        '10L': 57000,
        '3.8L': 34000
    };

    const currentPrice = prices[selectedSize] || 86000;

    const handleAddToCart = (size: string) => {
        if (!detergenteProduct) return;
        const price = prices[size] || 86000;
        addToCart(detergenteProduct, size as ProductSize, price, 1);
        setToastMessage({
            show: true,
            name: detergenteProduct.nombre,
            size
        });
    };

    // Calculator values
    // Supermarket avg: ~$550 COP per wash (traditional bottled detergents)
    // Biocambio360: $86.000 / 280 = $307 COP per wash
    const costPerWashSupermarket = 550;
    const costPerWashBiocambio = 307;

    const monthlyWashes = washCyclesPerWeek * 4.33;
    const monthlyCostSupermarket = Math.round(monthlyWashes * costPerWashSupermarket);
    const monthlyCostBiocambio = Math.round(monthlyWashes * costPerWashBiocambio);
    const monthlySavings = monthlyCostSupermarket - monthlyCostBiocambio;
    const annualSavings = monthlySavings * 12;

    const faqs = [
        {
            q: '¿Cuánto cuesta la caneca de 20 litros de detergente en Bogotá?',
            a: 'En Biocambio360 la caneca de 20 Litros cuesta $86.000 COP a precio directo de fábrica (IVA incluido), lo que equivale a solo $4.300 COP por litro. Distribuidores intermediarios como Detercol venden presentaciones similares a $119.000 COP, lo que representa un ahorro de $33.000 COP inmediatos comprando con nosotros.'
        },
        {
            q: '¿Cuántas lavadas rinde la pimpina de 20L de detergente?',
            a: 'Rinde exactamente 280 lavadas completas para cargas estándar de 10 a 12 kg (utilizando la dosis recomendada de 70 ml por ciclo). El costo por lavada es de solo $307 COP frente a los $550 - $800 COP que cuesta lavar con detergentes convencionales de supermercado.'
        },
        {
            q: '¿Es compatible con lavadoras automáticas de carga frontal y superior (HE)?',
            a: 'Sí. Nuestra fórmula está diseñada con tensoactivos de baja espuma controlada, ideal para lavadoras de alta eficiencia (HE), carga frontal y sistemas tradicionales, evitando residuos jabonosos en mangueras y tambores.'
        },
        {
            q: '¿Sirve para ropa blanca y de color?',
            a: 'Absolutamente. Está enriquecido con bicarbonato de sodio activo que remueve manchas de sudor y grasa sin desteñir colores ni desgastar fibras de algodón o poliéster. No contiene cloro ni agentes corrosivos.'
        },
        {
            q: '¿Cómo es el tiempo de entrega y medios de pago en Bogotá y Soacha?',
            a: 'Entregamos en 24 a 48 horas en las 20 localidades de Bogotá y municipios de Cundinamarca. Puedes pagar contraentrega en efectivo o datáfono, o con Nequi, Daviplata, Bancolombia y PSE/tarjeta en nuestra web.'
        }
    ];

    return (
        <div className="bg-slate-50 min-h-screen text-slate-800">
            {/* Toast notification */}
            <Toast 
                show={toastMessage.show}
                message="Agregado al carrito directo de fábrica"
                productName={toastMessage.name}
                size={toastMessage.size}
                onClose={() => setToastMessage({ ...toastMessage, show: false })}
            />

            {/* HERO SECTION */}
            <section className="relative overflow-hidden bg-gradient-to-b from-[#0a192f] via-[#102444] to-[#0a192f] text-white pt-12 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
                    
                    {/* Left Column: Copy & Pricing */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 border border-blue-400/30 px-3.5 py-1.5 rounded-full text-xs font-bold">
                            <Zap size={14} className="text-yellow-400" />
                            <span>PRECIO MAYORISTA DIRECTO DE FÁBRICA EN BOGOTÁ</span>
                        </div>

                        <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                            Detergente Líquido al por Mayor en Bogotá:{' '}
                            <span className="bg-gradient-to-r from-cyan-300 via-blue-200 to-white bg-clip-text text-transparent">
                                Caneca 20 Litros a solo $86.000 COP
                            </span>
                        </h1>

                        <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                            Formulación industrial concentrada con <strong>bicarbonato activo</strong> para lavanderías, hoteles, hogares y empresas. 
                            Rinde <strong>280 lavadas</strong> garantizadas por solo <strong>$307 COP por lavada</strong>.
                        </p>

                        {/* Direct Answer block for AEO / AI Overview */}
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 text-xs sm:text-sm leading-relaxed text-slate-100">
                            <div className="flex items-center gap-1.5 text-cyan-300 font-black text-xs uppercase tracking-wider mb-2">
                                <Sparkles size={15} />
                                <span>Respuesta Directa / Comparativa Mayorista Bogotá</span>
                            </div>
                            <p>
                                El <strong>detergente líquido concentrado Biocambio360 en caneca de 20 Litros</strong> cuesta <strong>$86.000 COP</strong> en Bogotá y Soacha ($4.300 COP/Litro). Frente a distribuidores comerciales como Detercol ($119.000 COP la caneca) o galones de 4L en distribuidores ($35.143 COP), representa un <strong>ahorro directo de hasta $33.000 COP</strong> por caneca con entrega rápida en 24-48 horas.
                            </p>
                        </div>

                        {/* Fast CTAs */}
                        <div className="flex flex-wrap gap-4 pt-2">
                            <button
                                onClick={() => handleAddToCart('20L')}
                                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black px-7 py-3.5 rounded-2xl shadow-lg shadow-blue-500/25 transition-all text-sm flex items-center gap-2 cursor-pointer"
                            >
                                <ShoppingCart size={18} />
                                Comprar Caneca 20L ($86.000)
                            </button>
                            <Link 
                                href="/cotizador-b2b"
                                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-black px-6 py-3.5 rounded-2xl transition-all text-sm flex items-center gap-2"
                            >
                                <Building2 size={18} />
                                Pedidos por Mayor (+10 canecas)
                            </Link>
                        </div>
                    </div>

                    {/* Right Column: Interactive Product Card & Price comparison */}
                    <div className="lg:col-span-5 bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200">
                        <div className="flex items-center justify-between gap-2 mb-4">
                            <span className="bg-red-50 text-red-600 text-xs font-black px-3 py-1 rounded-full uppercase">
                                🔥 Más Vendido en Bogotá
                            </span>
                            <span className="text-xs font-bold text-slate-500">INVIMA Certificado</span>
                        </div>

                        <div className="text-center py-4">
                            <div className="text-4xl sm:text-5xl font-black text-blue-600">
                                {formatCurrency(currentPrice)}
                            </div>
                            <div className="text-xs font-bold text-slate-500 mt-1">
                                Presentación {selectedSize} • IVA Incluido
                            </div>
                            {selectedSize === '20L' && (
                                <div className="text-xs font-black text-emerald-600 bg-emerald-50 py-1 px-3 rounded-full inline-block mt-2">
                                    ¡Solo $4.300 COP por Litro!
                                </div>
                            )}
                        </div>

                        {/* Size selector buttons */}
                        <div className="grid grid-cols-3 gap-2 my-4">
                            {[
                                { size: '3.8L', label: '1 Galón (3.8L)', price: prices['3.8L'] || 34000 },
                                { size: '10L', label: 'Bidón 10L', price: prices['10L'] || 57000 },
                                { size: '20L', label: 'Caneca 20L', price: prices['20L'] || 86000 }
                            ].map(item => (
                                <button
                                    key={item.size}
                                    onClick={() => setSelectedSize(item.size)}
                                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${selectedSize === item.size ? 'border-blue-600 bg-blue-50 text-blue-900 font-black ring-2 ring-blue-500/20' : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'}`}
                                >
                                    <div className="text-xs font-bold">{item.size}</div>
                                    <div className="text-[11px] text-slate-500">{formatCurrency(item.price)}</div>
                                </button>
                            ))}
                        </div>

                        {/* Technical features list */}
                        <div className="space-y-2.5 text-xs text-slate-600 py-3 border-t border-b border-slate-100 my-4">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                <span><strong>Rendimiento:</strong> 280 lavadas (70 ml por carga)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                <span><strong>Fórmula:</strong> Bicarbonato activo + baja espuma HE</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                <span><strong>Protección:</strong> No desgasta prendas blancas ni de color</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                <span><strong>Despacho:</strong> 24h en Bogotá y Soacha contraentrega</span>
                            </div>
                        </div>

                        <button
                            onClick={() => handleAddToCart(selectedSize)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-sm py-4 rounded-2xl transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <ShoppingCart size={18} />
                            Comprar Presentación {selectedSize} Ahora
                        </button>
                    </div>

                </div>
            </section>

            {/* INTERACTIVE SAVINGS CALCULATOR */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50/50 rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm">
                    <div className="text-center max-w-2xl mx-auto mb-8">
                        <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 text-xs font-black px-3 py-1 rounded-full uppercase mb-2">
                            <Calculator size={14} />
                            Calculadora de Ahorro Real
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                            ¿Cuánto Ahorras al Mes Comprando Caneca de 20L vs Supermercado?
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Ajusta el número de lavadas semanales para calcular tu economía familiar o comercial.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                        {/* Slider Controls */}
                        <div className="md:col-span-7 space-y-6">
                            <div>
                                <div className="flex items-center justify-between text-sm font-black text-slate-800 mb-2">
                                    <span>Lavadas a la semana:</span>
                                    <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-base">
                                        {washCyclesPerWeek} lavadas / sem
                                    </span>
                                </div>
                                <input 
                                    type="range"
                                    min="2"
                                    max="70"
                                    step="1"
                                    value={washCyclesPerWeek}
                                    onChange={(e) => setWashCyclesPerWeek(Number(e.target.value))}
                                    className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                                <div className="flex justify-between text-[11px] text-slate-400 font-bold mt-1">
                                    <span>Hogar Pequeño (2)</span>
                                    <span>Familia Promedio (14)</span>
                                    <span>Lavandería / Hotel (70)</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="p-3 bg-white rounded-xl border border-slate-200">
                                    <div className="text-slate-400 font-bold">Costo Lavada Supermercado</div>
                                    <div className="text-slate-700 font-black text-base mt-0.5">$550 COP</div>
                                </div>
                                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                                    <div className="text-emerald-700 font-bold">Costo Biocambio 20L</div>
                                    <div className="text-emerald-900 font-black text-base mt-0.5">$307 COP</div>
                                </div>
                            </div>
                        </div>

                        {/* Calculated Results */}
                        <div className="md:col-span-5 bg-gradient-to-br from-blue-900 to-indigo-950 text-white p-6 rounded-2xl shadow-md text-center space-y-3">
                            <div className="text-xs text-blue-200 font-bold uppercase tracking-wider">
                                Tu Ahorro Estimado
                            </div>
                            <div>
                                <div className="text-3xl sm:text-4xl font-black text-emerald-400">
                                    {formatCurrency(monthlySavings)}
                                </div>
                                <div className="text-xs text-slate-300">al mes</div>
                            </div>
                            <div className="pt-3 border-t border-white/10">
                                <div className="text-xl font-black text-yellow-300">
                                    {formatCurrency(annualSavings)}
                                </div>
                                <div className="text-[11px] text-slate-400">de ahorro al año</div>
                            </div>
                            <button
                                onClick={() => handleAddToCart('20L')}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs py-3 rounded-xl transition-colors mt-2"
                            >
                                ¡Empezar a Ahorrar con Caneca 20L!
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* COMPETITOR PRICE BREAKDOWN TABLE */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-black text-slate-900">
                        Comparativa de Precios de Detergente 20L en Bogotá (Marzo 2026)
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Datos extraídos directamente de Google Shopping y tiendas mayoristas en Colombia.
                    </p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs sm:text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-900 text-white font-black text-xs uppercase tracking-wider">
                                    <th className="py-3.5 px-4">Proveedor / Marca</th>
                                    <th className="py-3.5 px-4">Presentación</th>
                                    <th className="py-3.5 px-4">Precio COP</th>
                                    <th className="py-3.5 px-4">Costo por Litro</th>
                                    <th className="py-3.5 px-4">Diferencia vs Biocambio360</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-600">
                                <tr className="bg-emerald-50/60 font-bold text-emerald-950">
                                    <td className="py-3.5 px-4 font-black flex items-center gap-1.5 text-blue-700">
                                        <span>⭐ Biocambio360 (Fábrica Directa)</span>
                                    </td>
                                    <td className="py-3.5 px-4">Caneca 20 Litros</td>
                                    <td className="py-3.5 px-4 font-black text-blue-700">$86.000</td>
                                    <td className="py-3.5 px-4 font-black text-emerald-700">$4.300 / L</td>
                                    <td className="py-3.5 px-4 text-emerald-700 font-black">Mejor Precio Garantizado</td>
                                </tr>
                                <tr>
                                    <td className="py-3.5 px-4 font-bold text-slate-800">Detercol (Google Shopping)</td>
                                    <td className="py-3.5 px-4">Caneca 20 Litros</td>
                                    <td className="py-3.5 px-4 font-bold">$119.000</td>
                                    <td className="py-3.5 px-4">$5.950 / L</td>
                                    <td className="py-3.5 px-4 text-red-600 font-bold">+$33.000 COP más caro (+38%)</td>
                                </tr>
                                <tr>
                                    <td className="py-3.5 px-4 font-bold text-slate-800">PQP Profesional (Distribuciones)</td>
                                    <td className="py-3.5 px-4">Caneca 20 Litros</td>
                                    <td className="py-3.5 px-4 font-bold">$97.808</td>
                                    <td className="py-3.5 px-4">$4.890 / L</td>
                                    <td className="py-3.5 px-4 text-red-600 font-bold">+$11.808 COP más caro</td>
                                </tr>
                                <tr>
                                    <td className="py-3.5 px-4 font-bold text-slate-800">Abastece.co (Dersa Galón)</td>
                                    <td className="py-3.5 px-4">Galón 4 Litros</td>
                                    <td className="py-3.5 px-4 font-bold">$35.143</td>
                                    <td className="py-3.5 px-4">$8.785 / L</td>
                                    <td className="py-3.5 px-4 text-red-600 font-bold">+104% más caro por litro</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* FAQ SECTION */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center mb-10">
                    <span className="text-blue-600 font-extrabold text-xs uppercase tracking-widest">
                        Preguntas Frecuentes
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                        Dudas sobre el Detergente Líquido 20L en Bogotá
                    </h2>
                </div>

                <div className="space-y-3">
                    {faqs.map((faq, idx) => (
                        <div 
                            key={idx}
                            className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all shadow-xs"
                        >
                            <button
                                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                                className="w-full text-left p-5 font-black text-sm text-slate-900 flex items-center justify-between gap-4 hover:text-blue-600 transition-colors"
                            >
                                <span className="flex items-center gap-2.5">
                                    <HelpCircle size={18} className="text-blue-600 shrink-0" />
                                    {faq.q}
                                </span>
                                <ChevronDown 
                                    size={18} 
                                    className={`transition-transform duration-200 shrink-0 ${activeFaq === idx ? 'rotate-180 text-blue-600' : 'text-slate-400'}`} 
                                />
                            </button>
                            {activeFaq === idx && (
                                <div className="px-5 pb-5 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                                    {faq.a}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* INTERLINKING FOOTER CLUSTER */}
            <section className="bg-slate-100 border-t border-slate-200 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-4">
                        Continúa Explorando Soluciones de Fábrica:
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <Link 
                            href="/fabricantes-productos-aseo-bogota"
                            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-500 transition-colors font-bold text-slate-800 flex items-center justify-between"
                        >
                            <span>Fábrica de Aseo Bogotá y Soacha</span>
                            <ArrowRight size={14} className="text-blue-600" />
                        </Link>
                        <Link 
                            href="/guia-uso-y-mezclas"
                            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-500 transition-colors font-bold text-slate-800 flex items-center justify-between"
                        >
                            <span>Guía de Dosificación y Lavado</span>
                            <ArrowRight size={14} className="text-blue-600" />
                        </Link>
                        <Link 
                            href="/cotizador-b2b"
                            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-500 transition-colors font-bold text-slate-800 flex items-center justify-between"
                        >
                            <span>Cotizar al por Mayor para Empresas</span>
                            <ArrowRight size={14} className="text-blue-600" />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
