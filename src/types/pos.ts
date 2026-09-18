/**
 * Biocambio360 — Tipos para Punto de Venta (POS Mostrador Físico Soacha)
 * Sustituye completamente el libro 'APP PUNTO VENTAS.xlsx'
 */

export type PosPaymentMethod =
    | 'efectivo'
    | 'datafono'
    | 'nequi'
    | 'daviplata'
    | 'transferencia'
    | 'mixto'
    | 'obsequio';

export interface PosItem {
    productId: string;
    nombre: string;
    size: string;
    cantidad: number;
    price: number;
    subtotal: number;
    lote?: string;
    imgFile?: string;
}

export interface PosSaleCustomer {
    nombre?: string;
    cedula?: string;
    celular?: string;
    email?: string;
}

export interface PosSale {
    id: string;
    numeroTicket: string;
    fecha: any; // Timestamp | string
    cajeroId: string;
    cajeroNombre: string;
    asesor?: string; // Karen, Katherine, Andrea, Diego, Laura, Camilo
    cliente?: PosSaleCustomer;
    items: PosItem[];
    subtotal: number;
    descuento: number;
    total: number;
    metodoPago: PosPaymentMethod;
    montoEfectivo?: number;
    montoCambio?: number;
    comprobanteTransaccion?: string;
    observaciones?: string;
    estado: 'completada' | 'anulada';
    lotePrincipal?: string;
    canal?: 'mostrador_pos' | 'tienda_online' | 'call_center';
    origen?: string;
    isOffline?: boolean;
    syncStatus?: 'synced' | 'pending_sync';
    createdAt: any;
}

export interface PosInventoryItem {
    id: string; // SKU_SIZE (ej: detergente-multiusos_20L)
    productId: string;
    nombre: string;
    size: string;
    stockActual: number;
    stockMinimoSeguridad: number;
    entradasTotales: number;
    salidasTotales: number;
    ultimoLote?: string;
    updatedAt: any;
}

export interface PosWarehouseTransferItem {
    productId: string;
    nombre: string;
    size: string;
    cantidadSolicitada: number;
    cantidadDespachada?: number;
    lote?: string;
}

export interface PosWarehouseTransfer {
    id: string;
    consecutivo: string;
    solicitadoPor: string;
    despachadoPor?: string;
    recibidoPor?: string;
    items: PosWarehouseTransferItem[];
    estado: 'pendiente' | 'aprobado' | 'en_transito' | 'recibido' | 'cancelado';
    notas?: string;
    createdAt: any;
    updatedAt: any;
}

export interface PosCashRegisterSession {
    id: string;
    cajeroId: string;
    cajeroNombre: string;
    fechaApertura: any;
    fechaCierre?: any;
    baseInicialEfectivo: number;
    totalVentasEfectivoCalculado: number;
    totalVentasElectronicasCalculado: number;
    efectivoFisicoReportado?: number;
    diferenciaEfectivo?: number; // Negativo = Faltante, Positivo = Sobrante
    estado: 'abierta' | 'cerrada';
    observacionesCierre?: string;
    createdAt: any;
}
