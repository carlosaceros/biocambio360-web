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
} from 'firebase/firestore';
import { db } from './firebase';
import { Customer } from '@/types/customer';
import { CustomerCRM } from '@/types/crm';
import { enrichCustomerWithCRM } from './crm-service';
import { getOrdersByAdvisor } from './orders-service';
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

        // Consultar órdenes reales del mes en curso para el asesor
        let advisorOrders: (Order & { id: string })[] = [];
        try {
            advisorOrders = await getOrdersByAdvisor(advisorName);
        } catch (ordErr) {
            console.warn(`[AdvisorService] No se pudieron cargar órdenes de ${advisorName}:`, ordErr);
        }

        let ventasMesReal = 0;
        let pedidosHoyCount = 0;
        const todayStr = new Date().toDateString();

        if (advisorOrders.length > 0) {
            ventasMesReal = advisorOrders.reduce((sum, ord) => sum + (ord.total || 0), 0);
            pedidosHoyCount = advisorOrders.filter(ord => {
                const d = ord.createdAt?.toMillis?.() ? new Date(ord.createdAt.toMillis()) : null;
                return d && d.toDateString() === todayStr;
            }).length;
        } else {
            // Fallback para asesores sin órdenes registradas aún
            ventasMesReal = ventasAcumuladas;
        }

        const pedidosMesCount = advisorOrders.length;
        const ticketPromedio = pedidosMesCount > 0 ? Math.round(ventasMesReal / pedidosMesCount) : 0;
        const cumplimiento = Math.round((ventasMesReal / config.metaMensualCOP) * 100);
        const tasaComision = cumplimiento >= 100 ? config.porcentajeComisionBonoMeta : config.porcentajeComisionBase;
        const comisiones = Math.round(ventasMesReal * (tasaComision / 100));

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
            pedidosRecientes: advisorOrders.slice(0, 30),
            clientesPrioritarios: prioritarios,
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
                const ordAdvisor = (ord as any).asesor || (ord as any).advisorName || (ord as any).assignedToAdvisor || '';
                // Si tiene asesor asignado, filtrar por asesor o permitir ver las de su cartera
                if (!ordAdvisor || ordAdvisor.toLowerCase() === advisorName.toLowerCase() || advisorName === 'Diego' || advisorName === 'Fernando') {
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

