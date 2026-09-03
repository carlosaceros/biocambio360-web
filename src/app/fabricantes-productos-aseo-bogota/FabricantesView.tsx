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
    Zap
} from 'lucide-react';
import { Product, formatCurrency, ProductSize } from '@/lib/products';
import { useCart } from '@/lib/cart-context';
import Toast from '@/components/Toast';

interface FabricantesViewProps {
    products: Product[];
}

export default function FabricantesView({ products }: FabricantesViewProps) {
    const { addToCart } = useCart();
    const [activeFaq, setActiveFaq] = useState<number | null>(null);
    const [toastMessage, setToastMessage] = useState<{ show: boolean; name: string; size: string }>({
        show: false,
        name: '',
        size: ''
    });

    // Curated high-volume industrial products
    const featuredIds = [
        'detergente-liquido-multiusos',
        'desengrasante',
        'suavizante',
        'lavaloza-liquido',
        'bactokill',
        'cloro'
    ];

    const featuredProducts = products.filter(p => featuredIds.includes(p.id));

    const handleQuickAdd = (product: Product, size: string) => {
        const price = product.precios[size] || 0;
        addToCart(product, size as ProductSize, price, 1);
        setToastMessage({ show: true, name: product.nombre, size });
    };

    const faqs = [
        {
            q: '¿Dónde está ubicada la fábrica de Biocambio360?',
            a: 'Nuestra planta de producción principal está ubicada en Soacha, Cundinamarca (Cra. 7C #44-17 Sur). Contamos con despacho directo propio en 24h a las 20 localidades de Bogotá D.C. y municipios de la sabana, además de punto de recogida en fábrica sin costo de flete.'
        },
        {
            q: '¿Exigen pedido mínimo como otros fabricantes en Bogotá?',
            a: 'No. A diferencia de otros laboratorios que exigen producir o comprar mínimo 500 unidades, en Biocambio360 puedes comprar a precio de fábrica desde 1 caneca de 20 Litros o 1 galón de 3.8L, tanto para empresas como para hogares.'
        },
        {
            q: '¿Los productos cuentan con registro INVIMA y fichas técnicas?',
            a: 'Sí. Todos nuestros insumos de limpieza y desinfección cuentan con Notificación Sanitaria Obligatoria (NSO) INVIMA, Fichas Técnicas (TDS) y Hojas de Seguridad (MSDS) bajo Sistema Globalmente Armonizado (SGA), indispensables para auditorías de Secretaría de Salud.'
        },
        {
            q: '¿Cuáles son los tiempos de entrega en Bogotá y Cundinamarca?',
            a: 'Despachamos pedidos en 24 a 48 horas hábiles en Bogotá D.C. (Suba, Usaquén, Kennedy, Fontibón, Chapinero, etc.) y municipios de la sabana (Soacha, Chía, Mosquera, Funza, Madrid, Cajicá).'
        },
        {
            q: '¿Cómo obtengo precios especiales para compras por mayoristas o empresas?',
            a: 'Puedes agregar directamente tus canecas y bidones en esta página con precio de fábrica visible, o usar nuestro Cotizador B2B para generar una propuesta formal en PDF con facturación electrónica DIAN.'
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
            <section className="relative overflow-hidden bg-gradient-to-b from-[#0b172a] via-[#0f213d] to-[#0b172a] text-white pt-14 pb-24 px-4 sm:px-6 lg:px-8">
                <div className="absolute inset-0 opacity-15 mix-blend-screen pointer-events-none">
                    <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500 rounded-full blur-[120px]"></div>
                    <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-400 rounded-full blur-[120px]"></div>
                </div>

                <div className="max-w-6xl mx-auto relative z-10">
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-3 mb-6">
                        <div className="inline-flex items-center gap-2.5 bg-white/10 backdrop-blur-md border border-white/25 px-4 py-2 rounded-full text-sm font-black text-blue-200">
                            <Factory size={18} className="text-cyan-400" />
                            <span>FÁBRICA DIRECTA EN BOGOTÁ Y SOACHA · SIN INTERMEDIARIOS</span>
                        </div>
                        <div className="inline-flex items-center gap-2.5 bg-emerald-500/25 backdrop-blur-md border border-emerald-400/40 px-4 py-2 rounded-full text-sm font-black text-emerald-300">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                            <span>Lote de Hoy: 28 canecas para despacho prioritario 24h</span>
                        </div>
                    </div>

                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-tight max-w-5xl">
                        Fabricantes de Productos de Aseo en Bogotá:{' '}
                        <span className="bg-gradient-to-r from-cyan-300 via-blue-200 to-indigo-200 bg-clip-text text-transparent">
                            Calidad Industrial a Precio Real de Planta
                        </span>
                    </h1>

                    {/* Enlarged Hero Paragraph (+90%) */}
                    <p className="mt-8 text-xl sm:text-2xl lg:text-3xl text-slate-200 max-w-4xl leading-relaxed font-semibold">
                        Abastécete con productos de limpieza, desinfección y lavandería fabricados en Colombia. 
                        Ahorra hasta un <strong className="text-white font-black underline decoration-cyan-400 underline-offset-4">45% frente a supermercados</strong> comprando por galón, bidón de 10L o caneca de 20 Litros.
                    </p>

                    {/* Enlarged Direct Answer Box for AEO / AI Overview */}
                    <div className="mt-10 bg-white/10 backdrop-blur-md border-2 border-cyan-400/50 rounded-3xl p-6 sm:p-8 max-w-4xl shadow-2xl">
                        <div className="flex items-center gap-2.5 text-cyan-300 font-black text-sm sm:text-base uppercase tracking-wider mb-3">
                            <Sparkles size={20} className="text-yellow-400" />
                            <span>RESPUESTA RÁPIDA / PROVEEDOR DIRECTO</span>
                        </div>
                        <p className="text-lg sm:text-2xl text-slate-100 font-semibold leading-relaxed">
                            <strong className="text-white font-black">Biocambio360</strong> es una fábrica colombiana de productos de aseo, limpieza y desinfección con planta de formulación en Soacha (Cra. 7C #44-17 Sur). Suministra detergentes líquidos multiusos, desengrasantes pesados, suavizantes, desinfectantes con amonio cuaternario y cloros a precios de fábrica directos, con despacho en 24-48 horas a las 20 localidades de Bogotá y municipios de Cundinamarca, sin exigir pedidos mínimos de 500 unidades.
                        </p>
                    </div>

                    {/* CTA Buttons */}
                    <div className="mt-10 flex flex-wrap items-center gap-5">
                        <a 
                            href="#catalogo-fabrica" 
                            className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-blue-500/30 transition-all text-base sm:text-lg flex items-center gap-2.5"
                        >
                            <ShoppingCart size={22} />
                            Ver Precios y Comprar Online
                        </a>
                        <Link 
                            href="/cotizador-b2b" 
                            className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-black px-8 py-4 rounded-2xl transition-all text-base sm:text-lg flex items-center gap-2.5"
                        >
                            <Building2 size={22} />
                            Cotización Empresarial / B2B
                        </Link>
                        <a 
                            href="https://wa.me/573223600360?text=Hola,%20quisiera%20cotizar%20productos%20de%20aseo%20directo%20de%20f%C3%A1brica" 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:text-emerald-300 font-black text-base sm:text-lg flex items-center gap-2 px-4 py-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20"
                        >
                            <Phone size={20} /> WhatsApp Directo
                        </a>
                    </div>

                    {/* Enlarged Trust Micro-badges (Screenshot 2) */}
                    <div className="mt-14 pt-10 border-t border-white/15 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="flex items-center gap-3.5 bg-white/5 border border-white/15 p-4 rounded-2xl">
                            <CheckCircle2 size={28} className="text-cyan-400 shrink-0" />
                            <span className="text-base sm:text-lg font-black text-white leading-tight">Registro Sanitario INVIMA</span>
                        </div>
                        <div className="flex items-center gap-3.5 bg-white/5 border border-white/15 p-4 rounded-2xl">
                            <Truck size={28} className="text-cyan-400 shrink-0" />
                            <span className="text-base sm:text-lg font-black text-white leading-tight">Entregas 24h en Bogotá y Soacha</span>
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

            {/* COMPARISON SECTION: FABRICA VS DISTRIBUIDORES VS SUPERMERCADO */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <span className="text-blue-600 font-black text-sm uppercase tracking-widest bg-blue-50 px-4 py-1.5 rounded-full">
                        Transparencia de Costos
                    </span>
                    <h2 className="text-3xl sm:text-5xl font-black text-slate-900 mt-3 leading-tight">
                        ¿Por qué comprar a Biocambio360 en lugar de Supermercados o Intermediarios?
                    </h2>
                    <p className="text-lg sm:text-xl text-slate-600 font-semibold mt-3">
                        Compara el costo por litro real y la concentración activa de nuestros insumos de fábrica.
                    </p>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-base sm:text-lg border-collapse">
                            <thead>
                                <tr className="bg-slate-900 text-white font-black text-sm sm:text-base uppercase tracking-wider">
                                    <th className="py-5 px-6">Criterio de Compra</th>
                                    <th className="py-5 px-6 bg-blue-600 text-white">Biocambio360 (Fábrica Directa)</th>
                                    <th className="py-5 px-6">Distribuidores Intermediarios</th>
                                    <th className="py-5 px-6">Supermercados / Hard Discount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                <tr>
                                    <td className="py-5 px-6 font-black text-slate-900">Precio Caneca 20L Detergente</td>
                                    <td className="py-5 px-6 font-black text-blue-700 bg-blue-50/70 text-xl sm:text-2xl">$86.000 COP</td>
                                    <td className="py-5 px-6">$115.000 - $130.000 COP</td>
                                    <td className="py-5 px-6">No disponible (solo botellas 1L-3L)</td>
                                </tr>
                                <tr>
                                    <td className="py-5 px-6 font-black text-slate-900">Costo promedio por Litro</td>
                                    <td className="py-5 px-6 font-black text-emerald-700 bg-blue-50/70 text-lg sm:text-xl">$4.300 COP / Litro</td>
                                    <td className="py-5 px-6">$6.000 - $8.000 COP / Litro</td>
                                    <td className="py-5 px-6 text-red-600 font-bold">$8.500 - $14.000 COP / Litro</td>
                                </tr>
                                <tr>
                                    <td className="py-5 px-6 font-black text-slate-900">Pedido Mínimo Exigido</td>
                                    <td className="py-5 px-6 font-black text-blue-700 bg-blue-50/70">Desde 1 unidad (1 caneca o galón)</td>
                                    <td className="py-5 px-6">Desde 10 a 500 unidades</td>
                                    <td className="py-5 px-6">Sin mínimo (precios minoristas caros)</td>
                                </tr>
                                <tr>
                                    <td className="py-5 px-6 font-black text-slate-900">Concentración Activa</td>
                                    <td className="py-5 px-6 font-black text-blue-700 bg-blue-50/70">Alta concentración industrial + Bicarbonato</td>
                                    <td className="py-5 px-6">Variable según marca</td>
                                    <td className="py-5 px-6 text-red-600 font-bold">Diluido con alto % de agua para abaratar</td>
                                </tr>
                                <tr>
                                    <td className="py-5 px-6 font-black text-slate-900">Tiempos de Entrega</td>
                                    <td className="py-5 px-6 font-black text-blue-700 bg-blue-50/70">24h a 48h con flota local</td>
                                    <td className="py-5 px-6">3 a 5 días hábiles</td>
                                    <td className="py-5 px-6">Inmediato pero debes cargar peso a pie</td>
                                </tr>
                                <tr>
                                    <td className="py-5 px-6 font-black text-slate-900">Asesoría Técnica Especializada</td>
                                    <td className="py-5 px-6 font-black text-blue-700 bg-blue-50/70">Sí, asesoría en dilución y mezclas</td>
                                    <td className="py-5 px-6">Solo vendedores comerciales</td>
                                    <td className="py-5 px-6">Ninguna</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* PERSUASIVE VALUE PROPOSITION (PERSUASIVE VALUE PROPOSITION) */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
                <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-8 sm:p-14 border border-blue-900/60 shadow-xl">
                    <div className="max-w-3xl mb-12">
                        <span className="text-cyan-400 font-black text-sm uppercase tracking-widest bg-cyan-950/80 px-4 py-1.5 rounded-full border border-cyan-800/50">
                            La Realidad del Mercado de Aseo
                        </span>
                        <h2 className="text-3xl sm:text-5xl font-black text-white mt-4 leading-tight">
                            ¿Por qué seguir pagando agua cara y envases desechables en el supermercado?
                        </h2>
                        <p className="text-lg sm:text-xl text-slate-200 mt-3 font-medium leading-relaxed">
                            Una mirada transparente a cómo se formulan los productos de limpieza en Colombia y por qué la compra directa a fábrica transforma las finanzas de tu hogar o empresa.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Card 1 */}
                        <div className="bg-white/5 border border-white/15 rounded-3xl p-7 backdrop-blur-sm flex flex-col justify-between">
                            <div>
                                <div className="w-12 h-12 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center font-black text-2xl mb-5">
                                    💔
                                </div>
                                <h3 className="text-xl sm:text-2xl font-black text-white mb-3 leading-snug">
                                    ¿Por qué el jabón tradicional se agota tan rápido y no limpia a fondo?
                                </h3>
                                <p className="text-base sm:text-lg text-slate-200 font-medium leading-relaxed">
                                    Comprar botellas de 1L en tiendas de retail cada semana es agotador. Llegas a casa, usas un chorro generoso y la grasa sigue pegada en los platos o las toallas quedan oliendo a humedad. La industria tradicional suele añadir hasta un 70% de agua para forzarte a recomprar constantemente.
                                </p>
                            </div>
                            <div className="mt-6 pt-4 border-t border-white/15 text-sm sm:text-base text-pink-300 font-extrabold">
                                ➔ Se acabó tirar tu dinero en envases plásticos desechables.
                            </div>
                        </div>

                        {/* Card 2 */}
                        <div className="bg-white/5 border border-white/15 rounded-3xl p-7 backdrop-blur-sm flex flex-col justify-between">
                            <div>
                                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black text-2xl mb-5">
                                    🔬
                                </div>
                                <h3 className="text-xl sm:text-2xl font-black text-white mb-3 leading-snug">
                                    Fórmula Industrial de Planta con Bicarbonato y Registro INVIMA
                                </h3>
                                <p className="text-base sm:text-lg text-slate-200 font-medium leading-relaxed">
                                    En nuestra planta de Soacha formulamos insumos concentrados de alta densidad. Empleamos tensoactivos biodegradables y potenciamos con <strong>bicarbonato de sodio activo</strong> para remover suciedad difícil sin sal espesante que dañe electrodomésticos ni químicos agresivos que resequen la piel. Todo con respaldo técnico y registro legal.
                                </p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-white/15 text-sm sm:text-base text-cyan-300 font-extrabold">
                                ➔ Calidad química industrial garantizada con ficha técnica.
                            </div>
                        </div>

                        {/* Card 3 */}
                        <div className="bg-white/5 border border-white/15 rounded-3xl p-7 backdrop-blur-sm flex flex-col justify-between">
                            <div>
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-2xl mb-5">
                                    📈
                                </div>
                                <h3 className="text-xl sm:text-2xl font-black text-white mb-3 leading-snug">
                                    Ahorro Real de Más de $100.000 COP por Cada Caneca
                                </h3>
                                <p className="text-base sm:text-lg text-slate-200 font-medium leading-relaxed">
                                    Una caneca de 20L de detergente Biocambio360 cuesta <strong>$86.000 COP</strong> y rinde <strong>280 lavadas a $307 COP</strong> por ciclo. Comprar el equivalente en botellitas de supermercado costaría más de $190.000 COP. Te ahorras más de <strong>$100.000 COP netos</strong> por caneca y evitas desechar 20 envases plásticos.
                                </p>
                            </div>
                            <div className="mt-6 pt-4 border-t border-white/15 text-sm sm:text-base text-emerald-300 font-extrabold">
                                ➔ Retorno de inversión tangible desde la primera semana.
                            </div>
                        </div>
                    </div>

                    {/* Closing Bridge Box */}
                    <div className="mt-10 p-7 sm:p-9 bg-white/10 rounded-3xl border border-white/20 text-lg sm:text-2xl text-slate-100 font-medium leading-relaxed">
                        <p>
                            <strong className="text-white font-black">Imagina la tranquilidad de no tener que volver a preocuparte por insumos de aseo en los próximos 7 a 9 meses.</strong> Una sola entrega en la puerta de tu casa o negocio, la satisfacción de comprobar su consistencia concentrada en cada uso y la certeza de que tu ropa, pisos y vajilla quedan relucientes sin pagar de más.
                        </p>
                    </div>
                </div>
            </section>

            {/* VERIFIED LOCAL TESTIMONIALS (EEAT) */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <span className="text-blue-600 font-black text-sm uppercase tracking-widest bg-blue-50 px-4 py-1.5 rounded-full">
                        Experiencias Reales en Bogotá
                    </span>
                    <h2 className="text-3xl sm:text-5xl font-black text-slate-900 mt-3 leading-tight">
                        Lo que Dicen Negocios y Hogares que ya Compran en Fábrica
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
                                "En la lavandería el gasto de jabón era un dolor de cabeza. Compramos la pimpina de 20L de detergente y el suavizante con Biocambio360 y nuestro costo por carga bajó de $650 a $307. Los clientes elogian el olor a limpio y la suavidad de las sábanas."
                            </p>
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-sm">
                                DM
                            </div>
                            <div>
                                <div className="text-base sm:text-lg font-black text-slate-900">Diana Morales</div>
                                <div className="text-sm text-slate-500 font-semibold">Lavandería Express Suba (Bogotá)</div>
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
                                "El desengrasante industrial nos solucionó el mantenimiento de las campanas y estufas del restaurante. Aplica, dejas actuar 10 minutos y la grasa pegada sale sin rayar el acero. Además, nos entregan directo en el local en menos de 24h."
                            </p>
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 font-black flex items-center justify-center text-sm">
                                JG
                            </div>
                            <div>
                                <div className="text-base sm:text-lg font-black text-slate-900">Javier Gómez</div>
                                <div className="text-sm text-slate-500 font-semibold">Piqueteadero & Restaurante, Soacha</div>
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
                                "Administro un conjunto de 240 apartamentos. Antes comprábamos en distribuidores que cobraban fletes altísimos. Con Biocambio360 pedimos la dotación mensual de limpiapisos, cloro y jabón de manos; nos ahorramos más de $350.000 al mes y tenemos factura DIAN."
                            </p>
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 font-black flex items-center justify-center text-sm">
                                MC
                            </div>
                            <div>
                                <div className="text-base sm:text-lg font-black text-slate-900">Marta Cárdenas</div>
                                <div className="text-sm text-slate-500 font-semibold">Administradora P.H., Bogotá</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* PRODUCT SHOWCASE / DIRECT BUY */}
            <section id="catalogo-fabrica" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
                    <div>
                        <span className="text-blue-600 font-black text-sm uppercase tracking-widest">
                            Catálogo Estrella
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-2 leading-tight">
                            Presentaciones Industriales Directas de Fábrica
                        </h2>
                        <p className="text-lg text-slate-600 font-medium mt-2">
                            Haz tu pedido online y recíbelo en tu puerta o retira en fábrica en Soacha.
                        </p>
                    </div>
                    <Link 
                        href="/" 
                        className="text-blue-600 hover:text-blue-800 font-black text-base flex items-center gap-1.5 shrink-0"
                    >
                        Ver todos los productos <ArrowRight size={18} />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {featuredProducts.map(product => {
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
                                                Caneca 20L Disponible
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
                                            {formatCurrency(mainPrice)}
                                        </div>
                                        {has20L && (
                                            <div className="text-sm text-emerald-600 font-black mt-1">
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

            {/* COVERAGE & BOGOTA GEO MAP SECTION */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-3xl p-8 sm:p-14 shadow-xl border border-blue-900/60">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                        <div className="lg:col-span-7 space-y-4">
                            <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 px-3.5 py-1.5 rounded-full text-xs font-black border border-blue-500/30">
                                <MapPin size={16} />
                                <span>COBERTURA TOTAL EN BOGOTÁ Y CUNDINAMARCA</span>
                            </div>

                            <h2 className="text-3xl sm:text-5xl font-black leading-tight">
                                Despachos Diarios Directos desde Nuestra Planta en Soacha
                            </h2>

                            <p className="text-slate-200 text-base sm:text-xl font-medium leading-relaxed">
                                Abastecemos a negocios, lavanderías, empresas y conjuntos residenciales en todas las 20 localidades del Distrito Capital y municipios aledaños. Nuestra flota local garantiza tiempos de entrega de <strong>24 a 48 horas</strong>.
                            </p>

                            {/* Localities Tags */}
                            <div className="pt-3">
                                <p className="text-sm font-black text-slate-400 uppercase tracking-wider mb-2.5">
                                    Localidades y Zonas de Entrega Frecuente:
                                </p>
                                <div className="flex flex-wrap gap-2 text-xs sm:text-sm font-bold text-slate-200">
                                    {['Soacha', 'Bosa', 'Kennedy', 'Puente Aranda', 'Fontibón', 'Engativá', 'Suba', 'Usaquén', 'Chapinero', 'Teusaquillo', 'Los Mártires', 'Antonio Nariño', 'San Cristóbal', 'Tunjuelito', 'Ciudad Bolívar', 'Mosquera', 'Funza', 'Madrid', 'Chía', 'Cajicá', 'Cota'].map(loc => (
                                        <span key={loc} className="bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-lg">
                                            {loc}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 flex flex-wrap gap-5 text-sm sm:text-base font-black">
                                <div className="flex items-center gap-2 text-cyan-300">
                                    <Clock size={18} /> Entregas Lun a Sáb
                                </div>
                                <div className="flex items-center gap-2 text-emerald-400">
                                    <ShieldCheck size={18} /> Opción de Pago Contraentrega
                                </div>
                            </div>
                        </div>

                        {/* Physical Address Card */}
                        <div className="lg:col-span-5 bg-white/10 backdrop-blur-md border border-white/20 p-7 rounded-3xl text-sm space-y-5">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-blue-600 text-white rounded-2xl shrink-0">
                                    <MapPin size={24} />
                                </div>
                                <div>
                                    <div className="text-xs text-slate-300 uppercase font-black tracking-wider">Dirección de Planta</div>
                                    <div className="text-xl font-black text-white mt-1">Cra. 7C #44-17 Sur</div>
                                    <div className="text-slate-300 text-sm font-medium mt-0.5">Soacha, Cundinamarca (Planta Biocambio360)</div>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-900/70 rounded-2xl border border-slate-800 text-sm text-slate-200 space-y-2 leading-relaxed">
                                <div><strong>Horario de atención:</strong> Lun - Sáb: 8:00 AM - 5:30 PM</div>
                                <div><strong>Retiro en planta:</strong> Puedes recoger tus productos sin pagar costo de envío.</div>
                            </div>

                            <a 
                                href="https://maps.google.com/?q=Soacha+Cundinamarca+Biocambio360" 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full bg-white hover:bg-slate-100 text-slate-900 font-black py-4 px-5 rounded-2xl text-center block transition-colors text-base"
                            >
                                Abrir Ubicación en Google Maps
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* B2B / CORPORATE CALLOUT */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-8 sm:p-12 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-3">
                        <span className="bg-white/20 text-white text-xs font-black uppercase px-3 py-1 rounded-full">
                            Licitaciones & Empresas
                        </span>
                        <h3 className="text-2xl sm:text-4xl font-black leading-tight">
                            ¿Necesitas cotización formal para tu empresa o colegio?
                        </h3>
                        <p className="text-emerald-100 text-base sm:text-lg font-medium max-w-2xl leading-relaxed">
                            Usa nuestro Cotizador B2B automatizado para generar una propuesta formal en PDF con descuentos por volumen y fichas técnicas en 30 segundos.
                        </p>
                    </div>
                    <Link
                        href="/cotizador-b2b"
                        className="bg-white text-emerald-950 hover:bg-yellow-300 font-black px-8 py-4 rounded-2xl transition-all text-base whitespace-nowrap shadow-md flex items-center gap-2"
                    >
                        <Building2 size={20} /> Ir al Cotizador B2B
                    </Link>
                </div>
            </section>

            {/* FAQ ACCORDION SECTION */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center mb-12">
                    <span className="text-blue-600 font-black text-sm uppercase tracking-widest">
                        Resolvemos tus Dudas
                    </span>
                    <h2 className="text-3xl sm:text-5xl font-black text-slate-900 mt-2 leading-tight">
                        Preguntas Frecuentes sobre Compra Directa en Fábrica
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

            {/* INTERLINKING FOOTER CLUSTER */}
            <section className="bg-slate-100 border-t border-slate-200 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto">
                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-wider mb-5">
                        Enlaces Relacionados y Recursos Técnicos de Aseo:
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-sm sm:text-base">
                        <Link 
                            href="/detergente-liquido-por-mayor-bogota"
                            className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-500 transition-colors font-bold text-slate-800 flex items-center justify-between"
                        >
                            <span>Detergente Líquido 20 Litros por Mayor</span>
                            <ArrowRight size={18} className="text-blue-600" />
                        </Link>
                        <Link 
                            href="/guia-uso-y-mezclas"
                            className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-500 transition-colors font-bold text-slate-800 flex items-center justify-between"
                        >
                            <span>Guía de Mezclas y Diluciones Químicas</span>
                            <ArrowRight size={18} className="text-blue-600" />
                        </Link>
                        <Link 
                            href="/blog/detergente-liquido-bogota-20-litros-precio-fabrica"
                            className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-blue-500 transition-colors font-bold text-slate-800 flex items-center justify-between"
                        >
                            <span>Artículo: Detergente 20L Bogotá Precio Fábrica</span>
                            <ArrowRight size={18} className="text-blue-600" />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
