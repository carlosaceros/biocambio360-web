import { Product } from './products';
import { getAllProducts } from './products-service';
import { Metadata } from 'next';
import { getRichSpecForProduct } from './products-rich-data';

const BASE_URL = 'https://www.biocambio360.com';

/**
 * Generate SEO-friendly slug from product name
 * Example: "Detergente Ropa" -> "detergente-ropa-industrial"
 */
export function generateProductSlug(id: string, nombre: string): string {
    // Mapeo de IDs a términos descriptivos adicionales para SEO
    const seoTerms: Record<string, string> = {
        'detergente': 'industrial',
        'desengrasante': 'multiusos',
        'suavizante': 'textil-ropa',
        'blanqueador': 'desinfectante'
    };

    const baseName = nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    const seoTerm = seoTerms[id] || '';

    return seoTerm ? `${baseName}-${seoTerm}` : baseName;
}

/**
 * Get product by slug
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
    const products = await getAllProducts();
    const cleanSlug = slug.toLowerCase().trim();

    // Disabled combos blocklist
    if (
        cleanSlug.includes('kit-super-limpieza-completo') ||
        cleanSlug.includes('kit-esencial-de-lavanderia-30-litros') ||
        cleanSlug.includes('kit-esencial-lavanderia-30-litros') ||
        cleanSlug.includes('combo-ahorro-pajarito-2-garrafas') ||
        cleanSlug.includes('kit-combo-ahorro-pajarito-2-garrafas-10l')
    ) {
        return null;
    }

    // 1. Direct match by generated slug or product ID
    const match = products.find(p => p.id === cleanSlug || generateProductSlug(p.id, p.nombre) === cleanSlug);
    if (match) return match;

    // 2. Legacy URL fallback aliases
    if (cleanSlug.includes('desengrasante-multiusos') || cleanSlug === 'desengrasante') {
        return products.find(p => p.id === 'desengrasante') || null;
    }
    if (cleanSlug.includes('bactokill') || cleanSlug.includes('bactokil') || cleanSlug.includes('desinfectante')) {
        return products.find(p => p.id === 'bactokill') || null;
    }

    return null;
}

/**
 * Get all product slugs for SSG
 */
export async function getAllProductSlugs(): Promise<string[]> {
    const products = await getAllProducts();
    const slugSet = new Set<string>();
    products.forEach(p => {
        slugSet.add(p.id);
        slugSet.add(generateProductSlug(p.id, p.nombre));
    });
    // Add legacy fallback aliases for SSG page generation
    slugSet.add('desengrasante-multiusos');
    slugSet.add('desengrasante-hogar');
    slugSet.add('desinfectante-bactokill');
    return Array.from(slugSet);
}

/**
 * Generate metadata for product page (Next.js 16 Metadata API)
 * metadataBase is set in layout.tsx so all relative paths resolve correctly.
 */
export function generateProductMetadata(product: Product, size?: string): Metadata {
    const slug = generateProductSlug(product.id, product.nombre);
    
    // Safety check: pick the first available size if '10L' is missing
    const availableSizes = Object.keys(product.precios);
    const selectedSize = (size && product.precios[size]) ? size : (product.precios['10L'] ? '10L' : availableSizes[0]);
    
    const price = product.precios[selectedSize] || 0;
    
    // Improved price calculation to handle '1/2G' or 'DEFAULT'
    let liters = 1;
    if (selectedSize === '1/2G') liters = 1.9;
    else if (selectedSize === '3.8L') liters = 3.8;
    else if (selectedSize === '20L') liters = 20;
    else if (selectedSize === '10L') liters = 10;
    else {
        const parsed = parseFloat(selectedSize.replace(/[^0-9.]/g, ''));
        liters = isNaN(parsed) || parsed === 0 ? 1 : parsed;
    }
    
    const pricePerMl = (price / (liters * 1000)).toFixed(2);

    // SEO-optimized title with long-tail keywords
    const title = product.categoria === 'Kits & Combos'
        ? `${product.nombre} - Oferta de Fábrica | Biocambio360`
        : `${product.nombre} ${selectedSize} Industrial - $${price.toLocaleString('es-CO')} | Biocambio360`;

    const description = product.categoria === 'Kits & Combos'
        ? `${product.descripcion} Envíos prioritarios a Bogotá, Medellín, Cali, Barranquilla, Soacha y toda Colombia.`
        : `Compra ${product.nombre} ${selectedSize} industrial a $${price.toLocaleString('es-CO')}. ${product.descripcion} Costo por ml: $${pricePerMl}/ml. ${product.slogan}. Envíos Colombia Biocambio360.`;
    const absoluteImageUrl = `${BASE_URL}/images/${product.imgFile.replace(/%20/g, ' ')}`;

    return {
        title,
        description,
        keywords: [
            product.nombre.toLowerCase(),
            `${product.nombre.toLowerCase()} industrial`,
            `${product.nombre.toLowerCase()} ${selectedSize}`,
            'kits de productos de aseo colombia',
            'combos de aseo bogota',
            'kits de limpieza medellin',
            'insumos de aseo cali barranquilla',
            'fabrica de productos de aseo soacha',
            'aseo granel colombia',
            'productos limpieza por mayor',
            'biocambio360',
            slug,
            ...product.beneficios.map(b => b.toLowerCase())
        ],
        openGraph: {
            title,
            description,
            type: 'website',
            locale: 'es_CO',
            url: `${BASE_URL}/producto/${slug}`,
            siteName: 'Biocambio360 - Aseo Industrial',
            images: [
                {
                    url: absoluteImageUrl,
                    width: 800,
                    height: 800,
                    alt: `${product.nombre} ${selectedSize} Industrial - Biocambio360`
                }
            ]
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [absoluteImageUrl]
        },
        alternates: {
            canonical: `/producto/${slug}`
        },
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                'max-image-preview': 'large',
                'max-snippet': -1
            }
        }
    };
}

/**
 * Generate Product Schema (Schema.org Product)
 * Includes an Offers array with ALL 3 size variants for Google Shopping.
 * NOTE: aggregateRating removed — never fake ratings, Google penalizes this.
 */
export function generateProductSchema(product: Product, size: string = '10L') {
    const slug = generateProductSlug(product.id, product.nombre);
    const absoluteImageUrl = `${BASE_URL}/images/${product.imgFile.replace(/%20/g, ' ')}`;

    // Build one Offer per size variant (better for Google Shopping)
    // Filter to only include sizes that actually have a price for this specific product
    const possibleSizes = ['3.8L', '10L', '20L', '1L', '1/2G', 'DEFAULT'];
    const actualSizes = Object.keys(product.precios).filter(s => possibleSizes.includes(s));
    
    const offers = actualSizes.map((s) => {
        const price = product.precios[s];
        return {
            "@type": "Offer",
            "url": `${BASE_URL}/producto/${slug}`,
            "priceCurrency": "COP",
            "price": price,
            "priceValidUntil": "2026-12-31",
            "availability": "https://schema.org/InStock",
            "itemCondition": "https://schema.org/NewCondition",
            "name": `${product.nombre} ${s}`,
            "sku": `${product.id.toUpperCase()}-${s.replace('.', '_')}`,
            "seller": {
                "@type": "Organization",
                "name": "Biocambio360 S.A.S."
            },
            "shippingDetails": {
                "@type": "OfferShippingDetails",
                "shippingRate": {
                    "@type": "MonetaryAmount",
                    "value": "12000",
                    "currency": "COP"
                },
                "freeShippingThreshold": {
                    "@type": "MonetaryAmount",
                    "value": "100000",
                    "currency": "COP"
                },
                "shippingDestination": {
                    "@type": "DefinedRegion",
                    "addressCountry": "CO"
                },
                "deliveryTime": {
                    "@type": "ShippingDeliveryTime",
                    "handlingTime": {
                        "@type": "QuantitativeValue",
                        "minValue": 1,
                        "maxValue": 2,
                        "unitCode": "DAY"
                    },
                    "transitTime": {
                        "@type": "QuantitativeValue",
                        "minValue": 2,
                        "maxValue": 5,
                        "unitCode": "DAY"
                    }
                }
            },
            "hasMerchantReturnPolicy": {
                "@type": "MerchantReturnPolicy",
                "applicableCountry": "CO",
                "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
                "merchantReturnDays": 15,
                "returnMethod": "https://schema.org/ReturnByMail",
                "returnFees": "https://schema.org/FreeReturn"
            }
        };
    });

    return {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": `${product.nombre} Industrial`,
        "description": product.descripcion,
        "image": absoluteImageUrl,
        "brand": {
            "@type": "Brand",
            "name": "Biocambio360"
        },
        "manufacturer": {
            "@type": "Organization",
            "name": "Biocambio360 S.A.S.",
            "url": BASE_URL,
            "address": {
                "@type": "PostalAddress",
                "streetAddress": "Cra. 7C #44-17 Sur",
                "addressLocality": "Soacha",
                "addressRegion": "Cundinamarca",
                "postalCode": "250001",
                "addressCountry": "CO"
            }
        },
        "sku": product.id.toUpperCase(),
        "category": "Productos de Limpieza Industrial",
        "offers": offers,
    };
}

