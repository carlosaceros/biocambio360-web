'use client';

import { useEffect } from 'react';
import { RefreshCw, Home, ShieldAlert } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Unhandled client exception caught by Error Boundary:', error);
    }, [error]);

    const handleClearAndReload = () => {
        try {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('biocambio360_cart');
                localStorage.removeItem('biocambio360_coupon');
                localStorage.removeItem('biocambio360_wheel_won');
                sessionStorage.clear();
            }
        } catch (_) {}
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mb-6 border border-red-500/30">
                <ShieldAlert size={36} />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black mb-3">
                Algo no cargó como se esperaba
            </h1>
            <p className="text-gray-400 max-w-md text-sm sm:text-base mb-8">
                Hemos actualizado la plataforma con nuevas funciones. Por favor recarga o restablece los datos temporales de navegación.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs sm:max-w-md">
                <button
                    onClick={() => reset()}
                    className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 hover:opacity-95 transition-all"
                >
                    <RefreshCw size={18} />
                    Reintentar
                </button>

                <button
                    onClick={handleClearAndReload}
                    className="w-full py-3.5 px-6 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm border border-white/20 flex items-center justify-center gap-2 transition-all"
                >
                    Limpiar caché y recargar
                </button>
            </div>

            <a
                href="/"
                className="mt-8 text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1.5"
            >
                <Home size={14} /> Volver a la página principal
            </a>
        </div>
    );
}
