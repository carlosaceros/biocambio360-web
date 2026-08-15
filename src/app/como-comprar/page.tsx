'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingCart, Search, CreditCard, Truck, Package, CheckCircle,
    ArrowRight, ArrowLeft, PartyPopper, Sparkles, Star, Trophy
} from 'lucide-react';
import Link from 'next/link';

interface Step {
    id: number;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    tip: string;
    action?: string;
}

const STEPS: Step[] = [
    {
        id: 1,
        title: '🔍 Explora el Catálogo',
        description: 'Navega por nuestros productos de aseo industrial: Detergente, Desengrasante, Suavizante y Blanqueador. Cada uno tiene tres presentaciones: Galón (3.8L), Bidón (10L) y Caneca (20L).',
        icon: <Search size={32} />,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        tip: '💡 Tip: El tamaño más popular es el de 10L. ¡Perfecto para un hogar o negocio mediano!',
        action: 'Ver Catálogo'
    },
    {
        id: 2,
        title: '🛒 Agrega al Carrito',
        description: 'Haz clic en el botón "AGREGAR" en la tarjeta del producto o entra a la página del producto para elegir la presentación y cantidad. ¡Puedes agregar varios productos!',
        icon: <ShoppingCart size={32} />,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        tip: '💡 Tip: Aplica tu cupón de descuento en el proceso de compra para ahorrar aún más en tu pedido.'
    },
    {
        id: 3,
        title: '📋 Llena tus Datos',
        description: 'Al hacer clic en "Ir al Checkout", completa el formulario con tu nombre, cédula, celular, departamento, ciudad y dirección exacta de entrega. ¡Es rápido!',
        icon: <Package size={32} />,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        tip: '💡 Tip: Asegúrate de poner tu número de WhatsApp correcto. Por ahí te enviaremos las actualizaciones del pedido.'
    },
    {
        id: 4,
        title: '💳 Elige cómo Pagar',
        description: 'Tienes dos opciones: "Pago Contraentrega" (pagas en efectivo cuando llegue tu pedido) o "Pagar con Wompi" (permite tarjeta de crédito, débito, PSE y Nequi).',
        icon: <CreditCard size={32} />,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        tip: '💡 Tip: Contraentrega es la opción preferida por el 80% de nuestros clientes. ¡Sin riesgo!'
    },
    {
        id: 5,
        title: '🚚 Seguimiento en Tiempo Real',
        description: 'Una vez confirmado tu pedido, recibirás notificaciones por WhatsApp en cada etapa: confirmado ✅ → preparación 📦 → enviado 🚚 → en camino 📍 → entregado ✓',
        icon: <Truck size={32} />,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        tip: '💡 Tip: Si necesitas hablar con nosotros, responde directamente al WhatsApp. ¡Respondemos rápido!'
    },
    {
        id: 6,
        title: '🎉 ¡Disfruta tu Producto!',
        description: '¡Listo! Recibe tu producto directo de fábrica, sin intermediarios, con la calidad industrial de Biocambio360. ¡Comparte tu experiencia y recomiéndanos!',
        icon: <CheckCircle size={32} />,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        tip: '💡 Tip: ¡Nuestros productos rinden el doble que los del supermercado! Sigue las dosificaciones recomendadas.'
    }
];

