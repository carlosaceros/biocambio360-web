'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Gift, CheckCircle2, ArrowRight } from 'lucide-react';
import { useCart } from '@/lib/cart-context';

export default function ReferralTopBanner() {
    const searchParams = useSearchParams();
    const { applyCoupon, appliedCoupon } = useCart();

    const [referralInfo, setReferralInfo] = useState<{
        code: string;
        referrerName: string;
        applied: boolean;
    } | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Solo activar si el usuario trajo explícitamente el parámetro de referido en la URL para pruebas
        const urlRef = searchParams.get('ref') || searchParams.get('referral');
        if (!urlRef) return;

        const cleanCode = urlRef.trim().toUpperCase();

        fetch(`/api/referrals/lookup?code=${cleanCode}`)
            .then(res => res.json())
            .then(data => {
                if (data.exists && data.profile) {
                    const firstName = data.profile.nombre.trim().split(' ')[0];
                    const fullName = data.profile.nombre.trim();
                    setReferralInfo({
                        code: cleanCode,
                        referrerName: firstName || fullName,
                        applied: appliedCoupon?.code === cleanCode
                    });

                    // Auto-aplicar cupón si aún no está aplicado
                    if (!appliedCoupon) {
                        applyCoupon(cleanCode);
                    }
                }
            })
            .catch(err => console.warn('[ReferralBanner] Error loading referrer:', err));
    }, [searchParams, appliedCoupon, applyCoupon]);

    if (!referralInfo) return null;

    const isAlreadyApplied = appliedCoupon?.code === referralInfo.code;

    return (
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white text-xs py-2 px-4 shadow-md sticky top-0 z-[52] border-b border-purple-400/30">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-bold">
                    <span className="p-1 bg-white/20 rounded-full flex items-center justify-center text-yellow-300">
                        <Gift size={15} />
                    </span>
                    <span>
                        🎁 ¡Estás comprando con <strong className="text-yellow-300 underline font-black">$10.000 COP de descuento</strong> gracias a <strong className="text-white font-black">{referralInfo.referrerName}</strong>!
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    {isAlreadyApplied ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-500 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                            <CheckCircle2 size={12} /> Cupón {referralInfo.code} (-$10.000) Activado
                        </span>
                    ) : (
                        <button
                            type="button"
                            onClick={() => applyCoupon(referralInfo.code)}
                            className="inline-flex items-center gap-1 bg-white text-purple-900 hover:bg-yellow-300 hover:text-purple-950 transition-all font-black text-[11px] px-3 py-1 rounded-full shadow-md cursor-pointer"
                        >
                            <span>Activar mi Descuento</span>
                            <ArrowRight size={11} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
