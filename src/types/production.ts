/**
 * Biocambio360 — Tipos para Producción, Planta, Fórmulas (BOM) y Trazabilidad INVIMA (MRP)
 * Sustituye completamente las hojas 'PRONOSTICO' y 'COSTOS'
 */

export type RawMaterialType =
    | 'quimico'
    | 'fragancia'
    | 'colorante'
    | 'empaque'
    | 'etiqueta'
    | 'insumo';

export type RawMaterialUnit =
    | 'kg'
    | 'g'
    | 'L'
    | 'ml'
    | 'unidad';

export interface RawMaterial {
    id: string;
    nombre: string;
    tipo: RawMaterialType;
    unidad: RawMaterialUnit;
    stockActual: number;
    stockMinimoSeguridad: number;
    costoPromedioUnitario: number; // COP
    proveedorPrincipal?: string;
    loteProveedorActual?: string;
    updatedAt: any;
}

export interface FormulaIngredient {
    rawMaterialId: string;
    nombre: string;
    cantidadPorUnidadBase: number; // Por cada 1 L o 1 Kg de producto terminado
    unidad: RawMaterialUnit;
    porcentajeEnFormula?: number;
}

export interface ProductFormula {
    id: string;
    productId: string;
    nombreProducto: string;
    unidadBase: 'L' | 'kg';
    ingredientes: FormulaIngredient[];
    instruccionesMezcla?: string[];
    densidadTeorica?: number; // g/ml
    phTeoricoMin?: number;
    phTeoricoMax?: number;
    viscosidadTeorica?: string;
    colorTeorico?: string;
    aromaTeorico?: string;
    version: number;
    activo: boolean;
    updatedAt: any;
}

export interface QualityControlParameters {
    phMedido: number;
    densidadMedida?: number;
    viscosidadMedida?: string;
    colorConforme: boolean;
    aromaConforme: boolean;
    aparienciaVisual: string;
    aprobado: boolean;
    verificadoPor: string;
    observaciones?: string;
    fechaControl: any;
}

export interface ProductionBatch {
    id: string;
    numeroLote: string; // ej: 400725081 (código único de trazabilidad INVIMA)
    formulaId: string;
    productId: string;
    nombreProducto: string;
    tanqueOMezclador?: string;
    volumenPlaneadoLitros: number;
    volumenRealObtenidoLitros?: number;
    mermasLitros?: number;
    fechaInicio: any;
    fechaFinalizacion?: any;
    fechaVencimiento: any;
    responsablePlanta: string;
    materiasPrimasConsumidas: {
        rawMaterialId: string;
        nombre: string;
        cantidadRealConsumida: number;
        unidad: RawMaterialUnit;
        costoTotal: number;
    }[];
    presentacionesEmpacadas?: {
        size: string;
        cantidadUnidades: number;
    }[];
    controlCalidad?: QualityControlParameters;
    estado: 'planeado' | 'en_mezclado' | 'en_empaque' | 'cuarentena' | 'aprobado' | 'rechazado';
    costoTotalLote: number;
    costoUnitarioPorLitro: number;
    createdAt: any;
    updatedAt: any;
}
