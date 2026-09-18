import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Biocambio360 ERP & POS Mostrador',
        short_name: 'Biocambio POS',
        description: 'Punto de Venta Físico y ERP Industrial Biocambio360 - Operación en Línea y Fuera de Línea',
        start_url: '/admin/pos',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#059669',
        icons: [
            {
                src: '/icon.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/apple-icon.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    };
}
