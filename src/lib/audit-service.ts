import { collection, addDoc, query, orderBy, limit, onSnapshot, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export type AuditModule = 
    | 'pedidos' 
    | 'pos' 
    | 'produccion' 
    | 'usuarios' 
    | 'clientes' 
    | 'finanzas' 
    | 'reabastecimiento' 
    | 'cupones' 
    | 'inventario';

export type AuditAction = 
    | 'crear' 
    | 'editar' 
    | 'eliminar' 
    | 'cambio_estado' 
    | 'arqueo_caja' 
    | 'liberar_lote' 
    | 'rechazar_lote'
    | 'suspender_usuario' 
    | 'activar_usuario' 
    | 'reset_password'
    | 'cambio_rol';

export interface AuditLogEntry {
    id?: string;
    timestamp?: any;
    fechaIso: string;
    userId: string;
    userEmail: string;
    userName: string;
    userRole: string;
    modulo: AuditModule;
    accion: AuditAction;
    entidad: string;
    entidadId: string;
    descripcion: string;
    detalles?: Record<string, any>;
}

const auditLogsCollection = collection(db, 'audit_logs');

/**
 * Registra una acción en la bitácora inmutable de auditoría ISO 9001
 */
export async function recordAuditLog(
    entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'fechaIso'>
): Promise<string> {
    try {
        const now = Timestamp.now();
        const nowIso = new Date().toISOString();

        const payload: AuditLogEntry = {
            ...entry,
            timestamp: now,
            fechaIso: nowIso,
            detalles: entry.detalles || {}
        };

        const docRef = await addDoc(auditLogsCollection, payload);
        return docRef.id;
    } catch (err: any) {
        console.warn('[AuditService] No se pudo guardar log de auditoría:', err?.message || err);
        return '';
    }
}

/**
 * Escucha en tiempo real los registros de auditoría más recientes
 */
export function subscribeToAuditLogs(
    callback: (logs: AuditLogEntry[]) => void,
    limitCount: number = 100
) {
    const q = query(auditLogsCollection, orderBy('timestamp', 'desc'), limit(limitCount));
    return onSnapshot(q, (snapshot) => {
        const logs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as AuditLogEntry[];
        callback(logs);
    }, (error) => {
        console.warn('[AuditService] Error en snapshot de auditoría:', error);
    });
}

/**
 * Obtiene los registros de auditoría más recientes
 */
export async function getRecentAuditLogs(limitCount: number = 100): Promise<AuditLogEntry[]> {
    try {
        const q = query(auditLogsCollection, orderBy('timestamp', 'desc'), limit(limitCount));
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as AuditLogEntry[];
    } catch (err) {
        console.warn('[AuditService] Error obteniendo logs:', err);
        return [];
    }
}
