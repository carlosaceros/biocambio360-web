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
    ReferralTier,
    ReferralBalanceAuditLog
} from '@/types/referral';
import { Coupon } from './coupon-types';

export const DEFAULT_REFERRAL_CONFIG: ReferralConfig = {
    isActive: true,
    rewardAmount: 10000,
    friendDiscountAmount: 10000,
    friendDiscountType: 'fixed',
    minOrderSubtotal: 50000,
    minReferrerSpend: 50000, // Pedido mínimo que debe haber hecho el embajador para que su código funcione
    maxReferralsCap: 15, // Límite de seguridad de amigos referidos
    maxRedemptionPercentage: 50, // El saldo acumulado solo puede pagar hasta el 50% del valor del pedido propio
    validityDays: 60,
    tierThresholds: {
        aliadoMinOrders: 3,
        embajadorMinOrders: 10,
    },
    whatsappShareMessageTemplate: '¡Hola! Te recomiendo los productos de aseo concentrados de fábrica en Biocambio360. Usa mi enlace y recibe $10.000 COP de descuento en tu primer pedido: {LINK}'
};

const profilesCollection = collection(db, 'referral_profiles');
const transactionsCollection = collection(db, 'referral_transactions');
const balanceAuditCollection = collection(db, 'referral_balance_audit_logs');
const configDocRef = doc(db, 'referral_config', 'main');

/**
 * Estados que implican un pago real ya confirmado (el webhook de Wompi movió el pedido de
 * 'pendiente' a 'confirmado' y de ahí en adelante). 'pendiente' y 'borrador' quedan afuera a
 * propósito: como `orders` acepta create/update públicos en Firestore, cualquiera puede forjar
 * un pedido con `status: 'pendiente'` y un total alto sin pagar nada — contarlo aquí permitía
 * calificar como embajador sin haber comprado.
 */
const PAID_ORDER_STATUSES = new Set(['confirmado', 'preparacion', 'enviado', 'en_camino', 'no_entregado', 'entregado']);

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
 * Crea un Timestamp seguro compatible tanto con el SDK oficial como con entornos de test / Node
 */
/**
 * REGLA 2026 #3: el saldo debe quedar visible/disponible "al día siguiente", no a las 24 horas
 * exactas — una entrega confirmada muy en la tarde con la regla de 24h rodantes libera el saldo casi
 * a la misma hora al día siguiente (roza las 48h reales); con el corte a medianoche de Bogotá queda
 * disponible desde temprano el día calendario siguiente a la entrega, sin importar a qué hora se
 * confirmó, y sigue sin ser inmediato (nunca el mismo día).
 */
function nextCalendarDayBogota(fromMillis: number): number {
    const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC-5, sin horario de verano
    const bogotaNow = new Date(fromMillis - BOGOTA_OFFSET_MS);
    const nextDayUTCMidnight = Date.UTC(bogotaNow.getUTCFullYear(), bogotaNow.getUTCMonth(), bogotaNow.getUTCDate() + 1, 0, 0, 0);
    return nextDayUTCMidnight + BOGOTA_OFFSET_MS;
}

