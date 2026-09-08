import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Cómo Comprar | Guía Paso a Paso | Biocambio360',
    description: 'Aprende cómo comprar productos de aseo y limpieza industrial directo de fábrica con pago contraentrega o en línea en Biocambio360.',
    openGraph: {
        title: 'Cómo Comprar en Biocambio360 | Guía Paso a Paso',
        description: 'Pide tus productos de aseo concentrados directo de fábrica. Pago contraentrega o a cuotas.',
        images: [
            {
                url: '/images/og-biocambio360.png',
                width: 1200,
                height: 630,
                alt: 'Cómo Comprar en Biocambio360'
            }
        ]
    }
};

export default function ComoComprarLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
