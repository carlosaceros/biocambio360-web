/**
 * GET /api/inbox/media?id=<whatsapp media id>
 * Streams a customer's media file (image, audio, video, document) to the inbox.
 * Requires a Firebase ID token (Authorization: Bearer ...). Media ids are only valid ~30 days in Meta.
 *
 * Vercel limits each response to ~4.5 MB, so large files are served in chunks with HTTP Range
 * (206 Partial Content, 3.5 MB each); the inbox downloads the chunks and reassembles them.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { downloadMedia } from '@/lib/whatsapp-service';

const CHUNK = 3.5 * 1024 * 1024;
const MAX_FILE = 40 * 1024 * 1024;

// Consecutive chunk requests hit the same warm instance most of the time: avoid re-downloading from Meta
const recent = new Map<string, { at: number; buffer: Buffer; mimeType: string }>();
const RECENT_TTL_MS = 3 * 60 * 1000;

async function getFile(id: string) {
    const now = Date.now();
    for (const [key, v] of recent) if (now - v.at > RECENT_TTL_MS) recent.delete(key);
    const hit = recent.get(id);
    if (hit) return hit;

    const { buffer, mimeType } = await downloadMedia(id);
    if (buffer.length <= MAX_FILE) {
        if (recent.size >= 3) recent.delete(recent.keys().next().value as string);
        recent.set(id, { at: now, buffer, mimeType });
    }
    return { at: now, buffer, mimeType };
}

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
        const { buffer, mimeType } = await getFile(id);
        const total = buffer.length;
        if (total > MAX_FILE) {
            return NextResponse.json({ error: 'El archivo es demasiado grande para previsualizar (más de 40 MB).' }, { status: 413 });
        }

        const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.get('range') ?? '');
        const headers: Record<string, string> = {
            'Content-Type': mimeType,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'private, max-age=86400',
            'X-Content-Type-Options': 'nosniff',
            'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges',
        };

        // Small files: a single normal response
        if (!range && total <= CHUNK) {
            return new NextResponse(new Uint8Array(buffer), { status: 200, headers: { ...headers, 'Content-Length': String(total) } });
        }

        // Large files (or explicit Range): one chunk of at most 3.5 MB
        const start = range ? Math.min(Number(range[1]), total - 1) : 0;
        const requestedEnd = range && range[2] ? Number(range[2]) : start + CHUNK - 1;
        const end = Math.min(requestedEnd, start + CHUNK - 1, total - 1);
        const slice = buffer.subarray(start, end + 1);

        return new NextResponse(new Uint8Array(slice), {
            status: 206,
            headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${total}`, 'Content-Length': String(slice.length) },
        });
    } catch (err) {
        console.warn('[inbox/media] Failed:', err instanceof Error ? err.message : err);
        return NextResponse.json({ error: 'No se pudo cargar el archivo (puede haber caducado).' }, { status: 502 });
    }
}
