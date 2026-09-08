import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Cotizador B2B para Empresas, Hoteles y Restaurantes | Biocambio360',
    description: 'Calcula tus ahorros y cotiza insumos de aseo por volumen directamente de fábrica para empresas, lavanderías, colegios y canal HORECA.',
    openGraph: {
        title: 'Cotizador B2B para Empresas e Instituciones | Biocambio360',
        description: 'Cotiza productos de limpieza industrial por volumen directo de fábrica.',
        images: [
            {
                url: '/images/og-biocambio360.png',
                width: 1200,
                height: 630,
                alt: 'Cotizador B2B Biocambio360'
            }
        ]
    }
};

export default function CotizadorB2BLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
