/**
 * Biocambio360 CRM Service
 * Gestión de pipeline, actividades, segmentación y asignación de clientes.
 * 
 * Colecciones Firestore:
 * - customers (existente) — se extiende con campos CRM
 * - crm_activities (nueva) — timeline de actividades por cliente
 */

import {
    collection,
    doc,
    addDoc,
    setDoc,
    getDoc,
    updateDoc,
    writeBatch,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Customer } from '@/types/customer';
import { recordAuditLog } from './audit-service';
import { generateReferralCode } from './referrals-service';
import {
    CRMStage,
    CRMActivity,
    CRMActivityType,
    CustomerCRM,
    CustomerTag,
    CRMDashboardStats,
    CRM_STAGE_CONFIG,
} from '@/types/crm';

const crmActivitiesRef = collection(db, 'crm_activities');
const customersRef = collection(db, 'customers');

// ─────────────────────────────────────────────────────────────
// Stage Calculation
// ─────────────────────────────────────────────────────────────

/**
 * Calcula la etapa CRM de un cliente basándose en sus métricas.
 * La lógica de riesgo (at_risk / lost) tiene prioridad sobre las demás
 * para asegurar que clientes inactivos siempre se clasifiquen correctamente.
 */
export function calculateCRMStage(customer: Customer): CRMStage {
    const now = Date.now();

    // Calcular días desde última compra
    let daysSinceLastOrder = Infinity;
    if (customer.lastOrderDate) {
        let lastOrderMs = 0;
        if (typeof (customer.lastOrderDate as any).toMillis === 'function') {
            lastOrderMs = (customer.lastOrderDate as any).toMillis();
        } else if ((customer.lastOrderDate as any).seconds) {
            lastOrderMs = (customer.lastOrderDate as any).seconds * 1000;
        } else if (typeof customer.lastOrderDate === 'string' || typeof customer.lastOrderDate === 'number') {
            lastOrderMs = new Date(customer.lastOrderDate as any).getTime();
        }
        if (lastOrderMs > 0) {
            daysSinceLastOrder = Math.floor((now - lastOrderMs) / (1000 * 60 * 60 * 24));
        }
    }

    const ordersCount = customer.ordersCount || 0;
    const totalSpent = customer.totalSpent || 0;

    // Sin compras → Lead
    if (ordersCount === 0) {
        return 'lead';
    }

    // Inactividad tiene prioridad
    if (daysSinceLastOrder > 120) {
        return 'lost';
    }
    if (daysSinceLastOrder > 60) {
        return 'at_risk';
    }

    // VIP por valor
    if (totalSpent >= 500000) {
        return 'vip';
    }

    // Por cantidad de compras
    if (ordersCount >= 4) {
        return 'loyal';
    }
    if (ordersCount >= 2) {
        return 'returning';
    }

    return 'first_purchase';
}

// ─────────────────────────────────────────────────────────────
// Customer Enrichment
// ─────────────────────────────────────────────────────────────

/**
 * Enriquece un Customer con datos CRM calculados dinámicamente.
 * Los campos persistidos (tags, assignedTo, sarlaftStatus) se preservan
 * si ya existen en el documento de Firestore.
 */
export function enrichCustomerWithCRM(
    customer: Customer,
    firestoreExtras?: Partial<CustomerCRM>,
    replenishmentData?: {
        nextRecompraDate?: string;
        recompraStatus?: string;
        estimatedCycleDays?: number;
    }
): CustomerCRM {
    const stage = calculateCRMStage(customer);

    return {
        ...customer,
        stage,
        tags: firestoreExtras?.tags || [],
        assignedTo: firestoreExtras?.assignedTo || undefined,
        assignedToName: firestoreExtras?.assignedToName || firestoreExtras?.assignedTo || undefined,
        assignedAt: firestoreExtras?.assignedAt || undefined,
        assignedBy: firestoreExtras?.assignedBy || undefined,
        isReferrer: Boolean(firestoreExtras?.isReferrer),
        referralCode: firestoreExtras?.referralCode || undefined,
        referralActivatedManually: Boolean(firestoreExtras?.referralActivatedManually),
        referralActivatedBy: firestoreExtras?.referralActivatedBy || undefined,
        referralActivatedAt: firestoreExtras?.referralActivatedAt || undefined,
        sarlaftStatus: firestoreExtras?.sarlaftStatus || 'pendiente',
        sarlaftCheckedAt: firestoreExtras?.sarlaftCheckedAt || undefined,
        lastActivityAt: firestoreExtras?.lastActivityAt || undefined,
        nextRecompraDate: replenishmentData?.nextRecompraDate || undefined,
        recompraStatus: replenishmentData?.recompraStatus as any || undefined,
        estimatedCycleDays: replenishmentData?.estimatedCycleDays || undefined,
    };
}

