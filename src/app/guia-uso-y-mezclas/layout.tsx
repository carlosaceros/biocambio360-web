import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Guía Oficial de Uso y Matriz de Mezclas Químicas | Biocambio360',
    description: 'Protocolos de bioseguridad, dilución y matriz oficial de mezclas químicas permitidas y prohibidas según normativa colombiana NTC y SGA.',
    openGraph: {
        title: 'Guía Oficial de Uso y Matriz de Mezclas Químicas | Biocambio360',
        description: 'Protocolos de bioseguridad y matriz oficial de mezclas químicas para aseo profesional.',
        images: [
            {
                url: '/images/og-biocambio360.png',
                width: 1200,
                height: 630,
                alt: 'Guía de Uso y Mezclas Químicas Biocambio360'
            }
        ]
    }
};

export default function GuiaUsoLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
