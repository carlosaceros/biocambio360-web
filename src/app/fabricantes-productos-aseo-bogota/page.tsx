import { Metadata } from 'next';
import { getAllProducts } from '@/lib/products-service';
import HeaderMessage from '@/components/HeaderMessage';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FabricantesView from './FabricantesView';

export const metadata: Metadata = {
    title: 'Fabricantes de Productos de Aseo en Bogotá y Soacha | Biocambio360 Venta Directa',
    description: 'Fábrica de productos de aseo, limpieza y desinfección en Soacha y Bogotá. Detergentes, desengrasantes y desinfectantes directo de fábrica sin intermediarios. Entregas en 24h en las 20 localidades.',
    keywords: [
        'productos aseo bogota',
        'fabrica de productos de aseo para negocio',
        'empresas de productos de aseo en bogota',
        'productos de aseo y limpieza al por mayor',
        'distribuidora de productos de aseo bogota',
        'proveedores de aseo bogota',
        'productos de aseo soacha'
    ],
    alternates: {
        canonical: 'https://www.biocambio360.com/fabricantes-productos-aseo-bogota',
    },
    openGraph: {
        title: 'Fabricantes de Productos de Aseo en Bogotá y Soacha | Biocambio360',
        description: 'Venta directa de fábrica de productos de aseo concentrados para hogares y empresas. Ahorra comprando directo sin intermediarios.',
        url: 'https://www.biocambio360.com/fabricantes-productos-aseo-bogota',
        siteName: 'Biocambio360',
        locale: 'es_CO',
        type: 'website',
    },
};

export default async function FabricantesPage() {
    const products = await getAllProducts();

    const localBusinessSchema = {
        '@context': 'https://schema.org',
        '@type': ['LocalBusiness', 'Manufacturer'],
        'name': 'Biocambio360 — Fábrica de Productos de Aseo y Limpieza',
        'image': 'https://www.biocambio360.com/images/logo-biocambio360.png',
        'description': 'Fabricantes de productos de aseo, limpieza y desinfección en Soacha y Bogotá. Detergentes, suavizantes, desengrasantes y desinfectantes a precio directo de fábrica.',
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
        'url': 'https://www.biocambio360.com/fabricantes-productos-aseo-bogota',
        'telephone': '+573223600360',
        'priceRange': '$$',
        'openingHoursSpecification': [
            {
                '@type': 'OpeningHoursSpecification',
                'dayOfWeek': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                'opens': '08:00',
                'closes': '17:30'
            }
        ],
        'areaServed': [
            'Bogotá',
            'Soacha',
            'Chía',
            'Cajicá',
            'Mosquera',
            'Funza',
            'Madrid',
            'Cota',
            'Cundinamarca',
            'Colombia'
        ]
    };

    const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': [
            {
                '@type': 'Question',
                'name': '¿Dónde está ubicada la fábrica de Biocambio360?',
                'acceptedAnswer': {
                    '@type': 'Answer',
                    'text': 'Nuestra planta de producción principal está ubicada en Soacha, Cundinamarca (Cra. 7C #44-17 Sur). Contamos con despacho directo propio en 24h a las 20 localidades de Bogotá D.C. y municipios de la sabana, además de punto de recogida en fábrica sin costo de flete.'
                }
            },
            {
                '@type': 'Question',
                'name': '¿Por qué comprar directo a un fabricante de aseo en Bogotá?',
                'acceptedAnswer': {
                    '@type': 'Answer',
                    'text': 'Al comprar directo en fábrica eliminas los sobrecostos de distribuidores, intermediarios y supermercados, ahorrando entre un 30% y un 50% por litro. Además, obtienes formulaciones industriales frescas y concentradas con mayor poder desengrasante y desinfectante que las presentaciones diluidas de retail.'
                }
            },
            {
                '@type': 'Question',
                'name': '¿Cuál es el pedido mínimo para comprar a precio de fábrica?',
                'acceptedAnswer': {
                    '@type': 'Answer',
                    'text': 'En Biocambio360 puedes comprar a precio de fábrica desde 1 caneca de 20 Litros, bidones de 10L o galones, tanto para tu hogar como para tu negocio, lavandería o empresa, sin exigencias de 500 unidades mínimas.'
                }
            },
            {
                '@type': 'Question',
                'name': '¿Hacen entregas en todas las localidades de Bogotá y municipios cercanos?',
                'acceptedAnswer': {
                    '@type': 'Answer',
                    'text': 'Sí. Cubrimos toda Bogotá (Usaquén, Suba, Chapinero, Engativá, Kennedy, Bosa, Puente Aranda, Fontibón, Teusaquillo, etc.) y municipios de Cundinamarca con tiempos de entrega promedio de 24 a 48 horas.'
                }
            },
            {
                '@type': 'Question',
                'name': '¿Los productos cuentan con registro INVIMA y hojas de seguridad (MSDS)?',
                'acceptedAnswer': {
                    '@type': 'Answer',
                    'text': 'Sí. Todos nuestros insumos de limpieza y desinfección cuentan con notificación sanitaria obligatoria INVIMA, fichas técnicas de rendimiento (TDS) y hojas de seguridad (MSDS) grado industrial listas para auditorías de Secretaría de Salud o SGSST.'
                }
            }
        ]
    };

    return (
        <>
            {/* Inject JSON-LD Schema for Google & AI RAG crawlers */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />

            <HeaderMessage />
            <Header />
            <FabricantesView products={products} />
            <Footer />
        </>
    );
}
