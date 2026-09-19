/**
 * Biocambio360 — Servicio Comercial de Asesores, Cartera y Gamificación de Metas
 * Sustituye completamente el libro 'DIA A DIA BIO.xlsx' y las asignaciones en WhatsApp
 */

import {
    collection,
    doc,
    getDocs,
    getDoc,
    updateDoc,
    query,
    where,
    limit,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Customer } from '@/types/customer';
import { CustomerCRM } from '@/types/crm';
import { enrichCustomerWithCRM } from './crm-service';
import { getOrdersByAdvisor, getDraftOrdersByAdvisor } from './orders-service';
import { Order } from '@/types/order';

export interface AdvisorGoalConfig {
    advisorName: string;
    metaMensualCOP: number;
    porcentajeComisionBase: number;
    porcentajeComisionBonoMeta: number;
}

export const DEFAULT_ADVISOR_GOALS: Record<string, AdvisorGoalConfig> = {
    Karen:     { advisorName: 'Karen',     metaMensualCOP: 30000000, porcentajeComisionBase: 2.0, porcentajeComisionBonoMeta: 3.5 },
    Katherine: { advisorName: 'Katherine', metaMensualCOP: 30000000, porcentajeComisionBase: 2.0, porcentajeComisionBonoMeta: 3.5 },
    Andrea:    { advisorName: 'Andrea',    metaMensualCOP: 30000000, porcentajeComisionBase: 2.0, porcentajeComisionBonoMeta: 3.5 },
    Diego:     { advisorName: 'Diego',     metaMensualCOP: 30000000, porcentajeComisionBase: 2.0, porcentajeComisionBonoMeta: 3.5 },
    Laura:     { advisorName: 'Laura',     metaMensualCOP: 30000000, porcentajeComisionBase: 2.0, porcentajeComisionBonoMeta: 3.5 },
    Camilo:    { advisorName: 'Camilo',    metaMensualCOP: 30000000, porcentajeComisionBase: 2.0, porcentajeComisionBonoMeta: 3.5 },
};

export interface AdvisorPortfolioSummary {
    advisorName: string;
    totalClientes: number;
    clientesNuevosEsteMes: number;
    clientesEnRiesgo: number;
    ventasAcumuladasMes: number;
    metaMesCOP: number;
    porcentajeCumplimiento: number;
    comisionesEstimadasCOP: number;
    pedidosMesCount: number;
    pedidosHoyCount: number;
    ticketPromedioMes: number;
    pedidosRecientes: (Order & { id: string })[];
    clientesPrioritarios: CustomerCRM[];
    desgloseEscenarios: {
        efectivosCount: number;
        efectivosMonto: number;
        pendientesCount: number;
        pendientesMonto: number;
        novedadesCount: number;
        novedadesMonto: number;
        borradoresCount: number;
        borradoresMonto: number;
    };
}

/**
 * Obtiene el resumen de cartera y métricas de un asesor específico
 */
