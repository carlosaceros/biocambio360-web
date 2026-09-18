/**
 * Biocambio360 — Datos Históricos y Motor de Reportería Comercial (2024 - 2026)
 * Contiene la serie histórica de Power BI y utilidades analíticas avanzadas.
 */

import { MonthlySalesData, AdvisorPerformance, PosMonthlySales, CommercialReportSummary } from '@/types/commercial-reports';

// ─────────────────────────────────────────────────────────────
// SERIE HISTÓRICA MENSUAL (2024 - 2026)
// Extraída fielmente de los tableros Power BI Desktop
// ─────────────────────────────────────────────────────────────

export const HISTORICAL_SALES_DATA: MonthlySalesData[] = [
    // ─── AÑO 2024 ───
    { mes: 'Enero', mesNumero: 1, anio: 2024, ventasCantidad: 1400, ventasMillones: 170, clientesNuevosCantidad: 345, clientesNuevosMillones: 37, recompraCantidad: 1055, recompraMillones: 133, ticketPromedio: 121428 },
    { mes: 'Febrero', mesNumero: 2, anio: 2024, ventasCantidad: 1419, ventasMillones: 170, clientesNuevosCantidad: 312, clientesNuevosMillones: 35, recompraCantidad: 1107, recompraMillones: 135, ticketPromedio: 119802 },
    { mes: 'Marzo', mesNumero: 3, anio: 2024, ventasCantidad: 1386, ventasMillones: 172, clientesNuevosCantidad: 266, clientesNuevosMillones: 31, recompraCantidad: 1120, recompraMillones: 141, ticketPromedio: 124098 },
    { mes: 'Abril', mesNumero: 4, anio: 2024, ventasCantidad: 1290, ventasMillones: 160, clientesNuevosCantidad: 216, clientesNuevosMillones: 22, recompraCantidad: 1074, recompraMillones: 138, ticketPromedio: 124031 },
    { mes: 'Mayo', mesNumero: 5, anio: 2024, ventasCantidad: 1168, ventasMillones: 153, clientesNuevosCantidad: 178, clientesNuevosMillones: 22, recompraCantidad: 990, recompraMillones: 131, ticketPromedio: 130993 },
    { mes: 'Junio', mesNumero: 6, anio: 2024, ventasCantidad: 1204, ventasMillones: 157, clientesNuevosCantidad: 188, clientesNuevosMillones: 23, recompraCantidad: 1016, recompraMillones: 134, ticketPromedio: 130398 },
    { mes: 'Julio', mesNumero: 7, anio: 2024, ventasCantidad: 1361, ventasMillones: 174, clientesNuevosCantidad: 210, clientesNuevosMillones: 25, recompraCantidad: 1151, recompraMillones: 149, ticketPromedio: 127847 },
    { mes: 'Agosto', mesNumero: 8, anio: 2024, ventasCantidad: 1184, ventasMillones: 160, clientesNuevosCantidad: 165, clientesNuevosMillones: 19, recompraCantidad: 1019, recompraMillones: 141, ticketPromedio: 135135 },
    { mes: 'Septiembre', mesNumero: 9, anio: 2024, ventasCantidad: 1200, ventasMillones: 156, clientesNuevosCantidad: 187, clientesNuevosMillones: 20, recompraCantidad: 1013, recompraMillones: 136, ticketPromedio: 130000 },
    { mes: 'Octubre', mesNumero: 10, anio: 2024, ventasCantidad: 1218, ventasMillones: 160, clientesNuevosCantidad: 140, clientesNuevosMillones: 17, recompraCantidad: 1078, recompraMillones: 143, ticketPromedio: 131362 },
    { mes: 'Noviembre', mesNumero: 11, anio: 2024, ventasCantidad: 1220, ventasMillones: 160, clientesNuevosCantidad: 173, clientesNuevosMillones: 19, recompraCantidad: 1047, recompraMillones: 141, ticketPromedio: 131147 },
    { mes: 'Diciembre', mesNumero: 12, anio: 2024, ventasCantidad: 1426, ventasMillones: 199, clientesNuevosCantidad: 198, clientesNuevosMillones: 24, recompraCantidad: 1228, recompraMillones: 175, ticketPromedio: 139551 },

    // ─── AÑO 2025 ───
    { mes: 'Enero', mesNumero: 1, anio: 2025, ventasCantidad: 1423, ventasMillones: 186, clientesNuevosCantidad: 286, clientesNuevosMillones: 27, recompraCantidad: 1137, recompraMillones: 159, ticketPromedio: 130709 },
    { mes: 'Febrero', mesNumero: 2, anio: 2025, ventasCantidad: 1094, ventasMillones: 155, clientesNuevosCantidad: 172, clientesNuevosMillones: 23, recompraCantidad: 922, recompraMillones: 132, ticketPromedio: 141681 },
    { mes: 'Marzo', mesNumero: 3, anio: 2025, ventasCantidad: 1093, ventasMillones: 149, clientesNuevosCantidad: 155, clientesNuevosMillones: 18, recompraCantidad: 938, recompraMillones: 131, ticketPromedio: 136322 },
    { mes: 'Abril', mesNumero: 4, anio: 2025, ventasCantidad: 1063, ventasMillones: 144, clientesNuevosCantidad: 156, clientesNuevosMillones: 17, recompraCantidad: 907, recompraMillones: 127, ticketPromedio: 135465 },
    { mes: 'Mayo', mesNumero: 5, anio: 2025, ventasCantidad: 1197, ventasMillones: 157, clientesNuevosCantidad: 217, clientesNuevosMillones: 22, recompraCantidad: 1025, recompraMillones: 145, ticketPromedio: 131161 },
    { mes: 'Junio', mesNumero: 6, anio: 2025, ventasCantidad: 1242, ventasMillones: 156, clientesNuevosCantidad: 257, clientesNuevosMillones: 23, recompraCantidad: 940, recompraMillones: 133, ticketPromedio: 125603 },
    { mes: 'Julio', mesNumero: 7, anio: 2025, ventasCantidad: 1430, ventasMillones: 200, clientesNuevosCantidad: 276, clientesNuevosMillones: 29, recompraCantidad: 1154, recompraMillones: 171, ticketPromedio: 139860 },
    { mes: 'Agosto', mesNumero: 8, anio: 2025, ventasCantidad: 1099, ventasMillones: 145, clientesNuevosCantidad: 237, clientesNuevosMillones: 23, recompraCantidad: 862, recompraMillones: 122, ticketPromedio: 131938 },
    { mes: 'Septiembre', mesNumero: 9, anio: 2025, ventasCantidad: 1170, ventasMillones: 160, clientesNuevosCantidad: 207, clientesNuevosMillones: 20, recompraCantidad: 963, recompraMillones: 141, ticketPromedio: 136752 },
    { mes: 'Octubre', mesNumero: 10, anio: 2025, ventasCantidad: 1170, ventasMillones: 158, clientesNuevosCantidad: 227, clientesNuevosMillones: 22, recompraCantidad: 943, recompraMillones: 136, ticketPromedio: 135042 },
    { mes: 'Noviembre', mesNumero: 11, anio: 2025, ventasCantidad: 1041, ventasMillones: 147, clientesNuevosCantidad: 164, clientesNuevosMillones: 16, recompraCantidad: 877, recompraMillones: 131, ticketPromedio: 141210 },
    { mes: 'Diciembre', mesNumero: 12, anio: 2025, ventasCantidad: 1373, ventasMillones: 209, clientesNuevosCantidad: 176, clientesNuevosMillones: 20, recompraCantidad: 1196, recompraMillones: 188, ticketPromedio: 152221 },

    // ─── AÑO 2026 ───
    { mes: 'Enero', mesNumero: 1, anio: 2026, ventasCantidad: 1121, ventasMillones: 157, clientesNuevosCantidad: 179, clientesNuevosMillones: 19.1, recompraCantidad: 942, recompraMillones: 138.3, ticketPromedio: 140053 },
    { mes: 'Febrero', mesNumero: 2, anio: 2026, ventasCantidad: 1201, ventasMillones: 164, clientesNuevosCantidad: 319, clientesNuevosMillones: 33.8, recompraCantidad: 882, recompraMillones: 130.4, ticketPromedio: 136552 },
    { mes: 'Marzo', mesNumero: 3, anio: 2026, ventasCantidad: 1229, ventasMillones: 176, clientesNuevosCantidad: 279, clientesNuevosMillones: 24.6, recompraCantidad: 950, recompraMillones: 152.0, ticketPromedio: 143205 },
    { mes: 'Abril', mesNumero: 4, anio: 2026, ventasCantidad: 1136, ventasMillones: 188, clientesNuevosCantidad: 193, clientesNuevosMillones: 19.7, recompraCantidad: 942, recompraMillones: 168.5, ticketPromedio: 165492 },
    { mes: 'Mayo', mesNumero: 5, anio: 2026, ventasCantidad: 1014, ventasMillones: 147, clientesNuevosCantidad: 187, clientesNuevosMillones: 19.4, recompraCantidad: 827, recompraMillones: 127.7, ticketPromedio: 144970 },
    { mes: 'Junio', mesNumero: 6, anio: 2026, ventasCantidad: 1101, ventasMillones: 164, clientesNuevosCantidad: 172, clientesNuevosMillones: 17.6, recompraCantidad: 929, recompraMillones: 146.0, ticketPromedio: 148955 },
    { mes: 'Julio', mesNumero: 7, anio: 2026, ventasCantidad: 1325, ventasMillones: 200, clientesNuevosCantidad: 257, clientesNuevosMillones: 27.1, recompraCantidad: 1068, recompraMillones: 172.8, ticketPromedio: 150943 },
    { mes: 'Agosto', mesNumero: 8, anio: 2026, ventasCantidad: 1054, ventasMillones: 157, clientesNuevosCantidad: 166, clientesNuevosMillones: 18.2, recompraCantidad: 887, recompraMillones: 138.6, ticketPromedio: 148956 },
    { mes: 'Septiembre', mesNumero: 9, anio: 2026, ventasCantidad: 367, ventasMillones: 53, clientesNuevosCantidad: 67, clientesNuevosMillones: 8.0, recompraCantidad: 300, recompraMillones: 44.7, ticketPromedio: 144414 },
];

