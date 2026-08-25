import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, Timestamp, arrayUnion } from 'firebase/firestore';
import { OrderStatus, TimelineEvent } from '@/types/order';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const orderId = searchParams.get('orderId');
        const transactionId = searchParams.get('transactionId');

        if (!orderId) {
            return NextResponse.json({ error: 'Falta orderId' }, { status: 400 });
        }

        const isProd = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY?.startsWith('pub_prod_');
        const baseUrl = isProd ? 'https://production.wompi.co/v1' : 'https://sandbox.wompi.co/v1';

        let transactionData: any = null;

        // 1. Si tenemos transactionId, consultar directamente
        if (transactionId) {
            try {
                const res = await fetch(`${baseUrl}/transactions/${transactionId}`, {
                    headers: {
                        'Authorization': `Bearer ${process.env.WOMPI_PRIVATE_KEY || process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY}`
                    },
                    cache: 'no-store'
                });
                if (res.ok) {
                    const json = await res.json();
                    transactionData = json.data;
                }
            } catch (e) {
                console.warn('Error fetching by transactionId:', e);
            }
        }

        // 2. Si no hay transactionId o falló, buscar por reference = orderId
        if (!transactionData) {
            try {
                const res = await fetch(`${baseUrl}/transactions?reference=${orderId}`, {
                    headers: {
                        'Authorization': `Bearer ${process.env.WOMPI_PRIVATE_KEY || process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY}`
                    },
                    cache: 'no-store'
                });
                if (res.ok) {
                    const json = await res.json();
                    const list = json.data || [];
                    if (list.length > 0) {
                        // Tomar la más reciente
                        transactionData = list[0];
                    }
                }
            } catch (e) {
                console.warn('Error fetching by reference:', e);
            }
        }

        // 3. Obtener el pedido actual en Firestore
        const orderRef = doc(db, 'orders', orderId);
        const orderSnap = await getDoc(orderRef);
        
        if (!orderSnap.exists()) {
            return NextResponse.json({ error: 'Pedido no encontrado en base de datos' }, { status: 404 });
        }

        const currentOrder = orderSnap.data();

        // 4. Si encontramos datos en Wompi, sincronizar con el pedido
        if (transactionData) {
            const wompiStatus = transactionData.status; // 'APPROVED' | 'PENDING' | 'DECLINED' | 'VOIDED' | 'ERROR'
            const paymentMethodType = transactionData.payment_method_type || transactionData.payment_method?.type || 'ONLINE';

            const wompiDetails = {
                id: transactionData.id,
                status: wompiStatus,
                reference: transactionData.reference || orderId,
                amountInCents: transactionData.amount_in_cents,
                paymentMethodType: paymentMethodType,
                currency: transactionData.currency || 'COP',
                customerEmail: transactionData.customer_email || transactionData.customer_data?.email,
                statusMessage: transactionData.status_message,
                updatedAt: new Date().toISOString(),
                raw: transactionData
            };

            let updatedStatus: OrderStatus = currentOrder.status;
            let note = `Wompi Consulta: Transacción #${transactionData.id} - ${wompiStatus}`;

            if (wompiStatus === 'APPROVED' && currentOrder.status === 'pendiente') {
                updatedStatus = 'confirmado';
                note = `Wompi: Pago APROBADO #${transactionData.id} (${paymentMethodType})`;
            } else if ((wompiStatus === 'DECLINED' || wompiStatus === 'ERROR' || wompiStatus === 'VOIDED') && currentOrder.status === 'pendiente') {
                updatedStatus = 'cancelado';
                note = `Wompi: Pago DECLINADO #${transactionData.id}`;
            }

            const now = Timestamp.now();
            const newTimelineEvent: TimelineEvent = {
                status: updatedStatus,
                timestamp: now,
                note
            };

            await updateDoc(orderRef, {
                wompiTransaction: wompiDetails,
                status: updatedStatus,
                timeline: arrayUnion(newTimelineEvent),
                updatedAt: now
            });

            return NextResponse.json({
                found: true,
                orderId,
                wompiTransaction: wompiDetails,
                orderStatus: updatedStatus,
                message: `Sincronizado con Wompi: ${wompiStatus}`
            });
        }

        // 5. Si no se encontró transacción en Wompi API aún
        return NextResponse.json({
            found: false,
            orderId,
            metodoPago: currentOrder.metodoPago || 'desconocido',
            wompiTransaction: currentOrder.wompiTransaction || null,
            message: 'El cliente eligió Wompi al finalizar compra. No hay transacción confirmada aún en los registros de Wompi.'
        });

    } catch (error: any) {
        console.error('Error in /api/admin/wompi-status:', error);
        return NextResponse.json({ error: error.message || 'Error al consultar Wompi' }, { status: 500 });
    }
}
