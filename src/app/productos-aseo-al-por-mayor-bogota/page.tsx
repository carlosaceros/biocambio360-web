import { Metadata } from 'next';
import { getAllProducts } from '@/lib/products-service';
import HeaderMessage from '@/components/HeaderMessage';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MayoristaView from './MayoristaView';

export const metadata: Metadata = {
    title: 'Productos de Aseo al por Mayor en Bogotá | Precios Directos de Fábrica Biocambio360',
    description: 'Catálogo mayorista de productos de aseo, limpieza y desinfección en Bogotá y Soacha. Canecas de 20L, bidones de 10L y galones desde fábrica sin intermediarios. Factura electrónica DIAN y entregas 24h.',
    keywords: [
        'productos de aseo al por mayor bogota',
        'distribuidora de productos de aseo por mayor bogota',
        'productos de aseo por mayor',
        'canecas productos de aseo bogota',
        'proveedores de aseo para empresas bogota',
        'catalogo productos de aseo por mayor',
        'detergente al por mayor bogota',
        'desengrasante industrial por mayor bogota'
    ],
    alternates: {
        canonical: 'https://www.biocambio360.com/productos-aseo-al-por-mayor-bogota',
    },
    openGraph: {
        title: 'Productos de Aseo al por Mayor en Bogotá | Fábrica Biocambio360',
        description: 'Venta mayorista directa de fábrica de productos de limpieza industrial en Bogotá y Soacha. Desde 1 caneca sin mínimos abusivos. Ahorro hasta 45% frente a distribuidores.',
        url: 'https://www.biocambio360.com/productos-aseo-al-por-mayor-bogota',
        siteName: 'Biocambio360',
        locale: 'es_CO',
        type: 'website',
    },
};

export default async function ProductosAseoMayoristaPage() {
    const products = await getAllProducts();

    const wholesaleStoreSchema = {
        '@context': 'https://schema.org',
        '@type': ['WholesaleStore', 'LocalBusiness', 'Manufacturer'],
        'name': 'Biocambio360 — Productos de Aseo al por Mayor en Bogotá',
        'image': 'https://www.biocambio360.com/images/logo-biocambio360.png',
        'description': 'Distribución y venta directa de fábrica de productos de aseo, limpieza y desinfección al por mayor en Bogotá y Cundinamarca. Canecas de 20L, bidones de 10L y galones para empresas, colegios, lavanderías y conjuntos residenciales.',
        'address': {
            '@type': 'PostalAddress',
            'streetAddress': 'Cra. 7C #44-17 Sur',
            'addressLocality': 'Soacha',
            'addressRegion': 'Cundinamarca',
            'postalCode': '250051',
            'addressCountry': 'CO'
        },
        'geo': {
            '@type': 'GeoCoordinates',
            'latitude': '4.5822',
            'longitude': '-74.2189'
        },
        'url': 'https://www.biocambio360.com/productos-aseo-al-por-mayor-bogota',
        'telephone': '+573223600360',
        'priceRange': '$$',
        'areaServed': [
            { '@type': 'AdministrativeArea', 'name': 'Bogotá D.C.' },
            { '@type': 'AdministrativeArea', 'name': 'Soacha' },
            { '@type': 'AdministrativeArea', 'name': 'Cundinamarca' }
        ],
        'hasOfferCatalog': {
            '@type': 'OfferCatalog',
            'name': 'Catálogo Mayorista de Productos de Aseo',
            'itemListElement': [
                {
                    '@type': 'Offer',
                    'itemOffered': {
                        '@type': 'Product',
                        'name': 'Detergente Líquido Multiusos Industrial Caneca 20L',
                        'description': 'Detergente líquido concentrado con bicarbonato activo para 280 lavadas industriales.',
                    },
                    'price': '86000',
                    'priceCurrency': 'COP'
                },
                {
                    '@type': 'Offer',
                    'itemOffered': {
                        '@type': 'Product',
                        'name': 'Desengrasante Pesado Industrial Caneca 20L',
                        'description': 'Desengrasante de alta alcalinidad para campanas, talleres y cocinas industriales.',
                    },
                    'price': '108000',
                    'priceCurrency': 'COP'
                },
                {
                    '@type': 'Offer',
                    'itemOffered': {
                        '@type': 'Product',
                        'name': 'Desinfectante Bactokill Amonio Cuaternario Caneca 20L',
                        'description': 'Desinfectante hospitalario de amplio espectro bactericida y virucida.',
                    },
                    'price': '86000',
                    'priceCurrency': 'COP'
                }
            ]
        }
    };

    const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': [
            {
                '@type': 'Question',
                'name': '¿Cuál es el pedido mínimo para comprar productos de aseo al por mayor?',
                'acceptedAnswer': {
                    '@type': 'Answer',
                    'text': 'En Biocambio360 puedes acceder a precios mayoristas directos de fábrica desde 1 caneca de 20 Litros o 1 galón de 3.8L. No exigimos mínimos de 500 unidades ni contratos restrictivos.'
                }
            },
            {
                '@type': 'Question',
                'name': '¿Cuánto tiempo tardan los despachos mayoristas en Bogotá y Soacha?',
                'acceptedAnswer': {
                    '@type': 'Answer',
                    'text': 'Despachamos pedidos en 24 a 48 horas con flota local propia a las 20 localidades de Bogotá y municipios aledaños. También puedes retirar en planta sin costo de envío.'
                }
            },
            {
                '@type': 'Question',
                'name': '¿Emiten factura electrónica DIAN y entregan fichas técnicas?',
                'acceptedAnswer': {
                    '@type': 'Answer',
                    'text': 'Sí. Todos nuestros pedidos mayoristas se emiten con Factura Electrónica DIAN e incluyen Fichas Técnicas (TDS) y Hojas de Seguridad (MSDS) con Registro Sanitario INVIMA.'
                }
            }
        ]
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(wholesaleStoreSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />

            <HeaderMessage />
            <Header />

            <main className="min-h-screen">
                <MayoristaView products={products} />
            </main>

            <Footer />
        </>
    );
}