export async function getAdvisorPortfolio(advisorName: string): Promise<AdvisorPortfolioSummary> {
    const config = DEFAULT_ADVISOR_GOALS[advisorName] || {
        advisorName,
        metaMensualCOP: 30000000,
        porcentajeComisionBase: 2.0,
        porcentajeComisionBonoMeta: 3.5,
    };

    try {
        const customersCol = collection(db, 'customers');
        const q = query(customersCol, where('assignedTo', '==', advisorName), limit(500));
        const snap = await getDocs(q);

        const clients: CustomerCRM[] = [];
        let ventasAcumuladas = 0;

        snap.forEach(d => {
            const data = d.data();
            const customer: Customer = {
                id: d.id,
                nombre: data.nombre || 'Cliente',
                cedula: data.cedula || '',
                celular: data.celular || d.id || '',
                email: data.email || '',
                direccion: data.direccion || '',
                ciudad: data.ciudad || '',
                departamento: data.departamento || '',
                totalSpent: data.totalSpent || 0,
                ordersCount: data.ordersCount || 0,
                lastOrderDate: data.lastOrderDate || null,
                firstOrderDate: data.firstOrderDate || null,
                createdAt: data.createdAt || null,
                updatedAt: data.updatedAt || null,
            };

            const enriched = enrichCustomerWithCRM(customer, {
                tags: data.tags || [],
                assignedTo: data.assignedTo,
                sarlaftStatus: data.sarlaftStatus,
                lastActivityAt: data.lastActivityAt,
            });

            ventasAcumuladas += (data.totalSpent || 0);
            clients.push(enriched);
        });

        // Ordenar clientes prioritarios (primero en riesgo y recompra)
        const prioritarios = [...clients]
            .sort((a, b) => {
                const weight = (c: CustomerCRM) => (c.stage === 'at_risk' ? 3 : c.stage === 'vip' ? 2 : 1);
                return weight(b) - weight(a);
            })
            .slice(0, 20);

        // Consultar órdenes reales del mes en curso para el asesor (excluye borradores y cancelados)
        let advisorOrders: (Order & { id: string })[] = [];
        try {
            advisorOrders = await getOrdersByAdvisor(advisorName);
        } catch (ordErr) {
            console.warn(`[AdvisorService] No se pudieron cargar órdenes de ${advisorName}:`, ordErr);
        }

        // Consultar cotizaciones y borradores en caliente del asesor
        let advisorDrafts: (Order & { id: string })[] = [];
        try {
            advisorDrafts = await getDraftOrdersByAdvisor(advisorName);
        } catch (draftErr) {
            console.warn(`[AdvisorService] No se pudieron cargar borradores de ${advisorName}:`, draftErr);
        }

        // ⚠️ REGLA CRÍTICA DE AUDITORÍA:
        // Los borradores ('borrador') y cancelados ('cancelado') NUNCA computan como pedidos cerrados ni suman a la meta mensual
        const closedOrders = advisorOrders.filter(
            ord => ord.status !== 'borrador' && ord.status !== 'cancelado'
        );

        let ventasMesReal = 0;
        let pedidosHoyCount = 0;
        const todayStr = new Date().toDateString();

        if (closedOrders.length > 0) {
            ventasMesReal = closedOrders.reduce((sum, ord) => sum + (ord.total || 0), 0);
            pedidosHoyCount = closedOrders.filter(ord => {
                const d = ord.createdAt?.toMillis?.() ? new Date(ord.createdAt.toMillis()) : null;
                return d && d.toDateString() === todayStr;
            }).length;
        } else {
            // Si no hay pedidos cerrados este mes, las ventas son $0 (NUNCA usar ventas históricas de clientes)
            ventasMesReal = 0;
        }

        const pedidosMesCount = closedOrders.length;
        const ticketPromedio = pedidosMesCount > 0 ? Math.round(ventasMesReal / pedidosMesCount) : 0;
        const cumplimiento = Math.round((ventasMesReal / config.metaMensualCOP) * 100);
        const tasaComision = cumplimiento >= 100 ? config.porcentajeComisionBonoMeta : config.porcentajeComisionBase;
        const comisiones = Math.round(ventasMesReal * (tasaComision / 100));

        // Desglose de Escenarios Operativos del Mes:
        // 1. Efectivos / En Firme (confirmado, preparacion, enviado, en_camino, entregado)
        const efectivos = closedOrders.filter(o =>
            ['confirmado', 'preparacion', 'enviado', 'en_camino', 'entregado'].includes(o.status)
        );
        // 2. Pendientes de Validación/Pago (pendiente)
        const pendientes = closedOrders.filter(o => o.status === 'pendiente');
        // 3. Novedades de Entrega (no_entregado)
        const novedades = closedOrders.filter(o => o.status === 'no_entregado');
        // 4. Borradores / Cotizaciones Activas (borrador)
        const borradores = advisorDrafts.filter(d => d.status === 'borrador');

        const desgloseEscenarios = {
            efectivosCount: efectivos.length,
            efectivosMonto: efectivos.reduce((s, o) => s + (o.total || 0), 0),
            pendientesCount: pendientes.length,
            pendientesMonto: pendientes.reduce((s, o) => s + (o.total || 0), 0),
            novedadesCount: novedades.length,
            novedadesMonto: novedades.reduce((s, o) => s + (o.total || 0), 0),
            borradoresCount: borradores.length,
            borradoresMonto: borradores.reduce((s, o) => s + (o.total || 0), 0),
        };

        return {
            advisorName,
            totalClientes: clients.length,
            clientesNuevosEsteMes: clients.filter(c => c.ordersCount <= 1).length,
            clientesEnRiesgo: clients.filter(c => c.stage === 'at_risk' || c.stage === 'lost').length,
            ventasAcumuladasMes: ventasMesReal,
            metaMesCOP: config.metaMensualCOP,
            porcentajeCumplimiento: cumplimiento,
            comisionesEstimadasCOP: comisiones,
            pedidosMesCount,
            pedidosHoyCount,
            ticketPromedioMes: ticketPromedio,
            pedidosRecientes: closedOrders.slice(0, 30),
            clientesPrioritarios: prioritarios,
            desgloseEscenarios,
        };
    } catch (error) {
        console.error(`[AdvisorService] Error cargando cartera de ${advisorName}:`, error);
        return {
            advisorName,
            totalClientes: 0,
            clientesNuevosEsteMes: 0,
            clientesEnRiesgo: 0,
            ventasAcumuladasMes: 0,
            metaMesCOP: config.metaMensualCOP,
            porcentajeCumplimiento: 0,
            comisionesEstimadasCOP: 0,
            pedidosMesCount: 0,
            pedidosHoyCount: 0,
            ticketPromedioMes: 0,
            pedidosRecientes: [],
            clientesPrioritarios: [],
            desgloseEscenarios: {
                efectivosCount: 0,
                efectivosMonto: 0,
                pendientesCount: 0,
                pendientesMonto: 0,
                novedadesCount: 0,
                novedadesMonto: 0,
                borradoresCount: 0,
                borradoresMonto: 0,
            },
        };
    }
}

