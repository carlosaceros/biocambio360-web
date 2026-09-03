import { Metadata } from 'next';
import { getAllProducts } from '@/lib/products-service';
import HeaderMessage from '@/components/HeaderMessage';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HorecaView from './HorecaView';

export const metadata: Metadata = {
    title: 'Insumos de Aseo para Hoteles, Restaurantes y Empresas en Bogotá | Biocambio360 HORECA',
    description: 'Proveedor directo de fábrica de químicos de limpieza institucional para el sector HORECA en Bogotá y Soacha. Desengrasantes pesados para campanas, lavalozas concentrados, amonio cuaternario y detergentes con registro INVIMA. Entregas 24h.',
    keywords: [
        'insumos de aseo para hoteles y restaurantes',
        'productos de aseo para restaurantes bogota',
        'desengrasante campanas extractores bogota',
        'proveedores de aseo horeca bogota',
        'quimicos de limpieza institucional bogota',
        'productos de limpieza para casinos de comida',
        'detergente para lavanderia hotelera bogota',
        'desinfectante grado alimentario bogota'
    ],
    alternates: {
        canonical: 'https://www.biocambio360.com/insumos-aseo-empresas-horeca',
    },
    openGraph: {
        title: 'Insumos de Aseo para Hoteles y Restaurantes en Bogotá | Biocambio360 HORECA',
        description: 'Químicos de limpieza pesada y desinfección grado alimentario directo de fábrica para cocinas, comedores y habitaciones en Bogotá. Ahorra hasta 45% con entrega en 24h.',
        url: 'https://www.biocambio360.com/insumos-aseo-empresas-horeca',
        siteName: 'Biocambio360',
        locale: 'es_CO',
        type: 'website',
    },
};

export default async function HorecaPage() {
    const products = await getAllProducts();

    const horecaSchema = {
        '@context': 'https://schema.org',
        '@type': ['WholesaleStore', 'LocalBusiness', 'Manufacturer'],
        'name': 'Biocambio360 — Insumos de Aseo para Hoteles, Restaurantes y Empresas (HORECA)',
        'image': 'https://www.biocambio360.com/images/logo-biocambio360.png',
        'description': 'Fabricante de productos de aseo, limpieza pesada y desinfección institucional para hoteles, restaurantes, casinos industriales y empresas en Bogotá y Cundinamarca. Cumplimiento de la Resolución 2674 de 2013 de MinSalud.',
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
        'url': 'https://www.biocambio360.com/insumos-aseo-empresas-horeca',
        'telephone': '+573223600360',
        'priceRange': '$$',
        'areaServed': [
            { '@type': 'AdministrativeArea', 'name': 'Bogotá D.C.' },
            { '@type': 'AdministrativeArea', 'name': 'Soacha' },
            { '@type': 'AdministrativeArea', 'name': 'Cundinamarca' }
        ]
    };

    const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': [
            {
                '@type': 'Question',
                'name': '¿Los productos de Biocambio360 cumplen con la Resolución 2674 de 2013 para restaurantes en Bogotá?',
                'acceptedAnswer': {
                    '@type': 'Answer',
                    'text': 'Sí. Todos nuestros insumos de grado alimentario e institucional cuentan con Notificación Sanitaria INVIMA, Fichas Técnicas (TDS) y Hojas de Seguridad (MSDS) bajo Sistema Globalmente Armonizado, requeridas en inspecciones de la Secretaría de Salud.'
                }
            },
            {
                '@type': 'Question',
                'name': '¿Tienen desengrasante alcalino pesado para campanas extractoras y planchas de cocina?',
                'acceptedAnswer': {
                    '@type': 'Answer',
                    'text': 'Sí. Nuestro Desengrasante Industrial Pesado en caneca de 20 Litros ($108.000 COP) saponifica grasas vegetales y animales quemadas en 10 a 15 minutos sin dañar el acero inoxidable 304.'
                }
            },
            {
                '@type': 'Question',
                'name': '¿Cuál es el tiempo de despacho para emergencias de inventario en restaurantes y hoteles?',
                'acceptedAnswer': {
                    '@type': 'Answer',
                    'text': 'Despachamos pedidos programados en 24 a 48 horas en Bogotá y Cundinamarca. En caso de requerimiento urgente, puedes retirar de inmediato en nuestra planta de Soacha (Cra. 7C #44-17 Sur) ahorrando el 100% del flete.'
                }
            }
        ]
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(horecaSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />

            <HeaderMessage />
            <Header />

            <main className="min-h-screen">
                <HorecaView products={products} />
            </main>

            <Footer />
        </>
    );
}
