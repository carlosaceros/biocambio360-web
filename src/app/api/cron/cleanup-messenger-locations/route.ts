/**
 * Cron (diario): borra el historial de posiciones de mensajeros (messenger_location_history) más
 * viejo que RETENTION_DAYS. El GPS es dato sensible (Ley 1581, habeas data) -- se guarda el
 * recorrido del turno para poder revisarlo un par de días, no indefinidamente. `messenger_locations`
 * (última posición) NO se toca aquí: siempre se sobreescribe sola, no acumula.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebase-admin';

const RETENTION_DAYS = 3;

export async function GET(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = (req.headers.get('user-agent') ?? '').startsWith('vercel-cron');
    const hasSecret = !!cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`;
    if (!isVercelCron && !hasSecret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getAdminDB();
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000);
    const stats = { messengersChecked: 0, pingsDeleted: 0 };

    const messengersSnap = await db.collection('mensajeros').get();
    for (const messengerDoc of messengersSnap.docs) {
        stats.messengersChecked++;
        const pingsRef = db.collection('messenger_location_history').doc(messengerDoc.id).collection('pings');
        while (true) {
            const oldPings = await pingsRef.where('at', '<', cutoff).limit(400).get();
            if (oldPings.empty) break;
            const batch = db.batch();
            oldPings.docs.forEach((d) => batch.delete(d.ref));
            await batch.commit();
            stats.pingsDeleted += oldPings.size;
            if (oldPings.size < 400) break;
        }
    }

    console.log('[cron/cleanup-messenger-locations]', JSON.stringify(stats));
    return NextResponse.json(stats);
}
