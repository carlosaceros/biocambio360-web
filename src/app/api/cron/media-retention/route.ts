/** Cron (daily, 3 a.m. Bogotá): applies the media retention policy (archive or delete files older than N days). */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { applyRetention } from '@/lib/media-store';

export async function GET(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = (req.headers.get('user-agent') ?? '').startsWith('vercel-cron');
    const hasSecret = !!cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`;
    if (!isVercelCron && !hasSecret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const stats = await applyRetention();
    console.log('[cron/media-retention]', JSON.stringify(stats));
    return NextResponse.json(stats);
}
