import { describe, it, expect } from 'vitest';
import { getProductBySlug } from '@/lib/product-utils';

describe('getProductBySlug — alias semánticos y enlaces de blog', () => {
    it('resuelve slug previo de blog "detergente-liquido-para-lavadora-y-ropa" al detergente multiusos', async () => {
        const p = await getProductBySlug('detergente-liquido-para-lavadora-y-ropa');
        expect(p).not.toBeNull();
        expect(p!.id).toBe('detergente-liquido-multiusos');
    });

    it('resuelve alias corto "detergente" al detergente multiusos', async () => {
        const p = await getProductBySlug('detergente');
        expect(p).not.toBeNull();
        expect(p!.id).toBe('detergente-liquido-multiusos');
    });

    it('resuelve alias "lavaloza" a lavaloza-liquido', async () => {
        const p = await getProductBySlug('lavaloza');
        expect(p).not.toBeNull();
        expect(p!.id).toBe('lavaloza-liquido');
    });

    it('resuelve alias "suavizante" al suavizante textil', async () => {
        const p = await getProductBySlug('suavizante');
        expect(p).not.toBeNull();
        expect(p!.id).toBe('suavizante');
    });

    it('resuelve alias "desengrasante" al desengrasante multiusos', async () => {
        const p = await getProductBySlug('desengrasante');
        expect(p).not.toBeNull();
        expect(p!.id).toBe('desengrasante');
    });

    it('resuelve alias "blanqueador" al blanqueador', async () => {
        const p = await getProductBySlug('blanqueador');
        expect(p).not.toBeNull();
        expect(p!.id).toBe('blanqueador');
    });

    it('resuelve alias "bactokill" a bactokill', async () => {
        const p = await getProductBySlug('bactokill');
        expect(p).not.toBeNull();
        expect(p!.id).toBe('bactokill');
    });

    it('retorna null para un slug completamente inexistente', async () => {
        const p = await getProductBySlug('producto-completamente-inventado-xyz-999');
        expect(p).toBeNull();
    });
});
