/**
 * Pre-built cart for the replenishment reminder: the "Pedir en la web" button of the WhatsApp template
 * opens /checkout?recovery_token=<token>, the same mechanism as the abandoned-cart emails, so the
 * customer lands with the last order's products and their data already filled in.
 */

import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDB } from '@/lib/firebase-admin';
import { adminGetAllProducts } from '@/lib/products-admin';
import { isDisallowedSize } from '@/lib/products';

export const FALLBACK_BUTTON_TOKEN = 'inicio';

interface ReminderCustomer {
    name?: string;
    email?: string;
    phone?: string;
    city?: string;
    lastOrderId?: string;
}

/** Creates the cart and returns its token, or null when the last order can't be rebuilt. */
export async function createReminderCart(customer: ReminderCustomer): Promise<string | null> {
    try {
        if (!customer.lastOrderId) return null;
        const db = getAdminDB();
        const snap = await db.collection('orders').doc(customer.lastOrderId).get();
        if (!snap.exists) return null;
        const order = snap.data() as Record<string, any>;

        const raw = order.productos || order.items || [];
        const list: any[] = Array.isArray(raw) ? raw : Object.values(raw ?? {});

        let live: Awaited<ReturnType<typeof adminGetAllProducts>> = [];
        try {
            live = await adminGetAllProducts();
        } catch {
            /* keep the prices of the original order */
        }

        const items = list
            .map(i => {
                const id = String(i.product?.id ?? i.id ?? '');
                const size = String(i.size ?? i.presentacionSeleccionada ?? '');
                const product = live.find(p => p.id === id);
                const current = Number(product?.precios?.[size]);
                const price = current > 0 ? current : Number(i.price ?? 0);
                return {
                    id,
                    nombre: String(i.product?.nombre ?? i.nombre ?? product?.nombre ?? ''),
                    size,
                    cantidad: Math.max(1, Number(i.cantidad ?? 1)),
                    price,
                    imgFile: String(i.product?.imgFile ?? i.imgFile ?? product?.imgFile ?? ''),
                };
            })
            .filter(i => i.id && i.nombre && i.size && !isDisallowedSize(i.size) && i.price > 0);
        if (items.length === 0) return null;

        const cliente = order.cliente || order.shippingAddress || {};
        const subtotal = items.reduce((s, i) => s + i.price * i.cantidad, 0);
        const token = `rem_${crypto.randomBytes(12).toString('base64url')}`;

        await db.collection('abandoned_carts').doc(token).set({
            cartToken: token,
            customerName: cliente.nombre || customer.name || '',
            customerEmail: cliente.email || customer.email || '',
            customerPhone: cliente.celular || customer.phone || '',
            customerCedula: /^\d{6,10}$/.test(String(cliente.cedula || '')) ? String(cliente.cedula) : '',
            ciudad: cliente.ciudad || customer.city || '',
            departamento: cliente.departamento || '',
            direccion: cliente.direccion || '',
            items,
            subtotal,
            shippingCost: 0,
            total: subtotal,
            // Not 'abandoned': the abandoned-cart email cron must not treat this cart as one
            status: 'reminder',
            source: 'replenishment_whatsapp',
            notificationCount: 3,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        return token;
    } catch (err) {
        console.warn('[reminder-cart] Could not build cart:', err instanceof Error ? err.message : err);
        return null;
    }
}
