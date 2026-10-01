/**
 * Access control for the AI training screens: only directors and super admins
 * (e.g. Fernando, Diego and the administrators).
 *
 * Maker-checker: only MAKER_EMAILS can propose rule/example changes, and a proposal never takes
 * effect (never flips `active: true` on the signed item the agent reads) until one of
 * APPROVER_EMAILS (or the superadmin role) approves it. See ai-agent-training.ts for the signing
 * mechanism this relies on.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDB } from '@/lib/firebase-admin';

const ALLOWED_ROLES = ['superadmin', 'director'];
const ROOT_ACCOUNT_EMAIL = 'thinktic.thinktic@gmail.com';

export const MAKER_EMAILS = new Set(['fernando@biocambio360.com', 'diego@biocambio360.com']);
export const APPROVER_EMAILS = new Set(['julian@biocambio360.com', 'danilo@biocambio360.com']);

export interface Trainer {
    email: string;
    name: string;
    role: string;
}

async function resolveTrainer(req: NextRequest): Promise<Trainer | NextResponse> {
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
    const role = String(data.rol ?? data.role ?? (email === ROOT_ACCOUNT_EMAIL ? 'superadmin' : ''));
    if (data.estado === 'inactivo') return NextResponse.json({ error: 'Cuenta inactiva.' }, { status: 403 });
    return { email, name: String(data.nombre ?? email), role };
}

/** Returns the authenticated trainer or a ready-to-return error response. Read access: any director/superadmin. */
export async function requireTrainer(req: NextRequest): Promise<Trainer | NextResponse> {
    const trainer = await resolveTrainer(req);
    if (trainer instanceof NextResponse) return trainer;
    if (!ALLOWED_ROLES.includes(trainer.role)) {
        return NextResponse.json({ error: 'Solo directores y administradores pueden entrenar al agente.' }, { status: 403 });
    }
    return trainer;
}

/** Only Fernando/Diego may propose rule/example changes (create or edit content). */
export async function requireTrainingMaker(req: NextRequest): Promise<Trainer | NextResponse> {
    const trainer = await resolveTrainer(req);
    if (trainer instanceof NextResponse) return trainer;
    if (!MAKER_EMAILS.has(trainer.email)) {
        return NextResponse.json({ error: 'Solo Fernando o Diego pueden proponer cambios de entrenamiento.' }, { status: 403 });
    }
    return trainer;
}

/** Only Julian, Danilo, or the superadmin role may approve/reject a proposed change, or delete an item. */
export async function requireTrainingApprover(req: NextRequest): Promise<Trainer | NextResponse> {
    const trainer = await resolveTrainer(req);
    if (trainer instanceof NextResponse) return trainer;
    if (!APPROVER_EMAILS.has(trainer.email) && trainer.role !== 'superadmin') {
        return NextResponse.json({ error: 'Solo Julian, Danilo o un superadmin pueden aprobar/eliminar entrenamientos.' }, { status: 403 });
    }
    return trainer;
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
