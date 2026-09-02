import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    increment,
    runTransaction
} from 'firebase/firestore';
import { db } from './firebase';
import { 
    ReferralProfile, 
    ReferralTransaction, 
    ReferralConfig, 
    ReferralTier 
} from '@/types/referral';
import { Coupon } from './coupon-types';

export const DEFAULT_REFERRAL_CONFIG: ReferralConfig = {
    isActive: true,
    rewardAmount: 10000,
    friendDiscountAmount: 10000,
    friendDiscountType: 'fixed',
    minOrderSubtotal: 50000,
    minReferrerSpend: 50000, // Pedido mínimo que debe haber hecho el embajador para que su código funcione
    validityDays: 60,
    tierThresholds: {
        aliadoMinOrders: 3,
        embajadorMinOrders: 10,
    },
    whatsappShareMessageTemplate: '¡Hola! Te recomiendo los productos de aseo concentrados de fábrica en Biocambio360. Usa mi enlace y recibe $10.000 COP de descuento en tu primer pedido: {LINK}'
};

const profilesCollection = collection(db, 'referral_profiles');
const transactionsCollection = collection(db, 'referral_transactions');
const configDocRef = doc(db, 'referral_config', 'main');

/**
 * Saneador recursivo para evitar que Firestore falle ante campos con valor undefined
 */
function removeUndefined<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
        return obj.map(item => removeUndefined(item)) as unknown as T;
    }
    return Object.fromEntries(
        Object.entries(obj as Record<string, unknown>)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, typeof v === 'object' && v !== null ? removeUndefined(v) : v])
    ) as T;
}

/**
 * Obtener la configuración general del programa de referidos
 */
export async function getReferralConfig(): Promise<ReferralConfig> {
    try {
        const snap = await getDoc(configDocRef);
        if (snap.exists()) {
            return { ...DEFAULT_REFERRAL_CONFIG, ...(snap.data() as ReferralConfig) };
        }
    } catch (e) {
        console.warn('Error al obtener referral_config, usando defaults:', e);
    }
    return DEFAULT_REFERRAL_CONFIG;
}

/**
 * Guardar la configuración general del programa
 */
export async function saveReferralConfig(config: Partial<ReferralConfig>): Promise<void> {
    const payload = removeUndefined({
        ...config,
        updatedAt: Timestamp.now()
    });
    await setDoc(configDocRef, payload, { merge: true });
}

/**
 * Genera un código único a partir del nombre o celular
 * Ej: Si el nombre es Carlos Aceros -> CARLOS360 o BIO-CARLOS
 */
export function generateReferralCode(nombre: string, celular: string): string {
    const cleanFirst = nombre.trim().split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
    const cleanPhoneSuffix = celular.replace(/\D/g, '').slice(-3);
    const prefix = cleanFirst.length >= 3 ? cleanFirst.slice(0, 6) : 'BIO';
    return `${prefix}${cleanPhoneSuffix || '360'}`;
}

/**
 * Obtiene o crea el perfil de embajador/referidor para un cliente
 */
export async function getOrCreateReferralProfile(customerData: {
    nombre: string;
    cedula: string;
    celular: string;
    email?: string;
    ciudad?: string;
}): Promise<ReferralProfile> {
    const cleanPhone = customerData.celular.replace(/\D/g, '');
    const profileRef = doc(profilesCollection, cleanPhone);
    const snap = await getDoc(profileRef);

    if (snap.exists()) {
        return snap.data() as ReferralProfile;
    }

    // Generar código único asegurando que no colisione
    let candidateCode = generateReferralCode(customerData.nombre, customerData.celular);
    const existingCodeQuery = query(profilesCollection, where('code', '==', candidateCode));
    const querySnap = await getDocs(existingCodeQuery);
    if (!querySnap.empty) {
        candidateCode = `${candidateCode}${Math.floor(10 + Math.random() * 89)}`;
    }

    const newProfile: ReferralProfile = {
        id: cleanPhone,
        code: candidateCode,
        nombre: customerData.nombre,
        cedula: customerData.cedula || '000000',
        celular: customerData.celular,
        email: customerData.email || '',
        ciudad: customerData.ciudad || 'Colombia',
        tier: 'referidor',
        totalReferredOrders: 0,
        totalDeliveredOrders: 0,
        totalSalesGenerated: 0,
        balancePending: 0,
        balanceAvailable: 0,
        balanceRedeemed: 0,
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
    };

    await setDoc(profileRef, removeUndefined(newProfile));
    return newProfile;
}

