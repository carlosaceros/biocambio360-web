'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const GESTOR_ALLOWED_PREFIXES = [
    '/admin/pedidos',
    '/admin/auditoria-envios',
    '/admin/inventario',
    '/admin/carritos-abandonados',
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

        if (!loading && user && role === 'gestor_pedidos') {
            // Check if current path is allowed
            const isRootAdmin = pathname === '/admin' || pathname === '/admin/';
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
