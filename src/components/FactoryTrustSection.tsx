'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, Sparkles, TrendingUp, Lock, Truck, ArrowRight, Award, CheckCircle2 } from 'lucide-react';

export default function FactoryTrustSection() {
    return (
        <section className="my-16 px-4 md:px-6 max-w-7xl mx-auto">
            <div className="rounded-[3rem] relative overflow-hidden bg-gradient-to-br from-[#0b172a] via-[var(--brand-dark)] to-[#09101f] text-white shadow-2xl border border-white/10 p-8 md:p-16">
                
                {/* Background Video Stream */}
                <div className="absolute inset-0 z-0 overflow-hidden opacity-25 mix-blend-luminosity">
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

                {/* Overlays & Bokeh */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#0b172a]/95 via-[#0b172a]/85 to-transparent z-[1]" />
                <div className="absolute -top-32 -left-32 w-96 h-96 bg-[var(--brand-blue)]/20 rounded-full blur-[140px] z-[1] pointer-events-none" />
                <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-[var(--brand-pink)]/20 rounded-full blur-[140px] z-[1] pointer-events-none" />

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                    
                    {/* Left: Ethos, Pathos & Logos Copy (7 cols) */}
                    <div className="lg:col-span-7 space-y-6">
                        
                        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 px-4 py-2 rounded-full">
                            <Award className="w-4 h-4 text-[var(--brand-success)]" />
                            <span className="text-[11px] font-black tracking-widest uppercase text-white/90">
                                Transparencia de Fábrica Directa · EEAT Certificado
                            </span>
                        </div>

                        <h2 className="text-3xl md:text-5xl font-black leading-[1.05] tracking-tight">
                            Ciencia y Calidad de Fábrica <br />
                            <span className="bg-gradient-to-r from-[var(--brand-blue-light)] via-white to-[var(--brand-pink)] bg-clip-text text-transparent italic">
                                Directo a tu Puerta y sin Intermediarios.
                            </span>
                        </h2>

                        <p className="text-white/80 text-base md:text-lg leading-relaxed font-normal">
                            En <strong className="text-white font-bold">Biocambio360</strong> fabricamos soluciones de limpieza profesional concentrada en nuestra propia planta en Colombia. Diseñamos productos que cuidan tu salud y maximizan tu presupuesto.
                        </p>

                        {/* Persuasive Pillars Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                            
                            {/* Autoridad & Origen */}
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl space-y-2 hover:bg-white/10 transition-colors">
                                <div className="w-9 h-9 rounded-xl bg-[var(--brand-blue)]/20 text-[var(--brand-blue-light)] flex items-center justify-center font-black text-sm">
                                    🏛️
                                </div>
                                <h4 className="font-extrabold text-sm text-white">Fábrica Propia Certificada</h4>
                                <p className="text-xs text-white/70 leading-normal">
                                    Formulados sin revendedores ni diluciones. Control estricto de calidad desde nuestra planta en Soacha.
                                </p>
                            </div>

                            {/* Cuidado & Salud Familiar */}
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl space-y-2 hover:bg-white/10 transition-colors">
                                <div className="w-9 h-9 rounded-xl bg-pink-500/20 text-pink-300 flex items-center justify-center font-black text-sm">
                                    💙
                                </div>
                                <h4 className="font-extrabold text-sm text-white">Cuidado & Salud Familiar</h4>
                                <p className="text-xs text-white/70 leading-normal">
                                    Tranquilidad total para tu familia. Alta eficiencia, seguros con tus telas y fragancias de larga duración.
                                </p>
                            </div>

                            {/* Rendimiento & Ahorro 60% */}
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl space-y-2 hover:bg-white/10 transition-colors">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-black text-sm">
                                    📊
                                </div>
                                <h4 className="font-extrabold text-sm text-white">Rendimiento & Ahorro 60%</h4>
                                <p className="text-xs text-white/70 leading-normal">
                                    Concentrados para durar 3x más. Paga directo de fábrica sin margen comercial de supermercado.
                                </p>
                            </div>
                        </div>

                        {/* CTA buttons */}
                        <div className="pt-4 flex flex-wrap gap-4 items-center">
                            <motion.button
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}
                                className="bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-dark)] text-white font-black px-8 py-4 rounded-2xl shadow-xl hover:shadow-[var(--brand-blue)]/30 transition-all flex items-center gap-3 text-sm"
                            >
                                COMPRAR ONLINE CON 60% AHORRO
                                <ArrowRight size={18} />
                            </motion.button>

                            <div className="flex items-center gap-2 text-xs text-white/70 font-medium px-3 py-2 bg-white/5 rounded-xl border border-white/10">
                                <Lock size={14} className="text-[var(--brand-success)]" />
                                <span>Pago 100% Seguro con Wompi (Nequi, Daviplata, Tarjetas)</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Embedded Interactive Video Showcase Frame (5 cols) */}
                    <div className="lg:col-span-5 relative">
                        <div className="relative rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black aspect-[4/5] group">
                            <video
                                autoPlay
                                loop
                                muted
                                playsInline
                                controls
                                className="w-full h-full object-cover"
                            >
                                <source src="/videos/fabrica-biocambio360.mp4" type="video/mp4" />
                                <source src="/videos/fabrica-biocambio360.mov" type="video/quicktime" />
                            </video>

                            {/* Floating overlay badge */}
                            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 text-[10px] font-extrabold text-white flex items-center gap-2">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                                PLANTA DE PRODUCCIÓN SOACHA · EN VIVO
                            </div>

                            <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-md p-4 rounded-2xl border border-white/15 text-xs text-white/90">
                                <p className="font-extrabold text-white mb-1">🏭 Fabricación 100% Nacional</p>
                                <p className="text-[11px] text-white/70">
                                    Cada lote es elaborado y verificado en laboratorio para garantizar máxima potencia de limpieza sin sulfatos nocivos.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}
