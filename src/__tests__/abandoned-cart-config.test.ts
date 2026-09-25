import { describe, it, expect } from 'vitest';
import { dueStep, cartSummary, cartFirstName, toWhatsappId, toMs } from '@/lib/abandoned-cart-config';

describe('abandoned cart steps', () => {
    it('due windows: 2h, 8h, 24h', () => {
        expect(dueStep(1.9, 0)).toBeNull();
        expect(dueStep(2, 0)).toBe(1);
        expect(dueStep(6.9, 0)).toBe(1);
        expect(dueStep(7.5, 0)).toBeNull();
        expect(dueStep(8, 1)).toBe(2);
        expect(dueStep(8, 0)).toBe(2);
        expect(dueStep(12.9, 1)).toBe(2);
        expect(dueStep(13, 1)).toBeNull();
        expect(dueStep(24, 2)).toBe(3);
        expect(dueStep(28.9, 2)).toBe(3);
        expect(dueStep(29, 2)).toBeNull();
    });
    it('never repeats a step already sent', () => {
        expect(dueStep(3, 1)).toBeNull();
        expect(dueStep(9, 2)).toBeNull();
        expect(dueStep(25, 3)).toBeNull();
    });
    it('old carts never get a stale reminder', () => {
        expect(dueStep(100, 0)).toBeNull();
        expect(dueStep(72, 1)).toBeNull();
    });
    it('summary and names', () => {
        expect(cartSummary([{ nombre: 'Detergente X', size: '20L', cantidad: 1 }])).toBe('Detergente X (20L)');
        expect(cartSummary([{ nombre: 'A', size: '10L' }, { nombre: 'B', size: '20L' }, { nombre: 'C', size: '1G' }])).toBe('A (10L) y 2 productos más');
        expect(cartSummary([])).toBe('tus productos de aseo');
        expect(cartFirstName('maría josé')).toBe('María');
        expect(cartFirstName('')).toBe('cliente');
        expect(cartFirstName('123')).toBe('cliente');
    });
    it('phones and timestamps', () => {
        expect(toWhatsappId('300 123 4567')).toBe('573001234567');
        expect(toWhatsappId('+57 (300) 123-4567')).toBe('573001234567');
        expect(toWhatsappId('12345')).toBeNull();
        expect(toMs({ seconds: 10 })).toBe(10000);
        expect(toMs('2026-01-01T00:00:00Z')).toBe(Date.parse('2026-01-01T00:00:00Z'));
    });
});
