'use client';

import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-slate-900 text-white pt-12 pb-8 border-t border-slate-800 font-sans">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="space-y-3">
                        <div className="font-black text-xl tracking-tight">
                            <span className="text-red-500">BIOCAMBIO</span>
                            <span className="text-blue-500">360</span>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            Fábrica directa de productos de aseo e insumos de limpieza concentrados para hogares, comercios e industrias en Colombia.
                        </p>
                    </div>

                    <div>
                        <h4 className="font-extrabold text-xs uppercase tracking-wider text-teal-400 mb-3">Navegación</h4>
                        <ul className="space-y-2 text-xs text-gray-300">
                            <li><Link href="/" className="hover:text-white transition-colors">Catálogo de Productos</Link></li>
                            <li><Link href="/cotizador-b2b" className="hover:text-white transition-colors">Cotizador B2B / Empresas</Link></li>
                            <li><Link href="/como-comprar" className="hover:text-white transition-colors">Cómo Comprar Paso a Paso</Link></li>
                            <li><Link href="/comunidad" className="hover:text-amber-400 font-bold transition-colors">🎁 Comunidad & Gana $10.000</Link></li>
                            <li><Link href="/guia-uso-y-mezclas" className="hover:text-white transition-colors">Guía de Uso & Mezclas</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-extrabold text-xs uppercase tracking-wider text-teal-400 mb-3">Legales & Soporte</h4>
                        <ul className="space-y-2 text-xs text-gray-300">
                            <li><Link href="/politica-envios" className="hover:text-white transition-colors">Política de Envíos</Link></li>
                            <li><Link href="/politica-devolucion" className="hover:text-white transition-colors">Política de Devolución</Link></li>
                            <li><Link href="/garantias" className="hover:text-white transition-colors">Garantías de Calidad</Link></li>
                            <li><Link href="/privacidad" className="hover:text-white transition-colors">Tratamiento de Datos & Privacidad</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-extrabold text-xs uppercase tracking-wider text-teal-400 mb-3">Contacto de Fábrica</h4>
                        <ul className="space-y-2 text-xs text-gray-300">
                            <li>📍 Planta: Soacha / Cundinamarca</li>
                            <li>
                                📱 WhatsApp: <a href="https://wa.me/573241005353" target="_blank" rel="noopener noreferrer" className="hover:text-teal-400 font-bold transition-colors">+57 324 100 5353</a>
                            </li>
                            <li>✉️ Email: ventas@biocambio360.com</li>
                            <li>🏢 NIT: 901.798.484-4</li>
                        </ul>
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-gray-500">
                    <p>© 2026 BIOCAMBIO360 S.A.S. — Todos los derechos reservados.</p>
                    <p className="flex items-center gap-1.5 flex-wrap justify-center text-gray-400">
                        <span>Diseñado y desarrollado con amor por</span>
                        <a 
                            href="https://thinktic.co" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="font-bold text-white hover:text-orange-400 underline decoration-orange-500/60 hover:decoration-orange-500 transition-colors"
                        >
                            THINK TIC
                        </a>
                        <span className="text-orange-500">🧡</span>
                        <span>🇨🇴</span>
                    </p>
                </div>
            </div>
        </footer>
    );
}
