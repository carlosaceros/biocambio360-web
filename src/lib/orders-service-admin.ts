import { FieldValue as AdminFieldValue, Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
import type { Timestamp } from 'firebase/firestore';
import { getAdminDB } from './firebase-admin';
import { applyOrderStatusSideEffects, buildOrderStatusUpdatePayload } from './orders-service';
import { Order, OrderStatus } from '@/types/order';

/**
 * Equivalente a updateOrderStatus() (orders-service.ts) pero vía Admin SDK -- para usar
 * EXCLUSIVAMENTE desde rutas de servidor de confianza (webhooks de Wompi/Addi/99 Envíos,
 * importación de reportes) que no tienen una sesión de Firebase Auth de navegador. El Admin SDK
 * no depende de las reglas de Firestore, así que esto permite que `orders.update` se restrinja a
 * solo-autenticado sin romper la confirmación real de pagos ni las actualizaciones de envío.
 *
 * Vive en un archivo separado de orders-service.ts a propósito: ese archivo lo importan
 * componentes de navegador (checkout/page.tsx), y un solo `import('firebase-admin/firestore')`
 * ahí -- aunque sea dinámico y nunca se ejecute en el cliente -- hace que el bundler intente
 * empaquetar dependencias de Node (`fs`, `child_process`) para el navegador y rompe el build.
 */
export async function updateOrderStatusAdmin(
    orderId: string,
    newStatus: OrderStatus,
    note?: string,
    userContext?: { email?: string; nombre?: string; role?: string }
): Promise<void> {
    const adminDb = getAdminDB();
    const orderRef = adminDb.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
        throw new Error('Order not found');
    }

    const order = orderSnap.data() as Order;
    const previousStatus = order.status;
    const now = AdminTimestamp.now();
    const nowIso = new Date().toISOString();

    const updatePayload = buildOrderStatusUpdatePayload(
        newStatus, previousStatus, note, userContext, now as unknown as Timestamp, nowIso,
        (...elements: unknown[]) => AdminFieldValue.arrayUnion(...elements)
    );
    await orderRef.update(updatePayload);

    await applyOrderStatusSideEffects(orderId, order, previousStatus, newStatus, note, userContext);
}
