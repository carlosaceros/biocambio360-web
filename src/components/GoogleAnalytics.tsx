'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-NRP5VW5182';

declare global {
    interface Window {
        dataLayer?: unknown[];
    }
}

function trackGaPageView(url: string) {
    if (typeof window === 'undefined' || !window.dataLayer) return;
    window.dataLayer.push(['event', 'page_view', { page_path: url }]);
}

function GaPageViewTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        // gtag('config', ...) ya envía el page_view inicial -- esto cubre las navegaciones
        // siguientes dentro del App Router, que no recargan la página.
        const query = searchParams.toString();
        trackGaPageView(query ? `${pathname}?${query}` : pathname);
    }, [pathname, searchParams]);

    return null;
}

/**
 * Google Analytics 4 (gtag.js). strategy="afterInteractive" -- se carga después de que la página
 * sea interactiva, igual que MetaPixel, para no bloquear el render inicial ni afectar LCP/CLS.
 */
export default function GoogleAnalytics() {
    return (
        <>
            <Script
                id="ga4-loader"
                strategy="afterInteractive"
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            />
            <Script
                id="ga4-init"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                    __html: `
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', '${GA_MEASUREMENT_ID}');
                    `,
                }}
            />
            <Suspense fallback={null}>
                <GaPageViewTracker />
            </Suspense>
        </>
    );
}
