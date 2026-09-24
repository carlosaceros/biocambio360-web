/**
 * Smart Lead Assignment Service
 *
 * Assigns incoming conversations to advisors (asesores) using:
 * 1. Historical loyalty — if the customer talked to a specific advisor before, re-assign to them
 * 2. Workload balance — assign to the advisor with the fewest open conversations
 * 3. Round-robin fallback — cycle through available advisors if workloads are equal
 *
 * Only users with role 'asesor' and status 'activo' are eligible for auto-assignment.
 *
 * Queries are intentionally single-filter (filtering/sorting in memory) so they never
 * require Firestore composite indexes.
 */

export const runtime = 'nodejs';

import { getAdminDB } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface AdvisorWorkload {
    uid: string;
    nombre: string;
    email: string;
    openConversations: number;
    lastAssignedAt?: Date;
}

export type AssignmentReason = 'lealtad' | 'carga' | 'rotacion';

export interface AdvisorMatch extends AdvisorWorkload {
    reason: AssignmentReason;
    detail: string;
}

const OPEN_STATUSES = ['abierto', 'asignado'];

async function loadActiveAdvisors(): Promise<AdvisorWorkload[]> {
    const db = getAdminDB();
    const usersSnap = await db
        .collection('admin_users')
        .where('rol', '==', 'asesor')
        .where('estado', '==', 'activo')
        .get();

    return usersSnap.docs.map(d => ({
        uid: d.id,
        nombre: d.data().nombre ?? 'Asesor',
        email: d.data().email ?? '',
        openConversations: 0,
        lastAssignedAt: d.data().lastAssignedAt?.toDate?.(),
    }));
}

/** Fills openConversations (status abierto/asignado) for each advisor. */
async function countOpenConversations(advisors: AdvisorWorkload[]): Promise<void> {
    const db = getAdminDB();
    const ids = advisors.map(a => a.uid);

    for (let i = 0; i < ids.length; i += 30) {
        const chunk = ids.slice(i, i + 30);
        const snap = await db.collection('conversations').where('assignedTo', 'in', chunk).get();
        for (const convDoc of snap.docs) {
            const data = convDoc.data();
            if (!OPEN_STATUSES.includes(data.status)) continue;
            const advisor = advisors.find(a => a.uid === data.assignedTo);
            if (advisor) advisor.openConversations++;
        }
    }
}

/**
 * Core assignment logic: returns the best advisor for a conversation plus the reason.
 * Priority order:
 *  1. Same advisor as previous conversation with this contact (loyalty)
 *  2. Advisor with fewest open conversations (workload balance)
 *  3. Round-robin among tied advisors (least recently assigned)
 */
export async function findBestAdvisor(
    contactPhone: string,
    excludeUids: string[] = []
): Promise<AdvisorMatch | null> {
    const db = getAdminDB();

    const advisors = (await loadActiveAdvisors()).filter(a => !excludeUids.includes(a.uid));
    if (advisors.length === 0) return null;

    // 1. Historical loyalty: most recent conversation of this contact that had an advisor
    const historicalSnap = await db
        .collection('conversations')
        .where('contactPhone', '==', contactPhone)
        .get();

    const pastAssigned = historicalSnap.docs
        .map(d => d.data())
        .filter(c => c.assignedTo)
        .sort((a, b) => (b.lastMessageAt?.toMillis?.() ?? 0) - (a.lastMessageAt?.toMillis?.() ?? 0));

    if (pastAssigned.length > 0) {
        const loyalAdvisor = advisors.find(a => a.uid === pastAssigned[0].assignedTo);
        if (loyalAdvisor) {
            console.log(`[lead-assignment] Loyalty match: ${loyalAdvisor.nombre} for contact ${contactPhone}`);
            return {
                ...loyalAdvisor,
                reason: 'lealtad',
                detail: `${loyalAdvisor.nombre} ya atendió antes a este cliente.`,
            };
        }
    }

    // 2. Workload
    await countOpenConversations(advisors);

    // 3. Sort by workload, then least recently assigned (round-robin tiebreak)
    advisors.sort((a, b) => {
        if (a.openConversations !== b.openConversations) {
            return a.openConversations - b.openConversations;
        }
        if (!a.lastAssignedAt) return -1;
        if (!b.lastAssignedAt) return 1;
        return a.lastAssignedAt.getTime() - b.lastAssignedAt.getTime();
    });

    const best = advisors[0];
    const tied = advisors.length > 1 && advisors[1].openConversations === best.openConversations;
    console.log(`[lead-assignment] ${tied ? 'Rotation' : 'Workload'} assignment → ${best.nombre} (${best.openConversations} open)`);

    return tied
        ? {
            ...best,
            reason: 'rotacion',
            detail: `Varios asesores tenían la misma carga (${best.openConversations} conversaciones abiertas); se eligió a ${best.nombre}, quien lleva más tiempo sin recibir un cliente.`,
        }
        : {
            ...best,
            reason: 'carga',
            detail: `${best.nombre} es quien tiene menos conversaciones abiertas (${best.openConversations}).`,
        };
}

/**
 * Auto-assigns a conversation to the best available advisor.
 * Updates the conversation document and the advisor's lastAssignedAt timestamp.
 */
export async function autoAssignConversation(
    conversationId: string,
    contactPhone: string
): Promise<{
    assigned: boolean;
    advisorName?: string;
    advisorUid?: string;
    reason?: AssignmentReason;
    detail?: string;
}> {
    const db = getAdminDB();
    const advisor = await findBestAdvisor(contactPhone);

    if (!advisor) {
        console.log(`[lead-assignment] No available advisors for conv: ${conversationId}`);
        return { assigned: false };
    }

    await db.collection('conversations').doc(conversationId).update({
        assignedTo: advisor.uid,
        assignedToName: advisor.nombre,
        status: 'asignado',
        updatedAt: FieldValue.serverTimestamp(),
    });

    // Track lastAssignedAt on the advisor
    await db.collection('admin_users').doc(advisor.uid).update({
        lastAssignedAt: FieldValue.serverTimestamp(),
    });

    console.log(`[lead-assignment] Conversation ${conversationId} → ${advisor.nombre}`);
    return {
        assigned: true,
        advisorName: advisor.nombre,
        advisorUid: advisor.uid,
        reason: advisor.reason,
        detail: advisor.detail,
    };
}

/**
 * Manually assigns a conversation to a specific advisor (coordinator/superadmin action).
 */
export async function manualAssignConversation(
    conversationId: string,
    advisorUid: string,
    assignedByUid: string
): Promise<void> {
    const db = getAdminDB();

    // Get advisor name
    const advisorSnap = await db.collection('admin_users').doc(advisorUid).get();
    const advisorName = advisorSnap.exists ? (advisorSnap.data()?.nombre ?? 'Asesor') : 'Asesor';

    await db.collection('conversations').doc(conversationId).update({
        assignedTo: advisorUid,
        assignedToName: advisorName,
        status: 'asignado',
        manuallyAssignedBy: assignedByUid,
        updatedAt: FieldValue.serverTimestamp(),
    });

    await db.collection('admin_users').doc(advisorUid).update({
        lastAssignedAt: FieldValue.serverTimestamp(),
    });
}

/**
 * Returns current workload stats for all active asesores.
 * Used by the coordinator/dashboard to visualize advisor loads.
 */
export async function getAdvisorWorkloads(): Promise<AdvisorWorkload[]> {
    const advisors = await loadActiveAdvisors();
    if (advisors.length === 0) return [];

    await countOpenConversations(advisors);
    return advisors.sort((a, b) => a.openConversations - b.openConversations);
}
