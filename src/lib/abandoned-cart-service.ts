import { db } from './firebase';
import { 
    doc, 
    setDoc, 
    getDoc, 
    getDocs,
    collection,
    query,
    where,
    updateDoc, 
    serverTimestamp 
} from 'firebase/firestore';

export interface AbandonedCartItem {
    id: string;
    nombre: string;
    size: string;
    cantidad: number;
    price: number;
    imgFile?: string;
}

export interface AbandonedCartRecord {
    cartToken: string;
    customerEmail?: string;
    customerName?: string;
    customerPhone?: string;
    customerCedula?: string;
    ciudad?: string;
    departamento?: string;
    direccion?: string;
    items: AbandonedCartItem[];
    subtotal: number;
    shippingCost: number;
    total: number;
    status: 'abandoned' | 'recovered' | 'expired';
    notificationCount: number; // 0, 1, 2, 3
    createdAt: any;
    updatedAt: any;
    lastNotifiedAt?: any;
    openedAt?: any;
    openCount?: number;
    lastContactOpened?: number;
    clickedAt?: any;
    clickCount?: number;
    lastContactClicked?: number;
    recoveredOrderId?: string;
    recoveredNote?: string;
}

const COLLECTION_NAME = 'abandoned_carts';

/**
 * Save or update an abandoned cart session in Firestore
 */
export async function saveAbandonedCartSession(data: {
    cartToken: string;
    customerEmail?: string;
    customerName?: string;
    customerPhone?: string;
    cedula?: string;
    ciudad?: string;
    departamento?: string;
    direccion?: string;
    items: AbandonedCartItem[];
    subtotal: number;
    shippingCost: number;
    total: number;
}): Promise<void> {
    if (!data.cartToken || (!data.customerEmail && !data.customerPhone) || data.items.length === 0) return;

    const cartRef = doc(db, COLLECTION_NAME, data.cartToken);
    const existingSnap = await getDoc(cartRef);

    if (existingSnap.exists()) {
        const existing = existingSnap.data() as AbandonedCartRecord;
        // Don't overwrite if already recovered
        if (existing.status === 'recovered') return;

        await updateDoc(cartRef, {
            customerEmail: data.customerEmail || existing.customerEmail || '',
            customerName: data.customerName || existing.customerName || '',
            customerPhone: data.customerPhone || existing.customerPhone || '',
            customerCedula: data.cedula || existing.customerCedula || '',
            ciudad: data.ciudad || existing.ciudad || '',
            departamento: data.departamento || existing.departamento || '',
            direccion: data.direccion || existing.direccion || '',
            items: data.items,
            subtotal: data.subtotal,
            shippingCost: data.shippingCost,
            total: data.total,
            updatedAt: serverTimestamp(),
        });
    } else {
        await setDoc(cartRef, {
            cartToken: data.cartToken,
            customerEmail: data.customerEmail || '',
            customerName: data.customerName || '',
            customerPhone: data.customerPhone || '',
            customerCedula: data.cedula || '',
            ciudad: data.ciudad || '',
            departamento: data.departamento || '',
            direccion: data.direccion || '',
            items: data.items,
            subtotal: data.subtotal,
            shippingCost: data.shippingCost,
            total: data.total,
            status: 'abandoned',
            notificationCount: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    }
}

/**
 * Retrieve cart details by session recovery token
 */
export async function getAbandonedCartByToken(cartToken: string): Promise<AbandonedCartRecord | null> {
    if (!cartToken) return null;
    const cartRef = doc(db, COLLECTION_NAME, cartToken);
    const snap = await getDoc(cartRef);

    if (!snap.exists()) return null;
    return snap.data() as AbandonedCartRecord;
}

/**
 * Mark an abandoned cart as successfully recovered after checkout.
 * Also cleans up and marks any previous attempts by the same customer (matching email or phone)
 * so that completed purchases never appear as pending abandoned carts or duplicate in metrics.
 */
export async function markCartAsRecovered(
    cartToken: string,
    orderId?: string,
    customerEmail?: string,
    customerPhone?: string
): Promise<void> {
    if (!cartToken && !customerEmail && !customerPhone) return;

    if (cartToken) {
        const cartRef = doc(db, COLLECTION_NAME, cartToken);
        try {
            await updateDoc(cartRef, {
                status: 'recovered',
                recoveredOrderId: orderId || undefined,
                updatedAt: serverTimestamp(),
            });
        } catch (err) {
            console.warn('[AbandonedCart] Error marking cart recovered by token:', err);
        }
    }

    // Buscar y marcar otros carritos pendientes del mismo cliente para evitar duplicados
    try {
        const colRef = collection(db, COLLECTION_NAME);
        const qPending = query(colRef, where('status', '==', 'abandoned'));
        const snap = await getDocs(qPending);

        const cleanEmail = (customerEmail || '').trim().toLowerCase();
        const cleanPhone = (customerPhone || '').replace(/\D/g, '');

        for (const d of snap.docs) {
            const data = d.data();
            const dEmail = (data.customerEmail || '').trim().toLowerCase();
            const dPhone = (data.customerPhone || '').replace(/\D/g, '');

            const matchEmail = cleanEmail && dEmail && cleanEmail === dEmail;
            const matchPhone = cleanPhone && dPhone && (
                cleanPhone === dPhone ||
                cleanPhone.endsWith(dPhone) ||
                dPhone.endsWith(cleanPhone)
            );

            if (matchEmail || matchPhone) {
                await updateDoc(d.ref, {
                    status: 'recovered',
                    recoveredOrderId: orderId || undefined,
                    updatedAt: serverTimestamp(),
                }).catch(() => {});
            }
        }
    } catch (e) {
        console.warn('[AbandonedCart] Error auto-marking customer carts as recovered:', e);
    }
}