export interface RichDetails {
    ph: string;
    dilucion: string;
    biodegradabilidad: string;
    usoRecomendado: string;
    diferenciadores: string[];
    instrucciones: string[];
    faqs: { q: string; a: string }[];
}

export function getRichProductDetails(product: Product): RichDetails {
    const cat = (product.categoria || '').toLowerCase();
    const sub = (product.subcategoria || '').toLowerCase();
    const name = product.nombre.toLowerCase();

    // Default values
    let ph = "7.0 (Neutro)";
    let dilucion = "Listo para usar";
    let biodegradabilidad = "Fórmula concentrada libre de fosfatos y metales pesados";
    const isCertBiodegradable = name.includes("detergente") || name.includes("lavaloza");
    if (isCertBiodegradable) {
        biodegradabilidad = "Fórmula biodegradable certificada";
    }
    let usoRecomendado = "Uso general doméstico e industrial";
    let diferenciadores = [
        "Fórmula ultra concentrada que rinde hasta 3 veces más que productos convencionales.",
        "Desarrollado con materias primas colombianas de alta pureza y calidad garantizada.",
        "Empaque industrial de alta resistencia con diseño ergonómico para dosificación segura."
    ];
    let instrucciones = [
        "Identifique el área o superficie a limpiar.",
        "Aplique el producto de forma uniforme (puro o diluido según necesidad).",
        "Deje actuar por 2 a 3 minutos para máxima eficiencia.",
        "Retire con un paño limpio o enjuague con agua si es necesario."
    ];
    let faqs = [
        {
            q: `¿Qué hace diferente al ${product.nombre} de Biocambio360 frente a marcas comunes?`,
            a: `El ${product.nombre} de Biocambio360 está formulado bajo estándares industriales de alta concentración. Esto significa que rinde hasta 3 veces más por litro y ofrece un costo por mililitro significativamente menor, garantizando un ahorro real en el presupuesto de aseo.`
        },
        {
            q: `¿El ${product.nombre} es seguro para el medio ambiente?`,
            a: isCertBiodegradable 
                ? "Sí, este producto cuenta con fórmula biodegradable certificada, libre de fosfatos y metales pesados, cuidando fuentes hídricas y el medio ambiente." 
                : "Sí, nuestras fórmulas son libres de fosfatos y metales pesados, diseñadas para minimizar el impacto ecológico sin comprometer el poder de limpieza profesional."
        },
        {
            q: "¿Cómo se debe almacenar este producto para conservar sus propiedades?",
            a: "Se recomienda almacenar en su envase original bien cerrado, en un lugar fresco, seco y protegido de la luz solar directa, lejos del alcance de niños y mascotas."
        }
    ];

    // Dedicated handling for Kits & Combos
    if (cat.includes('kit') || cat.includes('combo') || product.id.startsWith('kit-')) {
        ph = "Varía según producto incluido (pH 6.0 a 12.0 - Ver especificación por unidad)";
        dilucion = "Aplicar la dosificación indicada para cada componente del Kit";
        usoRecomendado = "Solución integral combinada para lavandería, cocina, desinfección y limpieza de superficies del hogar o empresa.";
        
        diferenciadores = [
            "Combinación sinérgica de fórmulas concentradas para máxima eficiencia y ahorro.",
            "Solución completa que cubre lavado de ropa, desengrase profundo y desinfección.",
            "Empaques ergónomicos graduados que facilitan el almacenamiento y dosificación.",
            "Mayor volumen y mejor costo por mililitro que comprando unidades por separado."
        ];

        instrucciones = [
            "Detergente Ropa: Añadir 100 ml en la gaveta de la lavadora para ciclo principal.",
            "Suavizante: Añadir 50 ml exclusivamente en el ciclo final de enjuague (no mezclar directo con el detergente).",
            "Desengrasante Multiusos/Textil: Aplicar sobre grasa pesada en cocina o prendas, dejar actuar 3 min y enjuagar.",
            "Bactokill / Desinfectante: Atomizar diluido (1:10) sobre superficies o manijas para eliminar el 99.9% de gérmenes.",
            "Lavaloza Líquido: Aplicar sobre esponja húmeda para lavado de vajillas y cristalería.",
            "Precaución de Mezclas: Almacenar cada envase bien cerrado. NUNCA mezclar desengrasantes o clorados directamente con ácidos."
        ];

        faqs = [
            {
                q: `¿Los productos del ${product.nombre} se pueden mezclar entre sí?`,
                a: "Cada producto del Kit cumple una función técnica específica (lavado, suavizado, desengrase, desinfección). Se deben aplicar de forma secuencial según sus instrucciones y no combinarlos directamente en un mismo recipiente puro."
            },
            {
                q: "¿Cómo se debe almacenar este kit de limpieza?",
                a: "Conserve los recipientes en un lugar fresco, seco y bien ventilado, lejos de la luz solar directa y con las tapas bien ajustadas."
            }
        ];
    } else if (name.includes('alcohol') || sub.includes('alcohol')) {
        ph = "6.5 (Neutro)";
        dilucion = "Listo para usar";
        usoRecomendado = "Desinfección de manos, superficies delicadas y herramientas sin enjuague.";
        diferenciadores = [
            "Alta pureza comprobada para desinfección rápida y efectiva.",
            "Rápida evaporación sin dejar residuos tóxicos ni películas pegajosas.",
            "Formulado para uso personal, cosmético, doméstico u hospitalario."
        ];
        instrucciones = [
            "Aplique directamente sobre las manos o superficie limpia.",
            "Frote suavemente hasta su completa evaporación.",
            "No requiere enjuague posterior."
        ];
        faqs = [
            {
                q: `¿El ${product.nombre} requiere enjuague con agua?`,
                a: "No, su formulación se evapora completamente en segundos sin dejar residuos."
            }
        ];
    } else if (name.includes('cera') || name.includes('sellador')) {
        ph = "7.5 - 8.0";
        dilucion = "Listo para usar (puro)";
        usoRecomendado = "Protección, sellado y embellecimiento de pisos cerámicos, porcelanato, mármol y caucho.";
        diferenciadores = [
            "Película polimérica autobrillante de alta resistencia al tráfico constante.",
            "Anti-deslizante y protector contra rayones y manchas cotidianas.",
            "Formulación ideal para mantener pisos relucientes sin necesidad de polichadora."
        ];
        instrucciones = [
            "Asegúrese de que el piso esté completamente limpio y seco.",
            "Aplique una capa delgada de Cera Autobrillante con mopa limpia.",
            "Deje secar durante 20 a 30 minutos sin pisar el área.",
            "Para mayor brillo, aplique una segunda capa delgada."
        ];
        faqs = [
            {
                q: "¿Sirve para pisos de porcelanato y cerámica?",
                a: "Sí, es ideal para proteger y dar brillo duradero a pisos de cerámica, baldosas y porcelanatos."
            }
        ];
    } else if (name.includes('muebles') || sub.includes('muebles') || sub.includes('tapiceria')) {
        ph = "7.0 (Neutro)";
        dilucion = name.includes('shampoo') ? "1:10 (100ml por litro de agua)" : "Listo para usar";
        usoRecomendado = "Cuidado, limpieza y conservación de muebles de madera, cuero, vinilo, tapicería y cojinería.";
        diferenciadores = [
            "Fórmula especializada que remueve mugre incrustada sin empapar las fibras ni deteriorar la madera.",
            "Crea una película protectora antiestática que repele el polvo y revitaliza el brillo natural.",
            "pH neutro balanceado seguro para telas delicadas, cuero sintético y superficies barnizadas."
        ];
        instrucciones = [
            name.includes('shampoo')
                ? "Disuelva el shampoo en agua y bata hasta generar abundante espuma. Aplique solo la espuma con esponja o cepillo suave sobre la tapicería."
                : "Atomice o aplique una pequeña cantidad sobre un paño de microfibra. Frote suavemente la superficie del mueble.",
            "Retire el exceso con un paño limpio y deje secar a la sombra en un área ventilada."
        ];
        faqs = [
            {
                q: `¿El ${product.nombre} se puede usar en muebles de cuero o madera barnizada?`,
                a: `Sí, su fórmula de pH neutro está desarrollada específicamente para limpiar y proteger madera, cuero, vinilcuero y tapicería sin manchar ni deteriorar los acabados.`
            }
        ];
    } else if (cat.includes('automotriz') || (name.includes('auto') && !name.includes('autobrillante')) || name.includes('llanta') || (name.includes('silicona') && !name.includes('lustramuebles'))) {
        ph = "7.5 (Ligeramente alcalino)";
        dilucion = name.includes('shampoo') ? "1:100 (100ml por balde de agua)" : "Listo para usar";
        usoRecomendado = "Superficies vehiculares, carrocería, llantas, plásticos y vidrios.";
        diferenciadores = [
            "Protección UV de larga duración que previene el agrietamiento y decoloración de plásticos y cuero.",
            "Fórmula antiestática que repele el polvo y mantiene el brillo vehicular por más tiempo.",
            "PH balanceado seguro para barnices, pinturas y recubrimientos cerámicos."
        ];
        instrucciones = [
            "Asegúrese de que la superficie esté fría y a la sombra.",
            "Retire el exceso de polvo o barro con agua.",
            "Aplique el producto uniformemente utilizando una esponja o paño de microfibra.",
            "Lustre con una microfibra limpia y seca hasta obtener el brillo de fábrica."
        ];
        faqs = [
            {
                q: `¿El ${product.nombre} puede dañar la pintura o plásticos de mi vehículo?`,
                a: `No. Nuestro ${product.nombre} tiene un pH neutro y balanceado diseñado específicamente para cuidar pintura, plásticos, vinilos y cauchos sin opacarlos ni mancharlos.`
            },
            {
                q: "¿Con qué frecuencia se recomienda aplicar este producto?",
                a: "Para mantener una protección óptima contra el sol y el polvo, se recomienda aplicar cada 8 a 15 días o después de cada lavado."
            }
        ];
    } else if (cat.includes('industrial') || name.includes('desengrasante') || name.includes('bactokill')) {
        ph = name.includes('bactokill') ? "6.5 (Ligeramente ácido)" : (name.includes('hogar') || cat.includes('hogar') ? "10.5 (hogar)" : "12.0 (alcalino industrial)");
        dilucion = "Puro para suciedad extrema, o hasta 1:10 para mantenimiento general.";
        usoRecomendado = "Maquinaria pesada, pisos de talleres, cocinas industriales, campanas extractoras y desinfección hospitalaria/comercial.";
        diferenciadores = [
            "Poder desengrasante activo que emulsifica grasas pesadas, aceites e hidrocarburos al contacto.",
            "Bajo nivel de espuma para facilitar el enjuague rápido y ahorrar agua en procesos industriales.",
            "Fórmula de grado profesional homologada para industrias de alimentos, talleres y hospitales."
        ];
        instrucciones = [
            "Aplique el producto sobre la superficie con grasa o suciedad.",
            "Deje actuar de 3 a 5 minutos para que la fórmula emulsifique la grasa.",
            "Restriegue con cepillo o esponja industrial si es necesario.",
            "Enjuague con abundante agua o remueva con hidrolavadora."
        ];
        faqs = [
            {
                q: `¿Requiere el uso de equipos de protección para aplicar ${product.nombre}?`,
                a: `Debido a su alta concentración industrial, se recomienda el uso de guantes de nitrilo y gafas de seguridad durante su manipulación directa puro. Evite el contacto prolongado con la piel.`
            },
            {
                q: "¿Es apto para superficies de aluminio o metales blandos?",
                a: "Para metales blandos como el aluminio, se recomienda diluir el producto en relación 1:20 y no dejar actuar por más de 1 minuto antes de enjuagar completamente."
            }
        ];
    } else if (cat.includes('hogar') || sub.includes('detergente') || sub.includes('suavizante') || sub.includes('limpiapisos') || sub.includes('lavaloza') || name.includes('lavaloza')) {
        ph = sub.includes('suavizante') || name.includes('suavizante') ? "6.0" : ((sub.includes('lavaloza') || name.includes('lavaloza')) ? "7.0 (Neutro)" : "9.0 (Alcalino suave)");
        dilucion = sub.includes('detergente') ? "100ml por carga de lavadora de 12kg" : (sub.includes('limpiapisos') ? "50ml por balde de agua" : "Listo para usar");
        
        if (name.includes('lavaloza')) {
            usoRecomendado = "Lavado, desengrase y brillantez de vajillas, cristalería, cubiertos, ollas, sartenes y utensilios de cocina.";
            diferenciadores = [
                "Poder desengrasante activo que remueve grasa pegada sin maltratar las manos.",
                "Abundante espuma de fácil enjuague que ahorra agua y tiempo de lavado.",
                "pH neutro suave enriquecido con agentes protectores de la piel."
            ];
            instrucciones = [
                "Aplique una pequeña cantidad de Lavaloza en una esponja húmeda.",
                "Frote la vajilla, ollas o cristalería hasta generar abundante espuma desengrasante.",
                "Enjuague con agua limpia y deje secar al aire."
            ];
        } else if (name.includes('suavizante') || sub.includes('suavizante')) {
            usoRecomendado = "Cuidado, suavizado y aromatización de prendas textiles.";
        } else if (name.includes('ropa') || name.includes('detergente')) {
            usoRecomendado = "Lavado, cuidado y aromatización de ropa blanca, ropa de color, ropa negra y prendas textiles.";
        } else if (name.includes('pisos') || name.includes('limpiapisos')) {
            usoRecomendado = "Limpieza, desinfección y aromatización de pisos cerámicos, porcelanato, mármol y baldosas.";
        } else {
            usoRecomendado = "Limpieza y desinfección de superficies generales del hogar.";
        }
        instrucciones = [
            sub.includes('detergente') ? "Agregue 100ml de detergente en la gaveta de la lavadora." :
            sub.includes('limpiapisos') ? "Disuelva 50ml de limpiapisos en medio balde de agua y pase el trapeador." :
            "Aplique directo sobre una esponja húmeda, restriegue la superficie y enjuague.",
            "Disfrute de una limpieza profunda y un aroma fresco y duradero."
        ];
        faqs = [
            {
                q: `¿El ${product.nombre} es apto para hogares con mascotas?`,
                a: `Sí, una vez seco, el producto es completamente seguro para las mascotas. Su fórmula no contiene cloro libre ni fenoles corrosivos que puedan irritar sus patitas.`
            },
            {
                q: "¿Las fragancias son muy fuertes o alergénicas?",
                a: "Nuestras fragancias están dermatológicamente testeadas y dosificadas para brindar un aroma agradable y duradero sin causar irritaciones respiratorias ni alergias."
            }
        ];
    } else if (cat.includes('personal') || name.includes('jabon') || name.includes('gel') || name.includes('splash')) {
        ph = "5.5 (fisiológico de la piel)";
        dilucion = "Listo para usar";
        usoRecomendado = "Higiene y cuidado personal de manos y cuerpo.";
        diferenciadores = [
            "Enriquecido con agentes humectantes y glicerina que evitan la resequedad de la piel.",
            "Fragancia fina de calidad cosmética inspirada en perfumería premium colombiana.",
            "Libre de parabenos, formaldehídos y sulfatos agresivos."
        ];
        instrucciones = [
            "Aplique una pequeña cantidad del producto sobre las manos húmedas.",
            "Frote vigorosamente durante al menos 20 segundos cubriendo todas las áreas.",
            "Enjuague con abundante agua hasta retirar el exceso.",
            "Para splash, atomice sobre la piel a una distancia de 15cm después del baño."
        ];
        faqs = [
            {
                q: `¿El ${product.nombre} reseca las manos con el uso frecuente?`,
                a: "No. A diferencia de jabones comunes, nuestra fórmula contiene glicerina USP y agentes acondicionadores de la piel que retienen la humedad natural, manteniéndolas suaves."
            },
            {
                q: "¿Es apto para pieles sensibles o niños?",
                a: "Sí, posee un pH balanceado de 5.5 idéntico al de la piel sana y es libre de parabenos, lo que lo hace ideal para el uso diario de toda la familia."
            }
        ];
    }

    // Override with exact CSV specification from Descripciones_productos if available
    const spec = getRichSpecForProduct(product.nombre);
    if (spec) {
        if (spec.aplicaciones) {
            usoRecomendado = spec.aplicaciones;
        }
        if (spec.modoUso) {
            const parsedSteps = spec.modoUso.split(/\r?\n|\\n/).map(s => s.replace(/^•\s*/, '').trim()).filter(Boolean);
            if (parsedSteps.length > 0) instrucciones = parsedSteps;
        }
        if (spec.caracteristicas) {
            const lines = spec.caracteristicas.split(/\r?\n|\\n/);
            const phLine = lines.find(l => l.toLowerCase().includes('ph'));
            if (phLine) {
                const matchPh = phLine.match(/pH:\s*([^.\n\\]+)/i);
                if (matchPh) {
                    ph = matchPh[1].trim();
                } else {
                    ph = phLine.replace(/^•\s*/, '').replace(/^(pH:\s*)/i, '').trim();
                }
            }
        }
        if (spec.beneficios) {
            const parsedBens = spec.beneficios.split(/\r?\n|\\n/).map(s => s.replace(/^•\s*/, '').trim()).filter(Boolean);
            if (parsedBens.length >= 2) diferenciadores = parsedBens.slice(0, 4);
        }
    }

    // Merge with any faqs already present in product
    if (product.faqs && product.faqs.length > 0) {
        faqs = [...product.faqs, ...faqs.filter(f => !product.faqs.some(pf => pf.q === f.q))];
    }

    return {
        ph,
        dilucion,
        biodegradabilidad,
        usoRecomendado,
        diferenciadores,
        instrucciones,
        faqs
    };
}

