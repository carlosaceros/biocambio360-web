import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export interface PromoModalConfig {
    isActive: boolean;
    couponCode: string;
    discountText: string;       // e.g. "10% OFF"
    headline: string;           // Big bold headline
    subheadline: string;        // Supporting text
    badgeText: string;          // Small badge above headline
    countdownMinutes: number;   // 0 = no countdown, >0 = show timer
    minOrderText: string;       // e.g. "En pedidos desde $30.000"
    bgGradient: string;         // CSS gradient string
}

export const DEFAULT_PROMO_CONFIG: PromoModalConfig = {
    isActive: false,
    couponCode: 'PRIMERAZO10',
    discountText: '10% OFF',
    headline: 'Tu primera compra merece un regalo',
    subheadline: 'Aplica tu cupón exclusivo de bienvenida y ahorra desde ya en productos directos de fábrica.',
    badgeText: '🎁 Oferta de Bienvenida — Solo hoy',
    countdownMinutes: 20,
    minOrderText: 'En pedidos desde $30.000',
    bgGradient: 'from-slate-900 via-teal-950 to-slate-900',
};

export const promoConfigDocRef = doc(db, 'promo_config', 'main');

export async function getPromoConfig(): Promise<PromoModalConfig | null> {
    try {
        const snap = await getDoc(promoConfigDocRef);
        if (snap.exists()) {
            return { ...DEFAULT_PROMO_CONFIG, ...snap.data() } as PromoModalConfig;
        }
        return null;
    } catch (e) {
        console.warn('Error fetching promo config:', e);
        return null;
    }
}

export async function savePromoConfig(config: PromoModalConfig): Promise<void> {
    await setDoc(promoConfigDocRef, config, { merge: true });
}

export function subscribePromoConfig(
    onData: (cfg: PromoModalConfig | null) => void
): () => void {
    return onSnapshot(
        promoConfigDocRef,
        (snap) => {
            if (snap.exists()) {
                onData({ ...DEFAULT_PROMO_CONFIG, ...snap.data() } as PromoModalConfig);
            } else {
                onData(null);
            }
        },
        (err) => {
            console.warn('Promo config snapshot error:', err);
            onData(null);
        }
    );
}
