/** POST /api/admin/media-retention — applies the retention policy now (directors and super admins). */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { requireTrainer } from '@/lib/ai-training-auth';
import { applyRetention } from '@/lib/media-store';

export async function POST(req: NextRequest) {
    const user = await requireTrainer(req);
    if (user instanceof NextResponse) return user;
    return NextResponse.json(await applyRetention());
}
