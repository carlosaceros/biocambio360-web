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

// ─── PESOS Y SUBSIDIOS POR PRESENTACIÓN ─────────────────────────────────────
// Fuente de verdad comercial (Soacha 2026):
// 20L / 10L: Subsidio fábrica $12.000 COP
// 3.8L (Galón): Subsidio fábrica $6.000 COP
// 1/2G (Medio Galón): Subsidio fábrica $3.000 COP
// 1L: Subsidio fábrica $1.000 COP
// 500ML / 60ML: Subsidio fábrica $500 / $200 COP

export const PESOS_POR_TALLA: Record<string, number> = {
    '1L': 1.0,
    '1KG': 1.0,
    '1/2G': 1.9,
    '3.8L': 3.8,
    '4KG': 4.0,
    '10L': 10.0,
    '10KG': 10.0,
    '15L': 15.0,
    '20L': 20.0,
    '20KG': 20.0,
    '500ML': 0.5,
    '60ML': 0.1,
};

export const SUBSIDIOS_POR_TALLA: Record<string, number> = {
    '20L': 12_000,
    '20KG': 12_000,
    '10L': 12_000,
    '10KG': 12_000,
    '15L': 12_000,
    '3.8L': 6_000,
    '4KG': 6_000,
    '1/2G': 3_000,
    '1L': 1_000,
    '1KG': 1_000,
    '500ML': 500,
    '60ML': 200,
};

export const DEFAULT_SUBSIDIOS: Record<number, number> = {
    1: 1000,  2: 2000,  3: 4000,  4: 6000,  5: 6000,
    6: 8000,  7: 9000,  8: 10000, 9: 11000, 10: 12000,
    11: 14000, 12: 15000, 13: 16000, 14: 17000, 15: 18000,
    16: 20000, 17: 21000, 18: 22000, 19: 23000, 20: 12000,
    21: 13000, 22: 15000, 23: 16000, 24: 18000, 25: 18000,
    26: 20000, 27: 21000, 28: 22000, 29: 23000, 30: 24000,
    31: 25000, 32: 30000, 33: 30000, 34: 30000, 35: 30000,
    36: 32000, 37: 33000, 38: 34000, 39: 35000, 40: 24000,
};

// ─── COMPOSICIÓN EXACTA DE KITS Y COMBOS ────────────────────────────────────
export interface KitComponent {
    size: string;
    cantidad: number;
    weightKg: number;
    subsidioUnitario: number;
}

export interface KitSpec {
    nombre: string;
    components: KitComponent[];
    totalWeightKg: number;
    totalSubsidio: number;
    bultosSugeridos: number;
}

