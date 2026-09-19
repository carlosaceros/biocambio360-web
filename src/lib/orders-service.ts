import {
    collection,
    addDoc,
    updateDoc,
    doc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    Timestamp,
    getDocs,
    getDoc,
    arrayUnion
} from 'firebase/firestore';
import { db } from './firebase';
import { upsertCustomerFromOrder } from './customers-service';
import { decrementStockForOrderItems } from './products-service';
import { recordAuditLog } from './audit-service';

import { Order, OrderStatus, TimelineEvent, OrderInternalNote, OrderCustomer } from '@/types/order';

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
 * Automatically marks any abandoned cart with matching phone or email as recovered upon order creation.
 */
async function autoRecoverMatchingAbandonedCarts(cliente: any, orderId: string): Promise<void> {
    try {
        const phone = (cliente?.celular || cliente?.telefono || '').replace(/\D/g, '');
        const email = (cliente?.email || '').trim().toLowerCase();
        if (!phone && !email) return;

        const cartsRef = collection(db, 'abandoned_carts');
        const q = query(cartsRef, where('status', '==', 'abandoned'));
        const snap = await getDocs(q);

        for (const docSnap of snap.docs) {
            const cart = docSnap.data();
            const cartEmail = (cart.customerEmail || '').trim().toLowerCase();
            const cartPhone = (cart.customerPhone || '').replace(/\D/g, '');

            const matchEmail = email && cartEmail && email === cartEmail;
            const matchPhone = phone && cartPhone && (phone === cartPhone || phone.endsWith(cartPhone) || cartPhone.endsWith(phone));

            if (matchEmail || matchPhone) {
                await updateDoc(docSnap.ref, {
                    status: 'recovered',
                    recoveredOrderId: orderId,
                    recoveredNote: `Pedido #${orderId} completado en checkout`,
                    updatedAt: Timestamp.now()
                });
            }
        }
    } catch (e) {
        console.warn('[OrdersService] Error auto-recovering abandoned carts:', e);
    }
}

/**
 * Normaliza una dirección colombiana para comparación estandarizada
 * (remueve caracteres especiales, estandariza nomenclatura calle/carrera/etc., números y quita tildes)
 */