// ─────────────────────────────────────────────────────────────
// RENDIMIENTO ASESORES (Corte Agosto / Septiembre 2026)
// Extraído de Páginas 4 y 5 del Power BI
// ─────────────────────────────────────────────────────────────

export const ADVISORS_PERFORMANCE_DATA: AdvisorPerformance[] = [
    {
        id: 'karen',
        nombre: 'Karen',
        metaMillones: 30,
        ventasMillones: 49,
        porcentajeCumplimiento: 132,
        clientesNuevosCantidad: 36,
        clientesNuevosMillones: 4.9,
        recompraCantidad: 283,
        recompraMillones: 44.1,
        porcentajeNuevos: 11,
        porcentajeRecompra: 89,
        totalClientes: 319,
        ticketPromedioMil: 118,
        promedioProductosPorPedido: 2.53,
        perfilComercial: 'farmer',
        estadoRendimiento: 'supera_meta'
    },
    {
        id: 'katherine',
        nombre: 'Katherine',
        metaMillones: 30,
        ventasMillones: 36,
        porcentajeCumplimiento: 97,
        clientesNuevosCantidad: 25,
        clientesNuevosMillones: 2.7,
        recompraCantidad: 223,
        recompraMillones: 33.0,
        porcentajeNuevos: 10,
        porcentajeRecompra: 90,
        totalClientes: 248,
        ticketPromedioMil: 116,
        promedioProductosPorPedido: 2.45,
        perfilComercial: 'farmer',
        estadoRendimiento: 'en_meta'
    },
    {
        id: 'andrea',
        nombre: 'Andrea',
        metaMillones: 30,
        ventasMillones: 21,
        porcentajeCumplimiento: 59,
        clientesNuevosCantidad: 16,
        clientesNuevosMillones: 0.8,
        recompraCantidad: 131,
        recompraMillones: 20.2,
        porcentajeNuevos: 11,
        porcentajeRecompra: 89,
        totalClientes: 147,
        ticketPromedioMil: 104,
        promedioProductosPorPedido: 2.53,
        perfilComercial: 'farmer',
        estadoRendimiento: 'en_riesgo'
    },
    {
        id: 'diego',
        nombre: 'Diego',
        metaMillones: 30,
        ventasMillones: 21,
        porcentajeCumplimiento: 56,
        clientesNuevosCantidad: 25,
        clientesNuevosMillones: 2.9,
        recompraCantidad: 117,
        recompraMillones: 17.9,
        porcentajeNuevos: 18,
        porcentajeRecompra: 82,
        totalClientes: 142,
        ticketPromedioMil: 104,
        promedioProductosPorPedido: 2.37,
        perfilComercial: 'balanceado',
        estadoRendimiento: 'en_riesgo'
    },
    {
        id: 'laura',
        nombre: 'Laura',
        metaMillones: 30,
        ventasMillones: 18,
        porcentajeCumplimiento: 48,
        clientesNuevosCantidad: 49,
        clientesNuevosMillones: 5.5,
        recompraCantidad: 81,
        recompraMillones: 12.0,
        porcentajeNuevos: 37,
        porcentajeRecompra: 62,
        totalClientes: 130,
        ticketPromedioMil: 95,
        promedioProductosPorPedido: 2.56,
        perfilComercial: 'hunter',
        estadoRendimiento: 'en_riesgo'
    },
    {
        id: 'camilo',
        nombre: 'Camilo',
        metaMillones: 30,
        ventasMillones: 3,
        porcentajeCumplimiento: 9,
        clientesNuevosCantidad: 12,
        clientesNuevosMillones: 1.0,
        recompraCantidad: 24,
        recompraMillones: 2.0,
        porcentajeNuevos: 33,
        porcentajeRecompra: 67,
        totalClientes: 36,
        ticketPromedioMil: 65,
        promedioProductosPorPedido: 1.89,
        perfilComercial: 'hunter',
        estadoRendimiento: 'critico'
    },
];

