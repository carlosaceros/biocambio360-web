import { Timestamp } from 'firebase/firestore';
import { Customer } from './customer';

// ─────────────────────────────────────────────────────────────
// CRM Pipeline Stages
// ─────────────────────────────────────────────────────────────

/**
 * Etapas del pipeline CRM.
 * Se calculan automáticamente a partir del comportamiento del cliente.
 */
export type CRMStage =
    | 'lead'            // Visitó / carrito abandonado, sin compra completada
    | 'first_purchase'  // Primera compra
    | 'returning'       // 2-3 compras
    | 'loyal'           // 4+ compras
    | 'vip'             // Alto valor: totalSpent > $500,000 COP
    | 'at_risk'         // Sin compra en >60 días
    | 'lost';           // Sin compra en >120 días

export const CRM_STAGE_CONFIG: Record<CRMStage, {
    label: string;
    emoji: string;
    color: string;
    bgColor: string;
    description: string;
}> = {
    lead:           { label: 'Lead',           emoji: '🔍', color: 'text-gray-700',   bgColor: 'bg-gray-100',    description: 'Visitante sin compra' },
    first_purchase: { label: 'Primera Compra', emoji: '🛒', color: 'text-blue-700',   bgColor: 'bg-blue-100',    description: 'Realizó su primera compra' },
    returning:      { label: 'Recurrente',     emoji: '🔄', color: 'text-indigo-700',  bgColor: 'bg-indigo-100',  description: '2-3 compras realizadas' },
    loyal:          { label: 'Leal',           emoji: '💎', color: 'text-purple-700',  bgColor: 'bg-purple-100',  description: '4+ compras realizadas' },
    vip:            { label: 'VIP',            emoji: '👑', color: 'text-amber-700',   bgColor: 'bg-amber-100',   description: 'Cliente de alto valor' },
    at_risk:        { label: 'En Riesgo',      emoji: '⚠️', color: 'text-orange-700',  bgColor: 'bg-orange-100',  description: 'Sin compra en +60 días' },
    lost:           { label: 'Perdido',        emoji: '❌', color: 'text-red-700',     bgColor: 'bg-red-100',     description: 'Sin compra en +120 días' },
};

// ─────────────────────────────────────────────────────────────
// Customer Tags
// ─────────────────────────────────────────────────────────────

export type CustomerTag =
    | 'b2b'
    | 'b2c'
    | 'suministradora'
    | 'revendedor'
    | 'hogar'
    | 'empresa'
    | 'institucional'
    | 'sarlaft_verificado'
    | 'sarlaft_pendiente';

export const CUSTOMER_TAG_CONFIG: Record<CustomerTag, {
    label: string;
    color: string;
    bgColor: string;
}> = {
    b2b:                 { label: 'B2B',                color: 'text-sky-700',     bgColor: 'bg-sky-100' },
    b2c:                 { label: 'B2C',                color: 'text-teal-700',    bgColor: 'bg-teal-100' },
    suministradora:      { label: 'Suministradora',     color: 'text-violet-700',  bgColor: 'bg-violet-100' },
    revendedor:          { label: 'Revendedor',         color: 'text-pink-700',    bgColor: 'bg-pink-100' },
    hogar:               { label: 'Hogar',              color: 'text-green-700',   bgColor: 'bg-green-100' },
    empresa:             { label: 'Empresa',            color: 'text-blue-700',    bgColor: 'bg-blue-100' },
    institucional:       { label: 'Institucional',      color: 'text-indigo-700',  bgColor: 'bg-indigo-100' },
    sarlaft_verificado:  { label: 'SARLAFT ✓',         color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
    sarlaft_pendiente:   { label: 'SARLAFT Pendiente',  color: 'text-yellow-700',  bgColor: 'bg-yellow-100' },
};

// ─────────────────────────────────────────────────────────────
// CRM Activity (Timeline de interacciones)
// ─────────────────────────────────────────────────────────────

export type CRMActivityType =
    | 'note'
    | 'call'
    | 'whatsapp'
    | 'email'
    | 'order'
    | 'recompra_alert'
    | 'sarlaft_check'
    | 'tag_change'
    | 'stage_change'
    | 'referral_activated'
    | 'advisor_reassigned';

export interface CRMActivity {
    id: string;
    customerId: string;     // celular limpio (doc ID de customers)
    type: CRMActivityType;
    description: string;
    authorEmail?: string;
    authorName?: string;
    metadata?: Record<string, any>;
    createdAt: any; // Timestamp | serverTimestamp
}

export const CRM_ACTIVITY_ICONS: Record<CRMActivityType, string> = {
    note:                '📝',
    call:                '📞',
    whatsapp:            '💬',
    email:               '📧',
    order:               '🛒',
    recompra_alert:      '🔔',
    sarlaft_check:       '🛡️',
    tag_change:          '🏷️',
    stage_change:        '📊',
    referral_activated:  '🌟',
    advisor_reassigned:  '🔄',
};

// ─────────────────────────────────────────────────────────────
// Extended Customer (con CRM fields)
// ─────────────────────────────────────────────────────────────

export interface CustomerCRM extends Customer {
    stage: CRMStage;
    tags: CustomerTag[];
    nextRecompraDate?: string;      // ISO date string
    recompraStatus?: 'surtido' | 'alerta_temprana' | 'critico_10_dias' | 'vencido';
    estimatedCycleDays?: number;
    lastActivityAt?: any;           // Timestamp
    sarlaftStatus?: 'pendiente' | 'verificado' | 'rechazado';
    sarlaftCheckedAt?: any;         // Timestamp
    assignedTo?: string;            // Asesor asignado (nombre o email)
    assignedToName?: string;
    assignedAt?: string;            // ISO date string
    assignedBy?: string;            // email del operador/coordinador que asignó
    // Campos Programa de Referidos (Comunidad Biocambio360)
    isReferrer?: boolean;
    referralCode?: string;
    referralActivatedManually?: boolean;
    referralActivatedBy?: string;
    referralActivatedAt?: string;
}

// ─────────────────────────────────────────────────────────────
// CRM Dashboard Stats
// ─────────────────────────────────────────────────────────────

export interface CRMDashboardStats {
    totalCustomers: number;
    byStage: Record<CRMStage, number>;
    byRecompraStatus: Record<string, number>;
    recentActivities: CRMActivity[];
    topCustomers: CustomerCRM[];
}

// ─────────────────────────────────────────────────────────────
// SARLAFT Types
// ─────────────────────────────────────────────────────────────

export type SARLAFTStatus = 'pendiente' | 'verificado' | 'rechazado';

export interface SARLAFTCheckResult {
    status: 'clean' | 'match' | 'review';
    matches: {
        source: string;
        name: string;
        document?: string;
        matchScore: number;
    }[];
    checkedAt: string; // ISO date
    checkedBy?: string;
}
