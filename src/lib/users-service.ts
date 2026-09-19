import { collection, onSnapshot, query, orderBy, doc, getDoc, setDoc, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { AdminUserRecord, SystemRole, UserModuleCapabilities } from '@/types/user';

const adminUsersCollection = collection(db, 'admin_users');

/**
 * Escuchar usuarios administradores en tiempo real
 */
export function subscribeToAdminUsers(callback: (users: AdminUserRecord[]) => void) {
    const q = query(adminUsersCollection, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const users = snapshot.docs.map(doc => ({
            ...doc.data(),
            email: doc.id
        })) as AdminUserRecord[];
        callback(users);
    }, (error) => {
        console.warn('[UsersService] Error en snapshot de admin_users:', error);
    });
}

/**
 * Obtener un usuario específico por email
 */
export async function getAdminUserByEmail(email: string): Promise<AdminUserRecord | null> {
    try {
        const cleanEmail = email.trim().toLowerCase();
        const docRef = doc(db, 'admin_users', cleanEmail);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            return { ...snap.data(), email: snap.id } as AdminUserRecord;
        }
        return null;
    } catch (e) {
        console.warn('[UsersService] Error obteniendo usuario:', e);
        return null;
    }
}

/**
 * Crear un nuevo usuario en Auth y Firestore vía API
 */
export async function createAdminUser(params: {
    email: string;
    password: string;
    nombre: string;
    rol: SystemRole;
    asesorAsignado?: string;
    capacidades?: UserModuleCapabilities;
    superAdminEmail?: string;
}): Promise<AdminUserRecord> {
    const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error creando usuario');
    }
    return data.user;
}

/**
 * Actualizar datos de usuario directamente en Firestore (0 ms de latencia)
 * y sincronizar en background con la API si está disponible.
 */
export async function updateAdminUser(params: {
    email: string;
    nombre?: string;
    rol?: SystemRole;
    asesorAsignado?: string | null;
    estado?: 'activo' | 'inactivo';
    capacidades?: UserModuleCapabilities;
    superAdminEmail?: string;
}): Promise<void> {
    if (!params.email) throw new Error('Email es requerido');
    const cleanEmail = params.email.trim().toLowerCase();
    const nowIso = new Date().toISOString();

    const updateFields: any = {
        updatedAt: nowIso
    };
    if (params.nombre !== undefined) updateFields.nombre = params.nombre.trim();
    if (params.rol !== undefined) updateFields.rol = params.rol;
    if (params.asesorAsignado !== undefined) {
        updateFields.asesorAsignado = params.asesorAsignado ? params.asesorAsignado.trim() : null;
    }
    if (params.estado !== undefined) updateFields.estado = params.estado;
    if (params.capacidades !== undefined) updateFields.capacidades = params.capacidades;

    // 1. Escritura directa en Firestore: instantánea, infalible y reactiva en la UI
    const userDocRef = doc(db, 'admin_users', cleanEmail);
    await setDoc(userDocRef, updateFields, { merge: true });

    // 2. Registro directo en auditoría ISO 9001
    try {
        await addDoc(collection(db, 'audit_logs'), {
            timestamp: new Date(),
            fechaIso: nowIso,
            userId: params.superAdminEmail || 'superadmin',
            userEmail: params.superAdminEmail || 'superadmin@biocambio360.com',
            userName: 'Super Administrador',
            userRole: 'superadmin',
            modulo: 'usuarios',
            accion: params.estado === 'inactivo' ? 'suspender_usuario' : (params.estado === 'activo' ? 'activar_usuario' : 'editar'),
            entidad: 'usuario',
            entidadId: cleanEmail,
            descripcion: `Actualización de usuario '${cleanEmail}': Rol '${params.rol || 'mantiene'}', Estado '${params.estado || 'mantiene'}'`,
            detalles: {
                rol: params.rol,
                estado: params.estado,
                capacidades: params.capacidades
            }
        });
    } catch (auditErr) {
        console.warn('[UsersService] Error registrando auditoría en cliente:', auditErr);
    }

    // 3. Notificar a la API en background (con timeout corto para no bloquear la UI)
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        fetch('/api/admin/users', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
            signal: controller.signal
        }).then(() => clearTimeout(timeoutId)).catch((err) => {
            clearTimeout(timeoutId);
            console.warn('[UsersService] Sincronización secundaria API en background:', err.message);
        });
    } catch (e) {
        // No bloquear la UI
    }
}

/**
 * Activar o suspender usuario con 1 clic
 */
export async function toggleUserStatus(
    email: string,
    currentStatus: 'activo' | 'inactivo',
    superAdminEmail?: string
): Promise<void> {
    const newStatus = currentStatus === 'activo' ? 'inactivo' : 'activo';
    await updateAdminUser({
        email,
        estado: newStatus,
        superAdminEmail
    });
}

/**
 * Restablecer contraseña de usuario
 */
export async function resetUserPassword(
    email: string,
    newPassword: string,
    superAdminEmail?: string
): Promise<void> {
    const res = await fetch('/api/admin/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword, superAdminEmail })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al restablecer la contraseña');
    }
}
