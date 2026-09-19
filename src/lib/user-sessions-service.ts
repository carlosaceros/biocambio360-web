import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    query,
    orderBy,
    limit,
    serverTimestamp,
    onSnapshot,
    where,
    Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { SystemRole } from '@/types/user';

export interface UserSessionRecord {
    id: string;
    email: string;
    nombre: string;
    rol: SystemRole | string;
    loginAt: any;
    lastActiveAt: any;
    logoutAt?: any;
    durationMinutes?: number;
    isOnline: boolean;
    status: 'active' | 'closed' | 'expired';
    device?: string;
    browser?: string;
    userAgent?: string;
    ip?: string;
}

export interface OnlineUserInfo {
    email: string;
    nombre: string;
    rol: SystemRole | string;
    isOnline: boolean;
    lastActiveAt: any;
    lastLoginAt?: any;
    currentSessionId?: string;
    device?: string;
    browser?: string;
}

const SESSIONS_COLLECTION = 'user_sessions';
const ADMIN_USERS_COLLECTION = 'admin_users';

/**
 * Detecta navegador y plataforma de forma segura en el cliente
 */
function getClientBrowserInfo(): { browser: string; device: string } {
    if (typeof window === 'undefined' || !navigator) {
        return { browser: 'Servidor / SSR', device: 'Servidor' };
    }
    const ua = navigator.userAgent;
    let browser = 'Desconocido';
    let device = 'Escritorio';

    if (/Mobi|Android|iPhone/i.test(ua)) {
        device = 'Móvil / Tablet';
    }

    if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) {
        browser = 'Google Chrome';
    } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
        browser = 'Safari';
    } else if (/Firefox/i.test(ua)) {
        browser = 'Firefox';
    } else if (/Edg/i.test(ua)) {
        browser = 'Microsoft Edge';
    }

    return { browser, device };
}

/**
 * Registra un nuevo ingreso al sistema e inicia la sesión
 */