// ─────────────────────────────────────────────────────────────
// CRM Activities
// ─────────────────────────────────────────────────────────────

/**
 * Registra una actividad en el timeline CRM de un cliente.
 */
export async function addCRMActivity(activity: {
    customerId: string;
    type: CRMActivityType;
    description: string;
    authorEmail?: string;
    authorName?: string;
    metadata?: Record<string, any>;
}): Promise<string> {
    try {
        const docRef = await addDoc(crmActivitiesRef, {
            ...activity,
            createdAt: serverTimestamp(),
        });

        // Actualizar lastActivityAt en el documento del cliente
        try {
            const customerDocRef = doc(customersRef, activity.customerId);
            await updateDoc(customerDocRef, {
                lastActivityAt: serverTimestamp(),
            });
        } catch (e) {
            // No bloquear si el update falla (el cliente puede no existir aún)
            console.warn('[CRM] Could not update lastActivityAt:', e);
        }

        return docRef.id;
    } catch (error) {
        console.error('[CRM] Error adding activity:', error);
        throw error;
    }
}

/**
 * Obtiene las actividades recientes de un cliente.
 */
export async function getCustomerActivities(
    customerId: string,
    maxResults: number = 50
): Promise<CRMActivity[]> {
    try {
        const q = query(
            crmActivitiesRef,
            where('customerId', '==', customerId),
            orderBy('createdAt', 'desc'),
            limit(maxResults)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({
            id: d.id,
            ...d.data(),
        } as CRMActivity));
    } catch (error) {
        console.error('[CRM] Error getting activities:', error);
        // Fallback sin orderBy si el índice no existe
        try {
            const q = query(
                crmActivitiesRef,
                where('customerId', '==', customerId),
                limit(maxResults)
            );
            const snap = await getDocs(q);
            const activities = snap.docs.map(d => ({
                id: d.id,
                ...d.data(),
            } as CRMActivity));
            // Ordenar en memoria
            return activities.sort((a, b) => {
                const tA = a.createdAt?.seconds || 0;
                const tB = b.createdAt?.seconds || 0;
                return tB - tA;
            });
        } catch (fallbackError) {
            console.error('[CRM] Fallback query also failed:', fallbackError);
            return [];
        }
    }
}

/**
 * Obtiene las actividades más recientes de todos los clientes (para dashboard).
 */
export async function getRecentActivities(maxResults: number = 20): Promise<CRMActivity[]> {
    try {
        const q = query(
            crmActivitiesRef,
            orderBy('createdAt', 'desc'),
            limit(maxResults)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({
            id: d.id,
            ...d.data(),
        } as CRMActivity));
    } catch (error) {
        console.error('[CRM] Error getting recent activities:', error);
        return [];
    }
}

// ─────────────────────────────────────────────────────────────
// Tags & Assignment
// ─────────────────────────────────────────────────────────────

/**
 * Actualiza los tags de segmentación de un cliente.
 */
export async function updateCustomerTags(
    customerId: string,
    tags: CustomerTag[],
    authorEmail?: string,
    authorName?: string
): Promise<void> {
    try {
        const customerDocRef = doc(customersRef, customerId);
        await updateDoc(customerDocRef, { tags, updatedAt: serverTimestamp() });

        // Registrar actividad
        await addCRMActivity({
            customerId,
            type: 'tag_change',
            description: `Tags actualizados: ${tags.join(', ') || 'ninguno'}`,
            authorEmail,
            authorName,
        });
    } catch (error) {
        console.error('[CRM] Error updating tags:', error);
        throw error;
    }
}

// ─────────────────────────────────────────────────────────────
// Calificación manual del asesor
// ─────────────────────────────────────────────────────────────

