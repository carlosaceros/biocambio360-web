// Combo data types and definitions for the Combotizer feature
// Sizes for combos: only 3.8L (1 Galón), 10L, 20L — as instructed

import { ProductSize } from './products';

export interface ComboItem {
    productId: string;
    productName: string;
    size: '3.8L' | '10L' | '20L';
    quantity: number;
    emoji: string;
}

export interface Combo {
    id: string;
    nombre: string;
    subtitulo: string;
    descripcion: string;
    badge: string;
    badgeColor: string; // Tailwind class
    emoji: string;
    precio: number;
    precioRegular: number; // Without discount
    items: ComboItem[];
    beneficios: string[];
    enfoque: string; // Target audience
    popular?: boolean;
    envioGratis: boolean;
    duracion: string; // E.g. "2 meses", "4 meses"
    colorGradient: string; // Tailwind gradient classes
}

// Precios de referencia (finales al público, Abril 2026):
// Detergente:   3.8L=$34.000 | 10L=$57.000 | 20L=$86.000
// Desengrasante:3.8L=$35.000 | 10L=$57.000 | 20L=$83.000
// Suavizante:   3.8L=$34.000 | 10L=$66.000 | 20L=$103.000
// Blanqueador:  3.8L=$20.000 | 10L=$47.000 | 20L=$69.000

export const COMBOS: Combo[] = [
    {
        id: 'kit-matrimonio',
        nombre: 'Kit Matrimonio',
        subtitulo: 'Independízate del Supermercado',
        descripcion: 'No empieces tu nuevo hogar gastando de más. Este combo está diseñado para durar 3 veces más que los productos convencionales.',
        badge: 'IDEAL PAREJAS',
        badgeColor: 'bg-pink-500',
        emoji: '💒',
        // Suma regular: 34+35+34+20 = 123.000 → combo con ≈11% descuento
        precio: 109000,
        precioRegular: 123000,
        items: [
            { productId: 'detergente',    productName: 'Detergente Líquido',       size: '3.8L', quantity: 1, emoji: '👕' },
            { productId: 'suavizante',    productName: 'Suavizante Textil',        size: '3.8L', quantity: 1, emoji: '🌸' },
            { productId: 'desengrasante', productName: 'Desengrasante Multiusos',  size: '3.8L', quantity: 1, emoji: '🧴' },
            { productId: 'blanqueador',   productName: 'Blanqueador Desinfectante',size: '3.8L', quantity: 1, emoji: '✨' },
        ],
        beneficios: [
            'Ahorro real del 11% vs. comprar suelto',
            'Fórmulas concentradas: 1 tapita lava más',
            'Eco-friendly: cuida tu ropa, tus manos y el planeta',
        ],
        enfoque: 'Parejas recién casadas o que empiezan a vivir juntas',
        popular: false,
        envioGratis: true,
        duracion: '2 meses',
        colorGradient: 'from-pink-500 to-rose-600',
    },
    {
        id: 'suavidad-aroma',
        nombre: 'Suavidad & Aroma',
        subtitulo: 'El Consentido del Hogar',
        descripcion: 'No es solo limpiar, es cuidar. El kit diseñado para proteger las fibras de tu ropa y dejar un aroma inolvidable en cada rincón de tu casa.',
        badge: 'MÁS VENDIDO',
        badgeColor: 'bg-brand-blue',
        emoji: '🌸',
        // Suma regular: 66+57+47+57 = 227.000 → combo con ≈13% descuento
        precio: 197000,
        precioRegular: 227000,
        items: [
            { productId: 'suavizante',    productName: 'Suavizante Hotelero',       size: '10L', quantity: 1, emoji: '💜' },
            { productId: 'detergente',    productName: 'Detergente Ropa Color',     size: '10L', quantity: 1, emoji: '👚' },
            { productId: 'blanqueador',   productName: 'Blanqueador Aromático',     size: '10L', quantity: 1, emoji: '✨' },
            { productId: 'desengrasante', productName: 'Desengrasante Multiusos',   size: '10L', quantity: 1, emoji: '🍽️' },
        ],
        beneficios: [
            'Fragancia premium que perdura 48h',
            'Hipoalergénico: apto para ropa de bebé',
            'Brillo en pisos sin enjuague',
        ],
        enfoque: 'Quienes aman que su hogar huela delicioso',
        popular: true,
        envioGratis: true,
        duracion: '3 meses',
        colorGradient: 'from-brand-blue to-blue-700',
    },
    {
        id: 'experto-limpieza',
        nombre: 'Experto en Limpieza',
        subtitulo: 'El Equilibrio Perfecto',
        descripcion: 'Todo el poder industrial que necesitas para una limpieza profunda, sin pagar de más. Rendimiento x3 vs. marcas convencionales.',
        badge: 'FAVORITO FAMILIAS',
        badgeColor: 'bg-emerald-600',
        emoji: '🏠',
        // Suma regular: 57+57+66+47 = 227.000 → igual combo × mismo precio
        precio: 197000,
        precioRegular: 227000,
        items: [
            { productId: 'desengrasante', productName: 'Desengrasante Arranca-Grasa', size: '10L', quantity: 1, emoji: '🔥' },
            { productId: 'detergente',    productName: 'Detergente Concentrado',       size: '10L', quantity: 1, emoji: '👕' },
            { productId: 'suavizante',    productName: 'Suavizante Premium',           size: '10L', quantity: 1, emoji: '🌸' },
            { productId: 'blanqueador',   productName: 'Blanqueador Desinfectante',    size: '10L', quantity: 1, emoji: '✨' },
        ],
        beneficios: [
            'Fórmula "Arranca-Grasa": cocina impecable sin esfuerzo',
            'Cuidado textil: detergente y suavizante que protegen fibras',
            'Rendimiento x3: concentración real vs. supermercado',
        ],
        enfoque: 'Familias con hijos que valoran limpieza profunda',
        popular: false,
        envioGratis: true,
        duracion: '3 meses',
        colorGradient: 'from-emerald-500 to-teal-600',
    },
    {
        id: 'abastecimiento-total',
        nombre: 'Abastecimiento Total',
        subtitulo: '4 Meses de Limpieza Industrial',
        descripcion: 'La compra inteligente para familias que valoran su tiempo y dinero. 4 meses de limpieza industrial en una sola caja.',
        badge: 'MÁXIMO AHORRO',
        badgeColor: 'bg-amber-500',
        emoji: '🏆',
        // Suma regular: 86+103+83+69 = 341.000 → combo con ≈11% descuento
        precio: 304000,
        precioRegular: 341000,
        items: [
            { productId: 'detergente',    productName: 'Detergente Líquido Premium',  size: '20L', quantity: 1, emoji: '👕' },
            { productId: 'suavizante',    productName: 'Suavizante Hotelero',          size: '20L', quantity: 1, emoji: '🌸' },
            { productId: 'desengrasante', productName: 'Desengrasante Restaurante',    size: '20L', quantity: 1, emoji: '🔥' },
            { productId: 'blanqueador',   productName: 'Blanqueador Desinfectante',    size: '20L', quantity: 1, emoji: '✨' },
        ],
        beneficios: [
            'Detergente Premium: rinde cientos de cargas',
            'Suavizante Hotelero: aroma de alta perdurabilidad',
            'Desengrasante: potencia de restaurante profesional',
        ],
        enfoque: 'Familias grandes que buscan el máximo ahorro',
        popular: false,
        envioGratis: true,
        duracion: '4 meses',
        colorGradient: 'from-amber-500 to-orange-600',
    },
];

