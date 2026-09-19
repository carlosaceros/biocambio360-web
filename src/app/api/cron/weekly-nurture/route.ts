/**
 * Biocambio360 — Cron Job: Nurturing y Fidelización Pos-Venta Semanal
 * 
 * Envía 1 correo semanal educativo firmado por Julián y Danilo (Co-fundadores)
 * a los clientes que han recibido sus pedidos, recomendando artículos del blog y tips de uso.
 * 
 * Parámetros query soportados:
 * - ?dryRun=true       : Simula el proceso sin enviar correos
 * - ?sendTo=email      : Envía un correo de prueba a un destinatario específico
 * - ?product=detergente: Fuerza una categoría ('detergente', 'desengrasante', 'oxigeno_activo', 'general')
 * - ?week=1            : Fuerza la semana a enviar (1, 2 o 3)
 */

import { NextResponse } from 'next/server';
import { sendWeeklyNurtureEmail, detectNurtureCategory, getNurtureTip } from '@/lib/post-purchase-nurture-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const dryRun = url.searchParams.get('dryRun') === 'true';
        const sendTo = url.searchParams.get('sendTo');
        const forcedCategory = url.searchParams.get('product') || 'detergente';
        const week = parseInt(url.searchParams.get('week') || '1', 10);

        // Modo prueba / test individual
        if (sendTo) {
            const testTip = getNurtureTip(forcedCategory, week);
            if (dryRun) {
                return NextResponse.json({
                    success: true,
                    mode: 'dryRun',
                    recipient: sendTo,
                    category: forcedCategory,
                    week,
                    tip: testTip
                });
            }

            const sendResult = await sendWeeklyNurtureEmail({
                customerEmail: sendTo,
                customerName: 'Cliente Distinguido',
                purchasedProducts: [{ nombre: forcedCategory === 'desengrasante' ? 'Desengrasante Multiusos' : 'Detergente Líquido Ropa 20L' }],
                weekNumber: week
            });

            return NextResponse.json({
                success: sendResult.success,
                mode: 'test_send',
                recipient: sendTo,
                result: sendResult
            });
        }

        // Modo ejecución regular cron: consultar pedidos entregados en Firestore
        const { collection, getDocs, query, where, limit } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');

        if (!db) {
            return NextResponse.json({ success: false, error: 'Database not initialized' }, { status: 500 });
        }

        const ordersRef = collection(db, 'orders');
        const q = query(
            ordersRef,
            where('status', '==', 'entregado'),
            limit(50)
        );

        const snap = await getDocs(q);
        const processed = [];
        const now = Date.now();

        for (const doc of snap.docs) {
            const data = doc.data();
            const customerEmail = data.cliente?.email || data.customerEmail;
            const customerName = data.cliente?.nombre || data.customerName || 'Cliente Amigo';
            const updatedAt = data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.updatedAt?.seconds ? data.updatedAt.seconds * 1000 : null);

            if (!customerEmail || !updatedAt) continue;

            const daysSinceDelivery = Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24));
            let targetWeek = 0;

            // Ventana para semana 1: entre 6 y 8 días
            if (daysSinceDelivery >= 6 && daysSinceDelivery <= 8) targetWeek = 1;
            // Ventana para semana 2: entre 13 y 15 días
            else if (daysSinceDelivery >= 13 && daysSinceDelivery <= 15) targetWeek = 2;
            // Ventana para semana 3: entre 20 y 22 días
            else if (daysSinceDelivery >= 20 && daysSinceDelivery <= 22) targetWeek = 3;

            if (targetWeek > 0) {
                const items = data.productos?.map((p: any) => ({ nombre: p.nombre || p.product?.nombre || 'Producto' })) || [];
                
                if (!dryRun) {
                    const res = await sendWeeklyNurtureEmail({
                        customerEmail,
                        customerName,
                        orderId: doc.id,
                        purchasedProducts: items,
                        weekNumber: targetWeek
                    });
                    processed.push({ orderId: doc.id, customerEmail, week: targetWeek, success: res.success });
                } else {
                    processed.push({ orderId: doc.id, customerEmail, week: targetWeek, simulated: true });
                }
            }
        }

        return NextResponse.json({
            success: true,
            dryRun,
            totalEvaluated: snap.docs.length,
            processedCount: processed.length,
            details: processed
        });

    } catch (error: any) {
        console.error('[WeeklyNurtureCron] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Error executing weekly nurture cron' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    return GET(request);
}
