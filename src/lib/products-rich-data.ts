/**
 * products-rich-data.ts
 * Información técnica, de bioseguridad, dosificación y tabla de mezclas
 * extraída de la documentación oficial de BioCambio360 (2026).
 * Incorpora el Manual de Limpieza, Dosificaciones y Rendimientos ML-01 (15/06/2026).
 */

export interface RichProductSpec {
    producto: string;
    proposito: string;
    aplicaciones: string;
    caracteristicas: string;
    precauciones: string;
    beneficios: string;
    modoUso: string;
    almacenamiento: string;
}

export const RICH_PRODUCT_SPECS: Record<string, RichProductSpec> = {};

export function getRichSpecForProduct(productName: string): RichProductSpec | null {
    if (!productName) return null;
    const nameUpper = productName.toUpperCase().trim();
    if (RICH_PRODUCT_SPECS[nameUpper]) return RICH_PRODUCT_SPECS[nameUpper];
    
    for (const key of Object.keys(RICH_PRODUCT_SPECS)) {
        if (nameUpper.includes(key) || key.includes(nameUpper)) {
            return RICH_PRODUCT_SPECS[key];
        }
    }
    return null;
}

export interface MezclaEntry {
    producto: string;
    siMezclar: string;
    noMezclar: string;
    riesgo: string;
}

export interface ManualSource {
    documentCode: 'ML-01';
    issuedAt: '2026-06-15';
    page: number;
}

export interface UsageGuideRow {
    useOrSurface: string;
    concentration: string;
    dilution: string;
    amount: string;
    contactTime: string;
    approximateYield: string;
}

export type ManualFamilyKey =
    | 'detergente'
    | 'quitamanchas-ropa-color'
    | 'blanqueador'
    | 'ambientador-multiusos'
    | 'lavaloza'
    | 'desengrasante'
    | 'oxigeno-activo'
    | 'suavizante'
    | 'desincrustante-descarbonizante';

export interface ProductManualContent {
    source: ManualSource;
    familyKey: ManualFamilyKey;
    familyName: string;
    enrichedIntroduction: string;
    shortDescription: string;
    usageRows: UsageGuideRow[];
    examples: string[];
    recommendations: string[];
    warnings: string[];
}

export const MANUAL_NOTICE_TEXT = "Las dosificaciones y rendimientos son una guía general. Pueden variar según el tipo y grado de suciedad, dureza del agua, temperatura, método de limpieza, superficie, tiempo de acción y condiciones ambientales. Realice una prueba preliminar y ajuste la aplicación a las condiciones específicas de uso.";

