import { describe, it, expect } from 'vitest';
import { CUSTOMERS_MACRO_STATS, COMPACT_CUSTOMERS_TOP_INDEX } from '../lib/integrated-customers-summary';
import { getCustomersWithPagination } from '../lib/customers-service';
import {
    RAW_SALES_SCRIPTS_CATALOG,
    SALES_SCRIPT_CATEGORIES,
    getLiveCatalogPrices,
    compileSalesScript,
    getAllCompiledSalesScripts,
    formatScriptCurrency
} from '../lib/sales-scripts-catalog-service';

describe('Big Data Customers Ingestion & Consolidation (31,270 clientes)', () => {
    it('debe tener las macro estadísticas de 31.270 clientes únicos consolidados', () => {
        expect(CUSTOMERS_MACRO_STATS.totalUniqueCustomers).toBeGreaterThanOrEqual(31000);
        expect(CUSTOMERS_MACRO_STATS.activeClientsPool).toBeGreaterThanOrEqual(3700);
        expect(CUSTOMERS_MACRO_STATS.withPurchasesCount).toBeGreaterThanOrEqual(4000);
        expect(CUSTOMERS_MACRO_STATS.unassignedCount).toBeGreaterThanOrEqual(31000);
    });

    it('el índice compacto superior debe contener registros limpios con teléfonos válidos', () => {
        expect(COMPACT_CUSTOMERS_TOP_INDEX.length).toBeGreaterThan(500);
        const sample = COMPACT_CUSTOMERS_TOP_INDEX[0];
        expect(sample).toBeDefined();
        expect(sample.celular).toBeDefined();
        expect(sample.celular.length).toBe(10);
        expect(sample.nombre).toBeDefined();
    });

    it('la paginación no debe tener el límite rígido de 500 y debe soportar páginas y tamaños dinámicos', async () => {
        const page1 = await getCustomersWithPagination({ page: 1, limit: 25 });
        expect(page1.customers.length).toBe(25);
        expect(page1.totalCount).toBeGreaterThan(1000);
        expect(page1.totalPages).toBeGreaterThan(40);
        expect(page1.page).toBe(1);

        const page2 = await getCustomersWithPagination({ page: 2, limit: 25 });
        expect(page2.customers.length).toBe(25);
        expect(page2.page).toBe(2);

        // Los clientes de página 1 y página 2 deben ser diferentes
        expect(page1.customers[0].id).not.toBe(page2.customers[0].id);
    });

    it('debe filtrar correctamente por solo activos SGC', async () => {
        const res = await getCustomersWithPagination({ activeOnly: true, limit: 50 });
        expect(res.customers.length).toBeGreaterThan(0);
        res.customers.forEach(c => {
            expect(c.activo).toBe(true);
        });
    });

    it('debe filtrar clientes por término de búsqueda (nombre, celular o cédula)', async () => {
        const topClient = COMPACT_CUSTOMERS_TOP_INDEX[0];
        const searchPhone = topClient.celular;

        const res = await getCustomersWithPagination({ search: searchPhone });
        expect(res.customers.length).toBeGreaterThan(0);
        const match = res.customers.find(c => c.celular === searchPhone);
        expect(match).toBeDefined();
    });
});

