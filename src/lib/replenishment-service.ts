import { db } from './firebase';
import { collection, doc, getDocs, getDoc, setDoc, query, where, orderBy, addDoc, updateDoc } from 'firebase/firestore';
import { Order, OrderItem } from '@/types/order';

export interface CustomerReplenishment {
    id?: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerCity: string;
    customerType: 'b2c' | 'b2b';
    lastOrderId: string;
    lastOrderDate: string; // ISO Date String
    nextOrderDueDate: string; // ISO Date String
    itemsSummary: string;
    estimatedCycleDays: number;
    lastReminderSentAt?: string;
    status?: 'surtido' | 'alerta_temprana' | 'critico_10_dias' | 'vencido';
}

const replenishmentsRef = collection(db, 'customer_replenishments');

/**
 * Calculates estimated lifespan of items in an order
 */
export function calculateOrderLifespanDays(orderItems: OrderItem[]): { days: number; type: 'b2c' | 'b2b' } {
    let has20L = false;
    let has10L = false;
    let has3_8L = false;

    (orderItems || []).forEach((item: OrderItem) => {
        const pres = (item.size || '').toLowerCase();
        const nombre = (item.product?.nombre || '').toLowerCase();
        
        if (pres.includes('20') || pres.includes('garrafa') || nombre.includes('20l')) {
            has20L = true;
        } else if (pres.includes('10')) {
            has10L = true;
        } else if (pres.includes('3.8') || pres.includes('galon') || pres.includes('galón')) {
            has3_8L = true;
        }
    });

    if (has20L) {
        return { days: 90, type: 'b2b' }; // 90 days for 20L
    }
    if (has10L) {
        return { days: 60, type: 'b2b' }; // 60 days for 10L
    }
    if (has3_8L) {
        return { days: 45, type: 'b2c' }; // 45 days for 3.8L Galón
    }

    return { days: 60, type: 'b2c' }; // Default 60 days
}

/**
 * Records or updates a customer's replenishment timer upon order placement or status update
 */
export function processOrderReplenishment(order: Order): CustomerReplenishment {
    const orderItems = order.productos || (order as any).items || [];
    const { days, type } = calculateOrderLifespanDays(orderItems);
    
    let orderDate = new Date();
    if (order.createdAt && typeof (order.createdAt as any).toDate === 'function') {
        orderDate = (order.createdAt as any).toDate();
    } else if (order.createdAt) {
        orderDate = new Date(order.createdAt as any);
    }

    const dueDate = new Date(orderDate.getTime() + days * 24 * 60 * 60 * 1000);

    const itemsSummary = orderItems
        .map((i: any) => `${i.cantidad}x ${i.product?.nombre || i.nombre || 'Producto'} (${i.size || i.presentacionSeleccionada || '3.8L'})`)
        .join(', ');

    const cliente = order.cliente || (order as any).shippingAddress || {};
    const customerPhone = cliente.celular || (order as any).customerPhone || (order as any).telefono || '';
    const cleanPhone = customerPhone.replace(/\D/g, '');
    const customerEmail = cliente.email || (order as any).customerEmail || '';

    return {
        id: cleanPhone || customerEmail.toLowerCase().trim() || `cli_${Date.now()}`,
        customerName: cliente.nombre || (order as any).customerName || 'Cliente',
        customerEmail: customerEmail ? customerEmail.toLowerCase().trim() : '',
        customerPhone,
        customerCity: cliente.ciudad || 'Soacha / Bogotá',
        customerType: type,
        lastOrderId: order.id || `ord_${Date.now()}`,
        lastOrderDate: orderDate.toISOString(),
        nextOrderDueDate: dueDate.toISOString(),
        itemsSummary,
        estimatedCycleDays: days
    };
}

/**
 * Saves or updates replenishment in Firestore
 */
export async function saveReplenishmentRecord(record: CustomerReplenishment): Promise<void> {
    try {
        const docId = record.id || record.customerPhone.replace(/\D/g, '') || 'client_' + Date.now();
        const docRef = doc(db, 'customer_replenishments', docId);
        await setDoc(docRef, record, { merge: true });
    } catch (e) {
        console.warn('Error saving replenishment record to Firestore:', e);
    }
}

/**
 * Gets all customer replenishment records for Admin BI Dashboard
 */
export async function getAllReplenishmentRecords(): Promise<CustomerReplenishment[]> {
    try {
        const snap = await getDocs(replenishmentsRef);
        const list: CustomerReplenishment[] = [];
        const now = Date.now();

        snap.forEach(doc => {
            const data = doc.data() as CustomerReplenishment;
            const dueDate = new Date(data.nextOrderDueDate).getTime();
            const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

            let status: CustomerReplenishment['status'] = 'surtido';
            if (daysLeft < 0) {
                status = 'vencido';
            } else if (daysLeft <= 10) {
                status = 'critico_10_dias';
            } else if (daysLeft <= 25) {
                status = 'alerta_temprana';
            }

            list.push({
                ...data,
                id: doc.id,
                status
            });
        });

        // Sort by nextOrderDueDate ascending (most urgent first)
        list.sort((a, b) => new Date(a.nextOrderDueDate).getTime() - new Date(b.nextOrderDueDate).getTime());
        return list;
    } catch (e) {
        console.warn('Error getting replenishment records:', e);
        return [];
    }
}

/**
 * Updates last reminder sent timestamp
 */
export async function markReminderSent(id: string): Promise<void> {
    try {
        const docRef = doc(db, 'customer_replenishments', id);
        await updateDoc(docRef, {
            lastReminderSentAt: new Date().toISOString()
        });
    } catch (e) {
        console.error('Error marking reminder sent:', e);
    }
}