export const MANUAL_ML01_FAMILIES: Record<ManualFamilyKey, ProductManualContent> = {
    'detergente': {
        source: { documentCode: 'ML-01', issuedAt: '2026-06-15', page: 2 },
        familyKey: 'detergente',
        familyName: 'Detergente Líquido',
        enrichedIntroduction: 'Diseñado para el lavado manual o en lavadora de ropa diaria, uniformes, ropa de cama, toallas, mantelería y otros textiles lavables. Su dosificación se ajusta al peso de la carga y al nivel de suciedad para equilibrar limpieza, rendimiento y consumo.',
        shortDescription: 'Limpieza precisa para cada carga, desde ropa diaria hasta mantelería. Un litro rinde hasta 14 cargas ligeras con la dosificación recomendada.',
        usageRows: [
            { useOrSurface: 'Carga ligera, 2-3 kg', concentration: '100%', dilution: 'Listo para usar', amount: 'Ligera 70 ml; moderada 80 ml; pesada 90 ml', contactTime: 'Ciclo completo', approximateYield: '11-14 cargas/L' },
            { useOrSurface: 'Carga estándar, 4-5 kg', concentration: '100%', dilution: 'Listo para usar', amount: 'Ligera 120 ml; moderada 130 ml; pesada 140 ml', contactTime: 'Ciclo completo', approximateYield: '7-8 cargas/L' },
            { useOrSurface: 'Carga pesada, 6 kg o más', concentration: '100%', dilution: 'Listo para usar', amount: 'Ligera 200 ml; moderada 210 ml; pesada 220 ml', contactTime: 'Ciclo completo', approximateYield: '4-5 cargas/L' },
            { useOrSurface: 'Lavado a mano', concentration: 'Variable', dilution: 'Diluir en 10 L de agua según suciedad', amount: 'Según carga', contactTime: '15-30 min', approximateYield: 'Variable' }
        ],
        examples: ['Ropa de uso diario', 'Uniformes', 'Ropa de cama', 'Toallas', 'Mantelería', 'Textiles lavables'],
        recommendations: [
            'Respetar las instrucciones de lavado presentes en la etiqueta de la prenda.',
            'Para manchas difíciles, remojar la prenda aproximadamente 30 minutos antes del ciclo principal.',
            'Ajustar la cantidad de producto según el tamaño de la carga y el nivel de suciedad.'
        ],
        warnings: [
            'No aplicar producto puro directamente sobre fibras sintéticas delicadas sin diluir previa o agua.',
            'Conservar el recipiente bien cerrado en un lugar fresco y protegido de la luz solar.'
        ]
    },
    'quitamanchas-ropa-color': {
        source: { documentCode: 'ML-01', issuedAt: '2026-06-15', page: 2 },
        familyKey: 'quitamanchas-ropa-color',
        familyName: 'Quitamanchas Ropa Color',
        enrichedIntroduction: 'Auxiliar de lavado para ayudar a remover manchas difíciles en prendas de color manteniendo la apariencia de los tejidos. Puede usarse a mano o en lavadora con agua fría o tibia, siempre realizando una prueba previa en una zona poco visible.',
        shortDescription: 'Combate manchas difíciles sin renunciar a la apariencia de tus prendas de color. Úsalo en agua fría o tibia y trata hasta 50 prendas por cada 5 L de solución.',
        usageRows: [
            { useOrSurface: 'Lavado a mano', concentration: '2%', dilution: '100 ml en 5 L de agua', amount: '20 ml/L', contactTime: '15-30 min', approximateYield: '25-50 prendas/5 L' },
            { useOrSurface: 'Lavado en lavadora', concentration: 'Variable', dilution: '125 ml por carga', amount: 'Según carga', contactTime: 'Ciclo completo', approximateYield: '1 carga por 125 ml' }
        ],
        examples: ['Prendas de color', 'Uniformes escolares o de trabajo', 'Mantelería estampada', 'Toallas de color'],
        recommendations: [
            'Usar siempre agua fría o tibia para preservar los pigmentos del tejido.',
            'Realizar una prueba previa en una costura o zona no visible de la prenda antes de aplicar.'
        ],
        warnings: [
            'No usar en agua caliente.',
            'No aplicar en lana, seda, cuero, lino fino ni fibras delicadas incompatibles con productos oxigenados.'
        ]
    },
    'blanqueador': {
        source: { documentCode: 'ML-01', issuedAt: '2026-06-15', page: 3 },
        familyKey: 'blanqueador',
        familyName: 'Blanqueador - Desinfectante',
        enrichedIntroduction: 'Solución para el lavado de ropa blanca y la limpieza de pisos, inodoros, baños y superficies lavables. Permite aplicaciones directas o diluidas según el uso y exige respetar los tiempos de contacto y las precauciones de seguridad.',
        shortDescription: 'Blanquea ropa blanca y desinfecta pisos, baños, inodoros y superficies lavables. Una solución de 5 L puede cubrir hasta 60 m².',
        usageRows: [
            { useOrSurface: 'Aplicación directa sobre superficies', concentration: '100%', dilution: 'Listo para usar', amount: '1000 ml/L', contactTime: '5 min', approximateYield: '20-40 m²/L' },
            { useOrSurface: 'Lavado de ropa blanca', concentration: '1%', dilution: '100 ml por 10 L de agua', amount: '10 ml/L', contactTime: '10 min', approximateYield: '20-40 prendas/10 L' },
            { useOrSurface: 'Pisos', concentration: '1%', dilution: '50 ml por 5 L de agua', amount: '10 ml/L', contactTime: '5-10 min', approximateYield: '30-60 m²/5 L' },
            { useOrSurface: 'Inodoros', concentration: '100%', dilution: 'Directo, sin diluir', amount: '1000 ml/L', contactTime: '10 min', approximateYield: '10-20 aplicaciones/L' },
            { useOrSurface: 'Superficies generales', concentration: '1%', dilution: '50 ml por 5 L de agua', amount: '10 ml/L', contactTime: 'Secado al aire', approximateYield: '20-40 m²/5 L' }
        ],
        examples: ['Pisos lavables', 'Inodoros', 'Baños y baldosas', 'Pocetas y lavamanos', 'Superficies lavables', 'Ropa exclusivamente blanca'],
        recommendations: [
            'En aplicación directa: aplicar una pequeña cantidad, dejar actuar 5 minutos, frotar y enjuagar con abundante agua.'
        ],
        warnings: [
            'No mezclar con otros productos químicos o de limpieza (en especial ácidos o amoníaco).',
            'Mantener fuera del alcance de niños y mascotas.',
            'Conservar en lugar fresco, seco y protegido de la luz solar.',
            'Utilizar guantes de caucho o nitrilo durante su manipulación.'
        ]
    },
    'ambientador-multiusos': {
        source: { documentCode: 'ML-01', issuedAt: '2026-06-15', page: 3 },
        familyKey: 'ambientador-multiusos',
        familyName: 'Ambientador Multiusos',
        enrichedIntroduction: 'Producto listo para usar o diluir según la aplicación, diseñado para limpiar superficies, ambientar espacios y ayudar a eliminar olores. El manual contempla vidrios, espejos, pantallas, pisos, paredes, textiles del entorno, vehículos y espacios cerrados.',
        shortDescription: 'Limpia superficies y neutraliza olores mientras refresca cada espacio. Un litro listo para usar puede ambientar hasta 800 m².',
        usageRows: [
            { useOrSurface: 'Vidrios, ventanas, espejos y transparentes', concentration: '100%', dilution: 'Listo para usar', amount: '1000 ml/L', contactTime: 'Inmediato', approximateYield: '80-120 m²/L' },
            { useOrSurface: 'Pantallas electrónicas, lentes y gafas', concentration: '100%', dilution: 'Listo para usar', amount: '1000 ml/L', contactTime: 'Inmediato', approximateYield: '150-250 unidades/L' },
            { useOrSurface: 'Pisos, paredes y superficies lavables', concentration: '2.5%', dilution: '250 ml en 10 L', amount: '25 ml/L', contactTime: 'Inmediato', approximateYield: '80-120 m²/10 L' },
            { useOrSurface: 'Ambientación de espacios cerrados', concentration: '100%', dilution: 'Listo para usar', amount: '1000 ml/L', contactTime: 'Inmediato', approximateYield: '500-800 m²/L' },
            { useOrSurface: 'Eliminación de olores', concentration: '100%', dilution: 'Listo para usar', amount: '1000 ml/L', contactTime: 'Inmediato', approximateYield: '100-150 m²/L' }
        ],
        examples: ['Vidrios', 'Vitrinas', 'Espejos', 'Pantallas', 'Lentes', 'Pisos', 'Paredes', 'Oficinas', 'Hogares', 'Vehículos', 'Cortinas', 'Tapicerías', 'Alfombras', 'Espacios cerrados'],
        recommendations: [
            'Atomizar de forma uniforme en el ambiente o aplicar con paño de microfibra limpia para cristales y pantallas.'
        ],
        warnings: [
            'No atomizar directamente sobre alimentos ni sobre la cara de personas o animales.',
            'Mantener el frasco herméticamente cerrado cuando no esté en uso.'
        ]
    },
    'lavaloza': {
        source: { documentCode: 'ML-01', issuedAt: '2026-06-15', page: 4 },
        familyKey: 'lavaloza',
        familyName: 'Lavaloza Líquido Concentrado',
        enrichedIntroduction: 'Fórmula lista para usar en vajilla, recipientes y utensilios de cocina. Se aplica sobre una esponja, se frota la superficie y se enjuaga con abundante agua.',
        shortDescription: 'Corta la grasa de platos, ollas y utensilios con aplicación directa y enjuague fácil. Un litro puede rendir entre 500 y 1.000 piezas.',
        usageRows: [
            { useOrSurface: 'Vajilla y utensilios de uso general', concentration: '100%', dilution: 'Listo para usar', amount: '1000 ml/L', contactTime: 'Inmediato', approximateYield: '500-1000 piezas/L' }
        ],
        examples: ['Platos', 'Vasos', 'Cubiertos', 'Ollas', 'Bandejas', 'Recipientes plásticos y de vidrio', 'Utensilios de cocina'],
        recommendations: [
            'Aplicar una pequeña dosificación sobre una esponja húmeda, frotar hasta generar espuma y enjuagar bien con agua limpia.'
        ],
        warnings: [
            'Evitar el contacto directo con los ojos.',
            'Mantener fuera del alcance de los niños.'
        ]
    },
    'desengrasante': {
        source: { documentCode: 'ML-01', issuedAt: '2026-06-15', page: 4 },
        familyKey: 'desengrasante',
        familyName: 'Desengrasante General e Industrial',
        enrichedIntroduction: 'Solución graduable para grasa ligera, media, pesada o quemada, además de carbonilla, hollín, ceras, recubrimientos, óxido superficial y manchas textiles compatibles. La concentración y el tiempo de contacto deben seleccionarse según la superficie y la severidad de la suciedad.',
        shortDescription: 'Domina grasa ligera, quemada, ceras, hollín y manchas de aceite con la dilución adecuada. Poder versátil desde la cocina hasta el taller.',
        usageRows: [
            { useOrSurface: 'Grasa liviana', concentration: '9%-20%', dilution: '1:10 a 1:4 (producto:agua)', amount: '90-200 ml/L', contactTime: '2-5 min', approximateYield: '40-80 m²/L' },
            { useOrSurface: 'Grasa media', concentration: '25%', dilution: '1:3', amount: '250 ml/L', contactTime: '5 min', approximateYield: '30-50 m²/L' },
            { useOrSurface: 'Grasa pesada o quemada', concentration: '50%-100%', dilution: '1:1 o puro', amount: '500-1000 ml/L', contactTime: '5-10 min', approximateYield: '10-30 m²/L' },
            { useOrSurface: 'Desincrustación: carbonilla, hollín, grasa endurecida', concentration: '9%-25%', dilution: '1:10 a 1:3', amount: '90-250 ml/L', contactTime: '10-15 min', approximateYield: '20-50 m²/L' },
            { useOrSurface: 'Remoción de ceras, recubrimientos y sellantes', concentration: '50%-100%', dilution: '1:1 o puro', amount: '500-1000 ml/L', contactTime: '0.5-5 min', approximateYield: '15-30 m²/L' },
            { useOrSurface: 'Quitaóxido superficial en metales resistentes', concentration: '50%-100%', dilution: '1:1 o puro', amount: '500-1000 ml/L', contactTime: '2-10 min', approximateYield: '10-25 m²/L' },
            { useOrSurface: 'Prelavado textil: grasa, tinta, aceite', concentration: '100%', dilution: 'Listo para usar', amount: '1000 ml/L', contactTime: '5-10 min', approximateYield: '200-400 manchas/L' }
        ],
        examples: ['Cocinas', 'Estufas', 'Hornos', 'Campanas extractoras', 'Parrillas', 'Motores', 'Talleres', 'Maquinaria', 'Azulejos', 'Pisos industriales', 'Prelavado de ropa'],
        recommendations: [
            'Aplicar mediante esponja, trapo, brocha, mopa, aspersión, inmersión o lavadora a presión según la superficie.'
        ],
        warnings: [
            'Usar guantes de nitrilo y gafas de seguridad en su manejo puro o muy concentrado.',
            'En metales blandos como aluminio, probar previamente en dilución 1:20 sin exceder 1 minuto de contacto.'
        ]
    },
    'oxigeno-activo': {
        source: { documentCode: 'ML-01', issuedAt: '2026-06-15', page: 5 },
        familyKey: 'oxigeno-activo',
        familyName: 'Oxígeno Activo en Polvo',
        enrichedIntroduction: 'Agente oxidante para lavandería, remojo, manchas localizadas, superficies, utensilios, equipos, tuberías y tratamiento de agua. La dosificación cambia según el proceso y debe expresarse en gramos, sin convertirla a mililitros.',
        shortDescription: 'Blanquea, desmancha y potencia la limpieza de ropa, superficies, equipos y agua. Un kilogramo puede tratar hasta 60 kg de ropa.',
        usageRows: [
            { useOrSurface: 'Lavandería manual o automática', concentration: 'Variable', dilution: '15-30 g por kg de ropa seca', amount: '15-30 g/kg', contactTime: 'Ciclo completo', approximateYield: '30-60 kg de ropa/kg' },
            { useOrSurface: 'Remojo de ropa', concentration: 'Variable', dilution: '30-50 g en 5 L de agua', amount: '6-10 g/L', contactTime: '60-120 min', approximateYield: '100-160 L/kg' },
            { useOrSurface: 'Manchas difíciles', concentration: 'Pasta directa', dilution: 'Aplicación localizada con agua', amount: 'Según necesidad', contactTime: '10-15 min', approximateYield: '500-1000 manchas/kg' },
            { useOrSurface: 'Limpieza de superficies', concentration: 'Variable', dilution: '10-20 g/L', amount: '10-20 g/L', contactTime: '10-15 min', approximateYield: '50-100 m²/kg' },
            { useOrSurface: 'Utensilios, equipos y tuberías', concentration: '0.5%-1%', dilution: '5-10 g/L', amount: '5-10 g/L', contactTime: '15-30 min', approximateYield: '100-200 L/kg' },
            { useOrSurface: 'Tratamiento de agua, choque', concentration: 'Variable', dilution: '15-30 g/1000 L', amount: 'Según volumen', contactTime: 'Continuo', approximateYield: '33.000-66.000 L/kg' },
            { useOrSurface: 'Tratamiento de agua, mantenimiento', concentration: 'Variable', dilution: '5-10 g/1000 L', amount: 'Según volumen', contactTime: 'Continuo', approximateYield: '100.000-200.000 L/kg' }
        ],
        examples: ['Lavandería de ropa blanca y color', 'Superficies lavables', 'Industria alimentaria', 'Equipos', 'Tuberías', 'Piscinas', 'Spas'],
        recommendations: [
            'Expresar siempre las dosificaciones en gramos (g) y nunca en mililitros.'
        ],
        warnings: [
            'Almacenar en un recipiente cerrado en lugar seco y bien ventilado.',
            'No mezclar con cloro ni con productos marcadamente ácidos.'
        ]
    },
    'suavizante': {
        source: { documentCode: 'ML-01', issuedAt: '2026-06-15', page: 5 },
        familyKey: 'suavizante',
        familyName: 'Suavizante de Telas',
        enrichedIntroduction: 'Diseñado para aportar suavidad, facilitar el planchado y dejar una fragancia agradable. Debe agregarse en el compartimiento del suavizante o diluirse antes del último enjuague, evitando el contacto directo con las prendas.',
        shortDescription: 'Suaviza, facilita el planchado y deja una fragancia agradable en cada ciclo. Un litro rinde hasta 20 cargas pequeñas.',
        usageRows: [
            { useOrSurface: 'Carga pequeña, 2-4 kg', concentration: '100%', dilution: 'Listo para usar', amount: '50 ml', contactTime: 'Ciclo final', approximateYield: '20 cargas/L' },
            { useOrSurface: 'Carga mediana, 5-7 kg', concentration: '100%', dilution: 'Listo para usar', amount: '100 ml', contactTime: 'Ciclo final', approximateYield: '10 cargas/L' },
            { useOrSurface: 'Carga grande, 8 kg o más', concentration: '100%', dilution: 'Listo para usar', amount: '200 ml', contactTime: 'Ciclo final', approximateYield: '5 cargas/L' },
            { useOrSurface: 'Prendas delicadas (lavado a mano)', concentration: '5% aprox.', dilution: '50 ml en 1 L de agua', amount: '50 ml', contactTime: '5 min', approximateYield: '20 aplicaciones/L' }
        ],
        examples: ['Prendas de vestir', 'Ropa de cama', 'Toallas', 'Prendas delicadas'],
        recommendations: [
            'Usar el compartimiento destinado para el suavizante en la lavadora o diluir en 1 L de agua antes del último enjuague manual.'
        ],
        warnings: [
            'No aplicar producto puro directamente sobre las prendas textiles.',
            'No mezclar con detergentes ni con otros suavizantes en el mismo recipiente sin dilución previa.'
        ]
    },
    'desincrustante-descarbonizante': {
        source: { documentCode: 'ML-01', issuedAt: '2026-06-15', page: 6 },
        familyKey: 'desincrustante-descarbonizante',
        familyName: 'Desincrustante Descarbonizante',
        enrichedIntroduction: 'Producto para remover grasa carbonizada, residuos quemados e incrustaciones en equipos y superficies resistentes sometidos a altas temperaturas. La dilución se ajusta entre mantenimiento, carbonización media y carbonización severa.',
        shortDescription: 'Desprende grasa carbonizada y residuos quemados de equipos sometidos a altas temperaturas. En mantenimiento, un litro puede cubrir hasta 50 m².',
        usageRows: [
            { useOrSurface: 'Carbonización severa', concentration: '100%', dilution: 'Listo para usar', amount: '1000 ml/L', contactTime: '10-20 min', approximateYield: '8-20 m²/L' },
            { useOrSurface: 'Carbonización media', concentration: '50%', dilution: '1:1 (producto:agua)', amount: '500 ml/L', contactTime: '10-15 min', approximateYield: '15-30 m²/L' },
            { useOrSurface: 'Mantenimiento o suciedad leve', concentration: '33%', dilution: '1:2', amount: '333 ml/L', contactTime: '5-10 min', approximateYield: '25-50 m²/L' }
        ],
        examples: ['Parrillas', 'Planchas de cocina', 'Hornos industriales', 'Bandejas de horneado', 'Campanas extractoras', 'Quemadores', 'Freidoras', 'Asadores', 'Rejillas', 'Marmitas', 'Ollas y sartenes con grasa carbonizada'],
        recommendations: [
            'Dejar actuar el tiempo recomendado según la severidad de la incrustación y retirar con rasqueta o fibra abrasiva.'
        ],
        warnings: [
            'Utilizar guantes de protección y gafas de seguridad.',
            'Evitar su uso en superficies sensibles a álcalis fuertes o aluminio sin prueba previa.'
        ]
    }
};

