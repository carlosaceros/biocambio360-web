/**
 * Biocambio360 — Servicio de Rentabilidad, Costos Unitarios y Márgenes Reales (P&L)
 * Sustituye completamente la hoja 'COSTOS' de 'DIA A DIA BIO.xlsx'
 */

export interface OrderProfitabilityMetrics {
    orderId: string;
    canal: 'mostrador_pos' | 'tienda_online' | 'asesor_whatsapp';
    precioVentaTotal: number;
    costoMateriaPrimaTotal: number;
    costoEmpaquesYEtiquetasTotal: number;
    costoTransporteFleteReal: number;
    costoComisionPasarela: number;
    margenContribucionNetoCOP: number;
    margenContribucionPorcentaje: number;
    estadoRentabilidad: 'alta' | 'media' | 'baja' | 'en_perdida';
}

export interface ChannelProfitabilitySummary {
    canal: string;
    totalVentas: number;
    totalCostosProduccion: number;
    totalFletesPagados: number;
    totalComisionesPasarelas: number;
    margenNetoAcumulado: number;
    porcentajeMargenPromedio: number;
}

// Costos estándar promedio estimados por litro/unidad según recetas
export const ESTIMATED_COST_PER_LITER: Record<string, number> = {
    'detergente-liquido-multiusos': 1450, // COP/Litro (materia prima química)
    'suavizante-aroma-floral-organico': 1280,
    'desengrasante-industrial-multisuperficies': 1850,
    'lavaloza-liquido-concentrado': 1350,
    'default': 1500,
};

// Costo de envase + tapa con precinto + etiqueta
export const PACKAGING_COST: Record<string, number> = {
    '500ML': 650,
    '1L': 900,
    'Galón': 2400,
    '10L': 5500,
    '20L': 9500,
    'default': 2500,
};

/**
 * Calcula la rentabilidad unitaria exacta de una orden
 */
export function calculateOrderProfitability(order: {
    id: string;
    total: number;
    envio: number;
    metodoPago?: string;
    canal?: 'mostrador_pos' | 'tienda_online' | 'asesor_whatsapp';
    productos: { id: string; size: string; cantidad: number; price: number }[];
}): OrderProfitabilityMetrics {
    let costoQuimico = 0;
    let costoEmpaques = 0;

    order.productos.forEach(p => {
        const costPerLiter = ESTIMATED_COST_PER_LITER[p.id] || ESTIMATED_COST_PER_LITER['default'];
        const packCost = PACKAGING_COST[p.size] || PACKAGING_COST['default'];

        // Litros aproximados según presentación
        let litros = 1;
        if (p.size === '20L') litros = 20;
        else if (p.size === '10L') litros = 10;
        else if (p.size === 'Galón') litros = 3.8;
        else if (p.size === '500ML') litros = 0.5;

        costoQuimico += costPerLiter * litros * p.cantidad;
        costoEmpaques += packCost * p.cantidad;
    });

    // Comisión de pasarela
    let comisionPasarela = 0;
    if (order.metodoPago === 'wompi') {
        comisionPasarela = Math.round(order.total * 0.0265 + 700 * 1.19);
    } else if (order.metodoPago === 'addi') {
        comisionPasarela = Math.round(order.total * 0.055);
    } else if (order.metodoPago === 'contraentrega') {
        comisionPasarela = Math.round(order.total * 0.035); // Cobro recaudo transportadora
    }

    // Flete real (si es mostrador es 0; si es nacional promedio flete real 99 Envíos)
    const canal = order.canal || 'tienda_online';
    const fleteReal = canal === 'mostrador_pos' ? 0 : Math.max(order.envio, 16000);

    const margenNeto = order.total - (costoQuimico + costoEmpaques + fleteReal + comisionPasarela);
    const margenPct = order.total > 0 ? Math.round((margenNeto / order.total) * 100) : 0;

    let estadoRentabilidad: OrderProfitabilityMetrics['estadoRentabilidad'] = 'alta';
    if (margenPct < 0) estadoRentabilidad = 'en_perdida';
    else if (margenPct < 20) estadoRentabilidad = 'baja';
    else if (margenPct < 40) estadoRentabilidad = 'media';

    return {
        orderId: order.id,
        canal,
        precioVentaTotal: order.total,
        costoMateriaPrimaTotal: Math.round(costoQuimico),
        costoEmpaquesYEtiquetasTotal: Math.round(costoEmpaques),
        costoTransporteFleteReal: fleteReal,
        costoComisionPasarela: comisionPasarela,
        margenContribucionNetoCOP: Math.round(margenNeto),
        margenContribucionPorcentaje: margenPct,
        estadoRentabilidad,
    };
}
