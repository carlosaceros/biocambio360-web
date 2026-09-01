import { Timestamp } from 'firebase/firestore';

export type OrderStatus =
    | 'pendiente'
    | 'confirmado'
    | 'preparacion'
    | 'enviado'
    | 'en_camino'
    | 'entregado'
    | 'cancelado';

export interface OrderCustomer {
    nombre: string;
    cedula: string;
    celular: string;
    email?: string;
    departamento: string;
    ciudad: string;
    direccion: string;
    notas?: string;
}

export interface OrderItem {
    product: {
        id: string;
        nombre: string;
        imgFile: string;
    };
    size: string;
    cantidad: number;
    price: number;
}

export interface OrderInternalNote {
    id: string;
    text: string;
    authorEmail: string;
    authorName: string;
    authorRole: string;
    createdAt: string; // ISO string
    stageAtCreation?: OrderStatus;
    isStatusChangeNote?: boolean;
    previousStatus?: OrderStatus;
    newStatus?: OrderStatus;
}

export interface TimelineEvent {
    status: OrderStatus;
    timestamp: Timestamp | any;
    user?: string;
    userEmail?: string;
    userRole?: string;
    note?: string;
}

export interface WompiTransactionDetails {
    id?: string;
    status?: string; // 'APPROVED' | 'PENDING' | 'DECLINED' | 'VOIDED' | 'ERROR'
    reference?: string;
    amountInCents?: number;
    paymentMethodType?: string; // 'CARD' | 'NEQUI' | 'BANCOLOMBIA_TRANSFER' | 'PSE' | 'DAVIPLATA'
    currency?: string;
    customerEmail?: string;
    statusMessage?: string;
    updatedAt?: string;
    raw?: any;
}

export interface Order {
    id: string;
    cliente: OrderCustomer;
    productos: OrderItem[];
    subtotal: number;
    envio: number;
    total: number;
    metodoPago: 'contraentrega' | 'wompi';
    status: OrderStatus;
    cuponAplicado?: {
        code: string;
        type: string;
        value: number;
        discountAmount: number;
    };
    origen?: {
        tipo?: 'pauta_meta' | 'pauta_google' | 'pauta_tiktok' | 'organico' | 'directo' | 'referido';
        fuente?: string;
        etiqueta?: string;
        medio?: string;
        campana?: string;
        contenido?: string;
        termino?: string;
        fbclid?: string;
        gclid?: string;
        referrer?: string;
        landingPage?: string;
        timestamp?: number;
    };
    wompiTransaction?: WompiTransactionDetails;
    timeline: TimelineEvent[];
    notasInternas?: OrderInternalNote[];
    whatsappConversation?: string[];
    notas?: string[];
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, {
    label: string;
    color: string;
    bgColor: string;
    icon: string;
}> = {
    pendiente: {
        label: 'Pendiente',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-100',
        icon: '⏳'
    },
    confirmado: {
        label: 'Confirmado',
        color: 'text-blue-700',
        bgColor: 'bg-blue-100',
        icon: '✅'
    },
    preparacion: {
        label: 'En Preparación',
        color: 'text-purple-700',
        bgColor: 'bg-purple-100',
        icon: '📦'
    },
    enviado: {
        label: 'Enviado',
        color: 'text-indigo-700',
        bgColor: 'bg-indigo-100',
        icon: '🚚'
    },
    en_camino: {
        label: 'En Camino',
        color: 'text-orange-700',
        bgColor: 'bg-orange-100',
        icon: '📍'
    },
    entregado: {
        label: 'Entregado',
        color: 'text-green-700',
        bgColor: 'bg-green-100',
        icon: '✓'
    },
    cancelado: {
        label: 'Cancelado',
        color: 'text-red-700',
        bgColor: 'bg-red-100',
        icon: '✕'
    }
};
