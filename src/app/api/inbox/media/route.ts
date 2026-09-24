/**
 * GET /api/inbox/media?id=<whatsapp media id>
 * Streams a customer's media file (image, audio, video, document) to the inbox.
 * Requires a Firebase ID token (Authorization: Bearer ...). Media ids are only valid ~30 days in Meta.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { downloadMedia } from '@/lib/whatsapp-service';

// Vercel serverless responses are limited to ~4.5 MB
const MAX_BYTES = 4 * 1024 * 1024;

export async function GET(req: NextRequest) {
    const idToken = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        await getAdminAuth().verifyIdToken(idToken);
    } catch {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get('id') ?? '';
    if (!/^[A-Za-z0-9_-]{5,100}$/.test(id)) {
        return NextResponse.json({ error: 'Invalid media id' }, { status: 400 });
    }

    try {
        const { buffer, mimeType, fileSize } = await downloadMedia(id);
        if (fileSize > MAX_BYTES) {
            return NextResponse.json({ error: 'El archivo es muy grande para previsualizar (más de 4 MB).' }, { status: 413 });
        }
        return new NextResponse(new Uint8Array(buffer), {
            status: 200,
            headers: {
                'Content-Type': mimeType,
                'Content-Length': String(fileSize),
                'Cache-Control': 'private, max-age=86400',
                'X-Content-Type-Options': 'nosniff',
            },
        });
    } catch (err) {
        console.warn('[inbox/media] Failed:', err instanceof Error ? err.message : err);
        return NextResponse.json({ error: 'No se pudo cargar el archivo (puede haber caducado).' }, { status: 502 });
    }
}
