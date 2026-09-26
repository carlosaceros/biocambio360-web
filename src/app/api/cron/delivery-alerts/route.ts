/**
 * Cron (daily, 4 p.m. Bogotá): WhatsApp alert to every customer whose order is scheduled for tomorrow.
 * Only runs when enabled in bot_config/delivery_alerts (toggle in the Asesores > Entregas tab).
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebase-admin';
import { bogotaDate, isDeliveryAlertEnabled, sendDeliveryAlert } from '@/lib/delivery-alerts';

export async function GET(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = (req.headers.get('user-agent') ?? '').startsWith('vercel-cron');
    const hasSecret = !!cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`;
    if (!isVercelCron && !hasSecret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!(await isDeliveryAlertEnabled())) return NextResponse.json({ skipped: 'delivery alerts disabled' });

    const date = bogotaDate(1);
    const snap = await getAdminDB().collection('orders').where('fechaProgramadaEntrega', '==', date).get();
    const stats = { date, orders: snap.size, sent: 0, skipped: 0, failed: 0 };

    for (const doc of snap.docs) {
        const result = await sendDeliveryAlert(doc.id, doc.data());
        if (result.ok) stats.sent++;
        else if (result.error) {
            stats.failed++;
            console.warn(`[cron/delivery-alerts] ${doc.id}: ${result.error}`);
        } else stats.skipped++;
        await new Promise(r => setTimeout(r, 1200)); // stay well under the sending rate limit
    }

    console.log('[cron/delivery-alerts]', JSON.stringify(stats));
    return NextResponse.json(stats);
}
