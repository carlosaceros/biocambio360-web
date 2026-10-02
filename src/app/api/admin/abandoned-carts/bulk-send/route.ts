/**
 * POST /api/admin/abandoned-carts/bulk-send
 * Envío manual, con selección múltiple, del recordatorio de carrito abandonado. El cron ya envía
 * esto automáticamente en pasos (2h/8h/24h), pero un asesor puede querer reenviar a propósito a un
 * grupo puntual (ej. un carrito de alto valor que quiere empujar ya). Reutiliza sendCartWhatsapp --
 * mismo template aprobado, misma plantilla de componentes, mismo registro en el inbox.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getAdminDB } from '@/lib/firebase-admin';
import { sendCartWhatsapp } from '@/lib/abandoned-cart-whatsapp';
import { CART_TEMPLATE_DEFAULT } from '@/lib/abandoned-cart-config';
import { isOptedOut } from '@/lib/wa-optout';
import { toWhatsappId } from '@/lib/abandoned-cart-config';

export async function POST(req: NextRequest) {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json().catch(() => null);
    // Con pausa de 1.2s entre envíos + latencia real de red, 100 ítems tardarían más de los 60s de
    // maxDuration y la función se mataría a mitad de camino -- se tope a un número que quepa con
    // margen (25 * ~1.8s con latencia real ≈ 45s).
    const cartTokens: string[] = Array.isArray(body?.cartTokens) ? body.cartTokens.slice(0, 25) : [];
    const dryRun = !!body?.dryRun;
    if (cartTokens.length === 0) {
        return NextResponse.json({ error: 'cartTokens es requerido.' }, { status: 400 });
    }

    const db = getAdminDB();
    const refs = cartTokens.map((t) => db.collection('abandoned_carts').doc(t));
    const snaps = await db.getAll(...refs);

    if (dryRun) {
        const eligible: string[] = [];
        const skipped: Array<{ cartToken: string; reason: string }> = [];
        for (let i = 0; i < snaps.length; i++) {
            const snap = snaps[i];
            if (!snap.exists) { skipped.push({ cartToken: cartTokens[i], reason: 'Carrito no encontrado' }); continue; }
            const data = snap.data()!;
            if (data.status === 'recovered') { skipped.push({ cartToken: cartTokens[i], reason: 'Ya recuperado' }); continue; }
            const to = toWhatsappId(data.customerPhone);
            if (!to) { skipped.push({ cartToken: cartTokens[i], reason: 'Sin celular válido' }); continue; }
            if (await isOptedOut(to)) { skipped.push({ cartToken: cartTokens[i], reason: 'El cliente pidió no recibir promociones' }); continue; }
            eligible.push(cartTokens[i]);
        }
        return NextResponse.json({ dryRun: true, total: cartTokens.length, eligible: eligible.length, skipped });
    }

    let sent = 0, failed = 0, skipped = 0;
    const details: Array<{ cartToken: string; ok: boolean; reason?: string }> = [];
    for (let i = 0; i < snaps.length; i++) {
        const snap = snaps[i];
        if (!snap.exists) { skipped++; details.push({ cartToken: cartTokens[i], ok: false, reason: 'Carrito no encontrado' }); continue; }
        const data = snap.data()!;
        // A diferencia de sendDeliveryAlert (que ya re-valida elegibilidad internamente),
        // sendCartWhatsapp NO chequea status -- hay que hacerlo aquí para no reenviar a un
        // carrito que se recuperó entre que el asesor lo seleccionó y le dio enviar.
        if (data.status === 'recovered') { skipped++; details.push({ cartToken: snap.id, ok: false, reason: 'Ya recuperado' }); continue; }
        const result = await sendCartWhatsapp(
            { cartToken: snap.id, customerName: data.customerName, customerPhone: data.customerPhone, items: data.items || [], total: data.total || 0 },
            data.notificationCount || 0,
            CART_TEMPLATE_DEFAULT
        );
        if (result.ok) { sent++; details.push({ cartToken: snap.id, ok: true }); }
        else if (result.error) { failed++; details.push({ cartToken: snap.id, ok: false, reason: result.error }); }
        else { skipped++; details.push({ cartToken: snap.id, ok: false, reason: result.skipped }); }
        await new Promise((r) => setTimeout(r, 1200));
    }

    await db.collection('bulk_alert_logs').add({
        kind: 'abandoned_cart',
        sentBy: auth.email,
        total: cartTokens.length,
        sent,
        failed,
        skipped,
        createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, total: cartTokens.length, sent, failed, skipped, details });
}