/**
 * Buscar un perfil por su código de referido
 */
export async function getReferralProfileByCode(code: string): Promise<ReferralProfile | null> {
    if (!code) return null;
    const cleanCode = code.trim().toUpperCase();
    const q = query(profilesCollection, where('code', '==', cleanCode), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as ReferralProfile;
}

/**
 * Buscar un perfil por celular
 */
export async function getReferralProfileByPhone(phone: string): Promise<ReferralProfile | null> {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return null;
    const snap = await getDoc(doc(profilesCollection, cleanPhone));
    if (!snap.exists()) return null;
    return snap.data() as ReferralProfile;
}

/**
 * Verifica si el embajador tiene al menos una compra calificada (>= minReferrerSpend, ej. $50.000 COP)
 * Revisa el documento del cliente en 'customers' o directamente en la colección 'orders'.
 */
export async function checkReferrerQualifiedPurchase(phone: string, minSpend = 50000): Promise<{
    qualified: boolean;
    totalSpent: number;
    ordersCount: number;
    highestOrder: number;
}> {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return { qualified: false, totalSpent: 0, ordersCount: 0, highestOrder: 0 };

    try {
        // 1. Revisar colección customers
        const customerSnap = await getDoc(doc(db, 'customers', cleanPhone));
        if (customerSnap.exists()) {
            const cData = customerSnap.data();
            const spent = cData.totalSpent || 0;
            const count = cData.ordersCount || 0;
            if (spent >= minSpend && count > 0) {
                return { qualified: true, totalSpent: spent, ordersCount: count, highestOrder: spent };
            }
        }

        // 2. Revisar colección orders por si las compras aún no consolidaron en customers
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, where('cliente.celular', '==', cleanPhone));
        const ordersSnap = await getDocs(q);

        let total = 0;
        let count = 0;
        let maxOrder = 0;

        ordersSnap.forEach(d => {
            const data = d.data();
            // Descartar pedidos cancelados
            if (data.status !== 'cancelado') {
                const val = data.subtotal || data.total || 0;
                total += val;
                count++;
                if (val > maxOrder) maxOrder = val;
            }
        });

        // Cumple si su mayor pedido o su gasto total supera el mínimo
        const isQualified = maxOrder >= minSpend || total >= minSpend;
        return {
            qualified: isQualified,
            totalSpent: total,
            ordersCount: count,
            highestOrder: maxOrder
        };
    } catch (err) {
        console.warn('[Referrals] Error verificando compra previa del embajador:', err);
        return { qualified: false, totalSpent: 0, ordersCount: 0, highestOrder: 0 };
    }
}

/**
 * Validar si un código de referido puede ser utilizado por un cliente en el checkout
 * Reglas de validación:
 * 1. El programa debe estar activo.
 * 2. El código debe existir y estar activo.
 * 3. REGLA ESTRICTA: El embajador DEBE tener al menos 1 pedido previo calificado (>= minReferrerSpend, ej: $50.000 COP).
 * 4. Antifraude: El cliente comprador no puede ser el mismo embajador (mismo celular o cédula).
 * 5. Subtotal mínimo requerido para la compra del nuevo cliente.
 */
