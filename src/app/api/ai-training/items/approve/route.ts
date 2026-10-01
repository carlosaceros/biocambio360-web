/**
 * POST /api/ai-training/items/approve — Julian, Danilo o superadmin aprueban o rechazan una
 * propuesta de entrenamiento creada/editada por Fernando o Diego. Aprobar es lo único que puede
 * poner `active: true` en un item (re-firmado), que es lo que de verdad lee el agente
 * (ai-agent-training.ts → loadTrainingSnapshot). Rechazar lo deja inactivo con el motivo registrado.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebase-admin';
import { requireTrainingApprover } from '@/lib/ai-training-auth';
import { signItem, invalidateTrainingCache, type TrainingKind } from '@/lib/ai-agent-training';

const COLLECTION = 'ai_training';

export async function POST(req: NextRequest) {
    const approver = await requireTrainingApprover(req);
    if (approver instanceof NextResponse) return approver;

    const body = await req.json().catch(() => ({}));
    const id = String(body.id ?? '');
    const decision = body.decision === 'reject' ? 'reject' : body.decision === 'approve' ? 'approve' : null;
    if (!id || !decision) return NextResponse.json({ error: 'Faltan id o decision (approve|reject)' }, { status: 400 });

    const ref = getAdminDB().collection(COLLECTION).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: 'No existe' }, { status: 404 });
    const data = snap.data() ?? {};

    if (data.approvalStatus !== 'pending') {
        return NextResponse.json({ error: 'Este elemento no tiene una propuesta pendiente.' }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (decision === 'reject') {
        const item = {
            kind: data.kind as TrainingKind,
            text: data.text, customer: data.customer, ideal: data.ideal, badReply: data.badReply, note: data.note,
            active: false,
        };
        await ref.update({
            active: false,
            sig: signItem({ id, ...item }),
            approvalStatus: 'rejected',
            rejectedBy: approver.email,
            rejectedAt: now,
            rejectReason: typeof body.reason === 'string' ? body.reason.slice(0, 300) : '',
        });
        invalidateTrainingCache();
        return NextResponse.json({ ok: true, approvalStatus: 'rejected' });
    }

    const newActive = data.requestedActive !== false;
    const item = {
        kind: data.kind as TrainingKind,
        text: data.text, customer: data.customer, ideal: data.ideal, badReply: data.badReply, note: data.note,
        active: newActive,
    };
    await ref.update({
        active: newActive,
        sig: signItem({ id, ...item }),
        approvalStatus: 'approved',
        approvedBy: approver.email,
        approvedAt: now,
    });
    invalidateTrainingCache();
    return NextResponse.json({ ok: true, approvalStatus: 'approved', active: newActive });
}
