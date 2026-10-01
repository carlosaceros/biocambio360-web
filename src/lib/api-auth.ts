/**
 * Autorización centralizada para rutas de API de /admin/*.
 *
 * Por qué existe: antes de este módulo, cada ruta sensible (capacitacion, kommo-preview,
 * ads-performance, ai-training, ...) reimplementaba a mano el mismo bloque de ~15 líneas —
 * verificar el ID token, resolver el rol desde `admin_users`, y aplicar el caso especial de la
 * cuenta raíz (que es superadmin aunque no tenga documento propio en `admin_users`, ver
 * isRootAccount en auth-context.tsx). Con 80 rutas de API y cada una repitiendo esa lógica, un
 * solo olvido en una ruta nueva es un hueco de seguridad silencioso.
 *
 * Esto NO reemplaza de golpe las ~80 rutas existentes (demasiado riesgo para un solo cambio);
 * es la base para migrarlas progresivamente, y el estándar para toda ruta nueva de aquí en
 * adelante. Rutas ya migradas: /api/admin/capacitacion, /api/admin/kommo-preview,
 * /api/admin/ads-performance. ai-training-auth.ts tiene su propia variante (maker/approver)
 * por ahora, pendiente de unificar aquí también.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDB } from '@/lib/firebase-admin';
import { ROLE_DEFINITIONS, toSystemRole, type UserModuleCapabilities } from '@/types/user';

export const ROOT_ACCOUNT_EMAIL = 'thinktic.thinktic@gmail.com';

export interface ApiUser {
    uid: string;
    email: string;
    role: string;
    capacidades?: Record<string, boolean>;
}

/** Verifica el ID token y resuelve el rol real (admin_users, con el caso especial de la cuenta raíz). */
async function resolveApiUser(req: NextRequest): Promise<ApiUser | NextResponse> {
    const authorization = req.headers.get('Authorization') ?? '';
    const idToken = authorization.replace('Bearer ', '');
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let uid: string;
    let email: string;
    try {
        const decoded = await getAdminAuth().verifyIdToken(idToken);
        uid = decoded.uid;
        email = (decoded.email || '').toLowerCase();
    } catch {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    if (!email) return NextResponse.json({ error: 'Sesión sin correo' }, { status: 401 });

    let role = email === ROOT_ACCOUNT_EMAIL ? 'superadmin' : '';
    let capacidades: Record<string, boolean> | undefined;
    try {
        const snap = await getAdminDB().collection('admin_users').doc(email).get();
        const data = snap.data();
        if (data?.estado === 'inactivo') return NextResponse.json({ error: 'Cuenta inactiva.' }, { status: 403 });
        role = role || String(data?.rol ?? data?.role ?? '');
        capacidades = data?.capacidades;
    } catch {
        // si falla la consulta, se mantiene lo ya resuelto (p. ej. la cuenta raíz igual es superadmin)
    }
    return { uid, email, role, capacidades };
}

/** Cualquier sesión válida de /admin, sin importar el rol. */
export async function requireAuth(req: NextRequest): Promise<ApiUser | NextResponse> {
    return resolveApiUser(req);
}

/** Exige uno de los roles dados (ej. ['superadmin', 'director']). */
export async function requireRole(req: NextRequest, roles: string[]): Promise<ApiUser | NextResponse> {
    const user = await resolveApiUser(req);
    if (user instanceof NextResponse) return user;
    if (!roles.includes(user.role)) {
        return NextResponse.json({ error: 'No tienes permiso para esta acción.' }, { status: 403 });
    }
    return user;
}

/** Solo superadmin (incluye la cuenta raíz). */
export async function requireSuperAdmin(req: NextRequest): Promise<ApiUser | NextResponse> {
    return requireRole(req, ['superadmin']);
}

/**
 * Exige la capacidad de módulo dada (ej. 'mensajeria'), con la misma resolución que canAccess()
 * en auth-context.tsx: superadmin/director tienen acceso total, luego `capacidades` explícitas
 * del usuario, luego el default de ROLE_DEFINITIONS para su rol. Una sola fuente de verdad para
 * cliente y servidor -- evita el desfase que ya pasó una vez entre canAccess() y hasCap().
 */
export function requireCapability(capability: keyof UserModuleCapabilities) {
    return async (req: NextRequest): Promise<ApiUser | NextResponse> => {
        const user = await resolveApiUser(req);
        if (user instanceof NextResponse) return user;

        const deny = () => NextResponse.json({ error: 'No tienes permiso para esta acción.' }, { status: 403 });

        if (user.role === 'superadmin' || user.role === 'director') return user;
        if (user.capacidades && typeof user.capacidades[capability] === 'boolean') {
            return user.capacidades[capability] ? user : deny();
        }
        const systemRole = toSystemRole(user.role);
        const allowed = systemRole ? !!ROLE_DEFINITIONS[systemRole]?.defaultCapabilities[capability] : false;
        return allowed ? user : deny();
    };
}

/**
 * Lista explícita de correos permitidos, con superadmin siempre incluido por defecto
 * (pásale `{ includeSuperAdmin: false }` para una lista cerrada que ni el superadmin salta).
 */
export function requireEmailAllowlist(allowed: Set<string>, opts: { includeSuperAdmin?: boolean } = {}) {
    const includeSuperAdmin = opts.includeSuperAdmin !== false;
    return async (req: NextRequest): Promise<ApiUser | NextResponse> => {
        const user = await resolveApiUser(req);
        if (user instanceof NextResponse) return user;
        if (!allowed.has(user.email) && !(includeSuperAdmin && user.role === 'superadmin')) {
            return NextResponse.json({ error: 'No tienes permiso para esta acción.' }, { status: 403 });
        }
        return user;
    };
}
