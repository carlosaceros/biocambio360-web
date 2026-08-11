'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, ShoppingBag, Store, Navigation, Phone, Sparkles } from 'lucide-react';

export default function SoachaLocationCard() {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <section className="my-12 px-4 md:px-6 max-w-7xl mx-auto">
            <div 
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="group relative rounded-[2.5rem] overflow-hidden bg-[var(--brand-dark)] border border-gray-100 shadow-xl transition-all duration-500 hover:shadow-2xl hover:shadow-[var(--brand-blue)]/20 min-h-[380px] flex flex-col justify-end p-6 md:p-12 cursor-pointer"
            >
                {/* Video Background */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-700 opacity-60 group-hover:opacity-40"
                    >
                        <source src="/videos/punto-de-venta-soacha.mp4" type="video/mp4" />
                        <source src="/videos/punto-de-venta-soacha.mov" type="video/quicktime" />
                    </video>
                </div>

                {/* Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a1324] via-[#0c182e]/80 to-transparent z-[1] transition-opacity duration-500" />
                <div className="absolute inset-0 bg-[var(--brand-blue)]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-[1]" />

                {/* Badges Top Left & Right */}
                <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10 pointer-events-none">
                    <div className="bg-white/90 backdrop-blur-md text-[var(--brand-dark)] font-black text-[10px] uppercase px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                        <Store size={14} className="text-[var(--brand-blue)]" />
                        PUNTO DE VENTA & FÁBRICA DIRECTA
                    </div>
                    <div className="bg-[var(--brand-success)] text-white font-black text-[10px] uppercase px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-white rounded-full animate-ping" />
                        RECOGIDA EN TIENDA DISPONIBLE
                    </div>
                </div>

                {/* Card Content & Hover Reveal */}
                <div className="relative z-10 max-w-3xl space-y-4">
                    
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-3.5 py-1 rounded-full text-xs font-bold text-white">
                        <Sparkles size={14} className="text-yellow-400" />
                        ¡Atención Veci en Soacha y Sur de Bogotá! 👋
                    </div>

                    <h3 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight">
                        ¡Hola Veci! Pasa a nuestra fábrica en Soacha <br />
                        <span className="bg-gradient-to-r from-blue-300 via-white to-pink-300 bg-clip-text text-transparent italic">
                            y ahorra 100% el envío.
                        </span>
                    </h3>

                    <p className="text-white/80 text-sm md:text-base font-medium max-w-2xl leading-relaxed">
                        ¿Estás cerca de Soacha, Bosa o el Sur de Bogotá? Puedes hacer tu pedido por la web, seleccionar <strong className="text-white">Recogida en Tienda</strong> y venir a retirar tus productos directo en nuestra planta o comprar presencialmente.
                    </p>

                    {/* Interactive Hover Address Box */}
                    <div className={`transition-all duration-500 overflow-hidden bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-5 text-white ${isHovered ? 'max-h-96 opacity-100 mt-4' : 'max-h-24 opacity-90'}`}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold">
                            
                            <div className="flex items-start gap-2.5">
                                <div className="p-2 bg-[var(--brand-blue)] text-white rounded-xl shrink-0">
                                    <MapPin size={18} />
                                </div>
                                <div>
                                    <p className="text-white/60 text-[10px] uppercase font-black tracking-widest">Dirección de Fábrica</p>
                                    <p className="text-white font-black text-sm">Cra. 7C #44-17 Sur</p>
                                    <p className="text-white/70 text-[11px] font-normal">Soacha, Cundinamarca (Planta Biocambio360)</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-2.5">
                                <div className="p-2 bg-pink-500 text-white rounded-xl shrink-0">
                                    <Clock size={18} />
                                </div>
                                <div>
                                    <p className="text-white/60 text-[10px] uppercase font-black tracking-widest">Horarios de Atención</p>
                                    <p className="text-white font-black text-sm">Lun - Sáb: 8:00 AM - 5:30 PM</p>
                                    <p className="text-white/70 text-[11px] font-normal">Atención personalizada y despacho</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-2.5">
                                <div className="p-2 bg-emerald-500 text-white rounded-xl shrink-0">
                                    <ShoppingBag size={18} />
                                </div>
                                <div>
                                    <p className="text-white/60 text-[10px] uppercase font-black tracking-widest">Beneficio Veci</p>
                                    <p className="text-white font-black text-sm">Recogida sin Costo de Envío</p>
                                    <p className="text-white/70 text-[11px] font-normal">Elige "Retiro en Fábrica" al pagar</p>
                                </div>
                            </div>

                        </div>

                        {/* Direct Button */}
                        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-3 items-center justify-between">
                            <span className="text-[11px] text-white/80 font-medium italic">
                                📍 ¡Pasa la voz al vecindario y ahorra en grande en productos concentrados!
                            </span>
                            <a
                                href="https://maps.google.com/?q=Soacha+Cundinamarca+Biocambio360"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 bg-white text-[var(--brand-dark)] font-black text-xs px-5 py-2.5 rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
                            >
                                <Navigation size={14} className="text-[var(--brand-blue)]" />
                                CÓMO LLEGAR EN GOOGLE MAPS
                            </a>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}
