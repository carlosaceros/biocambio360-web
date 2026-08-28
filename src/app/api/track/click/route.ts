import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const contact = searchParams.get('contact') || '1';
    const target = searchParams.get('target');

    if (token) {
        try {
            const cartRef = doc(db, 'abandoned_carts', token);
            updateDoc(cartRef, {
                clickedAt: serverTimestamp(),
                clickCount: increment(1),
                lastContactClicked: Number(contact) || 1,
            }).catch(e => console.warn('[Track/Click] Error updating click stats:', e));
        } catch (err) {
            console.warn('[Track/Click] Error processing click redirect:', err);
        }
    }

    const redirectUrl = target 
        ? (target.startsWith('http') ? target : `https://www.biocambio360.com${target}`)
        : (token ? `https://www.biocambio360.com/checkout?recovery_token=${token}` : 'https://www.biocambio360.com');

    return NextResponse.redirect(redirectUrl, { status: 302 });
}