export interface AdvisorAlertsData {
    recompras: any[]; // CustomerReplenishment[]
    entregasDiaSiguiente: (Order & { id: string })[];
    totalAlertasCount: number;
}

/**
 * Obtiene las alertas operativas del día para el asesor:
 * 1. Recompras sugeridas (fin de ciclo o riesgo)
 * 2. Entregas día siguiente (confirmación de recepción y efectivo contraentrega)
 */
export async function getAdvisorAlertsData(advisorName: string): Promise<AdvisorAlertsData> {
    try {
        const { getAllReplenishmentRecords } = await import('./replenishment-service');
        const replenishments = await getAllReplenishmentRecords();

        // Filtrar clientes en alerta o vencidos
        const recompras = replenishments.filter(r => 
            r.status === 'alerta_temprana' || 
            r.status === 'critico_10_dias' || 
            r.status === 'vencido'
        ).slice(0, 50);

        // Consultar pedidos activos para entrega próxima
        const ordersRef = collection(db, 'orders');
        const qOrders = query(
            ordersRef,
            where('status', 'in', ['preparacion', 'enviado', 'en_camino']),
            limit(100)
        );
        const ordersSnap = await getDocs(qOrders);

        const entregasDiaSiguiente: (Order & { id: string })[] = [];
        if (ordersSnap && typeof (ordersSnap as any).forEach === 'function') {
            ordersSnap.forEach(d => {
                const ord = { id: d.id, ...d.data() } as Order & { id: string };
                const ordAdvisor = ord.asesorNombre || (ord as any).asesor || (ord as any).advisorName || (ord as any).assignedToAdvisor || '';
                const isUniversal = !advisorName || advisorName.toLowerCase() === 'todos' || advisorName === 'Diego' || advisorName === 'Fernando' || advisorName === 'Julián' || advisorName === 'Danilo';

                if (isUniversal || !ordAdvisor || ordAdvisor.toLowerCase() === advisorName.toLowerCase()) {
                    entregasDiaSiguiente.push(ord);
                }
            });
        }

        return {
            recompras,
            entregasDiaSiguiente,
            totalAlertasCount: recompras.length + entregasDiaSiguiente.length
        };
    } catch (err) {
        console.error(`[AdvisorService] Error obteniendo alertas de ${advisorName}:`, err);
        return {
            recompras: [],
            entregasDiaSiguiente: [],
            totalAlertasCount: 0
        };
    }
}

/**
 * Marca un pedido como alertado para la entrega del día siguiente,
 * registrando trazabilidad del autor, timestamp y actividad CRM.
 */
export async function markOrderDeliveryAlertSent(
    orderId: string,
    authorName: string,
    authorEmail?: string
): Promise<void> {
    const orderDocRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderDocRef);
    if (!orderSnap.exists()) throw new Error(`Pedido no encontrado: ${orderId}`);

    const nowIso = new Date().toISOString();
    await updateDoc(orderDocRef, {
        alertaEntregaEnviada: true,
        alertaEntregaEnviadaAt: nowIso,
        alertaEntregaEnviadaPor: authorName,
        updatedAt: Timestamp.now(),
    });

    const orderData = orderSnap.data() as Order;
    const cleanPhone = (orderData.cliente?.celular || '').replace(/\D/g, '');

    if (cleanPhone) {
        try {
            const { addCRMActivity } = await import('./crm-service');
            await addCRMActivity({
                customerId: cleanPhone,
                type: 'whatsapp',
                description: `Protocolo Alerta de Entrega Día Siguiente enviado por ${authorName}. Total contraentrega: $${(orderData.total || 0).toLocaleString('es-CO')} COP.`,
                authorName,
                authorEmail: authorEmail || 'asesores@biocambio360.com',
            });
        } catch (e: any) {
            console.warn('[AdvisorService] Error registrando actividad CRM:', e.message);
        }
    }
}