/**
 * Mapeo explícito por Product ID hacia la familia del Manual ML-01.
 * Cero coincidencias borrosas en tiempo de ejecución.
 */
export const PRODUCT_MANUAL_KEY_MAP: Record<string, ManualFamilyKey> = {
    // 1. Detergentes
    'detergente-liquido-multiusos': 'detergente',
    'detergente-liquido-industrial-heavy-duty': 'detergente',
    'detergente-ropa-negra-oscura': 'detergente',
    'kit-combo-duo-10-10-detergente-desengrasante': 'detergente',
    'kit-combo-lavanderia-cocina': 'detergente',
    'kit-limpieza-completo-3-galones': 'detergente',

    // 2. Quitamanchas Ropa Color
    'quitamanchas-ropa-color': 'quitamanchas-ropa-color',
    'quitamanchas-ropa-color-500-ml': 'quitamanchas-ropa-color',
    'quitamanchas-ropa-color-500ml': 'quitamanchas-ropa-color',

    // 3. Blanqueadores
    'blanqueador': 'blanqueador',

    // 4. Ambientadores Multiusos
    'ambientador': 'ambientador-multiusos',
    'ambientador-canela': 'ambientador-multiusos',
    'ambientador-chicle': 'ambientador-multiusos',
    'ambientador-kiwi': 'ambientador-multiusos',
    'ambientador-talco': 'ambientador-multiusos',
    'ambientador-tutti-frutti': 'ambientador-multiusos',

    // 5. Lavaloza
    'lavaloza-liquido': 'lavaloza',

    // 6. Desengrasantes
    'desengrasante': 'desengrasante',
    'desengrasante-industrial': 'desengrasante',

    // 7. Oxígeno Activo
    'oxigeno-activo-desinfectante': 'oxigeno-activo',

    // 8. Suavizantes
    'suavizante': 'suavizante',
    'suavizante-manzan-verde': 'suavizante',
    'suavizante-motas-de-algodon': 'suavizante',
    'suavizante-sueno-lavanda': 'suavizante',

    // 9. Desincrustante Descarbonizante
    'desincrustante': 'desincrustante-descarbonizante'
};