export const KIT_COMPOSITION_MAP: Record<string, KitSpec> = {
    // 1. Combo Dúo 10L/10L (20L Totales)
    'kit-combo-duo-10-10-detergente-desengrasante': {
        nombre: 'Combo Dúo 10L/10L',
        components: [{ size: '10L', cantidad: 2, weightKg: 10.0, subsidioUnitario: 12_000 }],
        totalWeightKg: 20.0,
        totalSubsidio: 24_000,
        bultosSugeridos: 1,
    },
    // 2. Kit Completo #1 (Detergente 20L + Suavizante Galón + Desengrasante 1/2 Galón + Bactokill 1L)
    'kit-limpieza-completo-1-20l': {
        nombre: 'Kit Completo #1 (20L + Galón + 1/2G + 1L)',
        components: [
            { size: '20L', cantidad: 1, weightKg: 20.0, subsidioUnitario: 12_000 },
            { size: '3.8L', cantidad: 1, weightKg: 3.8, subsidioUnitario: 6_000 },
            { size: '1/2G', cantidad: 1, weightKg: 1.9, subsidioUnitario: 3_000 },
            { size: '1L', cantidad: 1, weightKg: 1.0, subsidioUnitario: 1_000 },
        ],
        totalWeightKg: 26.7,
        totalSubsidio: 22_000,
        bultosSugeridos: 2,
    },
    // 3. Combo Lavandería y Cocina (10L + 1/2G + 1/2G + 1L)
    'kit-combo-lavanderia-cocina': {
        nombre: 'Combo Lavandería y Cocina 4 Productos',
        components: [
            { size: '10L', cantidad: 1, weightKg: 10.0, subsidioUnitario: 12_000 },
            { size: '1/2G', cantidad: 2, weightKg: 1.9, subsidioUnitario: 3_000 },
            { size: '1L', cantidad: 1, weightKg: 1.0, subsidioUnitario: 1_000 },
        ],
        totalWeightKg: 14.8,
        totalSubsidio: 19_000,
        bultosSugeridos: 1,
    },
    // 4. Kit Completo #3 (3 Galones + 1 Litro)
    'kit-limpieza-completo-3-galones': {
        nombre: 'Kit Completo #3 (3 Galones + 1L)',
        components: [
            { size: '3.8L', cantidad: 3, weightKg: 3.8, subsidioUnitario: 6_000 },
            { size: '1L', cantidad: 1, weightKg: 1.0, subsidioUnitario: 1_000 },
        ],
        totalWeightKg: 12.4,
        totalSubsidio: 19_000,
        bultosSugeridos: 1,
    },
    // 5. Combos 20L + 1 Galón
    'kit-combo-detergente-20l-suavizante-galon': {
        nombre: 'Combo Detergente 20L + Suavizante Galón',
        components: [
            { size: '20L', cantidad: 1, weightKg: 20.0, subsidioUnitario: 12_000 },
            { size: '3.8L', cantidad: 1, weightKg: 3.8, subsidioUnitario: 6_000 },
        ],
        totalWeightKg: 23.8,
        totalSubsidio: 18_000,
        bultosSugeridos: 2,
    },
    'kit-combo-detergente-20l-desengrasante-galon': {
        nombre: 'Combo Detergente 20L + Desengrasante Galón',
        components: [
            { size: '20L', cantidad: 1, weightKg: 20.0, subsidioUnitario: 12_000 },
            { size: '3.8L', cantidad: 1, weightKg: 3.8, subsidioUnitario: 6_000 },
        ],
        totalWeightKg: 23.8,
        totalSubsidio: 18_000,
        bultosSugeridos: 2,
    },
    'kit-combo-detergente-20l-limpiapisos-galon': {
        nombre: 'Combo Detergente 20L + Limpiapisos Galón',
        components: [
            { size: '20L', cantidad: 1, weightKg: 20.0, subsidioUnitario: 12_000 },
            { size: '3.8L', cantidad: 1, weightKg: 3.8, subsidioUnitario: 6_000 },
        ],
        totalWeightKg: 23.8,
        totalSubsidio: 18_000,
        bultosSugeridos: 2,
    },
    'kit-combo-detergente-20l-quitamanchas-galon': {
        nombre: 'Combo Detergente 20L + Quitamanchas Galón',
        components: [
            { size: '20L', cantidad: 1, weightKg: 20.0, subsidioUnitario: 12_000 },
            { size: '3.8L', cantidad: 1, weightKg: 3.8, subsidioUnitario: 6_000 },
        ],
        totalWeightKg: 23.8,
        totalSubsidio: 18_000,
        bultosSugeridos: 2,
    },
    'kit-combo-detergente-20l-bactokill-galon': {
        nombre: 'Combo Detergente 20L + Bactokill Galón',
        components: [
            { size: '20L', cantidad: 1, weightKg: 20.0, subsidioUnitario: 12_000 },
            { size: '3.8L', cantidad: 1, weightKg: 3.8, subsidioUnitario: 6_000 },
        ],
        totalWeightKg: 23.8,
        totalSubsidio: 18_000,
        bultosSugeridos: 2,
    },
    'kit-combo-detergente-20l-vinagre-galon': {
        nombre: 'Combo Detergente 20L + Vinagre Galón',
        components: [
            { size: '20L', cantidad: 1, weightKg: 20.0, subsidioUnitario: 12_000 },
            { size: '3.8L', cantidad: 1, weightKg: 3.8, subsidioUnitario: 6_000 },
        ],
        totalWeightKg: 23.8,
        totalSubsidio: 18_000,
        bultosSugeridos: 2,
    },
    'kit-combo-detergente-20l-desengrasante-pro': {
        nombre: 'Combo Pro Detergente 20L + Desengrasante Galón',
        components: [
            { size: '20L', cantidad: 1, weightKg: 20.0, subsidioUnitario: 12_000 },
            { size: '3.8L', cantidad: 1, weightKg: 3.8, subsidioUnitario: 6_000 },
        ],
        totalWeightKg: 23.8,
        totalSubsidio: 18_000,
        bultosSugeridos: 2,
    },
    'kit-combo-detergente-20l-shampoo-muebles-galon': {
        nombre: 'Combo Detergente 20L + Shampoo Muebles Galón',
        components: [
            { size: '20L', cantidad: 1, weightKg: 20.0, subsidioUnitario: 12_000 },
            { size: '3.8L', cantidad: 1, weightKg: 3.8, subsidioUnitario: 6_000 },
        ],
        totalWeightKg: 23.8,
        totalSubsidio: 18_000,
        bultosSugeridos: 2,
    },
    'kit-combo-ahorro-pajarito-2-garrafas-10l': {
        nombre: 'Combo Ahorro 2 Garrafas 10L',
        components: [{ size: '10L', cantidad: 2, weightKg: 10.0, subsidioUnitario: 12_000 }],
        totalWeightKg: 20.0,
        totalSubsidio: 24_000,
        bultosSugeridos: 1,
    },
    'kit-matrimonio': {
        nombre: 'Kit Matrimonio (4 Galones)',
        components: [{ size: '3.8L', cantidad: 4, weightKg: 3.8, subsidioUnitario: 6_000 }],
        totalWeightKg: 15.2,
        totalSubsidio: 24_000,
        bultosSugeridos: 1,
    },
    'suavidad-aroma': {
        nombre: 'Kit Suavidad & Aroma (4 Garrafas 10L)',
        components: [{ size: '10L', cantidad: 4, weightKg: 10.0, subsidioUnitario: 12_000 }],
        totalWeightKg: 40.0,
        totalSubsidio: 48_000,
        bultosSugeridos: 2,
    },
    'experto-limpieza': {
        nombre: 'Kit Experto en Limpieza (4 Garrafas 20L)',
        components: [{ size: '20L', cantidad: 4, weightKg: 20.0, subsidioUnitario: 12_000 }],
        totalWeightKg: 80.0,
        totalSubsidio: 48_000,
        bultosSugeridos: 4,
    },
};

