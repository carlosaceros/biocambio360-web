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

    // Stats
    totalSpent: number;
    ordersCount: number;
    lastOrderDate: Timestamp;
    firstOrderDate: Timestamp;

    // Metadata
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