function createTimestampFromMillis(ms: number): Timestamp {
    if (typeof Timestamp.fromMillis === 'function') {
        return Timestamp.fromMillis(ms);
    }
    if (typeof Timestamp.fromDate === 'function') {
        return Timestamp.fromDate(new Date(ms));
    }
    return {
        toDate: () => new Date(ms),
        toMillis: () => ms,
        seconds: Math.floor(ms / 1000),
        nanoseconds: 0
    } as unknown as Timestamp;
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
 * Libera las transacciones que estaban en ventana de custodia de 24 horas ('holding_24h')
 * una vez que su fecha availableAt ha llegado. Transfiere el saldo a balanceAvailable
 * y renueva el contador de 60 días de vigencia continua (Rolling Expiration).
 */
export async function syncReferralReleases(phone: string): Promise<void> {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return;

    try {
        const qHolding = query(
            transactionsCollection,
            where('referralProfileId', '==', cleanPhone),
            where('releaseStatus', '==', 'holding_24h')
        );
        const holdingSnap = await getDocs(qHolding);
        if (holdingSnap.empty) return;

        const now = Date.now();
        const readyToRelease: ReferralTransaction[] = [];

        holdingSnap.forEach(d => {
            const tx = d.data() as ReferralTransaction;
            const availMillis = tx.availableAt?.toMillis ? tx.availableAt.toMillis() : 0;
            if (availMillis > 0 && availMillis <= now) {
                readyToRelease.push(tx);
            }
        });

        if (readyToRelease.length === 0) return;

        let totalToRelease = 0;
        const profileRef = doc(profilesCollection, cleanPhone);

        for (const tx of readyToRelease) {
            totalToRelease += tx.rewardAmount;
            const txRef = doc(transactionsCollection, tx.id);
            await updateDoc(txRef, {
                releaseStatus: 'released',
                updatedAt: Timestamp.now()
            });
        }

        const expiresAt = createTimestampFromMillis(Date.now() + 60 * 24 * 60 * 60 * 1000);
        const nowTs = Timestamp.now();

        await updateDoc(profileRef, {
            balanceInHolding: increment(-totalToRelease),
            balanceAvailable: increment(totalToRelease),
            balanceExpiresAt: expiresAt,
            lastActivityAt: nowTs,
            updatedAt: nowTs
        });

        await recordReferralBalanceAuditLog({
            timestamp: new Date().toISOString(),
            userEmail: 'sistema@biocambio360.com',
            userName: 'Liberación Automática 24h',
            userRole: 'sistema',
            profileId: cleanPhone,
            profileName: cleanPhone,
            profilePhone: cleanPhone,
            referralCode: readyToRelease[0].referralCode || '',
            previousBalance: 0,
            newBalance: totalToRelease,
            difference: totalToRelease,
            reason: `Liberación de ${readyToRelease.length} recompensa(s) tras ventana de seguridad de 24h post-entrega. Vigencia renovada por 60 días.`,
            source: 'holding_release_24h',
            createdAt: new Date().toISOString()
        });
    } catch (err) {
        console.warn('[Referrals] Error al sincronizar liberación de 24h:', err);
    }
}

/**
 * Verifica si el saldo disponible del embajador ha superado los 60 días de inactividad
 * sin compras ni nuevos referidos calificados. Si expiró, se da de baja el saldo a 0 y se audita.
 */
export async function checkAndExpireReferralBalance(phone: string): Promise<void> {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return;

    try {
        const profileRef = doc(profilesCollection, cleanPhone);
        const snap = await getDoc(profileRef);
        if (!snap.exists()) return;

        const profile = snap.data() as ReferralProfile;
        const balAvail = profile.balanceAvailable || 0;
        if (balAvail <= 0) return;

        const expiresMillis = profile.balanceExpiresAt?.toMillis ? profile.balanceExpiresAt.toMillis() : null;
        if (!expiresMillis) return;

        const now = Date.now();
        if (now > expiresMillis) {
            await updateDoc(profileRef, {
                balanceAvailable: 0,
                updatedAt: Timestamp.now()
            });

            await recordReferralBalanceAuditLog({
                timestamp: new Date().toISOString(),
                userEmail: 'sistema@biocambio360.com',
                userName: 'Caducidad de Saldo',
                userRole: 'sistema',
                profileId: cleanPhone,
                profileName: profile.nombre || cleanPhone,
                profilePhone: cleanPhone,
                referralCode: profile.code || '',
                previousBalance: balAvail,
                newBalance: 0,
                difference: -balAvail,
                reason: 'Caducidad de saldo promocional por inactividad de 60 días calendario (Art. 33 Ley 1480/2011)',
                source: 'balance_expiration',
                createdAt: new Date().toISOString()
            });
        }
    } catch (err) {
        console.warn('[Referrals] Error al verificar caducidad de 60 días:', err);
    }
}

/**
 * Renueva el temporizador de 60 días de vigencia continua del embajador
 * tras realizar una compra calificada o actividad calificada.
 */
export async function renewReferralExpiration(phone: string): Promise<void> {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return;

    try {
        const profileRef = doc(profilesCollection, cleanPhone);
        const snap = await getDoc(profileRef);
        if (!snap.exists()) return;

        const expiresAt = createTimestampFromMillis(Date.now() + 60 * 24 * 60 * 60 * 1000);
        const now = Timestamp.now();

        await updateDoc(profileRef, {
            balanceExpiresAt: expiresAt,
            lastActivityAt: now,
            updatedAt: now
        });
    } catch (err) {
        console.warn('[Referrals] Error al renovar vigencia de 60 días:', err);
    }
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
        await syncReferralReleases(cleanPhone);
        await checkAndExpireReferralBalance(cleanPhone);
        const refreshedSnap = await getDoc(profileRef);
        return (refreshedSnap.data() || snap.data()) as ReferralProfile;
    }

    // Generar código único asegurando que no colisione
    let candidateCode = generateReferralCode(customerData.nombre, customerData.celular);
    const existingCodeQuery = query(profilesCollection, where('code', '==', candidateCode));
    const querySnap = await getDocs(existingCodeQuery);
    if (!querySnap.empty) {
        candidateCode = `${candidateCode}${Math.floor(10 + Math.random() * 89)}`;
    }

    const now = Timestamp.now();
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
        balanceInHolding: 0,
        balanceAvailable: 0,
        balanceRedeemed: 0,
        balanceExpiresAt: createTimestampFromMillis(Date.now() + 60 * 24 * 60 * 60 * 1000),
        lastActivityAt: now,
        isActive: true,
        createdAt: now,
        updatedAt: now
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
    const profile = snap.docs[0].data() as ReferralProfile;
    await syncReferralReleases(profile.id);
    await checkAndExpireReferralBalance(profile.id);
    const refreshedSnap = await getDoc(doc(profilesCollection, profile.id));
    return (refreshedSnap.data() || profile) as ReferralProfile;
}

