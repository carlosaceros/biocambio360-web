import { NextRequest, NextResponse } from 'next/server';
import { requireCapability } from '@/lib/api-auth';
import { editTemplate, TemplateCategory, TemplateButtonInput } from '@/lib/whatsapp-service';

const CATEGORIES: TemplateCategory[] = ['MARKETING', 'UTILITY', 'AUTHENTICATION'];

function validateButtons(buttons: unknown): { value?: TemplateButtonInput[]; error?: string } {
    if (buttons === undefined || buttons === null) return { value: undefined };
    if (!Array.isArray(buttons)) return { error: 'buttons debe ser una lista.' };
    if (buttons.length > 10) return { error: 'Máximo 10 botones por plantilla.' };

    const parsed: TemplateButtonInput[] = [];
    for (const b of buttons) {
        if (!b || typeof b !== 'object') return { error: 'Cada botón debe ser un objeto.' };
        const { type, text, url, phone_number, example } = b as Record<string, unknown>;
        if (type !== 'QUICK_REPLY' && type !== 'URL' && type !== 'PHONE_NUMBER') {
            return { error: `Tipo de botón inválido: ${String(type)}` };
        }
        if (typeof text !== 'string' || !text.trim() || text.length > 25) {
            return { error: 'El texto del botón es requerido (máx. 25 caracteres).' };
        }
        if (type === 'URL' && (typeof url !== 'string' || !url.trim())) {
            return { error: 'Los botones de tipo URL requieren una url.' };
        }
        if (type === 'PHONE_NUMBER' && (typeof phone_number !== 'string' || !phone_number.trim())) {
            return { error: 'Los botones de tipo teléfono requieren phone_number.' };
        }
        parsed.push({
            type,
            text: text.trim(),
            url: typeof url === 'string' ? url.trim() : undefined,
            phone_number: typeof phone_number === 'string' ? phone_number.trim() : undefined,
            example: Array.isArray(example) ? example.map(String) : undefined,
        });
    }
    return { value: parsed };
}

/**
 * PATCH /api/admin/whatsapp-templates/[id] -- edita una plantilla existente en Meta.
 * `id` aquí es el ID numérico de la plantilla en Meta (no el nombre) -- es lo que devuelve
 * listAllTemplates()/createTemplate() como `id`, y lo que exige el endpoint POST /{template-id}.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireCapability('mensajeria')(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 });

    const { category, headerText, bodyText, bodyExamples, footerText, buttons } = body;

    if (category !== undefined && !CATEGORIES.includes(category as TemplateCategory)) {
        return NextResponse.json({ error: `La categoría debe ser una de: ${CATEGORIES.join(', ')}.` }, { status: 400 });
    }
    if (bodyText !== undefined && (typeof bodyText !== 'string' || !bodyText.trim() || bodyText.length > 1024)) {
        return NextResponse.json({ error: 'El cuerpo del mensaje no puede superar 1024 caracteres.' }, { status: 400 });
    }
    if (headerText !== undefined && (typeof headerText !== 'string' || headerText.length > 60)) {
        return NextResponse.json({ error: 'El encabezado no puede superar 60 caracteres.' }, { status: 400 });
    }
    if (footerText !== undefined && (typeof footerText !== 'string' || footerText.length > 60)) {
        return NextResponse.json({ error: 'El pie de página no puede superar 60 caracteres.' }, { status: 400 });
    }

    const buttonsResult = validateButtons(buttons);
    if (buttonsResult.error) return NextResponse.json({ error: buttonsResult.error }, { status: 400 });

    try {
        const result = await editTemplate(id, {
            category: category as TemplateCategory | undefined,
            headerText,
            bodyText,
            bodyExamples: Array.isArray(bodyExamples) ? bodyExamples.map(String) : undefined,
            footerText,
            buttons: buttonsResult.value,
        });
        return NextResponse.json({ ok: true, ...result });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Error editando la plantilla en Meta';
        // Meta responde con un mensaje claro cuando el estado no permite edición (ej. PENDING) o se
        // superó el límite de ediciones -- se deja pasar tal cual para que la UI pueda ofrecer
        // "duplicar como nueva" en vez de solo mostrar un error genérico.
        return NextResponse.json({ error: message }, { status: 502 });
    }
}
