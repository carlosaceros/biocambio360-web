'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Gift, ArrowRight, CheckCircle2, Ticket } from 'lucide-react';
import { WheelConfig, WheelSegment } from '@/lib/coupon-types';
import { getWheelConfig } from '@/lib/coupons-service';
import { useCart } from '@/lib/cart-context';

export default function DiscountWheelModal() {
    const { applyCoupon, setIsCartOpen } = useCart();

    const [config, setConfig] = useState<WheelConfig | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [hasSpun, setHasSpun] = useState(false);
    const [wonCoupon, setWonCoupon] = useState<{ label: string; code: string } | null>(null);

    // Form inputs before spin
    const [name, setName] = useState('');
    const [emailOrPhone, setEmailOrPhone] = useState('');
    const [isFormSubmitted, setIsFormSubmitted] = useState(false);

    // Spin animation states
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotationDegree, setRotationDegree] = useState(0);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        // Load wheel config
        getWheelConfig().then(cfg => {
            if (cfg) {
                setConfig(cfg);
            }
        });

        // Check if user previously spun
        const savedSpin = localStorage.getItem('biocambio360_wheel_won');
        if (savedSpin) {
            try {
                const parsed = JSON.parse(savedSpin);
                setWonCoupon(parsed);
                setHasSpun(true);
                setIsFormSubmitted(true);
            } catch (e) {
                // ignore
            }
        }
    }, []);

    // Draw canvas wheel with HD resolution and crisp legible text
    useEffect(() => {
        if (!config || !canvasRef.current || !config.segments.length) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const size = canvas.width; // 500px HD resolution
        const center = size / 2;
        const radius = center - 18;
        const segments = config.segments;
        const numSegments = segments.length;
        const arc = (2 * Math.PI) / numSegments;

        ctx.clearRect(0, 0, size, size);

        // 1. Draw outer gold decorative rim
        ctx.beginPath();
        ctx.arc(center, center, radius + 12, 0, 2 * Math.PI);
        ctx.fillStyle = '#0F172A';
        ctx.fill();

        // 2. Draw pie slices
        segments.forEach((seg, i) => {
            const angle = i * arc;
            ctx.beginPath();
            ctx.fillStyle = seg.color;
            ctx.moveTo(center, center);
            ctx.arc(center, center, radius, angle, angle + arc);
            ctx.lineTo(center, center);
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#FFFFFF';
            ctx.stroke();

            // 3. Draw text label centered inside slice with smart orientation & line wrapping
            ctx.save();
            ctx.translate(center, center);
            const midAngle = angle + arc / 2;
            
            // Normalize angle to [0, 2*PI]
            const normAngle = midAngle % (2 * Math.PI);
            const isLeftSide = normAngle > Math.PI / 2 && normAngle < (3 * Math.PI) / 2;

            ctx.rotate(midAngle);

            ctx.font = numSegments > 10 ? '900 13px system-ui, sans-serif' : '900 16px system-ui, sans-serif';
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
            ctx.shadowBlur = 4;

            // Line wrap algorithm for long labels
            const words = seg.label.split(' ');
            let line1 = seg.label;
            let line2 = '';

            if (seg.label.length > 12 && words.length > 1) {
                const mid = Math.ceil(words.length / 2);
                line1 = words.slice(0, mid).join(' ');
                line2 = words.slice(mid).join(' ');
            }

            const dist = radius * 0.62;

            if (isLeftSide) {
                ctx.rotate(Math.PI);
                if (line2) {
                    ctx.fillText(line1, -dist, -6);
                    ctx.fillText(line2, -dist, 12);
                } else {
                    ctx.fillText(line1, -dist, 4);
                }
            } else {
                if (line2) {
                    ctx.fillText(line1, dist, -6);
                    ctx.fillText(line2, dist, 12);
                } else {
                    ctx.fillText(line1, dist, 4);
                }
            }
            ctx.restore();
        });

        // 4. Draw outer rim pegs (casino style dots)
        for (let i = 0; i < numSegments * 3; i++) {
            const pegAngle = (i * (2 * Math.PI)) / (numSegments * 3);
            const px = center + (radius + 6) * Math.cos(pegAngle);
            const py = center + (radius + 6) * Math.sin(pegAngle);

            ctx.beginPath();
            ctx.arc(px, py, 4, 0, 2 * Math.PI);
            ctx.fillStyle = '#F59E0B';
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#FFFFFF';
            ctx.stroke();
        }

        // 5. Clean white center circle on canvas (logo sits on top via JSX overlay)
        ctx.beginPath();
        ctx.arc(center, center, 44, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#0F172A';
        ctx.stroke();
    }, [config, isOpen, isFormSubmitted]);

    const [isValidating, setIsValidating] = useState(false);
    const [validationError, setValidationError] = useState('');

    if (!config || !config.isActive) return null;

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !emailOrPhone.trim()) return;
        
        setIsValidating(true);
        setValidationError('');

        try {
            const res = await fetch('/api/coupons/wheel-spin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    emailOrPhone,
                    action: 'validate'
                })
            });

            const data = await res.json();
            setIsValidating(false);

            if (!data.allowed) {
                setValidationError(data.reason || 'Ya participaste en la ruleta en los últimos 30 días.');
                if (data.previousCoupon) {
                    setWonCoupon({ label: data.previousCoupon.label, code: data.previousCoupon.code });
                    setHasSpun(true);
                    setIsFormSubmitted(true);
                }
                return;
            }

            setIsFormSubmitted(true);
        } catch (e) {
            setIsValidating(false);
            setIsFormSubmitted(true); // fallback si falla red
        }
    };

    const handleSpin = () => {
        if (isSpinning || hasSpun || !config) return;
        setIsSpinning(true);

        const segments = config.segments;
        const numSegments = segments.length;

        // 1. Cryptographic weighted random selection
        const totalWeight = segments.reduce((sum, s) => sum + (s.probabilityWeight || 1), 0);
        let randomVal = Math.random();
        if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
            const arr = new Uint32Array(1);
            window.crypto.getRandomValues(arr);
            randomVal = arr[0] / (0xFFFFFFFF + 1);
        }

        let randomWeight = randomVal * totalWeight;
        let selectedIdx = 0;

        for (let i = 0; i < numSegments; i++) {
            const w = segments[i].probabilityWeight || 1;
            if (randomWeight < w) {
                selectedIdx = i;
                break;
            }
            randomWeight -= w;
        }

        // 2. Exact Angle Alignment for 12 o'clock (270°) Top Pointer
        const segmentAngle = 360 / numSegments;
        const segmentCenterAngle = 270 - (selectedIdx * segmentAngle + segmentAngle / 2);
        
        // Random jitter inside segment slice (-35% to +35% of slice width)
        const randomJitter = (Math.random() - 0.5) * (segmentAngle * 0.7);
        
        // Continuous multi-turn spin (5 to 8 full 360° revolutions)
        const extraSpins = (5 + Math.floor(Math.random() * 4)) * 360;

        const currentBase = Math.ceil(rotationDegree / 360) * 360;
        const targetAngle = currentBase + extraSpins + segmentCenterAngle + randomJitter;

        setRotationDegree(targetAngle);

        setTimeout(async () => {
            setIsSpinning(false);
            setHasSpun(true);

            const winningSeg = segments[selectedIdx];
            const wonObj = { label: winningSeg.label, code: winningSeg.couponCode, spunAt: new Date().toISOString() };
            setWonCoupon(wonObj);
            localStorage.setItem('biocambio360_wheel_won', JSON.stringify(wonObj));

            // Record redemption in Firestore backend
            try {
                await fetch('/api/coupons/wheel-spin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name,
                        emailOrPhone,
                        action: 'spin',
                        winningSegment: {
                            id: winningSeg.id,
                            label: winningSeg.label,
                            couponCode: winningSeg.couponCode
                        }
                    })
                });
            } catch (e) {
                console.error('Error recording spin to API:', e);
            }

            // Auto apply coupon immediately if coupon code exists
            if (winningSeg.couponCode) {
                await applyCoupon(winningSeg.couponCode, emailOrPhone, emailOrPhone);
            }
        }, 4500); // Matches CSS rotation duration
    };

    const handleApplyAndClose = async () => {
        if (wonCoupon && wonCoupon.code) {
            await applyCoupon(wonCoupon.code, emailOrPhone, emailOrPhone);
        }
        setIsOpen(false);
        setIsCartOpen(true);
    };

    if (!config || !config.isActive) {
        return null;
    }

    return (
        <>
            {/* Floating Action Badge Button */}
            <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 left-6 z-40 bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 text-white font-black px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 text-xs border-2 border-white/40 cursor-pointer animate-pulse"
            >
                <Sparkles size={18} className="text-yellow-300" />
                <span>{hasSpun && wonCoupon ? (wonCoupon.code ? `🎁 Tu Cupón: ${wonCoupon.code}` : '🎁 Ruleta Biocambio360') : '🎁 Gira la Ruleta de Descuentos'}</span>
            </motion.button>

            {/* Modal */}
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Modal Container */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-white rounded-3xl shadow-2xl p-5 sm:p-8 max-w-lg w-full z-10 text-center border border-gray-100 my-auto"
                        >
                            <button
                                onClick={() => setIsOpen(false)}
                                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors z-20"
                            >
                                <X size={20} />
                            </button>

                            <div className="flex items-center justify-center gap-2 mb-1 text-red-600 font-extrabold text-xs uppercase tracking-wider">
                                <Sparkles size={16} />
                                PROMOCIÓN EXCLUSIVA BIOCAMBIO360
                            </div>
                            <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-1">{config.title}</h2>
                            <p className="text-xs text-gray-500 mb-5">{config.description}</p>

                            {!isFormSubmitted ? (
                                /* Lead Form Step */
                                <form onSubmit={handleFormSubmit} className="space-y-3.5 text-left">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Tu Nombre Completo *</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Ej: Carolina Gómez"
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-red-600 focus:outline-none bg-white text-gray-900"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">WhatsApp o Correo Electrónico *</label>
                                        <input
                                            type="text"
                                            value={emailOrPhone}
                                            onChange={(e) => setEmailOrPhone(e.target.value)}
                                            placeholder="Ej: 3001234567 o correo@ejemplo.com"
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-red-600 focus:outline-none bg-white text-gray-900"
                                            required
                                        />
                                    </div>

                                    {validationError && (
                                        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-800 text-xs font-bold text-center">
                                            ⚠️ {validationError}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isValidating}
                                        className="w-full bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 hover:opacity-95 text-white font-black py-4 rounded-xl shadow-xl shadow-red-200 transition-all text-sm mt-3 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                    >
                                        {isValidating ? 'VERIFICANDO DISPONIBILIDAD...' : 'DESBLOQUEAR RULETA DE REGALOS'}
                                        <ArrowRight size={18} />
                                    </button>
                                </form>
                            ) : (
                                /* Wheel & Spin Step */
                                <div className="flex flex-col items-center">
                                    {/* Wheel Pointer Indicator & Outer Container */}
                                    <div className="relative w-72 h-72 sm:w-96 sm:h-96 flex items-center justify-center my-3">
                                        {/* Red Arrow Pointer at Top 12 o'clock */}
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-40 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-red-600 drop-shadow-xl" />

                                        {/* Center Fixed Header Logo Badge (Biocambio360) */}
                                        <div className="absolute inset-0 m-auto z-30 w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-full border-4 border-slate-900 shadow-2xl flex items-center justify-center p-2.5 pointer-events-none">
                                            <img
                                                src="/images/logo-biocambio360.png"
                                                alt="Biocambio360 Logo"
                                                className="w-full h-full object-contain"
                                            />
                                        </div>

                                        {/* Canvas Wheel */}
                                        <div
                                            style={{
                                                transform: `rotate(${rotationDegree}deg)`,
                                                transition: isSpinning ? 'transform 4.5s cubic-bezier(0.15, 0.9, 0.2, 1)' : 'none'
                                            }}
                                            className="w-full h-full rounded-full shadow-2xl"
                                        >
                                            <canvas
                                                ref={canvasRef}
                                                width={500}
                                                height={500}
                                                className="w-full h-full rounded-full"
                                            />
                                        </div>
                                    </div>

                                    {!hasSpun ? (
                                        <button
                                            onClick={handleSpin}
                                            disabled={isSpinning}
                                            className="w-full mt-3 bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 hover:opacity-95 text-white font-black py-4 rounded-xl shadow-xl shadow-red-200 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            {isSpinning ? '🌀 GIRANDO RULETA...' : '🎯 ¡GIRAR RULETA AHORA!'}
                                        </button>
                                    ) : (
                                        /* Winner / Result Box */
                                        <motion.div
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className={`w-full mt-3 p-4 rounded-2xl space-y-2.5 border-2 ${
                                                wonCoupon?.code 
                                                    ? 'bg-green-50 border-green-300' 
                                                    : 'bg-blue-50 border-blue-300'
                                            }`}
                                        >
                                            {wonCoupon?.code ? (
                                                <>
                                                    <div className="flex items-center justify-center gap-1.5 text-green-700 font-extrabold text-sm">
                                                        <CheckCircle2 size={18} />
                                                        ¡FELICITACIONES! GANASTE:
                                                    </div>
                                                    <div className="text-xl sm:text-2xl font-black text-gray-900">
                                                        {wonCoupon?.label}
                                                    </div>
                                                    <div className="bg-white border-2 border-green-400 px-5 py-2 rounded-xl font-mono font-black text-xl text-green-800 tracking-widest inline-block shadow-sm">
                                                        {wonCoupon?.code}
                                                    </div>
                                                    <p className="text-[11px] text-green-700 font-bold">
                                                        ✓ Tu cupón ha sido guardado exitosamente. Se aplicará automáticamente al agregar productos.
                                                    </p>

                                                    <button
                                                        onClick={handleApplyAndClose}
                                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-3.5 rounded-xl shadow-md transition-all text-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
                                                    >
                                                        <Ticket size={16} />
                                                        ¡IR A AGREGAR PRODUCTOS Y VER CARRITO!
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex items-center justify-center gap-1.5 text-blue-700 font-extrabold text-sm">
                                                        <Sparkles size={18} />
                                                        ¡GRACIAS POR PARTICIPAR!
                                                    </div>
                                                    <div className="text-lg sm:text-xl font-black text-gray-900">
                                                        {wonCoupon?.label || 'A la próxima contarás con mejor suerte 🍀'}
                                                    </div>
                                                    <p className="text-xs text-gray-600 font-medium">
                                                        Recuerda que en Biocambio360 compras directo de fábrica con hasta 60% de ahorro vs marcas comerciales.
                                                    </p>

                                                    <button
                                                        onClick={() => {
                                                            setIsOpen(false);
                                                        }}
                                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 rounded-xl shadow-md transition-all text-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
                                                    >
                                                        <ArrowRight size={16} />
                                                        ¡EXPLORAR CATÁLOGO DE FÁBRICA!
                                                    </button>
                                                </>
                                            )}
                                        </motion.div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
