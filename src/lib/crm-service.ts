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
    updateDoc,
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

/**
 * Asigna un asesor a un cliente.
 */
export async function assignCustomerToAdvisor(
    customerId: string,
    advisorEmail: string,
    authorEmail?: string,
    authorName?: string
): Promise<void> {
    try {
        const customerDocRef = doc(customersRef, customerId);
        await updateDoc(customerDocRef, {
            assignedTo: advisorEmail,
            updatedAt: serverTimestamp(),
        });

        await addCRMActivity({
            customerId,
            type: 'note',
            description: `Asesor asignado: ${advisorEmail}`,
            authorEmail,
            authorName,
        });
    } catch (error) {
        console.error('[CRM] Error assigning advisor:', error);
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
