import { describe, it, expect } from "vitest";
import {
    getMacroIndustrialSummary,
    getCompactBatchesIndex,
    searchIndustrialLots,
    getLotBOMBreakdown,
    filterAndConsolidateBatches,
    getSellInVsSellOutReconciliation
} from "@/lib/industrial-analytics-service";

describe("Inteligencia Industrial Big Data (2025 - 2026) & BOM Universal", () => {
    describe("1. Repositorio Maestro y Consolidado Macro Industrial", () => {
        it("debe cargar el resumen macro con más de 1,000,000 de litros y 2,500 batches", () => {
            const macro = getMacroIndustrialSummary();
            expect(macro).toBeDefined();
            expect(macro.totalBatches).toBeGreaterThanOrEqual(2500);
            expect(macro.totalVolumenLitros).toBeGreaterThan(1000000);
            expect(macro.totalCostoIndustrialCOP).toBeGreaterThan(3500000000);
            expect(macro.costoMedioLitroCOP).toBeGreaterThan(3000);
            expect(macro.margenBrutoGlobalPct).toBeGreaterThanOrEqual(25);
            expect(macro.rendimientoPromedioPct).toBeGreaterThanOrEqual(97);
        });

        it("debe contener consolidaciones anuales para 2025 y 2026", () => {
            const macro = getMacroIndustrialSummary();
            expect(macro.resumenPorAnio["2025"]).toBeDefined();
            expect(macro.resumenPorAnio["2026"]).toBeDefined();
            expect(macro.resumenPorAnio["2025"].batchesCount).toBeGreaterThan(1000);
            expect(macro.resumenPorAnio["2026"].batchesCount).toBeGreaterThan(1000);
        });

        it("debe incluir desglose de trimestres históricos 2025 y 2026", () => {
            const macro = getMacroIndustrialSummary();
            expect(macro.resumenPorTrimestre["2026-Q1"]).toBeDefined();
            expect(macro.resumenPorTrimestre["2026-Q2"]).toBeDefined();
            expect(macro.resumenPorTrimestre["2026-Q3"]).toBeDefined();
            expect(macro.resumenPorTrimestre["2025-Q3"]).toBeDefined();
        });
    });

    describe("2. Índice Compacto en Memoria y Búsqueda en Tiempo Real", () => {
        it("debe retornar más de 2,500 lotes en el índice compacto", () => {
            const index = getCompactBatchesIndex();
            expect(index.length).toBeGreaterThanOrEqual(2500);
        });

        it("debe buscar lotes por número de lote con tiempo de respuesta inmediato", () => {
            const results = searchIndustrialLots("300926115", 5);
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].lote).toBe("300926115");
        });

        it("debe buscar lotes por nombre de producto o categoría", () => {
            const detergentes = searchIndustrialLots("lavaloza", 10);
            expect(detergentes.length).toBeGreaterThan(0);
            expect(detergentes.some(d => d.producto.toLowerCase().includes("lavaloza"))).toBe(true);

            const suavizantes = searchIndustrialLots("suavizante", 10);
            expect(suavizantes.length).toBeGreaterThan(0);
        });
    });

    describe("3. Desglose Universal de BOM para Cualquier Lote", () => {
        it("debe reconstruir el BOM completo del lote 300926115 con insumos y empaque", () => {
            const bom = getLotBOMBreakdown("300926115")!;
            expect(bom).not.toBeNull();
            expect(bom.lote).toBe("300926115");
            expect(bom.volumenLitros).toBeGreaterThan(0);
            expect(bom.insumosQuimicos.length).toBeGreaterThan(0);
            expect(bom.costoQuimicoTotalCOP).toBeGreaterThan(0);
            expect(bom.costoTotalIndustrialCOP).toBeGreaterThan(0);
            expect(bom.controlCalidad).toBeDefined();
            expect(bom.controlCalidad.ph).toBe(9);
            expect(bom.especificacionesOficiales).toBeDefined();
        });

        it("debe calcular correctamente porcentajes de insumos y rendimientos", () => {
            const bom = getLotBOMBreakdown("300926115")!;
            expect(bom).not.toBeNull();
            const sumPorcentaje = bom.insumosQuimicos.reduce((acc, i) => acc + i.porcentaje, 0);
            expect(sumPorcentaje).toBeGreaterThan(90);
            expect(bom.rendimientoPct).toBeGreaterThanOrEqual(95);
            expect(bom.mermaPct).toBeLessThanOrEqual(5);
        });

        it("debe generar BOM para lotes de 2025 sin error", () => {
            const index = getCompactBatchesIndex();
            const batch2025 = index.find(b => b.anio === 2025)!;
            expect(batch2025).toBeDefined();

            const bom = getLotBOMBreakdown(batch2025.lote)!;
            expect(bom).not.toBeNull();
            expect(bom.anio).toBe(2025);
            expect(bom.costoTotalIndustrialCOP).toBeGreaterThan(0);
            expect(bom.margenBrutoPct).toBeGreaterThan(0);
        });
    });

    describe("4. Consolidado Dinámico por Rangos Temporales y Filtros", () => {
        it("debe filtrar y consolidar por año 2026", () => {
            const result = filterAndConsolidateBatches({ year: 2026 });
            expect(result.stats.totalBatches).toBeGreaterThan(1000);
            expect(result.stats.totalVolumenLitros).toBeGreaterThan(300000);
            expect(result.stats.distribucionCategorias.length).toBeGreaterThan(0);
            expect(result.stats.distribucionPresentaciones.length).toBeGreaterThan(0);
        });

        it("debe filtrar por trimestre Q1", () => {
            const result = filterAndConsolidateBatches({ quarter: "Q1" });
            expect(result.stats.totalBatches).toBeGreaterThan(0);
            expect(result.batches.every(b => b.trimestre.includes("Q1"))).toBe(true);
        });

        it("debe filtrar por categoría específica", () => {
            const result = filterAndConsolidateBatches({ category: "Detergentes" });
            expect(result.stats.totalBatches).toBeGreaterThan(0);
            expect(result.batches.every(b => b.categoria.toLowerCase().includes("detergente"))).toBe(true);
        });
    });

    describe("5. Conciliación Sell-In vs Sell-Out (Producción vs Ventas)", () => {
        it("debe calcular balance de inventario y rotación para 2026", () => {
            const conc = getSellInVsSellOutReconciliation(2026);
            expect(conc).toBeDefined();
            expect(conc.anio).toBe(2026);
            expect(conc.litrosElaboradosPlanta).toBeGreaterThan(0);
            expect(conc.litrosVendidosComercial).toBeGreaterThan(0);
            expect(conc.brechaStockRemanenteLitros).toBeGreaterThan(0);
            expect(conc.tasaRotacionInventarioDias).toBeGreaterThan(0);
            expect(conc.productosConciliados.length).toBeGreaterThan(0);
        });

        it("cada producto conciliado debe tener balance y estado de rotación válido", () => {
            const conc = getSellInVsSellOutReconciliation(2026);
            const first = conc.productosConciliados[0];
            expect(first.litrosFabricados).toBeGreaterThan(0);
            expect(first.litrosVendidos).toBeGreaterThan(0);
            expect(["Alta Rotación", "Estable", "Sobre-stock"]).toContain(first.estadoRotacion);
        });
    });
});
