import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where
} from 'firebase/firestore';
import { db } from './firebase';
import { 
    Coupon, 
    CouponValidationResult, 
    AppliedCoupon, 
    WheelConfig 
} from './coupon-types';

const couponsCollection = collection(db, 'coupons');
const configDocRef = doc(db, 'admin_config', 'wheel');

// Default initial coupons for Colombian e-commerce retail
export const INITIAL_COUPONS: Coupon[] = [
    {
        id: 'coupon_primerazo10',
        code: 'PRIMERAZO10',
        type: 'percentage',
        value: 10,
        minSubtotal: 30000,
        maxDiscountAmount: 30000,
        validFrom: '2026-01-01T00:00:00.000Z',
        validUntil: '2026-12-31T23:59:59.000Z',
        maxRedemptionsTotal: 1000,
        redemptionsCount: 14,
        maxRedemptionsPerUser: 1,
        firstPurchaseOnly: true,
        isActive: true,
        usageHistory: []
    },
    {
        id: 'coupon_ahorro5k',
        code: 'AHORRO5K',
        type: 'fixed_amount',
        value: 5000,
        minSubtotal: 50000,
        validFrom: '2026-01-01T00:00:00.000Z',
        validUntil: '2026-12-31T23:59:59.000Z',
        maxRedemptionsTotal: 500,
        redemptionsCount: 8,
        maxRedemptionsPerUser: 2,
        firstPurchaseOnly: false,
        isActive: true,
        usageHistory: []
    },
    {
        id: 'coupon_enviovip',
        code: 'ENVIOVIP',
        type: 'free_shipping',
        value: 100, // 100% free shipping
        minSubtotal: 80000,
        validFrom: '2026-01-01T00:00:00.000Z',
        validUntil: '2026-12-31T23:59:59.000Z',
        maxRedemptionsTotal: 200,
        redemptionsCount: 5,
        maxRedemptionsPerUser: 1,
        firstPurchaseOnly: false,
        isActive: true,
        usageHistory: []
    },
    {
        id: 'coupon_ruleta15',
        code: 'RULETA15',
        type: 'percentage',
        value: 15,
        minSubtotal: 40000,
        maxDiscountAmount: 40000,
        validFrom: '2026-01-01T00:00:00.000Z',
        validUntil: '2026-12-31T23:59:59.000Z',
        maxRedemptionsTotal: 500,
        redemptionsCount: 19,
        maxRedemptionsPerUser: 1,
        firstPurchaseOnly: false,
        isActive: true,
        usageHistory: []
    }
];

export const DEFAULT_WHEEL_CONFIG: WheelConfig = {
    isActive: true,
    title: '¡Gira la Ruleta y Gana Descuentos Exclusivos!',
    description: 'Prueba tu suerte y obtén cupones instantáneos para tu pedido de productos de aseo.',
    validUntil: '2026-12-31T23:59:59.000Z',
    segments: [
        { id: 'seg_1', label: '10% OFF 1ra Compra', couponCode: 'PRIMERAZO10', color: '#E11D48', probabilityWeight: 4 },
        { id: 'seg_2', label: '$5.000 COP Dto.', couponCode: 'AHORRO5K', color: '#2563EB', probabilityWeight: 3 },
        { id: 'seg_3', label: '15% OFF Ruleta', couponCode: 'RULETA15', color: '#059669', probabilityWeight: 2 },
        { id: 'seg_4', label: 'Envío Gratis VIP', couponCode: 'ENVIOVIP', color: '#7C3AED', probabilityWeight: 1 }
    ]
};

/**
 * Gets all coupons from Firestore or fallback
 */
export async function getAllCoupons(): Promise<Coupon[]> {
    try {
        const snapshot = await getDocs(couponsCollection);
        if (snapshot.empty) {
            return INITIAL_COUPONS;
        }

        const list: Coupon[] = [];
        snapshot.forEach(docSnap => {
            list.push({ id: docSnap.id, ...docSnap.data() } as Coupon);
        });

        // Merge with static defaults if missing
        const map = new Map<string, Coupon>();
        INITIAL_COUPONS.forEach(c => map.set(c.code, c));
        list.forEach(c => map.set(c.code, c));

        return Array.from(map.values());
    } catch (e) {
        console.warn('Warning: Could not fetch coupons from Firestore, using initial fallback:', e);
        return INITIAL_COUPONS;
    }
}

/**
 * Saves or updates a coupon
 */
export async function saveCoupon(coupon: Coupon): Promise<void> {
    const docRef = doc(db, 'coupons', coupon.id);
    const { id, ...data } = coupon;
    await setDoc(docRef, data, { merge: true });
}

/**
 * Deletes a coupon
 */
export async function deleteCoupon(id: string): Promise<void> {
    const docRef = doc(db, 'coupons', id);
    await deleteDoc(docRef);
}

/**
 * Checks if a customer email/phone has past completed orders
 */
async function checkHasPastOrders(email?: string, phone?: string): Promise<boolean> {
    if (!email && !phone) return false;
    try {
        const ordersRef = collection(db, 'orders');
        let hasOrder = false;

        if (email) {
            const q = query(ordersRef, where('customerEmail', '==', email.toLowerCase().trim()));
            const snap = await getDocs(q);
            if (!snap.empty) hasOrder = true;
        }

        if (!hasOrder && phone) {
            const q = query(ordersRef, where('customerPhone', '==', phone.trim()));
            const snap = await getDocs(q);
            if (!snap.empty) hasOrder = true;
        }

        return hasOrder;
    } catch (e) {
        return false;
    }
}

