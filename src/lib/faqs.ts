// Extended FAQs for SEO - Investigative stage users
export interface FAQItem {
    question: string;
    answer: string;
    category: 'producto' | 'compra' | 'envio' | 'tecnico';
}

export const FAQS_GENERALES: FAQItem[] = [
    // Categoría: Producto (8 preguntas)
    {
        question: "¿Qué hace diferente a Biocambio360 de otras marcas de aseo?",
        answer: "Somos fabricantes directos (Biocambio360 S.A.S.) ubicados en Soacha, Cundinamarca. Eliminamos intermediarios vendiéndote al mismo precio que le vendemos a distribuidores mayoristas. Nuestra planta cuenta con certificación INVIMA y formulaciones de grado industrial usadas en hoteles, hospitales y lavanderías.",
        category: 'producto'
    },
    {
        question: "¿Los productos de Biocambio360 tienen registro sanitario?",
        answer: "Sí. Todos nuestros productos cuentan con registro sanitario INVIMA vigente. Cumplimos normativas para productos de aseo de uso doméstico e industrial según Decreto 4725 de 2005 y Resolución 1506 de 2011.",
        category: 'producto'
    },
    {
        question: "¿Cuánto rinde un galón (3.8L) comparado con presentaciones de supermercado?",
        answer: "Un galón de 3.8L equivale aproximadamente a 12 botellas de 300ml de supermercado. Considerando que una botella tradicional cuesta entre $8,000-$12,000, comprar por galón genera un ahorro del 60-75% por mililitro.",
        category: 'producto'
    },
    {
        question: "¿Son productos biodegradables?",
        answer: "Sí. Nuestros tensoactivos se degradan en menos de 28 días según norma OECD 301D. Los Blanqueadores usan Hipoclorito de Sodio estabilizado al 5.25%, seguro para sistemas sépticos en dosificaciones recomendadas.",
        category: 'producto'
    },
    {
        question: "¿Puedo usar los productos industriales en mi hogar sin peligro?",
        answer: "Totalmente. 'Industrial' se refiere a la concentración y rendimiento, no a toxicidad. De hecho, al ser más concentrados, terminas usando menos product por lavada. Incluimos instrucciones de dilución para uso doméstico en cada envase.",
        category: 'producto'
    },
    {
        question: "¿El detergente daña lavadoras de carga frontal?",
        answer: "No. Nuestra fórmula es de baja espuma (Low Foam), diseñada específicamente para lavadoras HE (Alta Eficiencia) y frontales. El exceso de espuma en otras marcas es lo que daña sensores, nosotros evitamos ese problema.",
        category: 'producto'
    },
    {
        question: "¿Qué diferencia hay entre Desengrasante Rojo y desengrasantes de cocina normales?",
        answer: "Nuestro pH alcalino (11-12) rompe enlaces de grasa a nivel molecular instantáneamente. Los desengrasantes de supermercado rondan pH 9-10. Esa diferencia química significa que el nuestro limpia cochambre, aceite quemado y grasa industrial que productos domésticos no pueden.",
        category: 'producto'
    },
    {
        question: "¿Los envases son reciclables?",
        answer: "Sí. Usamos PEAD (Polietileno de Alta Densidad) código 2 de reciclaje. Aceptamos devolución de garrafas vacías en nuestra planta en Soacha con descuento del 10% en tu próxima compra (programa Eco-Retorno).",
        category: 'producto'
    },

    // Categoría: Compra (7 preguntas)
    {
        question: "¿Cómo hago un pedido si no tengo tarjeta de crédito?",
        answer: "El 85% de nuestros clientes pagan contraentrega en efectivo. Seleccionas tus productos, llenas la dirección de envío, y pagas al transportista cuando llegue el paquete. No necesitas cuenta bancaria ni tarjetas.",
        category: 'compra'
    },
    {
        question: "¿Cuál es el pedido mínimo?",
        answer: "No hay pedido mínimo de productos. Puedes pedir desde 1 presentación individual. El costo de envío se calcula de forma transparente al momento del checkout y puedes aplicar cupones promocionales de descuento.",
        category: 'compra'
    },
    {
        question: "¿Puedo cambiar o cancelar mi pedido después de hacer el pago?",
        answer: "Sí, siempre que no se haya despachado. Contáctanos por WhatsApp al 300-XXX-XXXX con tu número de orden antes de 2 horas hábiles después de la compra. El reembolso toma 3-5 días hábiles.",
        category: 'compra'
    },
    {
        question: "¿Aceptan Nequi, Daviplata o transferencias?",
        answer: "Sí. Puedes pagar el total o solo el envío por adelantado vía Nequi/Daviplata a nuestro número XXX-XXX-XXXX. Esto agiliza el despacho (sale el mismo día) y en algunos casos reduce el costo de flete.",
        category: 'compra'
    },
    {
        question: "¿Dan factura electrónica?",
        answer: "Sí. Emitimos factura electrónica para personas naturales y jurídicas. Solo indícalo en 'Notas' al momento del checkout con tu NIT/CC y razón social. La factura llega a tu email en máximo 48 horas.",
        category: 'compra'
    },
    {
        question: "¿Hay descuentos por volumen?",
        answer: "Sí. Compras superiores a 6 unidades de un mismo producto tienen 5% OFF automático. Negocios (tiendas, lavanderías, hoteles) que compren más de $500,000/mes califican para descuento mayorista del 12-18%.",
        category: 'compra'
    },
    {
        question: "¿Puedo comprar hoy y recoger en fábrica mañana?",
        answer: "Sí. Selecciona 'Retiro en Planta' al finalizar compra (gratis). Te confirmamos por WhatsApp cuando esté listo (usualmente 2-4 horas). Horario: Lunes a Viernes 8AM-5PM, Sábados 8AM-12PM. Dirección: Cra. 7C #44-17 Sur, Soacha.",
        category: 'compra'
    },

    // Categoría: Envío (6 preguntas)
    {
        question: "¿A qué ciudades hacen envíos?",
        answer: "Cubrimos TODO el territorio nacional vía 99Envíos, Droppi, Interrapidísimo y Coordinadora. Principales ciudades llegan en 1-3 días; municipios intermedios 3-7 días; zonas rurales hasta 10-12 días hábiles.",
        category: 'envio'
    },
    {
        question: "¿Cómo sé en qué va mi pedido?",
        answer: "Al despachar tu orden recibes un WhatsApp con el número de guía. Con ese código rastresas el paquete en tiempo real en la web de la transportadora. También enviamos notificaciones automáticas en cada cambio de estado.",
        category: 'envio'
    },
    {
        question: "¿Qué pasa si no estoy en casa cuando llega el pedido?",
        answer: "La transportadora intenta entrega 3 veces. Si no te encuentran, el paquete vuelve a bodega local de la transportadora donde tienes 5 días para recogerlo con tu cédula. Pasado ese tiempo, se devuelve a fábrica (pierdes el flete).",
        category: 'envio'
    },
    {
        question: "¿El envío contraentrega tiene algún costo extra?",
        answer: "El costo del flete YA incluye el servicio de recaudo (contraentrega). No hay comisiones ocultas. El transportista te cobra únicamente: Precio Productos + Costo Envío.",
        category: 'envio'
    },
    {
        question: "¿Puedo programar la entrega para un día específico?",
        answer: "Las transportadoras no garantizan entrega en fecha exacta, pero sí rango de 1-3 días desde que sale de nuestra bodega. Si necesitas fecha específica (cumpleaños, evento), agenda con 5-7 días de anticipación y coordínalo en 'Notas' del pedido.",
        category: 'envio'
    },
    {
        question: "¿Qué hago si mi pedido llega dañado o incompleto?",
        answer: "Toma fotos/video ANTES de firmar la guía del transportista. Si hay daño visible, RECHAZA el paquete. Si el daño es interno, contáctanos en máximo 24 horas con evidencia fotográfica. Reponemos el producto o devolvemos el 100% del dinero.",
        category: 'envio'
    },

    // Categoría: Técnico (4 preguntas)
    {
        question: "¿Cuál es la dosificación correcta del detergente para una lavadora de 15kg?",
        answer: "Para una carga completa (15kg) con suciedad normal: 60ml (4 cucharadas). Ropa muy sucia o con manchas difíciles: 100ml. En lavadoras semiautomáticas o manuales puedes usar hasta 120ml porque se enjuaga más veces.",
        category: 'tecnico'
    },
    {
        question: "¿Se puede mezclar el blanqueador con detergente o desengrasante?",
        answer: "JAMÁS mezcles blanqueador (Hipoclorito) con desengrasantes o ácidos. La reacción química libera gas Cloro (tóxico). Usa blanqueador SOLO en ciclo de remojo o enjuague final, nunca en el lavado principal si ya echaste detergente.",
        category: 'tecnico'
    },
    {
        question: "¿El suavizante mancha ropa oscura?",
        answer: "Nuestro suavizante NO. Muchas marcas de supermercado usan aceites minerazules que dejan residuo blanco en negros. Nosotros usamos siliconas solubles 'Cero-Grasa' que no dejan película aceitosa.",
        category: 'tecnico'
    },
    {
        question: "¿Puedo usar desengrasante en superficies de aluminio?",
        answer: "Con precaución. El pH alcalino (11-12) puede opacar aluminio. Si vas a usarlo: diluye 1 parte de producto en 5 de agua, aplica máximo 30 segundos, y enjuaga inmediatamente. Nunca lo uses puro sobre aluminio o teflón.",
        category: 'tecnico'
    },

    // Extras para llegar a 25+
    {
        question: "¿Hacen entregas el mismo día en Bogotá?",
        answer: "Sí, para pedidos confirmados antes de las 10AM en Bogotá zona urbana. Costo adicional: $8,000. Solo disponible de Lunes a Viernes. Confirma disponibilidad enviando WhatsApp antes de comprar.",
        category: 'compra'
    },
    {
        question: "¿Los productos vienen con etiqueta de instrucciones?",
        answer: "Sí. Cada envase lleva etiqueta con: Nombre del producto, Registro INVIMA, Ingredientes activos, Dosificación recomendada, Precauciones de seguridad, Información de contacto y Fecha de vencimiento.",
        category: 'producto'
    },
    {
        question: "¿Cuál es la vida útil de los productos sin abrir?",
        answer: "Sellados y almacenados en lugar fresco: Detergentes y Desengrasantes 24 meses, Suavizantes 18 meses, Blanqueadores 12 meses (el Hipoclorito se degrada naturalmente con el tiempo).",
        category: 'tecnico'
    },
    {
        question: "¿Puedo devolver un producto si no me gustó?",
        answer: "Sí, dentro de los primeros 7 días calendario si el envase está sellado (más del 90% lleno). Costo de envío de vuelta corre por tu cuenta. Reembolso 100% del valor del producto en 5-10 días hábiles.",
        category: 'compra'
    },

    // Categoría: Informacional SEO / AEO (8 preguntas)
    {
        question: "¿Qué es un desengrasante industrial y para qué sirve?",
        answer: "Un desengrasante industrial es una fórmula química de alta concentración diseñada para disolver grasas pesadas, aceites de motor, cochambre y suciedad extrema. A diferencia de los limpiadores domésticos, penetra superficies porosas y equipos de acero inoxidable o aluminio sin requerir esfuerzo mecánico excesivo.",
        category: 'tecnico'
    },
    {
        question: "¿Cómo limpiar pisos muy sucios o con manchas de grasa?",
        answer: "Para limpiar pisos muy sucios, lo ideal es usar un desengrasante alcalino. Diluye 100ml de nuestro desengrasante industrial en 5 litros de agua. Aplica sobre el piso, deja actuar por 5 a 10 minutos para que saponifique la grasa, cepilla suavemente y enjuaga con agua limpia. Evita mezclar con cloro.",
        category: 'tecnico'
    },
    {
        question: "¿Cuál es la diferencia entre un detergente industrial y uno doméstico?",
        answer: "La principal diferencia radica en la concentración de materia activa (tensoactivos). Un detergente industrial requiere mucha menos cantidad por lavada y está formulado para remover suciedad pesada (grasa mecánica, fluidos corporales en hospitales, mantelería de restaurantes) sin generar exceso de espuma que dañe la maquinaria.",
        category: 'tecnico'
    },
    {
        question: "¿Por qué mi lavadora huele mal y cómo eliminar el mal olor?",
        answer: "El mal olor en las lavadoras se debe a la acumulación de bacterias, sarro y restos de exceso de espuma de detergentes de baja calidad. Para solucionarlo, haz un ciclo de lavado en vacío con agua caliente y 250ml de blanqueador desinfectante. Prevén esto usando detergentes Low Foam (Baja espuma).",
        category: 'tecnico'
    },
    {
        question: "¿Qué significa que un producto de aseo tenga pH alcalino?",
        answer: "El pH mide la acidez o alcalinidad. Los limpiadores con pH alcalino (entre 9 y 14) son excelentes para romper cadenas de grasa, eliminar aceites y proteínas. Son ideales para cocinas, talleres e industrias. Por otro lado, los limpiadores ácidos (pH bajo) se usan para remover sarro y óxido.",
        category: 'tecnico'
    },
    {
        question: "¿Cómo desinfectar baños públicos o de alto tráfico correctamente?",
        answer: "Primero lava con detergente para remover la suciedad visible (limpieza). Luego, enjuaga. Finalmente, aplica una solución de Hipoclorito de Sodio (blanqueador) al 5.25% diluido (1 taza por galón de agua) y deja actuar por 10 minutos. Nunca mezcles el detergente con el cloro en el mismo balde.",
        category: 'tecnico'
    },
    {
        question: "¿Qué beneficios tiene comprar productos de aseo al por mayor o en galón?",
        answer: "Comprar productos de limpieza en presentaciones institucionales (galón de 3.8L o garrafas de 20L) reduce el costo por mililitro hasta en un 70% comparado con envases pequeños, disminuye la huella de plástico (menos envases desechados) y asegura el abastecimiento constante para tu negocio u hogar.",
        category: 'compra'
    },
    {
        question: "¿Cómo eliminar manchas amarillas de la ropa blanca?",
        answer: "Las manchas amarillas por sudor o desodorante son proteicas. Usa nuestro detergente industrial aplicado directo en la mancha, frota ligeramente y deja reposar 15 minutos. Luego, lava en ciclo normal añadiendo 50ml de blanqueador en el agua de enjuague (nunca directo sobre la ropa para evitar dañar las fibras).",
        category: 'tecnico'
    }
];
