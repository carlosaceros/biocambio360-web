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