// Calculate savings for a combo
export const calcularAhorroCombo = (combo: Combo): { ahorroDinero: number; ahorroPorcentaje: number } => {
    const ahorroDinero = combo.precioRegular - combo.precio;
    const ahorroPorcentaje = Math.round((ahorroDinero / combo.precioRegular) * 100);
    return { ahorroDinero, ahorroPorcentaje };
};

// Sizes allowed in custom combo builder (3.8L and up)
export const COMBO_ALLOWED_SIZES: Array<'3.8L' | '10L' | '20L'> = ['3.8L', '10L', '20L'];

// Size labels for the combo builder UI
export const COMBO_SIZE_LABELS: Record<'3.8L' | '10L' | '20L', string> = {
    '3.8L': '1 Galón (3.8L)',
    '10L': '10 Litros',
    '20L': '20 Litros',
};

// Calculate custom combo price with tiered discounts
export const calcularPrecioCustomCombo = (
    items: { productId: string; size: '3.8L' | '10L' | '20L'; precio: number; quantity: number }[]
): { precioOriginal: number; precioCombo: number; descuento: number; porcentaje: number } => {
    const precioOriginal = items.reduce((sum, item) => sum + item.precio * item.quantity, 0);
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    // Tiered discounts based on total items in combo
    let porcentajeDescuento = 0;
    if (totalItems >= 6) porcentajeDescuento = 15;
    else if (totalItems >= 4) porcentajeDescuento = 10;
    else if (totalItems >= 3) porcentajeDescuento = 7;
    else if (totalItems >= 2) porcentajeDescuento = 5;

    const descuento = Math.round(precioOriginal * (porcentajeDescuento / 100));
    const precioCombo = precioOriginal - descuento;

    return { precioOriginal, precioCombo, descuento, porcentaje: porcentajeDescuento };
};

// Format currency helper (COP)
export const formatCOP = (val: number): string => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(val);
};
