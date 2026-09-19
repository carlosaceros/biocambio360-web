import { NextResponse } from 'next/server';
import { obtenerPdfGuia } from '@/lib/99envios-service';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const guia = searchParams.get('guia');
        const tipoPdf = (searchParams.get('tipoPdf') as 'sticker' | 'estandar') || 'sticker';

        if (!guia) {
            return NextResponse.json({ error: 'Parámetro ?guia= es requerido' }, { status: 400 });
        }

        const pdfData = await obtenerPdfGuia([guia], tipoPdf);

        return new Response(new Uint8Array(pdfData.buffer), {
            headers: {
                'Content-Type': pdfData.contentType,
                'Content-Disposition': `inline; filename="guia_${guia}.pdf"`,
            },
        });
    } catch (e: any) {
        console.error('[pdf-guia GET] Error:', e);
        return NextResponse.json({ error: e.message || 'Error al obtener PDF de guía' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { guias, tipoPdf = 'sticker' } = body;

        if (!guias || !Array.isArray(guias) || guias.length === 0) {
            return NextResponse.json({ error: 'Se requiere una lista de guías (array)' }, { status: 400 });
        }

        const pdfData = await obtenerPdfGuia(guias, tipoPdf);

        return new Response(new Uint8Array(pdfData.buffer), {
            headers: {
                'Content-Type': pdfData.contentType,
                'Content-Disposition': `inline; filename="guia_${guias.join('_')}.pdf"`,
            },
        });
    } catch (e: any) {
        console.error('[pdf-guia] Error:', e);
        return NextResponse.json({ error: e.message || 'Error al obtener PDF de guía' }, { status: 500 });
    }
}
