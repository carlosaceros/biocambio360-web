'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { TourProvider, useTour } from './TourContext';
import GuidedTourEngine from './GuidedTourEngine';
import TourLauncherButton from './TourLauncherButton';

const UserManualModal = dynamic(() => import('@/components/admin/UserManualModal'), {
    ssr: false,
});

function AdminTourInner({ children }: { children: React.ReactNode }) {
    const { isManualOpen, closeManual } = useTour();

    return (
        <>
            {children}
            <GuidedTourEngine />
            <TourLauncherButton />
            {isManualOpen && <UserManualModal isOpen={isManualOpen} onClose={closeManual} />}
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
