/**
 * GET /api/admin/kommo-preview?tab=matched|unmatched&pageSize=50&cursor=<kommoContactIdNum>
 * Lee paginado (cursor por kommoContactIdNum) las colecciones de staging que vuelca
 * `scripts/kommo-migrate-tags.ts --dump-preview`: kommo_migration_preview_matched /
 * _unmatched. Es de solo lectura — nunca toca `customers`. Solo superadmin: expone
 * teléfonos y datos de clientes reales.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDB } from '@/lib/firebase-admin';

const ROOT_ACCOUNT_EMAIL = 'thinktic.thinktic@gmail.com';

export async function GET(req: NextRequest) {
    const authorization = req.headers.get('Authorization') ?? '';
    const idToken = authorization.replace('Bearer ', '');
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let decoded: { uid: string; email?: string };
    try {
        decoded = await getAdminAuth().verifyIdToken(idToken);
    } catch {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const email = (decoded.email || '').toLowerCase();
    let isSuperAdmin = email === ROOT_ACCOUNT_EMAIL;
    try {
        const snap = await getAdminDB().collection('admin_users').doc(email).get();
        isSuperAdmin = isSuperAdmin || (snap.exists && snap.data()?.rol === 'superadmin');
    } catch {
        // si falla, se mantiene lo ya resuelto arriba
    }
    if (!isSuperAdmin) {
        return NextResponse.json({ error: 'No tienes permiso para ver esta revisión' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const tab = searchParams.get('tab') === 'unmatched' ? 'unmatched' : 'matched';
    const pageSize = Math.min(Math.max(Number(searchParams.get('pageSize')) || 50, 10), 200);
    const cursorParam = searchParams.get('cursor');
    const cursor = cursorParam ? Number(cursorParam) : null;
    const search = (searchParams.get('search') || '').trim();

    try {
        const db = getAdminDB();
        const collectionName = tab === 'matched' ? 'kommo_migration_preview_matched' : 'kommo_migration_preview_unmatched';

        let query: FirebaseFirestore.Query = db.collection(collectionName).orderBy('kommoContactIdNum');

        // Búsqueda simple por celular exacto (dígitos) — evita traer todo para filtrar en el cliente.
        const searchDigits = search.replace(/\D/g, '');
        if (searchDigits.length >= 6) {
            query = db.collection(collectionName).where('celular', '==', searchDigits).orderBy('kommoContactIdNum');
        } else if (cursor !== null) {
            query = query.startAfter(cursor);
        }

        const snap = await query.limit(pageSize).get();
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const last = snap.docs[snap.docs.length - 1];
        const nextCursor = last ? (last.data().kommoContactIdNum ?? null) : null;

        const metaSnap = await db.collection('kommo_migration_preview_meta').doc('summary').get();
        const meta = metaSnap.exists ? metaSnap.data() : null;

        return NextResponse.json({
            items,
            nextCursor,
            hasMore: snap.docs.length === pageSize && !searchDigits,
            meta,
        });
    } catch (err) {
        console.error('[api/admin/kommo-preview] Error:', err instanceof Error ? err.message : err);
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Error leyendo la revisión' }, { status: 500 });
    }
}
