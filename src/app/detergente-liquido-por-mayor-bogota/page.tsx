import { Metadata } from 'next';
import { getProductById } from '@/lib/products-service';
import HeaderMessage from '@/components/HeaderMessage';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import DetergenteView from './DetergenteView';

export const metadata: Metadata = {
    title: 'Detergente Líquido al por Mayor en Bogotá | Caneca 20L $86.000 Biocambio360',
    description: 'Compra detergente líquido al por mayor en Bogotá directo de fábrica. Caneca de 20 Litros a solo $86.000 COP ($4.300/L). Rinde 280 lavadas a $307 por carga. Despacho en 24h.',
    keywords: [
        'detergente liquido mayorista bogota',
        'detergente liquido 20 litros bogota',
        'pimpina 20 litros detergente bogota',
        'caneca detergente lavadora bogota',
        'detergente por mayor bogota precio',
        'detergente liquido industrial bogota'
    ],
    alternates: {
        canonical: 'https://www.biocambio360.com/detergente-liquido-por-mayor-bogota',
    },
    openGraph: {
        title: 'Detergente Líquido al por Mayor en Bogotá | Caneca 20L $86.000 COP',
        description: 'Detergente concentrado con bicarbonato para lavanderías, hoteles y hogares. Rinde 280 lavadas garantizadas. Despacho en 24 horas.',
        url: 'https://www.biocambio360.com/detergente-liquido-por-mayor-bogota',
        siteName: 'Biocambio360',
        locale: 'es_CO',
        type: 'website',
    },
};

export default async function DetergenteMayoristaPage() {
    const detergenteProduct = await getProductById('detergente-liquido-multiusos');

    const productSchema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        'name': 'Detergente Líquido Multiusos Concentrado 20 Litros Biocambio360',
        'image': 'https://www.biocambio360.com/images/products/detergente-liquido-multiusos.webp',
        'description': 'Detergente líquido concentrado con bicarbonato activo para ropa y lavandería. Caneca de 20 Litros con rendimiento de 280 lavadas.',
        'brand': {
            '@type': 'Brand',
            'name': 'Biocambio360'
        },
        'offers': {
            '@type': 'Offer',
            'url': 'https://www.biocambio360.com/detergente-liquido-por-mayor-bogota',
            'priceCurrency': 'COP',
            'price': '86000',
            'availability': 'https://schema.org/InStock',
            'priceValidUntil': '2026-12-31',
            'shippingDetails': {
                '@type': 'OfferShippingDetails',
                'shippingRate': {
                    '@type': 'MonetaryAmount',
                    'value': '0',
                    'currency': 'COP'
                },
                'shippingDestination': {
                    '@type': 'DefinedRegion',
                    'addressCountry': 'CO',
                    'addressRegion': 'Bogotá D.C. y Cundinamarca'
                },
                'deliveryTime': {
                    '@type': 'ShippingDeliveryTime',
                    'handlingTime': {
                        '@type': 'QuantitativeValue',
                        'minValue': 0,
                        'maxValue': 1,
                        'unitCode': 'd'
                    },
                    'transitTime': {
                        '@type': 'QuantitativeValue',
                        'minValue': 1,
                        'maxValue': 2,
                        'unitCode': 'd'
                    }
                }
            }
        }
    };

    const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': [
            {
                '@type': 'Question',
                'name': '¿Cuánto cuesta la caneca de 20 litros de detergente en Bogotá?',
                'acceptedAnswer': {
                    '@type': 'Answer',
                    'text': 'En Biocambio360 la caneca de 20 Litros cuesta $86.000 COP a precio directo de fábrica (IVA incluido), lo que equivale a solo $4.300 COP por litro. Distribuidores intermediarios como Detercol venden presentaciones similares a $119.000 COP.'
                }
            },
            {
                '@type': 'Question',
                'name': '¿Cuántas lavadas rinde la pimpina de 20L de detergente?',
                'acceptedAnswer': {
                    '@type': 'Answer',
                    'text': 'Rinde exactamente 280 lavadas completas para cargas estándar de 10 a 12 kg (utilizando la dosis recomendada de 70 ml por ciclo). El costo por lavada es de solo $307 COP.'
                }
            },
            {
                '@type': 'Question',
                'name': '¿Es compatible con lavadoras automáticas de carga frontal y superior (HE)?',
                'acceptedAnswer': {
                    '@type': 'Answer',
                    'text': 'Sí. Nuestra fórmula está diseñada con tensoactivos de baja espuma controlada, ideal para lavadoras de alta eficiencia (HE), carga frontal y sistemas tradicionales.'
                }
            }
        ]
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />

            <HeaderMessage />
            <Header />
            <DetergenteView detergenteProduct={detergenteProduct} />
            <Footer />
        </>
    );
}