/**
 * Guarda la calificación manual (1-5) que un asesor le da a un cliente -- percepción de
 * calidad/potencial comercial del asesor, no un NPS respondido por el cliente.
 */
export async function setCustomerRating(
    customerId: string,
    rating: number,
    note: string | undefined,
    authorEmail?: string,
    authorName?: string
): Promise<void> {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new Error('La calificación debe ser un entero entre 1 y 5.');
    }
    try {
        const customerDocRef = doc(customersRef, customerId);
        const nowIso = new Date().toISOString();
        await updateDoc(customerDocRef, {
            advisorRating: rating,
            advisorRatingNote: note || '',
            advisorRatingAt: nowIso,
            advisorRatingBy: authorEmail || '',
            updatedAt: serverTimestamp(),
        });
        await addCRMActivity({
            customerId,
            type: 'calificacion',
            description: `Calificación del asesor: ${rating}/5${note ? ` -- ${note}` : ''}`,
            authorEmail,
            authorName,
            metadata: { rating, note: note || '' },
        });
    } catch (error) {
        console.error('[CRM] Error setting customer rating:', error);
        throw error;
    }
}

// ─────────────────────────────────────────────────────────────
// Checklist de seguimiento de recompra (15/30/45/60/90/120 días)
// ─────────────────────────────────────────────────────────────

type FlexibleTimestamp = Timestamp | { toMillis?: () => number; seconds?: number } | string | number | null | undefined;

function toMillisSafe(value: FlexibleTimestamp): number {
    if (!value) return 0;
    if (typeof value === 'object') {
        if (typeof value.toMillis === 'function') return value.toMillis();
        if (value.seconds) return value.seconds * 1000;
        return 0;
    }
    if (typeof value === 'string' || typeof value === 'number') {
        const ms = new Date(value).getTime();
        return Number.isNaN(ms) ? 0 : ms;
    }
    return 0;
}

export interface RecompraMilestoneView {
    day: 15 | 30 | 45 | 60 | 90 | 120;
    dueDate: Date;
    isDue: boolean;       // ya llegó o pasó la fecha del hito
    isOverdue: boolean;   // pasó la fecha Y no está marcado como hecho
    done: boolean;
    doneAt?: string;
    doneBy?: string;
}

/**
 * Deriva el estado del checklist de recompra (hitos fijos en días desde la última compra)
 * cruzando la fecha real del último pedido con lo que el asesor ya marcó como hecho.
 * Función pura -- no toca Firestore, se puede recalcular en el cliente sin esperar red.
 */
export function computeRecompraChecklist(
    lastOrderDate: FlexibleTimestamp,
    checklist?: import('@/types/crm').RecompraChecklist
): RecompraMilestoneView[] {
    const lastOrderMs = toMillisSafe(lastOrderDate);
    const now = Date.now();
    const milestones: Array<15 | 30 | 45 | 60 | 90 | 120> = [15, 30, 45, 60, 90, 120];
    return milestones.map((day) => {
        const dueDate = new Date(lastOrderMs + day * 24 * 60 * 60 * 1000);
        const state = checklist?.[`d${day}`];
        const isDue = lastOrderMs > 0 && now >= dueDate.getTime();
        return {
            day,
            dueDate,
            isDue,
            isOverdue: isDue && !state?.done,
            done: !!state?.done,
            doneAt: state?.doneAt,
            doneBy: state?.doneBy,
        };
    });
}

/**
 * Marca (o desmarca) un hito del checklist de recompra como completado por el asesor.
 */
export async function toggleRecompraMilestone(
    customerId: string,
    day: 15 | 30 | 45 | 60 | 90 | 120,
    done: boolean,
    authorEmail?: string,
    authorName?: string
): Promise<void> {
    try {
        const customerDocRef = doc(customersRef, customerId);
        const nowIso = new Date().toISOString();
        const fieldPath = `recompraChecklist.d${day}`;
        await updateDoc(customerDocRef, {
            [fieldPath]: done
                ? { done: true, doneAt: nowIso, doneBy: authorEmail || '' }
                : { done: false },
            updatedAt: serverTimestamp(),
        });
        if (done) {
            await addCRMActivity({
                customerId,
                type: 'checklist_milestone',
                description: `Seguimiento de recompra completado: hito de ${day} días`,
                authorEmail,
                authorName,
                metadata: { day },
            });
        }
    } catch (error) {
        console.error('[CRM] Error toggling recompra milestone:', error);
        throw error;
    }
}

