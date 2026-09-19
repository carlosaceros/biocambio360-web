import {
    collection,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    increment,
    Timestamp,
    query,
    orderBy,
    getDocs,
    limit,
    where,
    serverTimestamp // Import serverTimestamp
} from 'firebase/firestore';

import { db } from './firebase'; // Adjust import path if needed
import { Customer } from '@/types/customer';
import { OrderCustomer } from '@/types/order';

const customersCollection = collection(db, 'customers');

/**
 * Upsert customer data from a new order
 * Uses phone number as the unique document ID
 */
export async function upsertCustomerFromOrder(orderCustomer: OrderCustomer, orderTotal: number) {
    // Clean phone number to use as ID (remove non-digits)
    const customerId = orderCustomer.celular.replace(/\D/g, '');
    const customerRef = doc(customersCollection, customerId);

    const customerSnap = await getDoc(customerRef);
    const now = Timestamp.now(); // Create a client-side Timestamp.

    if (customerSnap.exists()) {
        // Update existing customer
        await updateDoc(customerRef, {
            nombre: orderCustomer.nombre, // Update name in case of typo fix
            email: orderCustomer.email || customerSnap.data().email, // Update email if provided
            direccion: orderCustomer.direccion, // Update address to latest
            ciudad: orderCustomer.ciudad,
            departamento: orderCustomer.departamento,

            totalSpent: increment(orderTotal),
            ordersCount: increment(1),
            lastOrderDate: now,
            updatedAt: now
        });
    } else {
        // Create new customer
        const newCustomer: Customer = {
            id: customerId,
            nombre: orderCustomer.nombre,
            cedula: orderCustomer.cedula,
            celular: orderCustomer.celular,
            email: orderCustomer.email,
            direccion: orderCustomer.direccion,
            ciudad: orderCustomer.ciudad,
            departamento: orderCustomer.departamento,

            totalSpent: orderTotal,
            ordersCount: 1,
            lastOrderDate: now,
            firstOrderDate: now,

            createdAt: now,
            updatedAt: now
        };

        await setDoc(customerRef, newCustomer);
    }
}

/**
 * Get all customers safely without requiring complex composite indexes
 */
export async function getCustomers(): Promise<Customer[]> {
    try {
        const q = query(customersCollection, limit(500));
        const snapshot = await getDocs(q);

        const customers = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                nombre: data.nombre || 'Cliente',
                cedula: data.cedula || '',
                celular: data.celular || doc.id || '',
                email: data.email || '',
                direccion: data.direccion || '',
                ciudad: data.ciudad || '',
                departamento: data.departamento || '',
                totalSpent: data.totalSpent || 0,
                ordersCount: data.ordersCount || 1,
                lastOrderDate: data.lastOrderDate || data.createdAt || null,
                firstOrderDate: data.firstOrderDate || data.createdAt || null,
                createdAt: data.createdAt || null,
                updatedAt: data.updatedAt || null,
            } as Customer;
        });

        // Ordenar en memoria por fecha más reciente
        return customers.sort((a, b) => {
            const timeA = a.lastOrderDate?.seconds ? a.lastOrderDate.seconds * 1000 : 0;
            const timeB = b.lastOrderDate?.seconds ? b.lastOrderDate.seconds * 1000 : 0;
            return timeB - timeA;
        });
    } catch (error) {
        console.error('[getCustomers] Error:', error);
        return [];
    }
}

/**
 * Get customer by ID (Phone)
 */
export async function getCustomerById(id: string): Promise<Customer | null> {
    const docRef = doc(customersCollection, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Customer;
    }
    return null;
}

/**
 * Sync customers from existing orders in 'pedidos' collection (Backfill)
 */
