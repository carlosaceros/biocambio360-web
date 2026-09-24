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
import { decrementStockForOrderItems, incrementStockForOrderItems } from './products-service';
import { recordAuditLog } from './audit-service';

import { Order, OrderStatus, TimelineEvent, OrderInternalNote, OrderCustomer, OrderDeliveryException } from '@/types/order';
import { normalizeDepartmentAndCity } from './checkout-utils';

// Collection reference
const ordersCollection = collection(db, 'orders');

/**
 * Safely convert a Firestore value to an array.
 * Firestore may serialize arrays as objects with numeric keys ({0: ..., 1: ...}).
 */
export function safeToArray<T = any>(value: any): T[] {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'object') {
        return Object.keys(value)
            .sort((a, b) => Number(a) - Number(b))
            .map(key => value[key])
            .filter(Boolean);
    }
    return [];
}

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

    // Normalizar departamento y ciudad para evitar discrepancias (p. ej. Bogotá -> Cundinamarca)
    if (orderData.cliente) {
        const normGeo = normalizeDepartmentAndCity(orderData.cliente.departamento, orderData.cliente.ciudad);
        orderData.cliente.departamento = normGeo.departamento;
        orderData.cliente.ciudad = normGeo.ciudad;
    }

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

    const safeOrderProds = safeToArray(orderData.productos);

    // Descontar inventario automáticamente si la orden está activa (no cancelada y no borrador)
    if (orderData.status !== 'cancelado' && orderData.status !== 'borrador' && safeOrderProds.length > 0) {
        decrementStockForOrderItems(safeOrderProds).catch(err =>
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
                itemsCount: safeOrderProds.length,
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

    const safeOrderProds = safeToArray(order.productos);

    // Descontar inventario si un borrador se convierte en pedido activo
    if (previousStatus === 'borrador' && newStatus !== 'cancelado' && newStatus !== 'borrador' && safeOrderProds.length > 0) {
        decrementStockForOrderItems(safeOrderProds).catch(err =>
            console.warn('[OrdersService] Error al descontar inventario tras reactivar borrador:', err)
        );
    }

    // Notificar al cliente y administradores por correo a través de la API del servidor (evita importar nodemailer en el cliente)
    if (typeof fetch !== 'undefined') {
        // Server-side callers (e.g. the 99 Envíos webhook) need an absolute URL: a relative fetch throws in Node
        const notifyBase = typeof window === 'undefined'
            ? (process.env.NEXT_PUBLIC_URL && !/localhost|127\.0\.0\.1/.test(process.env.NEXT_PUBLIC_URL)
                ? process.env.NEXT_PUBLIC_URL.replace(/\/$/, '')
                : 'https://biocambio360.com')
            : '';
        fetch(`${notifyBase}/api/notifications/order-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orderId,
                cliente: order.cliente?.nombre || 'Cliente',
                customerEmail: order.cliente?.email,
                estadoAnterior: previousStatus,
                nuevoEstado: newStatus,
                total: order.total || 0,
                shippingCarrier: (order as any).shippingInfo?.carrier || (order as any).guiaEnvio?.transportadora,
                trackingNumber: (order as any).shippingInfo?.trackingNumber || (order as any).guiaEnvio?.numeroGuia,
                items: safeOrderProds.map(p => ({
                    nombre: p.product?.nombre || p.nombre || 'Producto Biocambio360',
                    cantidad: p.cantidad || 1
                }))
            })
        }).catch(err => console.warn('[OrdersService] Error llamando a /api/notifications/order-status:', err));
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
        const orders = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                productos: safeToArray(data.productos)
            };
        }) as (Order & { id: string })[];

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
            const data = docSnap.data();
            resultsMap.set(docSnap.id, {
                id: docSnap.id,
                ...data,
                productos: safeToArray(data.productos)
            } as any);
        }
    } catch {}

    // 2. Search by exact phone digits
    const cleanPhone = cleanTerm.replace(/\D/g, '');
    if (cleanPhone.length >= 7) {
        try {
            const qPhone = query(ordersCollection, where('cliente.celular', '==', cleanPhone), limit(25));
            const snap = await getDocs(qPhone);
            snap.forEach(d => {
                const data = d.data();
                resultsMap.set(d.id, {
                    id: d.id,
                    ...data,
                    productos: safeToArray(data.productos)
                } as any);
            });
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

    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            productos: safeToArray(data.productos)
        };
    }) as (Order & { id: string })[];
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

    const data = orderSnap.data();
    return {
        id: orderSnap.id,
        ...data,
        productos: safeToArray(data.productos)
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
            const normGeo = normalizeDepartmentAndCity(data.departamento, data.ciudad);
            return {
                nombre: data.nombre || '',
                cedula: data.cedula || '',
                celular: data.celular || cleanPhone,
                email: data.email || '',
                departamento: normGeo.departamento,
                ciudad: normGeo.ciudad,
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
                const normGeo = normalizeDepartmentAndCity(lastOrder.cliente.departamento, lastOrder.cliente.ciudad);
                return {
                    nombre: lastOrder.cliente.nombre || '',
                    cedula: lastOrder.cliente.cedula || '',
                    celular: lastOrder.cliente.celular || cleanPhone,
                    email: lastOrder.cliente.email || '',
                    departamento: normGeo.departamento,
                    ciudad: normGeo.ciudad,
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
        let q;
        if (!advisorName || advisorName === 'todos') {
            q = query(ordersCollection, limit(500));
        } else {
            q = query(
                ordersCollection,
                where('asesorNombre', '==', advisorName),
                limit(300)
            );
        }
        const snap = await getDocs(q);

        const targetYear = monthDate.getFullYear();
        const targetMonth = monthDate.getMonth();

        const orders = snap.docs
            .map(d => ({ id: d.id, ...d.data() } as Order & { id: string }))
            .filter(ord => {
                // ⚠️ REGLA CRÍTICA DE NEGOCIO: Un borrador (cotización) o pedido cancelado NUNCA es un pedido cerrado
                if (ord.status === 'cancelado' || ord.status === 'borrador') return false;
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

/**
 * Obtiene las órdenes en estado 'borrador' (cotizaciones calientes pendientes)
 */
export async function getDraftOrdersByAdvisor(advisorName?: string): Promise<(Order & { id: string })[]> {
    try {
        const q = query(
            ordersCollection,
            where('status', '==', 'borrador'),
            limit(100)
        );
        const snapshot = await getDocs(q);
        const drafts = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                productos: safeToArray(data.productos)
            };
        }) as (Order & { id: string })[];

        const sorted = drafts.sort((a, b) => {
            const ta = (a.createdAt as any)?.toMillis ? (a.createdAt as any).toMillis() : 0;
            const tb = (b.createdAt as any)?.toMillis ? (b.createdAt as any).toMillis() : 0;
            return tb - ta;
        });

        if (!advisorName || advisorName === 'superadmin' || advisorName === 'admin') {
            return sorted;
        }

        const cleanAdv = advisorName.toLowerCase().trim();
        return sorted.filter(d => 
            (d.asesorNombre && d.asesorNombre.toLowerCase().includes(cleanAdv)) ||
            (d.asesorId && d.asesorId.toLowerCase() === cleanAdv)
        );
    } catch (e) {
        console.warn('[OrdersService] Error al obtener borradores:', e);
        return [];
    }
}

/**
 * Descarta un borrador marcándolo como cancelado con nota de auditoría
 */
export async function discardDraftOrder(
    orderId: string,
    userContext?: { email?: string; nombre?: string; role?: string }
): Promise<void> {
    return updateOrderStatus(orderId, 'cancelado', 'Cotización/Borrador descartado por el asesor comercial', userContext);
}

/**
 * Parámetros para procesar la resolución de una novedad contraentrega
 */
export interface ProcessDeliveryExceptionParams {
    orderId: string;
    resolucion: 'reintento_programado' | 'devuelto_bodega' | 'perdido_transportadora';
    motivo: OrderDeliveryException['motivo'];
    motivoDetalle?: string;
    fechaReintentoProgramada?: string; // YYYY-MM-DD
    franjaHoraria?: 'manana' | 'tarde' | 'todo_el_dia';
    tarifaEspecialReintento?: number; // COP adicional al flete (puede ser 0)
    transportadoraReintento?: string;
    nuevaDireccion?: string;
    nuevoBarrio?: string;
    nuevoTelefono?: string;
    notasSeguimiento?: string;
    radicadoSiniestro?: string;
    montoReclamado?: number;
    userContext?: { email?: string; nombre?: string; role?: string };
}

/**
 * Marca un pedido como no entregado (novedad logística contraentrega)
 */
export async function markOrderAsFailedDelivery(
    orderId: string,
    motivo: OrderDeliveryException['motivo'],
    motivoDetalle?: string,
    userContext?: { email?: string; nombre?: string; role?: string }
): Promise<void> {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) throw new Error('Order not found');

    const order = orderSnap.data() as Order;
    const nowIso = new Date().toISOString();

    const previousException = order.novedadEntrega;
    const intentos = (previousException?.intentosPrevios || 0) + 1;

    const novedad: OrderDeliveryException = {
        motivo,
        motivoDetalle: motivoDetalle || 'Entrega no lograda en el primer intento',
        fechaNovedad: nowIso,
        intentosPrevios: intentos,
        gestorResponsable: userContext?.nombre || 'Gestor Logístico',
        gestorEmail: userContext?.email || 'logistica@biocambio360.com',
        fleteAnterior: order.envio || 0
    };

    const note = `⚠️ Novedad en entrega (${intentos}° intento fallido). Motivo: ${motivo}. ${motivoDetalle || ''}`;

    await updateDoc(orderRef, {
        novedadEntrega: removeUndefined(novedad)
    });

    await updateOrderStatus(orderId, 'no_entregado', note, userContext);
}

/**
 * Procesa el tratamiento especial de un pedido con novedad contraentrega:
 * - reintento_programado: ajusta flete (tarifa especial), actualiza dirección/fecha, pasa a 'preparacion' o 'en_camino'
 * - devuelto_bodega: pasa a 'cancelado' y restituye stock a bodega
 * - perdido_transportadora: pasa a 'cancelado' SIN restituir stock (siniestro transportadora)
 */
export async function processDeliveryException(params: ProcessDeliveryExceptionParams): Promise<void> {
    const {
        orderId,
        resolucion,
        motivo,
        motivoDetalle,
        fechaReintentoProgramada,
        franjaHoraria,
        tarifaEspecialReintento = 0,
        transportadoraReintento,
        nuevaDireccion,
        nuevoBarrio,
        nuevoTelefono,
        notasSeguimiento,
        radicadoSiniestro,
        montoReclamado,
        userContext
    } = params;

    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) throw new Error('Order not found');

    const order = orderSnap.data() as Order;
    const nowIso = new Date().toISOString();

    if (resolucion === 'reintento_programado') {
        const nuevoFlete = (order.envio || 0) + Math.max(0, tarifaEspecialReintento);
        const nuevoTotal = (order.total || 0) + Math.max(0, tarifaEspecialReintento);

        const updatedCustomer: OrderCustomer = {
            ...order.cliente,
            direccion: nuevaDireccion?.trim() ? nuevaDireccion.trim() : order.cliente.direccion,
            barrio: nuevoBarrio?.trim() ? nuevoBarrio.trim() : order.cliente.barrio,
            celular: nuevoTelefono?.trim() ? nuevoTelefono.trim() : order.cliente.celular
        };

        const novedadUpdate: OrderDeliveryException = {
            ...(order.novedadEntrega || { fechaNovedad: nowIso, intentosPrevios: 1 }),
            motivo,
            motivoDetalle,
            resolucion: 'reintento_programado',
            fechaReintentoProgramada,
            franjaHoraria: franjaHoraria || 'todo_el_dia',
            tarifaEspecialReintento,
            fleteAnterior: order.envio || 0,
            transportadoraReintento: transportadoraReintento || (order as any).shippingInfo?.carrier || 'Flota Propia Biocambio360',
            nuevaDireccion: nuevaDireccion?.trim() || undefined,
            nuevoBarrio: nuevoBarrio?.trim() || undefined,
            nuevoTelefono: nuevoTelefono?.trim() || undefined,
            gestorResponsable: userContext?.nombre || 'Asesor Comercial',
            gestorEmail: userContext?.email,
            notasSeguimiento
        };

        const updatePayload: Record<string, any> = {
            cliente: removeUndefined(updatedCustomer),
            envio: nuevoFlete,
            total: nuevoTotal,
            novedadEntrega: removeUndefined(novedadUpdate),
            updatedAt: Timestamp.now()
        };

        if (transportadoraReintento) {
            updatePayload.guiaTransportadora = transportadoraReintento.includes('Flota')
                ? `FLOTA-${orderId.slice(-6).toUpperCase()}`
                : (order.guiaTransportadora || 'REINTENTO');
        }

        await updateDoc(orderRef, updatePayload);

        const noteText = `🔄 Reintento contraentrega programado para ${fechaReintentoProgramada || 'próxima fecha'}. ` +
            `Tarifa especial adicional: $${tarifaEspecialReintento.toLocaleString('es-CO')}. ` +
            `Transportadora: ${transportadoraReintento || 'Coordinada'}. ` +
            (notasSeguimiento ? `Detalle: ${notasSeguimiento}` : '');

        // Pasa a 'preparacion' para que bodega vuelva a despachar o a 'en_camino'
        await updateOrderStatus(orderId, 'preparacion', noteText, userContext);

    } else if (resolucion === 'devuelto_bodega') {
        const novedadUpdate: OrderDeliveryException = {
            ...(order.novedadEntrega || { fechaNovedad: nowIso, intentosPrevios: 1 }),
            motivo,
            motivoDetalle,
            resolucion: 'devuelto_bodega',
            gestorResponsable: userContext?.nombre || 'Gestor Logístico',
            gestorEmail: userContext?.email,
            notasSeguimiento: notasSeguimiento || 'Mercancía devuelta físicamente a bodega central. Inventario restituido.'
        };

        await updateDoc(orderRef, {
            novedadEntrega: removeUndefined(novedadUpdate),
            updatedAt: Timestamp.now()
        });

        // Restituir existencias a bodega
        const safeOrderProds = safeToArray(order.productos);
        if (safeOrderProds.length > 0) {
            await incrementStockForOrderItems(safeOrderProds);
        }

        const noteText = `📦 Mercancía devuelta a bodega tras no entrega contraentrega (${motivo}). Stock restituido satisfactoriamente.`;
        await updateOrderStatus(orderId, 'cancelado', noteText, userContext);

    } else if (resolucion === 'perdido_transportadora') {
        const novedadUpdate: OrderDeliveryException = {
            ...(order.novedadEntrega || { fechaNovedad: nowIso, intentosPrevios: 1 }),
            motivo: 'perdido_transportadora',
            motivoDetalle: motivoDetalle || 'Paquete extraviado, hurtado o siniestrado en manos de la transportadora',
            resolucion: 'perdido_transportadora',
            gestorResponsable: userContext?.nombre || 'Gestor Logístico',
            gestorEmail: userContext?.email,
            notasSeguimiento,
            reclamacionSeguroTransportadora: {
                radicado: radicadoSiniestro || `REC-${Date.now().toString().slice(-6)}`,
                montoReclamado: montoReclamado || order.total || 0,
                estado: 'pendiente'
            }
        };

        await updateDoc(orderRef, {
            novedadEntrega: removeUndefined(novedadUpdate),
            updatedAt: Timestamp.now()
        });

        // IMPORTANTE: NO restituir stock porque el producto se perdió físicamente
        const noteText = `🚨 SINIESTRO / PÉRDIDA EN TRANSPORTADORA. Radicado seguro: ${radicadoSiniestro || 'Pendiente'}. ` +
            `Monto reclamado: $${(montoReclamado || order.total || 0).toLocaleString('es-CO')}. Mercancía NO disponible.`;
        await updateOrderStatus(orderId, 'cancelado', noteText, userContext);
    }
}

/**
 * Obtiene pedidos en novedad o no entregados (para cockpit de asesor o logística)
 */
export async function getFailedDeliveryOrders(advisorName?: string): Promise<(Order & { id: string })[]> {
    try {
        const q = query(
            ordersCollection,
            where('status', '==', 'no_entregado'),
            limit(100)
        );
        const snapshot = await getDocs(q);
        const orders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as (Order & { id: string })[];

        const sorted = orders.sort((a, b) => {
            const ta = (a.updatedAt as any)?.toMillis ? (a.updatedAt as any).toMillis() : 0;
            const tb = (b.updatedAt as any)?.toMillis ? (b.updatedAt as any).toMillis() : 0;
            return tb - ta;
        });

        if (!advisorName || advisorName === 'superadmin' || advisorName === 'admin') {
            return sorted;
        }

        const cleanAdv = advisorName.toLowerCase().trim();
        return sorted.filter(d =>
            (d.asesorNombre && d.asesorNombre.toLowerCase().includes(cleanAdv)) ||
            (d.asesorId && d.asesorId.toLowerCase() === cleanAdv)
        );
    } catch (e) {
        console.warn('[OrdersService] Error al obtener pedidos no entregados:', e);
        return [];
    }
}
