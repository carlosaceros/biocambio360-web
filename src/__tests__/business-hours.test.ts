import { describe, it, expect } from 'vitest';
import { isHumanOnline, isColombianHoliday, nextOpening, shiftKey } from '@/lib/business-hours';

// Bogotá = UTC-5 (no DST)
const bog = (iso: string) => new Date(`${iso}-05:00`);

describe('business hours', () => {
    it('weekday schedule', () => {
        expect(isHumanOnline(bog('2026-09-21T05:59:00'))).toBe(false); // Mon
        expect(isHumanOnline(bog('2026-09-21T06:00:00'))).toBe(true);
        expect(isHumanOnline(bog('2026-09-21T20:59:00'))).toBe(true);
        expect(isHumanOnline(bog('2026-09-21T21:00:00'))).toBe(false);
        expect(isHumanOnline(bog('2026-09-24T20:00:00'))).toBe(false); // Thu closes 8
        expect(isHumanOnline(bog('2026-09-25T19:00:00'))).toBe(false); // Fri closes 7
        expect(isHumanOnline(bog('2026-09-25T18:59:00'))).toBe(true);
    });
    it('saturday and sunday', () => {
        expect(isHumanOnline(bog('2026-09-26T06:30:00'))).toBe(false); // Sat opens 7
        expect(isHumanOnline(bog('2026-09-26T07:00:00'))).toBe(true);
        expect(isHumanOnline(bog('2026-09-26T19:00:00'))).toBe(false);
        expect(isHumanOnline(bog('2026-09-27T08:59:00'))).toBe(false); // Sun opens 9
        expect(isHumanOnline(bog('2026-09-27T09:00:00'))).toBe(true);
        expect(isHumanOnline(bog('2026-09-27T18:00:00'))).toBe(false);
    });
    it('colombian holidays 2026', () => {
        const h = (y: number, m: number, d: number) => isColombianHoliday(new Date(Date.UTC(y, m - 1, d)));
        expect(h(2026, 1, 12)).toBe(true); // Reyes moved
        expect(h(2026, 3, 23)).toBe(true); // San José moved
        expect(h(2026, 4, 2)).toBe(true); // Holy Thursday
        expect(h(2026, 4, 3)).toBe(true);
        expect(h(2026, 5, 18)).toBe(true); // Ascension
        expect(h(2026, 6, 8)).toBe(true); // Corpus
        expect(h(2026, 6, 15)).toBe(true); // Sagrado Corazón
        expect(h(2026, 7, 20)).toBe(true);
        expect(h(2026, 8, 17)).toBe(true); // Asunción moved
        expect(h(2026, 10, 12)).toBe(true);
        expect(h(2026, 11, 16)).toBe(true); // Cartagena moved
        expect(h(2026, 9, 21)).toBe(false);
        // holiday on a Monday uses Sunday hours
        expect(isHumanOnline(bog('2026-07-20T07:00:00'))).toBe(false);
        expect(isHumanOnline(bog('2026-07-20T09:00:00'))).toBe(true);
    });
    it('next opening', () => {
        expect(nextOpening(bog('2026-09-21T22:00:00')).when).toBe('mañana a las 6:00 a.m.');
        expect(nextOpening(bog('2026-09-21T03:00:00')).label).toBe('hoy desde las 6:00 a.m.');
        expect(nextOpening(bog('2026-09-26T20:00:00')).when).toBe('mañana a las 9:00 a.m.'); // Sat night → Sunday
        expect(nextOpening(bog('2026-09-27T19:00:00')).when).toBe('mañana a las 6:00 a.m.');
        expect(nextOpening(bog('2026-09-25T20:00:00')).when).toBe('mañana a las 7:00 a.m.'); // Fri night → Sat
    });
    it('shift key spans midnight', () => {
        expect(shiftKey(bog('2026-09-21T23:00:00'))).toBe('2026-09-21');
        expect(shiftKey(bog('2026-09-22T02:00:00'))).toBe('2026-09-21');
    });
});