/**
 * Generate FAQ Schema for product page
 */
export function generateFAQSchema(product: Product) {
    const richDetails = getRichProductDetails(product);
    const faqs = richDetails.faqs;
    if (!faqs || faqs.length === 0) return null;

    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map((faq) => ({
            "@type": "Question",
            "name": faq.q,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.a
            }
        }))
    };
}

/**
 * Generate Breadcrumb Schema
 */
export function generateBreadcrumbSchema(product: Product) {
    const slug = generateProductSlug(product.id, product.nombre);

    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Inicio",
                "item": BASE_URL
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": "Productos",
                "item": `${BASE_URL}/#catalogo`
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": product.nombre,
                "item": `${BASE_URL}/producto/${slug}`
            }
        ]
    };
}

/**
 * Get related products based on simple logic
 */
export async function getRelatedProducts(currentProductId: string, limit: number = 3): Promise<Product[]> {
    const products = await getAllProducts();
    return products
        .filter(p => p.id !== currentProductId)
        .slice(0, limit);
}

/**
 * MAPA EXPLÍCITO de soluciones por producto ID.
 * Cada entry está basado en la ficha técnica real del producto.
 * NO usar substring matching — cero falsos positivos.
 */
const PRODUCT_SOLUTIONS_MAP: Record<string, string[]> = {
  // ── KITS & COMBOS ─────────────────────────────────────────────────────────
  'kit-combo-duo-10-10-detergente-desengrasante':        ['Lavandería'],
  'kit-limpieza-completo-1-20l':                         ['Lavandería', 'Desinfección', 'Cocina'],
  'kit-combo-lavanderia-cocina':                         ['Lavandería', 'Cocina'],
  'kit-limpieza-completo-3-galones':                     ['Lavandería', 'Desinfección', 'Cocina'],
  'kit-super-limpieza-completo-biocambio360':            ['Lavandería', 'Cocina'],
  'kit-esencial-lavanderia-30-litros':                   ['Lavandería', 'Desinfección'],
  'kit-combo-detergente-20l-suavizante-galon':           ['Lavandería'],
  'kit-combo-detergente-20l-desengrasante-galon':        ['Lavandería', 'Cocina', 'Industrial'],
  'kit-combo-detergente-20l-limpiapisos-galon':          ['Lavandería', 'Pisos'],
  'kit-combo-detergente-20l-quitamanchas-galon':         ['Lavandería'],
  'kit-combo-detergente-20l-bactokill-galon':            ['Lavandería', 'Desinfección'],
  'kit-combo-detergente-20l-vinagre-galon':              ['Lavandería', 'Cocina'],
  'kit-combo-detergente-20l-desengrasante-pro':          ['Lavandería', 'Industrial', 'Cocina'],
  'kit-combo-detergente-20l-shampoo-muebles-galon':      ['Lavandería', 'Muebles y Madera'],
  'kit-combo-ahorro-pajarito-2-garrafas-10l':            ['Lavandería'],

  // ── ALCOHOL ───────────────────────────────────────────────────────────────
  'alcohol-ethanol-96':                                  ['Industrial', 'Desinfección'],
  'alcohol-glicerinado-70':                              ['Cuidado Personal', 'Desinfección'],
  'alcohol-perfumistico':                                ['Cuidado Personal', 'Industrial'],

  // ── AMBIENTADORES (Pisos/ambiente — NO muebles, NO baños) ─────────────────
  'ambientador':                                         ['Pisos'],
  'ambientador-canela':                                  ['Pisos'],
  'ambientador-chicle':                                  ['Pisos'],
  'ambientador-kiwi':                                    ['Pisos'],
  'ambientador-talco':                                   ['Pisos'],
  'ambientador-tutti-frutti':                            ['Pisos'],

  // ── BACTOKILL / BACTOKIL ─────────────────────────────────────────────────
  'bactokil':                                            ['Desinfección', 'Baños', 'Pisos', 'Cocina'],
  'bactokill':                                           ['Desinfección', 'Baños', 'Pisos', 'Cocina'],

  // ── BLANQUEADOR ───────────────────────────────────────────────────────────
  'blanqueador':                                         ['Lavandería', 'Desinfección', 'Baños'],

  // ── CERAS ─────────────────────────────────────────────────────────────────
  'cera-autobrillante':                                  ['Pisos'],
  'cera-autobrillante-roja':                             ['Pisos'],

  // ── DESENGRASANTES ────────────────────────────────────────────────────────
  'desengrasante':                                       ['Cocina'],
  'desengrasante-industrial':                            ['Industrial', 'Automotriz', 'Cocina'],

  // ── DESINCRUSTANTE ────────────────────────────────────────────────────────
  'desincrustante':                                      ['Baños', 'Industrial'],

  // ── DESINFECTANTE BICARBONATO ─────────────────────────────────────────────
  'desinfectante-bicarbonato':                           ['Desinfección', 'Cocina', 'Baños'],

  // ── DESTAPACAÑERÍAS ───────────────────────────────────────────────────────
  'destapacanerias-1-kg':                                ['Baños', 'Cocina'],
  'destapacanerias-250gr':                               ['Baños', 'Cocina'],

  // ── DETERGENTES ───────────────────────────────────────────────────────────
  'detergente-liquido-multiusos':                        ['Lavandería'],
  'detergente-liquido-industrial-heavy-duty':            ['Lavandería', 'Industrial'],
  'detergente-ropa-negra-oscura':                        ['Lavandería'],

  // ── ELIMINADOR DE OLORES ──────────────────────────────────────────────────
  'eliminador-de-olores':                                ['Pisos', 'Baños'],
  'eliminador-de-olores-limon':                          ['Pisos', 'Baños'],
  'eliminador-olores-limon':                             ['Pisos', 'Baños'],

  // ── GEL ANTIBACTERIAL ────────────────────────────────────────────────────
  'gel-antibacterial-70':                                ['Cuidado Personal', 'Desinfección'],

  // ── JABONES DE MANOS (solo Cuidado Personal — no Cocina ni Baños) ─────────
  'jabon-de-manos':                                      ['Cuidado Personal'],
  'jabon-de-manos-20-l-avena':                           ['Cuidado Personal'],
  'jabon-de-manos-300ml':                                ['Cuidado Personal'],
  'jabon-de-manos-500ml':                                ['Cuidado Personal'],
  'jabon-de-manos-durazno':                              ['Cuidado Personal'],
  'jabon-de-manos-fresa':                                ['Cuidado Personal'],
  'jabon-de-manos-kiwi':                                 ['Cuidado Personal'],
  'jabon-de-manos-manzana-verde':                        ['Cuidado Personal'],
  'jabon-de-manos-neutro':                               ['Cuidado Personal'],
  'jabon-manos-antibacterial':                           ['Cuidado Personal', 'Desinfección'],

  // ── LAVALOZA ──────────────────────────────────────────────────────────────
  'lavaloza-liquido':                                    ['Cocina'],

  // ── LIMPIAJUNTAS ──────────────────────────────────────────────────────────
  'limpiajuntas':                                        ['Pisos', 'Baños'],

  // ── LIMPIAPISOS (solo Pisos — no Desinfección) ───────────────────────────
  'limpiapisos':                                         ['Pisos'],
  'limpiapisos-brisa-marina':                            ['Pisos'],
  'limpiapisos-canela':                                  ['Pisos'],
  'limpiapisos-citronela':                               ['Pisos'],
  'limpiapisos-citronella':                              ['Pisos'],
  'limpiapisos-frutos-rojos':                            ['Pisos'],
  'limpiapisos-lavanda':                                 ['Pisos'],
  'limpiapisos-pino':                                    ['Pisos'],
  'limpiapisos-talco':                                   ['Pisos'],
  'limpiapisos-vainilla':                                ['Pisos'],

  // ── LIMPIAVIDRIOS (solo Vidrios — no Pisos ni Automotriz) ─────────────────
  'limpiavidrios':                                       ['Vidrios y Ventanas'],
  'limpiavidrios-concentrado':                           ['Vidrios y Ventanas'],

  // ── LUSTRALLANTAS ─────────────────────────────────────────────────────────
  'lustrallantas-para-autos':                            ['Automotriz'],
  'lustrallantas-para-motos':                            ['Automotriz'],
  'lustrallantas-protector-cauchos':                     ['Automotriz'],

  // ── MANTEQUILLAS CORPORALES ──────────────────────────────────────────────
  'mantequilla-corporal-cafettal':                       ['Cuidado Personal'],
  'mantequilla-corporal-churumbelos':                    ['Cuidado Personal'],
  'mantequilla-corporal-fiesta-caribe':                  ['Cuidado Personal'],
  'mantequilla-corporal-mistery-gorgona':                ['Cuidado Personal'],
  'mantequilla-corporal-nieve-del-cocuy':                ['Cuidado Personal'],

  // ── OXÍGENO ACTIVO ────────────────────────────────────────────────────────
  'oxigeno-activo-desinfectante':                        ['Lavandería', 'Desinfección'],

  // ── PASTILLAS DE CLORO ───────────────────────────────────────────────────
  'pastillas-de-cloro-48-unidades':                      ['Desinfección', 'Baños'],
  'pastillas-de-cloro-8-unidades':                       ['Desinfección', 'Baños'],

  // ── PERFUMES PARA AUTO ────────────────────────────────────────────────────
  'perfume-autos-breeze-110-ml':                         ['Automotriz'],
  'perfume-autos-citrufresh-110-ml':                     ['Automotriz'],
  'perfume-autos-festivo-drive-110-ml':                  ['Automotriz'],
  'perfume-autos-tropico-110-ml':                        ['Automotriz'],

  // ── QUITA ÓXIDO (industrial — no baños domésticos) ───────────────────────
  'quita-oxido':                                         ['Industrial'],
  'quita-oxido-15-l':                                    ['Industrial'],
  'quita-oxido-60-ml':                                   ['Industrial'],

  // ── QUITAMANCHAS (solo Lavandería — no Muebles) ──────────────────────────
  'quitamanchas-ropa-color':                             ['Lavandería'],
  'quitamanchas-ropa-color-500ml':                       ['Lavandería'],

  // ── REMOVEDOR DE CERAS ────────────────────────────────────────────────────
  'removedor-de-ceras':                                  ['Pisos', 'Industrial'],

  // ── SELLADORES ────────────────────────────────────────────────────────────
  'sellador-polimerico':                                 ['Pisos'],
  'sellador-polimerico-20-l-amarillo':                   ['Pisos'],
  'sellador-polimerico-galon-4l-amarillo':               ['Pisos'],
  'sellador-polimerico-rojo':                            ['Pisos'],

  // ── SHAMPOO AUTOMOTRIZ ────────────────────────────────────────────────────
  'shampoo-autos':                                       ['Automotriz'],
  'shampoo-motos':                                       ['Automotriz'],
  'shampoo-para-motos':                                  ['Automotriz'],
  'shampoo-autos-motos':                                 ['Automotriz'],

  // ── SHAMPOO MUEBLES ───────────────────────────────────────────────────────
  'shampoo-muebles':                                     ['Muebles y Madera'],
  'shampoo-muebles-500ml':                               ['Muebles y Madera'],
  'shampoo-muebles-tapiceria':                           ['Muebles y Madera'],

  // ── SILICONA AUTOMOTRIZ ───────────────────────────────────────────────────
  'silicona-autos':                                      ['Automotriz'],
  'silicona-para-autos':                                 ['Automotriz'],
  'silicona-para-motos':                                 ['Automotriz'],

  // ── SILICONA MUEBLES/AUTOS (híbrido) ─────────────────────────────────────
  'silicona-muebles-autos':                              ['Muebles y Madera', 'Automotriz'],

  // ── SILICONA LUSTRAMUEBLES ────────────────────────────────────────────────
  'silicona-lustramuebles':                              ['Muebles y Madera'],
  'silicona-lustramuebles-500ml':                        ['Muebles y Madera'],

  // ── SPLASH CORPORALES ─────────────────────────────────────────────────────
  'splash-cuerpo-aura-salvaje':                          ['Cuidado Personal'],
  'splash-cuerpo-cafettal':                              ['Cuidado Personal'],
  'splash-cuerpo-churumbelos':                           ['Cuidado Personal'],
  'splash-cuerpo-fiesta-caribe':                         ['Cuidado Personal'],
  'splash-cuerpo-macarena':                              ['Cuidado Personal'],
  'splash-cuerpo-mysterium-gorgona':                     ['Cuidado Personal'],
  'splash-cuerpo-nieve-del-cocuy':                       ['Cuidado Personal'],
  'splash-cuerpo-orinoco-flow':                          ['Cuidado Personal'],
  'splash-cuerpo-rey-andino':                            ['Cuidado Personal'],
  'splash-cuerpo-tesoro-tayrona':                        ['Cuidado Personal'],

  // ── SUAVIZANTES ───────────────────────────────────────────────────────────
  'suavizante':                                          ['Lavandería'],
  'suavizante-manzan-verde':                             ['Lavandería'],
  'suavizante-motas-de-algodon':                         ['Lavandería'],
  'suavizante-sueno-lavanda':                            ['Lavandería'],

  // ── VINAGRE INDUSTRIAL ────────────────────────────────────────────────────
  'vinagre-industrial':                                  ['Cocina', 'Lavandería', 'Industrial'],
};

