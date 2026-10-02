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
const FILTER_FIELD_MAP: Record<string, { matched?: string; unmatched?: string; equalsTrue?: boolean }> = {
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
};
const MAX_FILTER_RESULTS = 500;

async function fetchFilteredRows(filterKey: string) {
    const mapping = FILTER_FIELD_MAP[filterKey];
    if (!mapping) return null;
    const db = getAdminDB();

    const collect = async (collectionName: string, fieldName?: string) => {
        if (!fieldName) return [] as Array<Record<string, unknown>>;
        const snap = await db.collection(collectionName).get();
        return snap.docs
            .map((d) => ({ id: d.id, _source: collectionName === 'kommo_migration_preview_matched' ? 'matched' : 'unmatched', ...d.data() }))
            .filter((row) => {
                const val = (row as Record<string, unknown>)[fieldName];
                return mapping.equalsTrue ? val === true : typeof val === 'string' && val.trim().length > 0;
            });
    };

    const [matchedRows, unmatchedRows] = await Promise.all([
        collect('kommo_migration_preview_matched', mapping.matched),
        collect('kommo_migration_unmatched', mapping.unmatched),
    ]);

    const all = [...matchedRows, ...unmatchedRows];
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
