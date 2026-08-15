/**
 * shipping-zones.ts
 * Fuente de verdad para las zonas de envío gratis y la matriz de subsidios
 * de Biocambio360 S.A.S. — Soacha, Cundinamarca.
 *
 * REGLAS DE NEGOCIO:
 * ─────────────────────────────────────────────────────────────────────────
 * ZONA LOCAL (flota propia, GRATIS):
 *   Municipios cubiertos por flota propia dentro del rango Soacha–Bogotá:
 *   Soacha, Sibaté, Bogotá D.C. (todas las localidades: Suba, Bosa, etc.),
 *   Cajicá, Chía, Cota, Mosquera, Madrid, Funza, Fusagasugá, Zipaquirá y
 *   municipios de la Sabana de Bogotá cuyo código DANE empieza por los
 *   prefijos de ZONA_LOCAL_DANE_PREFIXES.
 *
 * ZONA NACIONAL (99envios, con subsidio parcial):
 *   Cualquier municipio fuera de la zona local. El subsidio de fábrica
 *   reduce el flete del cliente, pero NUNCA puede dejarlo en $0 —
 *   eso solo ocurre en la zona local.
 *   El subsidio nacional tiene un tope fijo de $15.000 COP por pedido,
 *   sin importar el número de productos.
 * ─────────────────────────────────────────────────────────────────────────
 */

// ─── ZONA LOCAL — Flota propia Biocambio360, envío GRATIS ──────────────────
// Prefijos DANE: los códigos municipales que empiecen por estos prefijos
// son atendidos con la flota propia sin costo de envío para el cliente.
export const ZONA_LOCAL_DANE_PREFIXES = [
    '11001', // Bogotá D.C. (todas las localidades: Suba, Bosa, Kennedy, Usaqués, etc.)
    '25754', // Soacha
    '25755', // Sibaté
    '25126', // Cajicá
    '25175', // Chía
    '25290', // Funza
    '25214', // Cota
    '25473', // Mosquera
    '25430', // Madrid
    '25286', // Fusagasugá
    '25899', // Zipaquirá
    '25019', // Albán (Sabana Occidente)
    '25269', // El Rosal
    '25743', // Sibaté extra
    '25785', // Subachoque
];

// Lista de nombres de ciudad para validación de respaldo (cuando el DANE no es confiable)
export const ZONA_LOCAL_CIUDADES = [
    'SOACHA', 'SIBATE', 'SIBATÉ',
    'BOGOTA', 'BOGOTÁ',
    // Localidades de Bogotá más frecuentes (comparten código 11001000)
    'SUBA', 'BOSA', 'KENNEDY', 'USAQUEN', 'USAQUÉN', 'CHAPINERO', 'ENGATIVA',
    'ENGATIVÁ', 'FONTIBON', 'FONTIBÓN', 'CIUDAD BOLIVAR', 'CIUDAD BOLÍVAR',
    'TUNJUELITO', 'RAFAEL URIBE', 'SAN CRISTOBAL', 'SAN CRISTÓBAL',
    'SANTA FE', 'LOS MARTIRES', 'LOS MÁRTIRES', 'CANDELARIA', 'TEUSAQUILLO',
    'BARRIOS UNIDOS', 'PUENTE ARANDA', 'ANTONIO NARIÑO',
    // Sabana de Bogotá
    'CAJICA', 'CAJICÁ', 'CHIA', 'CHÍA', 'COTA', 'MOSQUERA',
    'MADRID', 'FUNZA', 'FUSAGASUGA', 'FUSAGASUGÁ', 'ZIPAQUIRA', 'ZIPAQUIRÁ',
    'EL ROSAL', 'SUBACHOQUE',
];

/** Tope máximo de subsidio para rutas NACIONALES (fuera de zona local).
 *  El subsidio NUNCA puede dejar el flete nacional en $0.
 *  Si el pedido es grande, la fábrica aporta máximo $15.000 al flete. */
