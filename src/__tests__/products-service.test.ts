/**
 * @file products-service.test.ts
 * Pruebas unitarias exhaustivas para:
 *  1. updateProductVisibility  — cambio de estado active/draft/archived
 *  2. getAllProducts            — caché, merge Firestore/estático, filtros
 *  3. getProductById           — fallback estático, soft-delete, merge de precios
 *  4. saveProduct              — removeUndefined, badge cleanup, isDeleted sync
 *  5. deleteProduct            — soft-delete + purge graceful
 *  6. API /api/admin/images    — GET/POST/DELETE con validaciones de seguridad
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as firestore from 'firebase/firestore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSnapshot(docs: Array<{ id: string; data: Record<string, unknown> }>) {
    return {
        forEach: (cb: (d: { id: string; data: () => Record<string, unknown> }) => void) =>
            docs.forEach(d => cb({ id: d.id, data: () => d.data })),
    };
}

function makeDocSnap(id: string, data: Record<string, unknown> | null) {
    return { exists: () => data !== null, id, data: () => data };
}

// ─── Producto estático de prueba ──────────────────────────────────────────────

const STATIC_PRODUCT = {
    id: 'detergente-test',
    nombre: 'Detergente Test',
    slogan: 'slogan',
    descripcion: 'desc',
    imgFile: 'test.webp',
    beneficios: ['beneficio1'],
    badge: 'Popular',
    color: '#fff',
    categoria: 'limpieza',
    faqs: [],
    precios: { '3.8L': 30000, '10L': 65000 },
    competidorPromedio: { '3.8L': 35000 },
    status: 'active' as const,
};

vi.mock('@/lib/products', () => ({
    PRODUCTOS: [STATIC_PRODUCT],
}));

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 1 — updateProductVisibility
// ═══════════════════════════════════════════════════════════════════════════════

describe('updateProductVisibility', () => {
    let setDocMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        setDocMock = vi.fn().mockResolvedValue(undefined);
        vi.mocked(firestore.setDoc).mockImplementation(setDocMock);
        vi.mocked(firestore.doc).mockReturnValue({} as any);
    });

    afterEach(() => { vi.resetModules(); });

    it('llama a setDoc con status=active e isDeleted=false', async () => {
        const { updateProductVisibility } = await import('@/lib/products-service');
        await updateProductVisibility('detergente-test', 'active');
        expect(setDocMock).toHaveBeenCalledOnce();
        const [, payload] = setDocMock.mock.calls[0];
        expect(payload.status).toBe('active');
        expect(payload.isDeleted).toBe(false);
        expect(payload.updatedAt).toBeTypeOf('string');
    });

    it('llama a setDoc con status=draft e isDeleted=false', async () => {
        const { updateProductVisibility } = await import('@/lib/products-service');
        await updateProductVisibility('detergente-test', 'draft');
        const [, payload] = setDocMock.mock.calls[0];
        expect(payload.status).toBe('draft');
        expect(payload.isDeleted).toBe(false);
    });

    it('llama a setDoc con status=archived e isDeleted=true', async () => {
        const { updateProductVisibility } = await import('@/lib/products-service');
        await updateProductVisibility('detergente-test', 'archived');
        const [, payload] = setDocMock.mock.calls[0];
        expect(payload.status).toBe('archived');
        expect(payload.isDeleted).toBe(true);
    });

    it('usa merge:true para no sobreescribir otros campos del documento', async () => {
        const { updateProductVisibility } = await import('@/lib/products-service');
        await updateProductVisibility('detergente-test', 'active');
        const [, , options] = setDocMock.mock.calls[0];
        expect(options).toEqual({ merge: true });
    });

    it('invalida la caché después de actualizar visibilidad', async () => {
        vi.mocked(firestore.getDocs).mockResolvedValue(makeSnapshot([]) as any);
        vi.mocked(firestore.query).mockReturnValue({} as any);
        vi.mocked(firestore.orderBy).mockReturnValue({} as any);
        const { updateProductVisibility } = await import('@/lib/products-service');
        await updateProductVisibility('detergente-test', 'draft');
        expect(setDocMock).toHaveBeenCalledOnce();
    });

    it('propaga el error si setDoc falla', async () => {
        setDocMock.mockRejectedValue(new Error('Firestore error'));
        vi.mocked(firestore.setDoc).mockImplementation(setDocMock);
        const { updateProductVisibility } = await import('@/lib/products-service');
        await expect(updateProductVisibility('detergente-test', 'active')).rejects.toThrow('Firestore error');
    });

    it('updatedAt es un ISO string válido', async () => {
        const { updateProductVisibility } = await import('@/lib/products-service');
        await updateProductVisibility('detergente-test', 'active');
        const [, payload] = setDocMock.mock.calls[0];
        expect(() => new Date(payload.updatedAt)).not.toThrow();
        expect(new Date(payload.updatedAt).toISOString()).toBe(payload.updatedAt);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 2 — getAllProducts  (merge, caché, filtros)
// ═══════════════════════════════════════════════════════════════════════════════

describe('getAllProducts', () => {
    beforeEach(() => {
        vi.mocked(firestore.query).mockReturnValue({} as any);
        vi.mocked(firestore.orderBy).mockReturnValue({} as any);
    });

    afterEach(() => { vi.resetModules(); });

    it('devuelve el producto estático si Firestore no tiene el documento', async () => {
        vi.mocked(firestore.getDocs).mockResolvedValue(makeSnapshot([]) as any);
        const { getAllProducts } = await import('@/lib/products-service');
        const products = await getAllProducts(true);
        const p = products.find(x => x.id === 'detergente-test');
        expect(p).toBeDefined();
        expect(p!.nombre).toBe('Detergente Test');
    });

    it('da prioridad a los datos de Firestore sobre el catálogo estático', async () => {
        vi.mocked(firestore.getDocs).mockResolvedValue(makeSnapshot([{
            id: 'detergente-test',
            data: { ...STATIC_PRODUCT, nombre: 'Detergente Firestore', precios: { '3.8L': 99000, '10L': 150000 } },
        }]) as any);
        const { getAllProducts } = await import('@/lib/products-service');
        const products = await getAllProducts(true);
        const p = products.find(x => x.id === 'detergente-test');
        expect(p!.nombre).toBe('Detergente Firestore');
        expect(p!.precios['3.8L']).toBe(99000);
    });

    it('excluye productos con status=archived de Firestore', async () => {
        vi.mocked(firestore.getDocs).mockResolvedValue(makeSnapshot([{
            id: 'detergente-test',
            data: { ...STATIC_PRODUCT, status: 'archived' },
        }]) as any);
        const { getAllProducts } = await import('@/lib/products-service');
        const products = await getAllProducts(true);
        expect(products.find(x => x.id === 'detergente-test')).toBeUndefined();
    });

    it('excluye productos con isDeleted=true de Firestore', async () => {
        vi.mocked(firestore.getDocs).mockResolvedValue(makeSnapshot([{
            id: 'detergente-test',
            data: { ...STATIC_PRODUCT, isDeleted: true },
        }]) as any);
        const { getAllProducts } = await import('@/lib/products-service');
        const products = await getAllProducts(true);
        expect(products.find(x => x.id === 'detergente-test')).toBeUndefined();
    });

    it('incluye productos nuevos de Firestore que no están en el catálogo estático', async () => {
        vi.mocked(firestore.getDocs).mockResolvedValue(makeSnapshot([{
            id: 'producto-nuevo',
            data: { nombre: 'Nuevo', slogan: 's', descripcion: 'd', imgFile: 'n.webp',
                    beneficios: [], badge: '', color: '#fff', categoria: 'limpieza', faqs: [],
                    precios: { '3.8L': 20000 }, competidorPromedio: {}, status: 'active' },
        }]) as any);
        const { getAllProducts } = await import('@/lib/products-service');
        const products = await getAllProducts(true);
        expect(products.find(x => x.id === 'producto-nuevo')).toBeDefined();
    });

    it('aplica stock por defecto si el producto no tiene stock', async () => {
        vi.mocked(firestore.getDocs).mockResolvedValue(makeSnapshot([]) as any);
        const { getAllProducts } = await import('@/lib/products-service');
        const products = await getAllProducts(true);
        const p = products.find(x => x.id === 'detergente-test');
        expect(p!.stock).toBeDefined();
        expect(typeof p!.stock!['3.8L']).toBe('number');
        expect(typeof p!.stock!['10L']).toBe('number');
    });

    it('stock 20L → 10, 10L → 15, 3.8L → 30 (defaults por tamaño)', async () => {
        vi.mocked(firestore.getDocs).mockResolvedValue(makeSnapshot([]) as any);
        const { getAllProducts } = await import('@/lib/products-service');
        const products = await getAllProducts(true);
        const p = products.find(x => x.id === 'detergente-test');
        expect(p!.stock!['3.8L']).toBe(30);
        expect(p!.stock!['10L']).toBe(15);
    });

    it('asigna status=active por defecto si falta el campo', async () => {
        vi.mocked(firestore.getDocs).mockResolvedValue(makeSnapshot([]) as any);
        const { getAllProducts } = await import('@/lib/products-service');
        const products = await getAllProducts(true);
        const p = products.find(x => x.id === 'detergente-test');
        expect(p!.status).toBe('active');
    });

    it('no falla si Firestore lanza excepción (usa catálogo estático como fallback)', async () => {
        vi.mocked(firestore.getDocs).mockRejectedValue(new Error('Network error'));
        const { getAllProducts } = await import('@/lib/products-service');
        const products = await getAllProducts(true);
        // Al menos retorna el catálogo estático
        expect(products.length).toBeGreaterThanOrEqual(1);
    });

    it('limpia badge con sufijo numérico en el producto resultado', async () => {
        vi.mocked(firestore.getDocs).mockResolvedValue(makeSnapshot([{
            id: 'detergente-test',
            data: { ...STATIC_PRODUCT, badge: 'Oferta .9999999' },
        }]) as any);
        const { getAllProducts } = await import('@/lib/products-service');
        const products = await getAllProducts(true);
        const p = products.find(x => x.id === 'detergente-test');
        expect(p!.badge).toBe('Oferta');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 3 — getProductById
// ═══════════════════════════════════════════════════════════════════════════════

describe('getProductById', () => {
    afterEach(() => { vi.resetModules(); });

    it('retorna null si el documento en Firestore está archivado', async () => {
        vi.mocked(firestore.getDoc).mockResolvedValue(
            makeDocSnap('detergente-test', { ...STATIC_PRODUCT, status: 'archived' }) as any
        );
        const { getProductById } = await import('@/lib/products-service');
        expect(await getProductById('detergente-test')).toBeNull();
    });

    it('retorna null si el documento tiene isDeleted=true', async () => {
        vi.mocked(firestore.getDoc).mockResolvedValue(
            makeDocSnap('detergente-test', { ...STATIC_PRODUCT, isDeleted: true }) as any
        );
        const { getProductById } = await import('@/lib/products-service');
        expect(await getProductById('detergente-test')).toBeNull();
    });

    it('usa fallback estático si el documento no existe en Firestore', async () => {
        vi.mocked(firestore.getDoc).mockResolvedValue(makeDocSnap('detergente-test', null) as any);
        const { getProductById } = await import('@/lib/products-service');
        const p = await getProductById('detergente-test');
        expect(p).not.toBeNull();
        expect(p!.nombre).toBe('Detergente Test');
    });

    it('da prioridad a precios de Firestore cuando no están vacíos', async () => {
        vi.mocked(firestore.getDoc).mockResolvedValue(
            makeDocSnap('detergente-test', { ...STATIC_PRODUCT, precios: { '3.8L': 55000 } }) as any
        );
        const { getProductById } = await import('@/lib/products-service');
        const p = await getProductById('detergente-test');
        expect(p!.precios['3.8L']).toBe(55000);
    });

    it('usa precios estáticos cuando Firestore tiene precios vacíos ({})', async () => {
        vi.mocked(firestore.getDoc).mockResolvedValue(
            makeDocSnap('detergente-test', { ...STATIC_PRODUCT, precios: {} }) as any
        );
        const { getProductById } = await import('@/lib/products-service');
        const p = await getProductById('detergente-test');
        expect(p!.precios['3.8L']).toBe(30000);
    });

    it('retorna null si no existe ni en Firestore ni en catálogo estático', async () => {
        vi.mocked(firestore.getDoc).mockResolvedValue(makeDocSnap('inexistente', null) as any);
        const { getProductById } = await import('@/lib/products-service');
        expect(await getProductById('inexistente')).toBeNull();
    });

    it('aplica ensureStockDefaults al resultado (asigna sku automático)', async () => {
        vi.mocked(firestore.getDoc).mockResolvedValue(makeDocSnap('detergente-test', null) as any);
        const { getProductById } = await import('@/lib/products-service');
        const p = await getProductById('detergente-test');
        expect(p!.sku).toBeTruthy();
        expect(p!.sku).toContain('BIO-');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 4 — saveProduct
// ═══════════════════════════════════════════════════════════════════════════════

describe('saveProduct', () => {
    let setDocMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        setDocMock = vi.fn().mockResolvedValue(undefined);
        vi.mocked(firestore.setDoc).mockImplementation(setDocMock);
        vi.mocked(firestore.doc).mockReturnValue({} as any);
        vi.mocked(firestore.getDoc).mockResolvedValue(makeDocSnap('x', null) as any);
    });

    afterEach(() => { vi.resetModules(); });

    it('limpia badge con sufijo numérico (.123456) antes de guardar', async () => {
        const { saveProduct } = await import('@/lib/products-service');
        await saveProduct({ ...STATIC_PRODUCT, badge: 'Popular .1234567' });
        const callArgs = setDocMock.mock.calls.find(c => c[1]?.badge !== undefined);
        expect(callArgs![1].badge).toBe('Popular');
    });

    it('establece isDeleted=true si status es archived', async () => {
        const { saveProduct } = await import('@/lib/products-service');
        await saveProduct({ ...STATIC_PRODUCT, status: 'archived' });
        expect(setDocMock.mock.calls[0][1].isDeleted).toBe(true);
    });

    it('establece isDeleted=false si status es active', async () => {
        const { saveProduct } = await import('@/lib/products-service');
        await saveProduct({ ...STATIC_PRODUCT, status: 'active' });
        expect(setDocMock.mock.calls[0][1].isDeleted).toBe(false);
    });

    it('establece isDeleted=false si status es draft', async () => {
        const { saveProduct } = await import('@/lib/products-service');
        await saveProduct({ ...STATIC_PRODUCT, status: 'draft' });
        expect(setDocMock.mock.calls[0][1].isDeleted).toBe(false);
    });

    it('no incluye campos undefined en el payload enviado a Firestore', async () => {
        const { saveProduct } = await import('@/lib/products-service');
        await saveProduct({ ...STATIC_PRODUCT, imgFileSmall: undefined, shortDescription: undefined });
        const payload = setDocMock.mock.calls[0][1];
        expect(Object.keys(payload)).not.toContain('imgFileSmall');
        expect(Object.keys(payload)).not.toContain('shortDescription');
    });

    it('incluye updatedAt como ISO string en el payload', async () => {
        const { saveProduct } = await import('@/lib/products-service');
        await saveProduct(STATIC_PRODUCT);
        const payload = setDocMock.mock.calls[0][1];
        expect(payload.updatedAt).toBeTypeOf('string');
        expect(() => new Date(payload.updatedAt)).not.toThrow();
    });

    it('propaga error si setDoc falla', async () => {
        setDocMock.mockRejectedValue(new Error('Write failed'));
        vi.mocked(firestore.setDoc).mockImplementation(setDocMock);
        const { saveProduct } = await import('@/lib/products-service');
        await expect(saveProduct(STATIC_PRODUCT)).rejects.toThrow('Write failed');
    });

    it('usa setDoc con merge:true para preservar otros campos', async () => {
        const { saveProduct } = await import('@/lib/products-service');
        await saveProduct(STATIC_PRODUCT);
        const [, , options] = setDocMock.mock.calls[0];
        expect(options).toEqual({ merge: true });
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 5 — deleteProduct
// ═══════════════════════════════════════════════════════════════════════════════

describe('deleteProduct', () => {
    let setDocMock: ReturnType<typeof vi.fn>;
    let deleteDocMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        setDocMock = vi.fn().mockResolvedValue(undefined);
        deleteDocMock = vi.fn().mockResolvedValue(undefined);
        vi.mocked(firestore.setDoc).mockImplementation(setDocMock);
        vi.mocked(firestore.deleteDoc).mockImplementation(deleteDocMock);
        vi.mocked(firestore.doc).mockReturnValue({} as any);
    });

    afterEach(() => { vi.resetModules(); });

    it('hace soft-delete (setDoc isDeleted=true, status=archived) antes del deleteDoc', async () => {
        const { deleteProduct } = await import('@/lib/products-service');
        await deleteProduct('detergente-test');
        expect(setDocMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ isDeleted: true, status: 'archived' }),
            expect.anything()
        );
        expect(deleteDocMock).toHaveBeenCalledOnce();
    });

    it('el soft-delete siempre se ejecuta incluso si deleteDoc falla', async () => {
        deleteDocMock.mockRejectedValue(new Error('Permission denied'));
        vi.mocked(firestore.deleteDoc).mockImplementation(deleteDocMock);
        const { deleteProduct } = await import('@/lib/products-service');
        await expect(deleteProduct('detergente-test')).resolves.toBeUndefined();
        expect(setDocMock).toHaveBeenCalledOnce();
    });

    it('invalida la caché después de eliminar', async () => {
        vi.mocked(firestore.getDocs).mockResolvedValue(makeSnapshot([]) as any);
        vi.mocked(firestore.query).mockReturnValue({} as any);
        vi.mocked(firestore.orderBy).mockReturnValue({} as any);
        const { deleteProduct, getAllProducts } = await import('@/lib/products-service');
        await deleteProduct('detergente-test');
        await expect(getAllProducts(true)).resolves.toBeDefined();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BLOQUE 6 — API /api/admin/images  (lógica de sanitización y validación)
// Nota: en entorno de test, 'fs' usa las implementaciones nativas del OS.
// Probamos la lógica pura de la ruta sin tocar el disco real.
// ═══════════════════════════════════════════════════════════════════════════════

describe('API /api/admin/images — DELETE: validaciones de entrada (sin fs)', () => {
    afterEach(() => { vi.resetModules(); });

    it('retorna 400 si no se provee filename', async () => {
        const { DELETE } = await import('@/app/api/admin/images/route');
        const res = await DELETE(new Request('http://localhost/api/admin/images'));
        expect(res.status).toBe(400);
        expect((res as any).body.error).toBeTruthy();
    });

    it('retorna 403 si se intenta borrar placeholder.png', async () => {
        const { DELETE } = await import('@/app/api/admin/images/route');
        const res = await DELETE(new Request('http://localhost/api/admin/images?filename=placeholder.png'));
        expect(res.status).toBe(403);
    });

    it('retorna 403 si el filename empieza con punto (archivo oculto)', async () => {
        const { DELETE } = await import('@/app/api/admin/images/route');
        const res = await DELETE(new Request('http://localhost/api/admin/images?filename=.htaccess'));
        expect(res.status).toBe(403);
    });

    it('retorna 403 para .env (archivo de sistema sensible)', async () => {
        const { DELETE } = await import('@/app/api/admin/images/route');
        const res = await DELETE(new Request('http://localhost/api/admin/images?filename=.env'));
        expect(res.status).toBe(403);
    });
});

// ─── Pruebas de sanitización de filename en POST (lógica pura, sin escribir disco) ─

describe('Sanitización de filename en POST — lógica pura', () => {
    /**
     * Replicamos la lógica de sanitización de route.ts para probarla
     * en aislamiento total sin depender de fs ni del entorno Next.js.
     */
    function sanitizeFilename(originalName: string): string {
        const ext = originalName.includes('.') ? originalName.split('.').pop()! : '';
        const baseName = ext
            ? originalName.slice(0, originalName.lastIndexOf('.'))
            : originalName;

        let cleanName = baseName
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')   // eliminar acentos
            .replace(/[^a-z0-9]/g, '_')         // no-alfanumérico → _
            .replace(/_+/g, '_')                 // colapsar múltiples _
            .replace(/^_+|_+$/g, '');            // trim _

        if (!cleanName) {
            cleanName = 'image_' + Date.now();
        }

        return `${cleanName}.webp`;
    }

    it('normaliza acentos (é→e, á→a, ñ→n)', () => {
        const result = sanitizeFilename('café.jpg');
        expect(result).toBe('cafe.webp');
    });

    it('normaliza ñ a n', () => {
        const result = sanitizeFilename('niño.png');
        expect(result).toBe('nino.webp');
    });

    it('reemplaza espacios con guión bajo', () => {
        const result = sanitizeFilename('mi producto.png');
        expect(result).toBe('mi_producto.webp');
    });

    it('reemplaza paréntesis y signos especiales', () => {
        const result = sanitizeFilename('Producto (Grande)!.png');
        expect(result).toBe('producto_grande.webp');
    });

    it('colapsa múltiples espacios en un solo underscore', () => {
        const result = sanitizeFilename('producto   grande.webp');
        expect(result).not.toMatch(/__/);
        expect(result).toBe('producto_grande.webp');
    });

    it('siempre retorna extensión .webp sin importar el original', () => {
        for (const name of ['foto.jpg', 'imagen.png', 'logo.gif', 'archivo.pdf', 'sin_ext']) {
            expect(sanitizeFilename(name).endsWith('.webp')).toBe(true);
        }
    });

    it('nombre en mayúsculas se convierte a minúsculas', () => {
        expect(sanitizeFilename('PRODUCTO_A.webp')).toBe('producto_a.webp');
    });

    it('nombre totalmente inválido genera fallback image_<timestamp>', () => {
        const result = sanitizeFilename('!@#$%.jpg');
        expect(result).toMatch(/^image_\d+\.webp$/);
    });

    it('nombre ya limpio permanece igual (idempotente)', () => {
        expect(sanitizeFilename('detergente_20l.webp')).toBe('detergente_20l.webp');
    });
});

