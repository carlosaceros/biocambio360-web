import { describe, it, expect, vi } from 'vitest';
import {
    generateDynamicFindings,
    getMacroConsolidationData,
    getMonthlyInsightsHistory
} from '@/lib/monthly-insights-service';
import {
    formatDurationSeconds,
    recordOrderTimingSession,
    computeOrderTimingMetrics,
    generateSeedTimingSessions,
    OrderTimingSession
} from '@/lib/order-timing-service';
import { HISTORICAL_SALES_DATA, getAdvisorsPerformanceForMonth } from '@/lib/commercial-reports-data';

describe('Hallazgos Clave Dinámicos & Historial Macro (monthly-insights-service)', () => {
    it('debe generar exactamente los hallazgos de auditoría para Agosto 2026', () => {
        const advAug = getAdvisorsPerformanceForMonth(8, 2026);
        const monthAug = HISTORICAL_SALES_DATA.find(d => d.mesNumero === 8 && d.anio === 2026);

        const findings = generateDynamicFindings(8, 2026, advAug, monthAug);

        // 1. Concentración de Ventas
        expect(findings.concentracion.titulo).toBe('Concentración de Ventas');
        expect(findings.concentracion.asesores).toContain('Karen');
        expect(findings.concentracion.asesores).toContain('Katherine');
        expect(findings.concentracion.millones).toBe(85); // 49 + 36
        expect(findings.concentracion.porcentajeTotal).toBe(54); // 85 / 157 = 54%
        expect(findings.concentracion.descripcion).toContain('85 Millones (54%)');

        // 2. Cazadora de Nuevos (Hunter)
        expect(findings.hunter.asesor).toBe('Laura');
        expect(findings.hunter.clientesNuevos).toBe(49);
        expect(findings.hunter.porcentajeVentasNuevas).toBe(37);
        expect(findings.hunter.descripcion).toContain('Laura');
        expect(findings.hunter.descripcion).toContain('49 clientes nuevos');

        // 3. Alerta de Desempeño
        expect(findings.alerta.asesor).toBe('Camilo');
        expect(findings.alerta.porcentajeCumplimiento).toBe(9);
        expect(findings.alerta.facturadoMillones).toBe(3);
        expect(findings.alerta.ticketPromedioMil).toBe(65);
        expect(findings.alerta.titulo).toContain('Camilo al 9%');
        expect(findings.alerta.descripcion).toContain('$3M');
    });

    it('debe recalcular dinámicamente los hallazgos para Septiembre 2026 (mes en curso $53M)', () => {
        const advSep = getAdvisorsPerformanceForMonth(9, 2026);
        const monthSep = HISTORICAL_SALES_DATA.find(d => d.mesNumero === 9 && d.anio === 2026);

        const findings = generateDynamicFindings(9, 2026, advSep, monthSep);

        expect(findings.concentracion.millones).toBeLessThan(85);
        expect(findings.concentracion.porcentajeTotal).toBeGreaterThanOrEqual(50);
        expect(findings.hunter.asesor).toBe('Laura');
        expect(findings.alerta.asesor).toBe('Camilo');
    });

    it('debe consolidar correctamente el Tercer Trimestre Q3 2026 (Julio, Agosto, Septiembre)', () => {
        const q3 = getMacroConsolidationData('trimestre', 'Q3', 2026);

        expect(q3.periodType).toBe('trimestre');
        expect(q3.periodValue).toBe('Q3');
        expect(q3.mesesIncluidos).toEqual([7, 8, 9]);

        // Ventas: Julio (200) + Agosto (157) + Septiembre (53) = 410 Millones
        expect(q3.ventasTotalesMillones).toBe(410);
        expect(q3.metaTotalMillones).toBe(660); // 220 * 3
        expect(q3.porcentajeCumplimiento).toBe(62); // 410 / 660 = 62%
        expect(q3.clientesNuevosTotales).toBe(257 + 166 + 67); // 490

        // Asesores en Q3
        expect(q3.asesoresRendimientoPeriodo).toHaveLength(6);
        expect(q3.macroHallazgos.concentracion.topAsesores).toHaveLength(2);
        expect(q3.macroHallazgos.cazadorPeriodo.clientesNuevos).toBeGreaterThan(0);
        expect(q3.directricesEstrategicas.length).toBeGreaterThanOrEqual(3);
    });

    it('debe consolidar correctamente el Primer Semestre S1 2026 (Ene - Jun)', () => {
        const s1 = getMacroConsolidationData('semestre', 'S1', 2026);

        expect(s1.periodType).toBe('semestre');
        expect(s1.mesesIncluidos).toEqual([1, 2, 3, 4, 5, 6]);

        // Ventas S1: 157 + 164 + 176 + 188 + 147 + 164 = 996 Millones
        expect(s1.ventasTotalesMillones).toBe(996);
        expect(s1.metaTotalMillones).toBe(1320); // 220 * 6
        expect(s1.porcentajeCumplimiento).toBe(75); // 996 / 1320 = 75.45% -> 75%
        expect(s1.ticketPromedioPonderado).toBeGreaterThan(130000);
    });

    it('debe consolidar el consolidado Anual completo para 2025 (12 meses)', () => {
        const anio2025 = getMacroConsolidationData('anio', '2025', 2025);

        expect(anio2025.mesesIncluidos).toHaveLength(12);
        expect(anio2025.ventasTotalesMillones).toBe(1966); // Suma histórica 2025 (1,966M COP)
        expect(anio2025.pedidosTotales).toBeGreaterThan(14000);
        expect(anio2025.recompraMillones).toBeGreaterThan(1500);
    });

    it('debe recuperar el historial mensual cronológicamente ordenado', async () => {
        const history = await getMonthlyInsightsHistory();

        expect(history.length).toBeGreaterThanOrEqual(33); // 12 (2024) + 12 (2025) + 9 (2026)
        // El primero debe ser el mes más reciente (Septiembre 2026)
        expect(history[0].anio).toBe(2026);
        expect(history[0].mesNumero).toBe(9);
        expect(history[0].findings).toBeDefined();
        expect(history[0].findings.concentracion).toBeDefined();
    });
});

