'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, Loader2, GraduationCap } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const ALLOWED_EMAILS = new Set(['fernando@biocambio360.com', 'diego@biocambio360.com']);

export default function CapacitacionPage() {
    const router = useRouter();
    const { user, userProfile, role, loading: authLoading } = useAuth();

    const email = (user?.email || userProfile?.email || '').toLowerCase();
    const isAllowed = role === 'superadmin' || ALLOWED_EMAILS.has(email);

    const [html, setHtml] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading || !isAllowed || !user) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const idToken = await user.getIdToken();
                const res = await fetch('/api/admin/capacitacion', {
                    headers: { Authorization: `Bearer ${idToken}` },
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error ?? 'No se pudo cargar el material');
                if (!cancelled) setHtml(data.html);
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar el material');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [authLoading, isAllowed, user]);

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-gray-400" size={28} />
            </div>
        );
    }

    if (!isAllowed) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-md p-8 max-w-sm text-center space-y-3">
                    <AlertCircle className="mx-auto text-amber-500" size={32} />
                    <p className="font-black text-gray-900">Acceso restringido</p>
                    <p className="text-sm text-gray-500">
                        Este material de capacitación es solo para Fernando, Diego y superadministradores.
                    </p>
                    <button onClick={() => router.push('/admin')} className="mt-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold">
                        Volver al panel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            <header className="bg-white border-b border-gray-100 shadow-xs px-4 py-2.5 flex items-center gap-3 shrink-0">
                <button onClick={() => router.push('/admin')} className="text-gray-500 hover:text-gray-800">
                    <ArrowLeft size={18} />
                </button>
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
                    <GraduationCap size={14} className="text-white" />
                </div>
                <div>
                    <h1 className="font-black text-gray-900 text-sm leading-tight">Capacitación: Mapa Mental Operativo</h1>
                    <p className="text-[10px] text-gray-400">Solo Fernando, Diego y superadministradores · No distribuir</p>
                </div>
            </header>

            <div className="flex-1 min-h-0">
                {loading && (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="animate-spin text-gray-400" size={28} />
                    </div>
                )}
                {error && (
                    <div className="h-full flex items-center justify-center p-6">
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
                    </div>
                )}
                {html && !loading && (
                    <iframe
                        srcDoc={html}
                        title="Mapa Mental Operativo — Capacitación Biocambio360"
                        className="w-full h-full border-0"
                        sandbox="allow-scripts allow-same-origin"
                    />
                )}
            </div>
        </div>
    );
}
