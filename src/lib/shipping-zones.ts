/**
 * shipping-zones.ts
 * Fuente de verdad para la matriz de subsidios por peso (KG vs TARIFA DE SUBSIDIO)
 * de BioCambio360 / Pajarito Web 2026.
 */

// Tabla Oficial de Subsidios por Peso (KG -> Subsidio en COP que la fábrica asume)
export const DEFAULT_SUBSIDIOS: Record<number, number> = {
    1: 1000, 2: 2000, 3: 4000, 4: 5000, 5: 6000, 6: 8000, 7: 9000, 8: 10000, 9: 11000, 10: 12000,
    11: 14000, 12: 15000, 13: 16000, 14: 17000, 15: 18000, 16: 20000, 17: 21000, 18: 22000, 19: 23000, 20: 12000,
    21: 13000, 22: 15000, 23: 16000, 24: 17000, 25: 18000, 26: 20000, 27: 21000, 28: 22000, 29: 23000, 30: 24000,
    31: 25000, 32: 27000, 33: 28000, 34: 29000, 35: 30000, 36: 32000, 37: 33000, 38: 34000, 39: 35000, 40: 24000
};

export const SOACHA_ZONE_PREFIXES = [
    '25754', '25755', '11001', '25126', '25175', '25290', '25214', '25473', '25430', '25286', '25899'
];

export const SOACHA_ZONE_CITIES = [
    'SOACHA', 'SIBATE', 'SIBATÉ', 'BOSA', 'BOGOTA', 'BOGOTÁ', 'CAJICA', 'CAJICÁ',
    'CHIA', 'CHÍA', 'FUSAGASUGA', 'FUSAGASUGÁ', 'COTA', 'MOSQUERA', 'MADRID', 'FUNZA', 'ZIPAQUIRA', 'ZIPAQUIRÁ'
];

export function isVeciSoacha(destinoCodigo: string): boolean {
    if (!destinoCodigo) return false;
    return SOACHA_ZONE_PREFIXES.some(prefix => destinoCodigo.startsWith(prefix));
}

export function isVeciSoachaByCityName(ciudad: string): boolean {
    if (!ciudad) return false;
    const upper = ciudad.toUpperCase().trim();
    return SOACHA_ZONE_CITIES.some(c => upper.includes(c));
}

/**
 * Retorna el subsidio acumulado según el peso en KG del pedido.
 */
export function calcularSubsidio(totalWeightKg: number): number {
    const weight = Math.ceil(totalWeightKg);
    if (weight <= 0) return 0;
    
    if (weight <= 40 && DEFAULT_SUBSIDIOS[weight]) {
        return DEFAULT_SUBSIDIOS[weight];
    }
    
    // Para pesos superiores a 40kg, calculamos bultos de 20kg ($12.000 de subsidio por garrafa de 20kg llena)
    const numFullBultos = Math.floor(weight / 20);
    const remainder = weight % 20;
    const subsidio20kg = DEFAULT_SUBSIDIOS[20] || 12000;

    if (remainder === 0) {
        return numFullBultos * subsidio20kg;
    }
    
    return (numFullBultos * subsidio20kg) + (DEFAULT_SUBSIDIOS[remainder] || 0);
}

export interface ItemSizeQty {
    size: string;
    cantidad: number;
}

export function calcularSubsidioReal(itemsSizes?: ItemSizeQty[], totalWeightKg?: number): number {
    if (itemsSizes && itemsSizes.length > 0) {
        return itemsSizes.reduce((total, item) => {
            let subsidioUnitario = 0;
            if (item.size === '20L') subsidioUnitario = 12000;
            else if (item.size === '10L') subsidioUnitario = 12000;
            else if (item.size === '3.8L') subsidioUnitario = 5000;
            else if (item.size === '1L') subsidioUnitario = 1000;
            
            return total + (subsidioUnitario * item.cantidad);
        }, 0);
    }
    return calcularSubsidio(totalWeightKg || 5);
}
