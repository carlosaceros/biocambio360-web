// Types and Interfaces for Coupons, Promotions and Spin-to-Win Wheel

export type CouponType = 'percentage' | 'fixed_amount' | 'free_shipping' | 'buy_x_get_y';

export interface CouponUsage {
    orderId?: string;
    customerEmail: string;
    customerPhone?: string;
    discountAmount: number;
    usedAt: string;
}

export interface Coupon {
    id: string;
    code: string; // Uppercase coupon code, e.g., 'PRIMERAZO10'
    type: CouponType;
    value: number; // e.g., 10 for 10%, 15000 for $15.000 COP
    minSubtotal: number; // Minimum subtotal in COP required
    maxDiscountAmount?: number; // Optional cap for percentage discounts
    validFrom: string; // ISO Date String
    validUntil: string; // ISO Date String
    maxRedemptionsTotal?: number; // Global usage limit
    redemptionsCount: number; // Current total redemptions
    maxRedemptionsPerUser?: number; // Max uses per customer email/phone (default 1)
    firstPurchaseOnly?: boolean; // Exclusive for first-time buyers
    applicableCategories?: string[]; // Optional restricted categories
    isActive: boolean;
    usageHistory?: CouponUsage[];
}

export interface AppliedCoupon {
    code: string;
    type: CouponType;
    value: number;
    discountAmount: number;
    message: string;
}

export interface CouponValidationResult {
    valid: boolean;
    reason?: string;
    coupon?: Coupon;
    discountAmount?: number;
    appliedCoupon?: AppliedCoupon;
}

export interface WheelSegment {
    id: string;
    label: string;
    couponCode: string;
    color: string;
    probabilityWeight: number; // 1-10 (higher = more frequent)
}

export interface WheelConfig {
    isActive: boolean;
    title: string;
    description: string;
    validUntil?: string;
    segments: WheelSegment[];
}
