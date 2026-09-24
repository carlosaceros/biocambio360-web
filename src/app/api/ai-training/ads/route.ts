/**
 * Ads seen in the inbox (Meta click-to-WhatsApp) and the team's configuration for each:
 * which catalog product it promotes and notes. The agent uses it to skip questions the ad answers
 * and focus on closing the sale. Directors and super admins only.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebase-admin';
import { requireTrainer } from '@/lib/ai-training-auth';
import { getCatalogNames } from '@/lib/ai-agent-knowledge';
import { cleanNote, signAdConfig, verifyAdConfig } from '@/lib/ai-agent-training';
import { leaksSensitive } from '@/lib/ai-agent-guard';

export async function GET(req: NextRequest) {
    const trainer = await requireTrainer(req);
    if (trainer instanceof NextResponse) return trainer;

    const snap = await getAdminDB().collection('ad_referrals').orderBy('lastSeenAt', 'desc').limit(100).get();
    const ads = snap.docs.map(d => {
        const x = d.data();
        return {
            id: d.id,
            headline: x.headline ?? '',
            body: x.body ?? '',
            sourceUrl: x.sourceUrl ?? '',
            mediaType: x.mediaType ?? '',
            conversations: x.conversations ?? 0,
            lastSeenAt: x.lastSeenAt ?? '',
            productName: verifyAdConfig(d.id, x) ? x.productName ?? '' : '',
            notes: verifyAdConfig(d.id, x) ? x.notes ?? '' : '',
        };
    });
    return NextResponse.json({ ads, catalog: await getCatalogNames() });
}

export async function PATCH(req: NextRequest) {
    const trainer = await requireTrainer(req);
    if (trainer instanceof NextResponse) return trainer;

    const body = await req.json().catch(() => ({}));
    const sourceId = String(body.sourceId ?? '');
    if (!sourceId) return NextResponse.json({ error: 'Falta el anuncio' }, { status: 400 });

    const productName = String(body.productName ?? '');
    if (productName && !(await getCatalogNames()).includes(productName)) {
        return NextResponse.json({ error: 'Producto no válido' }, { status: 400 });
    }
    const notes = cleanNote(body.notes);
    if (leaksSensitive(notes)) return NextResponse.json({ error: 'No incluyas correos, claves ni datos internos.' }, { status: 400 });

    await getAdminDB().collection('ad_referrals').doc(sourceId).set(
        { productName, notes, configSig: signAdConfig(sourceId, productName, notes), configuredBy: trainer.email, configuredAt: new Date().toISOString() },
        { merge: true }
    );
    return NextResponse.json({ ok: true });
}
