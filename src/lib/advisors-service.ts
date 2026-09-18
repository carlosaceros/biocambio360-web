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

        const cumplimiento = Math.round((ventasAcumuladas / config.metaMensualCOP) * 100);
        const tasaComision = cumplimiento >= 100 ? config.porcentajeComisionBonoMeta : config.porcentajeComisionBase;
        const comisiones = Math.round(ventasAcumuladas * (tasaComision / 100));

        return {
            advisorName,
            totalClientes: clients.length,
            clientesNuevosEsteMes: clients.filter(c => c.ordersCount <= 1).length,
            clientesEnRiesgo: clients.filter(c => c.stage === 'at_risk' || c.stage === 'lost').length,
            ventasAcumuladasMes: ventasAcumuladas,
            metaMesCOP: config.metaMensualCOP,
            porcentajeCumplimiento: cumplimiento,
            comisionesEstimadasCOP: comisiones,
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
            clientesPrioritarios: [],
        };
    }
}
