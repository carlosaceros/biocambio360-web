import { NextResponse } from 'next/server';
import { obtenerPdfGuia } from '@/lib/99envios-service';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const guia = searchParams.get('guia');
        const transportadora = searchParams.get('transportadora') || undefined;
        const tipoPdf = (searchParams.get('tipoPdf') as 'sticker' | 'estandar') || 'sticker';

        if (!guia) {
            return NextResponse.json({ error: 'Parámetro ?guia= es requerido' }, { status: 400 });
        }

        const pdfData = await obtenerPdfGuia(guia, transportadora, tipoPdf);

        return new Response(new Uint8Array(pdfData.buffer), {
            headers: {
                'Content-Type': pdfData.contentType,
                'Content-Disposition': `inline; filename="guia_${guia}.pdf"`,
                'Cache-Control': 'public, max-age=3600, s-maxage=3600',
            },
        });
    } catch (e: any) {
        console.error('[pdf-guia GET] Error:', e);
        const { searchParams } = new URL(req.url);
        const guia = searchParams.get('guia');
        // Si no se puede generar el PDF de 99 Envíos y es una guía de Coordinadora, ofrecer redirección directa
        if (guia && guia.startsWith('64')) {
            return NextResponse.redirect(`https://coordinadora.com/rastreo/guia/?guia=${guia}`, 307);
        }
        return NextResponse.json({ error: e.message || 'Error al obtener PDF de guía' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { guias, transportadora, tipoPdf = 'sticker' } = body;

        if (!guias || (Array.isArray(guias) && guias.length === 0)) {
            return NextResponse.json({ error: 'Se requiere una guía o lista de guías' }, { status: 400 });
        }

        const guiaPrincipal = Array.isArray(guias) ? guias[0] : guias;
        const pdfData = await obtenerPdfGuia(guiaPrincipal, transportadora, tipoPdf);

        return new Response(new Uint8Array(pdfData.buffer), {
            headers: {
                'Content-Type': pdfData.contentType,
                'Content-Disposition': `inline; filename="guia_${guiaPrincipal}.pdf"`,
            },
        });
    } catch (e: any) {
        console.error('[pdf-guia POST] Error:', e);
        return NextResponse.json({ error: e.message || 'Error al obtener PDF de guía' }, { status: 500 });
    }
}

