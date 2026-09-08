import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Comunidad & Programa de Embajadores | Biocambio360',
    description: 'Únete a la comunidad Biocambio360 y gana comisiones recomendando productos de aseo concentrados directo de fábrica.',
    openGraph: {
        title: 'Comunidad & Programa de Embajadores | Biocambio360',
        description: 'Gana comisiones en efectivo recomendando productos de aseo concentrados directo de fábrica.',
        images: [
            {
                url: '/images/og-biocambio360.png',
                width: 1200,
                height: 630,
                alt: 'Comunidad Biocambio360'
            }
        ]
    }
};

export default function ComunidadLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
