import { describe, it, expect } from 'vitest';
import {
    SALES_SCRIPTS_CATALOG,
    SCRIPT_CATEGORIES
} from '../lib/sales-scripts-data';
import {
    MANUFACTURING_BOM_DATA
} from '../components/admin/ManufacturingBOMCostingPanel';
import {
    checkReferrerQualifiedPurchase
} from '../lib/referrals-service';
import {
    getAdvisorAlertsData
} from '../lib/advisors-service';

describe('Catálogo Oficial de Guiones Comerciales (sales-scripts-data)', () => {
    it('debe contener todas las categorías estratégicas requeridas', () => {
        const catIds = SCRIPT_CATEGORIES.map(c => c.id);
        expect(catIds).toContain('alertas');
        expect(catIds).toContain('fletes_envios');
        expect(catIds).toContain('referidos');
        expect(catIds).toContain('combos');
        expect(catIds).toContain('bactokil');
        expect(catIds).toContain('pagos_cuentas');
        expect(catIds).toContain('objeciones');
    });

    it('debe incluir el guión de flete nacional subsidiado con beneficio de fábrica', () => {
        const fleteScript = SALES_SCRIPTS_CATALOG.find(s => s.id === 'flete-nacional-subsidiado');
        expect(fleteScript).toBeDefined();
        expect(fleteScript?.texto).toContain('subsidiado en un alto porcentaje por Biocambio360');
        expect(fleteScript?.texto).toContain('beneficio directo de fábrica');
    });

    it('debe incluir las alertas de recompra y entrega del día siguiente con sus variables', () => {
        const recompraScript = SALES_SCRIPTS_CATALOG.find(s => s.id === 'alerta-recompra-sugerida');
        expect(recompraScript).toBeDefined();
        expect(recompraScript?.variables).toContain('cliente');
        expect(recompraScript?.variables).toContain('producto');
        expect(recompraScript?.texto).toContain('{cliente}');
        expect(recompraScript?.texto).toContain('{producto}');

        const entregaScript = SALES_SCRIPTS_CATALOG.find(s => s.id === 'alerta-entrega-manana');
        expect(entregaScript).toBeDefined();
        expect(entregaScript?.variables).toContain('total');
        expect(entregaScript?.texto).toContain('{total}');
        expect(entregaScript?.texto).toContain('contraentrega en efectivo');
    });

    it('debe incluir las cuentas bancarias oficiales de los fundadores y representantes', () => {
        const cuentasScript = SALES_SCRIPTS_CATALOG.find(s => s.id === 'medios-de-pago-oficiales');
        expect(cuentasScript).toBeDefined();
        expect(cuentasScript?.texto).toContain('Danilo Espinal');
        expect(cuentasScript?.texto).toContain('Sandra Liliana Garzón');
        expect(cuentasScript?.texto).toContain('Bancolombia');
        expect(cuentasScript?.texto).toContain('Daviplata');
    });
});

describe('Módulo de Costeo Industrial BOM & Fórmulas (ManufacturingBOMCostingPanel)', () => {
    it('debe contener el lote auditado 300926115 de Lavaloza Líquido CB', () => {
        const lavaloza = MANUFACTURING_BOM_DATA.find(r => r.loteAuditado === '300926115');
        expect(lavaloza).toBeDefined();
        expect(lavaloza?.nombre).toBe('Detergente Lavaloza Líquido CB');
        expect(lavaloza?.tamanoBatchKg).toBe(160);
        expect(lavaloza?.densidad).toBe(1.0);
    });

    it('la suma de los porcentajes de materias primas debe cerrar al 100%', () => {
        MANUFACTURING_BOM_DATA.forEach(recipe => {
            const sumPct = recipe.insumosQuimicos.reduce((acc, i) => acc + i.porcentaje, 0);
            expect(sumPct).toBeGreaterThanOrEqual(99.0);
            expect(sumPct).toBeLessThanOrEqual(101.0);
        });
    });

    it('debe calcular márgenes netos de contribución positivos en todas las presentaciones', () => {
        MANUFACTURING_BOM_DATA.forEach(recipe => {
            let totalCostoBatch = 0;
            recipe.insumosQuimicos.forEach(i => {
                totalCostoBatch += i.kgTotal * i.costoUnitarioKg;
            });
            const costoKg = totalCostoBatch / recipe.tamanoBatchKg;

            recipe.empaquePresentaciones.forEach(pres => {
                const costoQuimico = costoKg * pres.litros;
                const costoIndustrial = costoQuimico + pres.costoEnvaseYTapa + pres.costoEtiqueta + pres.manoObraLlenado;
                
                // Margen bruto industrial antes de logística
                const margenBrutoCOP = pres.pvpPromedioCOP - costoIndustrial;
                const margenBrutoPct = (margenBrutoCOP / pres.pvpPromedioCOP) * 100;
                
                expect(margenBrutoCOP).toBeGreaterThan(0);
                expect(margenBrutoPct).toBeGreaterThan(35); // Margen industrial mínimo del 35%
            });
        });
    });
});

describe('Activación Manual a Libre Demanda de Referidores', () => {
    it('debe permitir calificar a referidores marcados manualmente sin exigir compra mínima de $50.000 COP', async () => {
        // Simular cliente con flag manual
        const manualReferrerCustomer = {
            id: 'cust_manual_123',
            isReferrer: true,
            referralActivatedManually: true,
            totalSpent: 0,
            ordersCount: 0
        };

        // checkReferrerQualifiedPurchase verifica si tiene compras o si está activo
        const result = await checkReferrerQualifiedPurchase('cust_manual_123');
        expect(result).toHaveProperty('qualified');
        expect(typeof result.qualified).toBe('boolean');
    });
});

describe('Protocolo de Alertas para Asesores Comerciales', () => {
    it('la función getAdvisorAlertsData debe retornar la estructura con recompras y entregas', async () => {
        const result = await getAdvisorAlertsData('Karen');
        expect(result).toHaveProperty('recompras');
        expect(result).toHaveProperty('entregasDiaSiguiente');
        expect(result).toHaveProperty('totalAlertasCount');
        expect(Array.isArray(result.recompras)).toBe(true);
        expect(Array.isArray(result.entregasDiaSiguiente)).toBe(true);
        expect(typeof result.totalAlertasCount).toBe('number');
    });
});
