/**
 * Biocambio360 — Tipos para Informes Comerciales y Business Intelligence
 * Basado en la reportería histórica (Power BI 2024-2026) y métricas en tiempo real.
 */

export interface MonthlySalesData {
    mes: string;
    mesNumero: number;
    anio: number;
    ventasCantidad: number;
    ventasMillones: number;
    // Segmentación
    clientesNuevosCantidad: number;
    clientesNuevosMillones: number;
    recompraCantidad: number;
    recompraMillones: number;
    llamadaCantidad?: number;
    llamadaMillones?: number;
    ticketPromedio: number;
}

export interface AdvisorPerformance {
    id: string;
    nombre: string;
    metaMillones: number;
    ventasMillones: number;
    porcentajeCumplimiento: number;
    clientesNuevosCantidad: number;
    clientesNuevosMillones: number;
    recompraCantidad: number;
    recompraMillones: number;
    porcentajeNuevos: number;
    porcentajeRecompra: number;
    totalClientes: number;
    ticketPromedioMil: number;
    promedioProductosPorPedido: number;
    perfilComercial: 'hunter' | 'farmer' | 'balanceado';
    estadoRendimiento: 'supera_meta' | 'en_meta' | 'en_riesgo' | 'critico';
}

export interface PosDailySales {
    dia: number;
    fecha: string;
    ventasMil: number;
    pedidosCantidad: number;
}

export interface PosMonthlySales {
    mes: string;
    mesNumero: number;
    anio: number;
    totalMillones: number;
    dias: PosDailySales[];
}

export interface CommercialReportSummary {
    metaGlobalMillones: number;
    ventasActualesMillones: number;
    porcentajeCumplimientoGlobal: number;
    metaNuevosPorcentaje: number;
    logradoNuevosPorcentaje: number;
    proyeccionCierreMillones: number;
    gapDiarioNecesarioMillones: number;
    totalPedidosMes: number;
    totalClientesActivos: number;
    ticketPromedioGeneral: number;
    tasaRecompraPorcentaje: number;
}
