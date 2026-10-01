import { NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebase-admin';
import { INITIAL_COUPONS } from '@/lib/coupons-service';
import type { Coupon } from '@/lib/coupon-types';

/**
 * Registra la redención de un cupón tras crear el pedido. Antes el checkout anónimo escribía
 * directamente en `coupons` vía SDK de cliente — eso exigía que la colección aceptara `create`/
 * `update` públicos en Firestore, lo que permitía forjar un cupón nuevo (ej. 100% de descuento)
 * sin pasar por el admin. Esta ruta usa el Admin SDK (no depende de las reglas de Firestore) para
 * que `coupons` pueda cerrarse a escritura solo-autenticada sin romper el checkout.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { code, orderId, customerEmail, customerPhone, discountAmount } = body;

        if (!code || !orderId) {
            return NextResponse.json({ ok: false, error: 'code y orderId son requeridos' }, { status: 400 });
        }

        const db = getAdminDB();
        const snapshot = await db.collection('coupons').get();

        const map = new Map<string, Coupon>();
        INITIAL_COUPONS.forEach((c) => map.set(c.code, c));
        snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Coupon;
            map.set(data.code, { ...data, id: docSnap.id });
        });

        const coupon = Array.from(map.values()).find((c) => c.code.toUpperCase() === String(code).toUpperCase());
        if (!coupon) {
            // Mismo comportamiento que el servicio anterior: si el código no existe, no hay nada que registrar.
            return NextResponse.json({ ok: true, recorded: false });
        }

        const newRedemptionsCount = (coupon.redemptionsCount || 0) + 1;
        const newUsageHistory = [
            ...(coupon.usageHistory || []),
            {
                orderId,
                customerEmail: customerEmail || 'sin-email@biocambio360.com',
                customerPhone: customerPhone || '',
                discountAmount: typeof discountAmount === 'number' ? discountAmount : 0,
                usedAt: new Date().toISOString(),
            },
        ];

        const { id, ...couponData } = coupon;
        await db.collection('coupons').doc(id).set(
            {
                ...couponData,
                redemptionsCount: newRedemptionsCount,
                usageHistory: newUsageHistory,
            },
            { merge: true }
        );

        return NextResponse.json({ ok: true, recorded: true });
    } catch (error) {
        console.error('[api/coupons/redeem] Error:', error);
        return NextResponse.json({ ok: false, error: 'No se pudo registrar la redención del cupón' }, { status: 500 });
    }
}
