/**
 * POST /api/admin/delivery-alerts/bulk-send
 * Envío manual, con selección múltiple, de la alerta "tu pedido se entrega mañana" -- el cron
 * diario (src/app/api/cron/delivery-alerts/route.ts) ya hace esto automáticamente a las 4pm, pero
 * un asesor puede necesitar reenviar antes, o solo a una parte de los pedidos de mañana.
 * Reutiliza exactamente la misma función de envío que el cron (sendDeliveryAlert) -- mismo
 * template, misma plantilla, mismo registro en bitácora/inbox -- para no duplicar esa lógica.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getAdminDB } from '@/lib/firebase-admin';
import { isEligibleForAlert, sendDeliveryAlert } from '@/lib/delivery-alerts';

export async function POST(req: NextRequest) {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json().catch(() => null);
    // Con pausa de 1.2s entre envíos (igual que el cron) + latencia real de red, 100 ítems tardarían
    // más de los 60s de maxDuration y la función se mataría a mitad de camino -- se tope a un
    // número que quepa con margen (25 * ~1.8s con latencia real ≈ 45s).
    const orderIds: string[] = Array.isArray(body?.orderIds) ? body.orderIds.slice(0, 25) : [];
    const dryRun = !!body?.dryRun;
    if (orderIds.length === 0) {
        return NextResponse.json({ error: 'orderIds es requerido.' }, { status: 400 });
    }

    const db = getAdminDB();
    const refs = orderIds.map((id) => db.collection('orders').doc(id));
    const snaps = await db.getAll(...refs);

    if (dryRun) {
        const eligible: string[] = [];
        const skipped: Array<{ orderId: string; reason: string }> = [];
        snaps.forEach((snap, i) => {
            if (!snap.exists) { skipped.push({ orderId: orderIds[i], reason: 'Pedido no encontrado' }); return; }
            const reason = isEligibleForAlert(snap.data()!);
            if (reason) skipped.push({ orderId: orderIds[i], reason });
            else eligible.push(orderIds[i]);
        });
        return NextResponse.json({ dryRun: true, total: orderIds.length, eligible: eligible.length, skipped });
    }

    let sent = 0, failed = 0, skipped = 0;
    const details: Array<{ orderId: string; ok: boolean; reason?: string }> = [];
    for (let i = 0; i < snaps.length; i++) {
        const snap = snaps[i];
        if (!snap.exists) { skipped++; details.push({ orderId: orderIds[i], ok: false, reason: 'Pedido no encontrado' }); continue; }
        const result = await sendDeliveryAlert(snap.id, snap.data()!);
        if (result.ok) { sent++; details.push({ orderId: snap.id, ok: true }); }
        else if (result.error) { failed++; details.push({ orderId: snap.id, ok: false, reason: result.error }); }
        else { skipped++; details.push({ orderId: snap.id, ok: false, reason: result.skipped }); }
        await new Promise((r) => setTimeout(r, 1200)); // mismo ritmo que el cron, bajo el límite de envío de Meta
    }

    await db.collection('bulk_alert_logs').add({
        kind: 'delivery_alert',
        sentBy: auth.email,
        total: orderIds.length,
        sent,
        failed,
        skipped,
        createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, total: orderIds.length, sent, failed, skipped, details });
}