/**
 * Segmentos explícitos por categoría de producto.
 * Determina en qué perfil de comprador encaja mejor el producto.
 */
const PRODUCT_SEGMENTS_MAP: Record<string, string[]> = {
  // HOGAR — productos de uso cotidiano doméstico
  'lavaloza-liquido':              ['Hogar', 'Restaurante'],
  'limpiapisos':                   ['Hogar', 'Airbnb'],
  'limpiapisos-brisa-marina':      ['Hogar', 'Airbnb'],
  'limpiapisos-canela':            ['Hogar', 'Airbnb'],
  'limpiapisos-citronela':         ['Hogar', 'Airbnb'],
  'limpiapisos-citronella':        ['Hogar', 'Airbnb'],
  'limpiapisos-frutos-rojos':      ['Hogar', 'Airbnb'],
  'limpiapisos-lavanda':           ['Hogar', 'Airbnb'],
  'limpiapisos-pino':              ['Hogar', 'Airbnb'],
  'limpiapisos-talco':             ['Hogar', 'Airbnb'],
  'limpiapisos-vainilla':          ['Hogar', 'Airbnb'],
  'suavizante':                    ['Hogar'],
  'suavizante-manzan-verde':       ['Hogar'],
  'suavizante-motas-de-algodon':   ['Hogar'],
  'suavizante-sueno-lavanda':      ['Hogar'],
  'detergente-liquido-multiusos':  ['Hogar'],
  'detergente-ropa-negra-oscura':  ['Hogar'],
  'blanqueador':                   ['Hogar', 'Airbnb'],
  'ambientador':                   ['Hogar', 'Airbnb', 'Oficina'],
  'ambientador-canela':            ['Hogar', 'Airbnb', 'Oficina'],
  'ambientador-chicle':            ['Hogar', 'Airbnb', 'Oficina'],
  'ambientador-kiwi':              ['Hogar', 'Airbnb', 'Oficina'],
  'ambientador-talco':             ['Hogar', 'Airbnb', 'Oficina'],
  'ambientador-tutti-frutti':      ['Hogar', 'Airbnb', 'Oficina'],
  'eliminador-de-olores':          ['Hogar', 'Airbnb'],
  'eliminador-de-olores-limon':    ['Hogar', 'Airbnb'],
  'eliminador-olores-limon':       ['Hogar', 'Airbnb'],
  'cera-autobrillante':            ['Hogar'],
  'cera-autobrillante-roja':       ['Hogar'],
  'sellador-polimerico':           ['Hogar'],
  'sellador-polimerico-20-l-amarillo':    ['Hogar'],
  'sellador-polimerico-galon-4l-amarillo': ['Hogar'],
  'sellador-polimerico-rojo':      ['Hogar'],
  'removedor-de-ceras':            ['Hogar'],
  'limpiajuntas':                  ['Hogar'],
  'destapacanerias-1-kg':          ['Hogar', 'Restaurante'],
  'destapacanerias-250gr':         ['Hogar', 'Restaurante'],
  // HIGIENE PERSONAL
  'jabon-de-manos':                ['Hogar', 'Airbnb', 'Oficina'],
  'jabon-de-manos-20-l-avena':     ['Hogar', 'Airbnb', 'Oficina'],
  'jabon-de-manos-300ml':          ['Hogar', 'Airbnb', 'Oficina'],
  'jabon-de-manos-500ml':          ['Hogar', 'Airbnb', 'Oficina'],
  'jabon-de-manos-durazno':        ['Hogar', 'Airbnb', 'Oficina'],
  'jabon-de-manos-fresa':          ['Hogar', 'Airbnb', 'Oficina'],
  'jabon-de-manos-kiwi':           ['Hogar', 'Airbnb', 'Oficina'],
  'jabon-de-manos-manzana-verde':  ['Hogar', 'Airbnb', 'Oficina'],
  'jabon-de-manos-neutro':         ['Hogar', 'Airbnb', 'Oficina'],
  'jabon-manos-antibacterial':     ['Hogar', 'Airbnb', 'Oficina', 'Restaurante'],
  'gel-antibacterial-70':          ['Hogar', 'Airbnb', 'Oficina', 'Restaurante'],
  'alcohol-glicerinado-70':        ['Hogar', 'Oficina'],
  'alcohol-perfumistico':          ['Hogar'],
  'mantequilla-corporal-cafettal':          ['Hogar'],
  'mantequilla-corporal-churumbelos':       ['Hogar'],
  'mantequilla-corporal-fiesta-caribe':     ['Hogar'],
  'mantequilla-corporal-mistery-gorgona':   ['Hogar'],
  'mantequilla-corporal-nieve-del-cocuy':   ['Hogar'],
  'splash-cuerpo-aura-salvaje':    ['Hogar'],
  'splash-cuerpo-cafettal':        ['Hogar'],
  'splash-cuerpo-churumbelos':     ['Hogar'],
  'splash-cuerpo-fiesta-caribe':   ['Hogar'],
  'splash-cuerpo-macarena':        ['Hogar'],
  'splash-cuerpo-mysterium-gorgona': ['Hogar'],
  'splash-cuerpo-nieve-del-cocuy': ['Hogar'],
  'splash-cuerpo-orinoco-flow':    ['Hogar'],
  'splash-cuerpo-rey-andino':      ['Hogar'],
  'splash-cuerpo-tesoro-tayrona':  ['Hogar'],
  // BACTOKILL — Hogar, Airbnb, Restaurante, Oficina
  'bactokil':  ['Hogar', 'Airbnb', 'Restaurante', 'Oficina'],
  'bactokill': ['Hogar', 'Airbnb', 'Restaurante', 'Oficina'],
  // DESINFECTANTES
  'desinfectante-bicarbonato':     ['Hogar', 'Airbnb'],
  'pastillas-de-cloro-48-unidades': ['Hogar', 'Airbnb'],
  'pastillas-de-cloro-8-unidades':  ['Hogar'],
  'oxigeno-activo-desinfectante':  ['Hogar', 'Airbnb'],
  // ALCOHOL INDUSTRIAL
  'alcohol-ethanol-96':            ['Restaurante', 'Oficina'],
  // AUTOMOTRIZ
  'shampoo-autos':                 ['Automotriz'],
  'shampoo-motos':                 ['Automotriz'],
  'shampoo-para-motos':            ['Automotriz'],
  'shampoo-autos-motos':           ['Automotriz'],
  'lustrallantas-para-autos':      ['Automotriz'],
  'lustrallantas-para-motos':      ['Automotriz'],
  'lustrallantas-protector-cauchos': ['Automotriz'],
  'silicona-autos':                ['Automotriz'],
  'silicona-para-autos':           ['Automotriz'],
  'silicona-para-motos':           ['Automotriz'],
  'silicona-muebles-autos':        ['Automotriz', 'Hogar'],
  'silicona-lustramuebles':        ['Hogar'],
  'silicona-lustramuebles-500ml':  ['Hogar'],
  'shampoo-muebles':               ['Hogar'],
  'shampoo-muebles-500ml':         ['Hogar'],
  'shampoo-muebles-tapiceria':     ['Hogar', 'Airbnb'],
  'perfume-autos-breeze-110-ml':   ['Automotriz'],
  'perfume-autos-citrufresh-110-ml': ['Automotriz'],
  'perfume-autos-festivo-drive-110-ml': ['Automotriz'],
  'perfume-autos-tropico-110-ml':  ['Automotriz'],
  // INDUSTRIAL / ESPECIALIDADES
  'vinagre-industrial':            ['Restaurante', 'Hogar'],
  'quita-oxido':                   ['Hogar'],
  'quita-oxido-15-l':              ['Hogar'],
  'quita-oxido-60-ml':             ['Hogar'],
  'desincrustante':                ['Hogar'],
  'limpiavidrios':                 ['Hogar', 'Automotriz'],
  'limpiavidrios-concentrado':     ['Hogar', 'Automotriz'],
  'detergente-liquido-industrial-heavy-duty': ['Restaurante', 'Oficina'],
  'quitamanchas-ropa-color':       ['Hogar'],
  'quitamanchas-ropa-color-500ml': ['Hogar'],
};

