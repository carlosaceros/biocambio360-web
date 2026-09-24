/**
 * Cron: polls the (documented) 99 Envíos "novedades" endpoint for our branch and records incidents
 * on the matching orders as internal notes. It never changes the order status: an incident is often
 * resolved later (new delivery attempt), and delivered/returned states come from the panel report.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDB } from '@/lib/firebase-admin';

const API = 'https://integration1.99envios.app/api/integration';

export async function GET(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = (req.headers.get('user-agent') ?? '').startsWith('vercel-cron');
    const hasSecret = !!cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`;
    if (!isVercelCron && !hasSecret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const email = process.env.ENV_99ENVIOS_EMAIL;
    const password = process.env.ENV_99ENVIOS_PASSWORD;
    if (!email || !password) return NextResponse.json({ error: 'Credenciales de 99 Envíos no configuradas' }, { status: 500 });
    const sucursal = process.env.NINETY_NINE_SUCURSAL_CODE || '678200';

    const login = await fetch(`${API}/v1/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    const { token } = (await login.json().catch(() => ({}))) as { token?: string };
    if (!token) return NextResponse.json({ error: 'Login 99 Envíos falló' }, { status: 502 });

    const res = await fetch(`${API}/sucursal/novedades/${sucursal}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
    if (res.status === 404) return NextResponse.json({ novedades: 0 });
    const data = (await res.json().catch(() => ({}))) as { novedades?: Array<Record<string, unknown>> };
    const novedades = data.novedades ?? [];

    const db = getAdminDB();
    let recorded = 0;
    let unmatched = 0;

    for (const n of novedades) {
        const guia = String(n.numero_preenvio ?? '').trim();
        const id = String(n.id ?? '');
        if (!guia || !id) continue;

        const snap = await db.collection('orders').where('guiaTransportadora', '==', guia).limit(1).get();
        if (snap.empty) { unmatched++; continue; }
        const orderDoc = snap.docs[0];
        const order = orderDoc.data();
        if (order.status === 'entregado' || order.status === 'cancelado') continue;
        if ((order.novedades99Ids ?? []).includes(id)) continue; // already recorded

        const tipo = String(n.tipo_novedad ?? 'Novedad');
        const detalle = [n.observaciones, n.detalle_novedad, n.solucion_novedad].filter(Boolean).join(' · ');
        await orderDoc.ref.update({
            novedades99Ids: FieldValue.arrayUnion(id),
            ultimaNovedad99: { id, tipo, detalle, fecha: n.created_at ?? null, registradaAt: new Date().toISOString() },
            notasInternas: FieldValue.arrayUnion({
                id: `nov99-${id}`,
                text: `Novedad 99 Envíos (guía ${guia}): ${tipo}${detalle ? ` — ${detalle}` : ''}`,
                authorEmail: 'sistema@99envios.app',
                authorName: 'Sistema (novedades 99 Envíos)',
                authorRole: 'sistema',
                createdAt: new Date().toISOString(),
            }),
        });
        recorded++;
    }

    console.log(`[cron/99envios-novedades] total=${novedades.length} registradas=${recorded} sinPedido=${unmatched}`);
    return NextResponse.json({ total: novedades.length, recorded, unmatched });
}