export async function recordUserLogin(
    email: string,
    nombre: string,
    rol: SystemRole | string
): Promise<string> {
    if (!email) return '';
    const cleanEmail = email.toLowerCase().trim();
    const sessionId = `sess_${cleanEmail.replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    const { browser, device } = getClientBrowserInfo();
    const userAgent = typeof window !== 'undefined' ? navigator.userAgent : 'SSR';

    const sessionPayload: UserSessionRecord = {
        id: sessionId,
        email: cleanEmail,
        nombre: nombre || cleanEmail,
        rol: rol || 'gestor',
        loginAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
        isOnline: true,
        status: 'active',
        browser,
        device,
        userAgent,
    };

    try {
        // 1. Guardar log de sesión en user_sessions
        await setDoc(doc(db, SESSIONS_COLLECTION, sessionId), sessionPayload);

        // 2. Actualizar estado en tiempo real en admin_users
        const adminUserRef = doc(db, ADMIN_USERS_COLLECTION, cleanEmail);
        await updateDoc(adminUserRef, {
            isOnline: true,
            lastLoginAt: serverTimestamp(),
            lastActiveAt: serverTimestamp(),
            currentSessionId: sessionId,
            ultimoDispositivo: `${browser} (${device})`,
        }).catch(async () => {
            // Si el doc admin_users no existía para este email, no romper
            await setDoc(adminUserRef, {
                email: cleanEmail,
                nombre,
                rol,
                isOnline: true,
                lastLoginAt: serverTimestamp(),
                lastActiveAt: serverTimestamp(),
                currentSessionId: sessionId,
                ultimoDispositivo: `${browser} (${device})`,
                estado: 'activo',
            }, { merge: true });
        });

        // Guardar ID en sessionStorage para persistencia de la pestaña
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('biocambio_session_id', sessionId);
        }

        return sessionId;
    } catch (err) {
        console.warn('[UserSessions] Error al registrar ingreso:', err);
        return sessionId;
    }
}

/**
 * Registra latido de actividad (Heartbeat) para confirmar que el usuario sigue en línea
 */
export async function recordUserHeartbeat(email: string, sessionId?: string): Promise<void> {
    if (!email) return;
    const cleanEmail = email.toLowerCase().trim();
    const sid = sessionId || (typeof window !== 'undefined' ? sessionStorage.getItem('biocambio_session_id') : null);

    try {
        const adminUserRef = doc(db, ADMIN_USERS_COLLECTION, cleanEmail);
        await updateDoc(adminUserRef, {
            isOnline: true,
            lastActiveAt: serverTimestamp(),
        }).catch(() => {});

        if (sid) {
            const sessionRef = doc(db, SESSIONS_COLLECTION, sid);
            await updateDoc(sessionRef, {
                isOnline: true,
                lastActiveAt: serverTimestamp(),
            }).catch(() => {});
        }
    } catch (err) {
        // Silencioso para no interrumpir la navegación
    }
}

/**
 * Registra la salida voluntaria o cierre de sesión del usuario
 */
export async function recordUserLogout(email: string, sessionId?: string): Promise<void> {
    if (!email) return;
    const cleanEmail = email.toLowerCase().trim();
    const sid = sessionId || (typeof window !== 'undefined' ? sessionStorage.getItem('biocambio_session_id') : null);

    try {
        // 1. Marcar desconectado en admin_users
        const adminUserRef = doc(db, ADMIN_USERS_COLLECTION, cleanEmail);
        await updateDoc(adminUserRef, {
            isOnline: false,
            lastLogoutAt: serverTimestamp(),
        }).catch(() => {});

        // 2. Cerrar la sesión en user_sessions con cálculo de duración
        if (sid) {
            const sessionRef = doc(db, SESSIONS_COLLECTION, sid);
            const sessionSnap = await getDoc(sessionRef);
            let durationMinutes = 0;

            if (sessionSnap.exists()) {
                const data = sessionSnap.data() as UserSessionRecord;
                const loginMs = data.loginAt?.toMillis ? data.loginAt.toMillis() : Date.now();
                durationMinutes = Math.max(1, Math.round((Date.now() - loginMs) / (1000 * 60)));
            }

            await updateDoc(sessionRef, {
                isOnline: false,
                status: 'closed',
                logoutAt: serverTimestamp(),
                durationMinutes,
            }).catch(() => {});
        }

        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('biocambio_session_id');
        }
    } catch (err) {
        console.warn('[UserSessions] Error al registrar salida:', err);
    }
}

/**
 * Suscripción en tiempo real a los logs de sesiones para el Super Admin
 */
export function subscribeToSessionLogs(
    callback: (logs: UserSessionRecord[]) => void,
    limitCount: number = 60
) {
    const colRef = collection(db, SESSIONS_COLLECTION);
    const q = query(colRef, orderBy('loginAt', 'desc'), limit(limitCount));

    return onSnapshot(
        q,
        (snapshot) => {
            const logs: UserSessionRecord[] = [];
            snapshot.forEach((d) => {
                logs.push({ id: d.id, ...d.data() } as UserSessionRecord);
            });
            callback(logs);
        },
        (error) => {
            console.error('[UserSessions] Error subscribing to session logs:', error);
            callback([]);
        }
    );
}

/**
 * Suscripción en tiempo real a los usuarios en línea (activos en los últimos 5 minutos)
 */
export function subscribeToOnlineUsers(
    callback: (onlineUsers: OnlineUserInfo[]) => void
) {
    const colRef = collection(db, ADMIN_USERS_COLLECTION);

    return onSnapshot(
        colRef,
        (snapshot) => {
            const now = Date.now();
            const FIVE_MINUTES_MS = 5 * 60 * 1000;
            const users: OnlineUserInfo[] = [];

            snapshot.forEach((d) => {
                const data = d.data();
                const lastActiveMs = data.lastActiveAt?.toMillis
                    ? data.lastActiveAt.toMillis()
                    : (data.lastActiveAt ? new Date(data.lastActiveAt).getTime() : 0);

                // Se considera en línea si flag isOnline es true y reportó actividad en los últimos 5 minutos
                const isRecentlyActive = (now - lastActiveMs) < FIVE_MINUTES_MS;
                const isOnline = Boolean(data.isOnline && isRecentlyActive);

                users.push({
                    email: data.email || d.id,
                    nombre: data.nombre || data.email || d.id,
                    rol: data.rol || data.role || 'gestor',
                    isOnline,
                    lastActiveAt: data.lastActiveAt,
                    lastLoginAt: data.lastLoginAt,
                    currentSessionId: data.currentSessionId,
                    device: data.ultimoDispositivo,
                });
            });

            // Ordenar: primero los que están en línea, luego por actividad más reciente
            users.sort((a, b) => {
                if (a.isOnline && !b.isOnline) return -1;
                if (!a.isOnline && b.isOnline) return 1;
                const aTime = a.lastActiveAt?.toMillis ? a.lastActiveAt.toMillis() : 0;
                const bTime = b.lastActiveAt?.toMillis ? b.lastActiveAt.toMillis() : 0;
                return bTime - aTime;
            });

            callback(users);
        },
        (error) => {
            console.error('[UserSessions] Error subscribing to online users:', error);
            callback([]);
        }
    );
}
