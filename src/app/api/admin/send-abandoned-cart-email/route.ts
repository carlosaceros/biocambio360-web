import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { 
    sendContact1Email, 
    sendContact2Email, 
    sendContact3Email, 
    AbandonedCartRecord 
} from '@/lib/abandoned-cart-service';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { cartToken, contactNumber } = body;

        if (!cartToken) {
            return NextResponse.json({ ok: false, error: 'cartToken es requerido' }, { status: 400 });
        }

        const cartRef = doc(db, 'abandoned_carts', cartToken);
        const snap = await getDoc(cartRef);

        if (!snap.exists()) {
            return NextResponse.json({ ok: false, error: 'Carrito no encontrado' }, { status: 404 });
        }

        const cart = snap.data() as AbandonedCartRecord;

        if (!cart.customerEmail) {
            return NextResponse.json({ ok: false, error: 'El carrito no tiene correo electrónico asociado' }, { status: 400 });
        }

        const contact = Number(contactNumber) || 1;

        if (contact === 1) {
            await sendContact1Email(cart);
        } else if (contact === 2) {
            await sendContact2Email(cart);
        } else if (contact === 3) {
            await sendContact3Email(cart);
        }

        await updateDoc(cartRef, {
            notificationCount: Math.max(cart.notificationCount || 0, contact),
            lastNotifiedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        return NextResponse.json({ ok: true, message: `Correo de contacto ${contact} enviado exitosamente` });
    } catch (err: any) {
        console.error('[API/Admin/SendAbandonedCartEmail] Error:', err);
        return NextResponse.json({ ok: false, error: err?.message || 'Error al enviar correo' }, { status: 500 });
    }
}
