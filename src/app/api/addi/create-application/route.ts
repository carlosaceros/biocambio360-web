import { NextResponse } from 'next/server';
import { createAddiApplication } from '@/lib/addi-service';
import { getAdminDB } from '@/lib/firebase-admin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { orderId, total, shippingCost, customer, items } = body;

        if (!orderId || !total || !customer?.cedula || !customer?.celular) {
            return NextResponse.json(
                { error: 'Faltan parámetros requeridos (orderId, total, cedula, celular)' },
                { status: 400 }
            );
        }

        // Determine base URL from request headers
        const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
        const proto = request.headers.get('x-forwarded-proto') || 'https';
        const baseUrl = host ? `${proto}://${host}` : undefined;

        const result = await createAddiApplication({
            orderId,
            total,
            shippingCost: shippingCost || 0,
            customer,
            items: items || [],
            baseUrl
        });

        // Store attempt reference in Firestore order
        try {
            const db = getAdminDB();
            await db.collection('orders').doc(orderId).set({
                addiTransaction: {
                    attemptId: result.orderAttemptId,
                    applicationId: result.applicationId || null,
                    status: 'PENDING',
                    updatedAt: new Date().toISOString()
                }
            }, { merge: true });
        } catch (dbErr) {
            console.warn('[AddiCreateApp] No se pudo guardar intento en Firestore:', dbErr);
        }

        return NextResponse.json({
            success: true,
            redirectUrl: result.redirectUrl,
            applicationId: result.applicationId,
            orderAttemptId: result.orderAttemptId
        });
    } catch (error: any) {
        console.error('[AddiCreateApp] Error procesando solicitud Addi:', error);
        return NextResponse.json(
            { error: error?.message || 'Error interno al procesar solicitud con Addi' },
            { status: 500 }
        );
    }
}