/**
 * Buscar un perfil por celular
 */
export async function getReferralProfileByPhone(phone: string): Promise<ReferralProfile | null> {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return null;
    await syncReferralReleases(cleanPhone);
    await checkAndExpireReferralBalance(cleanPhone);
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
            // Si fue activado manualmente a libre demanda por Diego, Fernando o Administrador
            if (cData.isReferrer || cData.referralActivatedManually) {
                return {
                    qualified: true,
                    totalSpent: cData.totalSpent || 50000,
                    ordersCount: cData.ordersCount || 1,
                    highestOrder: cData.totalSpent || 50000
                };
            }
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
            // Solo contar pedidos con pago real confirmado (ver PAID_ORDER_STATUSES)
            if (PAID_ORDER_STATUSES.has(data.status)) {
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
 * Verifica si un cliente es estrictamente de PRIMERA COMPRA en Biocambio360
 * El beneficio de referido y el descuento de amigo aplican EXCLUSIVAMENTE para clientes nuevos.
 */
export async function isCustomerFirstPurchase(customer: {
    celular?: string;
    cedula?: string;
    email?: string;
}): Promise<{ isFirstPurchase: boolean; reason?: string }> {
    const cleanPhone = (customer.celular || '').replace(/\D/g, '');
    const cleanCedula = (customer.cedula || '').trim();

    if (!cleanPhone && !cleanCedula) {
        return { isFirstPurchase: true };
    }

    try {
        // 1. Revisar en la colección customers por celular
        if (cleanPhone) {
            const custSnap = await getDoc(doc(db, 'customers', cleanPhone));
            if (custSnap.exists()) {
                const cData = custSnap.data();
                if ((cData.ordersCount || 0) > 0) {
                    return {
                        isFirstPurchase: false,
                        reason: 'El beneficio de referido de $10.000 COP es exclusivo para la primera compra de nuevos clientes. Tu celular ya registra compras previas en Biocambio360.'
                    };
                }
            }
        }

        // 2. Revisar en la colección orders (descartando cancelados)
        const ordersRef = collection(db, 'orders');
        if (cleanPhone) {
            const qOrdersPhone = query(ordersRef, where('cliente.celular', '==', cleanPhone), limit(5));
            const phoneOrdersSnap = await getDocs(qOrdersPhone);
            const activeOrders = phoneOrdersSnap.docs.filter(d => d.data().status !== 'cancelado');
            if (activeOrders.length > 0) {
                return {
                    isFirstPurchase: false,
                    reason: 'El beneficio de referido de $10.000 COP es exclusivo para la primera compra. Tu número ya registra pedidos en la tienda.'
                };
            }
        }

        if (cleanCedula && cleanCedula.length > 4 && cleanCedula !== '000000') {
            const qOrdersCedula = query(ordersRef, where('cliente.cedula', '==', cleanCedula), limit(5));
            const cedulaOrdersSnap = await getDocs(qOrdersCedula);
            const activeCedulaOrders = cedulaOrdersSnap.docs.filter(d => d.data().status !== 'cancelado');
            if (activeCedulaOrders.length > 0) {
                return {
                    isFirstPurchase: false,
                    reason: 'Tu documento de identidad ya registra pedidos anteriores en Biocambio360.'
                };
            }
        }

        // 3. Revisar si ya usó un beneficio de referido previamente en referral_transactions
        if (cleanPhone) {
            const qTx = query(
                transactionsCollection,
                where('referredCustomer.celular', '==', cleanPhone),
                limit(5)
            );
            const txSnap = await getDocs(qTx);
            const validTxs = txSnap.docs.filter(d => d.data().status !== 'rejected');
            if (validTxs.length > 0) {
                return {
                    isFirstPurchase: false,
                    reason: 'Este número de celular ya utilizó previamente un cupón o enlace de referido.'
                };
            }
        }

        return { isFirstPurchase: true };
    } catch (err) {
        console.warn('[Referrals] Error verificando primera compra del cliente:', err);
        return { isFirstPurchase: true };
    }
}

/**
 * Validar si un código de referido puede ser utilizado por un cliente en el checkout
 * Reglas de validación:
 * 1. El programa debe estar activo.
 * 2. El código debe existir y estar activo.
 * 3. REGLA ESTRICTA: El embajador DEBE tener al menos 1 pedido previo calificado (>= minReferrerSpend, ej: $50.000 COP).
 * 4. Antifraude: El cliente comprador no puede ser el mismo embajador (mismo celular o cédula).
 * 5. REGLA ESTRICTA DE CLIENTE NUEVO: Solo 1 uso del beneficio por cliente en su primera compra.
 * 6. Subtotal mínimo requerido para la compra del nuevo cliente.
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

    // REGLA DE PRIMERA COMPRA EXCLUSIVA (Solo un uso del link por nuevo cliente)
    if (buyerPhone) {
        const firstPurchaseCheck = await isCustomerFirstPurchase({
            celular: customer.celular,
            cedula: customer.cedula,
            email: customer.email
        });

        if (!firstPurchaseCheck.isFirstPurchase) {
            return {
                valid: false,
                discountAmount: 0,
                message: firstPurchaseCheck.reason || 'El beneficio de referido de $10.000 COP es exclusivo para la primera compra de nuevos clientes.'
            };
        }
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
/**
 * REGLA 2026 #2 — Antifraude de dirección compartida: una misma dirección no puede cobrar
 * recompensa de referido más de una vez cada 30 días, sin importar el código o el celular usado
 * (varias personas de la misma casa comparten un código y hacen varias compras "nuevas" seguidas).
 * A diferencia de `isDuplicateAddressAlert` (solo marca para auditoría después de 2+ repeticiones,
 * sin límite de tiempo), esto BLOQUEA de raíz la recompensa desde la primera repetición dentro de
 * los 30 días — el amigo referido puede seguir comprando, pero el embajador no cobra dos veces por
 * la misma dirección en tan poco tiempo.
 */
export async function checkAddressReferralCooldown(direccion: string, days = 30): Promise<{ onCooldown: boolean; daysAgo?: number }> {
    if (!direccion || direccion.trim().length < 6) return { onCooldown: false };
    try {
        const cleanAddr = direccion.trim().toLowerCase().replace(/[#.,-]/g, ' ');
        const cutoff = Timestamp.fromMillis(Date.now() - days * 24 * 60 * 60 * 1000);
        const q = query(transactionsCollection, where('createdAt', '>=', cutoff));
        const snap = await getDocs(q);

        let mostRecentMatchMillis = 0;
        for (const d of snap.docs) {
            const tx = d.data() as ReferralTransaction;
            if (tx.status === 'rejected') continue; // no penaliza por transacciones ya rechazadas
            const prevAddr = tx.referredCustomer?.direccion?.trim().toLowerCase().replace(/[#.,-]/g, ' ');
            if (!prevAddr) continue;
            if (prevAddr.includes(cleanAddr) || cleanAddr.includes(prevAddr)) {
                const createdMillis = tx.createdAt?.toMillis ? tx.createdAt.toMillis() : 0;
                if (createdMillis > mostRecentMatchMillis) mostRecentMatchMillis = createdMillis;
            }
        }

        if (mostRecentMatchMillis > 0) {
            const daysAgo = Math.floor((Date.now() - mostRecentMatchMillis) / (24 * 60 * 60 * 1000));
            return { onCooldown: true, daysAgo };
        }
        return { onCooldown: false };
    } catch (err) {
        console.warn('[Referrals] Error verificando cooldown de dirección:', err);
        return { onCooldown: false };
    }
}

export async function recordReferralTransaction(params: {
    orderId: string;
    profileId: string;
    referralCode: string;
    customer: { nombre: string; cedula?: string; celular: string; ciudad: string; direccion?: string };
    orderSubtotal: number;
    orderTotal: number;
    discountAmount: number;
}): Promise<void> {
    const config = await getReferralConfig();
    const txId = `tx_${params.orderId}`;
    const txRef = doc(transactionsCollection, txId);
    const profileRef = doc(profilesCollection, params.profileId);

    const now = Timestamp.now();

    // Detección Antifraude: Concentración de Dirección de Entrega (aviso informativo, no bloquea)
    let isDuplicateAddressAlert = false;
    if (params.customer.direccion && params.customer.direccion.trim().length > 6) {
        try {
            const cleanAddr = params.customer.direccion.trim().toLowerCase().replace(/[#.,-]/g, ' ');
            // Buscar en las últimas 50 transacciones del mismo embajador
            const qSameRef = query(
                transactionsCollection,
                where('referralProfileId', '==', params.profileId),
                limit(50)
            );
            const prevTxs = await getDocs(qSameRef);
            let addressMatches = 0;
            prevTxs.forEach(d => {
                const data = d.data() as ReferralTransaction;
                const prevAddr = data.referredCustomer?.direccion?.trim().toLowerCase().replace(/[#.,-]/g, ' ');
                if (prevAddr && (prevAddr.includes(cleanAddr) || cleanAddr.includes(prevAddr))) {
                    addressMatches++;
                }
            });

            // Si ya hay 2 o más pedidos anteriores con la misma dirección
            if (addressMatches >= 2) {
                isDuplicateAddressAlert = true;
            }
        } catch (addrErr) {
            console.warn('[Referrals] Error al auditar dirección duplicada:', addrErr);
        }
    }

    // REGLA 2026 #2: bloqueo real (no solo aviso) si esta dirección ya cobró recompensa en los
    // últimos 30 días, sin importar quién compró ni con qué código — evita que varias personas de
    // una misma casa exploten un código con compras "nuevas" seguidas.
    const cooldown = await checkAddressReferralCooldown(params.customer.direccion || '', 30);

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
        status: cooldown.onCooldown ? 'rejected' : 'pending',
        releaseStatus: cooldown.onCooldown ? 'cancelled' : 'pending_delivery',
        ...(cooldown.onCooldown ? { rejectionReason: `Esta dirección ya recibió una recompensa de referido hace ${cooldown.daysAgo} día(s) (tope: 1 cada 30 días).` } : {}),
        isDuplicateAddressAlert,
        createdAt: now,
        updatedAt: now
    };

    await setDoc(txRef, removeUndefined(newTx));

    // Si está en cooldown de dirección, se deja el registro (para auditoría/historial) pero NO se le
    // suma nada al saldo del embajador — el amigo referido conserva su descuento, pero esta recompensa
    // puntual no se paga.
    if (cooldown.onCooldown) {
        console.warn(`[Referrals] Recompensa bloqueada por cooldown de dirección (${cooldown.daysAgo}d) — orden ${params.orderId}`);
        return;
    }

    // Incrementar balance pendiente en el perfil del embajador
    const profileUpdates: Record<string, any> = {
        totalReferredOrders: increment(1),
        totalSalesGenerated: increment(params.orderTotal),
        balancePending: increment(config.rewardAmount),
        updatedAt: now
    };
    if (isDuplicateAddressAlert) {
        profileUpdates.fraudAlert = true;
    }
    await updateDoc(profileRef, profileUpdates);

    // Notificación por Email al Embajador (Presión Social de Entrega)
    // Se invoca a través de API Route para no incluir nodemailer en el bundle de cliente
    try {
        const profSnap = await getDoc(profileRef);
        if (profSnap.exists()) {
            const prof = profSnap.data() as ReferralProfile;
            if (prof.email) {
                fetch('/api/notifications/referral-reward', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        referrerEmail: prof.email,
                        referrerName: prof.nombre,
                        friendName: params.customer.nombre.trim().split(' ')[0],
                        rewardAmount: config.rewardAmount,
                        orderId: params.orderId
                    })
                }).catch(e => console.warn('[Referrals] Error enviando email de recompensa pendiente:', e));
            }
        }
    } catch (mailErr) {
        console.warn('[Referrals] Error preparando notificación de recompensa al embajador:', mailErr);
    }
}

/**
 * Actualizar el estado de la transacción cuando cambia el estado del pedido.
 * REGLA NORMATIVA: Cuando el pedido pasa a 'entregado', la recompensa queda en custodia ('holding_24h')
 * y se libera a 'balanceAvailable' exactamente 24 HORAS DESPUÉS de confirmada la entrega física.
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
        // Se aprueba la recompensa y se coloca en ventana de custodia ('holding_24h') hasta el
        // siguiente día calendario (Bogotá) — no 24h rodantes desde la hora exacta de la entrega.
        const availableAt = createTimestampFromMillis(nextCalendarDayBogota(Date.now()));

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
                releaseStatus: 'holding_24h',
                deliveredAt: now,
                availableAt,
                approvedAt: now,
                updatedAt: now
            });

            t.update(profileRef, {
                totalDeliveredOrders: increment(1),
                balancePending: increment(-tx.rewardAmount),
                balanceInHolding: increment(tx.rewardAmount),
                tier: newTier,
                updatedAt: now
            });
        });
    } else if (newStatus === 'cancelado') {
        // Se rechaza la transacción y se descuenta el saldo pendiente o en custodia
        await runTransaction(db, async (t) => {
            const profDoc = await t.get(profileRef);
            if (!profDoc.exists()) return;

            const wasInHolding = tx.releaseStatus === 'holding_24h';
            const wasReleased = tx.releaseStatus === 'released' || tx.status === 'approved';

            t.update(txRef, {
                status: 'rejected',
                releaseStatus: 'cancelled',
                rejectionReason: 'Pedido cancelado o devuelto',
                updatedAt: now
            });

            const profUpdates: Record<string, any> = {
                updatedAt: now
            };

            if (wasInHolding) {
                profUpdates.balanceInHolding = increment(-tx.rewardAmount);
            } else if (wasReleased) {
                profUpdates.balanceAvailable = increment(-tx.rewardAmount);
            } else {
                profUpdates.balancePending = increment(-tx.rewardAmount);
            }

            t.update(profileRef, profUpdates);
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
        await syncReferralReleases(cleanPhone);
        await checkAndExpireReferralBalance(cleanPhone);

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

            const config = await getReferralConfig();
            // Si el saldo solo puede cubrir hasta el 50% de la compra, el subtotal debe ser el doble del cupón
            const maxPercent = config.maxRedemptionPercentage || 50;
            const requiredSubtotal = Math.max(
                amountToRedeem,
                Math.round(amountToRedeem / (maxPercent / 100))
            );

            // Crear el cupón en la colección coupons
            const couponRef = doc(collection(db, 'coupons'), codeGenerated.toLowerCase());
            const couponData: Coupon = {
                id: codeGenerated.toLowerCase(),
                code: codeGenerated,
                type: 'fixed_amount',
                value: amountToRedeem,
                minSubtotal: requiredSubtotal,
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
 * Registra un evento en la bitácora de auditoría de saldos de embajadores
 */
export async function recordReferralBalanceAuditLog(
    log: Omit<ReferralBalanceAuditLog, 'id'>
): Promise<void> {
    try {
        const auditDocRef = doc(balanceAuditCollection);
        await setDoc(auditDocRef, removeUndefined({
            ...log,
            createdAt: new Date().toISOString()
        }));
    } catch (err) {
        console.warn('[ReferralAudit] Error guardando log de auditoría de saldo:', err);
    }
}

/**
 * Obtiene el historial de auditoría de saldos (global o filtrado por perfil)
 */
export async function getReferralBalanceAuditLogs(
    profileId?: string,
    limitCount = 100
): Promise<ReferralBalanceAuditLog[]> {
    try {
        let q;
        if (profileId) {
            q = query(
                balanceAuditCollection,
                where('profileId', '==', profileId),
                orderBy('timestamp', 'desc'),
                limit(limitCount)
            );
        } else {
            q = query(
                balanceAuditCollection,
                orderBy('timestamp', 'desc'),
                limit(limitCount)
            );
        }
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as ReferralBalanceAuditLog));
    } catch (err) {
        console.warn('[ReferralAudit] Error consultando bitácora de saldos:', err);
        return [];
    }
}

/**
 * Actualizar manualmente el estado de un perfil de embajador (activar/suspender/ajuste de saldo)
 * Garantiza trazabilidad y auditoría si se modifica el saldo disponible.
 */
export async function updateReferralProfileAdmin(
    profileId: string,
    updates: Partial<ReferralProfile>,
    auditContext?: {
        userContext?: { email?: string; nombre?: string; role?: string };
        reason?: string;
    }
): Promise<void> {
    const profileRef = doc(profilesCollection, profileId);

    // Si se modifica el saldo disponible, registrar trazabilidad obligatoria
    if (updates.balanceAvailable !== undefined) {
        try {
            const currentSnap = await getDoc(profileRef);
            if (currentSnap.exists()) {
                const currentData = currentSnap.data() as ReferralProfile;
                const oldBal = currentData.balanceAvailable || 0;
                const newBal = Number(updates.balanceAvailable);

                if (oldBal !== newBal) {
                    await recordReferralBalanceAuditLog({
                        timestamp: new Date().toISOString(),
                        userEmail: auditContext?.userContext?.email || 'admin@biocambio360.com',
                        userName: auditContext?.userContext?.nombre || 'Administrador',
                        userRole: auditContext?.userContext?.role || 'admin',
                        profileId,
                        profileName: currentData.nombre || 'Embajador',
                        profilePhone: currentData.celular || profileId,
                        referralCode: currentData.code || '',
                        previousBalance: oldBal,
                        newBalance: newBal,
                        difference: newBal - oldBal,
                        reason: auditContext?.reason || 'Ajuste manual de saldo desde panel administrativo',
                        source: 'admin_modal',
                        createdAt: new Date().toISOString()
                    });
                }
            }
        } catch (auditErr) {
            console.warn('[ReferralAudit] Error al auditar cambio de saldo:', auditErr);
        }
    }

    await updateDoc(profileRef, removeUndefined({
        ...updates,
        updatedAt: Timestamp.now()
    }));
}

/**
 * Poner en Lista Negra o rehabilitar un perfil de embajador por intento de fraude.
 * Opcionalmente congela o pone en 0 el saldo disponible/pendiente como sanción.
 */
export async function toggleBlacklistReferralProfile(
    profileId: string,
    isBlacklisted: boolean,
    reason?: string,
    penalizeBalances = false,
    auditContext?: {
        userContext?: { email?: string; nombre?: string; role?: string };
    }
): Promise<void> {
    const profileRef = doc(profilesCollection, profileId);
    const now = Timestamp.now();

    // Si se penalizan saldos dejándolos en 0, registrar en auditoría
    if (isBlacklisted && penalizeBalances) {
        try {
            const currentSnap = await getDoc(profileRef);
            if (currentSnap.exists()) {
                const currentData = currentSnap.data() as ReferralProfile;
                const oldBal = currentData.balanceAvailable || 0;
                if (oldBal > 0) {
                    await recordReferralBalanceAuditLog({
                        timestamp: new Date().toISOString(),
                        userEmail: auditContext?.userContext?.email || 'admin@biocambio360.com',
                        userName: auditContext?.userContext?.nombre || 'Administrador',
                        userRole: auditContext?.userContext?.role || 'admin',
                        profileId,
                        profileName: currentData.nombre || 'Embajador',
                        profilePhone: currentData.celular || profileId,
                        referralCode: currentData.code || '',
                        previousBalance: oldBal,
                        newBalance: 0,
                        difference: -oldBal,
                        reason: `Anulación por lista negra: ${reason || 'Sanción administrativa'}`,
                        source: 'blacklist_penalty',
                        createdAt: new Date().toISOString()
                    });
                }
            }
        } catch (auditErr) {
            console.warn('[ReferralAudit] Error al auditar anulación de saldo por lista negra:', auditErr);
        }
    }

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

/**
 * REGLA 2026 #4 — si el embajador tiene un pedido PROPIO con novedad de "sin_dinero" (retraso/no pago
 * en la entrega) sin resolver, se suspende su código hasta que se ponga al día. Es reversible: cuando
 * ese pedido se marca resuelto (entregado o repuesto pagado), se puede reactivar a mano desde el panel.
 */
export async function suspendReferralCodeForUnpaidDelivery(phone: string, orderId: string): Promise<void> {
    const cleanPhone = phone.replace(/\D/g, '');
    const profileRef = doc(profilesCollection, cleanPhone);
    const snap = await getDoc(profileRef);
    if (!snap.exists()) return; // no es embajador, nada que suspender

    await updateDoc(profileRef, {
        isActive: false,
        suspendedReason: `Suspendido: pedido ${orderId} con novedad de pago (sin_dinero) sin resolver. Reactivar manualmente cuando se ponga al día.`,
        updatedAt: Timestamp.now()
    });

    await recordReferralBalanceAuditLog({
        timestamp: new Date().toISOString(),
        userEmail: 'sistema@biocambio360.com',
        userName: 'Suspensión automática por novedad de pago',
        userRole: 'sistema',
        profileId: cleanPhone,
        profileName: cleanPhone,
        profilePhone: cleanPhone,
        referralCode: '',
        previousBalance: 0,
        newBalance: 0,
        difference: 0,
        reason: `Código suspendido por novedad "sin_dinero" en pedido ${orderId} del propio embajador.`,
        source: 'manual_adjustment',
        createdAt: new Date().toISOString()
    });
}

/**
 * REGLA 2026 #5 (propuesta, uso caso a caso — "son pocos los casos, para ver si es viable"): en vez de
 * cobrarle de nuevo el flete de reintento a un cliente recurrente que no recibió su pedido, se descuenta
 * ese valor de su saldo de referidos disponible y se reenvía el pedido sin cobrar de más. Lo activa el
 * gestor manualmente por caso (checkbox en el modal de novedad), nunca automático.
 */
export async function deductReshippingFeeFromBalance(
    phone: string,
    amount: number,
    orderId: string
): Promise<{ success: boolean; message: string }> {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || amount <= 0) return { success: false, message: 'Monto o celular inválido.' };

    const profileRef = doc(profilesCollection, cleanPhone);
    try {
        await syncReferralReleases(cleanPhone);
        const snap = await getDoc(profileRef);
        if (!snap.exists()) return { success: false, message: 'Este cliente no tiene saldo de referidos — cóbrale el flete normal.' };

        const prof = snap.data() as ReferralProfile;
        if ((prof.balanceAvailable || 0) < amount) {
            return { success: false, message: `Saldo disponible insuficiente ($${(prof.balanceAvailable || 0).toLocaleString('es-CO')}) para cubrir $${amount.toLocaleString('es-CO')}.` };
        }

        const previousBalance = prof.balanceAvailable;
        await updateDoc(profileRef, {
            balanceAvailable: increment(-amount),
            updatedAt: Timestamp.now()
        });

        await recordReferralBalanceAuditLog({
            timestamp: new Date().toISOString(),
            userEmail: 'sistema@biocambio360.com',
            userName: 'Descuento de reenvío por novedad de entrega',
            userRole: 'sistema',
            profileId: cleanPhone,
            profileName: prof.nombre || cleanPhone,
            profilePhone: cleanPhone,
            referralCode: prof.code || '',
            previousBalance,
            newBalance: previousBalance - amount,
            difference: -amount,
            reason: `Flete de reintento del pedido ${orderId} descontado del saldo en vez de cobrarlo de nuevo.`,
            source: 'manual_adjustment',
            createdAt: new Date().toISOString()
        });

        return { success: true, message: `Se descontaron $${amount.toLocaleString('es-CO')} del saldo del cliente para cubrir el reenvío.` };
    } catch (err) {
        console.warn('[Referrals] Error descontando flete de reintento del saldo:', err);
        return { success: false, message: 'Error al descontar del saldo.' };
    }
}

