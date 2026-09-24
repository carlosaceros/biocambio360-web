/**
 * Training rules and example conversations for the AI agent.
 * GET list · POST create · PATCH update · DELETE remove. Directors and super admins only.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebase-admin';
import { requireTrainer } from '@/lib/ai-training-auth';
import {
    LIMITS,
    signItem,
    verifyItem,
    validateTrainingInput,
    invalidateTrainingCache,
    type TrainingKind,
} from '@/lib/ai-agent-training';

const COLLECTION = 'ai_training';

export async function GET(req: NextRequest) {
    const trainer = await requireTrainer(req);
    if (trainer instanceof NextResponse) return trainer;

    const snap = await getAdminDB().collection(COLLECTION).orderBy('createdAt', 'desc').limit(400).get();
    const items = snap.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            kind: data.kind,
            text: data.text ?? '',
            customer: data.customer ?? '',
            ideal: data.ideal ?? '',
            badReply: data.badReply ?? '',
            note: data.note ?? '',
            active: !!data.active,
            createdBy: data.createdBy ?? '',
            createdAt: data.createdAt ?? '',
            verified: verifyItem(d.id, data), // false = tampered/unsigned: the agent ignores it
        };
    });
    return NextResponse.json({ items, limits: LIMITS });
}

export async function POST(req: NextRequest) {
    const trainer = await requireTrainer(req);
    if (trainer instanceof NextResponse) return trainer;

    const body = await req.json().catch(() => ({}));
    const kind = body.kind as TrainingKind;
    if (kind !== 'rule' && kind !== 'example') return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });

    const valid = validateTrainingInput(kind, body);
    if ('error' in valid) return NextResponse.json({ error: valid.error }, { status: 400 });

    const db = getAdminDB();
    const count = (await db.collection(COLLECTION).where('kind', '==', kind).count().get()).data().count;
    if (count >= (kind === 'rule' ? LIMITS.maxRules : LIMITS.maxExamples)) {
        return NextResponse.json({ error: 'Límite alcanzado: desactiva o elimina elementos antiguos.' }, { status: 400 });
    }

    const ref = db.collection(COLLECTION).doc();
    const now = new Date().toISOString();
    const item = { kind, ...valid.fields, active: body.active !== false, createdBy: trainer.email, createdAt: now, updatedAt: now };
    await ref.set({ ...item, sig: signItem({ id: ref.id, ...item }) });
    invalidateTrainingCache();
    return NextResponse.json({ id: ref.id });
}

export async function PATCH(req: NextRequest) {
    const trainer = await requireTrainer(req);
    if (trainer instanceof NextResponse) return trainer;

    const body = await req.json().catch(() => ({}));
    const id = String(body.id ?? '');
    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

    const ref = getAdminDB().collection(COLLECTION).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: 'No existe' }, { status: 404 });
    const current = snap.data() ?? {};
    const kind = current.kind as TrainingKind;

    const valid = validateTrainingInput(kind, {
        text: body.text ?? current.text,
        customer: body.customer ?? current.customer,
        ideal: body.ideal ?? current.ideal,
        badReply: body.badReply ?? current.badReply,
        note: body.note ?? current.note,
    });
    if ('error' in valid) return NextResponse.json({ error: valid.error }, { status: 400 });

    const item = { kind, ...valid.fields, active: body.active !== undefined ? !!body.active : !!current.active };
    await ref.update({ ...item, updatedAt: new Date().toISOString(), updatedBy: trainer.email, sig: signItem({ id, ...item }) });
    invalidateTrainingCache();
    return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
    const trainer = await requireTrainer(req);
    if (trainer instanceof NextResponse) return trainer;

    const id = req.nextUrl.searchParams.get('id') ?? '';
    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });
    await getAdminDB().collection(COLLECTION).doc(id).delete();
    invalidateTrainingCache();
    return NextResponse.json({ ok: true });
}
