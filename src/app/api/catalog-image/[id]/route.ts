/**
 * GET /api/catalog-image/<productId> — the product photo as a JPEG (WhatsApp does not accept WebP
 * for images). Public on purpose: WhatsApp's servers fetch it by URL when a product card is sent.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { getProductById } from '@/lib/ai-agent-knowledge';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params;
    const product = await getProductById(decodeURIComponent(id));
    if (!product?.imgFile) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    try {
        const res = await fetch(`https://biocambio360.com/images/${encodeURIComponent(product.imgFile)}`);
        if (!res.ok) return NextResponse.json({ error: 'Image not found' }, { status: 404 });
        const jpeg = await sharp(Buffer.from(await res.arrayBuffer()))
            .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .flatten({ background: '#ffffff' })
            .jpeg({ quality: 82 })
            .toBuffer();
        return new NextResponse(new Uint8Array(jpeg), {
            headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400, s-maxage=86400' },
        });
    } catch (err) {
        console.warn('[catalog-image] failed:', err instanceof Error ? err.message : err);
        return NextResponse.json({ error: 'Could not process the image' }, { status: 502 });
    }
}