export function normalizeAddress(raw: string): string {
    if (!raw) return '';
    return raw
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\bcalle\b/g, 'cll')
        .replace(/\bcarrera\b/g, 'cra')
        .replace(/\bdiagonal\b/g, 'dg')
        .replace(/\btransversal\b/g, 'tv')
        .replace(/\bavenida\b/g, 'av')
        .replace(/\bautopista\b/g, 'autop')
        .replace(/\bapartamento\b/g, 'apto')
        .replace(/\bnumero\b|\bnum\b|\bno\b|\bn\b/g, '')
        .replace(/[#.,\-_/\\()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Detecta si una dirección fue utilizada en otro pedido no cancelado en los últimos 30 días.
 * NO BLOQUEA LA COMPRA, pero genera metadatos de advertencia para gestores, logística y vendedores.
 */
export async function detectRecentAddressOrder(
    newAddress: string,
    city?: string,
    excludeOrderId?: string
): Promise<{
    isDuplicate: boolean;
    match?: {
        pedidoPrevioId: string;
        fechaPrevia: string;
        diasAtras: number;
        clientePrevio: string;
        celularPrevio: string;
        direccionPrevia: string;
    };
}> {
    const normNew = normalizeAddress(newAddress);
    if (!normNew || normNew.length < 5) {
        return { isDuplicate: false };
    }

    try {
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        const cutoffTs = Timestamp.fromMillis(Date.now() - thirtyDaysMs);
        const q = query(
            ordersCollection,
            where('createdAt', '>=', cutoffTs),
            limit(150)
        );
        const snap = await getDocs(q);

        const cleanCity = (city || '').toLowerCase().trim();

        for (const docSnap of snap.docs) {
            if (excludeOrderId && docSnap.id === excludeOrderId) continue;
            const data = docSnap.data() as Order;
            if (data.status === 'cancelado') continue;

            const prevDir = data.cliente?.direccion || '';
            const prevCity = (data.cliente?.ciudad || '').toLowerCase().trim();

            if (cleanCity && prevCity && cleanCity !== prevCity && !cleanCity.includes(prevCity) && !prevCity.includes(cleanCity)) {
                continue;
            }

            const normPrev = normalizeAddress(prevDir);
            if (!normPrev || normPrev.length < 5) continue;

            const isMatch = normNew === normPrev ||
                (normNew.length >= 8 && normPrev.length >= 8 && (normNew.includes(normPrev) || normPrev.includes(normNew)));

            if (isMatch) {
                const prevMs = (data.createdAt as any)?.toMillis ? (data.createdAt as any).toMillis() : Date.now();
                const diasAtras = Math.max(0, Math.floor((Date.now() - prevMs) / (1000 * 60 * 60 * 24)));

                return {
                    isDuplicate: true,
                    match: {
                        pedidoPrevioId: docSnap.id,
                        fechaPrevia: new Date(prevMs).toLocaleDateString('es-CO'),
                        diasAtras,
                        clientePrevio: data.cliente?.nombre || 'Cliente anterior',
                        celularPrevio: data.cliente?.celular || '',
                        direccionPrevia: prevDir
                    }
                };
            }
        }
    } catch (e) {
        console.warn('[OrdersService] Error al auditar dirección recurrente:', e);
    }

    return { isDuplicate: false };
}

/**
 * Create a new order in Firestore
 */
export async function createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'timeline'>): Promise<string> {
    const now = Timestamp.now();

    // Detección Antifraude / Logística: Coincidencia de dirección en los últimos 30 días (NO bloquea)
    let alertaDireccionReciente = false;
    let alertaDireccionDetalle: any = undefined;
    let autoNotes: OrderInternalNote[] = [...(orderData.notasInternas || [])];

    if (orderData.cliente?.direccion) {
        try {
            const addrAudit = await detectRecentAddressOrder(
                orderData.cliente.direccion,
                orderData.cliente.ciudad
            );
            if (addrAudit.isDuplicate && addrAudit.match) {
                alertaDireccionReciente = true;
                const m = addrAudit.match;
                alertaDireccionDetalle = {
                    ...m,
                    mensaje: `Esta dirección coincide con el pedido #${m.pedidoPrevioId.slice(-8)} realizado hace ${m.diasAtras} días por ${m.clientePrevio} (${m.celularPrevio}).`
                };

                // Inyectar nota interna para el equipo logístico y gestores
                autoNotes.unshift({
                    id: `note-addr-${Date.now()}`,
                    text: `⚠️ ALERTA LOGÍSTICA (Dirección recurrente <30d): Coincide con pedido #${m.pedidoPrevioId.slice(-8)} (${m.diasAtras} días atrás, ${m.clientePrevio}, Tel: ${m.celularPrevio}). Verificar antes de despacho para evitar duplicidad accidental.`,
                    authorEmail: 'sistema@biocambio360.com',
                    authorName: 'Antifraude / Sistema',
                    authorRole: 'sistema',
                    createdAt: new Date().toISOString()
                });
            }
        } catch (auditErr) {
            console.warn('[OrdersService] Error detectando dirección recurrente:', auditErr);
        }
    }

    const order = removeUndefined({
        ...orderData,
        alertaDireccionReciente,
        alertaDireccionDetalle,
        notasInternas: autoNotes.length > 0 ? autoNotes : undefined,
        timeline: [{
            status: orderData.status,
            timestamp: now,
            note: 'Pedido creado'
        }] as TimelineEvent[],
        createdAt: now,
        updatedAt: now
    });

    const docRef = await addDoc(ordersCollection, order);

    // Descontar inventario automáticamente si la orden está activa (no cancelada)
    if (orderData.status !== 'cancelado' && orderData.productos?.length > 0) {
        decrementStockForOrderItems(orderData.productos).catch(err =>
            console.warn('[OrdersService] Error al descontar inventario de la orden:', err)
        );
    }

    // Registro en bitácora de auditoría ISO 9001 si fue creado por asesor o canal comercial
    if (orderData.asesorNombre || orderData.canal) {
        recordAuditLog({
            userId: orderData.asesorId || orderData.asesorNombre || 'comercial',
            userName: orderData.asesorNombre || 'Asesor Comercial',
            userEmail: orderData.asesorEmail || 'comercial@biocambio360.com',
            userRole: 'asesor',
            modulo: 'pedidos',
            accion: 'crear',
            entidad: 'order',
            entidadId: docRef.id,
            descripcion: `Pedido comercial creado por ${orderData.asesorNombre || 'Asesor'} (Canal: ${orderData.canal || 'call_center'}) por valor de $${Number(orderData.total || 0).toLocaleString('es-CO')}`,
            detalles: {
                total: orderData.total,
                cliente: orderData.cliente?.nombre,
                ciudad: orderData.cliente?.ciudad,
                canal: orderData.canal,
                itemsCount: orderData.productos?.length || 0,
            }
        }).catch(err => console.warn('[OrdersService] Error registrando auditoría:', err));
    }

    // Async update customer data (fire and forget to not block order flow)
    upsertCustomerFromOrder(orderData.cliente, orderData.total).catch(err =>
        console.error('Error updating customer data:', err)
    );

    // Auto-mark any matching abandoned cart as recovered
    autoRecoverMatchingAbandonedCarts(orderData.cliente, docRef.id).catch(err =>
        console.warn('Error auto-recovering abandoned cart on order creation:', err)
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

    // Registrar en bitácora de auditoría ISO 9001
    try {
        const { recordAuditLog } = await import('./audit-service');
        await recordAuditLog({
            userId: userContext?.email || 'sistema',
            userEmail: userContext?.email || 'sistema@biocambio360.com',
            userName: userContext?.nombre || 'Gestor / Sistema',
            userRole: userContext?.role || 'logistico',
            modulo: 'pedidos',
            accion: 'cambio_estado',
            entidad: 'pedido',
            entidadId: orderId,
            descripcion: `Pedido #${orderId.slice(-8)} cambió de '${previousStatus}' a '${newStatus}'`,
            detalles: {
                estadoAnterior: previousStatus,
                nuevoEstado: newStatus,
                nota: note || null,
                cliente: order.cliente?.nombre || 'Desconocido',
                total: order.total || 0
            }
        });
    } catch (auditErr) {
        console.warn('[Orders] No se pudo asentar audit log:', auditErr);
    }

    // Actualizar estado de fidelización / referido si esta orden tenía transacción vinculada
    try {
        const { updateReferralTransactionOnOrderStatusChange, renewReferralExpiration } = await import('./referrals-service');
        await updateReferralTransactionOnOrderStatusChange(orderId, newStatus);

        // Si la orden se entrega, renovar el contador de 60 días del cliente si es embajador
        if (newStatus === 'entregado' && order.cliente?.celular) {
            await renewReferralExpiration(order.cliente.celular);
        }
    } catch (refErr) {
        console.warn('[Orders] Error al sincronizar recompensa de referido:', refErr);
    }
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

export interface SubscribeOrdersOptions {
    statusFilter?: OrderStatus[];
    limitCount?: number;
}

/**
 * Subscribe to orders in real-time with optional status filtering and document limit
 */
export function subscribeToOrders(
    callback: (orders: (Order & { id: string })[]) => void,
    optionsOrStatusFilter?: OrderStatus[] | SubscribeOrdersOptions
) {
    let statusFilter: OrderStatus[] | undefined;
    let limitCount: number | undefined;

    if (Array.isArray(optionsOrStatusFilter)) {
        statusFilter = optionsOrStatusFilter;
    } else if (optionsOrStatusFilter && typeof optionsOrStatusFilter === 'object') {
        statusFilter = optionsOrStatusFilter.statusFilter;
        limitCount = optionsOrStatusFilter.limitCount;
    }

    const constraints: any[] = [];
    if (statusFilter && statusFilter.length > 0) {
        constraints.push(where('status', 'in', statusFilter));
    }
    constraints.push(orderBy('createdAt', 'desc'));
    if (limitCount && limitCount > 0) {
        constraints.push(limit(limitCount));
    }

    const q = query(ordersCollection, ...constraints);

    return onSnapshot(q, (snapshot) => {
        const orders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as (Order & { id: string })[];

        callback(orders);
    });
}

/**
 * Search orders remotely by ID, customer phone, or customer name in Firestore
 */
export async function searchOrdersRemotely(term: string): Promise<(Order & { id: string })[]> {
    const cleanTerm = term.trim();
    if (!cleanTerm) return [];

    const resultsMap = new Map<string, Order & { id: string }>();

    // 1. Direct document ID lookup
    try {
        const docRef = doc(db, 'orders', cleanTerm);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            resultsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as any);
        }
    } catch {}

    // 2. Search by exact phone digits
    const cleanPhone = cleanTerm.replace(/\D/g, '');
    if (cleanPhone.length >= 7) {
        try {
            const qPhone = query(ordersCollection, where('cliente.celular', '==', cleanPhone), limit(25));
            const snap = await getDocs(qPhone);
            snap.forEach(d => resultsMap.set(d.id, { id: d.id, ...d.data() } as any));
        } catch {}
    }

    return Array.from(resultsMap.values());
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

/**
 * Busca datos de un cliente previo por su número celular o WhatsApp (<50ms).
 * Primero en 'customers/{cleanPhone}' y como fallback en la última orden de 'orders'.
 */
export async function lookupCustomerByPhone(phone: string): Promise<OrderCustomer | null> {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 7) return null;

    try {
        // 1. Consulta directa por ID de documento en customers
        const customerRef = doc(db, 'customers', cleanPhone);
        const customerSnap = await getDoc(customerRef);

        if (customerSnap.exists()) {
            const data = customerSnap.data();
            return {
                nombre: data.nombre || '',
                cedula: data.cedula || '',
                celular: data.celular || cleanPhone,
                email: data.email || '',
                departamento: data.departamento || 'Cundinamarca',
                ciudad: data.ciudad || 'Bogotá D.C.',
                direccion: data.direccion || '',
                barrio: data.barrio || ''
            };
        }

        // 2. Fallback: buscar la orden más reciente con ese teléfono
        const q = query(
            ordersCollection,
            where('cliente.celular', '==', cleanPhone),
            limit(5)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
            // Tomar la orden más reciente
            const sortedDocs = snap.docs.sort((a, b) => {
                const ta = a.data().createdAt?.toMillis?.() || 0;
                const tb = b.data().createdAt?.toMillis?.() || 0;
                return tb - ta;
            });
            const lastOrder = sortedDocs[0].data() as Order;
            if (lastOrder.cliente) {
                return {
                    nombre: lastOrder.cliente.nombre || '',
                    cedula: lastOrder.cliente.cedula || '',
                    celular: lastOrder.cliente.celular || cleanPhone,
                    email: lastOrder.cliente.email || '',
                    departamento: lastOrder.cliente.departamento || 'Cundinamarca',
                    ciudad: lastOrder.cliente.ciudad || 'Bogotá D.C.',
                    direccion: lastOrder.cliente.direccion || '',
                    barrio: lastOrder.cliente.barrio || ''
                };
            }
        }
    } catch (e) {
        console.warn('[OrdersService] Error en lookupCustomerByPhone:', e);
    }

    return null;
}

/**
 * Obtiene los pedidos asignados a un asesor comercial para un mes específico (o el mes actual).
 */
export async function getOrdersByAdvisor(
    advisorName: string,
    monthDate: Date = new Date()
): Promise<(Order & { id: string })[]> {
    try {
        const q = query(
            ordersCollection,
            where('asesorNombre', '==', advisorName),
            limit(300)
        );
        const snap = await getDocs(q);

        const targetYear = monthDate.getFullYear();
        const targetMonth = monthDate.getMonth();

        const orders = snap.docs
            .map(d => ({ id: d.id, ...d.data() } as Order & { id: string }))
            .filter(ord => {
                if (ord.status === 'cancelado') return false;
                const ts = ord.createdAt?.toMillis?.() ? new Date(ord.createdAt.toMillis()) : null;
                if (!ts) return true;
                return ts.getFullYear() === targetYear && ts.getMonth() === targetMonth;
            });

        return orders.sort((a, b) => {
            const ta = a.createdAt?.toMillis?.() || 0;
            const tb = b.createdAt?.toMillis?.() || 0;
            return tb - ta;
        });
    } catch (e) {
        console.warn(`[OrdersService] Error obteniendo órdenes del asesor ${advisorName}:`, e);
        return [];
    }
}