export async function syncCustomersFromOrders(): Promise<{ processed: number, updated: number }> {
    // Corregido: la colección oficial en Firestore es 'pedidos'
    const pedidosRef = collection(db, 'pedidos');
    const snapshot = await getDocs(pedidosRef);

    let processed = 0;
    let updated = 0;

    console.log(`Starting sync for ${snapshot.size} pedidos...`);

    for (const orderDoc of snapshot.docs) {
        const order = orderDoc.data() as any;

        if (order.cliente && order.cliente.celular) {
            try {
                const customerId = order.cliente.celular.replace(/\D/g, '');
                if (!customerId) continue;

                const customerRef = doc(customersCollection, customerId);
                const customerSnap = await getDoc(customerRef);

                if (!customerSnap.exists()) {
                    await upsertCustomerFromOrder(order.cliente, order.total || 0);
                    updated++;
                }

                processed++;
            } catch (error) {
                console.error(`Error processing order ${orderDoc.id}:`, error);
            }
        }
    }

    return { processed, updated };
}

/**
 * Create or update a customer quickly from POS or fast entry
 */
export async function quickCreateCustomer(data: {
    nombre: string;
    celular: string;
    cedula?: string;
    email?: string;
    direccion?: string;
    ciudad?: string;
    departamento?: string;
    asesorAsignado?: string;
}): Promise<Customer> {
    const cleanPhone = data.celular.replace(/\D/g, '');
    if (!cleanPhone) throw new Error('El número celular es obligatorio.');

    const customerRef = doc(customersCollection, cleanPhone);
    const snap = await getDoc(customerRef);
    const now = Timestamp.now();

    const existing = snap.exists() ? snap.data() : null;

    const customerData: Customer = {
        id: cleanPhone,
        nombre: data.nombre.trim(),
        celular: cleanPhone,
        cedula: data.cedula?.trim() || existing?.cedula || '222222222222',
        email: data.email?.trim() || existing?.email || undefined,
        direccion: data.direccion?.trim() || existing?.direccion || 'Venta Mostrador Soacha',
        ciudad: data.ciudad?.trim() || existing?.ciudad || 'Soacha',
        departamento: data.departamento?.trim() || existing?.departamento || 'Cundinamarca',
        totalSpent: existing?.totalSpent || 0,
        ordersCount: existing?.ordersCount || 0,
        lastOrderDate: existing?.lastOrderDate || now,
        firstOrderDate: existing?.firstOrderDate || now,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        ...(data.asesorAsignado ? { asesorAsignado: data.asesorAsignado } : existing?.asesorAsignado ? { asesorAsignado: existing.asesorAsignado } : {})
    };

    await setDoc(customerRef, customerData, { merge: true });
    return customerData;
}

/**
 * Search customers in memory cache or fallback to Firestore by term (name, phone, cédula)
 */
export async function searchCustomers(
    term: string,
    cachedCustomers: Customer[] = []
): Promise<Customer[]> {
    const cleanTerm = term.trim().toLowerCase();
    if (!cleanTerm) return [];

    const cleanDigits = term.replace(/\D/g, '');

    // 1. Filter local cache for instant zero-latency feedback
    const localMatches = cachedCustomers.filter(c => {
        const nameMatch = (c.nombre || '').toLowerCase().includes(cleanTerm);
        const phoneMatch = cleanDigits.length >= 3 && (c.celular || c.id || '').includes(cleanDigits);
        const cedulaMatch = cleanDigits.length >= 4 && (c.cedula || '').includes(cleanDigits);
        const emailMatch = (c.email || '').toLowerCase().includes(cleanTerm);
        return nameMatch || phoneMatch || cedulaMatch || emailMatch;
    });

    if (localMatches.length > 0) {
        return localMatches.slice(0, 8);
    }

    // 2. Direct remote lookup if query has 7+ digits (phone)
    if (cleanDigits.length >= 7) {
        try {
            const customerSnap = await getDoc(doc(customersCollection, cleanDigits));
            if (customerSnap.exists()) {
                const data = customerSnap.data();
                return [{
                    id: customerSnap.id,
                    ...data,
                    nombre: data.nombre || 'Cliente',
                    celular: data.celular || customerSnap.id,
                    cedula: data.cedula || '',
                } as Customer];
            }
        } catch (e) {
            console.warn('[searchCustomers] Remote search fallback error:', e);
        }
    }

    return [];
}

