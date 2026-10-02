import { Timestamp } from 'firebase/firestore';
import type { RecompraChecklist } from './crm';

export interface Customer {
    id: string; // Will use phone number as ID for uniqueness
    nombre: string;
    cedula: string;
    celular: string;
    email?: string;
    direccion: string;
    ciudad: string;
    departamento: string;
    asesorAsignado?: string;

    // Stats
    totalSpent: number;
    ordersCount: number;
    lastOrderDate: Timestamp | any;
    firstOrderDate: Timestamp | any;

    // Optional CRM / Referrals
    isReferrer?: boolean;
    referralCode?: string;
    stage?: string;
    sarlaftStatus?: string;
    notas?: string;

    // Migrado desde Kommo (datos de referencia, nunca sobrescriben nombre/direccion/etc. propios)
    externalTags?: string[];
    kommoContactId?: string;
    kommoMigratedAt?: Timestamp | any;
    kommoNombre?: string;
    kommoApellido?: string;
    kommoEtapa?: string;
    kommoLocalidad?: string;
    kommoDireccion?: string;
    kommoObservacion?: string;
    kommoTipoCliente?: string;
    kommoCedula?: string;
    kommoLeadNota?: string;

    // Calificación manual del asesor (percepción de calidad/potencial, no NPS del cliente)
    advisorRating?: number;          // 1-5
    advisorRatingNote?: string;
    advisorRatingAt?: string;        // ISO date string
    advisorRatingBy?: string;        // email del asesor
    // Checklist de seguimiento de recompra (hitos 15/30/45/60/90/120 días desde la última compra)
    recompraChecklist?: RecompraChecklist;

    // Metadata
    createdAt: Timestamp | any;
    updatedAt: Timestamp | any;
}

