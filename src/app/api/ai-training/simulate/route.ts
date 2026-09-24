/**
 * Training simulator: runs the SAME agent brain used on WhatsApp against a conversation that lives in
 * the browser. Nothing is sent to WhatsApp and nothing is written to real conversations.
 * Directors and super admins only.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { requireTrainer } from '@/lib/ai-training-auth';
import { generateAgentReply, resolveAd, type AdContextInput } from '@/lib/ai-order-agent';
import { sanitizeUserText, parseContactWindow } from '@/lib/ai-agent-guard';
import type { PreOrder } from '@/types/inbox';

export async function POST(req: NextRequest) {
    const trainer = await requireTrainer(req);
    if (trainer instanceof NextResponse) return trainer;

    const body = await req.json().catch(() => ({}));
    const rawHistory: Array<{ role: 'user' | 'model'; text: string }> = Array.isArray(body.history) ? body.history.slice(-20) : [];
    const history = rawHistory
        .filter(h => (h.role === 'user' || h.role === 'model') && typeof h.text === 'string')
        .map(h => ({ role: h.role, text: (h.role === 'user' ? sanitizeUserText(h.text) : h.text).slice(0, 400) }));

    if (history.length === 0 || history[history.length - 1].role !== 'user') {
        return NextResponse.json({ error: 'Escribe un mensaje como cliente.' }, { status: 400 });
    }

    const lastText = history[history.length - 1].text;
    let preOrder: PreOrder | null = body.preOrder ?? null;

    // Same deterministic capture as production for the contact-time answer
    const askedSchedule = history.slice(-3).some(h => h.role === 'model' && /horario|franja/i.test(h.text));
    const chosen = askedSchedule ? parseContactWindow(lastText) : null;
    if (chosen) {
        preOrder = { items: [], nombreCliente: '', direccion: '', ciudad: '', metodoPago: '', notas: '', estado: 'borrador', ...(preOrder ?? {}), horarioContacto: chosen, actualizadoAt: new Date().toISOString() };
    }

    let ad: AdContextInput | null = null;
    if (body.ad && typeof body.ad === 'object') {
        const a = body.ad as Record<string, string>;
        ad = a.sourceId
            ? await resolveAd({ sourceId: a.sourceId, headline: a.headline, body: a.body })
            : { headline: a.headline?.slice(0, 200), body: a.body?.slice(0, 300), productName: a.productName, notes: a.notes?.slice(0, 300) };
    }

    const modelTurns = history.filter(h => h.role === 'model').length;
    const result = await generateAgentReply({
        history,
        lastText,
        preOrder,
        turns: modelTurns,
        botMessagesBefore: modelTurns,
        ad,
        useResponseCache: false,
        buttonRecentlySent: false,
        alreadyListed: false,
    });

    return NextResponse.json({ ...result, preOrder: result.preOrder ?? preOrder });
}