export interface CustomerPurchaseHistoryItem {
    id: string;
    fecha: any;
    tipo: 'POS Mostrador' | 'Pedido Online / Asesor';
    numeroComprobante: string;
    total: number;
    subtotal?: number;
    descuento?: number;
    metodoPago?: string;
    estado?: string;
    items: {
        productId: string;
        nombre: string;
        size: string;
        cantidad: number;
        precioUnitario: number;
        subtotal: number;
        imagen?: string;
    }[];
}

/**
 * Obtiene el historial unificado de compras previas del cliente (Pedidos y Ventas POS Mostrador)
 */
export async function getCustomerPurchaseHistory(
    phone: string
): Promise<CustomerPurchaseHistoryItem[]> {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return [];

    const history: CustomerPurchaseHistoryItem[] = [];

    // 1. Consultar ventas de Mostrador POS ('pos_sales')
    try {
        const posCol = collection(db, 'pos_sales');
        const qPos = query(posCol, where('cliente.celular', '==', cleanPhone), limit(25));
        const posSnap = await getDocs(qPos);
        posSnap.docs.forEach(doc => {
            const data = doc.data() as any;
            history.push({
                id: doc.id,
                fecha: data.createdAt || data.fecha || null,
                tipo: 'POS Mostrador',
                numeroComprobante: data.numeroTicket || doc.id,
                total: Number(data.total || 0),
                subtotal: Number(data.subtotal || data.total || 0),
                descuento: Number(data.descuento || 0),
                metodoPago: data.metodoPago || 'efectivo',
                estado: 'entregado',
                items: (data.items || []).map((it: any) => ({
                    productId: it.productId || 'item',
                    nombre: it.nombre || 'Producto',
                    size: it.size || 'Unidad',
                    cantidad: Number(it.cantidad || 1),
                    precioUnitario: Number(it.precioUnitario || 0),
                    subtotal: Number(it.subtotal || (it.precioUnitario || 0) * (it.cantidad || 1)),
                    imagen: it.imagen
                }))
            });
        });
    } catch (e) {
        console.warn('[getCustomerPurchaseHistory] Error consultando pos_sales:', e);
    }

    // 2. Consultar pedidos ('orders')
    try {
        const ordersCol = collection(db, 'orders');
        const qOrders = query(ordersCol, where('cliente.celular', '==', cleanPhone), limit(25));
        const ordersSnap = await getDocs(qOrders);
        ordersSnap.docs.forEach(doc => {
            const data = doc.data() as any;
            history.push({
                id: doc.id,
                fecha: data.createdAt || null,
                tipo: 'Pedido Online / Asesor',
                numeroComprobante: doc.id,
                total: Number(data.total || 0),
                subtotal: Number(data.subtotal || data.total || 0),
                descuento: Number(data.discountAmount || 0),
                metodoPago: data.paymentMethod || 'contraentrega',
                estado: data.status || 'confirmado',
                items: (data.items || []).map((it: any) => ({
                    productId: it.product?.id || it.productId || 'item',
                    nombre: it.product?.nombre || it.nombre || 'Producto',
                    size: it.size || 'Unidad',
                    cantidad: Number(it.cantidad || 1),
                    precioUnitario: Number(it.price || it.precioUnitario || 0),
                    subtotal: Number(it.price || it.precioUnitario || 0) * Number(it.cantidad || 1),
                    imagen: it.product?.imgFile || it.imagen
                }))
            });
        });
    } catch (e) {
        console.warn('[getCustomerPurchaseHistory] Error consultando orders:', e);
    }

    // Ordenar cronológicamente descendente (más reciente primero)
    return history.sort((a, b) => {
        const timeA = a.fecha?.toMillis ? a.fecha.toMillis() : a.fecha?.seconds ? a.fecha.seconds * 1000 : 0;
        const timeB = b.fecha?.toMillis ? b.fecha.toMillis() : b.fecha?.seconds ? b.fecha.seconds * 1000 : 0;
        return timeB - timeA;
    });
}