export default function ComoComprarPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [tourMode, setTourMode] = useState(false);
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

    const markCompleted = (stepId: number) => {
        setCompletedSteps(prev => new Set([...prev, stepId]));
    };

    const goNext = () => {
        markCompleted(STEPS[currentStep].id);
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const goPrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const progress = (completedSteps.size / STEPS.length) * 100;
    const allCompleted = completedSteps.size === STEPS.length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Header */}
            <div className="bg-white border-b shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors mb-4 text-sm font-medium"
                    >
                        <ArrowLeft size={16} />
                        Volver al inicio
                    </Link>
                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl md:text-4xl font-black text-gray-900"
                        style={{ fontFamily: '"Archivo Black", sans-serif' }}
                    >
                        ¿Cómo Comprar?
                    </motion.h1>
                    <p className="text-gray-500 mt-2">
                        Comprar en Biocambio360 es súper fácil. Aquí te explicamos paso a paso.
                    </p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-10">
                {/* Tour Toggle */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-6 mb-10 text-white shadow-xl shadow-red-200"
                >
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Sparkles size={28} className="text-yellow-300" />
                            <div>
                                <h2 className="font-black text-lg">Tour Guiado Interactivo</h2>
                                <p className="text-red-100 text-sm">
                                    Activa el modo tour para aprender paso a paso con animaciones y progreso
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setTourMode(!tourMode);
                                setCurrentStep(0);
                                setCompletedSteps(new Set());
                            }}
                            className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${
                                tourMode
                                    ? 'bg-white text-red-600 hover:bg-red-50'
                                    : 'bg-yellow-400 text-red-900 hover:bg-yellow-300 shadow-lg'
                            }`}
                        >
                            {tourMode ? '✕ Desactivar Tour' : '🚀 Activar Tour'}
                        </button>
                    </div>
                </motion.div>

                {/* Tour Mode */}
                {tourMode ? (
                    <div>
                        {/* Progress Bar */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold text-gray-700">
                                    Progreso: {completedSteps.size}/{STEPS.length} pasos
                                </span>
                                <div className="flex items-center gap-1">
                                    <Trophy size={16} className={completedSteps.size >= 3 ? 'text-yellow-500' : 'text-gray-300'} />
                                    <Trophy size={16} className={completedSteps.size >= 5 ? 'text-yellow-500' : 'text-gray-300'} />
                                    <Trophy size={16} className={allCompleted ? 'text-yellow-500' : 'text-gray-300'} />
                                </div>
                            </div>
                            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full"
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                />
                            </div>
                            {/* Step Indicators */}
                            <div className="flex justify-between mt-2">
                                {STEPS.map((step, idx) => (
                                    <button
                                        key={step.id}
                                        onClick={() => setCurrentStep(idx)}
                                        className={`w-8 h-8 rounded-full text-xs font-black flex items-center justify-center transition-all ${
                                            completedSteps.has(step.id)
                                                ? 'bg-green-500 text-white scale-110'
                                                : idx === currentStep
                                                    ? 'bg-red-600 text-white scale-110 ring-4 ring-red-200'
                                                    : 'bg-gray-200 text-gray-500'
                                        }`}
                                    >
                                        {completedSteps.has(step.id) ? '✓' : step.id}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Active Step Card */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.3 }}
                                className="bg-white rounded-2xl shadow-xl p-8 mb-6 border-2 border-gray-100"
                            >
                                <div className="flex items-center gap-4 mb-6">
                                    <div className={`${STEPS[currentStep].bgColor} p-4 rounded-xl`}>
                                        <span className={STEPS[currentStep].color}>
                                            {STEPS[currentStep].icon}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                            Paso {STEPS[currentStep].id} de {STEPS.length}
                                        </p>
                                        <h3 className="text-2xl font-black text-gray-900">
                                            {STEPS[currentStep].title}
                                        </h3>
                                    </div>
                                </div>

                                <p className="text-gray-600 text-lg leading-relaxed mb-6">
                                    {STEPS[currentStep].description}
                                </p>

                                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                                    <p className="text-sm text-yellow-800 font-medium">
                                        {STEPS[currentStep].tip}
                                    </p>
                                </div>

                                {/* Navigation */}
                                <div className="flex items-center justify-between">
                                    <button
                                        onClick={goPrev}
                                        disabled={currentStep === 0}
                                        className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ArrowLeft size={18} />
                                        Anterior
                                    </button>

                                    {currentStep === STEPS.length - 1 ? (
                                        <Link
                                            href="/#catalogo"
                                            onClick={() => {
                                                markCompleted(STEPS[currentStep].id);
                                            }}
                                            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-red-200"
                                        >
                                            <ShoppingCart size={18} />
                                            ¡Ir a Comprar!
                                        </Link>
                                    ) : (
                                        <button
                                            onClick={goNext}
                                            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-red-200"
                                        >
                                            Entendido
                                            <ArrowRight size={18} />
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        {/* Completion Badge */}
                        <AnimatePresence>
                            {allCompleted && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-8 text-white text-center shadow-xl"
                                >
                                    <PartyPopper size={48} className="mx-auto mb-4 text-yellow-300" />
                                    <h3 className="text-2xl font-black mb-2">🎉 ¡Tour Completado!</h3>
                                    <p className="text-green-100 mb-6">
                                        Ya sabes cómo comprar en Biocambio360. ¡Ahora ve y ahorra con calidad industrial!
                                    </p>
                                    <div className="flex items-center justify-center gap-1 mb-4">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <Star key={i} size={24} className="text-yellow-300 fill-yellow-300" />
                                        ))}
                                    </div>
                                    <Link
                                        href="/#catalogo"
                                        className="inline-flex items-center gap-2 px-8 py-4 bg-white text-green-700 font-black rounded-xl hover:bg-green-50 transition-colors shadow-lg"
                                    >
                                        <ShoppingCart size={20} />
                                        Ir al Catálogo
                                    </Link>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ) : (
                    /* Static Mode - All Steps Visible */
                    <div className="space-y-6">
                        {STEPS.map((step, idx) => (
                            <motion.div
                                key={step.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="bg-white rounded-2xl shadow-lg p-6 flex gap-5 items-start hover:shadow-xl transition-shadow border border-gray-100"
                            >
                                <div className={`${step.bgColor} p-4 rounded-xl flex-shrink-0`}>
                                    <span className={step.color}>
                                        {step.icon}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-black text-gray-900 mb-2">{step.title}</h3>
                                    <p className="text-gray-600 leading-relaxed mb-3">{step.description}</p>
                                    <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                                        <p className="text-xs text-yellow-800 font-medium">{step.tip}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        {/* CTA */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="text-center pt-6"
                        >
                            <Link
                                href="/#catalogo"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-xl shadow-red-200 transition-all hover:scale-105"
                            >
                                <ShoppingCart size={20} />
                                ¡Empezar a Comprar Ahora!
                            </Link>
                        </motion.div>
                    </div>
                )}
            </div>

            {/* Mini Footer */}
            <div className="max-w-4xl mx-auto px-4 pb-10 text-center text-xs text-gray-400">
                © 2026 Biocambio360 S.A.S. Todos los derechos reservados.
            </div>
        </div>
    );
}
