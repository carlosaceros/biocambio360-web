import { NextRequest, NextResponse } from 'next/server';
import { requireCapability } from '@/lib/api-auth';
import { REMINDER_WABA_ID } from '@/lib/whatsapp-sender';
import {
    listAllTemplates,
    createTemplate,
    TemplateCategory,
    TemplateButtonInput,
} from '@/lib/whatsapp-service';

const CATEGORIES: TemplateCategory[] = ['MARKETING', 'UTILITY', 'AUTHENTICATION'];
const NAME_RE = /^[a-z0-9_]{1,512}$/;

function resolveWabaId(accountKey: string | null): string | undefined {
    if (accountKey === 'totalLimpieza') return REMINDER_WABA_ID;
    return process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
}

export async function GET(req: NextRequest) {
    const auth = await requireCapability('mensajeria')(req);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const wabaId = resolveWabaId(searchParams.get('accountKey'));
    if (!wabaId) return NextResponse.json({ error: 'No hay un WABA configurado para esta cuenta.' }, { status: 400 });

    try {
        const templates = await listAllTemplates(wabaId);
        return NextResponse.json({ templates });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Error consultando plantillas en Meta';
        return NextResponse.json({ error: message }, { status: 502 });
    }
}

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

export async function POST(req: NextRequest) {
    const auth = await requireCapability('mensajeria')(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 });

    const { accountKey, name, category, language, headerText, bodyText, bodyExamples, footerText, buttons } = body;

    if (typeof name !== 'string' || !NAME_RE.test(name)) {
        return NextResponse.json({ error: 'El nombre debe ser minúsculas, números y guion bajo únicamente.' }, { status: 400 });
    }
    if (typeof category !== 'string' || !CATEGORIES.includes(category as TemplateCategory)) {
        return NextResponse.json({ error: `La categoría debe ser una de: ${CATEGORIES.join(', ')}.` }, { status: 400 });
    }
    if (typeof language !== 'string' || !language.trim()) {
        return NextResponse.json({ error: 'El idioma es requerido (ej. es, es_CO, en_US).' }, { status: 400 });
    }
    if (typeof bodyText !== 'string' || !bodyText.trim() || bodyText.length > 1024) {
        return NextResponse.json({ error: 'El cuerpo del mensaje es requerido (máx. 1024 caracteres).' }, { status: 400 });
    }
    if (headerText !== undefined && (typeof headerText !== 'string' || headerText.length > 60)) {
        return NextResponse.json({ error: 'El encabezado no puede superar 60 caracteres.' }, { status: 400 });
    }
    if (footerText !== undefined && (typeof footerText !== 'string' || footerText.length > 60)) {
        return NextResponse.json({ error: 'El pie de página no puede superar 60 caracteres.' }, { status: 400 });
    }
    if (bodyExamples !== undefined && !Array.isArray(bodyExamples)) {
        return NextResponse.json({ error: 'bodyExamples debe ser una lista de textos.' }, { status: 400 });
    }

    const buttonsResult = validateButtons(buttons);
    if (buttonsResult.error) return NextResponse.json({ error: buttonsResult.error }, { status: 400 });

    const wabaId = resolveWabaId(accountKey ?? null);
    if (!wabaId) return NextResponse.json({ error: 'No hay un WABA configurado para esta cuenta.' }, { status: 400 });

    try {
        const result = await createTemplate(wabaId, {
            name,
            category: category as TemplateCategory,
            language,
            headerText: headerText || undefined,
            bodyText,
            bodyExamples: Array.isArray(bodyExamples) ? bodyExamples.map(String) : undefined,
            footerText: footerText || undefined,
            buttons: buttonsResult.value,
        });
        return NextResponse.json({ ok: true, template: result });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Error creando la plantilla en Meta';
        return NextResponse.json({ error: message }, { status: 502 });
    }
}
