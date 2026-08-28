import { db } from './firebase';
import { 
    doc, 
    setDoc, 
    getDoc, 
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
    ciudad?: string;
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
    ciudad?: string;
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
            ciudad: data.ciudad || existing.ciudad || '',
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
            ciudad: data.ciudad || '',
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
 * Mark an abandoned cart as successfully recovered after checkout
 */
export async function markCartAsRecovered(cartToken: string): Promise<void> {
    if (!cartToken) return;
    const cartRef = doc(db, COLLECTION_NAME, cartToken);
    try {
        await updateDoc(cartRef, {
            status: 'recovered',
            updatedAt: serverTimestamp(),
        });
    } catch (err) {
        console.warn('[AbandonedCart] Error marking cart recovered:', err);
    }
}
