import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as firestore from 'firebase/firestore';
import {
    PLANT_FORMULAS,
    DEFAULT_FORMULAS,
    MASTER_BATCHES,
    searchBatches,
    getBatchByLot,
    getProductionStatistics,
    createProductionBatch,
    generateBatchLotNumber
} from '@/lib/production-service';

vi.mock('@/lib/firebase', () => ({
    db: {},
}));

vi.mock('firebase/firestore', () => {
    return {
        collection: vi.fn(),
        doc: vi.fn(),
        addDoc: vi.fn().mockResolvedValue({ id: 'mock-batch-123' }),
        setDoc: vi.fn().mockResolvedValue(undefined),
        getDoc: vi.fn(),
        getDocs: vi.fn().mockResolvedValue({ docs: [], empty: true }),
        updateDoc: vi.fn().mockResolvedValue(undefined),
        query: vi.fn(),
        where: vi.fn(),
        orderBy: vi.fn(),
        limit: vi.fn(),
        serverTimestamp: vi.fn(() => ({ toMillis: () => 1726000000000 })),
        Timestamp: {
            now: vi.fn(() => ({ toMillis: () => 1726000000000, seconds: 1726000000 })),
            fromMillis: vi.fn((m) => ({ toMillis: () => m })),
        },
    };
});

describe('Módulo Maestro de Producción, Fórmulas BOM y Trazabilidad INVIMA', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('1. Catálogo de Fórmulas Maestras de Planta (83 Recetas)', () => {
        it('debe contener las 83 fórmulas maestras de fábrica extraídas de FÓRMULAS', () => {
            expect(PLANT_FORMULAS.length).toBe(83);
            expect(DEFAULT_FORMULAS.length).toBe(83);
        });

        it('cada fórmula debe contener ingredientes, proporciones y parámetros fisicoquímicos', () => {
            const detergente = PLANT_FORMULAS.find(f => f.nombreProducto.toLowerCase().includes('detergente'));
            expect(detergente).toBeDefined();
            expect(detergente!.ingredientes.length).toBeGreaterThan(0);
            expect(detergente!.phTeoricoMin).toBeDefined();
            expect(detergente!.phTeoricoMax).toBeDefined();
            expect(detergente!.densidadTeorica).toBeDefined();
            expect(detergente!.categoria).toBeDefined();
        });

        it('debe incluir líneas esenciales: Suavizantes, Desengrasantes, Jabones, Limpiapisos', () => {
            const categories = new Set(PLANT_FORMULAS.map(f => f.categoria));
            expect(categories.has('Detergentes')).toBe(true);
            expect(categories.has('Suavizantes')).toBe(true);
            expect(categories.has('Desengrasantes')).toBe(true);
            expect(categories.has('Limpiapisos')).toBe(true);
            expect(categories.has('Ambientadores y Aromas')).toBe(true);
        });
    });

    describe('2. Histórico de Lotes Reales de Producción (2,563 Lotes)', () => {
        it('debe contener el consolidado de lotes reales de PRODUCCIÓN APP y SGC', () => {
            expect(MASTER_BATCHES.length).toBeGreaterThanOrEqual(2500);
        });

        it('cada lote debe tener número de lote, producto, volumen y fecha', () => {
            const sample = MASTER_BATCHES[0];
            expect(sample.numeroLote).toBeDefined();
            expect(sample.nombreProducto).toBeDefined();
            expect(sample.volumenPlaneadoLitros).toBeGreaterThan(0);
            expect(sample.fechaInicio).toBeDefined();
            expect(sample.estado).toBe('aprobado');
        });
    });

    describe('3. Motor de Búsqueda y Trazabilidad Inversa INVIMA', () => {
        it('debe encontrar lotes emblemáticos por número de lote exacto', () => {
            const batch = getBatchByLot('300926122');
            expect(batch).toBeDefined();
            expect(batch!.numeroLote).toBe('300926122');
            expect(batch!.materiasPrimasConsumidas.length).toBeGreaterThan(0);
        });

        it('debe buscar lotes por nombre de producto u operario', () => {
            const results = searchBatches('Detergente', MASTER_BATCHES);
            expect(results.length).toBeGreaterThan(10);

            const andresBatches = searchBatches('ANDRES', MASTER_BATCHES);
            expect(andresBatches.length).toBeGreaterThan(0);
        });

        it('debe retornar null para lotes inexistentes', () => {
            const batch = getBatchByLot('LOTE-INEXISTENTE-999999');
            expect(batch).toBeNull();
        });
    });

    describe('4. Estadísticas Agregadas de Planta', () => {
        it('debe calcular volumen total, distribución 2026 vs 2025 y top de productos', () => {
            const stats = getProductionStatistics(MASTER_BATCHES);
            expect(stats.totalBatches).toBe(MASTER_BATCHES.length);
            expect(stats.totalLiters).toBeGreaterThan(1000000);
            expect(stats.batches2026).toBeGreaterThan(1000);
            expect(stats.batches2025).toBeGreaterThan(1000);
            expect(stats.complianceRate).toBe(99.8);
            expect(stats.topProducts.length).toBeGreaterThan(0);
        });
    });

    describe('5. Generación de Nuevos Batches', () => {
        it('debe crear un nuevo lote con explosión BOM de materiales y guardar en Firestore', async () => {
            const newBatch = await createProductionBatch({
                formulaId: PLANT_FORMULAS[0].id,
                productId: PLANT_FORMULAS[0].productId,
                nombreProducto: PLANT_FORMULAS[0].nombreProducto,
                volumenPlaneadoLitros: 2000,
                tanqueOMezclador: 'Tanque Mezclador #1 (2,500 L)',
                responsablePlanta: 'Jefe de Planta Soacha'
            });

            expect(newBatch).toBeDefined();
            expect(newBatch.numeroLote).toBeDefined();
            expect(newBatch.volumenPlaneadoLitros).toBe(2000);
            expect(newBatch.materiasPrimasConsumidas.length).toBeGreaterThan(0);
            expect(firestore.addDoc).toHaveBeenCalledTimes(1);
        });
    });
});
