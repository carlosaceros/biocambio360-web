'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';

interface UseApiResourceOptions {
    /** Si es false, no se dispara ningún fetch (ej. mientras se resuelve un permiso). Default: true. */
    enabled?: boolean;
    /** Si es true, espera a que `user` exista y adjunta `Authorization: Bearer <idToken>`. Default: true. */
    requireAuth?: boolean;
}

interface UseApiResourceResult<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

/**
 * Reemplaza el triple useState(data/loading/error) + useEffect(fetch con idToken + cleanup de
 * cancelación) que se repetía, casi idéntico, en capacitacion, envios, auditoria-envios, pedidos,
 * inbox, etc. No cubre las pantallas con onSnapshot (reabastecimiento, pqrs, cupones...) — esas
 * necesitan un listener en vivo, no un fetch puntual, y se dejan para un hook aparte si hace falta.
 *
 * Migración progresiva, igual que src/components/ui: se usa en pantallas nuevas y al tocar una
 * existente por otra razón, no en un reemplazo masivo.
 */
export function useApiResource<T = unknown>(
    url: string | null,
    options: UseApiResourceOptions = {}
): UseApiResourceResult<T> {
    const { enabled = true, requireAuth = true } = options;
    const { user, loading: authLoading } = useAuth();

    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadToken, setReloadToken] = useState(0);

    const refetch = useCallback(() => setReloadToken((t) => t + 1), []);

    useEffect(() => {
        if (!enabled || !url) return;
        if (requireAuth && (authLoading || !user)) return;

        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const headers: Record<string, string> = {};
                if (requireAuth && user) {
                    const idToken = await user.getIdToken();
                    headers.Authorization = `Bearer ${idToken}`;
                }
                const res = await fetch(url, { headers });
                const json = await res.json();
                if (!res.ok) throw new Error(json.error ?? 'No se pudo cargar la información');
                if (!cancelled) setData(json);
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudo cargar la información');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [url, enabled, requireAuth, user, authLoading, reloadToken]);

    return { data, loading, error, refetch };
}
