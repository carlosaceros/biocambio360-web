/**
 * Biocambio360 — Cron Job: Resumen Diario
 * 
 * Ejecuta diariamente a las 8:00 PM COT (01:00 UTC del día siguiente).
 * Recopila KPIs del día y envía email consolidado a administradores.
 */

import { NextResponse } from 'next/server';
import type { DailyAlertData } from '@/lib/daily-alert-email';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
    try {
        const { collection, getDocs, query, where, Timestamp } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        const { sendDailyAlertEmail } = await import('@/lib/daily-alert-email');
        const { getAllReplenishmentRecords } = await import('@/lib/replenishment-service');

        console.log('[Cron/DailyAlerts] Generating daily report...');

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

        // ─── 1. Obtener todas las órdenes ───
        const ordersRef = collection(db, 'orders');
        const ordersSnap = await getDocs(ordersRef);

        let todaySales = 0;
        let todayOrdersCount = 0;
        const pipeline = {
            pendiente: 0,
            confirmado: 0,
            preparacion: 0,
            enviado: 0,
            en_camino: 0,
            entregado: 0,
            cancelado: 0,
        };

        ordersSnap.forEach(docSnap => {
            const order = docSnap.data();
            const status = (order.status || 'pendiente') as keyof typeof pipeline;

            // Contar pipeline
            if (status in pipeline) {
                pipeline[status]++;
            }

            // Ventas de hoy (excluir cancelados)
            if (status !== 'cancelado') {
                let orderDate: Date | null = null;
                if (order.createdAt && typeof order.createdAt.toDate === 'function') {
                    orderDate = order.createdAt.toDate();
                } else if (order.createdAt?.seconds) {
                    orderDate = new Date(order.createdAt.seconds * 1000);
                } else if (order.createdAt) {
                    orderDate = new Date(order.createdAt);
                }

                if (orderDate && orderDate >= todayStart && orderDate < todayEnd) {
                    todaySales += order.total || 0;
                    todayOrdersCount++;
                }
            }
        });

        const todayAvgTicket = todayOrdersCount > 0 ? todaySales / todayOrdersCount : 0;

        // ─── 2. Alertas de Recompra ───
        let recompraAlerts: DailyAlertData['recompraAlerts'] = [];
        try {
            const repRecords = await getAllReplenishmentRecords();
            const nowMs = Date.now();

            recompraAlerts = repRecords
                .filter(r => r.status === 'critico_10_dias' || r.status === 'vencido' || r.status === 'alerta_temprana')
                .map(r => {
                    const dueDate = new Date(r.nextOrderDueDate).getTime();
                    const daysRemaining = Math.ceil((dueDate - nowMs) / (1000 * 60 * 60 * 24));
                    return {
                        customerName: r.customerName,
                        customerPhone: r.customerPhone,
                        status: r.status || 'alerta_temprana',
                        daysRemaining,
                        itemsSummary: r.itemsSummary,
                    };
                })
                .sort((a, b) => a.daysRemaining - b.daysRemaining)
                .slice(0, 15);
        } catch (e) {
            console.warn('[Cron/DailyAlerts] Could not fetch recompra data:', e);
        }

        // ─── 3. Carritos Abandonados de Hoy ───
        let abandonedCartsToday = 0;
        let abandonedCartsValue = 0;

        try {
            const cartsRef = collection(db, 'abandoned_carts');
            const cartsSnap = await getDocs(query(cartsRef, where('status', '==', 'abandoned')));

            cartsSnap.forEach(docSnap => {
                const cart = docSnap.data();
                let cartDate: Date | null = null;
                if (cart.createdAt && typeof cart.createdAt.toDate === 'function') {
                    cartDate = cart.createdAt.toDate();
                } else if (cart.createdAt?.seconds) {
                    cartDate = new Date(cart.createdAt.seconds * 1000);
                }

                if (cartDate && cartDate >= todayStart && cartDate < todayEnd) {
                    abandonedCartsToday++;
                    abandonedCartsValue += cart.total || cart.subtotal || 0;
                }
            });
        } catch (e) {
            console.warn('[Cron/DailyAlerts] Could not fetch abandoned carts:', e);
        }

        // ─── 4. CRM Stats ───
        let crmStats: DailyAlertData['crmStats'] = undefined;
        try {
            const { getCRMDashboardStats } = await import('@/lib/crm-service');
            const stats = await getCRMDashboardStats();
            crmStats = {
                totalCustomers: stats.totalCustomers,
                atRisk: stats.byStage.at_risk || 0,
                lost: stats.byStage.lost || 0,
                newToday: 0, // Se podría calcular filtrando por createdAt de hoy
            };
        } catch (e) {
            console.warn('[Cron/DailyAlerts] Could not fetch CRM stats:', e);
        }

        // ─── 5. Enviar email ───
        const alertData: DailyAlertData = {
            todaySales,
            todayOrdersCount,
            todayAvgTicket,
            pipeline,
            recompraAlerts,
            abandonedCartsToday,
            abandonedCartsValue,
            crmStats,
        };

        await sendDailyAlertEmail(alertData);

        // ─── 6. Push notification (FCM) ───
        try {
            const { sendAdminPushNotification } = await import('@/lib/fcm-service');
            await sendAdminPushNotification({
                title: `📊 Resumen: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(todaySales)} en ventas`,
                body: `${todayOrdersCount} pedidos · ${pipeline.pendiente} pendientes · ${recompraAlerts.length} alertas recompra`,
                data: { type: 'daily_report' },
            });
        } catch (e) {
            console.warn('[Cron/DailyAlerts] FCM push failed:', e);
        }

        const summary = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            todaySales,
            todayOrdersCount,
            todayAvgTicket: Math.round(todayAvgTicket),
            pipeline,
            recompraAlertsCount: recompraAlerts.length,
            abandonedCartsToday,
        };

        console.log('[Cron/DailyAlerts] Report sent:', JSON.stringify(summary));

        return NextResponse.json(summary);
    } catch (error: any) {
        console.error('[Cron/DailyAlerts] Fatal error:', error);
        return NextResponse.json(
            { status: 'error', message: error?.message || 'Unknown error' },
            { status: 500 }
        );
    }
}
