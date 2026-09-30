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

    // Metadata
    createdAt: Timestamp | any;
    updatedAt: Timestamp | any;
}

