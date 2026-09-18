'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const GESTOR_ALLOWED_PREFIXES = [
    '/admin/pedidos',
    '/admin/productos',
    '/admin/cotizaciones-b2b',
    '/admin/auditoria-envios',
    '/admin/inventario',
    '/admin/carritos-abandonados',
    '/admin/finanzas',
    '/admin/referidos',
    '/admin/clientes',
    '/admin/informe-ventas',
    '/admin/pos',
    '/admin/asesores',
    '/admin/produccion',
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, role, loading } = useAuth();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/admin/login');
            return;
        }

        // 1. Proteger /admin/usuarios exclusivamente para superadmin
        if (!loading && user && pathname.startsWith('/admin/usuarios') && role !== 'superadmin') {
            router.replace('/admin');
            return;
        }

        // 2. Redirección automática de roles operativos si caen en la raíz del dashboard
        const isRootAdmin = pathname === '/admin' || pathname === '/admin/';
        if (!loading && user && isRootAdmin) {
            if (role === 'cajero') {
                router.replace('/admin/pos');
                return;
            }
            if (role === 'asesor') {
                router.replace('/admin/asesores');
                return;
            }
            if (role === 'produccion_calidad') {
                router.replace('/admin/produccion');
                return;
            }
        }

        // 3. Validación de permisos para gestores y logísticos
        const isLogisticoOrGestor = role === 'gestor_pedidos' || role === 'gestor' || role === 'logistico' || role === 'logistica';

        if (!loading && user && isLogisticoOrGestor) {
            const isAllowed = isRootAdmin || GESTOR_ALLOWED_PREFIXES.some(prefix => pathname.startsWith(prefix));

            if (!isAllowed) {
                if (pathname.startsWith('/admin/productos')) {
                    router.replace('/admin/inventario');
                } else {
                    router.replace('/admin/pedidos');
                }
            }
        }
    }, [user, role, loading, router, pathname]);

    // Show loading while checking auth
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
            </div>
        );
    }

    // Don't render if not authenticated
    if (!user) {
        return null;
    }

    return <>{children}</>;
}
