import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Blog & Academia de Limpieza Industrial | Biocambio360',
    description: 'Guías, consejos y protocolos profesionales sobre limpieza industrial, desinfección institucional y rendimiento de insumos químicos.',
    openGraph: {
        title: 'Blog & Academia de Limpieza Industrial | Biocambio360',
        description: 'Guías, consejos y protocolos profesionales sobre limpieza industrial y desinfección institucional.',
        images: [
            {
                url: '/images/og-biocambio360.png',
                width: 1200,
                height: 630,
                alt: 'Blog Academia Biocambio360'
            }
        ]
    }
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
