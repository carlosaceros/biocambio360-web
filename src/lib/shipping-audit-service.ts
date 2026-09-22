/**
 * shipping-audit-service.ts
 * Servicio centralizado y blindado para logs de auditoría de cotizaciones de envío.
 * 
 * Blindajes:
 * 1. Mantiene un buffer circular en memoria (últimos 200 logs) que NUNCA falla ni depende de cuotas externas.
 * 2. Escribe en Firestore en segundo plano; si la cuota Spark se agota (RESOURCE_EXHAUSTED), no bloquea ni rompe la aplicación.
 * 3. Al consultar logs, si Firestore arroja error de cuota, devuelve transparentemente los logs en memoria con indicador de cuota.
 */

import { getAdminDB } from './firebase-admin';

export interface AuditLog {
    id: string;
    timestamp: string;
    destinoCodigo: string;
    destinoNombre: string;
    subtotal: number;
    totalWeightKg: number;
    bultos: number;
    aplicaContrapago: boolean;
    esLocal: boolean;
    esVecino?: boolean;
    subsidioFabrica?: number;
    subsidio?: number;
    source?: string;
    fleteCliente?: number;
    precioFinal?: number;
    transportadora?: string;
    cotizacionBruta99?: number;
    valorBase99?: number;
    valorContrapago99?: number;
    valorContrapago?: number;
    costoUnBulto?: number;
    costoBrutoBultos?: number;
    costoBrutoTotal?: number;
    subsidioAplicado?: number;
    api99Error?: string;
    api99Cotizaciones?: Record<string, {
        valor: number;
        valor_contrapago: number;
        exito: boolean;
        mensaje: string;
        dias: string | number;
    }>;
    fallbackPrecio?: number;
    fallbackZona?: string;
    errorMessage?: string;
    durationMs?: number;
    subsidioBruto?: number;
    subsidioEfectivo?: number;
    subsidioFabricaBruto?: number;
    subsidioMaxNacional?: number;
    desgloseSubsidio?: Array<{
        nombre: string;
        size: string;
        cantidad: number;
        pesoTotal: number;
        subsidioUnitario: number;
        subsidioTotal: number;
    }>;
}

const LOGS_COLLECTION = 'shipping_audit_logs';
const MAX_MEMORY_LOGS = 200;

// Buffer circular global en memoria (persiste entre peticiones en el mismo proceso)
const globalForAudit = global as unknown as { __shippingAuditBuffer?: AuditLog[] };
if (!globalForAudit.__shippingAuditBuffer) {
    globalForAudit.__shippingAuditBuffer = [];
}
const memoryLogs: AuditLog[] = globalForAudit.__shippingAuditBuffer;

/**
 * Registra un log de cotización de forma instantánea en memoria y en Firestore de forma tolerante a fallos.
 */
export async function recordShippingAuditLog(data: Partial<AuditLog>): Promise<AuditLog> {
    const id = data.id || `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullLog: AuditLog = {
        id,
        timestamp: data.timestamp || new Date().toISOString(),
        destinoCodigo: data.destinoCodigo || '11001000',
        destinoNombre: data.destinoNombre || 'BOGOTA D.C.',
        subtotal: data.subtotal ?? 0,
        totalWeightKg: data.totalWeightKg ?? 5,
        bultos: data.bultos ?? 1,
        aplicaContrapago: data.aplicaContrapago ?? false,
        esLocal: data.esLocal ?? false,
        ...data,
    };

    // 1. Guardado inmediato en memoria
    memoryLogs.unshift(fullLog);
    if (memoryLogs.length > MAX_MEMORY_LOGS) {
        memoryLogs.length = MAX_MEMORY_LOGS;
    }

    // 2. Guardado en Firestore en segundo plano con protección contra cuota
    try {
        const db = getAdminDB();
        await db.collection(LOGS_COLLECTION).doc(id).set(fullLog, { merge: true });
    } catch (e: any) {
        console.warn('[shipping-audit-service] Escritura en Firestore omitida o diferida (cuota Spark o red):', e.message);
    }

    return fullLog;
}

/**
 * Obtiene los últimos logs de cotizaciones.
 * Intenta leer de Firestore; si falla por cuota o red, devuelve los logs en memoria.
 */
export async function getShippingAuditLogs(limitCount = 100): Promise<{
    logs: AuditLog[];
    total: number;
    source: 'firestore' | 'memory_fallback';
    quotaExceeded?: boolean;
    warning?: string;
}> {
    let firestoreLogs: AuditLog[] = [];
    let firestoreFailed = false;
    let quotaExceeded = false;
    let warningMsg = '';

    try {
        const db = getAdminDB();
        const snap = await db
            .collection(LOGS_COLLECTION)
            .orderBy('timestamp', 'desc')
            .limit(Math.min(limitCount, 200))
            .get();

        firestoreLogs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
    } catch (e: any) {
        firestoreFailed = true;
        if (e.message?.includes('RESOURCE_EXHAUSTED') || e.message?.includes('Quota exceeded')) {
            quotaExceeded = true;
            warningMsg = 'La cuota de lectura de Firestore Spark está en su límite diario. Mostrando logs de alta disponibilidad en memoria.';
        } else {
            warningMsg = `Firestore temporalmente inaccesible (${e.message}). Mostrando logs en memoria.`;
        }
        console.warn('[shipping-audit-service] Fallback a memoria activado:', e.message);
    }

    if (!firestoreFailed && firestoreLogs.length > 0) {
        // Sincronizar logs leídos de Firestore hacia la memoria
        const existingIds = new Set(memoryLogs.map(l => l.id));
        for (const log of firestoreLogs) {
            if (!existingIds.has(log.id)) {
                memoryLogs.push(log);
            }
        }
        memoryLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (memoryLogs.length > MAX_MEMORY_LOGS) {
            memoryLogs.length = MAX_MEMORY_LOGS;
        }

        return {
            logs: firestoreLogs.slice(0, limitCount),
            total: firestoreLogs.length,
            source: 'firestore',
        };
    }

    // Fallback: Devolver logs de memoria
    const sortedMemory = [...memoryLogs].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return {
        logs: sortedMemory.slice(0, limitCount),
        total: sortedMemory.length,
        source: 'memory_fallback',
        quotaExceeded,
        warning: warningMsg || (sortedMemory.length === 0 ? 'Sin cotizaciones registradas aún en esta sesión.' : undefined),
    };
}
