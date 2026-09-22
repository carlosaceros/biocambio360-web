/**
 * GET  /api/admin/shipping-audit  → últimos N logs (con fallback a buffer en memoria por cuota Spark)
 * DELETE /api/admin/shipping-audit  → limpiar logs viejos
 */
import { NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebase-admin';
import { getShippingAuditLogs } from '@/lib/shipping-audit-service';

const LOGS_COLLECTION = 'shipping_audit_logs';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200);

        const result = await getShippingAuditLogs(limit);
        return NextResponse.json(result);
    } catch (e: any) {
        console.error('[shipping-audit GET] Error:', e);
        return NextResponse.json({
            logs: [],
            total: 0,
            source: 'memory_fallback',
            error: e.message || 'Error al obtener logs de auditoría',
        }, { status: 200 }); // Retornar 200 para que el frontend no colapse
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
        console.warn('[shipping-audit DELETE] Advertencia:', e.message);
        return NextResponse.json({ deleted: 0, warning: e.message }, { status: 200 });
    }
}

