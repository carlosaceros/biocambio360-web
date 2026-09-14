import { describe, it, expect } from 'vitest';
import {
    isZonaLocal,
    calcularFleteLocal,
    getCartPackagingAnalysis,
    SUBSIDIOS_POR_TALLA,
    MINIMO_DOMICILIARIO_LOCAL,
} from '@/lib/shipping-zones';
import { calcularPrecioCustomCombo } from '@/lib/combos';

describe('Reglas Oficiales de Envío Local (Bogotá y aledaños)', () => {
    it('reconoce códigos DANE de Bogotá y Sabana como zona local', () => {
        expect(isZonaLocal('11001000')).toBe(true); // Bogotá D.C.
        expect(isZonaLocal('25754000')).toBe(true); // Soacha
        expect(isZonaLocal('25175000')).toBe(true); // Chía
        expect(isZonaLocal('05001000')).toBe(false); // Medellín
        expect(isZonaLocal('76001000')).toBe(false); // Cali
    });

    it('tiene la matriz de subsidios/aportes oficial actualizada según la tabla', () => {
        expect(SUBSIDIOS_POR_TALLA['20L']).toBe(13_000);
        expect(SUBSIDIOS_POR_TALLA['10L']).toBe(13_000);
        expect(SUBSIDIOS_POR_TALLA['3.8L']).toBe(6_000);
        expect(SUBSIDIOS_POR_TALLA['1/2G']).toBe(3_000);
        expect(SUBSIDIOS_POR_TALLA['1L']).toBe(1_000);
        expect(SUBSIDIOS_POR_TALLA['500ML']).toBe(1_000);
        expect(MINIMO_DOMICILIARIO_LOCAL).toBe(13_000);
    });

    it('caso 1: Pedido de 1/2 Galón solo (como #qZHUXKzr, #jVDETRMM, #XwpCHZSm) DEBE cobrar $10.000 de flete', () => {
        const cart = [{ productId: 'desengrasante', size: '1/2G', cantidad: 1 }];
        const analysis = getCartPackagingAnalysis(cart);
        expect(analysis.subsidioBruto).toBe(3_000);

        const localShipping = calcularFleteLocal(analysis.subsidioBruto);
        expect(localShipping.fleteCliente).toBe(10_000);
        expect(localShipping.esGratis).toBe(false);
        expect(localShipping.subsidioFabrica).toBe(3_000);
    });

    it('caso 2: Pedido de 1 Galón 3.8L solo DEBE cobrar $7.000 de flete', () => {
        const cart = [{ productId: 'detergente', size: '3.8L', cantidad: 1 }];
        const analysis = getCartPackagingAnalysis(cart);
        expect(analysis.subsidioBruto).toBe(6_000);

        const localShipping = calcularFleteLocal(analysis.subsidioBruto);
        expect(localShipping.fleteCliente).toBe(7_000);
        expect(localShipping.esGratis).toBe(false);
        expect(localShipping.subsidioFabrica).toBe(6_000);
    });

    it('caso 3: Pedido de 1 Litro solo DEBE cobrar $12.000 de flete', () => {
        const cart = [{ productId: 'bactokill', size: '1L', cantidad: 1 }];
        const analysis = getCartPackagingAnalysis(cart);
        expect(analysis.subsidioBruto).toBe(1_000);

        const localShipping = calcularFleteLocal(analysis.subsidioBruto);
        expect(localShipping.fleteCliente).toBe(12_000);
        expect(localShipping.esGratis).toBe(false);
    });

    it('caso 4: Pedido de 2 Galones (3.8L x 2) DEBE cobrar $1.000 de flete', () => {
        const cart = [{ productId: 'detergente', size: '3.8L', cantidad: 2 }];
        const analysis = getCartPackagingAnalysis(cart);
        expect(analysis.subsidioBruto).toBe(12_000);

        const localShipping = calcularFleteLocal(analysis.subsidioBruto);
        expect(localShipping.fleteCliente).toBe(1_000);
        expect(localShipping.esGratis).toBe(false);
    });

    it('caso 5: Pedido de 1 Caneca 20L alcanza el mínimo garantizado de $13.000 y es GRATIS ($0)', () => {
        const cart = [{ productId: 'detergente', size: '20L', cantidad: 1 }];
        const analysis = getCartPackagingAnalysis(cart);
        expect(analysis.subsidioBruto).toBe(13_000);

        const localShipping = calcularFleteLocal(analysis.subsidioBruto);
        expect(localShipping.fleteCliente).toBe(0);
        expect(localShipping.esGratis).toBe(true);
    });

    it('caso 6: Pedido de 1 Garrafa 10L alcanza el mínimo garantizado de $13.000 y es GRATIS ($0)', () => {
        const cart = [{ productId: 'suavizante', size: '10L', cantidad: 1 }];
        const analysis = getCartPackagingAnalysis(cart);
        expect(analysis.subsidioBruto).toBe(13_000);

        const localShipping = calcularFleteLocal(analysis.subsidioBruto);
        expect(localShipping.fleteCliente).toBe(0);
        expect(localShipping.esGratis).toBe(true);
    });

    it('caso 7: Pedido mixto (20L + 20L + 3.8L como #ZHHWM0y3) supera con creces el mínimo y es GRATIS ($0)', () => {
        const cart = [
            { productId: 'detergente', size: '20L', cantidad: 1 },
            { productId: 'suavizante', size: '20L', cantidad: 1 },
            { productId: 'shampoo', size: '3.8L', cantidad: 1 },
        ];
        const analysis = getCartPackagingAnalysis(cart);
        // 13.000 + 13.000 + 6.000 = 32.000
        expect(analysis.subsidioBruto).toBe(32_000);

        const localShipping = calcularFleteLocal(analysis.subsidioBruto);
        expect(localShipping.fleteCliente).toBe(0);
        expect(localShipping.esGratis).toBe(true);
    });
});

describe('Reglas de Precios en "Arma tu Combo" (Opción B: Sin descuentos automáticos)', () => {
    it('no aplica descuentos automáticos del 5%, 7%, 10% ni 15% en combos personalizados', () => {
        // Mismo caso que el pedido #ZHHWM0y3
        const items = [
            { productId: 'detergente', size: '20L' as const, precio: 94_000, quantity: 1 },
            { productId: 'suavizante', size: '20L' as const, precio: 103_000, quantity: 1 },
            { productId: 'shampoo', size: '3.8L' as const, precio: 24_000, quantity: 1 },
        ];

        const resultado = calcularPrecioCustomCombo(items);

        // Subtotal oficial de catálogo: $221.000
        expect(resultado.precioOriginal).toBe(221_000);
        expect(resultado.precioCombo).toBe(221_000);
        expect(resultado.descuento).toBe(0);
        expect(resultado.porcentaje).toBe(0);
    });

    it('mantiene precio regular para 2, 4 o más items', () => {
        const items = [
            { productId: 'detergente', size: '20L' as const, precio: 94_000, quantity: 2 },
            { productId: 'suavizante', size: '10L' as const, precio: 66_000, quantity: 2 },
        ];

        const resultado = calcularPrecioCustomCombo(items);
        const subtotal = 94_000 * 2 + 66_000 * 2;
        expect(resultado.precioOriginal).toBe(subtotal);
        expect(resultado.precioCombo).toBe(subtotal);
        expect(resultado.descuento).toBe(0);
    });
});
