import {
    collection,
    addDoc,
    updateDoc,
    doc,
    query,
    where,
    orderBy,
    onSnapshot,
    Timestamp,
    getDocs,
    getDoc,
    arrayUnion
} from 'firebase/firestore';
import { db } from './firebase';
import { upsertCustomerFromOrder } from './customers-service';

import { Order, OrderStatus, TimelineEvent, OrderInternalNote } from '@/types/order';

// Collection reference
const ordersCollection = collection(db, 'orders');

/**
 * Recursively removes undefined values from an object so Firestore doesn't reject the document.
 */
function removeUndefined<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    return Object.fromEntries(
        Object.entries(obj as Record<string, unknown>)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, typeof v === 'object' && v !== null ? removeUndefined(v) : v])
    ) as T;
}

/**
 * Create a new order in Firestore
 */
export async function createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'timeline'>): Promise<string> {
    const now = Timestamp.now();

    const order = removeUndefined({
        ...orderData,
        timeline: [{
            status: orderData.status,
            timestamp: now,
            note: 'Pedido creado'
        }] as TimelineEvent[],
        createdAt: now,
        updatedAt: now
    });

    const docRef = await addDoc(ordersCollection, order);

    // Async update customer data (fire and forget to not block order flow)
    upsertCustomerFromOrder(orderData.cliente, orderData.total).catch(err =>
        console.error('Error updating customer data:', err)
    );

    return docRef.id;
}

/**
 * Update order status with optional note and user attribution
 */
export async function updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    note?: string,
    userContext?: { email?: string; nombre?: string; role?: string }
): Promise<void> {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
        throw new Error('Order not found');
    }

    const order = orderSnap.data() as Order;
    const previousStatus = order.status;
    const now = Timestamp.now();
    const nowIso = new Date().toISOString();

    const newTimelineEvent = removeUndefined({
        status: newStatus,
        timestamp: now,
        user: userContext?.nombre || userContext?.email || 'Sistema / Gestor',
        userEmail: userContext?.email,
        userRole: userContext?.role,
        note
    } as TimelineEvent);

    const updatePayload: Record<string, any> = {
        status: newStatus,
        timeline: arrayUnion(newTimelineEvent),
        updatedAt: now
    };

    if (note && note.trim()) {
        const internalNote: OrderInternalNote = {
            id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            text: note.trim(),
            authorEmail: userContext?.email || 'logistica@biocambio360.com',
            authorName: userContext?.nombre || (userContext?.role === 'superadmin' ? 'Super Admin' : 'Rol Logístico'),
            authorRole: userContext?.role || 'logistico',
            createdAt: nowIso,
            stageAtCreation: newStatus,
            isStatusChangeNote: true,
            previousStatus,
            newStatus
        };
        updatePayload.notasInternas = arrayUnion(removeUndefined(internalNote));
    }

    await updateDoc(orderRef, updatePayload);
}

/**
 * Add an independent internal note to an order
 */
export async function addOrderInternalNote(
    orderId: string,
    noteText: string,
    userContext?: { email?: string; nombre?: string; role?: string },
    currentStage?: OrderStatus
): Promise<OrderInternalNote> {
    if (!noteText || !noteText.trim()) {
        throw new Error('El texto de la nota no puede estar vacío');
    }

    const orderRef = doc(db, 'orders', orderId);
    const nowIso = new Date().toISOString();
    const now = Timestamp.now();

    const internalNote: OrderInternalNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        text: noteText.trim(),
        authorEmail: userContext?.email || 'logistica@biocambio360.com',
        authorName: userContext?.nombre || (userContext?.role === 'superadmin' ? 'Super Admin' : 'Rol Logístico'),
        authorRole: userContext?.role || 'logistico',
        createdAt: nowIso,
        stageAtCreation: currentStage || 'pendiente',
        isStatusChangeNote: false
    };

    await updateDoc(orderRef, {
        notasInternas: arrayUnion(removeUndefined(internalNote)),
        updatedAt: now
    });

    return internalNote;
}

/**
 * Subscribe to orders in real-time
 */
export function subscribeToOrders(
    callback: (orders: (Order & { id: string })[]) => void,
    statusFilter?: OrderStatus[]
) {
    let q = query(ordersCollection, orderBy('createdAt', 'desc'));

    if (statusFilter && statusFilter.length > 0) {
        q = query(ordersCollection, where('status', 'in', statusFilter), orderBy('createdAt', 'desc'));
    }

    return onSnapshot(q, (snapshot) => {
        const orders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as (Order & { id: string })[];

        callback(orders);
    });
}

/**
 * Get orders by status
 */
export async function getOrdersByStatus(status: OrderStatus): Promise<(Order & { id: string })[]> {
    const q = query(ordersCollection, where('status', '==', status), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as (Order & { id: string })[];
}

/**
 * Get single order by ID
 */
export async function getOrderById(orderId: string): Promise<(Order & { id: string }) | null> {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
        return null;
    }

    return {
        id: orderSnap.id,
        ...orderSnap.data()
    } as Order & { id: string };
}

/**
 * Add note to order
 */
export async function addOrderNote(orderId: string, note: string): Promise<void> {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
        throw new Error('Order not found');
    }

    const order = orderSnap.data() as Order;

    await updateDoc(orderRef, {
        notas: [...(order.notas || []), note],
        updatedAt: Timestamp.now()
    });
}

/**
 * Get orders by customer phone (ID)
 */
export async function getOrdersByCustomer(customerPhone: string): Promise<(Order & { id: string })[]> {
    const q = query(
        ordersCollection,
        where('cliente.celular', '==', customerPhone)
    );

    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })) as (Order & { id: string })[];

    // Sort client-side to avoid needing a composite index
    return orders.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() ?? 0;
        const timeB = b.createdAt?.toMillis?.() ?? 0;
        return timeB - timeA;
    });
}
