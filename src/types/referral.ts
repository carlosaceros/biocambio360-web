import { Timestamp } from 'firebase/firestore';

export type ReferralTier = 'referidor' | 'aliado' | 'embajador';

export interface ReferralConfig {
    isActive: boolean;
    rewardAmount: number; // Monto en COP que gana el embajador (ej: 10000)
    friendDiscountAmount: number; // Descuento en COP para el amigo (ej: 10000)
    friendDiscountType: 'fixed' | 'percentage'; // 'fixed' o 'percentage'
    minOrderSubtotal: number; // Subtotal mínimo de compra para aplicar beneficio (ej: 50000)
    minReferrerSpend: number; // Compra mínima previa requerida por el referidor para que su código esté activo (ej: 50000)
    validityDays: number; // Días de validez de la recompensa
    tierThresholds: {
        aliadoMinOrders: number; // ej: 3
        embajadorMinOrders: number; // ej: 10
    };
    whatsappShareMessageTemplate: string;
    updatedAt?: Timestamp;
}

export interface ReferralProfile {
    id: string; // Celular limpio (solo dígitos)
    code: string; // Código alfanumérico único (ej: CARLOS360, BIO-1234)
    nombre: string;
    cedula: string;
    celular: string;
    email?: string;
    ciudad?: string;
    tier: ReferralTier;

    // Métricas del embajador
    totalReferredOrders: number;
    totalDeliveredOrders: number;
    totalSalesGenerated: number;

    // Métricas de compra personal del embajador
    totalPersonalSpent?: number; // Total acumulado en compras propias
    hasQualifiedPurchase?: boolean; // Verdadero si tiene al menos 1 pedido >= minReferrerSpend

    // Balances financieros (en COP)
    balancePending: number; // Por pedidos aún en preparación/camino
    balanceAvailable: number; // Saldo disponible para compras
    balanceRedeemed: number; // Saldo ya utilizado en pedidos

    isActive: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export type ReferralTransactionStatus = 'pending' | 'approved' | 'rejected' | 'redeemed';

export interface ReferralTransaction {
    id: string;
    referralProfileId: string; // Celular del embajador
    referralCode: string;
    orderId: string;
    referredCustomer: {
        nombre: string;
        cedula?: string;
        celular: string;
        ciudad: string;
    };
    orderSubtotal: number;
    orderTotal: number;
    rewardAmount: number; // Lo que gana el embajador
    friendDiscountAmount: number; // Lo que se ahorró el amigo
    status: ReferralTransactionStatus;
    rejectionReason?: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    approvedAt?: Timestamp;
}
