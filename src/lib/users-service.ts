import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore';
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
 * Actualizar datos de usuario vía API
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
    const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error actualizando usuario');
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