export interface CartItemQuote {
    productId?: string;
    nombre?: string;
    size: string;
    cantidad: number;
}

export interface PackagingAnalysis {
    totalWeightKg: number;
    bultos: number;
    subsidioBruto: number;
    desgloseSubsidio: Array<{
        nombre: string;
        size: string;
        cantidad: number;
        pesoTotal: number;
        subsidioUnitario: number;
        subsidioTotal: number;
    }>;
    dimensions: {
        alto: number;
        largo: number;
        ancho: number;
    };
}

/**
 * Realiza un análisis exhaustivo del carrito descomponiendo kits, calculando el peso real,
 * la cantidad óptima de bultos según límites de mensajería (máx. 30 kg/bulto) y el subsidio de fábrica.
 */
export function getCartPackagingAnalysis(items: CartItemQuote[]): PackagingAnalysis {
    let totalWeightKg = 0;
    let subsidioBruto = 0;
    let garrafas20L = 0;
    let garrafas10L = 0;
    let galones38L = 0;
    let smallItemsWeight = 0;

    const desglose: PackagingAnalysis['desgloseSubsidio'] = [];

    for (const item of items) {
        const pId = item.productId || '';
        const qty = item.cantidad || 1;

        if (KIT_COMPOSITION_MAP[pId]) {
            const kit = KIT_COMPOSITION_MAP[pId];
            const kitWeight = kit.totalWeightKg * qty;
            const kitSub = kit.totalSubsidio * qty;

            totalWeightKg += kitWeight;
            subsidioBruto += kitSub;

            for (const comp of kit.components) {
                const totalUnits = comp.cantidad * qty;
                if (comp.size === '20L' || comp.size === '20KG') garrafas20L += totalUnits;
                else if (comp.size === '10L' || comp.size === '10KG') garrafas10L += totalUnits;
                else if (comp.size === '3.8L' || comp.size === '4KG') galones38L += totalUnits;
                else smallItemsWeight += comp.weightKg * totalUnits;
            }

            desglose.push({
                nombre: kit.nombre,
                size: 'COMBO',
                cantidad: qty,
                pesoTotal: kitWeight,
                subsidioUnitario: kit.totalSubsidio,
                subsidioTotal: kitSub,
            });
        } else if (pId.startsWith('kit-') || pId.startsWith('combo-') || item.size === 'COMBO') {
            // Kit genérico no mapeado
            const genericWeight = 20.0 * qty;
            const genericSub = 18_000 * qty;
            totalWeightKg += genericWeight;
            subsidioBruto += genericSub;
            garrafas20L += qty;

            desglose.push({
                nombre: item.nombre || 'Combo Especial',
                size: 'COMBO',
                cantidad: qty,
                pesoTotal: genericWeight,
                subsidioUnitario: 18_000,
                subsidioTotal: genericSub,
            });
        } else {
            // Producto individual
            const unitWeight = PESOS_POR_TALLA[item.size] || 1.0;
            const unitSub = SUBSIDIOS_POR_TALLA[item.size] || 1_000;
            const itemWeight = unitWeight * qty;
            const itemSub = unitSub * qty;

            totalWeightKg += itemWeight;
            subsidioBruto += itemSub;

            if (item.size === '20L' || item.size === '20KG') garrafas20L += qty;
            else if (item.size === '10L' || item.size === '10KG') garrafas10L += qty;
            else if (item.size === '3.8L' || item.size === '4KG') galones38L += qty;
            else smallItemsWeight += itemWeight;

            desglose.push({
                nombre: item.nombre || `Producto ${item.size}`,
                size: item.size,
                cantidad: qty,
                pesoTotal: itemWeight,
                subsidioUnitario: unitSub,
                subsidioTotal: itemSub,
            });
        }
    }

    // Cálculo de bultos físicos:
    // - Cada 20L es un bulto independiente (20 kg)
    // - Hasta 2 bidones de 10L por caja/bulto (20 kg)
    // - Hasta 4 galones de 3.8L por caja/bulto (15.2 kg)
    // - Pequeños agrupados en cajas de máx 15 kg
    const bultos20L = garrafas20L;
    const bultos10L = Math.ceil(garrafas10L / 2);
    const bultosGalones = Math.ceil(galones38L / 4);
    const bultosSmall = smallItemsWeight > 0 ? Math.ceil(smallItemsWeight / 15) : 0;

    const totalBultos = Math.max(1, bultos20L + bultos10L + bultosGalones + bultosSmall);

    // Dimensiones representativas para la API de 99 Envíos:
    let alto = 25;
    let largo = 25;
    let ancho = 25;

    if (totalWeightKg >= 25 || totalBultos >= 2) {
        alto = 38;
        largo = 38;
        ancho = 42;
    } else if (totalWeightKg >= 10 || totalBultos >= 1) {
        alto = 32;
        largo = 30;
        ancho = 30;
    }

    return {
        totalWeightKg: Math.round(totalWeightKg * 10) / 10,
        bultos: totalBultos,
        subsidioBruto,
        desgloseSubsidio: desglose,
        dimensions: { alto, largo, ancho },
    };
}

/**
 * Calcula el subsidio BRUTO de fábrica según los items del pedido.
 */
export function calcularSubsidioReal(items?: CartItemQuote[], totalWeightKg?: number): number {
    if (items && items.length > 0) {
        const analysis = getCartPackagingAnalysis(items);
        return analysis.subsidioBruto;
    }
    return calcularSubsidio(totalWeightKg || 5);
}

/**
 * Calcula el subsidio BRUTO de fábrica por peso (referencia / fallback).
 */
export function calcularSubsidio(totalWeightKg: number): number {
    const weight = Math.ceil(totalWeightKg);
    if (weight <= 0) return 0;
    const num20L = Math.floor(weight / 20);
    const rem = weight % 20;
    let subRem = 0;
    if (rem >= 10) subRem = 12_000;
    else if (rem >= 4) subRem = 6_000;
    else if (rem >= 2) subRem = 3_000;
    else if (rem >= 1) subRem = 1_000;

    return (num20L * 12_000) + subRem;
}