/**
 * Get product affinities using explicit maps — zero substring matching, zero false positives.
 */
export function getProductAffinities(p: Product) {
    const id = p.id;
    const cat = (p.categoria || '').toLowerCase();

    // Lookup in explicit solutions map
    const solutions: string[] = PRODUCT_SOLUTIONS_MAP[id] ?? [];

    // Lookup in explicit segments map
    let segments: string[] = PRODUCT_SEGMENTS_MAP[id] ?? [];

    // Fallback segment by category if not in map
    if (segments.length === 0) {
        if (cat.includes('automotriz')) segments = ['Automotriz'];
        else if (cat.includes('personal') || cat.includes('higiene')) segments = ['Hogar'];
        else if (cat.includes('industrial')) segments = ['Restaurante'];
        else segments = ['Hogar'];
    }

    return { solutions, segments };
}




export interface SchwartzCopy {
    problema: string;
    solucion: string;
    producto: string;
    transaccion: string;
    citableQuote: string;
}

export function getSchwartzCopy(product: Product): SchwartzCopy {
    const name = product.nombre;
    const nameLower = name.toLowerCase();
    const cat = (product.categoria || '').toLowerCase();
    const sub = (product.subcategoria || '').toLowerCase();

    // Generic default fallback (safe for any product, NO laundry text)
    let problema = `La acumulación de suciedad y contaminantes en espacios residenciales y comerciales requiere soluciones de limpieza eficientes, concentradas y confiables.`;
    let solucion = `Utilizar productos de grado profesional biodegradables que optimicen los procesos de aseo, garantizando alto rendimiento y reduciendo el costo por aplicación.`;
    let producto = `El ${name} de Biocambio360 está formulado con ingredientes activos de alta pureza que aseguran resultados superiores y máxima durabilidad.`;
    let transaccion = `Compra directamente al fabricante Biocambio360 en Soacha, con distribución express en Bogotá y toda la Sabana. Ideal para hogares y empresas.`;
    let citableQuote = `El ${name} de Biocambio360 es una solución de limpieza biodegradable fabricada en Soacha, Cundinamarca, formulada para un rendimiento eficiente.`;

    // 0a. Cuidado Personal / Cosmética Corporal (Mantequillas, Splashes, Jabones)
    if (cat.includes('personal') || sub.includes('splash') || nameLower.includes('mantequilla') || nameLower.includes('splash')) {
        if (nameLower.includes('mantequilla')) {
            problema = `La resequedad constante y la pérdida de elasticidad en la piel causadas por factores ambientales requieren una hidratación profunda y nutritiva.`;
            solucion = `Utilizar mantequillas corporales ultra-nutritivas ricas en emolientes naturales que restauren la barrera cutánea y aporten suavidad.`;
            producto = `La ${name} de Biocambio360 combina mantecas y aceites humectantes que nutren la piel en profundidad, dejándola tersa y delicadamente perfumada.`;
            transaccion = `Adquiérela directamente del fabricante Biocambio360 con envío a Bogotá y toda Colombia. Cuidado cosmético superior para tu piel.`;
            citableQuote = `La ${name} de Biocambio360 es una fórmula cosmética ultra-nutritiva diseñada para la hidratación profunda y el cuidado continuo de la piel.`;
        } else if (nameLower.includes('splash')) {
            problema = `La necesidad de mantener una sensación de frescura e iluminación aromática durante el día sin recargar la piel ni usar perfumes pesados.`;
            solucion = `Utilizar lociones corporales en splash de fórmula ligera que perfumen delicadamente y refresquen la piel en cualquier momento.`;
            producto = `El ${name} de Biocambio360 brinda una fragancia fina de alta fijación cosmética y una sensación refrescante e hidratante instantánea.`;
            transaccion = `Compra directamente al fabricante Biocambio360 con despacho rápido a todo el país. Ideal para refrescar tu piel a diario.`;
            citableQuote = `El ${name} de Biocambio360 es una loción corporal perfumada de uso diario formulada para refrescar e hidratar la piel con fragancias exclusivas.`;
        } else {
            problema = `La higiene diaria de la piel exige limpiadores suaves que remuevan impurezas sin alterar el pH fisiológico ni causar resequedad.`;
            solucion = `Emplear jabones y limpiadores corporales dermatológicamente balanceados enriquecidos con glicerina y humectantes.`;
            producto = `El ${name} de Biocambio360 limpia delicadamente las manos y el cuerpo, manteniendo la hidratación natural de la piel.`;
            transaccion = `Suministro directo desde la fábrica Biocambio360 en Soacha hacia Bogotá y Cundinamarca para el hogar y la empresa.`;
            citableQuote = `El ${name} de Biocambio360 es un limpiador corporal de pH fisiológico balanceado 5.5 con glicerina humectante.`;
        }
    }
    // 0b. Muebles y Tapicería
    else if (nameLower.includes('muebles') || nameLower.includes('lustramuebles') || sub.includes('muebles') || sub.includes('tapiceria')) {
        problema = `Los muebles de madera, cuero, vinilo y tapicería acumulan polvo, manchas y grasa corporal, perdiendo su brillo original y deteriorándose con el tiempo.`;
        solucion = `Utilizar formulaciones especializadas para tapicería y madera que remuevan la suciedad incrustada y restauren la capa protectora sin dañar los materiales.`;
        producto = `El ${name} de Biocambio360 limpia, nutre y renueva muebles y tapizados, dejando un acabado reluciente y una barrera protectora contra el polvo.`;
        transaccion = `Compra directo a precio de fábrica en Soacha con envío rápido a Bogotá y Cundinamarca. Venta individual y al por mayor.`;
        citableQuote = `El ${name} de Biocambio360 es un producto especializado para la limpieza, nutrición y protección de muebles, tapicería y madera.`;
    }
    // 1. Alcohol Glicerinado / Antisépticos
    else if (nameLower.includes('alcohol') || sub.includes('alcohol')) {
        problema = `La necesidad de antisepsia y desinfección continua en manos y superficies delicadas exige soluciones eficientes que eliminen microorganismos sin irritar la piel ni dejar residuos pegajosos.`;
        solucion = `Utilizar soluciones antisépticas formuladas al 70% de alcohol etílico de grado farmacológico adicionadas con glicerina humectante que hidraten la piel mientras desinfectan.`;
        producto = `El ${name} de Biocambio360 elimina el 99.9% de gérmenes y bacterias al contacto, evaporándose rápidamente sin necesidad de enjuague ni dejar películas grasas.`;
        transaccion = `Adquiérelo directo del fabricante en Soacha con envío prioritario en Bogotá y Cundinamarca para hogares, consultorios y establecimientos comerciales.`;
        citableQuote = `El ${name} de Biocambio360 es una solución antiséptica formulada con 70% de alcohol etílico y glicerina USP para la protección higiénica de manos y superficies.`;
    }
    // 2. Bactokill (Desinfección & Bioseguridad)
    else if (nameLower.includes('bactokill') || nameLower.includes('bactokil')) {
        problema = `La presencia de bacterias, virus, hongos y malos olores en superficies residenciales, comerciales e institucionales demanda una desinfección de amplio espectro continua y segura.`;
        solucion = `Emplear un desinfectante de grado profesional con alto poder germicida que elimine microorganismos patógenos y neutralice olores directamente en su fuente.`;
        producto = `El ${name} de Biocambio360 es un agente desinfectante activo concentrado formulado para la sanitización profunda de pisos, baños, cocinas y áreas de alto tráfico.`;
        transaccion = `Compra directo a precio de fábrica en Soacha con despacho rápido a Bogotá y la Sabana Norte. Fichas técnicas completas para protocolos de bioseguridad.`;
        citableQuote = `El ${name} de Biocambio360 es un desinfectante concentrado de amplio espectro fabricado en Soacha para mantener ambientes limpios y bioseguros.`;
    }
    // 3. Blanqueador - Desinfectante (Hipoclorito)
    else if (nameLower.includes('blanqueador')) {
        problema = `La desinfección exigente de áreas críticas y el blanqueo eficaz de ropa blanca requieren soluciones cloradas concentradas con estabilizadores que actúen de manera rápida y sostenida.`;
        solucion = `Utilizar hipoclorito de sodio estabilizado de alta concentración que elimine bacterias, hongos y mohos en superficies y recupere el blanco radiante en prendas textiles blancas.`;
        producto = `El ${name} de Biocambio360 combina acción desinfectante clorada con poder blanqueador de textiles blancos, rindiendo hasta 3 veces más que productos diluidos comerciales.`;
        transaccion = `Despacho directo de fábrica en Soacha hacia Bogotá y Cundinamarca. Venta al detal y al por mayor con facturación electrónica.`;
        citableQuote = `El ${name} de Biocambio360 es una solución clorada desinfectante y blanqueadora formulada para la bioseguridad de superficies lavables y el cuidado de ropa blanca.`;
    }
    // 4. Ceras Autobrillantes (Pisos)
    else if (nameLower.includes('cera') && !nameLower.includes('removedor')) {
        problema = `El tráfico peatonal constante desgasta el acabado de pisos cerámicos, baldosas y mármol, haciendo que pierdan brillo, absorban mugre y luzcan opacos y rayados.`;
        solucion = `Aplicar emulsiones autobrillantes con polímeros protectores que creen una película antideslizante, transparente y autorregenerativa sin necesidad de usar polichadora.`;
        producto = `La ${name} de Biocambio360 brinda un brillo espejo duradero que protege la superficie contra rayones y simplifica el mantenimiento diario con trapeador.`;
        transaccion = `Suministro directo desde la planta en Soacha para hogares, colegios, centros comerciales y empresas de servicios generales en Bogotá.`;
        citableQuote = `La ${name} de Biocambio360 es una emulsión autobrillante polimérica diseñada para el embellecimiento y protección de pisos en áreas de tráfico frecuente.`;
    }
    // 5. Selladores Poliméricos (Pisos)
    else if (nameLower.includes('sellador')) {
        problema = `La porosidad en pisos de granito, terrazo, mármol y concreto absorbe líquidos, aceites y suciedad profunda, acelerando su deterioro y complicando las labores de limpieza.`;
        solucion = `Sellar los poros de la superficie con un recubrimiento polimérico termoplástico de alta dureza que impermeabilice y prevenga la fijación de manchas.`;
        producto = `El ${name} de Biocambio360 crea una capa base protectora de excelente adherencia y resistencia al tráfico pesado, preparando el piso para el acabado final.`;
        transaccion = `Envíos directos desde fábrica en Soacha para proyectos de mantenimiento de pisos e instalaciones industriales en Cundinamarca.`;
        citableQuote = `El ${name} de Biocambio360 es un sellador termoplástico de porosidad formulado para impermeabilizar y proteger superficies duras de alto tráfico.`;
    }
    // 6. Limpiapisos Aromáticos (Brisa Marina, Lavanda, Canela, etc.)
    else if (nameLower.includes('limpiapisos') || (nameLower.includes('pisos') && !nameLower.includes('cera') && !nameLower.includes('sellador'))) {
        problema = `La suciedad diaria en pisos cerámicos y baldosas requiere un limpiador que remueva la mugre sin dejar vetas ni vetillas opacas, dejando un ambiente perfumado por horas.`;
        solucion = `Emplear limpiapisos concentrados con tensoactivos neutros de fácil enjuague y fragancias intensas de larga fijación que remuevan la mugre y perfumen el espacio.`;
        producto = `El ${name} de Biocambio360 limpia profundamente y aromatiza todo tipo de pisos lavables sin dañar las juntas ni dejar residuos pegajosos.`;
        transaccion = `Venta directa de fábrica en Soacha con entregas en Bogotá y municipios de la Sabana. Presentaciones desde Galón hasta 20 Litros.`;
        citableQuote = `El ${name} de Biocambio360 es un limpiador concentrado y perfumado diseñado para la higiene diaria y la ambientación de pisos y baldosas.`;
    }
    // 7. Desengrasantes (General & Industrial)
    else if (nameLower.includes('desengrasante') && !nameLower.includes('textil')) {
        problema = `La grasa acumulada, aceites quemados e hidrocarburos en estufas, campanas, mesones, talleres y maquinaria son difíciles de remover y requieren excesivo esfuerzo físico.`;
        solucion = `Utilizar desengrasantes alcalinos concentrados con tensoactivos de alta potencia que emulsifiquen y liquiden la grasa al contacto para retirarla fácilmente.`;
        producto = `El ${name} de Biocambio360 remueve capas pesadas de grasa e hidrocarburos en cocinas comerciales e industrias, reduciendo tiempos de limpieza y consumo de agua.`;
        transaccion = `Despacho inmediato directo de fábrica en Soacha con cobertura en Bogotá y municipios aledaños. Fichas técnicas y hojas de seguridad disponibles.`;
        citableQuote = `El ${name} de Biocambio360 es un desengrasante alcalino concentrado formulado para disolver grasas pesadas y aceites en superficies industriales y comerciales.`;
    }
    // 8. Desengrasante Textil
    else if (nameLower.includes('textil') || sub.includes('textil')) {
        problema = `Las manchas de grasa, aceites y roces en cuellos, puños y prendas de vestir son difíciles de eliminar con detergente común, desgastando la tela al restregar.`;
        solucion = `Utilizar un desengrasante especializado para textiles con tensoactivos activos que emulsifiquen grasas sin decolorar ni debilitar las fibras del tejido.`;
        producto = `El ${name} de Biocambio360 disuelve manchas difíciles de grasa en ropa y mantelería, preservando la textura y solidez del color.`;
        transaccion = `Pide directo a fábrica en Soacha con distribución rápida en Bogotá. Disponible en presentaciones desde Galón hasta 20 Litros.`;
        citableQuote = `El ${name} de Biocambio360 es un desmanchador y desengrasante textil biodegradable diseñado para disolver aceites en telas sin dañar la prenda.`;
    }
    // 9. Lavaloza Líquido
    else if (sub.includes('lavaloza') || nameLower.includes('loza') || nameLower.includes('lavaloza')) {
        problema = `La grasa persistente en vajillas y ollas incrementa el consumo de agua y el tiempo de lavado. Los jabones tradicionales diluidos se agotan velozmente.`;
        solucion = `Emplear un lavaloza líquido concentrado que emulsifique grasas al contacto con una pequeña dosificación y sea suave con la piel de las manos.`;
        producto = `El ${name} de Biocambio360 combina alto poder cortagrasa con pH neutro enriquecido con glicerina, rindiendo más lavadas por litro.`;
        transaccion = `Consigue presentaciones industriales directo de fábrica en Soacha con envío en Bogotá. Ideal para restaurantes y hogares de alto consumo.`;
        citableQuote = `El jabón lavaloza ${name} de Biocambio360 es un detergente concentrado biodegradable y dermatológicamente seguro para vajillas y utensilios.`;
    }
    // 10. Automotive (Lustrallantas, Shampoo Autos, Siliconas Vehiculares)
    else if (cat.includes('automotriz') || (nameLower.includes('auto') && !nameLower.includes('autobrillante')) || nameLower.includes('llanta') || (nameLower.includes('silicona') && !nameLower.includes('lustramuebles'))) {
        problema = `El sol, el polvo de las vías y el lavado con jabones agresivos resecan y decoloran la carrocería, plásticos, cauchos y llantas de los vehículos.`;
        solucion = `Aplicar limpiadores y siliconas con filtro UV y pH neutro que remuevan la suciedad y repelan el polvo sin opacar las pinturas ni resecar los cauchos.`;
        producto = `El ${name} de Biocambio360 ofrece una barrera protectora antiestática con acabado renovado y brillante para partes de caucho, vinilo y pintura vehicular.`;
        transaccion = `Adquiere tu línea de cuidado vehicular directamente de fábrica en Soacha, con envío rápido en Bogotá para particulares, autolavados y flotas.`;
        citableQuote = `El ${name} automotriz de Biocambio360 es una fórmula con protección UV activa desarrollada en Cundinamarca para el cuidado de vehículos.`;
    }
    // 11. Kits & Combos
    else if (cat.includes('kit') || cat.includes('combo') || nameLower.includes('combo') || nameLower.includes('kit')) {
        if (nameLower.includes('ropa') || nameLower.includes('detergente') || nameLower.includes('suavizante') || nameLower.includes('lavanderia')) {
            problema = `El lavado constante de ropa en volumen requiere detergente activo de alto rendimiento y un suavizante que fije el aroma entre lavados.`;
            solucion = `Unificar en un solo kit el poder del detergente concentrado con bicarbonato y la suavidad del suavizante con microcápsulas de aroma prolongado.`;
            producto = `El ${name} de Biocambio360 combina los productos ideales para dejar la ropa limpia, suave y perfumada al mejor costo por lavada.`;
            transaccion = `Adquiere tu combo directamente del fabricante en Soacha con envío prioritario en Bogotá y la Sabana.`;
            citableQuote = `El ${name} de Biocambio360 es un kit dual de lavandería biodegradable que limpia en profundidad y acondiciona las fibras textiles.`;
        } else if (nameLower.includes('cocina') || nameLower.includes('loza')) {
            problema = `La acumulación de grasa en vajillas y utensilios en hogares y restaurantes eleva los costos de aseo y consumo de agua.`;
            solucion = `Integrar lavaloza líquido concentrado con desengrasantes y desinfectantes para asegurar higiene total en la cocina.`;
            producto = `El ${name} de Biocambio360 reúne los insumos indispensables para eliminar grasa incrustada y desinfectar áreas de cocina.`;
            transaccion = `Despacho directo de fábrica en Soacha hacia Bogotá y municipios aledaños. Precios especiales por volumen.`;
            citableQuote = `El ${name} de Biocambio360 es un kit integral de higiene para cocina formulado con pH neutro y tensoactivos biodegradables.`;
        }
    }
    // 12. Laundry Detergents & Fabric Care (Ropa Blanca, Color, Negra, Suavizantes)
    else if (cat.includes('lavanderia') || sub.includes('detergente') || nameLower.includes('ropa') || nameLower.includes('detergente') || nameLower.includes('suavizante')) {
        problema = `El lavado frecuente de prendas textiles puede decolorar las telas o dejarlas rígidas si se utilizan detergentes comerciales diluidos de baja concentración.`;
        solucion = `Utilizar detergentes líquidos concentrados con tensoactivos biodegradables y bicarbonato que remuevan manchas protegiendo los colores y las fibras.`;
        producto = `El ${name} de Biocambio360 limpia profundamente las prendas textiles, cuidando los colores y dejando un aroma fresco sin residuos de polvo.`;
        transaccion = `Compra directamente al fabricante Biocambio360 en Soacha, con distribución express en Bogotá y toda la Sabana.`;
        citableQuote = `El ${name} de Biocambio360 es un detergente líquido biodegradable fabricado en Colombia para el cuidado y lavado eficiente de ropa.`;
    }

    return { problema, solucion, producto, transaccion, citableQuote };
}

