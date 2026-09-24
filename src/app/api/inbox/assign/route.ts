/**
 * API Route: POST /api/inbox/assign
 * Manual lead assignment by coordinators/superadmins.
 * Also exposes GET to retrieve advisor workloads.
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import {
    manualAssignConversation,
    getAdvisorWorkloads,
    autoAssignConversation,
} from '@/lib/lead-assignment-service';

/** GET /api/inbox/assign — returns advisor workload stats */
export async function GET(req: NextRequest) {
    const authorization = req.headers.get('Authorization') ?? '';
    const idToken = authorization.replace('Bearer ', '');
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        await getAdminAuth().verifyIdToken(idToken);
    } catch {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    try {
        const workloads = await getAdvisorWorkloads();
        return NextResponse.json({ workloads });
    } catch (err) {
        console.error('[inbox/assign] Failed to load advisor workloads:', err);
        return NextResponse.json({ workloads: [], error: 'Workloads unavailable' }, { status: 503 });
    }
}

/** POST /api/inbox/assign — manual or auto assignment */
export async function POST(req: NextRequest) {
    const authorization = req.headers.get('Authorization') ?? '';
    const idToken = authorization.replace('Bearer ', '');
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let decoded: { uid: string };
    try {
        decoded = await getAdminAuth().verifyIdToken(idToken);
    } catch {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const { conversationId, advisorUid, contactPhone, mode } = body;

    if (!conversationId) {
        return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    if (mode === 'auto') {
        if (!contactPhone) {
            return NextResponse.json({ error: 'contactPhone required for auto mode' }, { status: 400 });
        }
        const result = await autoAssignConversation(conversationId, contactPhone);
        return NextResponse.json(result);
    }

    // Manual assignment
    if (!advisorUid) {
        return NextResponse.json({ error: 'advisorUid is required for manual assignment' }, { status: 400 });
    }

    await manualAssignConversation(conversationId, advisorUid, decoded.uid);
    return NextResponse.json({ success: true });
}