describe('Motor de Guiones de Venta Word 2025 Dinámico (sales-scripts-catalog-service)', () => {
    it('debe contener las 9 categorías oficiales de comunicación', () => {
        const catIds = SALES_SCRIPT_CATEGORIES.map(c => c.id);
        expect(catIds).toContain('alertas_entrega');
        expect(catIds).toContain('alertas_recompra');
        expect(catIds).toContain('productos_precios');
        expect(catIds).toContain('combos_promociones');
        expect(catIds).toContain('fletes_cobertura');
        expect(catIds).toContain('pagos_cuentas');
        expect(catIds).toContain('objeciones_confianza');
        expect(catIds).toContain('programa_referidos');
        expect(catIds).toContain('toma_pedido');
    });

    it('debe extraer los precios dinámicos actuales de la tienda virtual en vivo', () => {
        const livePrices = getLiveCatalogPrices();
        expect(livePrices.detergente20L).toBe(86000);
        expect(livePrices.detergenteGalon).toBe(34000); // 3.8L en tienda
        expect(livePrices.detergenteLitro).toBe(4300); // 86000 / 20
        expect(livePrices.desengrasante20L).toBe(83000); // Desengrasante 20L en tienda
        expect(livePrices.desengrasanteLitro).toBe(4150); // 83000 / 20
        expect(livePrices.comboDuo).toBe(119000);
        expect(livePrices.llaveRegistro).toBe(19000);
    });

    it('debe compilar guiones dinámicamente sustituyendo variables y precios SIN IA', () => {
        const scriptDetergente = RAW_SALES_SCRIPTS_CATALOG.find(s => s.id === 'producto-detergente-ropa-20l');
        expect(scriptDetergente).toBeDefined();

        const compiled = compileSalesScript(scriptDetergente!, {
            cliente: 'Carlos Rodríguez',
            asesor: 'Katherine'
        });

        // Debe contener los datos del cliente y asesor
        expect(compiled).toContain('Carlos Rodríguez');
        expect(compiled).toContain('Katherine');

        // Debe contener el precio en vivo actualizado del catálogo ($86.000 y $4.300)
        expect(compiled).toContain('$86.000');
        expect(compiled).toContain('$4.300');

        // No debe tener los marcadores sin compilar
        expect(compiled).not.toContain('{cliente}');
        expect(compiled).not.toContain('{asesor}');
        expect(compiled).not.toContain('{precio_detergente_20l}');
        expect(compiled).not.toContain('{precio_detergente_litro}');
    });

    it('debe compilar correctamente la alerta de despacho para entrega mañana con total y método de pago', () => {
        const scriptEntrega = RAW_SALES_SCRIPTS_CATALOG.find(s => s.id === 'alerta-entrega-manana');
        expect(scriptEntrega).toBeDefined();

        const compiled = compileSalesScript(scriptEntrega!, {
            cliente: 'María Fernanda Gómez',
            total: 119000,
            direccion: 'Calle 127 # 15-40',
            ciudad: 'Bogotá'
        });

        expect(compiled).toContain('María Fernanda Gómez');
        expect(compiled).toContain('$119.000');
        expect(compiled).toContain('Calle 127 # 15-40');
        expect(compiled).toContain('Pago contraentrega');
        expect(compiled).toContain('UBICACIÓN ACTUAL POR WHATSAPP');
    });

    it('debe compilar el guion de flete nacional subsidiado con beneficio de fábrica', () => {
        const scriptFlete = RAW_SALES_SCRIPTS_CATALOG.find(s => s.id === 'flete-nacional-subsidiado');
        expect(scriptFlete).toBeDefined();

        const compiled = compileSalesScript(scriptFlete!, {
            cliente: 'Andrés Morales',
            asesor: 'Diego'
        });

        expect(compiled).toContain('subsidiamos la mayor parte del costo del flete nacional');
        expect(compiled).toContain('beneficio directo de fábrica');
    });

    it('debe compilar las cuentas oficiales de consignación para confianza total del cliente', () => {
        const scriptCuentas = RAW_SALES_SCRIPTS_CATALOG.find(s => s.id === 'medios-de-pago-oficiales');
        expect(scriptCuentas).toBeDefined();

        const compiled = compileSalesScript(scriptCuentas!, {
            cliente: 'Liliana Mejía',
            asesor: 'Karen'
        });

        expect(compiled).toContain('Danilo Espinal');
        expect(compiled).toContain('Sandra Liliana Garzón');
        expect(compiled).toContain('Bancolombia');
        expect(compiled).toContain('Daviplata');
    });

    it('getAllCompiledSalesScripts debe compilar todo el catálogo sin excepciones en 0ms', () => {
        const compiledAll = getAllCompiledSalesScripts({
            cliente: 'Prueba Universal',
            asesor: 'Asesor Líder'
        });

        expect(compiledAll.length).toBe(RAW_SALES_SCRIPTS_CATALOG.length);
        compiledAll.forEach(item => {
            expect(item.textoCompilado).toBeDefined();
            expect(item.textoCompilado.length).toBeGreaterThan(20);
            if (item.template.includes('{cliente}')) {
                expect(item.textoCompilado).toContain('Prueba Universal');
            }
            if (item.template.includes('{asesor}')) {
                expect(item.textoCompilado).toContain('Asesor Líder');
            }
        });
    });
});