export const SUBSIDIO_MAX_NACIONAL_COP = 15_000;

/**
 * Verifica si el destino cae dentro de la zona local (flota propia, envío gratis).
 * Usa el código DANE como fuente primaria.
 */
export function isZonaLocal(destinoCodigo: string): boolean {
    if (!destinoCodigo) return false;
    return ZONA_LOCAL_DANE_PREFIXES.some(prefix => destinoCodigo.startsWith(prefix));
}

/** @deprecated Usa isZonaLocal — mantenido por compatibilidad */
export const isVeciSoacha = isZonaLocal;

/**
 * Verifica si el destino cae dentro de la zona local por nombre de ciudad
 * (respaldo cuando el código DANE no está disponible).
 */
export function isZonaLocalPorCiudad(ciudad: string): boolean {
    if (!ciudad) return false;
    const upper = ciudad.toUpperCase().trim();
    return ZONA_LOCAL_CIUDADES.some(c => upper.includes(c));
}

/** @deprecated Usa isZonaLocalPorCiudad */
export const isVeciSoachaByCityName = isZonaLocalPorCiudad;

// ─── SUBSIDIO POR PESO (referencia interna, raramente usada) ────────────────
// Esta tabla se usa cuando no se tienen los sizes individuales de los items.
export const DEFAULT_SUBSIDIOS: Record<number, number> = {
    1: 1000,  2: 2000,  3: 4000,  4: 5000,  5: 6000,
    6: 8000,  7: 9000,  8: 10000, 9: 11000, 10: 12000,
    11: 14000, 12: 15000, 13: 16000, 14: 17000, 15: 18000,
    16: 20000, 17: 21000, 18: 22000, 19: 23000, 20: 12000,
    21: 13000, 22: 15000, 23: 16000, 24: 17000, 25: 18000,
    26: 20000, 27: 21000, 28: 22000, 29: 23000, 30: 24000,
    31: 25000, 32: 27000, 33: 28000, 34: 29000, 35: 30000,
    36: 32000, 37: 33000, 38: 34000, 39: 35000, 40: 24000,
};

export interface ItemSizeQty {
    size: string;
    cantidad: number;
}

/**
 * Calcula el subsidio BRUTO de fábrica por peso.
 * Sólo se usa internamente para zona local y como fallback.
 */
export function calcularSubsidio(totalWeightKg: number): number {
    const weight = Math.ceil(totalWeightKg);
    if (weight <= 0) return 0;
    if (weight <= 40 && DEFAULT_SUBSIDIOS[weight]) return DEFAULT_SUBSIDIOS[weight];

    const subsidio20kg = DEFAULT_SUBSIDIOS[20] || 12000;
    const numFullBultos = Math.floor(weight / 20);
    const remainder = weight % 20;
    return remainder === 0
        ? numFullBultos * subsidio20kg
        : numFullBultos * subsidio20kg + (DEFAULT_SUBSIDIOS[remainder] || 0);
}

/**
 * Calcula el subsidio BRUTO de fábrica según los tamaños de los items del pedido.
 * Este número representa el costo que la fábrica asumiría en una entrega local.
 * Para rutas nacionales, se aplica el tope SUBSIDIO_MAX_NACIONAL_COP externamente.
 */
export function calcularSubsidioReal(itemsSizes?: ItemSizeQty[], totalWeightKg?: number): number {
    if (itemsSizes && itemsSizes.length > 0) {
        return itemsSizes.reduce((total, item) => {
            let subsidioUnitario = 0;
            if (item.size === '20L')  subsidioUnitario = 12_000;
            else if (item.size === '10L')  subsidioUnitario = 12_000;
            else if (item.size === '3.8L') subsidioUnitario = 5_000;
            else if (item.size === '1L')   subsidioUnitario = 1_000;
            return total + subsidioUnitario * item.cantidad;
        }, 0);
    }
    return calcularSubsidio(totalWeightKg || 5);
}
