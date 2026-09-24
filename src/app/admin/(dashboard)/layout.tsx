'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import AdminTourSystem from '@/components/admin/tour/AdminTourSystem';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, userProfile, role, loading } = useAuth();

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

        // 2. Control de acceso por capacidades asignadas al usuario (si no es superadmin)
        if (!loading && user && role !== 'superadmin' && pathname !== '/admin' && pathname !== '/admin/') {
            const capacidades = userProfile?.capacidades;
            if (capacidades) {
                const routeCapabilityMap: Record<string, keyof typeof capacidades> = {
                    '/admin/pedidos': 'pedidos',
                    '/admin/pos': 'pos',
                    '/admin/asesores': 'asesores',
                    '/admin/produccion': 'produccion',
                    '/admin/finanzas': 'finanzas',
                    '/admin/clientes': 'clientes',
                    '/admin/reabastecimiento': 'reabastecimiento',
                    '/admin/cupones': 'cupones',
                    '/admin/envios': 'envios',
                    '/admin/mensajeros': 'envios',
                    '/admin/auditoria-envios': 'auditoria',
                    '/admin/inbox': 'mensajeria',
                    '/admin/pqrs': 'mensajeria',
                };

                for (const [prefix, capKey] of Object.entries(routeCapabilityMap)) {
                    if (pathname.startsWith(prefix) && capacidades[capKey] === false) {
                        router.replace('/admin');
                        return;
                    }
                }
            }
        }
    }, [user, userProfile, role, loading, router, pathname]);

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

    return <AdminTourSystem>{children}</AdminTourSystem>;
}
