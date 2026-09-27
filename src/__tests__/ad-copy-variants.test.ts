import { describe, it, expect } from 'vitest';
import { pickAdVariant, AD_VARIANTS } from '@/lib/ad-copy-variants';

describe('ad copy variant assignment', () => {
    it('is stable for the same seed', () => {
        expect(pickAdVariant('wa_1_573000000000')).toBe(pickAdVariant('wa_1_573000000000'));
    });
    it('spreads across variants for different seeds', () => {
        const seen = new Set(Array.from({ length: 40 }, (_, i) => pickAdVariant(`conv_${i}`)));
        expect(seen.size).toBeGreaterThan(1);
        [...seen].forEach(v => expect(AD_VARIANTS).toContain(v));
    });
});
