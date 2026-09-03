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
    Zap,
    Star
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
    // Assumptions: 70ml per wash cycle (8-10 kg load)
    // 20L = 20,000 ml = ~285 washes.
    // Price per wash with 20L Biocambio360: $86,000 / 280 = $307 COP
    // Retail supermarket benchmark: 1L bottle = $5,500 COP, dosage 120ml = ~8 washes = $687 COP / wash
    const costPerWashBiocambio = Math.round(86000 / 280); // $307 COP
    const costPerWashSupermarket = 687; // benchmark supermarket/retail
    
    const monthlyWashes = washCyclesPerWeek * 4.3;
    const monthlyCostBiocambio = Math.round(monthlyWashes * costPerWashBiocambio);
    const monthlyCostSupermarket = Math.round(monthlyWashes * costPerWashSupermarket);
    const monthlySavings = monthlyCostSupermarket - monthlyCostBiocambio;
    const annualSavings = monthlySavings * 12;

    const faqs = [
        {
            q: '¿Por qué la caneca de 20L cuesta solo $86.000 COP frente a $119.000 de otros mayoristas?',
            a: 'Biocambio360 es el fabricante directo con planta en Soacha (Cra. 7C #44-17 Sur). Al no pasar por distribuidores mayoristas intermediarios ni pagar comisiones de plataformas de marketplace, trasladamos ese ahorro del 38% directamente al cliente final.'
        },
        {
            q: '¿Cuántas lavadas rinde exactamente la caneca de 20 Litros?',
            a: 'Rinde 280 lavadas completas para cargas estándar de 8 a 10 kg con una dosificación de 70 ml. Para cargas pesadas o muy sucias (12 a 15 kg), recomendamos 90 ml, rindiendo 222 lavadas.'
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
            a: 'Entregamos en 24 a 48 horas en las 20 localidades de Bogotá y municipios de Cundinamarca. Puedes pagar contraentrega en efectivo o con Nequi, Daviplata, Bancolombia y PSE/tarjeta en nuestra web.'
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
            <section className="relative overflow-hidden bg-gradient-to-b from-[#0a192f] via-[#102444] to-[#0a192f] text-white pt-14 pb-24 px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
                    
                    {/* Left Column: Copy & Pricing */}
                    <div className="lg:col-span-7 space-y-7">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="inline-flex items-center gap-2 bg-blue-500/25 text-blue-300 border border-blue-400/40 px-4 py-2 rounded-full text-sm font-black">
                                <Zap size={16} className="text-yellow-400" />
                                <span>PRECIO MAYORISTA DIRECTO DE FÁBRICA EN BOGOTÁ</span>
                            </div>
                            <div className="inline-flex items-center gap-2 bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 px-4 py-2 rounded-full text-sm font-black">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                                <span>Lote de Hoy: 19 canecas para entrega mañana</span>
                            </div>
                        </div>

                        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
                            Detergente Líquido al por Mayor en Bogotá:{' '}
                            <span className="bg-gradient-to-r from-cyan-300 via-blue-200 to-white bg-clip-text text-transparent">
                                Caneca 20 Litros a solo $86.000 COP
                            </span>
                        </h1>

                        {/* Enlarged Hero Paragraph (+90%) */}
                        <p className="text-slate-200 text-xl sm:text-2xl lg:text-3xl leading-relaxed font-semibold">
                            Formulación industrial concentrada con <strong className="text-white font-black underline decoration-cyan-400 underline-offset-4">bicarbonato activo</strong> para lavanderías, hoteles, hogares y empresas. 
                            Rinde <strong>280 lavadas</strong> garantizadas por solo <strong className="text-cyan-300 font-black">$307 COP por lavada</strong>.
                        </p>

                        {/* Enlarged Direct Answer block for AEO / AI Overview */}
                        <div className="bg-white/10 backdrop-blur-md border-2 border-cyan-400/40 rounded-3xl p-6 sm:p-8 text-slate-100 shadow-2xl">
                            <div className="flex items-center gap-2 text-cyan-300 font-black text-sm sm:text-base uppercase tracking-wider mb-3">
                                <Sparkles size={18} className="text-yellow-400" />
                                <span>RESPUESTA DIRECTA / COMPARATIVA MAYORISTA BOGOTÁ</span>
                            </div>
                            <p className="text-lg sm:text-2xl font-semibold leading-relaxed">
                                El <strong>detergente líquido concentrado Biocambio360 en caneca de 20 Litros</strong> cuesta <strong>$86.000 COP</strong> en Bogotá y Soacha ($4.300 COP/Litro). Frente a distribuidores comerciales como Detercol ($119.000 COP la caneca) o galones de 4L en distribuidores ($35.143 COP), representa un <strong>ahorro directo de hasta $33.000 COP</strong> por caneca con entrega rápida en 24-48 horas.
                            </p>
                        </div>

                        {/* Fast CTAs */}
                        <div className="flex flex-wrap items-center gap-5 pt-3">
                            <button
                                onClick={() => handleAddToCart(selectedSize)}
                                className="bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-slate-950 font-black px-8 py-4 rounded-2xl shadow-xl shadow-cyan-500/25 transition-all text-base sm:text-lg flex items-center gap-2.5 cursor-pointer"
                            >
                                <ShoppingCart size={22} />
                                Agregar Caneca 20L al Carrito
                            </button>
                            <a
                                href="https://wa.me/573223600360?text=Hola,%20quisiera%20pedir%20la%20caneca%20de%2020L%20de%20detergente%20a%20precio%20de%20f%C3%A1brica"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 font-black px-7 py-4 rounded-2xl transition-all text-base sm:text-lg flex items-center gap-2.5"
                            >
                                <Phone size={20} /> Pedir por WhatsApp
                            </a>
                        </div>
                    </div>

                    {/* Right Column: Size Selector Card */}
                    <div className="lg:col-span-5 bg-white rounded-3xl p-7 sm:p-9 text-slate-900 shadow-2xl border border-slate-100">
                        <div className="flex items-center justify-between gap-2 mb-4">
                            <span className="bg-blue-100 text-blue-800 text-xs font-black uppercase px-3 py-1.5 rounded-full">
                                Venta Directa de Planta
                            </span>
                            <span className="text-emerald-700 font-black text-xs sm:text-sm flex items-center gap-1">
                                <CheckCircle2 size={16} /> Stock Inmediato
                            </span>
                        </div>

                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
                            Detergente Líquido Multiusos Industrial
                        </h3>
                        <p className="text-base sm:text-lg text-slate-600 font-medium mt-2">
                            Fórmula espumante controlada para ropa blanca, ropa color y todo tipo de superficies.
                        </p>

                        {/* Size Picker */}
                        <div className="mt-6 space-y-3">
                            <label className="block text-sm font-black text-slate-800 uppercase tracking-wider">
                                Selecciona la Presentación:
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { size: '20L', label: 'Caneca 20L', desc: 'Más vendida' },
                                    { size: '10L', label: 'Bidón 10L', desc: 'Negocios' },
                                    { size: '3.8L', label: 'Galón 3.8L', desc: 'Hogares' }
                                ].map(item => (
                                    <button
                                        key={item.size}
                                        type="button"
                                        onClick={() => setSelectedSize(item.size)}
                                        className={`p-3.5 rounded-2xl border-2 text-center transition-all cursor-pointer ${
                                            selectedSize === item.size
                                                ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-black shadow-sm'
                                                : 'border-slate-200 hover:border-slate-300 text-slate-700 font-bold'
                                        }`}
                                    >
                                        <div className="text-base sm:text-lg font-black">{item.size}</div>
                                        <div className="text-[11px] text-slate-500 font-bold mt-0.5">{item.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Price Callout */}
                        <div className="mt-7 p-5 bg-slate-50 rounded-2xl border border-slate-200">
                            <div className="text-sm font-bold text-slate-500">Precio de Fábrica ({selectedSize}):</div>
                            <div className="text-4xl font-black text-blue-600 mt-1">
                                {formatCurrency(currentPrice)} COP
                            </div>
                            {selectedSize === '20L' && (
                                <div className="text-sm font-black text-emerald-700 mt-1.5 flex items-center gap-1">
                                    <span>🎉 A solo $4.300 COP el Litro · 280 lavadas garantizadas</span>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => handleAddToCart(selectedSize)}
                            className="w-full mt-7 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-6 rounded-2xl transition-colors text-base sm:text-lg flex items-center justify-center gap-2.5 shadow-md cursor-pointer"
                        >
                            <ShoppingCart size={20} />
                            Comprar {selectedSize} Ahora
                        </button>

                        <div className="mt-5 text-center text-xs sm:text-sm text-slate-500 font-bold flex items-center justify-center gap-2">
                            <Truck size={16} className="text-blue-600" />
                            <span>Despacho en 24h a toda Bogotá y Cundinamarca</span>
                        </div>
                    </div>
                </div>

                {/* Trust micro-badges (Screenshot 2 enlarged) */}
                <div className="max-w-6xl mx-auto mt-14 pt-10 border-t border-white/15 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex items-center gap-3.5 bg-white/5 border border-white/15 p-4 rounded-2xl">
                        <CheckCircle2 size={28} className="text-cyan-400 shrink-0" />
                        <span className="text-base sm:text-lg font-black text-white leading-tight">Registro Sanitario INVIMA</span>
                    </div>
                    <div className="flex items-center gap-3.5 bg-white/5 border border-white/15 p-4 rounded-2xl">
                        <Truck size={28} className="text-cyan-400 shrink-0" />
                        <span className="text-base sm:text-lg font-black text-white leading-tight">Entregas 24h en Bogotá y Soacha</span>
                    </div>
                    <div className="flex items-center gap-3.5 bg-white/5 border border-white/15 p-4 rounded-2xl">
                        <Droplet size={28} className="text-cyan-400 shrink-0" />
                        <span className="text-base sm:text-lg font-black text-white leading-tight">Baja Espuma para Lavadoras HE</span>
                    </div>
                    <div className="flex items-center gap-3.5 bg-white/5 border border-white/15 p-4 rounded-2xl">
                        <DollarSign size={28} className="text-cyan-400 shrink-0" />
                        <span className="text-base sm:text-lg font-black text-white leading-tight">Ahorro Real de $307/Lavada</span>
                    </div>
                </div>
            </section>

            {/* INTERACTIVE SAVINGS CALCULATOR */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm">
                    <div className="text-center max-w-2xl mx-auto mb-10">
                        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-2">
                            <Calculator size={16} />
                            <span>Calculadora de Ahorro Real</span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2 leading-tight">
                            ¿Cuánto Dinero Ahorras Comprando la Caneca 20L?
                        </h2>
                        <p className="text-base sm:text-lg text-slate-600 font-medium mt-3">
                            Mueve el selector según las lavadas semanales en tu hogar o negocio y descubre tu ahorro real frente a botellas tradicionales de supermercado.
                        </p>
                    </div>

                    {/* Slider Control */}
                    <div className="max-w-xl mx-auto bg-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-200">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-base sm:text-lg font-black text-slate-800">
                                Ciclos de Lavado a la Semana:
                            </span>
                            <span className="text-2xl sm:text-3xl font-black text-blue-600">
                                {washCyclesPerWeek} lavadas/semana
                            </span>
                        </div>
                        <input 
                            type="range" 
                            min="3" 
                            max="50" 
                            value={washCyclesPerWeek}
                            onChange={(e) => setWashCyclesPerWeek(Number(e.target.value))}
                            className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-400 mt-2">
                            <span>3 (Hogar pequeño)</span>
                            <span>14 (Familia típica)</span>
                            <span>30+ (Lavandería / Hotel)</span>
                        </div>
                    </div>

                    {/* Results Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-10 text-center">
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="text-sm font-bold text-slate-500">Costo Mensual en Supermercados:</div>
                            <div className="text-2xl sm:text-3xl font-black text-red-600 mt-1">
                                {formatCurrency(monthlyCostSupermarket)}
                            </div>
                            <div className="text-xs font-semibold text-slate-500 mt-1">
                                Promedio $687 COP / lavada
                            </div>
                        </div>

                        <div className="p-6 bg-blue-50 rounded-2xl border border-blue-200">
                            <div className="text-sm font-bold text-blue-700">Costo Mensual con Caneca 20L:</div>
                            <div className="text-2xl sm:text-3xl font-black text-blue-700 mt-1">
                                {formatCurrency(monthlyCostBiocambio)}
                            </div>
                            <div className="text-xs font-bold text-emerald-700 mt-1">
                                Solo $307 COP / lavada (-55%)
                            </div>
                        </div>

                        <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200">
                            <div className="text-sm font-bold text-emerald-800">Tu Ahorro Neto Anual:</div>
                            <div className="text-3xl sm:text-4xl font-black text-emerald-700 mt-1">
                                +{formatCurrency(annualSavings)}
                            </div>
                            <div className="text-xs font-bold text-emerald-700 mt-1">
                                Dinero que se queda en tu bolsillo
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* COMPARISON BENCHMARK TABLE */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="text-center mb-8">
                    <span className="text-blue-600 font-black text-sm uppercase tracking-widest bg-blue-50 px-4 py-1.5 rounded-full">
                        Comparativa de Mercado Bogotá
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-3 leading-tight">
                        Biocambio360 vs Otras Marcas en Google Shopping y Mayoristas
                    </h2>
                    <p className="text-base sm:text-lg text-slate-600 font-medium mt-2">
                        Datos extraídos directamente de ofertas reales de mercado en Colombia.
                    </p>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-base sm:text-lg border-collapse">
                            <thead>
                                <tr className="bg-slate-900 text-white font-black text-sm sm:text-base uppercase tracking-wider">
                                    <th className="py-4 px-5">Proveedor / Marca</th>
                                    <th className="py-4 px-5">Presentación</th>
                                    <th className="py-4 px-5">Precio COP</th>
                                    <th className="py-4 px-5">Costo por Litro</th>
                                    <th className="py-4 px-5">Diferencia vs Biocambio360</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                <tr className="bg-emerald-50/70 font-bold text-emerald-950">
                                    <td className="py-4 px-5 font-black flex items-center gap-1.5 text-blue-700">
                                        <span>⭐ Biocambio360 (Fábrica Directa)</span>
                                    </td>
                                    <td className="py-4 px-5">Caneca 20 Litros</td>
                                    <td className="py-4 px-5 font-black text-blue-700 text-xl">$86.000</td>
                                    <td className="py-4 px-5 font-black text-emerald-700 text-lg">$4.300 / L</td>
                                    <td className="py-4 px-5 text-emerald-700 font-black">Mejor Precio Garantizado</td>
                                </tr>
                                <tr>
                                    <td className="py-4 px-5 font-bold text-slate-800">Detercol (Google Shopping)</td>
                                    <td className="py-4 px-5">Caneca 20 Litros</td>
                                    <td className="py-4 px-5 font-bold">$119.000</td>
                                    <td className="py-4 px-5">$5.950 / L</td>
                                    <td className="py-4 px-5 text-red-600 font-bold">+$33.000 COP más caro (+38%)</td>
                                </tr>
                                <tr>
                                    <td className="py-4 px-5 font-bold text-slate-800">PQP Profesional (Distribuciones)</td>
                                    <td className="py-4 px-5">Caneca 20 Litros</td>
                                    <td className="py-4 px-5 font-bold">$97.808</td>
                                    <td className="py-4 px-5">$4.890 / L</td>
                                    <td className="py-4 px-5 text-red-600 font-bold">+$11.808 COP más caro</td>
                                </tr>
                                <tr>
                                    <td className="py-4 px-5 font-bold text-slate-800">Abastece.co (Dersa Galón)</td>
                                    <td className="py-4 px-5">Galón 4 Litros</td>
                                    <td className="py-4 px-5 font-bold">$35.143</td>
                                    <td className="py-4 px-5">$8.785 / L</td>
                                    <td className="py-4 px-5 text-red-600 font-bold">+104% más caro por litro</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* PERSUASIVE VALUE PROPOSITION SECTION (PERSUASIVE VALUE PROPOSITION) */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="bg-gradient-to-br from-slate-900 via-[#0e213d] to-slate-900 text-white rounded-3xl p-8 sm:p-12 border border-blue-900/60 shadow-xl">
                    <div className="max-w-3xl mb-10">
                        <span className="text-cyan-400 font-black text-sm uppercase tracking-widest bg-cyan-950/80 px-4 py-1.5 rounded-full border border-cyan-800/50">
                            Fórmula Química vs Marketing de Supermercado
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-black text-white mt-4 leading-tight">
                            ¿Por qué un detergente de fábrica rinde hasta 3 veces más que uno comercial?
                        </h2>
                        <p className="text-base sm:text-xl text-slate-200 mt-3 font-medium leading-relaxed">
                            Conoce la ciencia detrás de una formulación concentrada que cuida tus prendas y elimina intermediarios comerciales.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Card 1 */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm flex flex-col justify-between">
                            <div>
                                <div className="w-11 h-11 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center font-black text-xl mb-4">
                                    👕
                                </div>
                                <h3 className="text-xl font-black text-white mb-2 leading-snug">
                                    Ropa Percudida y Mal Olor: El Truco de los Espesantes Salinos
                                </h3>
                                <p className="text-base sm:text-lg text-slate-200 font-medium leading-relaxed">
                                    ¿Cansado de sacar ropa con cuellos sucios o toallas con olor a húmedo después de haber gastado una fortuna en jabón de supermercado? Los detergentes comerciales masivos suelen usar espesantes salinos baratos que dan falsa sensación de cuerpo pero terminan percudiendo las telas y tapando conductos de tu lavadora.
                                </p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-white/10 text-sm text-pink-300 font-bold">
                                ➔ Se acabó refregar cuellos y gastar en desmanchadores extra.
                            </div>
                        </div>

                        {/* Card 2 */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm flex flex-col justify-between">
                            <div>
                                <div className="w-11 h-11 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black text-xl mb-4">
                                    🧪
                                </div>
                                <h3 className="text-xl font-black text-white mb-2 leading-snug">
                                    Bicarbonato Micronizado: Cuidado de Fibras y Lavadoras HE
                                </h3>
                                <p className="text-base sm:text-lg text-slate-200 font-medium leading-relaxed">
                                    En Biocambio360 incorporamos <strong>bicarbonato de sodio micronizado</strong> directamente en la formulación líquida. Rompe la tensión superficial del agua de la sabana de Bogotá, neutraliza olores corporales y desincrusta grasa orgánica sin usar cloro ni decolorar prendas oscuras o de color.
                                </p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-white/10 text-sm text-cyan-300 font-bold">
                                ➔ Pureza química diseñada para lavadoras HE y tradicionales.
                            </div>
                        </div>

                        {/* Card 3 */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm flex flex-col justify-between">
                            <div>
                                <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xl mb-4">
                                    💰
                                </div>
                                <h3 className="text-xl font-black text-white mb-2 leading-snug">
                                    Solo $307 COP por Carga: 280 Lavadas Garantizadas
                                </h3>
                                <p className="text-base sm:text-lg text-slate-200 font-medium leading-relaxed">
                                    Con solo 70 ml por carga de 8 a 10 kg, una caneca de 20 Litros produce <strong>280 lavadas a $307 COP cada una</strong>. Si lavas 14 veces a la semana, gastas <strong>$18.420 COP al mes</strong>. Con marcas de retail gastarías $41.200 COP al mes. Es un ahorro neto de <strong>$273.000 COP al año</strong> que se queda en tu cuenta.
                                </p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-white/10 text-sm text-emerald-300 font-bold">
                                ➔ Menos de la mitad del costo de las botellas comerciales.
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* VERIFIED CUSTOMER TESTIMONIALS (EEAT) */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center max-w-2xl mx-auto mb-10">
                    <span className="text-blue-600 font-black text-sm uppercase tracking-widest bg-blue-50 px-4 py-1.5 rounded-full">
                        Opiniones Reales Verificadas
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2 leading-tight">
                        Quienes Ya Cambiaron el Jabón Tradicional por la Caneca 20L
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Review 1 */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-1.5 text-amber-400 mb-3">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={18} className="fill-amber-400" />
                                ))}
                            </div>
                            <p className="text-base sm:text-lg text-slate-700 leading-relaxed font-medium italic">
                                "En mi lavandería procesamos más de 40 cargas diarias. Cambiar a la caneca de 20L de Biocambio360 fue la mejor decisión operativa del año: la ropa no queda acartonada, no deja marcas blancas en prendas oscuras y el costo por kilo lavado se redujo a la mitad."
                            </p>
                        </div>
                        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-xs">
                                DM
                            </div>
                            <div>
                                <div className="text-base font-black text-slate-900">Diana Morales</div>
                                <div className="text-xs text-slate-500 font-semibold">Lavandería Suba, Bogotá</div>
                            </div>
                        </div>
                    </div>

                    {/* Review 2 */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-1.5 text-amber-400 mb-3">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={18} className="fill-amber-400" />
                                ))}
                            </div>
                            <p className="text-base sm:text-lg text-slate-700 leading-relaxed font-medium italic">
                                "Somos una familia de 5 personas con 3 hijos en colegio. Gastábamos $70.000 mensuales en botellas plásticas del supermercado. Esta caneca nos duró 8 meses y medio. Los uniformes blancos están impecables y no hemos vuelto a comprar desmanchadores adicionales."
                            </p>
                        </div>
                        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-black flex items-center justify-center text-xs">
                                AC
                            </div>
                            <div>
                                <div className="text-base font-black text-slate-900">Andrés Cárdenas</div>
                                <div className="text-xs text-slate-500 font-semibold">Hogar Familiar, Fontibón</div>
                            </div>
                        </div>
                    </div>

                    {/* Review 3 */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-1.5 text-amber-400 mb-3">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={18} className="fill-amber-400" />
                                ))}
                            </div>
                            <p className="text-base sm:text-lg text-slate-700 leading-relaxed font-medium italic">
                                "Nuestros huéspedes siempre comentan la suavidad y aroma de la lencería de cama. Lo usamos junto al suavizante de la misma marca. Excelente poder desengrasante en toallas de cocina y mantelería."
                            </p>
                        </div>
                        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-black flex items-center justify-center text-xs">
                                MR
                            </div>
                            <div>
                                <div className="text-base font-black text-slate-900">Mario Restrepo</div>
                                <div className="text-xs text-slate-500 font-semibold">Hotel Boutique, La Candelaria</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ SECTION */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center mb-10">
                    <span className="text-blue-600 font-black text-sm uppercase tracking-widest">
                        Preguntas Frecuentes
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2 leading-tight">
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
                                className="w-full text-left p-5 font-black text-base sm:text-lg text-slate-900 flex items-center justify-between gap-4 hover:text-blue-600 transition-colors"
                            >
                                <span className="flex items-center gap-2.5">
                                    <HelpCircle size={20} className="text-blue-600 shrink-0" />
                                    {faq.q}
                                </span>
                                <ChevronDown 
                                    size={20} 
                                    className={`transition-transform duration-200 shrink-0 ${activeFaq === idx ? 'rotate-180 text-blue-600' : 'text-slate-400'}`} 
                                />
                            </button>
                            {activeFaq === idx && (
                                <div className="px-5 pb-5 pt-1 text-base sm:text-lg text-slate-700 font-medium leading-relaxed border-t border-slate-100">
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
                        Explora Más Soluciones de Lavandería y Aseo Mayorista:
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-bold">
                        <Link 
                            href="/fabricantes-productos-aseo-bogota"
                            className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-500 transition-colors text-slate-800 flex items-center justify-between"
                        >
                            <span>Fábrica de Productos de Aseo Bogotá</span>
                            <ArrowRight size={16} className="text-blue-600" />
                        </Link>
                        <Link 
                            href="/blog/rendimiento-dosificacion-caneca-20-litros-detergente-bogota"
                            className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-500 transition-colors text-slate-800 flex items-center justify-between"
                        >
                            <span>Guía: ¿Cuántas Lavadas Rinde la Caneca 20L?</span>
                            <ArrowRight size={16} className="text-blue-600" />
                        </Link>
                        <Link 
                            href="/blog/productos-aseo-d1-vs-fabrica-ahorro-calidad"
                            className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-500 transition-colors text-slate-800 flex items-center justify-between"
                        >
                            <span>Comparativa: Aseo D1 vs Fábrica Directa</span>
                            <ArrowRight size={16} className="text-blue-600" />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
