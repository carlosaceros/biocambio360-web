// Product data types and constants
// Sizes: 1L, 1/2G (½ Galón ≈ 1.9L), 3.8L (Galón), 10L, 20L
export type ProductSize = '1L' | '1/2G' | '3.8L' | '10L' | '20L';

export interface FAQ {
    q: string;
    a: string;
}

export interface Product {
    id: string;
    nombre: string;
    slogan: string;
    descripcion: string;
    imgFile: string;
    imgFileSmall?: string;
    imgFiles?: Record<string, string>; // Map of specific sizes (e.g. '10L', '20L') to custom image filenames
    beneficios: string[];
    badge: string;
    color: string;
    categoria: string;
    subcategoria?: string | null;
    faqs: FAQ[];
    precios: Record<string, number>; // Changed to string to support more sizes if needed
    competidorPromedio: Record<string, number>;
    shortDescription?: string;
    manualContentKey?: string;
    stock?: Record<string, number>; // Existencias por tamaño (ej: { '3.8L': 30, '10L': 5 })
    minStockThreshold?: number; // Umbral de alerta para stock bajo (default: 5)
    sku?: string; // Código de referencia único de inventario
    isFeatured?: boolean; // Destacado en vitrina o catálogo principal
}

import { PRODUCTOS } from './products-data';
export { PRODUCTOS };


// Helper function: Calculate savings
export interface SavingsData {
    nuestroPrecioML: string;
    ahorroPorcentaje: number;
    ahorroDinero: number;
    mostrarFOMO: boolean;
}

// Volume in liters for each size
const SIZE_LITERS: Record<ProductSize, number> = {
    '1L': 1,
    '1/2G': 1.9,
    '3.8L': 3.8,
    '10L': 10,
    '20L': 20,
};

export const calcularAhorro = (
    precioNuestro: number,
    volumen: string,
    competidorPrecioAbsoluto: number
): SavingsData => {
    const litros = SIZE_LITERS[volumen as ProductSize] ?? (parseFloat(volumen) || 1);
    const nuestroPrecioML = precioNuestro / (litros * 1000);

    // Safety check in case the competitor price is missing or 0
    if (!competidorPrecioAbsoluto || competidorPrecioAbsoluto <= precioNuestro) {
        return {
            nuestroPrecioML: nuestroPrecioML.toFixed(2),
            ahorroPorcentaje: 0,
            ahorroDinero: 0,
            mostrarFOMO: false
        };
    }

    const ahorroDinero = competidorPrecioAbsoluto - precioNuestro;
    const ahorroPorcentaje = (ahorroDinero / competidorPrecioAbsoluto) * 100;

    return {
        nuestroPrecioML: nuestroPrecioML.toFixed(2),
        ahorroPorcentaje: Math.round(ahorroPorcentaje),
        ahorroDinero: Math.round(ahorroDinero),
        mostrarFOMO: ahorroDinero > 0
    };
};

// Format currency helper
export const formatCurrency = (val: number): string => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(val);
};
