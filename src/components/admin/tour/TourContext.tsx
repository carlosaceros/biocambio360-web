'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { TOURS_CONFIG, TourDefinition, TourStep } from './tourDefinitions';

interface TourContextType {
    activeTour: TourDefinition | null;
    activeStepIndex: number;
    currentStep: TourStep | null;
    isTourActive: boolean;
    startTour: (tourId: string) => void;
    endTour: () => void;
    nextStep: () => void;
    prevStep: () => void;
    isManualOpen: boolean;
    openManual: () => void;
    closeManual: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export function TourProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    const [activeTour, setActiveTour] = useState<TourDefinition | null>(null);
    const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
    const [isManualOpen, setIsManualOpen] = useState(false);

    const isTourActive = activeTour !== null;
    const currentStep = activeTour ? activeTour.steps[activeStepIndex] || null : null;

    const startTour = (tourId: string) => {
        const tour = TOURS_CONFIG[tourId];
        if (!tour) return;

        // Si el tour requiere una ruta específica y no estamos allí, navegamos primero
        if (tour.route && pathname !== tour.route) {
            router.push(tour.route);
            setTimeout(() => {
                setActiveTour(tour);
                setActiveStepIndex(0);
            }, 600);
        } else {
            setActiveTour(tour);
            setActiveStepIndex(0);
        }
    };

    const endTour = () => {
        setActiveTour(null);
        setActiveStepIndex(0);
    };

    const nextStep = () => {
        if (!activeTour) return;
        if (activeStepIndex < activeTour.steps.length - 1) {
            setActiveStepIndex(prev => prev + 1);
        } else {
            endTour();
        }
    };

    const prevStep = () => {
        if (activeStepIndex > 0) {
            setActiveStepIndex(prev => prev - 1);
        }
    };

    const openManual = () => setIsManualOpen(true);
    const closeManual = () => setIsManualOpen(false);

    return (
        <TourContext.Provider
            value={{
                activeTour,
                activeStepIndex,
                currentStep,
                isTourActive,
                startTour,
                endTour,
                nextStep,
                prevStep,
                isManualOpen,
                openManual,
                closeManual
            }}
        >
            {children}
        </TourContext.Provider>
    );
}

export function useTour() {
    const context = useContext(TourContext);
    if (!context) {
        throw new Error('useTour debe utilizarse dentro de un TourProvider');
    }
    return context;
}