export async function validateReferralCodeForOrder(
    code: string,
    customer: { celular: string; cedula?: string; email?: string },
    subtotal: number
): Promise<{
    valid: boolean;
    discountAmount: number;
    profile?: ReferralProfile;
    message: string;
}> {
    const config = await getReferralConfig();
    if (!config.isActive) {
        return { valid: false, discountAmount: 0, message: 'El programa de referidos no está activo en este momento.' };
    }

    const profile = await getReferralProfileByCode(code);
    if (!profile) {
        return { valid: false, discountAmount: 0, message: 'Código de referido no encontrado.' };
    }

    if (!profile.isActive) {
        return { valid: false, discountAmount: 0, message: 'Este código de referido ya no se encuentra activo.' };
    }

    // Validación Antifraude: LISTA NEGRA / BLOQUEO POR FRAUDE
    if (profile.isBlacklisted) {
        return {
            valid: false,
            discountAmount: 0,
            message: 'Este código de referido no está disponible por políticas de seguridad del programa.'
        };
    }

    // Validación Antifraude: Límite Máximo de Referidos (Cap preventivo)
    const maxCap = config.maxReferralsCap || 15;
    if ((profile.totalReferredOrders || 0) >= maxCap) {
        return {
            valid: false,
            discountAmount: 0,
            message: 'Este código de embajador ha alcanzado el límite máximo de referidos permitidos.'
        };
    }

    // Validación de Compra Mínima Previa del Referidor (Mín. $50.000 COP)
    const minRequiredSpend = config.minReferrerSpend || 50000;
    const qualification = await checkReferrerQualifiedPurchase(profile.celular, minRequiredSpend);

    if (!qualification.qualified && !profile.hasQualifiedPurchase) {
        return {
            valid: false,
            discountAmount: 0,
            message: `El código ${profile.code} aún no está activo. El embajador debe contar con al menos una compra previa mínima de $${minRequiredSpend.toLocaleString('es-CO')} COP en Biocambio360.`
        };
    }

    // Validación Antifraude de Autorreferido
    const buyerPhone = customer.celular.replace(/\D/g, '');
    const referrerPhone = profile.celular.replace(/\D/g, '');
    if (buyerPhone && buyerPhone === referrerPhone) {
        return {
            valid: false,
            discountAmount: 0,
            message: 'No puedes usar tu propio código de embajador para tu compra.'
        };
    }

    if (customer.cedula && profile.cedula && customer.cedula.trim() === profile.cedula.trim()) {
        return {
            valid: false,
            discountAmount: 0,
            message: 'No puedes autorreferirte usando el mismo documento de identidad.'
        };
    }

    if (subtotal < config.minOrderSubtotal) {
        return {
            valid: false,
            discountAmount: 0,
            message: `El pedido mínimo para aplicar el descuento de referido es de $${config.minOrderSubtotal.toLocaleString('es-CO')} COP.`
        };
    }

    const discountAmount = config.friendDiscountType === 'percentage'
        ? Math.round(subtotal * (config.friendDiscountAmount / 100))
        : config.friendDiscountAmount;

    return {
        valid: true,
        discountAmount,
        profile: {
            ...profile,
            hasQualifiedPurchase: true,
            totalPersonalSpent: qualification.totalSpent
        },
        message: `¡Código de embajador aplicado! Descuento de $${discountAmount.toLocaleString('es-CO')} COP concedido.`
    };
}

/**
 * Registrar una transacción de referido vinculada a una nueva orden (en estado PENDIENTE)
 */