export const TABLA_MEZCLAS_OFICIAL: MezclaEntry[] = [
    {
        "producto": "Detergente Líquido (Ropa Blanca, Color o Negra)",
        "siMezclar": "Suavizante, Oxígeno Activo, Bicarbonato",
        "noMezclar": "Cloro, Vinagre, Quita Óxido, Desengrasante Industrial",
        "riesgo": "Reacción de neutralización o daño de fibras, gases o vapores tóxicos"
    },
    {
        "producto": "Suavizante",
        "siMezclar": "Detergentes neutros",
        "noMezclar": "Ácidos o Cloro",
        "riesgo": "Pérdida de fragancia y formación de residuos"
    },
    {
        "producto": "Lavaloza",
        "siMezclar": "Bicarbonato, Vinagre (no directos)",
        "noMezclar": "Cloro, Desengrasantes alcalinos fuertes",
        "riesgo": "Irritación o neutralización química"
    },
    {
        "producto": "Limpiavidrios",
        "siMezclar": "Ambientador, Eliminador de olores",
        "noMezclar": "Ácidos, Alcalinos, Cloro",
        "riesgo": "Pérdida de transparencia o corrosión"
    },
    {
        "producto": "Shampoo Autos / Muebles / Manos",
        "siMezclar": "Suavizantes, Ambientador",
        "noMezclar": "Ácidos o Desengrasantes industriales",
        "riesgo": "Daña superficies o piel"
    },
    {
        "producto": "Ambientador / Eliminador de olores",
        "siMezclar": "Limpiavidrios, Limpiapisos",
        "noMezclar": "Ácidos, Cloro o Desengrasantes",
        "riesgo": "Cambia fragancia y pH"
    },
    {
        "producto": "Limpiapisos",
        "siMezclar": "Ambientador, Desinfectante con Bicarbonato",
        "noMezclar": "Ácidos o Cloro",
        "riesgo": "Pérdida de aroma o corrosión de pisos"
    },
    {
        "producto": "Desengrasante Hogar / Industrial",
        "siMezclar": "Bicarbonato, Agua",
        "noMezclar": "Ácidos, Cloro",
        "riesgo": "Reacción química y vapores irritantes"
    },
    {
        "producto": "Removedor de Ceras",
        "siMezclar": "Agua, Desengrasante Industrial",
        "noMezclar": "Ácidos o Cloro",
        "riesgo": "Neutralización o vapores tóxicos"
    },
    {
        "producto": "Destapacañerías",
        "siMezclar": "Ninguno – uso exclusivo",
        "noMezclar": "Cualquier otro producto",
        "riesgo": "Reacción violenta y peligrosa"
    },
    {
        "producto": "Desinfectante con Bicarbonato",
        "siMezclar": "Limpiapisos, Detergentes neutros",
        "noMezclar": "Ácidos, Cloro",
        "riesgo": "Neutralización o pérdida de acción"
    },
    {
        "producto": "Lustra Llantas / Siliconas / Ceras Autobrillantes",
        "siMezclar": "Shampoo Autos (secuencial, no mezclado), Agua",
        "noMezclar": "Ácidos o Desengrasantes",
        "riesgo": "Eliminan brillo o deterioran el acabado"
    },
    {
        "producto": "Quita Óxido",
        "siMezclar": "Ninguno – uso único",
        "noMezclar": "Alcalinos, Cloro, Neutros",
        "riesgo": "Reacción química corrosiva o tóxica"
    },
    {
        "producto": "Vinagre de Limpieza",
        "siMezclar": "Bicarbonato (no simultáneo)",
        "noMezclar": "Cloro, Alcalinos",
        "riesgo": "Gas tóxico (cloro o CO₂)"
    },
    {
        "producto": "Limpiajuntas (ácido)",
        "siMezclar": "Agua fría",
        "noMezclar": "Alcalinos, Cloro",
        "riesgo": "Vapores irritantes o pérdida de efectividad"
    },
    {
        "producto": "Blanqueador (Cloro)",
        "siMezclar": "Agua",
        "noMezclar": "Ácidos, Vinagre, Alcalinos",
        "riesgo": "Gas tóxico de cloro"
    },
    {
        "producto": "Oxígeno Activo (Percarbonato de sodio)",
        "siMezclar": "Detergentes neutros, Bicarbonato",
        "noMezclar": "Cloro, Ácidos",
        "riesgo": "Descomposición violenta y vapores"
    },
    {
        "producto": "Quitamanchas Ropa Color (Base de peroxido)",
        "siMezclar": "Con el detergente durante el proceso de lavado,",
        "noMezclar": "Directamente con cualquier tipo de producto NO se debe mezclar",
        "riesgo": "Descomposición violenta y vapores"
    }
];

