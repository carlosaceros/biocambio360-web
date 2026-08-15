'use client';

import Link from 'next/link';
import { ShoppingCart, Menu, Building2, Sparkles, PhoneCall } from 'lucide-react';
import { useCart } from '@/lib/cart-context';

export default function Header() {
    const { getTotalItems, setIsCartOpen } = useCart();

    return (
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <img
                        src="/images/logo-biocambio360.png"
                        alt="Biocambio360"
                        className="h-9 sm:h-11 object-contain"
                    />
                </Link>

                {/* Navigation Links */}
                <nav className="hidden md:flex items-center gap-6 font-bold text-xs sm:text-sm text-gray-700">
                    <Link href="/" className="hover:text-red-600 transition-colors">
                        Catálogo Fábrica
                    </Link>
                    <Link
                        href="/cotizador-b2b"
                        className="bg-teal-50 text-teal-700 hover:bg-teal-100 px-3.5 py-1.5 rounded-full border border-teal-200 transition-all flex items-center gap-1.5 text-xs font-black shadow-2xs"
                    >
                        <Building2 size={15} />
                        Cotizador B2B / Empresas
                    </Link>
                    <Link href="/como-comprar" className="hover:text-red-600 transition-colors">
                        Cómo Comprar
                    </Link>
                    <Link href="/guia-uso-y-mezclas" className="hover:text-red-600 transition-colors">
                        Guía de Uso & Mezclas
                    </Link>
                </nav>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/cotizador-b2b"
                        className="md:hidden bg-teal-50 text-teal-700 px-3 py-1.5 rounded-full text-xs font-black border border-teal-200 flex items-center gap-1"
                    >
                        <Building2 size={14} /> B2B
                    </Link>

                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="relative p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-2xl transition-all shadow-xs cursor-pointer flex items-center gap-2"
                        aria-label="Ver Carrito"
                    >
                        <ShoppingCart size={20} />
                        <span className="hidden sm:inline text-xs font-black">Carrito</span>
                        {getTotalItems() > 0 && (
                            <span className="bg-red-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                                {getTotalItems()}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </header>
    );
}
