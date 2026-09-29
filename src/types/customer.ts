import { Timestamp } from 'firebase/firestore';

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

    // Migrado desde Kommo (etiquetas libres, no forzadas al enum cerrado CustomerTag)
    externalTags?: string[];
    kommoContactId?: string;
    kommoMigratedAt?: Timestamp | any;

    // Metadata
    createdAt: Timestamp | any;
    updatedAt: Timestamp | any;
}