// Volume values for calculating physical distance between presentations
const SIZE_VOLUMES: Record<string, number> = {
    '250ML': 0.25,
    '250 ML': 0.25,
    '500ML': 0.5,
    '500 ML': 0.5,
    '810ML': 0.81,
    '810 ML': 0.81,
    '1L': 1.0,
    '1 L': 1.0,
    '1/2G': 1.9,
    '½ Gal': 1.9,
    '1/2 Gal': 1.9,
    '1.9L': 1.9,
    '1Gal': 3.8,
    '1 Gal': 3.8,
    '3.8L': 3.8,
    '10L': 10.0,
    '10 L': 10.0,
    '20L': 20.0,
    '20 L': 20.0,
    'DEFAULT': 3.8
};

/**
 * Resolves the image filename for a product at a specific size.
 * If there is no specific image for the selected size, it calculates the volume
 * distance to all configured sizes and returns the image filename of the closest size.
 */
export function getProductImage(product: Product, selectedSize: string): string {
    const size = selectedSize || 'DEFAULT';
    
    // 1. If product has custom size images mapped
    if (product.imgFiles && Object.keys(product.imgFiles).length > 0) {
        // 1.1 Direct match
        if (product.imgFiles[size]) {
            return product.imgFiles[size];
        }
        
        // 1.2 Find closest size by volume
        const targetVolume = SIZE_VOLUMES[size.toUpperCase()] !== undefined 
            ? SIZE_VOLUMES[size.toUpperCase()] 
            : (parseFloat(size) || 3.8);
            
        let closestSize = '';
        let minDiff = Infinity;
        
        for (const [sizeKey, imgFilename] of Object.entries(product.imgFiles)) {
            if (!imgFilename || imgFilename === 'placeholder.png') continue;
            const sizeKeyUpper = sizeKey.toUpperCase();
            const sizeVolume = SIZE_VOLUMES[sizeKeyUpper] !== undefined
                ? SIZE_VOLUMES[sizeKeyUpper]
                : (parseFloat(sizeKey) || 3.8);
                
            const diff = Math.abs(sizeVolume - targetVolume);
            if (diff < minDiff) {
                minDiff = diff;
                closestSize = sizeKey;
            }
        }
        
        if (closestSize && product.imgFiles[closestSize]) {
            return product.imgFiles[closestSize];
        }
    }
    
    // 2. Legacy fallback
    if (size === '3.8L' && product.imgFileSmall) {
        return product.imgFileSmall;
    }
    
    return product.imgFile || 'placeholder.png';
}