export async function recordReferralTransaction(params: {
    orderId: string;
    profileId: string;
    referralCode: string;
    customer: { nombre: string; cedula?: string; celular: string; ciudad: string };
    orderSubtotal: number;
    orderTotal: number;
    discountAmount: number;
}): Promise<void> {
    const config = await getReferralConfig();
    const txId = `tx_${params.orderId}`;
    const txRef = doc(transactionsCollection, txId);
    const profileRef = doc(profilesCollection, params.profileId);

    const now = Timestamp.now();
    const newTx: ReferralTransaction = {
        id: txId,
        referralProfileId: params.profileId,
        referralCode: params.referralCode,
        orderId: params.orderId,
        referredCustomer: params.customer,
        orderSubtotal: params.orderSubtotal,
        orderTotal: params.orderTotal,
        rewardAmount: config.rewardAmount,
        friendDiscountAmount: params.discountAmount,
        status: 'pending',
        createdAt: now,
        updatedAt: now
    };

    await setDoc(txRef, removeUndefined(newTx));

    // Incrementar balance pendiente en el perfil del embajador
    await updateDoc(profileRef, {
        totalReferredOrders: increment(1),
        totalSalesGenerated: increment(params.orderTotal),
        balancePending: increment(config.rewardAmount),
        updatedAt: now
    });
}

/**
 * Actualizar el estado de la transacción cuando cambia el estado del pedido (ej. de pendiente a entregado o cancelado)
 */
export async function updateReferralTransactionOnOrderStatusChange(
    orderId: string,
    newStatus: string
): Promise<void> {
    const txId = `tx_${orderId}`;
    const txRef = doc(transactionsCollection, txId);
    const txSnap = await getDoc(txRef);

    if (!txSnap.exists()) return;
    const tx = txSnap.data() as ReferralTransaction;
    const profileRef = doc(profilesCollection, tx.referralProfileId);
    const now = Timestamp.now();

    // Si ya estaba aprobada o rechazada, no duplicar cambios
    if (tx.status === 'approved' && newStatus === 'entregado') return;
    if (tx.status === 'rejected' && newStatus === 'cancelado') return;

    if (newStatus === 'entregado') {
        // Se aprueba la recompensa y se pasa el balance de pendiente a disponible
        await runTransaction(db, async (t) => {
            const profDoc = await t.get(profileRef);
            if (!profDoc.exists()) return;
            const prof = profDoc.data() as ReferralProfile;

            const config = await getReferralConfig();
            const newDelivered = (prof.totalDeliveredOrders || 0) + 1;
            let newTier: ReferralTier = prof.tier;
            if (newDelivered >= config.tierThresholds.embajadorMinOrders) {
                newTier = 'embajador';
            } else if (newDelivered >= config.tierThresholds.aliadoMinOrders) {
                newTier = 'aliado';
            }

            t.update(txRef, {
                status: 'approved',
                approvedAt: now,
                updatedAt: now
            });

            t.update(profileRef, {
                totalDeliveredOrders: increment(1),
                balancePending: increment(-tx.rewardAmount),
                balanceAvailable: increment(tx.rewardAmount),
                tier: newTier,
                updatedAt: now
            });
        });
    } else if (newStatus === 'cancelado') {
        // Se rechaza la transacción y se descuenta el saldo pendiente
        await runTransaction(db, async (t) => {
            const profDoc = await t.get(profileRef);
            if (!profDoc.exists()) return;

            t.update(txRef, {
                status: 'rejected',
                rejectionReason: 'Pedido cancelado o devuelto',
                updatedAt: now
            });

            t.update(profileRef, {
                balancePending: increment(-tx.rewardAmount),
                updatedAt: now
            });
        });
    }
}

/**
 * Genera un cupón de compra para que el embajador use su saldo acumulado en la tienda
 */
