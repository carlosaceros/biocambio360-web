/**
 * GET /api/admin/ads-performance?since=YYYY-MM-DD&until=YYYY-MM-DD
 * Gasto real en Meta Ads vs. ingreso real atribuido por campaña (ROAS, ROI). Solo director/superadmin:
 * es información financiera sensible.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { getAdsPerformanceReport } from '@/lib/meta-ads-service';

export async function GET(req: NextRequest) {
    const user = await requireRole(req, ['superadmin', 'director']);
    if (user instanceof NextResponse) return user;

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