describe('Telemetría y Medición de Tiempos de Toma de Pedidos (order-timing-service)', () => {
    it('debe formatear duraciones en segundos de forma amigable para la interfaz', () => {
        expect(formatDurationSeconds(45)).toBe('45s');
        expect(formatDurationSeconds(60)).toBe('1m 0s');
        expect(formatDurationSeconds(105)).toBe('1m 45s');
        expect(formatDurationSeconds(192)).toBe('3m 12s');
        expect(formatDurationSeconds(0)).toBe('0s');
    });

    it('debe registrar y estructurar correctamente una sesión de toma de pedido', async () => {
        const startTime = Date.now() - 95 * 1000; // 95 segundos antes
        const endTime = Date.now();

        const session = await recordOrderTimingSession({
            sessionId: 'test_sess_karen_1',
            advisorName: 'Karen',
            advisorEmail: 'karen@biocambio360.com',
            startTime,
            endTime,
            status: 'guardado',
            orderId: 'ORD-TEST-999',
            orderTotal: 169900,
            itemsCount: 2,
            customerName: 'Supermercado El Sol',
            channel: 'asesor_whatsapp'
        });

        expect(session.id).toBe('timing_test_sess_karen_1');
        expect(session.advisorName).toBe('Karen');
        expect(session.durationSeconds).toBe(95);
        expect(session.durationFormatted).toBe('1m 35s');
        expect(session.status).toBe('guardado');
        expect(session.orderId).toBe('ORD-TEST-999');
        expect(session.diaSemana).toBeDefined();
        expect(session.hora).toBeGreaterThanOrEqual(0);
        expect(session.hora).toBeLessThanOrEqual(23);
        expect(session.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('debe calcular métricas operativas por asesor, hora, día y grupo general', () => {
        const mockSessions: OrderTimingSession[] = [
            {
                id: '1', sessionId: 's1', advisorName: 'Karen', startTime: '', endTime: '',
                durationSeconds: 90, durationFormatted: '1m 30s', status: 'guardado',
                orderTotal: 100000, itemsCount: 1, hora: 10, diaSemana: 'Lunes', fecha: '2026-09-19', timestamp: 1
            },
            {
                id: '2', sessionId: 's2', advisorName: 'Karen', startTime: '', endTime: '',
                durationSeconds: 110, durationFormatted: '1m 50s', status: 'guardado',
                orderTotal: 150000, itemsCount: 2, hora: 11, diaSemana: 'Lunes', fecha: '2026-09-19', timestamp: 2
            },
            {
                id: '3', sessionId: 's3', advisorName: 'Laura', startTime: '', endTime: '',
                durationSeconds: 180, durationFormatted: '3m 0s', status: 'guardado',
                orderTotal: 80000, itemsCount: 1, hora: 14, diaSemana: 'Martes', fecha: '2026-09-19', timestamp: 3
            },
            {
                id: '4', sessionId: 's4', advisorName: 'Laura', startTime: '', endTime: '',
                durationSeconds: 60, durationFormatted: '1m 0s', status: 'descartado',
                orderTotal: 0, itemsCount: 0, hora: 14, diaSemana: 'Martes', fecha: '2026-09-19', timestamp: 4
            }
        ];

        const metrics = computeOrderTimingMetrics(mockSessions);

        // Grupo General
        expect(metrics.totalSessions).toBe(4);
        expect(metrics.totalSaved).toBe(3);
        expect(metrics.totalDiscarded).toBe(1);
        expect(metrics.globalConversionRate).toBe(75); // 3 / 4 = 75%
        expect(metrics.globalAvgDurationSeconds).toBe(110); // (90+110+180+60)/4 = 110
        expect(metrics.globalAvgDurationFormatted).toBe('1m 50s');
        expect(metrics.globalMinDurationSeconds).toBe(60);
        expect(metrics.globalMaxDurationSeconds).toBe(180);

        // Por Asesor
        expect(metrics.byAdvisor).toHaveLength(2);
        // Karen debe ser la más rápida (promedio 100s vs Laura 120s)
        expect(metrics.byAdvisor[0].advisorName).toBe('Karen');
        expect(metrics.byAdvisor[0].avgDurationSeconds).toBe(100);
        expect(metrics.byAdvisor[0].conversionRate).toBe(100); // 2 de 2
        expect(metrics.fastestAdvisor.name).toBe('Karen');

        // Laura
        const lauraMetric = metrics.byAdvisor.find(a => a.advisorName === 'Laura');
        expect(lauraMetric?.conversionRate).toBe(50); // 1 guardado, 1 descartado
        expect(lauraMetric?.avgDurationSeconds).toBe(120);

        // Por Hora
        expect(metrics.byHour.length).toBeGreaterThan(0);
        const hora14 = metrics.byHour.find(h => h.hora === 14);
        expect(hora14?.totalSessions).toBe(2);

        // Por Día
        const lunes = metrics.byDay.find(d => d.diaSemana === 'Lunes');
        expect(lunes?.totalSessions).toBe(2);
        expect(lunes?.savedOrders).toBe(2);
    });

    it('la semilla representativa generateSeedTimingSessions debe contener sesiones balanceadas', () => {
        const seeded = generateSeedTimingSessions();

        expect(seeded.length).toBe(120);
        const advisorsPresent = new Set(seeded.map(s => s.advisorName));
        expect(advisorsPresent).toContain('Karen');
        expect(advisorsPresent).toContain('Katherine');
        expect(advisorsPresent).toContain('Andrea');
        expect(advisorsPresent).toContain('Diego');
        expect(advisorsPresent).toContain('Laura');
        expect(advisorsPresent).toContain('Camilo');

        // Validar que todas las duraciones sean positivas y con formato
        seeded.forEach(s => {
            expect(s.durationSeconds).toBeGreaterThan(0);
            expect(s.durationFormatted).toMatch(/^\d+[ms]/);
            expect(['guardado', 'borrador', 'descartado']).toContain(s.status);
        });
    });
});
