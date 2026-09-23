/**
 * Smart Lead Assignment Service
 * 
 * Assigns incoming conversations to advisors (asesores) using:
 * 1. Historical loyalty — if the customer talked to a specific advisor before, re-assign to them
 * 2. Workload balance — assign to the advisor with the fewest open conversations
 * 3. Round-robin fallback — cycle through available advisors if workloads are equal
 *
 * Only users with role 'asesor' and status 'activo' are eligible for auto-assignment.
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

/**
 * Core assignment logic: returns the best advisor UID for a new conversation.
 * Priority order:
 *  1. Same advisor as previous conversation with this contact (loyalty)
 *  2. Advisor with fewest open conversations (workload balance)
 *  3. Round-robin among tied advisors
 */
export async function findBestAdvisor(
    contactPhone: string,
    excludeUids: string[] = []
): Promise<AdvisorWorkload | null> {
    const db = getAdminDB();

    // 1. Get all active asesores
    const usersSnap = await db
        .collection('admin_users')
        .where('rol', '==', 'asesor')
        .where('estado', '==', 'activo')
        .get();

    if (usersSnap.empty) return null;

    const advisors: AdvisorWorkload[] = usersSnap.docs
        .filter(d => !excludeUids.includes(d.id))
        .map(d => ({
            uid: d.id,
            nombre: d.data().nombre ?? 'Asesor',
            email: d.data().email ?? '',
            openConversations: 0,
            lastAssignedAt: d.data().lastAssignedAt?.toDate?.(),
        }));

    if (advisors.length === 0) return null;

    // 2. Check for historical assignment with this contact
    const historicalConvs = await db
        .collection('conversations')
        .where('contactPhone', '==', contactPhone)
        .where('assignedTo', '!=', null)
        .orderBy('assignedTo')
        .orderBy('lastMessageAt', 'desc')
        .limit(5)
        .get();

    if (!historicalConvs.empty) {
        // Find most recently assigned advisor for this contact
        const recentlyAssigned = historicalConvs.docs[0].data().assignedTo as string;
        const loyalAdvisor = advisors.find(a => a.uid === recentlyAssigned);
        if (loyalAdvisor) {
            console.log(`[lead-assignment] Loyalty match: reassigning to ${loyalAdvisor.nombre} for contact ${contactPhone}`);
            return loyalAdvisor;
        }
    }

    // 3. Count open conversations per advisor (workload)
    const openConvsSnap = await db
        .collection('conversations')
        .where('status', 'in', ['abierto', 'asignado'])
        .where('assignedTo', '!=', null)
        .get();

    for (const convDoc of openConvsSnap.docs) {
        const assignedUid = convDoc.data().assignedTo as string;
        const advisor = advisors.find(a => a.uid === assignedUid);
        if (advisor) {
            advisor.openConversations++;
        }
    }

    // 4. Sort by workload (ascending), then by lastAssignedAt (ascending) for round-robin tiebreak
    advisors.sort((a, b) => {
        if (a.openConversations !== b.openConversations) {
            return a.openConversations - b.openConversations;
        }
        // Tiebreak: assign to the one who was assigned least recently
        if (!a.lastAssignedAt) return -1;
        if (!b.lastAssignedAt) return 1;
        return a.lastAssignedAt.getTime() - b.lastAssignedAt.getTime();
    });

    const best = advisors[0];
    console.log(`[lead-assignment] Workload assignment: → ${best.nombre} (${best.openConversations} open convs)`);
    return best;
}

/**
 * Auto-assigns a conversation to the best available advisor.
 * Updates the conversation document and the advisor's lastAssignedAt timestamp.
 */
export async function autoAssignConversation(
    conversationId: string,
    contactPhone: string
): Promise<{ assigned: boolean; advisorName?: string; advisorUid?: string }> {
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
    return { assigned: true, advisorName: advisor.nombre, advisorUid: advisor.uid };
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
    const db = getAdminDB();

    const usersSnap = await db
        .collection('admin_users')
        .where('rol', '==', 'asesor')
        .where('estado', '==', 'activo')
        .get();

    const advisors: AdvisorWorkload[] = usersSnap.docs.map(d => ({
        uid: d.id,
        nombre: d.data().nombre ?? 'Asesor',
        email: d.data().email ?? '',
        openConversations: 0,
        lastAssignedAt: d.data().lastAssignedAt?.toDate?.(),
    }));

    if (advisors.length === 0) return [];

    const openConvsSnap = await db
        .collection('conversations')
        .where('status', 'in', ['abierto', 'asignado'])
        .where('assignedTo', '!=', null)
        .get();

    for (const doc of openConvsSnap.docs) {
        const uid = doc.data().assignedTo as string;
        const advisor = advisors.find(a => a.uid === uid);
        if (advisor) advisor.openConversations++;
    }

    return advisors.sort((a, b) => a.openConversations - b.openConversations);
}