// ─────────────────────────────────────────────────────────────
// VENTAS PUNTO DE VENTA (MOSTRADOR FÍSICO SOACHA)
// Extraído de Página 8 del Power BI
// ─────────────────────────────────────────────────────────────

export const POS_MONTHLY_DATA: PosMonthlySales[] = [
    {
        mes: 'Enero',
        mesNumero: 1,
        anio: 2026,
        totalMillones: 4.7,
        dias: []
    },
    {
        mes: 'Febrero',
        mesNumero: 2,
        anio: 2026,
        totalMillones: 5.8,
        dias: []
    },
    {
        mes: 'Marzo',
        mesNumero: 3,
        anio: 2026,
        totalMillones: 6.5,
        dias: []
    },
    {
        mes: 'Abril',
        mesNumero: 4,
        anio: 2026,
        totalMillones: 5.9,
        dias: []
    },
    {
        mes: 'Mayo',
        mesNumero: 5,
        anio: 2026,
        totalMillones: 5.4,
        dias: []
    },
    {
        mes: 'Junio',
        mesNumero: 6,
        anio: 2026,
        totalMillones: 4.3,
        dias: []
    },
    {
        mes: 'Julio',
        mesNumero: 7,
        anio: 2026,
        totalMillones: 7.2,
        dias: [
            { dia: 1, fecha: '2026-07-01', ventasMil: 149, pedidosCantidad: 3 },
            { dia: 2, fecha: '2026-07-02', ventasMil: 110, pedidosCantidad: 2 },
            { dia: 3, fecha: '2026-07-03', ventasMil: 380, pedidosCantidad: 6 },
            { dia: 4, fecha: '2026-07-04', ventasMil: 320, pedidosCantidad: 5 },
            { dia: 5, fecha: '2026-07-05', ventasMil: 350, pedidosCantidad: 5 },
            { dia: 6, fecha: '2026-07-06', ventasMil: 270, pedidosCantidad: 4 },
            { dia: 7, fecha: '2026-07-07', ventasMil: 75, pedidosCantidad: 1 },
            { dia: 8, fecha: '2026-07-08', ventasMil: 310, pedidosCantidad: 4 },
            { dia: 9, fecha: '2026-07-09', ventasMil: 180, pedidosCantidad: 3 },
            { dia: 10, fecha: '2026-07-10', ventasMil: 90, pedidosCantidad: 2 },
            { dia: 11, fecha: '2026-07-11', ventasMil: 170, pedidosCantidad: 3 },
            { dia: 12, fecha: '2026-07-12', ventasMil: 25, pedidosCantidad: 1 },
            { dia: 13, fecha: '2026-07-13', ventasMil: 61, pedidosCantidad: 1 },
            { dia: 14, fecha: '2026-07-14', ventasMil: 105, pedidosCantidad: 2 },
            { dia: 15, fecha: '2026-07-15', ventasMil: 791, pedidosCantidad: 11 }, // Quincena
            { dia: 16, fecha: '2026-07-16', ventasMil: 160, pedidosCantidad: 3 },
            { dia: 17, fecha: '2026-07-17', ventasMil: 552, pedidosCantidad: 8 },
            { dia: 18, fecha: '2026-07-18', ventasMil: 188, pedidosCantidad: 3 },
            { dia: 19, fecha: '2026-07-19', ventasMil: 40, pedidosCantidad: 1 },
            { dia: 20, fecha: '2026-07-20', ventasMil: 138, pedidosCantidad: 2 },
            { dia: 21, fecha: '2026-07-21', ventasMil: 73, pedidosCantidad: 1 },
            { dia: 22, fecha: '2026-07-22', ventasMil: 391, pedidosCantidad: 6 },
            { dia: 23, fecha: '2026-07-23', ventasMil: 240, pedidosCantidad: 4 },
            { dia: 24, fecha: '2026-07-24', ventasMil: 300, pedidosCantidad: 5 },
            { dia: 25, fecha: '2026-07-25', ventasMil: 59, pedidosCantidad: 1 },
            { dia: 26, fecha: '2026-07-26', ventasMil: 210, pedidosCantidad: 3 },
            { dia: 27, fecha: '2026-07-27', ventasMil: 190, pedidosCantidad: 3 },
            { dia: 28, fecha: '2026-07-28', ventasMil: 175, pedidosCantidad: 3 },
            { dia: 29, fecha: '2026-07-29', ventasMil: 119, pedidosCantidad: 2 },
            { dia: 30, fecha: '2026-07-30', ventasMil: 290, pedidosCantidad: 4 },
            { dia: 31, fecha: '2026-07-31', ventasMil: 585, pedidosCantidad: 9 }, // Cierre
        ]
    },
    {
        mes: 'Agosto',
        mesNumero: 8,
        anio: 2026,
        totalMillones: 6.4,
        dias: [
            { dia: 1, fecha: '2026-08-01', ventasMil: 169, pedidosCantidad: 3 },
            { dia: 2, fecha: '2026-08-02', ventasMil: 632, pedidosCantidad: 9 },
            { dia: 3, fecha: '2026-08-03', ventasMil: 685, pedidosCantidad: 10 },
            { dia: 4, fecha: '2026-08-04', ventasMil: 155, pedidosCantidad: 2 },
            { dia: 5, fecha: '2026-08-05', ventasMil: 75, pedidosCantidad: 1 },
            { dia: 6, fecha: '2026-08-06', ventasMil: 240, pedidosCantidad: 4 },
            { dia: 7, fecha: '2026-08-07', ventasMil: 190, pedidosCantidad: 3 },
            { dia: 8, fecha: '2026-08-08', ventasMil: 303, pedidosCantidad: 5 },
            { dia: 9, fecha: '2026-08-09', ventasMil: 140, pedidosCantidad: 2 },
            { dia: 10, fecha: '2026-08-10', ventasMil: 100, pedidosCantidad: 2 },
            { dia: 11, fecha: '2026-08-11', ventasMil: 190, pedidosCantidad: 3 },
            { dia: 12, fecha: '2026-08-12', ventasMil: 250, pedidosCantidad: 4 },
            { dia: 13, fecha: '2026-08-13', ventasMil: 130, pedidosCantidad: 2 },
            { dia: 14, fecha: '2026-08-14', ventasMil: 160, pedidosCantidad: 3 },
            { dia: 15, fecha: '2026-08-15', ventasMil: 401, pedidosCantidad: 7 }, // Quincena
            { dia: 16, fecha: '2026-08-16', ventasMil: 30, pedidosCantidad: 1 },
            { dia: 17, fecha: '2026-08-17', ventasMil: 200, pedidosCantidad: 3 },
            { dia: 18, fecha: '2026-08-18', ventasMil: 190, pedidosCantidad: 3 },
            { dia: 19, fecha: '2026-08-19', ventasMil: 42, pedidosCantidad: 1 },
            { dia: 20, fecha: '2026-08-20', ventasMil: 310, pedidosCantidad: 5 },
            { dia: 21, fecha: '2026-08-21', ventasMil: 506, pedidosCantidad: 8 },
            { dia: 22, fecha: '2026-08-22', ventasMil: 320, pedidosCantidad: 5 },
            { dia: 23, fecha: '2026-08-23', ventasMil: 116, pedidosCantidad: 2 },
            { dia: 24, fecha: '2026-08-24', ventasMil: 145, pedidosCantidad: 2 },
            { dia: 25, fecha: '2026-08-25', ventasMil: 340, pedidosCantidad: 5 },
            { dia: 26, fecha: '2026-08-26', ventasMil: 290, pedidosCantidad: 4 },
            { dia: 27, fecha: '2026-08-27', ventasMil: 310, pedidosCantidad: 5 },
            { dia: 28, fecha: '2026-08-28', ventasMil: 350, pedidosCantidad: 5 },
            { dia: 29, fecha: '2026-08-29', ventasMil: 315, pedidosCantidad: 5 },
            { dia: 30, fecha: '2026-08-30', ventasMil: 634, pedidosCantidad: 9 }, // Quincena
            { dia: 31, fecha: '2026-08-31', ventasMil: 577, pedidosCantidad: 8 }, // Cierre
        ]
    }
];

