/**
 * Biocambio360 — Servicio de Producción, Fórmulas (BOM), Lotes y Calidad (MRP & INVIMA)
 * Sustituye completamente las hojas 'PRONOSTICO' y 'COSTOS'
 */

import {
    collection,
    doc,
    addDoc,
    updateDoc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import {
    RawMaterial,
    ProductFormula,
    ProductionBatch,
    QualityControlParameters
} from '@/types/production';

const RAW_MATERIALS_REF = 'raw_materials';
const FORMULAS_REF = 'product_formulas';
const BATCHES_REF = 'production_batches';

// ─────────────────────────────────────────────────────────────
// Fórmulas Maestras Predefinidas (Recetas Estándar de Fábrica)
// ─────────────────────────────────────────────────────────────

export const DEFAULT_FORMULAS: ProductFormula[] = [
    {
        id: 'formula-detergente-multiusos',
        productId: 'detergente-liquido-multiusos',
        nombreProducto: 'Detergente Líquido Multiusos para Ropa y Lavadora',
        unidadBase: 'L',
        version: 1,
        activo: true,
        densidadTeorica: 1.03,
        phTeoricoMin: 7.0,
        phTeoricoMax: 8.5,
        viscosidadTeorica: 'Media-Alta (800-1200 cP)',
        colorTeorico: 'Azul translúcido',
        aromaTeorico: 'Brisa Fresca Floral',
        ingredientes: [
            { rawMaterialId: 'rm-tensoactivo-anionico', nombre: 'Tensoactivo Aniónico Concentrado', cantidadPorUnidadBase: 0.12, unidad: 'kg' },
            { rawMaterialId: 'rm-espesante', nombre: 'Agente Espesante / Estabilizador', cantidadPorUnidadBase: 0.015, unidad: 'kg' },
            { rawMaterialId: 'rm-fragancia-brisa', nombre: 'Fragancia Concentrada Brisa Marina', cantidadPorUnidadBase: 0.005, unidad: 'kg' },
            { rawMaterialId: 'rm-colorante-azul', nombre: 'Colorante Azul Grado Cosmético', cantidadPorUnidadBase: 0.0002, unidad: 'kg' },
            { rawMaterialId: 'rm-agua-tratada', nombre: 'Agua Desionizada Tratada', cantidadPorUnidadBase: 0.86, unidad: 'L' },
        ],
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'formula-suavizante-floral',
        productId: 'suavizante-aroma-floral-organico',
        nombreProducto: 'Suavizante Textil Aroma Floral',
        unidadBase: 'L',
        version: 1,
        activo: true,
        densidadTeorica: 0.99,
        phTeoricoMin: 3.0,
        phTeoricoMax: 4.5,
        viscosidadTeorica: 'Baja-Media (200-400 cP)',
        colorTeorico: 'Blanco lechoso / Rosa suave',
        aromaTeorico: 'Bouquet Floral Primavera',
        ingredientes: [
            { rawMaterialId: 'rm-base-cationica', nombre: 'Base Catiónica Acondicionadora', cantidadPorUnidadBase: 0.08, unidad: 'kg' },
            { rawMaterialId: 'rm-fragancia-floral', nombre: 'Fragancia Floral de Larga Duración', cantidadPorUnidadBase: 0.008, unidad: 'kg' },
            { rawMaterialId: 'rm-agua-tratada', nombre: 'Agua Desionizada Tratada', cantidadPorUnidadBase: 0.91, unidad: 'L' },
        ],
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'formula-desengrasante-industrial',
        productId: 'desengrasante-industrial-multisuperficies',
        nombreProducto: 'Desengrasante Industrial Concentrado',
        unidadBase: 'L',
        version: 1,
        activo: true,
        densidadTeorica: 1.05,
        phTeoricoMin: 11.0,
        phTeoricoMax: 13.0,
        viscosidadTeorica: 'Fluida alcalina',
        colorTeorico: 'Ámbar brillante',
        aromaTeorico: 'Cítrico Industrial',
        ingredientes: [
            { rawMaterialId: 'rm-agente-alcalino', nombre: 'Agente Alcalino Saponificante', cantidadPorUnidadBase: 0.06, unidad: 'kg' },
            { rawMaterialId: 'rm-solvente-biodegradable', nombre: 'Solvente Oxigenado Biodegradable', cantidadPorUnidadBase: 0.05, unidad: 'kg' },
            { rawMaterialId: 'rm-tensoactivo-no-ionico', nombre: 'Tensoactivo No Iónico Penetrómetro', cantidadPorUnidadBase: 0.04, unidad: 'kg' },
            { rawMaterialId: 'rm-agua-tratada', nombre: 'Agua Desionizada Tratada', cantidadPorUnidadBase: 0.85, unidad: 'L' },
        ],
        updatedAt: new Date().toISOString(),
    }
];

// ─────────────────────────────────────────────────────────────
// Generador de Código de Lote INVIMA
// Formato: [Código Producto 3 dígitos][Día juliano 3 dígitos][Año 2 dígitos][Consecutivo 1 dígito]
// Ejemplo: 400725081 (como en el archivo APP PUNTO VENTAS.xlsx)
// ─────────────────────────────────────────────────────────────

export function generateBatchLotNumber(productId: string): string {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - startOfYear.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const yearPart = now.getFullYear().toString().slice(-2);
    const randomSeq = Math.floor(1 + Math.random() * 9);

    const prefixMap: Record<string, string> = {
        'detergente-liquido-multiusos': '400',
        'suavizante-aroma-floral-organico': '600',
        'desengrasante-industrial-multisuperficies': '500',
    };
    const prefix = prefixMap[productId] || '300';

    return `${prefix}${dayOfYear.toString().padStart(3, '0')}${yearPart}${randomSeq}`;
}

// ─────────────────────────────────────────────────────────────
// Órdenes de Producción por Lote (Batches)
// ─────────────────────────────────────────────────────────────

export async function createProductionBatch(data: {
    formulaId: string;
    productId: string;
    nombreProducto: string;
    volumenPlaneadoLitros: number;
    tanqueOMezclador: string;
    responsablePlanta: string;
}): Promise<ProductionBatch> {
    const formula = DEFAULT_FORMULAS.find(f => f.id === data.formulaId) || DEFAULT_FORMULAS[0];
    const numeroLote = generateBatchLotNumber(data.productId);

    // Explosión de materiales automática (MRP)
    const materiasPrimasConsumidas = formula.ingredientes.map(ing => {
        const cantidadTotal = Number((ing.cantidadPorUnidadBase * data.volumenPlaneadoLitros).toFixed(3));
        const costoEstimado = cantidadTotal * 4500; // Costo estándar promedio COP/kg
        return {
            rawMaterialId: ing.rawMaterialId,
            nombre: ing.nombre,
            cantidadRealConsumida: cantidadTotal,
            unidad: ing.unidad,
            costoTotal: Math.round(costoEstimado),
        };
    });

    const costoTotalLote = materiasPrimasConsumidas.reduce((sum, item) => sum + item.costoTotal, 0);
    const costoUnitarioPorLitro = Math.round(costoTotalLote / data.volumenPlaneadoLitros);

    // Fecha vencimiento a 2 años
    const now = new Date();
    const expiry = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());

    const batchCol = collection(db, BATCHES_REF);
    const newBatch = {
        numeroLote,
        formulaId: data.formulaId,
        productId: data.productId,
        nombreProducto: data.nombreProducto,
        tanqueOMezclador: data.tanqueOMezclador,
        volumenPlaneadoLitros: data.volumenPlaneadoLitros,
        volumenRealObtenidoLitros: data.volumenPlaneadoLitros,
        mermasLitros: 0,
        fechaInicio: serverTimestamp(),
        fechaVencimiento: expiry.toISOString(),
        responsablePlanta: data.responsablePlanta,
        materiasPrimasConsumidas,
        estado: 'planeado' as const,
        costoTotalLote,
        costoUnitarioPorLitro,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(batchCol, newBatch);

    return {
        id: docRef.id,
        ...newBatch,
        fechaInicio: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    } as ProductionBatch;
}

export async function getProductionBatches(limitCount: number = 30): Promise<ProductionBatch[]> {
    try {
        const batchCol = collection(db, BATCHES_REF);
        const q = query(batchCol, limit(limitCount));
        const snap = await getDocs(q);
        const batches = snap.docs.map(d => ({
            id: d.id,
            ...d.data(),
        } as ProductionBatch));
        return batches.sort((a, b) => {
            const tA = (a.createdAt as any)?.seconds || 0;
            const tB = (b.createdAt as any)?.seconds || 0;
            return tB - tA;
        });
    } catch (error) {
        console.error('[Production] Error cargando lotes:', error);
        return [];
    }
}

export async function updateBatchQualityControl(
    batchId: string,
    qc: QualityControlParameters,
    aprobado: boolean
): Promise<void> {
    const batchRef = doc(db, BATCHES_REF, batchId);
    await updateDoc(batchRef, {
        controlCalidad: qc,
        estado: aprobado ? 'aprobado' : 'rechazado',
        fechaFinalizacion: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}
