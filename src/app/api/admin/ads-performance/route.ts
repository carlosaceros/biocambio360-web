/**
 * GET /api/admin/ads-performance?since=YYYY-MM-DD&until=YYYY-MM-DD
 * Gasto real en Meta Ads vs. ingreso real atribuido por campaña (ROAS, ROI). Solo director/superadmin:
 * es información financiera sensible.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDB } from '@/lib/firebase-admin';
import { getAdsPerformanceReport } from '@/lib/meta-ads-service';

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
    let allowed = email === 'thinktic.thinktic@gmail.com';
    try {
        const snap = await getAdminDB().collection('admin_users').doc(email).get();
        const rol = snap.data()?.rol;
        allowed = allowed || rol === 'superadmin' || rol === 'director';
    } catch {
        // si falla, se mantiene lo ya resuelto arriba
    }
    if (!allowed) return NextResponse.json({ error: 'No tienes permiso para ver este reporte' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const defaultUntil = now.toISOString().slice(0, 10);
    const defaultSince = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const since = searchParams.get('since') || defaultSince;
    const until = searchParams.get('until') || defaultUntil;

    try {
        const report = await getAdsPerformanceReport(since, until);
        return NextResponse.json(report);
    } catch (err) {
        console.error('[api/admin/ads-performance] Error:', err instanceof Error ? err.message : err);
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Error generando el reporte' }, { status: 502 });
    }
}