export async function redeemReferralBalanceToCoupon(
    phone: string,
    amountToRedeem: number
): Promise<{ success: boolean; couponCode?: string; message: string }> {
    const cleanPhone = phone.replace(/\D/g, '');
    const profileRef = doc(profilesCollection, cleanPhone);

    try {
        let codeGenerated = '';
        await runTransaction(db, async (t) => {
            const profDoc = await t.get(profileRef);
            if (!profDoc.exists()) {
                throw new Error('Perfil de embajador no encontrado.');
            }
            const prof = profDoc.data() as ReferralProfile;
            if (prof.balanceAvailable < amountToRedeem || amountToRedeem <= 0) {
                throw new Error('Saldo disponible insuficiente para redimir.');
            }

            codeGenerated = `REDIM-${cleanPhone.slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`;

            // Crear el cupón en la colección coupons
            const couponRef = doc(collection(db, 'coupons'), codeGenerated.toLowerCase());
            const couponData: Coupon = {
                id: codeGenerated.toLowerCase(),
                code: codeGenerated,
                type: 'fixed_amount',
                value: amountToRedeem,
                minSubtotal: amountToRedeem,
                validFrom: new Date().toISOString(),
                validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
                maxRedemptionsTotal: 1,
                redemptionsCount: 0,
                maxRedemptionsPerUser: 1,
                firstPurchaseOnly: false,
                isActive: true,
                usageHistory: []
            };
            t.set(couponRef, couponData);

            // Actualizar balances del embajador
            t.update(profileRef, {
                balanceAvailable: increment(-amountToRedeem),
                balanceRedeemed: increment(amountToRedeem),
                updatedAt: Timestamp.now()
            });
        });

        return {
            success: true,
            couponCode: codeGenerated,
            message: `¡Cupón ${codeGenerated} generado con éxito por valor de $${amountToRedeem.toLocaleString('es-CO')} COP!`
        };
    } catch (err: any) {
        return {
            success: false,
            message: err.message || 'Error al redimir el saldo.'
        };
    }
}

/**
 * Obtener todos los perfiles de embajadores para el panel de administración
 */
export async function getAllReferralProfiles(): Promise<ReferralProfile[]> {
    try {
        const q = query(profilesCollection, orderBy('totalSalesGenerated', 'desc'));
        const snap = await getDocs(q);
        return snap.docs.map(d => d.data() as ReferralProfile);
    } catch (e) {
        console.error('Error al listar perfiles de referidos:', e);
        return [];
    }
}

/**
 * Obtener todas las transacciones de referidos para el panel de administración
 */
export async function getAllReferralTransactions(): Promise<ReferralTransaction[]> {
    try {
        const q = query(transactionsCollection, orderBy('createdAt', 'desc'), limit(200));
        const snap = await getDocs(q);
        return snap.docs.map(d => d.data() as ReferralTransaction);
    } catch (e) {
        console.error('Error al listar transacciones de referidos:', e);
        return [];
    }
}

/**
 * Actualizar manualmente el estado de un perfil de embajador (activar/suspender/ajuste de saldo)
 */
export async function updateReferralProfileAdmin(
    profileId: string,
    updates: Partial<ReferralProfile>
): Promise<void> {
    const profileRef = doc(profilesCollection, profileId);
    await updateDoc(profileRef, {
        ...updates,
        updatedAt: Timestamp.now()
    });
}

/**
 * Poner en Lista Negra o rehabilitar un perfil de embajador por intento de fraude.
 * Opcionalmente congela o pone en 0 el saldo disponible/pendiente como sanción.
 */
export async function toggleBlacklistReferralProfile(
    profileId: string,
    isBlacklisted: boolean,
    reason?: string,
    penalizeBalances = false
): Promise<void> {
    const profileRef = doc(profilesCollection, profileId);
    const now = Timestamp.now();

    const updates: Record<string, any> = {
        isBlacklisted,
        blacklistReason: isBlacklisted ? (reason || 'Sancionado por sospecha de fraude en referidos') : '',
        isActive: !isBlacklisted,
        fraudAlert: isBlacklisted,
        updatedAt: now
    };

    if (isBlacklisted) {
        updates.blockedAt = now;
        if (penalizeBalances) {
            // Cancelar y anular saldos por fraude demostrado
            updates.balanceAvailable = 0;
            updates.balancePending = 0;
        }
    }

    await updateDoc(profileRef, updates);
}