// ─────────────────────────────────────────────────────────────
// Promedio de recompra real y detección de negocio (heurística, solo sugerencia)
// ─────────────────────────────────────────────────────────────

/**
 * Promedio de días entre compras consecutivas, calculado del historial REAL de pedidos del
 * cliente (a diferencia de estimatedCycleDays, que es una estimación por volumen del último
 * pedido). Requiere al menos 2 pedidos; si no, no hay ciclo que promediar.
 */
export function computeAverageRepurchaseCycleDays(orderDates: FlexibleTimestamp[]): number | null {
    const sortedMs = orderDates
        .map(toMillisSafe)
        .filter((ms) => ms > 0)
        .sort((a, b) => a - b);
    if (sortedMs.length < 2) return null;
    const gaps: number[] = [];
    for (let i = 1; i < sortedMs.length; i++) {
        gaps.push((sortedMs[i] - sortedMs[i - 1]) / (1000 * 60 * 60 * 24));
    }
    const avg = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
    return Math.round(avg);
}

export interface BusinessDetectionResult {
    isLikely: boolean;
    reason: string;
}

/**
 * Heurística de sugerencia (NUNCA aplica el tag automáticamente) para detectar si un cliente
 * "hogar" en realidad podría ser un negocio/revendedor: compra con frecuencia alta y sostenida.
 * El asesor decide si aplicar el tag -- evita falsos positivos silenciosos en la segmentación.
 */
export function detectPossibleBusiness(
    tags: CustomerTag[] | undefined,
    ordersCount: number,
    avgCycleDays: number | null
): BusinessDetectionResult | null {
    const alreadyTagged = (tags || []).some((t) => ['b2b', 'empresa', 'revendedor', 'suministradora', 'institucional'].includes(t));
    if (alreadyTagged) return null;
    if (ordersCount < 4 || avgCycleDays === null) return null;
    if (avgCycleDays <= 20) {
        return { isLikely: true, reason: `${ordersCount} pedidos con un ciclo de recompra de ~${avgCycleDays} días -- un ritmo típico de reventa, no de consumo en hogar.` };
    }
    return null;
}

/**
 * Asigna un asesor a un cliente.
 */
export async function assignCustomerToAdvisor(
    customerId: string,
    advisorEmail: string,
    authorEmail?: string,
    authorName?: string
): Promise<void> {
    return reassignCustomerAdvisor({
        customerId,
        newAdvisor: advisorEmail,
        performedByEmail: authorEmail || 'admin@biocambio360.com',
        performedByName: authorName || 'Administrador',
    });
}

/**
 * Reasigna formalmente la cartera de un cliente a un nuevo asesor
 * con trazabilidad completa en CRM Timeline y en bitácora de auditoría ISO 9001.
 * Justificación opcional según requerimiento operativo.
 */
export async function reassignCustomerAdvisor(params: {
    customerId: string;
    newAdvisor: string; // Ej: "Karen", "Diego", "Katherine", etc.
    previousAdvisor?: string;
    performedByEmail: string;
    performedByName: string;
    reason?: string;
}): Promise<void> {
    try {
        const customerDocRef = doc(customersRef, params.customerId);
        const nowIso = new Date().toISOString();

        await updateDoc(customerDocRef, {
            assignedTo: params.newAdvisor,
            assignedToName: params.newAdvisor,
            assignedAt: nowIso,
            assignedBy: params.performedByEmail,
            updatedAt: serverTimestamp(),
        });

        const prev = params.previousAdvisor || 'Sin Asignar';
        const reasonText = params.reason?.trim() ? ` Motivo: ${params.reason.trim()}` : '';
        const desc = `🔄 Reasignación de cartera: de '${prev}' a '${params.newAdvisor}'. Realizado por ${params.performedByName}.${reasonText}`;

        await addCRMActivity({
            customerId: params.customerId,
            type: 'advisor_reassigned',
            description: desc,
            authorEmail: params.performedByEmail,
            authorName: params.performedByName,
            metadata: {
                previousAdvisor: prev,
                newAdvisor: params.newAdvisor,
                reason: params.reason || null
            }
        });

        await recordAuditLog({
            userId: params.performedByEmail,
            userEmail: params.performedByEmail,
            userName: params.performedByName,
            userRole: 'director',
            modulo: 'clientes',
            accion: 'editar',
            entidad: 'asignacion_cartera',
            entidadId: params.customerId,
            descripcion: desc,
            detalles: {
                previousAdvisor: prev,
                newAdvisor: params.newAdvisor,
                reason: params.reason || null
            }
        });
    } catch (error) {
        console.error('[CRM] Error reassigning customer advisor:', error);
        throw error;
    }
}

