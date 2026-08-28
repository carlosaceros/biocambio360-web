'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { captureTrafficAttribution } from '@/lib/traffic-attribution';

export default function TrafficTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        captureTrafficAttribution();
    }, [pathname, searchParams]);

    return null;
}
