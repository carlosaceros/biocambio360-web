import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

// 1x1 Transparent GIF Base64 Buffer
const TRANSPARENT_GIF_BUFFER = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
);

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');
        const contact = searchParams.get('contact') || '1';

        if (token) {
            const cartRef = doc(db, 'abandoned_carts', token);
            updateDoc(cartRef, {
                openedAt: serverTimestamp(),
                openCount: increment(1),
                lastContactOpened: Number(contact) || 1,
            }).catch(e => console.warn('[Track/Open] Error updating open stats:', e));
        }
    } catch (err) {
        console.warn('[Track/Open] Error processing open pixel:', err);
    }

    return new NextResponse(TRANSPARENT_GIF_BUFFER, {
        status: 200,
        headers: {
            'Content-Type': 'image/gif',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
        },
    });
}
