import { describe, it, expect } from 'vitest';
import { wantsProductPhoto, matchRequestedSize } from '@/lib/product-card';
import type { Product } from '@/lib/products';

const product = { precios: { '1/2G': 19000, '3.8L': 34000, '10L': 57000, '20L': 86000 } } as unknown as Product;

describe('product photo requests', () => {
    it('detects a photo request', () => {
        expect(wantsProductPhoto('Me puede enviar la foto del galón')).toBe(true);
        expect(wantsProductPhoto('¿Tienen imagen del producto?')).toBe(true);
        expect(wantsProductPhoto('Cuánto cuesta el galón')).toBe(false);
    });
    it('matches the presentation named in the text', () => {
        expect(matchRequestedSize(product, 'la foto del galón')).toBe('3.8L');
        expect(matchRequestedSize(product, 'el de 20 litros')).toBe('20L');
        expect(matchRequestedSize(product, 'el de 10L')).toBe('10L');
        expect(matchRequestedSize(product, 'medio galón')).toBe('1/2G');
        expect(matchRequestedSize(product, 'no menciona tamaño')).toBeNull();
    });
});