// ─────────────────────────────────────────────────────────────
// UTILIDADES ANALÍTICAS Y GAPS DE INTELIGENCIA COMERCIAL
// ─────────────────────────────────────────────────────────────

/**
 * Genera el resumen ejecutivo comercial para un mes dado
 */
export function getCommercialSummaryForMonth(
    mesNumero: number = 8,
    anio: number = 2026,
    metaGlobalMillones: number = 220
): CommercialReportSummary {
    const data = HISTORICAL_SALES_DATA.find(d => d.mesNumero === mesNumero && d.anio === anio);

    const ventasActuales = data ? data.ventasMillones : 157;
    const porcentajeCumplimiento = Math.round((ventasActuales / metaGlobalMillones) * 100);

    // Calcular Run-rate proyectado (si es mes actual o mes cerrado)
    // Para agosto (31 días), supongamos corte al día 22 si estuviera activo o fin de mes
    const diasMes = 31;
    const diasTranscurridos = mesNumero === 9 ? 17 : 31; // Septiembre va en día 17
    const ventasMesActual = mesNumero === 9 ? 53 : ventasActuales;

    const runRate = Math.round((ventasMesActual / diasTranscurridos) * diasMes);
    const diasRestantes = Math.max(1, diasMes - diasTranscurridos);
    const faltanteMeta = Math.max(0, metaGlobalMillones - ventasMesActual);
    const gapDiarioNecesario = Number((faltanteMeta / diasRestantes).toFixed(1));

    const totalPedidos = data ? data.ventasCantidad : 1054;
    const totalClientesNuevos = data ? data.clientesNuevosCantidad : 166;
    const totalRecompra = data ? data.recompraCantidad : 887;
    const tasaRecompra = Math.round((totalRecompra / Math.max(1, totalPedidos)) * 100);

    return {
        metaGlobalMillones,
        ventasActualesMillones: ventasMesActual,
        porcentajeCumplimientoGlobal: porcentajeCumplimiento,
        metaNuevosPorcentaje: 75,
        logradoNuevosPorcentaje: Math.round((totalClientesNuevos / 250) * 100), // meta ~250 clientes nuevos
        proyeccionCierreMillones: runRate,
        gapDiarioNecesarioMillones: gapDiarioNecesario,
        totalPedidosMes: totalPedidos,
        totalClientesActivos: totalPedidos,
        ticketPromedioGeneral: data ? data.ticketPromedio : 148956,
        tasaRecompraPorcentaje: tasaRecompra
    };
}
