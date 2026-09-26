import { describe, it, expect } from 'vitest';
import { formatDayEs, routeDeliversOn, nextRouteDates, matchZones, buildScheduleContext, type DeliveryRoute } from '@/lib/delivery-schedule';

const route = (over: Partial<DeliveryRoute>): DeliveryRoute => ({ id: 'r', name: 'R', zones: ['Antonio Nariño', 'Rafael Uribe Uribe'], mode: 'dates', dates: { '2026-09': [1, 3, 7, 25, 29], '2026-10': [1, 5] }, active: true, driverName: 'SECRETO', driverPhone: '3000000000', ...over });

describe('delivery schedule', () => {
    it('always includes the weekday', () => {
        expect(formatDayEs('2026-09-25')).toBe('viernes 25 de septiembre');
        expect(formatDayEs('2026-10-01')).toBe('jueves 1 de octubre');
    });
    it('dates, daily, weekdays and validity', () => {
        expect(routeDeliversOn(route({}), '2026-09-25')).toBe(true);
        expect(routeDeliversOn(route({}), '2026-09-26')).toBe(false);
        expect(routeDeliversOn(route({ mode: 'daily' }), '2026-09-26')).toBe(true);
        expect(routeDeliversOn(route({ mode: 'weekdays', weekdays: [3] }), '2026-09-30')).toBe(true); // Wednesday
        expect(routeDeliversOn(route({ mode: 'weekdays', weekdays: [3] }), '2026-10-01')).toBe(false);
        expect(routeDeliversOn(route({ mode: 'daily', validTo: '2026-09-10' }), '2026-09-11')).toBe(false);
        expect(routeDeliversOn(route({ active: false }), '2026-09-25')).toBe(false);
    });
    it('next dates cross the month boundary', () => {
        expect(nextRouteDates(route({}), '2026-09-26', 3)).toEqual(['2026-09-29', '2026-10-01', '2026-10-05']);
    });
    it('matches zones with aliases', () => {
        const rs = [route({})];
        expect(matchZones(rs, 'vivo en Rafael Uribe').map(m => m.zone)).toEqual(['Rafael Uribe Uribe']);
        expect(matchZones(rs, 'estoy en el antonio nariño').length).toBe(1);
        expect(matchZones(rs, 'vivo en Chía').length).toBe(0);
        expect(matchZones([route({ zones: ['La Candelaria', 'Puente Aranda (después de Av 1 Mayo)'] })], 'cdad candelaria y pte aranda').length).toBe(2);
    });
    it('the agent context never leaks the driver', () => {
        const ctx = buildScheduleContext([route({})], 'Antonio Nariño', '2026-09-26');
        expect(ctx).toContain('sábado 26 de septiembre');
        expect(ctx).toContain('martes 29 de septiembre');
        expect(ctx).not.toMatch(/SECRETO|3000000000/);
        expect(buildScheduleContext([route({})], 'vivo en Bogotá', '2026-09-26')).toContain('pregúntale su localidad');
    });
});
