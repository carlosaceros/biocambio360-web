import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getCommercialSummaryForMonth,
    getAdvisorsPerformanceForMonth,
    HISTORICAL_SALES_DATA,
    ADVISORS_PERFORMANCE_DATA
} from '@/lib/commercial-reports-data';
import {
    detectNurtureCategory,
    getNurtureTip,
    renderNurtureEmailHtml,
    sendWeeklyNurtureEmail,
    NURTURE_CATALOG
} from '@/lib/post-purchase-nurture-service';

// Mock email transport
vi.mock('@/lib/email-service', () => ({
    emailTransport: {
        send: vi.fn().mockResolvedValue({ success: true, messageId: 'mock-nurture-123' })
    }
}));

describe('Business Intelligence Dinámico: Meses Anteriores y Cumplimiento de Metas', () => {
    it('HISTORICAL_SALES_DATA contiene la serie completa de 2024, 2025 y 2026', () => {
        const datos2024 = HISTORICAL_SALES_DATA.filter(d => d.anio === 2024);
        const datos2025 = HISTORICAL_SALES_DATA.filter(d => d.anio === 2025);
        const datos2026 = HISTORICAL_SALES_DATA.filter(d => d.anio === 2026);

        expect(datos2024.length).toBe(12); // 12 meses de 2024
        expect(datos2025.length).toBe(12); // 12 meses de 2025
        expect(datos2026.length).toBe(9);  // Enero a Septiembre 2026
    });

    it('getCommercialSummaryForMonth calcula métricas exactas para Agosto 2026', () => {
        const summary = getCommercialSummaryForMonth(8, 2026, 220);
        expect(summary.ventasActualesMillones).toBe(157);
        expect(summary.metaGlobalMillones).toBe(220);
        expect(summary.porcentajeCumplimientoGlobal).toBe(71);
        expect(summary.ticketPromedioGeneral).toBe(148956);
    });

    it('getCommercialSummaryForMonth calcula métricas dinámicas para Septiembre 2026 (mes en curso)', () => {
        const summary = getCommercialSummaryForMonth(9, 2026, 220);
        expect(summary.ventasActualesMillones).toBe(53);
        expect(summary.porcentajeCumplimientoGlobal).toBe(24); // 53 / 220
        expect(summary.proyeccionCierreMillones).toBeGreaterThan(53); // Run-rate proyectado
    });

    it('getCommercialSummaryForMonth permite auditar cualquier mes de 2025 o 2024', () => {
        const jul2025 = getCommercialSummaryForMonth(7, 2025, 220);
        expect(jul2025.ventasActualesMillones).toBe(200);
        expect(jul2025.porcentajeCumplimientoGlobal).toBe(91);

        const dic2024 = getCommercialSummaryForMonth(12, 2024, 220);
        expect(dic2024.ventasActualesMillones).toBe(199);
        expect(dic2024.porcentajeCumplimientoGlobal).toBe(90);
    });

    it('getAdvisorsPerformanceForMonth ajusta el rendimiento de los 6 asesores según el mes', () => {
        // En agosto 2026, mantiene el corte histórico auditado
        const asesoresAgosto = getAdvisorsPerformanceForMonth(8, 2026);
        expect(asesoresAgosto.length).toBe(6);
        expect(asesoresAgosto[0].nombre).toBe('Karen');
        expect(asesoresAgosto[0].ventasMillones).toBe(49);

        // En septiembre 2026 (mes parcial de $53M), recalcula proporcionalmente
        const asesoresSept = getAdvisorsPerformanceForMonth(9, 2026);
        expect(asesoresSept.length).toBe(6);
        const totalVentasAsesores = asesoresSept.reduce((acc, a) => acc + a.ventasMillones, 0);
        expect(totalVentasAsesores).toBeLessThan(70);
        expect(totalVentasAsesores).toBeGreaterThan(45);
    });
});

describe('Fidelización Pos-Venta Semanal de Julián y Danilo (Co-fundadores)', () => {
    it('detectNurtureCategory clasifica correctamente según los productos comprados', () => {
        expect(detectNurtureCategory([{ nombre: 'Detergente Líquido para Ropa 20L' }])).toBe('detergente');
        expect(detectNurtureCategory([{ nombre: 'Desengrasante Multiusos y Cocina 10L' }])).toBe('desengrasante');
        expect(detectNurtureCategory([{ nombre: 'Oxígeno Activo Desinfectante 1Kg' }])).toBe('oxigeno_activo');
        expect(detectNurtureCategory([{ nombre: 'Combo Limpieza Especial' }])).toBe('general');
    });

    it('getNurtureTip extrae tips con artículos de blog y consejos de dosificación', () => {
        const tipDetergente = getNurtureTip('detergente', 1);
        expect(tipDetergente.semana).toBe(1);
        expect(tipDetergente.asunto).toContain('60ml');
        expect(tipDetergente.blogSlugRecomendado).toBe('desmanchar-ropa-blanca-oxigeno-activo-bicarbonato');
        expect(tipDetergente.tipDestacado.texto).toContain('60 ml');

        const tipDesengrasante = getNurtureTip('desengrasante', 1);
        expect(tipDesengrasante.asunto).toContain('3 minutos');
    });

    it('renderNurtureEmailHtml genera HTML empático, firma de fundadores y enlace a WhatsApp', () => {
        const tip = getNurtureTip('detergente', 1);
        const html = renderNurtureEmailHtml({
            customerName: 'Sandra Gómez',
            tip,
            orderId: 'ord-12345678'
        });

        expect(html).toContain('Sandra Gómez');
        expect(html).toContain('Danilo y Julián');
        expect(html).toContain('Co-fundadores');
        expect(html).toContain('desmanchar-ropa-blanca-oxigeno-activo-bicarbonato');
        expect(html).toContain('wa.me/573241005353');
        expect(html).toContain('60 ml');
    });

    it('sendWeeklyNurtureEmail despacha el correo a través de emailTransport', async () => {
        const res = await sendWeeklyNurtureEmail({
            customerEmail: 'cliente@ejemplo.com',
            customerName: 'Pedro Navas',
            purchasedProducts: [{ nombre: 'Detergente Líquido para Ropa 20L' }],
            weekNumber: 1
        });

        expect(res.success).toBe(true);
        expect(res.tipSent).toBeDefined();
        expect(res.tipSent?.semana).toBe(1);
    });
});