export function getManualContentForProduct(productOrId: { id: string; manualContent?: any } | string): ProductManualContent | null {
    const productId = typeof productOrId === 'string' ? productOrId : productOrId.id;
    const customManual = typeof productOrId === 'object' && productOrId.manualContent ? productOrId.manualContent : null;

    const familyKey = PRODUCT_MANUAL_KEY_MAP[productId];
    const defaultManual = familyKey ? MANUAL_ML01_FAMILIES[familyKey] : null;

    if (!defaultManual && !customManual) return null;

    if (customManual) {
        return {
            source: defaultManual?.source || { documentCode: 'ML-01', issuedAt: '2026-06-15', page: 1 },
            familyKey: defaultManual?.familyKey || (familyKey || 'detergente' as ManualFamilyKey),
            familyName: defaultManual?.familyName || 'Guía Técnica de Aplicación',
            shortDescription: defaultManual?.shortDescription || '',
            examples: defaultManual?.examples || [],
            enrichedIntroduction: customManual.enrichedIntroduction || defaultManual?.enrichedIntroduction || '',
            usageRows: customManual.usageRows && customManual.usageRows.length > 0 ? customManual.usageRows : (defaultManual?.usageRows || []),
            recommendations: customManual.recommendations && customManual.recommendations.length > 0 ? customManual.recommendations : (defaultManual?.recommendations || []),
            warnings: customManual.warnings && customManual.warnings.length > 0 ? customManual.warnings : (defaultManual?.warnings || [])
        };
    }

    return defaultManual;
}
