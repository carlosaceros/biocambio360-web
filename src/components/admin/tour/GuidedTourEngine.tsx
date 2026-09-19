'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    ArrowRight,
    ArrowLeft,
    Sparkles,
    CheckCircle2,
    Compass,
    HelpCircle
} from 'lucide-react';
import { useTour } from './TourContext';

interface TargetRect {
    top: number;
    left: number;
    width: number;
    height: number;
    bottom: number;
    right: number;
}

export default function GuidedTourEngine() {
    const {
        activeTour,
        activeStepIndex,
        currentStep,
        isTourActive,
        nextStep,
        prevStep,
        endTour
    } = useTour();

    const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
    const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
    const popoverRef = useRef<HTMLDivElement>(null);

    // Medir dimensiones de pantalla
    useEffect(() => {
        const updateSize = () => {
            setViewportSize({ width: window.innerWidth, height: window.innerHeight });
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    // Actualizar posición del elemento objetivo
    const updateTargetPosition = useCallback(() => {
        if (!currentStep) {
            setTargetRect(null);
            return;
        }

        const el = document.querySelector(currentStep.target);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            // Pequeña espera para terminar el scroll
            setTimeout(() => {
                const rect = el.getBoundingClientRect();
                setTargetRect({
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                    bottom: rect.bottom,
                    right: rect.right
                });
            }, 250);
        } else {
            // Si el elemento no existe en el DOM, centrar el popover
            setTargetRect(null);
        }
    }, [currentStep]);

    useEffect(() => {
        if (!isTourActive) return;
        updateTargetPosition();

        const handleScrollOrResize = () => updateTargetPosition();
        window.addEventListener('scroll', handleScrollOrResize, true);
        window.addEventListener('resize', handleScrollOrResize);

        return () => {
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [isTourActive, currentStep, updateTargetPosition]);

    // Navegación por teclado
    useEffect(() => {
        if (!isTourActive) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                endTour();
            } else if (e.key === 'ArrowRight') {
                nextStep();
            } else if (e.key === 'ArrowLeft') {
                prevStep();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isTourActive, nextStep, prevStep, endTour]);

    if (!isTourActive || !activeTour || !currentStep) return null;

    const totalSteps = activeTour.steps.length;
    const isLastStep = activeStepIndex === totalSteps - 1;
    const isFirstStep = activeStepIndex === 0;

    // Calcular posición del popover flotante
    let popoverStyle: React.CSSProperties = {};
    const padding = 8;
    const popoverWidth = 380;
    const popoverHeight = 240;

    if (targetRect) {
        const spaceBelow = viewportSize.height - targetRect.bottom;
        const spaceAbove = targetRect.top;
        const spaceRight = viewportSize.width - targetRect.right;
        const spaceLeft = targetRect.left;

        const preferred = currentStep.placement || 'auto';

        let chosenSide: 'bottom' | 'top' | 'left' | 'right' = 'bottom';

        if (preferred === 'top' && spaceAbove > 220) chosenSide = 'top';
        else if (preferred === 'bottom' && spaceBelow > 220) chosenSide = 'bottom';
        else if (preferred === 'left' && spaceLeft > popoverWidth) chosenSide = 'left';
        else if (preferred === 'right' && spaceRight > popoverWidth) chosenSide = 'right';
        else {
            // Auto calculate
            if (spaceBelow >= 220) chosenSide = 'bottom';
            else if (spaceAbove >= 220) chosenSide = 'top';
            else if (spaceRight >= popoverWidth) chosenSide = 'right';
            else chosenSide = 'left';
        }

        if (chosenSide === 'bottom') {
            popoverStyle = {
                top: Math.min(viewportSize.height - popoverHeight - 20, targetRect.bottom + 16),
                left: Math.max(16, Math.min(viewportSize.width - popoverWidth - 16, targetRect.left + (targetRect.width / 2) - (popoverWidth / 2)))
            };
        } else if (chosenSide === 'top') {
            popoverStyle = {
                top: Math.max(16, targetRect.top - popoverHeight - 16),
                left: Math.max(16, Math.min(viewportSize.width - popoverWidth - 16, targetRect.left + (targetRect.width / 2) - (popoverWidth / 2)))
            };
        } else if (chosenSide === 'right') {
            popoverStyle = {
                top: Math.max(16, Math.min(viewportSize.height - popoverHeight - 16, targetRect.top + (targetRect.height / 2) - 100)),
                left: Math.min(viewportSize.width - popoverWidth - 16, targetRect.right + 16)
            };
        } else {
            popoverStyle = {
                top: Math.max(16, Math.min(viewportSize.height - popoverHeight - 16, targetRect.top + (targetRect.height / 2) - 100)),
                left: Math.max(16, targetRect.left - popoverWidth - 16)
            };
        }
    } else {
        // Center in screen
        popoverStyle = {
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
        };
    }

    return (
        <div className="fixed inset-0 z-[100] pointer-events-none">
            {/* Spotlight Cutout Overlay */}
            {targetRect ? (
                <svg
                    className="absolute inset-0 w-full h-full pointer-events-auto"
                    style={{ filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.5))' }}
                >
                    <defs>
                        <mask id="tour-spotlight-mask">
                            {/* Base oscura */}
                            <rect x="0" y="0" width="100%" height="100%" fill="white" />
                            {/* Agujero recortado alrededor del elemento con padding */}
                            <rect
                                x={Math.max(0, targetRect.left - padding)}
                                y={Math.max(0, targetRect.top - padding)}
                                width={targetRect.width + (padding * 2)}
                                height={targetRect.height + (padding * 2)}
                                rx="16"
                                ry="16"
                                fill="black"
                            />
                        </mask>
                    </defs>
                    <rect
                        x="0"
                        y="0"
                        width="100%"
                        height="100%"
                        fill="rgba(15, 23, 42, 0.72)"
                        mask="url(#tour-spotlight-mask)"
                    />
                </svg>
            ) : (
                <div className="absolute inset-0 bg-slate-950/75 pointer-events-auto backdrop-blur-xs" />
            )}

            {/* Pulsating Target Focus Ring */}
            {targetRect && (
                <div
                    className="absolute pointer-events-none rounded-2xl ring-4 ring-emerald-400 ring-offset-2 ring-offset-transparent animate-pulse transition-all duration-300"
                    style={{
                        top: targetRect.top - padding,
                        left: targetRect.left - padding,
                        width: targetRect.width + (padding * 2),
                        height: targetRect.height + (padding * 2)
                    }}
                />
            )}

            {/* Popover flotante inteligente */}
            <motion.div
                ref={popoverRef}
                initial={{ opacity: 0, scale: 0.94, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.2 }}
                style={popoverStyle}
                className="absolute pointer-events-auto w-[380px] max-w-[92vw] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-[101]"
            >
                {/* Header del Popover */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-500/20 text-emerald-300 rounded-lg">
                            <Compass size={16} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black tracking-wider uppercase text-emerald-400 block">
                                {activeTour.badge}
                            </span>
                            <span className="text-xs font-bold text-slate-200 truncate max-w-[200px] block">
                                {activeTour.title}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold bg-white/10 px-2 py-0.5 rounded-full text-slate-300">
                            {activeStepIndex + 1} / {totalSteps}
                        </span>
                        <button
                            onClick={endTour}
                            className="p-1 hover:bg-white/20 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                            title="Salir del tour (Esc)"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Contenido del Paso */}
                <div className="p-5 space-y-3">
                    <h3 className="text-sm font-black text-slate-900">
                        {currentStep.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        {currentStep.description}
                    </p>

                    {/* Tarjeta de Aha Moment */}
                    {currentStep.ahaMomentTitle && (
                        <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5">
                            <div className="p-1 bg-emerald-500 text-white rounded-lg shrink-0 mt-0.5 shadow-2xs">
                                <Sparkles size={14} />
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase text-emerald-900 tracking-wider block">
                                    {currentStep.ahaMomentTitle}
                                </span>
                                <p className="text-[11px] text-emerald-800 leading-snug font-medium mt-0.5">
                                    {currentStep.ahaMomentText}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Barra de Navegación del Tour */}
                <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <button
                        onClick={endTour}
                        className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer px-2"
                    >
                        Saltar
                    </button>

                    <div className="flex items-center gap-2">
                        {!isFirstStep && (
                            <button
                                onClick={prevStep}
                                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                            >
                                <ArrowLeft size={13} />
                                <span>Atrás</span>
                            </button>
                        )}

                        <button
                            onClick={nextStep}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                            <span>{isLastStep ? '¡Entendido / Finalizar!' : 'Siguiente'}</span>
                            {isLastStep ? <CheckCircle2 size={13} /> : <ArrowRight size={13} />}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
