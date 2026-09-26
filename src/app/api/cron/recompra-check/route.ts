/**
 * Biocambio360 — Cron Job: Verificación de Recompra
 * 
 * Ejecuta diariamente a las 9:00 AM COT (14:00 UTC).
 * 
 * Lógica:
 * 1. Obtiene todos los registros de reposición
 * 2. Filtra clientes en alerta_temprana o critico_10_dias
 * 3. Envía email de recompra si no se ha enviado en los últimos 7 días
 * 4. Registra actividad CRM
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Pro: max 60s

export async function GET(request: Request) {
    try {
        // Verificar que es una llamada legítima de cron (Vercel envía este header)
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            // También permitir llamadas internas sin secret para testing
            const isVercelCron = request.headers.get('x-vercel-cron') === '1';
            if (!isVercelCron && cronSecret) {
                console.warn('[Cron/Recompra] Unauthorized request');
            }
        }

        // The automatic e-mail can be paused from the Reabastecimiento screen (WhatsApp is separate)
        const { getAdminDB } = await import('@/lib/firebase-admin');
        const config = (await getAdminDB().collection('bot_config').doc('replenishment').get()).data();
        if (config?.emailEnabled === false) {
            console.log('[Cron/Recompra] Automatic e-mail is paused');
            return NextResponse.json({ status: 'paused' });
        }

        // Dynamic imports para evitar problemas de bundling
        const { getAllReplenishmentRecords, markReminderSent } = await import('@/lib/replenishment-service');
        const { sendRecompraAlertaTempranaEmail, sendRecompraCriticoEmail } = await import('@/lib/recompra-emails');
        const { addCRMActivity } = await import('@/lib/crm-service');

        console.log('[Cron/Recompra] Starting recompra check...');

        const allRecords = await getAllReplenishmentRecords();
        const now = Date.now();

        let processed = 0;
        let alertsSent = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (const record of allRecords) {
            // Solo procesar alerta_temprana y critico_10_dias
            if (!record.status || record.status === 'surtido') {
                continue;
            }

            processed++;

            // No enviar si no tiene email
            if (!record.customerEmail) {
                skipped++;
                continue;
            }

            // No enviar si ya se notificó en los últimos 7 días
            if (record.lastReminderSentAt) {
                const lastSent = new Date(record.lastReminderSentAt).getTime();
                const daysSinceLastReminder = (now - lastSent) / (1000 * 60 * 60 * 24);
                if (daysSinceLastReminder < 7) {
                    skipped++;
                    continue;
                }
            }

            const dueDate = new Date(record.nextOrderDueDate).getTime();
            const daysRemaining = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

            try {
                if (record.status === 'critico_10_dias' || record.status === 'vencido') {
                    await sendRecompraCriticoEmail({
                        customerName: record.customerName,
                        customerEmail: record.customerEmail,
                        itemsSummary: record.itemsSummary,
                        daysRemaining,
                        lastOrderDate: record.lastOrderDate,
                    });
                } else if (record.status === 'alerta_temprana') {
                    await sendRecompraAlertaTempranaEmail({
                        customerName: record.customerName,
                        customerEmail: record.customerEmail,
                        itemsSummary: record.itemsSummary,
                        daysRemaining,
                        lastOrderDate: record.lastOrderDate,
                    });
                }

                // Marcar como enviado
                if (record.id) {
                    await markReminderSent(record.id);
                }

                // Registrar actividad CRM (fire-and-forget)
                const cleanPhone = record.customerPhone.replace(/\D/g, '');
                if (cleanPhone) {
                    addCRMActivity({
                        customerId: cleanPhone,
                        type: 'recompra_alert',
                        description: `Alerta de recompra enviada (${record.status}): ${record.itemsSummary}`,
                        authorEmail: 'sistema@biocambio360.com',
                        authorName: 'Sistema CRM',
                        metadata: {
                            status: record.status,
                            daysRemaining,
                            email: record.customerEmail,
                        },
                    }).catch(err => console.warn('[Cron/Recompra] CRM activity error:', err));
                }

                alertsSent++;
                console.log(`[Cron/Recompra] Alert sent to ${record.customerName} (${record.status})`);
            } catch (emailError: any) {
                const errMsg = `Error sending to ${record.customerEmail}: ${emailError?.message}`;
                errors.push(errMsg);
                console.error(`[Cron/Recompra] ${errMsg}`);
            }
        }

        const summary = {
            status: 'ok',
            timestamp: new Date().toISOString(),
            totalRecords: allRecords.length,
            processed,
            alertsSent,
            skipped,
            errors: errors.length > 0 ? errors : undefined,
        };

        console.log('[Cron/Recompra] Completed:', JSON.stringify(summary));

        return NextResponse.json(summary);
    } catch (error: any) {
        console.error('[Cron/Recompra] Fatal error:', error);
        return NextResponse.json(
            { status: 'error', message: error?.message || 'Unknown error' },
            { status: 500 }
        );
    }
}
