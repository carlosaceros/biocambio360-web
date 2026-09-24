/**
 * Access control for the AI training screens: only directors and super admins
 * (e.g. Fernando, Diego and the administrators).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDB } from '@/lib/firebase-admin';

const ALLOWED_ROLES = ['superadmin', 'director'];

export interface Trainer {
    email: string;
    name: string;
    role: string;
}

/** Returns the authenticated trainer or a ready-to-return error response. */
export async function requireTrainer(req: NextRequest): Promise<Trainer | NextResponse> {
    const idToken = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    if (!idToken) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    let email = '';
    try {
        const decoded = await getAdminAuth().verifyIdToken(idToken);
        email = (decoded.email ?? '').toLowerCase().trim();
    } catch {
        return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
    }
    if (!email) return NextResponse.json({ error: 'Sesión sin correo' }, { status: 401 });

    const snap = await getAdminDB().collection('admin_users').doc(email).get();
    const data = snap.data() ?? {};
    const role = String(data.rol ?? data.role ?? (email === 'thinktic.thinktic@gmail.com' ? 'superadmin' : ''));

    if (!ALLOWED_ROLES.includes(role) || data.estado === 'inactivo') {
        return NextResponse.json({ error: 'Solo directores y administradores pueden entrenar al agente.' }, { status: 403 });
    }
    return { email, name: String(data.nombre ?? email), role };
}

const STAFF_ROLES = ['superadmin', 'director', 'gestor', 'gestor_pedidos', 'logistico', 'logistica'];

/** Authenticated operations staff (logistics/orders/management). Returns the user or an error response. */
export async function requireStaff(req: NextRequest): Promise<Trainer | NextResponse> {
    const idToken = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    if (!idToken) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    let email = '';
    try {
        email = ((await getAdminAuth().verifyIdToken(idToken)).email ?? '').toLowerCase().trim();
    } catch {
        return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
    }
    const snap = await getAdminDB().collection('admin_users').doc(email).get();
    const data = snap.data() ?? {};
    const role = String(data.rol ?? data.role ?? (email === 'thinktic.thinktic@gmail.com' ? 'superadmin' : ''));
    if (!STAFF_ROLES.includes(role) || data.estado === 'inactivo') {
        return NextResponse.json({ error: 'Sin permisos para esta acción.' }, { status: 403 });
    }
    return { email, name: String(data.nombre ?? email), role };
}
