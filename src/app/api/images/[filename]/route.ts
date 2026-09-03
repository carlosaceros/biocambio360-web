import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAdminDB } from '@/lib/firebase-admin';

const MIME_TYPES: Record<string, string> = {
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
};

export async function GET(
    request: Request,
    props: { params: Promise<{ filename: string }> }
) {
    try {
        const { filename: rawFilename } = await props.params;
        if (!rawFilename) {
            return new NextResponse('Filename is required', { status: 400 });
        }

        const filename = path.basename(decodeURIComponent(rawFilename));
        const ext = path.extname(filename).toLowerCase();
        const defaultMime = MIME_TYPES[ext] || 'image/webp';

        // 1. Try serving from local disk (if available)
        const localPath = path.join(process.cwd(), 'public', 'images', filename);
        if (fs.existsSync(localPath)) {
            try {
                const fileBuffer = await fs.promises.readFile(localPath);
                return new NextResponse(fileBuffer, {
                    status: 200,
                    headers: {
                        'Content-Type': defaultMime,
                        'Cache-Control': 'public, max-age=31536000, immutable',
                    },
                });
            } catch (diskErr) {
                console.warn('[API/images] Could not read from disk, falling back to Firestore:', diskErr);
            }
        }

        // 2. Query Firestore 'product_images' collection
        try {
            const db = getAdminDB();
            const docRef = db.collection('product_images').doc(filename);
            const docSnap = await docRef.get();
            if (docSnap.exists) {
                const data = docSnap.data();
                let base64 = data?.base64 || '';

                // If image was chunked, reassemble from subcollection
                if (data?.isChunked) {
                    const chunksSnap = await docRef.collection('chunks').orderBy('index', 'asc').get();
                    base64 = '';
                    chunksSnap.forEach(chunkDoc => {
                        base64 += chunkDoc.data()?.data || '';
                    });
                }

                if (base64) {
                    const imgBuffer = Buffer.from(base64, 'base64');
                    return new NextResponse(imgBuffer, {
                        status: 200,
                        headers: {
                            'Content-Type': data?.mimeType || defaultMime,
                            'Cache-Control': 'public, max-age=31536000, immutable',
                        },
                    });
                }
            }
        } catch (dbErr) {
            console.error('[API/images] Error reading from Firestore product_images:', dbErr);
        }

        // 3. Fallback: placeholder
        const placeholderPath = path.join(process.cwd(), 'public', 'images', 'placeholder.png');
        if (fs.existsSync(placeholderPath)) {
            const placeholderBuffer = await fs.promises.readFile(placeholderPath);
            return new NextResponse(placeholderBuffer, {
                status: 200,
                headers: {
                    'Content-Type': 'image/png',
                    'Cache-Control': 'public, max-age=3600',
                },
            });
        }

        return new NextResponse('Image not found', { status: 404 });
    } catch (err) {
        console.error('[API/images] Unexpected error:', err);
        return new NextResponse('Internal server error', { status: 500 });
    }
}
