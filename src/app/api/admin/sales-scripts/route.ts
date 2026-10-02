import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getAdminDB } from '@/lib/firebase-admin';
import { RAW_SALES_SCRIPTS_CATALOG, SALES_SCRIPT_CATEGORIES, SalesScriptTemplate } from '@/lib/sales-scripts-catalog-service';

const VALID_CATEGORIES = new Set(SALES_SCRIPT_CATEGORIES.map((c) => c.id));
const COLLECTION = 'sales_scripts';

/** El Admin SDK rechaza `undefined` en un .set() ("Cannot use 'undefined' as a Firestore value") --
 *  a diferencia del SDK de cliente, que simplemente lo ignora. Se limpia antes de cada escritura. */
function removeUndefined<T extends Record<string, unknown>>(obj: T): T {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

/**
 * El catálogo de guiones vive en dos capas, igual que coupons-service.ts con INITIAL_COUPONS:
 * RAW_SALES_SCRIPTS_CATALOG (defaults en código, ~40 guiones ya escritos) + overrides en Firestore
 * por `id`. Editar un guion por defecto crea/actualiza un doc con ese mismo id (lo sobreescribe al
 * mezclar); "eliminarlo" lo marca `hidden: true` en vez de borrarlo de verdad -- el original en
 * código nunca se pierde y se puede restaurar. Un guion nuevo es simplemente un doc sin equivalente
 * en el catálogo base (`isCustom: true`).
 */
async function getMergedScripts(): Promise<SalesScriptTemplate[]> {
    const db = getAdminDB();
    const snap = await db.collection(COLLECTION).get();
    const overridesById = new Map<string, SalesScriptTemplate>();
    snap.forEach((doc) => overridesById.set(doc.id, { ...(doc.data() as SalesScriptTemplate), id: doc.id }));

    const merged = new Map<string, SalesScriptTemplate>();
    for (const base of RAW_SALES_SCRIPTS_CATALOG) {
        merged.set(base.id, overridesById.get(base.id) || base);
        overridesById.delete(base.id);
    }
    // Lo que queda en overridesById son guiones nuevos creados desde cero (sin base en código)
    for (const custom of overridesById.values()) {
        merged.set(custom.id, custom);
    }

    return Array.from(merged.values());
}

export async function GET(req: NextRequest) {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    try {
        const scripts = await getMergedScripts();
        return NextResponse.json({ scripts });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al cargar los guiones';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 });

    const { titulo, categoria, etiquetas, descripcion, template, referenciaWord, destacado } = body;

    if (typeof titulo !== 'string' || !titulo.trim()) {
        return NextResponse.json({ error: 'El título es requerido.' }, { status: 400 });
    }
    if (typeof categoria !== 'string' || !VALID_CATEGORIES.has(categoria)) {
        return NextResponse.json({ error: `La categoría debe ser una de: ${Array.from(VALID_CATEGORIES).join(', ')}.` }, { status: 400 });
    }
    if (typeof template !== 'string' || !template.trim()) {
        return NextResponse.json({ error: 'El texto del guion es requerido.' }, { status: 400 });
    }

    const db = getAdminDB();
    const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const script: SalesScriptTemplate = {
        id,
        titulo: titulo.trim(),
        categoria: categoria as SalesScriptTemplate['categoria'],
        etiquetas: Array.isArray(etiquetas) ? etiquetas.map(String) : [],
        descripcion: typeof descripcion === 'string' ? descripcion.trim() : '',
        template: template.trim(),
        referenciaWord: typeof referenciaWord === 'string' && referenciaWord.trim() ? referenciaWord.trim() : undefined,
        destacado: !!destacado,
        isCustom: true,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.email,
    };

    try {
        await db.collection(COLLECTION).doc(id).set(removeUndefined(script as unknown as Record<string, unknown>));
        return NextResponse.json({ ok: true, script });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al crear el guion';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