/**
 * Validates a coupon code against all security rules
 */
export async function validateCouponCode(
    codeRaw: string,
    subtotal: number,
    customerEmail?: string,
    customerPhone?: string
): Promise<CouponValidationResult> {
    const code = codeRaw.toUpperCase().trim();
    if (!code) {
        return { valid: false, reason: 'Ingresa un código de cupón.' };
    }

    const coupons = await getAllCoupons();
    const coupon = coupons.find(c => c.code.toUpperCase() === code);

    if (!coupon) {
        return { valid: false, reason: 'El código de cupón ingresado no existe.' };
    }

    if (!coupon.isActive) {
        return { valid: false, reason: 'Este cupón se encuentra inactivo actualmente.' };
    }

    // Date validity check
    const now = new Date().toISOString();
    if (coupon.validFrom && now < coupon.validFrom) {
        return { valid: false, reason: 'Este cupón aún no se encuentra vigente.' };
    }
    if (coupon.validUntil && now > coupon.validUntil) {
        return { valid: false, reason: 'Este cupón ya ha expirado.' };
    }

    // Minimum Subtotal Check
    if (coupon.minSubtotal && subtotal < coupon.minSubtotal) {
        return { 
            valid: false, 
            reason: `Este cupón requiere un subtotal mínimo de $${coupon.minSubtotal.toLocaleString('es-CO')} COP.` 
        };
    }

    // Global Usage Limit Check
    if (coupon.maxRedemptionsTotal && coupon.redemptionsCount >= coupon.maxRedemptionsTotal) {
        return { valid: false, reason: 'Este cupón ya alcanzó el límite máximo de usos globales.' };
    }

    // Per-User Usage Limit Check
    if (customerEmail && coupon.usageHistory) {
        const userUsages = coupon.usageHistory.filter(
            u => u.customerEmail.toLowerCase() === customerEmail.toLowerCase()
        ).length;

        const maxPerUser = coupon.maxRedemptionsPerUser ?? 1;
        if (userUsages >= maxPerUser) {
            return { valid: false, reason: `Ya has utilizado este cupón el número máximo de veces permitido (${maxPerUser}).` };
        }
    }

    // First Purchase Only Check
    if (coupon.firstPurchaseOnly) {
        const hasPastOrders = await checkHasPastOrders(customerEmail, customerPhone);
        if (hasPastOrders) {
            return { valid: false, reason: 'Este cupón es exclusivo para la primera compra de nuevos clientes.' };
        }
    }

    // Calculate Discount Amount
    let discountAmount = 0;
    let message = '';

    if (coupon.type === 'percentage') {
        discountAmount = Math.round((subtotal * coupon.value) / 100);
        if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
            discountAmount = coupon.maxDiscountAmount;
        }
        message = `¡Descuento del ${coupon.value}% aplicado (-$${discountAmount.toLocaleString('es-CO')} COP)!`;
    } else if (coupon.type === 'fixed_amount') {
        discountAmount = Math.min(subtotal, coupon.value);
        message = `¡Descuento de $${discountAmount.toLocaleString('es-CO')} COP aplicado!`;
    } else if (coupon.type === 'free_shipping') {
        discountAmount = 0; // Handled in shipping fee deduction
        message = '¡Envío GRATIS desbloqueado con este cupón!';
    } else if (coupon.type === 'buy_x_get_y') {
        discountAmount = Math.round(subtotal * 0.15); // 15% special combo discount
        message = '¡Descuento de combo especial aplicado!';
    }

    const appliedCoupon: AppliedCoupon = {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discountAmount,
        message
    };

    return {
        valid: true,
        coupon,
        discountAmount,
        appliedCoupon
    };
}

/**
 * Records coupon redemption in Firestore after successful order placement
 */
export async function recordCouponRedemption(
    code: string,
    orderId: string,
    customerEmail: string,
    customerPhone: string,
    discountAmount: number
): Promise<void> {
    const coupons = await getAllCoupons();
    const coupon = coupons.find(c => c.code.toUpperCase() === code.toUpperCase());

    if (!coupon) return;

    const newRedemptionsCount = (coupon.redemptionsCount || 0) + 1;
    const newUsageHistory = [
        ...(coupon.usageHistory || []),
        {
            orderId,
            customerEmail,
            customerPhone,
            discountAmount,
            usedAt: new Date().toISOString()
        }
    ];

    await saveCoupon({
        ...coupon,
        redemptionsCount: newRedemptionsCount,
        usageHistory: newUsageHistory
    });
}

/**
 * Gets Wheel of Fortune Config
 */
export async function getWheelConfig(): Promise<WheelConfig> {
    try {
        const snap = await getDoc(configDocRef);
        if (snap.exists()) {
            return { ...DEFAULT_WHEEL_CONFIG, ...snap.data() } as WheelConfig;
        }
    } catch (e) {
        console.warn('Error fetching wheel config, returning default:', e);
    }
    return DEFAULT_WHEEL_CONFIG;
}

/**
 * Saves Wheel of Fortune Config
 */
export async function saveWheelConfig(config: WheelConfig): Promise<void> {
    await setDoc(configDocRef, config, { merge: true });
}