/**
 * Reasignación masiva de cartera de clientes a un nuevo asesor
 */
export async function bulkReassignCustomers(params: {
    customerIds: string[];
    newAdvisor: string;
    performedByEmail: string;
    performedByName: string;
    reason?: string;
}): Promise<{ success: boolean; reassignedCount: number }> {
    try {
        let count = 0;
        for (const id of params.customerIds) {
            await reassignCustomerAdvisor({
                customerId: id,
                newAdvisor: params.newAdvisor,
                performedByEmail: params.performedByEmail,
                performedByName: params.performedByName,
                reason: params.reason
            });
            count++;
        }
        return { success: true, reassignedCount: count };
    } catch (error) {
        console.error('[CRM] Error in bulkReassignCustomers:', error);
        throw error;
    }
}

/**
 * Activa o desactiva manualmente a libre demanda a un cliente como Referidor/Embajador
 * de la Comunidad Biocambio360 sin necesidad de haber realizado una compra previa.
 * Genera código único, crea/actualiza el perfil en 'referral_profiles' y registra auditoría.
 */
export async function toggleCustomerReferrerStatus(params: {
    customerId: string;
    isReferrer: boolean;
    customerName: string;
    customerPhone: string;
    activatedByEmail: string;
    activatedByName: string;
}): Promise<{ success: boolean; referralCode: string; message: string }> {
    try {
        const cleanPhone = params.customerPhone.replace(/\D/g, '') || params.customerId;
        const customerDocRef = doc(customersRef, params.customerId);
        const customerSnap = await getDoc(customerDocRef);
        const existingData = customerSnap.exists() ? customerSnap.data() : {};

        if (!params.isReferrer) {
            // Desactivar referidor
            await updateDoc(customerDocRef, {
                isReferrer: false,
                updatedAt: serverTimestamp(),
            });

            // Actualizar también en referral_profiles
            const profileRef = doc(collection(db, 'referral_profiles'), cleanPhone);
            const pSnap = await getDoc(profileRef);
            if (pSnap.exists()) {
                await updateDoc(profileRef, {
                    isActive: false,
                    updatedAt: serverTimestamp()
                });
            }

            await addCRMActivity({
                customerId: params.customerId,
                type: 'referral_activated',
                description: `Estado de Embajador / Referidor pausado manualmente por ${params.activatedByName}.`,
                authorEmail: params.activatedByEmail,
                authorName: params.activatedByName,
            });

            return { success: true, referralCode: existingData.referralCode || '', message: 'Referidor desactivado con éxito' };
        }

        // Activar referidor
        let code = existingData.referralCode;
        if (!code) {
            code = generateReferralCode(params.customerName, cleanPhone);
        }

        const nowIso = new Date().toISOString();
        await updateDoc(customerDocRef, {
            isReferrer: true,
            referralCode: code,
            referralActivatedManually: true,
            referralActivatedBy: params.activatedByEmail,
            referralActivatedAt: nowIso,
            updatedAt: serverTimestamp(),
        });

        // Asegurar documento en referral_profiles
        const profileRef = doc(collection(db, 'referral_profiles'), cleanPhone);
        const profileSnap = await getDoc(profileRef);
        if (!profileSnap.exists()) {
            await setDoc(profileRef, {
                id: cleanPhone,
                code: code,
                nombre: params.customerName,
                celular: cleanPhone,
                tier: 'referidor',
                totalReferredOrders: 0,
                totalDeliveredOrders: 0,
                totalSalesGenerated: 0,
                balancePending: 0,
                balanceInHolding: 0,
                balanceAvailable: 0,
                balanceRedeemed: 0,
                isActive: true,
                allowWithoutPurchase: true,
                activatedManuallyBy: params.activatedByEmail,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        } else {
            await updateDoc(profileRef, {
                isActive: true,
                allowWithoutPurchase: true,
                activatedManuallyBy: params.activatedByEmail,
                updatedAt: serverTimestamp()
            });
        }

        await addCRMActivity({
            customerId: params.customerId,
            type: 'referral_activated',
            description: `🌟 Activado manualmente como Embajador / Referidor (Código: ${code}) a libre demanda por ${params.activatedByName} (${params.activatedByEmail}). Habilitado sin exigencia de compra mínima previa.`,
            authorEmail: params.activatedByEmail,
            authorName: params.activatedByName,
            metadata: {
                referralCode: code,
                link: `https://biocambio360.com/comunidad?ref=${code}`
            }
        });

        await recordAuditLog({
            userId: params.activatedByEmail,
            userEmail: params.activatedByEmail,
            userName: params.activatedByName,
            userRole: 'director',
            modulo: 'clientes',
            accion: 'editar',
            entidad: 'cliente_referidor',
            entidadId: params.customerId,
            descripcion: `Activación manual de referidor para '${params.customerName}' con código '${code}' a libre demanda por ${params.activatedByName}.`,
            detalles: { referralCode: code, cleanPhone }
        });

        return {
            success: true,
            referralCode: code,
            message: `¡Cliente activado exitosamente como Referidor! Código: ${code}`
        };
    } catch (error: any) {
        console.error('[CRM] Error toggling customer referrer status:', error);
        throw error;
    }
}

// ─────────────────────────────────────────────────────────────
// Dashboard Stats
// ─────────────────────────────────────────────────────────────

/**
 * Calcula estadísticas del CRM para el dashboard.
 * Consulta todos los clientes y calcula stage dinámicamente.
 */
export async function getCRMDashboardStats(): Promise<CRMDashboardStats> {
    try {
        const snap = await getDocs(query(customersRef, limit(1000)));

        const byStage: Record<CRMStage, number> = {
            lead: 0,
            first_purchase: 0,
            returning: 0,
            loyal: 0,
            vip: 0,
            at_risk: 0,
            lost: 0,
        };

        const byRecompraStatus: Record<string, number> = {
            surtido: 0,
            alerta_temprana: 0,
            critico_10_dias: 0,
            vencido: 0,
        };

        const allCustomers: CustomerCRM[] = [];

        snap.docs.forEach(d => {
            const data = d.data();
            const customer: Customer = {
                id: d.id,
                nombre: data.nombre || 'Cliente',
                cedula: data.cedula || '',
                celular: data.celular || d.id || '',
                email: data.email || '',
                direccion: data.direccion || '',
                ciudad: data.ciudad || '',
                departamento: data.departamento || '',
                totalSpent: data.totalSpent || 0,
                ordersCount: data.ordersCount || 0,
                lastOrderDate: data.lastOrderDate || null,
                firstOrderDate: data.firstOrderDate || null,
                createdAt: data.createdAt || null,
                updatedAt: data.updatedAt || null,
            };

            const enriched = enrichCustomerWithCRM(customer, {
                tags: data.tags || [],
                assignedTo: data.assignedTo,
                sarlaftStatus: data.sarlaftStatus,
                sarlaftCheckedAt: data.sarlaftCheckedAt,
                lastActivityAt: data.lastActivityAt,
            });

            byStage[enriched.stage]++;
            allCustomers.push(enriched);
        });

        // Top 5 clientes por valor
        const topCustomers = [...allCustomers]
            .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
            .slice(0, 5);

        // Actividades recientes
        const recentActivities = await getRecentActivities(10);

        return {
            totalCustomers: allCustomers.length,
            byStage,
            byRecompraStatus,
            recentActivities,
            topCustomers,
        };
    } catch (error) {
        console.error('[CRM] Error getting dashboard stats:', error);
        return {
            totalCustomers: 0,
            byStage: { lead: 0, first_purchase: 0, returning: 0, loyal: 0, vip: 0, at_risk: 0, lost: 0 },
            byRecompraStatus: { surtido: 0, alerta_temprana: 0, critico_10_dias: 0, vencido: 0 },
            recentActivities: [],
            topCustomers: [],
        };
    }
}
