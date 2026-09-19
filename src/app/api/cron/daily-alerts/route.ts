/**
 * Biocambio360 — Cron Job: Resumen Diario Consolidado
 * 
 * Ejecuta automáticamente a las 8:00 PM COT (01:00 UTC del día siguiente)
 * o bajo demanda manual por administradores.
 * 
 * Parámetros query soportados:
 * - ?date=YYYY-MM-DD : Evalúa un día específico en hora Colombia (por defecto: hoy en Bogotá)
 * - ?dryRun=true     : Calcula y devuelve JSON sin enviar email ni push
 * - ?sendTo=email    : Envía copia de prueba a un correo específico en vez de a todos los admins
 */

import { NextResponse } from 'next/server';
import type { DailyAlertData } from '@/lib/daily-alert-email';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BOGOTA_TZ = 'America/Bogota';

const bogotaDateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BOGOTA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

function parseDate(val: any): Date | null {
    if (!val) return null;
    if (typeof val.toDate === 'function') {
        const d = val.toDate();
        return isNaN(d.getTime()) ? null : d;
    }
    if (typeof val.seconds === 'number') {
        const d = new Date(val.seconds * 1000);
        return isNaN(d.getTime()) ? null : d;
    }
    if (typeof val === 'string' || typeof val === 'number') {
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
}

function getBogotaDateStr(date: Date | null): string | null {
    if (!date || isNaN(date.getTime())) return null;
    return bogotaDateFormatter.format(date);
}

export async function GET(request: Request) {
    try {
        const { collection, getDocs, query, where } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        const { sendDailyAlertEmail } = await import('@/lib/daily-alert-email');
        const { getAllReplenishmentRecords } = await import('@/lib/replenishment-service');

        const url = new URL(request.url);
        const customDate = url.searchParams.get('date');
        const dryRun = url.searchParams.get('dryRun') === 'true';
        const sendTo = url.searchParams.get('sendTo');

        // Fecha de corte en hora de Colombia (YYYY-MM-DD)
        const targetBogotaDateStr = (customDate && /^\d{4}-\d{2}-\d{2}$/.test(customDate))
            ? customDate
            : bogotaDateFormatter.format(new Date());

        console.log(`[Cron/DailyAlerts] Generating daily report for Colombia date: ${targetBogotaDateStr} (dryRun=${dryRun}, sendTo=${sendTo || 'all'})`);

        // ─── 1. Obtener y evaluar todas las órdenes ───
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

            // Pipeline global de estados
            if (status in pipeline) {
                pipeline[status]++;
            }

            // Filtrado estricto por fecha Colombia (excluyendo cancelados)
            if (status !== 'cancelado') {
                const orderDate = parseDate(order.createdAt);
                const orderBogotaDate = getBogotaDateStr(orderDate);

                if (orderBogotaDate === targetBogotaDateStr) {
                    todaySales += Number(order.total) || 0;
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

        // ─── 3. Carritos Abandonados del Día (Zona Horaria Colombia) ───
        let abandonedCartsToday = 0;
        let abandonedCartsValue = 0;

        try {
            const cartsRef = collection(db, 'abandoned_carts');
            const cartsSnap = await getDocs(query(cartsRef, where('status', '==', 'abandoned')));

            cartsSnap.forEach(docSnap => {
                const cart = docSnap.data();
                const cartDate = parseDate(cart.createdAt);
                const cartBogotaDate = getBogotaDateStr(cartDate);

                if (cartBogotaDate === targetBogotaDateStr) {
                    abandonedCartsToday++;
                    abandonedCartsValue += Number(cart.total || cart.subtotal) || 0;
                }
            });
        } catch (e) {
            console.warn('[Cron/DailyAlerts] Could not fetch abandoned carts:', e);
        }

        // ─── 4. Clientes Nuevos de Hoy & CRM Stats ───
        let newCustomersToday = 0;
        try {
            const customersRef = collection(db, 'customers');
            const customersSnap = await getDocs(customersRef);
            customersSnap.forEach(docSnap => {
                const cData = docSnap.data();
                const cDate = parseDate(cData.createdAt);
                if (getBogotaDateStr(cDate) === targetBogotaDateStr) {
                    newCustomersToday++;
                }
            });
        } catch (e) {
            console.warn('[Cron/DailyAlerts] Error counting new customers today:', e);
        }

        let crmStats: DailyAlertData['crmStats'] = undefined;
        try {
            const { getCRMDashboardStats } = await import('@/lib/crm-service');
            const stats = await getCRMDashboardStats();
            crmStats = {
                totalCustomers: stats.totalCustomers,
                atRisk: stats.byStage.at_risk || 0,
                lost: stats.byStage.lost || 0,
                newToday: newCustomersToday,
            };
        } catch (e) {
            console.warn('[Cron/DailyAlerts] Could not fetch CRM stats:', e);
        }

        // ─── 5. Preparar Data del Reporte ───
        const alertData: DailyAlertData = {
            dateString: targetBogotaDateStr,
            todaySales,
            todayOrdersCount,
            todayAvgTicket,
            pipeline,
            recompraAlerts,
            abandonedCartsToday,
            abandonedCartsValue,
            crmStats,
        };

        let emailResult: any = null;
        if (!dryRun) {
            const customRecipients = sendTo ? [{ email: sendTo, name: 'Admin Test' }] : undefined;
            emailResult = await sendDailyAlertEmail(alertData, customRecipients);
        }

        // ─── 6. Push notification (FCM) — Solo en ejecuciones regulares ───
        if (!dryRun && !sendTo) {
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
        }

        const responsePayload = {
            status: 'ok',
            date: targetBogotaDateStr,
            dryRun,
            emailResult,
            recipients: sendTo ? [sendTo] : 'ADMIN_RECIPIENTS (5 directores)',
            summary: {
                todaySales,
                todayOrdersCount,
                todayAvgTicket: Math.round(todayAvgTicket),
                pipeline,
                recompraAlertsCount: recompraAlerts.length,
                abandonedCartsToday,
                abandonedCartsValue,
                crmStats,
            },
        };

        console.log('[Cron/DailyAlerts] Execution completed successfully:', JSON.stringify(responsePayload));
        return NextResponse.json(responsePayload);
    } catch (error: any) {
        console.error('[Cron/DailyAlerts] Fatal error:', error);
        return NextResponse.json(
            { status: 'error', message: error?.message || 'Unknown error' },
            { status: 500 }
        );
    }
}
