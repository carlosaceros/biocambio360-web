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
 * In ecommerce retail, purchases of 10L, 20L or Combos for household/laundry use are B2C by default.
 * B2B is reserved for business/institutional accounts or explicit corporate quote orders.
 */
export function calculateOrderLifespanDays(
    orderItems: OrderItem[],
    isExplicitB2B: boolean = false
): { days: number; type: 'b2c' | 'b2b' } {
    let totalVolumeLitres = 0;

    (orderItems || []).forEach((item: OrderItem) => {
        const pres = (item.size || '').toLowerCase();
        const nombre = (item.product?.nombre || (item as any).nombre || '').toLowerCase();
        const qty = item.cantidad || 1;

        let itemLitres = 3.8;
        if (pres.includes('20') || nombre.includes('20l')) {
            itemLitres = 20;
        } else if (pres.includes('10') || nombre.includes('10l')) {
            itemLitres = 10;
        } else if (pres.includes('3.8') || pres.includes('galon') || pres.includes('galón') || pres.includes('1/2g')) {
            itemLitres = pres.includes('1/2') ? 1.9 : 3.8;
        } else if (pres.includes('1l') || pres.includes('1 l')) {
            itemLitres = 1;
        } else if (pres.includes('combo') || nombre.includes('combo') || nombre.includes('kit')) {
            itemLitres = 23.8; // Combo typical is 20L + 1 Galón
        }

        totalVolumeLitres += itemLitres * qty;
    });

    // Consumption cycle in days based on total volume
    let estimatedDays = 45;
    if (totalVolumeLitres >= 40) {
        estimatedDays = 90;
    } else if (totalVolumeLitres >= 20) {
        estimatedDays = 75;
    } else if (totalVolumeLitres >= 10) {
        estimatedDays = 60;
    } else if (totalVolumeLitres >= 3.8) {
        estimatedDays = 45;
    } else {
        estimatedDays = 30;
    }

    // Default to B2C (Hogar) for all online store orders, unless explicitly flagged B2B
    const customerType: 'b2c' | 'b2b' = isExplicitB2B ? 'b2b' : 'b2c';

    return { days: estimatedDays, type: customerType };
}

/**
 * Records or updates a customer's replenishment timer upon order placement or status update
 */
export function processOrderReplenishment(order: Order | any): CustomerReplenishment {
    const orderItems = order.productos || order.items || [];
    const cliente = order.cliente || order.shippingAddress || {};
    
    // Check if order comes from B2B quote portal or contains corporate data
    const isExplicitB2B = Boolean(
        order.isB2B ||
        order.tipoCliente === 'b2b' ||
        cliente.nit ||
        cliente.razonSocial ||
        cliente.empresa
    );

    const { days, type } = calculateOrderLifespanDays(orderItems, isExplicitB2B);
    
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

    const customerPhone = cliente.celular || order.customerPhone || order.telefono || '';
    const cleanPhone = customerPhone.replace(/\D/g, '');
    const customerEmail = cliente.email || order.customerEmail || '';

    return {
        id: cleanPhone || customerEmail.toLowerCase().trim() || `cli_${Date.now()}`,
        customerName: cliente.nombre || order.customerName || 'Cliente',
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
 * Updates customer type (B2C vs B2B) directly in Firestore
 */
export async function updateCustomerType(id: string, newType: 'b2c' | 'b2b'): Promise<void> {
    try {
        const docRef = doc(db, 'customer_replenishments', id);
        await updateDoc(docRef, { customerType: newType });
    } catch (e) {
        console.error('Error updating customer type in Firestore:', e);
        throw e;
    }
}

/**
 * Gets all customer replenishment records for Admin BI Dashboard.
 * ONLY includes customers with CONFIRMED or COMPLETED orders (confirmado, preparacion, enviado, en_camino, entregado).
 * Excludes cancelled and unconfirmed/abandoned pending orders to ensure total BI accuracy.
 */
export async function getAllReplenishmentRecords(): Promise<CustomerReplenishment[]> {
    try {
        // 1. Fetch all orders from Firestore
        const ordersRef = collection(db, 'orders');
        const ordersSnap = await getDocs(ordersRef);

        const VALID_STATUSES: string[] = ['confirmado', 'preparacion', 'enviado', 'en_camino', 'entregado'];
        const customerOrdersMap = new Map<string, any>();

        ordersSnap.forEach((docSnap) => {
            const orderData = { id: docSnap.id, ...docSnap.data() } as any;
            const status = orderData.status || 'pendiente';

            // Only consider confirmed or processed orders
            if (!VALID_STATUSES.includes(status)) {
                return;
            }

            const phone = (orderData.cliente?.celular || orderData.cliente?.telefono || '').replace(/\D/g, '');
            const email = (orderData.cliente?.email || '').toLowerCase().trim();
            const customerKey = phone || email;

            if (!customerKey) return;

            // Pick the latest order for each customer
            const existing = customerOrdersMap.get(customerKey);
            let orderDateMs = Date.now();
            if (orderData.createdAt && typeof orderData.createdAt.toMillis === 'function') {
                orderDateMs = orderData.createdAt.toMillis();
            } else if (orderData.createdAt) {
                orderDateMs = new Date(orderData.createdAt).getTime();
            }

            if (!existing || orderDateMs > existing._orderDateMs) {
                customerOrdersMap.set(customerKey, {
                    ...orderData,
                    _orderDateMs: orderDateMs
                });
            }
        });

        // 2. Fetch any existing overrides from customer_replenishments (e.g. manual B2B toggle, lastReminderSentAt)
        const customSnap = await getDocs(replenishmentsRef);
        const customMap = new Map<string, any>();
        customSnap.forEach((docSnap) => {
            customMap.set(docSnap.id, docSnap.data());
        });

        // 3. Generate replenishment records
        const list: CustomerReplenishment[] = [];
        const now = Date.now();

        customerOrdersMap.forEach((order) => {
            const repl = processOrderReplenishment(order);
            const customData = customMap.get(repl.id || '') || {};

            // Merge custom fields (e.g. manual customerType override, lastReminderSentAt)
            if (customData.customerType) {
                repl.customerType = customData.customerType;
            }
            if (customData.lastReminderSentAt) {
                repl.lastReminderSentAt = customData.lastReminderSentAt;
            }

            const dueDate = new Date(repl.nextOrderDueDate).getTime();
            const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

            let status: CustomerReplenishment['status'] = 'surtido';
            if (daysLeft < 0) {
                status = 'vencido';
            } else if (daysLeft <= 10) {
                status = 'critico_10_dias';
            } else if (daysLeft <= 25) {
                status = 'alerta_temprana';
            }

            repl.status = status;
            list.push(repl);
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
