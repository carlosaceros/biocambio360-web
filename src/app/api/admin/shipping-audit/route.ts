/**
 * GET  /api/admin/shipping-audit  → últimos N logs
 * DELETE /api/admin/shipping-audit  → limpiar logs viejos
 */
import { NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebase-admin';

const LOGS_COLLECTION = 'shipping_audit_logs';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200);
        const db = getAdminDB();

        const snap = await db
            .collection(LOGS_COLLECTION)
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();

        const logs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json({ logs, total: logs.length });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        const db = getAdminDB();
        // Eliminar logs con más de 7 días
        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const snap = await db
            .collection(LOGS_COLLECTION)
            .where('timestamp', '<', cutoff.toISOString())
            .get();

        const batch = db.batch();
        snap.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();

        return NextResponse.json({ deleted: snap.size });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
