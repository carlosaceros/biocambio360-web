/**
 * POST /api/admin/messengers/create-login
 * Crea (o resetea la contraseña de) el login individual de un mensajero -- prerequisito para el
 * GPS en tiempo real: hoy /mensajero usa una sesión compartida con un selector, y no hay forma de
 * restringir en Firestore "cada mensajero solo puede escribir SU propia ubicación" sin que cada
 * uno tenga su propia cuenta. El custom claim `messengerId` es lo que la regla de
 * `messenger_locations`/`messenger_location_history` usa para esa restricción (ver firestore.rules).
 *
 * Solo superadmin/director -- esto genera credenciales de acceso, no es una acción operativa.
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { getAdminAuth, getAdminDB } from '@/lib/firebase-admin';
import { ROLE_DEFINITIONS } from '@/types/user';

export async function POST(req: NextRequest) {
    const auth = await requireRole(req, ['superadmin', 'director']);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json().catch(() => null);
    const { messengerId, email, password, nombre } = body || {};

    if (!messengerId || !email || !password || !nombre) {
        return NextResponse.json({ error: 'Faltan messengerId, email, password o nombre.' }, { status: 400 });
    }
    if (String(password).length < 6) {
        return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const adminAuth = getAdminAuth();
    const db = getAdminDB();

    try {
        const messengerSnap = await db.collection('mensajeros').doc(messengerId).get();
        if (!messengerSnap.exists) {
            return NextResponse.json({ error: `No existe el mensajero ${messengerId}.` }, { status: 404 });
        }

        let userRecord;
        try {
            userRecord = await adminAuth.getUserByEmail(cleanEmail);
            await adminAuth.updateUser(userRecord.uid, { password, displayName: nombre, disabled: false });
        } catch (e: unknown) {
            if (e instanceof Error && 'code' in e && (e as { code?: string }).code === 'auth/user-not-found') {
                userRecord = await adminAuth.createUser({ email: cleanEmail, password, displayName: nombre, emailVerified: true });
            } else {
                throw e;
            }
        }

        // El claim queda embebido en el ID token -- las reglas de Firestore lo leen sin hacer un
        // get() extra (importante para GPS: se escribe cada pocos segundos durante el turno).
        // Ojo: si esta ruta alguna vez se usa para REASIGNAR el messengerId de un email que ya
        // tenía login (hoy nunca pasa -- solo crea o resetea contraseña, siempre con el mismo
        // messengerId), una sesión ya abierta de ese mensajero no vería el claim nuevo hasta su
        // próximo refresh de token (hasta 1h) o un nuevo login -- avisarle que cierre sesión.
        await adminAuth.setCustomUserClaims(userRecord.uid, { messengerId });

        const nowIso = new Date().toISOString();
        await db.collection('admin_users').doc(cleanEmail).set({
            uid: userRecord.uid,
            email: cleanEmail,
            nombre: nombre.trim(),
            rol: 'mensajero',
            estado: 'activo',
            capacidades: ROLE_DEFINITIONS.mensajero.defaultCapabilities,
            messengerId,
            createdAt: nowIso,
            updatedAt: nowIso,
        }, { merge: true });

        // Vincula también desde el lado del mensajero, útil para mostrarlo en el directorio
        await db.collection('mensajeros').doc(messengerId).set({ email: cleanEmail }, { merge: true });

        await db.collection('audit_logs').add({
            timestamp: new Date(),
            fechaIso: nowIso,
            userId: auth.uid,
            userEmail: auth.email,
            userRole: auth.role,
            modulo: 'mensajeros',
            accion: userRecord ? 'crear_o_resetear_login' : 'crear_login',
            entidad: 'mensajero',
            entidadId: messengerId,
            descripcion: `Login creado/actualizado para el mensajero ${nombre} (${cleanEmail})`,
        });

        return NextResponse.json({ success: true, email: cleanEmail, uid: userRecord.uid });
    } catch (error) {
        console.error('[API/admin/messengers/create-login] Error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al crear el login' }, { status: 500 });
    }
}
