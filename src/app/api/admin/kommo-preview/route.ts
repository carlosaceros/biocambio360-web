/**
 * GET /api/admin/kommo-preview?tab=matched|unmatched&pageSize=50&cursor=<kommoContactIdNum>
 * Lee paginado (cursor por kommoContactIdNum) las colecciones de staging que vuelca
 * `scripts/kommo-migrate-tags.ts --dump-preview`: kommo_migration_preview_matched /
 * _unmatched. Es de solo lectura — nunca toca `customers`. Acceso: superadmin, o Fernando/Diego
 * explícitamente (mismo criterio que /api/admin/capacitacion) — expone teléfonos y datos reales.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDB } from '@/lib/firebase-admin';
import { requireEmailAllowlist } from '@/lib/api-auth';

const checkAccess = requireEmailAllowlist(new Set(['fernando@biocambio360.com', 'diego@biocambio360.com']));

// Las tarjetas de cobertura de campos (meta.withX) cuentan sobre TODOS los contactos procesados
// (matched + unmatched combinados, ver scripts/kommo-migrate-tags.ts líneas 613-622) -- cada
// colección guarda el mismo dato bajo un nombre de campo distinto (prefijo "kommo" en matched).
//
// Un contacto SIN celular utilizable nunca llega a kommo_migration_unmatched (el script hace
// `continue` antes de ese write, porque sin teléfono no puede convertirse en cliente) -- solo
// queda registrado en kommo_migration_preview_unmatched (la auditoría del dry-run). Antes esta
// ruta no consultaba esa tercera colección: cada conteo por campo (Con Etapa, Con Cédula, etc.)
// subestimaba ligeramente, y el filtro de "Sin celular" no tenía NINGÚN dato que mostrar.
const FILTER_FIELD_MAP: Record<string, { matched?: string; unmatched?: string; equalsTrue?: boolean; emptyString?: boolean }> = {
    apellido: { matched: 'kommoApellido', unmatched: 'apellido' },
    etapa: { matched: 'kommoEtapa', unmatched: 'etapa' },
    localidad: { matched: 'kommoLocalidad', unmatched: 'localidad' },
    direccion: { matched: 'kommoDireccion', unmatched: 'direccion' },
    observacion: { matched: 'kommoObservacion', unmatched: 'observacion' },
    tipoCliente: { matched: 'kommoTipoCliente', unmatched: 'tipoCliente' },
    cedula: { matched: 'kommoCedula', unmatched: 'cedula' },
    leadNota: { matched: 'kommoLeadNota', unmatched: 'leadNota' },
    // Solo existe en matched -- emparejar por tel. 2 no aplica a un contacto sin cliente existente
    matchedByTelefono2: { matched: 'emparejadoPorTelefono2', equalsTrue: true },
    // Solo existe en la auditoría de "sin celular" (kommo_migration_preview_unmatched) -- por
    // definición un contacto ahí nunca tiene celular, así que basta con traer todos esos docs.
    sinCelular: { unmatched: 'celular', emptyString: true },
};
const MAX_FILTER_RESULTS = 500;

function rowMatches(row: Record<string, unknown>, fieldName: string, mapping: { equalsTrue?: boolean; emptyString?: boolean }): boolean {
    const val = row[fieldName];
    if (mapping.equalsTrue) return val === true;
    if (mapping.emptyString) return typeof val === 'string' && val.trim().length === 0;
    return typeof val === 'string' && val.trim().length > 0;
}

async function fetchFilteredRows(filterKey: string) {
    const db = getAdminDB();

    // "seguimiento" es la unión de observación (campo del contacto) y nota de lead (nota + nota 1
    // + observación del embudo) -- antes el admin solo veía "Con Observación" (17), que es apenas
    // el campo de contacto; la cobertura real de texto de seguimiento es mucho mayor contando
    // también las notas del lead, que viven en un campo de Kommo totalmente distinto.
    if (filterKey === 'seguimiento') {
        const snaps = await Promise.all([
            db.collection('kommo_migration_preview_matched').get(),
            db.collection('kommo_migration_unmatched').get(),
            db.collection('kommo_migration_preview_unmatched').get(),
        ]);
        const sources: Array<'matched' | 'unmatched'> = ['matched', 'unmatched', 'unmatched'];
        const all: Array<Record<string, unknown>> = [];
        snaps.forEach((snap, i) => {
            const source = sources[i];
            // El 3er snap (kommo_migration_preview_unmatched) mezcla contactos sin celular (hay
            // que sumarlos) con contactos con celular no emparejado (ya contados en el 2do snap,
            // kommo_migration_unmatched -- sumarlos de nuevo duplicaría el conteo).
            const isPreviewUnmatchedExtra = i === 2;
            snap.docs.forEach((d) => {
                const data = d.data();
                if (isPreviewUnmatchedExtra && data.motivoSinMatch !== 'sin_celular_utilizable') return;
                const observacion = source === 'matched' ? data.kommoObservacion : data.observacion;
                const leadNota = source === 'matched' ? data.kommoLeadNota : data.leadNota;
                const hasObs = typeof observacion === 'string' && observacion.trim().length > 0;
                const hasNota = typeof leadNota === 'string' && leadNota.trim().length > 0;
                if (hasObs || hasNota) {
                    all.push({ id: d.id, _source: source, ...data, _observacion: observacion || '', _leadNota: leadNota || '' });
                }
            });
        });
        return { total: all.length, rows: all.slice(0, MAX_FILTER_RESULTS) };
    }

    const mapping = FILTER_FIELD_MAP[filterKey];
    if (!mapping) return null;

    const collect = async (collectionName: string, fieldName?: string, extra?: (row: Record<string, unknown>) => boolean) => {
        if (!fieldName) return [] as Array<Record<string, unknown>>;
        const snap = await db.collection(collectionName).get();
        const source = collectionName === 'kommo_migration_preview_matched' ? 'matched' : 'unmatched';
        return snap.docs
            .map((d) => ({ id: d.id, _source: source, ...d.data() }))
            .filter((row) => rowMatches(row as Record<string, unknown>, fieldName, mapping))
            .filter((row) => !extra || extra(row as Record<string, unknown>));
    };

    // kommo_migration_preview_unmatched mezcla dos motivos distintos (ver script): contactos SIN
    // celular (nunca llegan a kommo_migration_unmatched -- hay que sumarlos aquí) y contactos CON
    // celular que no encontraron cliente existente (esos YA están contados via kommo_migration_
    // unmatched -- sumarlos de nuevo aquí los contaría dos veces). Se filtra solo por el primer
    // motivo, salvo que el filtro activo sea literalmente "sinCelular".
    const onlyNoPhoneReason = (row: Record<string, unknown>) => row.motivoSinMatch === 'sin_celular_utilizable';

    const [matchedRows, unmatchedRows, noPhoneRows] = await Promise.all([
        filterKey === 'sinCelular' ? Promise.resolve([]) : collect('kommo_migration_preview_matched', mapping.matched),
        filterKey === 'sinCelular' ? Promise.resolve([]) : collect('kommo_migration_unmatched', mapping.unmatched),
        collect('kommo_migration_preview_unmatched', mapping.unmatched, filterKey === 'sinCelular' ? undefined : onlyNoPhoneReason),
    ]);

    const all = [...matchedRows, ...unmatchedRows, ...noPhoneRows];
    return { total: all.length, rows: all.slice(0, MAX_FILTER_RESULTS) };
}

export async function GET(req: NextRequest) {
    const user = await checkAccess(req);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(req.url);
    const filterKey = searchParams.get('filter');
    if (filterKey) {
        try {
            const result = await fetchFilteredRows(filterKey);
            if (!result) return NextResponse.json({ error: `Filtro desconocido: ${filterKey}` }, { status: 400 });
            return NextResponse.json({ filterKey, filterTotal: result.total, filterRows: result.rows, truncated: result.total > MAX_FILTER_RESULTS });
        } catch (err) {
            console.error('[api/admin/kommo-preview] Error filtrando:', err instanceof Error ? err.message : err);
            return NextResponse.json({ error: 'No se pudo cargar el filtro' }, { status: 500 });
        }
    }

    const tab = searchParams.get('tab') === 'unmatched' ? 'unmatched' : 'matched';
    const pageSize = Math.min(Math.max(Number(searchParams.get('pageSize')) || 50, 10), 200);
    const cursorParam = searchParams.get('cursor');
    const cursor = cursorParam ? Number(cursorParam) : null;
    const search = (searchParams.get('search') || '').trim();

    try {
        const db = getAdminDB();
        // "matched" sigue leyendo el registro histórico del dry-run (ya ejecutado, es auditoría).
        // "unmatched" ahora lee la colección REAL escrita por --execute, que es la que de verdad
        // hay que revisar (incluye revisadoManualmente para marcar avance).
        const collectionName = tab === 'matched' ? 'kommo_migration_preview_matched' : 'kommo_migration_unmatched';

        let query: FirebaseFirestore.Query = db.collection(collectionName).orderBy('kommoContactIdNum');

        // Búsqueda simple por celular exacto (dígitos) — evita traer todo para filtrar en el cliente.
        const searchDigits = search.replace(/\D/g, '');
        if (searchDigits.length >= 6) {
            query = db.collection(collectionName).where('celular', '==', searchDigits).orderBy('kommoContactIdNum');
        } else if (cursor !== null) {
            query = query.startAfter(cursor);
        }

        const snap = await query.limit(pageSize).get();
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const last = snap.docs[snap.docs.length - 1];
        const nextCursor = last ? (last.data().kommoContactIdNum ?? null) : null;

        const metaSnap = await db.collection('kommo_migration_preview_meta').doc('summary').get();
        const meta = metaSnap.exists ? metaSnap.data() : null;

        // El conteo real de unmatched/revisados vive en la colección real, no en el meta del dry-run.
        const unmatchedTotal = (await db.collection('kommo_migration_unmatched').count().get()).data().count;
        const unmatchedPendientes = (
            await db.collection('kommo_migration_unmatched').where('revisadoManualmente', '==', false).count().get()
        ).data().count;

        return NextResponse.json({
            items,
            nextCursor,
            hasMore: snap.docs.length === pageSize && !searchDigits,
            meta: { ...meta, unmatched: unmatchedTotal, unmatchedPendientes },
        });
    } catch (err) {
        console.error('[api/admin/kommo-preview] Error:', err instanceof Error ? err.message : err);
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Error leyendo la revisión' }, { status: 500 });
    }
}

/**
 * POST /api/admin/kommo-preview — marca un contacto de kommo_migration_unmatched como revisado
 * (o revierte la marca). Mismo criterio de acceso que el GET.
 */
export async function POST(req: NextRequest) {
    const user = await checkAccess(req);
    if (user instanceof NextResponse) return user;

    try {
        const body = await req.json();
        const { kommoContactId, revisadoManualmente } = body as { kommoContactId?: string; revisadoManualmente?: boolean };
        if (!kommoContactId || typeof revisadoManualmente !== 'boolean') {
            return NextResponse.json({ error: 'Faltan kommoContactId o revisadoManualmente' }, { status: 400 });
        }
        const db = getAdminDB();
        await db.collection('kommo_migration_unmatched').doc(kommoContactId).set({
            revisadoManualmente,
            revisadoPor: user.email,
            revisadoAt: new Date().toISOString(),
        }, { merge: true });
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[api/admin/kommo-preview] Error marcando revisado:', err instanceof Error ? err.message : err);
        return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 500 });
    }
}
