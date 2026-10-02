import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getAdminDB } from '@/lib/firebase-admin';
import { RAW_SALES_SCRIPTS_CATALOG, SALES_SCRIPT_CATEGORIES, SalesScriptTemplate } from '@/lib/sales-scripts-catalog-service';

const VALID_CATEGORIES = new Set(SALES_SCRIPT_CATEGORIES.map((c) => c.id));
const COLLECTION = 'sales_scripts';
const EDITABLE_FIELDS = ['titulo', 'categoria', 'etiquetas', 'descripcion', 'template', 'referenciaWord', 'destacado'] as const;

function findBaseScript(id: string): SalesScriptTemplate | undefined {
    return RAW_SALES_SCRIPTS_CATALOG.find((s) => s.id === id);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 });

    if (body.categoria !== undefined && !VALID_CATEGORIES.has(body.categoria)) {
        return NextResponse.json({ error: `La categoría debe ser una de: ${Array.from(VALID_CATEGORIES).join(', ')}.` }, { status: 400 });
    }
    if (body.titulo !== undefined && (typeof body.titulo !== 'string' || !body.titulo.trim())) {
        return NextResponse.json({ error: 'El título no puede quedar vacío.' }, { status: 400 });
    }
    if (body.template !== undefined && (typeof body.template !== 'string' || !body.template.trim())) {
        return NextResponse.json({ error: 'El texto del guion no puede quedar vacío.' }, { status: 400 });
    }

    const db = getAdminDB();
    const docRef = db.collection(COLLECTION).doc(id);

    try {
        const existingSnap = await docRef.get();
        const base = existingSnap.exists ? (existingSnap.data() as SalesScriptTemplate) : findBaseScript(id);
        if (!base) {
            return NextResponse.json({ error: 'Guion no encontrado.' }, { status: 404 });
        }

        const updated: SalesScriptTemplate = { ...base, id };
        for (const field of EDITABLE_FIELDS) {
            if (body[field] !== undefined) {
                (updated as unknown as Record<string, unknown>)[field] = field === 'etiquetas' && Array.isArray(body[field])
                    ? body[field].map(String)
                    : body[field];
            }
        }
        // Permite restaurar un guion previamente oculto (hidden: false explícito)
        if (body.hidden === false) updated.hidden = false;
        updated.updatedAt = new Date().toISOString();
        updated.updatedBy = auth.email;

        await docRef.set(updated, { merge: false });
        return NextResponse.json({ ok: true, script: updated });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al editar el guion';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * Un guion del catálogo base (vive en código) nunca se borra de verdad -- se marca `hidden: true`
 * para que deje de aparecer, y se puede restaurar (PATCH con hidden:false). Un guion creado desde
 * cero (isCustom) sí se borra de Firestore de forma definitiva, porque no tiene original en código
 * al cual volver.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const db = getAdminDB();
    const docRef = db.collection(COLLECTION).doc(id);

    try {
        const base = findBaseScript(id);
        if (base) {
            const existingSnap = await docRef.get();
            const current = existingSnap.exists ? (existingSnap.data() as SalesScriptTemplate) : base;
            await docRef.set({ ...current, id, hidden: true, updatedAt: new Date().toISOString(), updatedBy: auth.email }, { merge: false });
            return NextResponse.json({ ok: true, softDeleted: true });
        }

        await docRef.delete();
        return NextResponse.json({ ok: true, softDeleted: false });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al eliminar el guion';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