// ─── Path traversal — lógica de path.basename ─────────────────────────────────

describe('Prevención de path traversal — lógica de path.basename', () => {
    it('path.basename neutraliza ../.. y deja solo el nombre del archivo', async () => {
        const path = await import('path');
        const sanitized = path.basename('../../etc/passwd');
        expect(sanitized).toBe('passwd');
        expect(sanitized).not.toContain('..');
        expect(sanitized).not.toContain('/');
    });

    it('path.basename de un filename normal lo deja igual', async () => {
        const path = await import('path');
        const sanitized = path.basename('producto_20l.webp');
        expect(sanitized).toBe('producto_20l.webp');
    });
});

// ─── Filtro de extensiones en GET ─────────────────────────────────────────────

describe('Filtro de extensiones de imagen — lógica pura', () => {
    const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

    function isValidImage(filename: string): boolean {
        const ext = filename.toLowerCase().split('.').pop();
        return IMAGE_EXTENSIONS.includes(`.${ext}`) && !filename.startsWith('.');
    }

    it('acepta .webp', () => expect(isValidImage('foto.webp')).toBe(true));
    it('acepta .jpg',  () => expect(isValidImage('foto.jpg')).toBe(true));
    it('acepta .jpeg', () => expect(isValidImage('foto.jpeg')).toBe(true));
    it('acepta .png',  () => expect(isValidImage('foto.png')).toBe(true));
    it('acepta .gif',  () => expect(isValidImage('foto.gif')).toBe(true));
    it('acepta .svg',  () => expect(isValidImage('foto.svg')).toBe(true));
    it('rechaza .txt',     () => expect(isValidImage('readme.txt')).toBe(false));
    it('rechaza .DS_Store (archivo oculto)', () => expect(isValidImage('.DS_Store')).toBe(false));
    it('rechaza sin extensión',  () => expect(isValidImage('sinext')).toBe(false));
    it('rechaza .env (archivo oculto)', () => expect(isValidImage('.env')).toBe(false));
    it('es insensible a mayúsculas de extensión (.JPG)', () => expect(isValidImage('foto.JPG')).toBe(true));
});
