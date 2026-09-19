import { describe, it, expect, vi } from 'vitest';
import { ADMIN_RECIPIENTS } from '@/lib/email-service';
import { sendDailyAlertEmail, DailyAlertData } from '@/lib/daily-alert-email';
import * as emailService from '@/lib/email-service';

describe('Daily Alerts & Email Service Audit', () => {
    it('1. ADMIN_RECIPIENTS debe incluir los 5 correos de administración oficiales', () => {
        const emails = ADMIN_RECIPIENTS.map(r => r.email);

        expect(emails).toContain('infobiocambio360@gmail.com');
        expect(emails).toContain('carlos.aceros@thinktic.co');
        expect(emails).toContain('daniloespinalospina@gmail.com');
        expect(emails).toContain('thinktic.thinktic@gmail.com');
        expect(emails).toContain('tiendavirtual@biocambio360.com');
        expect(ADMIN_RECIPIENTS.length).toBe(5);
    });

    it('2. Timezone Colombia (America/Bogota) debe identificar correctamente las fechas a las 01:00 UTC (8:00 PM COT)', () => {
        const bogotaFormatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Bogota',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });

        // 8:00 PM COT del 18 de septiembre = 01:00 UTC del 19 de septiembre
        const cronRunUtc = new Date('2026-09-19T01:00:00Z');
        expect(bogotaFormatter.format(cronRunUtc)).toBe('2026-09-18');

        // Un pedido realizado a las 3:00 PM COT (20:00 UTC) del 18 de septiembre
        const orderDateUtc = new Date('2026-09-18T20:00:00Z');
        expect(bogotaFormatter.format(orderDateUtc)).toBe('2026-09-18');

        // Ambos deben coincidir en la misma fecha local
        expect(bogotaFormatter.format(cronRunUtc)).toBe(bogotaFormatter.format(orderDateUtc));
    });

    it('3. sendDailyAlertEmail formatea correctamente la fecha y envía a ADMIN_RECIPIENTS', async () => {
        const sendEmailSpy = vi.spyOn(emailService, 'sendEmail').mockResolvedValue({
            success: true,
            messageId: 'test-message-id',
        });

        const mockData: DailyAlertData = {
            dateString: '2026-09-18',
            todaySales: 350000,
            todayOrdersCount: 4,
            todayAvgTicket: 87500,
            pipeline: {
                pendiente: 1,
                confirmado: 2,
                preparacion: 1,
                enviado: 0,
                en_camino: 0,
                entregado: 12,
                cancelado: 0,
            },
            recompraAlerts: [],
            abandonedCartsToday: 1,
            abandonedCartsValue: 65000,
            crmStats: {
                totalCustomers: 50,
                atRisk: 3,
                lost: 1,
                newToday: 2,
            },
        };

        const result = await sendDailyAlertEmail(mockData);

        expect(result.success).toBe(true);
        expect(sendEmailSpy).toHaveBeenCalledTimes(1);

        const callArgs = sendEmailSpy.mock.calls[0][0];
        expect(callArgs.to).toEqual(ADMIN_RECIPIENTS);
        expect(callArgs.subject).toContain('Resumen Diario');
        expect(callArgs.subject).toContain('350.000');
        expect(callArgs.subject).toContain('4 pedidos');
        expect(callArgs.htmlContent).toContain('350.000');
        expect(callArgs.htmlContent).toContain('Total Histórico');

        sendEmailSpy.mockRestore();
    });

    it('4. sendDailyAlertEmail respeta customRecipients cuando se especifican para pruebas', async () => {
        const sendEmailSpy = vi.spyOn(emailService, 'sendEmail').mockResolvedValue({
            success: true,
            messageId: 'test-custom-id',
        });

        const mockData: DailyAlertData = {
            dateString: '2026-09-18',
            todaySales: 0,
            todayOrdersCount: 0,
            todayAvgTicket: 0,
            pipeline: {
                pendiente: 0,
                confirmado: 0,
                preparacion: 0,
                enviado: 0,
                en_camino: 0,
                entregado: 0,
                cancelado: 0,
            },
            recompraAlerts: [],
            abandonedCartsToday: 0,
            abandonedCartsValue: 0,
        };

        const testRecipient = [{ email: 'carlos.aceros@thinktic.co', name: 'Carlos Test' }];
        const result = await sendDailyAlertEmail(mockData, testRecipient);

        expect(result.success).toBe(true);
        const callArgs = sendEmailSpy.mock.calls[0][0];
        expect(callArgs.to).toEqual(testRecipient);

        sendEmailSpy.mockRestore();
    });
});
