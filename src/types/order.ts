import { Timestamp } from 'firebase/firestore';

export type OrderStatus =
    | 'borrador'
    | 'pendiente'
    | 'confirmado'
    | 'preparacion'
    | 'enviado'
    | 'en_camino'
    | 'no_entregado'
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
    barrio?: string;
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

export interface AddiTransactionDetails {
    applicationId?: string;
    orderId?: string;
    attemptId?: string;
    status?: 'APPROVED' | 'REJECTED' | 'DECLINED' | 'PENDING' | string;
    approvedAmount?: number | string;
    currency?: string;
    updatedAt?: string;
    raw?: any;
    note?: string;
}

export interface OrderDeliveryException {
    motivo:
        | 'cliente_ausente'
        | 'sin_dinero'
        | 'direccion_erronea'
        | 'solicito_reprogramacion'
        | 'rechazado'
        | 'zona_dificil'
        | 'perdido_transportadora'
        | 'otro';
    motivoDetalle?: string;
    fechaNovedad: string; // ISO string
    intentosPrevios?: number;
    resolucion?: 'reintento_programado' | 'devuelto_bodega' | 'perdido_transportadora';
    fechaReintentoProgramada?: string; // YYYY-MM-DD
    franjaHoraria?: 'manana' | 'tarde' | 'todo_el_dia';
    tarifaEspecialReintento?: number; // COP adicional o acordado
    fleteAnterior?: number;
    transportadoraReintento?: string; // Ej: "Flota Propia Biocambio360", "99 Envíos", "Interrapidísimo"
    nuevaDireccion?: string;
    nuevoBarrio?: string;
    nuevoTelefono?: string;
    gestorResponsable?: string;
    gestorEmail?: string;
    notasSeguimiento?: string;
    reclamacionSeguroTransportadora?: {
        radicado?: string;
        montoReclamado?: number;
        estado?: 'pendiente' | 'aprobado' | 'rechazado';
    };
}

export interface Order {
    id: string;
    cliente: OrderCustomer;
    productos: OrderItem[];
    subtotal: number;
    envio: number;
    total: number;
    metodoPago: 'contraentrega' | 'wompi' | 'addi' | 'transferencia' | 'efectivo_pos' | 'sistecredito' | string;
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
    referralInfo?: {
        code: string;
        referrerPhone: string;
        rewardAmount: number;
        discountAmount: number;
    };
    alertaDireccionReciente?: boolean;
    alertaDireccionDetalle?: {
        mensaje: string;
        diasAtras: number;
        pedidoPrevioId: string;
        direccionPrevia: string;
        clientePrevio: string;
        celularPrevio: string;
        fechaPrevia?: string;
    };
    wompiTransaction?: WompiTransactionDetails;
    addiTransaction?: AddiTransactionDetails;
    timeline: TimelineEvent[];
    notasInternas?: OrderInternalNote[];
    whatsappConversation?: string[];
    notas?: string[];
    guiaTransportadora?: string;
    transportadora?: string;
    trackingUrl?: string;
    canal?: 'tienda_virtual' | 'call_center' | 'whatsapp' | 'pos' | 'b2b' | string;
    asesorId?: string;
    asesorNombre?: string;
    asesorEmail?: string;
    motivoBorrador?: string;
    novedadEntrega?: OrderDeliveryException;
    // ── Logística de Flota Propia, Mensajería y Alertas ──
    tipoEnvio?: 'flota_propia' | '99envios' | 'recogida_mostrador';
    fechaProgramadaEntrega?: string; // YYYY-MM-DD
    franjaHorariaEntrega?: 'manana' | 'tarde' | 'todo_el_dia' | string;
    mensajeroId?: string;
    mensajeroNombre?: string;
    mensajeroTelefono?: string;
    mensajeroPlaca?: string;
    mensajeroAsignadoAt?: string;
    estadoMensajeria?: 'asignado' | 'en_ruta' | 'entregado' | 'novedad';
    tarifaFleteMensajero?: number;
    mensajeroLiquidado?: boolean;
    fechaLiquidacionMensajero?: string;
    recaudoEfectivoRecibido?: number;
    alertaEntregaEnviada?: boolean;
    alertaEntregaEnviadaAt?: string;
    alertaEntregaEnviadaPor?: string;
    entregaConfirmadaPorCliente?: boolean;
    entregaModificacionSolicitada?: boolean;
    ubicacionEntrega?: { lat: number; lng: number; name?: string; address?: string; mapsUrl?: string; at?: string };
    pruebaEntrega?: {
        recibidoPor: string;
        documentoRecibido?: string;
        parentesco?: string;
        fecha: string;
        recaudadoEfectivo?: number;
        firmaUrl?: string;
        fotoUrl?: string;
        origen?: string;
    };
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, {
    label: string;
    color: string;
    bgColor: string;
    icon: string;
}> = {
    borrador: {
        label: 'Borrador / Cotización',
        color: 'text-amber-800',
        bgColor: 'bg-amber-100',
        icon: '📝'
    },
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
    no_entregado: {
        label: 'No Entregado / Novedad',
        color: 'text-rose-800',
        bgColor: 'bg-rose-100',
        icon: '⚠️'
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
