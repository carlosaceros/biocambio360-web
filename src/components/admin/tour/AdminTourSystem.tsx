'use client';

import React from 'react';
import { TourProvider, useTour } from './TourContext';
import GuidedTourEngine from './GuidedTourEngine';
import TourLauncherButton from './TourLauncherButton';
import UserManualModal from '@/components/admin/UserManualModal';

function AdminTourInner({ children }: { children: React.ReactNode }) {
    const { isManualOpen, closeManual } = useTour();

    return (
        <>
            {children}
            <GuidedTourEngine />
            <TourLauncherButton />
            <UserManualModal isOpen={isManualOpen} onClose={closeManual} />
        </>
    );
}

export default function AdminTourSystem({ children }: { children: React.ReactNode }) {
    return (
        <TourProvider>
            <AdminTourInner>{children}</AdminTourInner>
        </TourProvider>
    );
}
