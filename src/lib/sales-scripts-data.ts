/**
 * Biocambio360 — Catálogo Oficial de Guiones Comerciales y Respuestas Rápidas
 * Extraído y adaptado de TEXTOS RESPUESTA BIOCAMBIO360_2025.docx y
 * MANUAL_OPERATIVO_PROGRAMA_REFERIDOS_BIOCAMBIO360.pdf (Diego & Fernando / Think TIC).
 */

export interface SalesScript {
    id: string;
    categoria: 'saludos' | 'bactokil' | 'fletes_envios' | 'pagos_cuentas' | 'combos' | 'alertas' | 'referidos' | 'objeciones';
    titulo: string;
    descripcion: string;
    texto: string;
    tags: string[];
    variables: string[]; // Ej: ['cliente', 'producto', 'total']
}

export interface SalesScriptCategory {
    id: SalesScript['categoria'];
    label: string;
    emoji: string;
    color: string;
}

export const SCRIPT_CATEGORIES: SalesScriptCategory[] = [
    { id: 'alertas', label: 'Protocolo de Alertas', emoji: '🔔', color: 'bg-rose-100 text-rose-800 border-rose-300' },
    { id: 'fletes_envios', label: 'Fletes y Cobertura', emoji: '🚚', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    { id: 'referidos', label: 'Comunidad & Referidos', emoji: '🌟', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    { id: 'combos', label: 'Combos y Ofertas', emoji: '🧼', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
    { id: 'bactokil', label: 'Campaña Bactokill', emoji: '🧪', color: 'bg-purple-100 text-purple-800 border-purple-300' },
    { id: 'pagos_cuentas', label: 'Cuentas & Pagos', emoji: '💳', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    { id: 'objeciones', label: 'Manejo de Objeciones', emoji: '🛡️', color: 'bg-slate-100 text-slate-800 border-slate-300' },
    { id: 'saludos', label: 'Saludos & Apertura', emoji: '👋', color: 'bg-teal-100 text-teal-800 border-teal-300' },
];

export const SALES_SCRIPTS_CATALOG: SalesScript[] = [
    // ─── 1. PROTOCOLO DE ALERTAS ───
    {
        id: 'alerta-recompra-sugerida',
        categoria: 'alertas',
        titulo: 'Alerta de Recompra Programada (Fin de Ciclo)',
        descripcion: 'Para enviar a clientes cuando su producto está por terminarse según el ciclo estimado.',
        texto: `¡Hola {cliente}! Te saluda {asesor} de Biocambio360 🌿.

Esperamos que estés disfrutando de la calidad concentrada y el aroma fresco en tu hogar. Revisando nuestro sistema, vemos que ya han pasado varias semanas desde tu última entrega de {producto} y según el consumo promedio familiar, tu producto debe estar por terminarse.

¿Deseas que te programemos tu reabastecimiento directo de fábrica esta semana con domicilio prioritario? Recuerda que por ser cliente preferencial te mantenemos el precio especial de fábrica. ¡Quedo muy atento/a para apartar tu pedido!`,
        tags: ['recompra', 'alerta', 'reabastecimiento', 'ciclo'],
        variables: ['cliente', 'asesor', 'producto']
    },
    {
        id: 'alerta-entrega-manana',
        categoria: 'alertas',
        titulo: 'Alerta de Entrega Día Siguiente (Preparación & Efectivo)',
        descripcion: 'Confirmar entrega programada para el día de mañana y solicitar alistamiento de efectivo o soporte.',
        texto: `👉 ¡Hola {cliente}! Te informo que tu pedido de Biocambio360 será entregado el día *MAÑANA* 🚗🛵 por nuestro domiciliario en el transcurso del día.

Por favor estar muy atentos a tu celular.
💵 Total a pagar contraentrega en efectivo: *{total}* (o si prefieres pagar por transferencia, avísanos para validar el soporte con anticipación).

🙏 ¿Eres tan amable de confirmarnos si mañana te encuentras en tu dirección para recibir sin contratiempos? Si puedes, compártenos tu ubicación actual para que el repartidor llegue más rápido. ¡Muchas gracias por tu compra!`,
        tags: ['entrega', 'mañana', 'alerta', 'contraentrega', 'efectivo'],
        variables: ['cliente', 'total']
    },
    {
        id: 'alerta-no-confirmacion',
        categoria: 'alertas',
        titulo: 'Re-confirmación de Entrega Urgente',
        descripcion: 'Cuando el cliente no ha confirmado si puede recibir al día siguiente.',
        texto: `🙏 ¡Hola {cliente}! Te agradecemos enormemente nos confirmes si el día de mañana podemos llevar a cabo la entrega de tu pedido en {ciudad}❓

👉 Nuestro despachador está cerrando las rutas de la mañana. Si eres tan amable de confirmarnos y regalarnos tu UBICACIÓN ACTUAL por aquí, facilitaremos que el domiciliario llegue justo a tu puerta sin demoras 🛵📍. ¡Mil gracias!`,
        tags: ['alerta', 'confirmacion', 'ubicacion', 'ruta'],
        variables: ['cliente', 'ciudad']
    },
    {
        id: 'alerta-reprogramacion-no-entrega',
        categoria: 'alertas',
        titulo: 'Reprogramación por Visita No Exitosa (Tratamiento Especial)',
        descripcion: 'Cuando el domiciliario acudió pero el cliente no estuvo o no contestó.',
        texto: `✅ Apreciado/a {cliente}, debido a que el domiciliario se acercó hoy a tu ubicación pero no fue posible concretar la entrega, te podemos reprogramar con todo gusto en nuestra próxima ruta.

Para poder reasignar el cupo en el vehículo de despacho, por favor confírmanos qué día de la semana puedes estar presente en el horario acordado. Recuerda que si el primer intento no pudo completarse, el nuevo flete de reintento tiene una tarifa especial de reprogramación de $8.000 para cubrir el desplazamiento del mensajero.

Quedamos atentos a tu confirmación de fecha para no dejarte sin tus productos de limpieza de fábrica 🧼📦.`,
        tags: ['reprogramacion', 'no_entregado', 'novedad', 'flete'],
        variables: ['cliente']
    },

    // ─── 2. FLETES Y COBERTURA (REDUCCIÓN DE FRICCIÓN) ───
    {
        id: 'flete-nacional-subsidiado',
        categoria: 'fletes_envios',
        titulo: 'Envío Nacional Subsidiado (Cero Fricción Comercial)',
        descripcion: 'Explica el costo de envío como un beneficio exclusivo subsidiado en un % por la fábrica.',
        texto: `🚛 ¡Excelente noticia! En Biocambio360 disponemos de cobertura a *Nivel Nacional*.

Para que no te preocupes por el flete, *tenemos el envío nacional subsidiado en un alto porcentaje por Biocambio360* y únicamente un costo mínimo de logística para ti, como un beneficio directo de fábrica para que disfrutes de químicos de alta concentración sin sobrecostos.

Por ejemplo, te ofrecemos tarifas desde solo $6.500 por garrafa llevando 2 unidades. ¿En qué ciudad o municipio te encuentras para cotizarte el subsidio exacto directo de planta?`,
        tags: ['envio_nacional', 'flete', 'subsidio', 'beneficio_fabrica'],
        variables: []
    },
    {
        id: 'flete-bogota-soacha-gratis',
        categoria: 'fletes_envios',
        titulo: 'Bogotá y Soacha Domicilio 100% Gratis',
        descripcion: 'Explicación de cobertura local directa desde planta en Soacha.',
        texto: `📍 Te informo que nuestra planta principal se encuentra ubicada en el municipio de *Soacha*, y te entregamos con *DOMICILIO TOTALMENTE GRATIS* en la ciudad de *Bogotá y Zonas aledañas* 🛵🎁.

✅ Pagas contraentrega en efectivo o transferencia una vez el domiciliario te entregue tus productos en la puerta de tu hogar o local. ¡Cero riesgo para ti!`,
        tags: ['bogota', 'soacha', 'domicilio_gratis', 'contraentrega'],
        variables: []
    },

    // ─── 3. COMUNIDAD Y PROGRAMA DE REFERIDOS ───
    {
        id: 'referidos-gancho-cierre-telefonico',
        categoria: 'referidos',
        titulo: 'Guion Telefónico / Chat: El Gancho de los $10.000',
        descripcion: 'Cierre de venta informando que queda habilitado de inmediato como embajador.',
        texto: `Listo don/doña {cliente}, su pedido queda confirmado. Y una excelente noticia antes de continuar: su número queda habilitado como *Embajador Biocambio360* 🌟.

Eso significa que si le cuenta a su hermano, compadre o vecino del negocio de al lado, *a ellos les regalamos $10.000 COP de descuento en su primer pedido de fábrica y a usted le abonamos $10.000 COP de saldo* para que su próxima garrafa le salga prácticamente a mitad de precio.

Su enlace exclusivo para compartir es: {enlace_referido}

¡Muchos de nuestros clientes ya no pagan por sus productos de aseo gracias a sus recomendados!`,
        tags: ['referidos', 'gancho_10000', 'comunidad', 'cierre'],
        variables: ['cliente', 'enlace_referido']
    },
    {
        id: 'referidos-post-venta-24h',
        categoria: 'referidos',
        titulo: 'Guion Post-Venta (24 Horas de la Entrega)',
        descripcion: 'Mensaje de WhatsApp para transformar al comprador reciente en promotor activo.',
        texto: `¡Hola {cliente}! Te saluda {asesor} de Biocambio360 🌿. Queríamos confirmar que tu pedido de {producto} haya llegado perfecto a tu hogar. Esperamos que disfrutes la fragancia y el rendimiento concentrado de fábrica.

Queremos contarte que por ser cliente verificado, tienes activo un beneficio especial en nuestra *Comunidad Biocambio360*: puedes regalarle *$10.000 COP de descuento* a tus amigos, vecinos o familiares para su primera compra, y por cada uno que reciba su pedido, tú acumulas *$10.000 COP de saldo* para tus propias compras.

Consulta tu código y saldo en solo 10 segundos aquí:
👉 {enlace_referido}

¿Te gustaría que te enviemos una imagen lista con tu código para que la subas a tu estado de WhatsApp?`,
        tags: ['post_venta', 'referidos', '24h', 'fidelizacion'],
        variables: ['cliente', 'asesor', 'producto', 'enlace_referido']
    },
    {
        id: 'referidos-b2b-aliados',
        categoria: 'referidos',
        titulo: 'Guion B2B: Red de Aliados Comerciales (Lavaderos, Restaurantes, Hoteles)',
        descripcion: 'Propuesta comercial para que clientes institucionales recomienden a colegas del gremio.',
        texto: `Apreciado/a {cliente}: En Biocambio360 sabemos que en su gremio los colegas se conocen y buscan constantemente bajar costos operativos en químicos de limpieza.

Nuestro programa *Aliados Comerciales Biocambio360* le permite recomendar nuestra línea institucional (garrafas de 20L y desengrasantes industriales) a otros negocios. Con solo 3 compras que ellos hagan con su código, usted sube a *Aliado Frecuente*, recibe producto de cortesía de fábrica y acumula hasta *$150.000 COP en bonos* para sus propios insumos.

Con 5 negocios que usted refiera, ¡los químicos de su propio establecimiento se pagan prácticamente solos con los saldos acumulados! ¿Le gustaría que le activemos su código institucional hoy mismo?`,
        tags: ['b2b', 'horeca', 'talleres', 'lavanderias', 'aliados'],
        variables: ['cliente']
    },
    {
        id: 'referidos-faq-saldo-pendiente',
        categoria: 'referidos',
        titulo: 'FAQ Referidos: ¿Por qué mi saldo aparece como Pendiente?',
        descripcion: 'Explicación transparente y empática del ciclo de liberación de bonos.',
        texto: `¡Hola {cliente}! Con mucho gusto te aclaramos con total transparencia. Tu saldo aparece en estado *'Pendiente'* porque tu referido ya generó la orden en la web, pero el pedido está actualmente en proceso de despacho en bodega.

Para garantizar la sostenibilidad y seguridad del programa de fábrica, el saldo pasa a *'Disponible'* en el momento exacto en que la transportadora le entrega el paquete físicamente y se confirma el recaudo. ¡Tan pronto lo reciba en su puerta, verás tus $10.000 COP listos para redimir en tus compras! 📦✨`,
        tags: ['faq', 'saldo_pendiente', 'transparencia'],
        variables: ['cliente']
    },

    // ─── 4. COMBOS Y OFERTAS ───
    {
        id: 'combo-garrafa-galon',
        categoria: 'combos',
        titulo: 'Combo Promocional: Garrafa 20L + Galón Adicional',
        descripcion: 'Oferta de mayor valor para aumentar el ticket promedio comercial.',
        texto: `🎁 ¡Queremos seguir brindándote más beneficios y ofertas exclusivas directas de planta!

Por la compra de una *Garrafa de 20 Litros* de {producto}, puedes llevar un *Galón de 4L adicional* con un precio de fábrica insuperable con DOMICILIO COMPLETAMENTE GRATIS en Bogotá y Soacha 🚐💨.

¿Deseas armar tu combo personalizado con detergente, suavizante o desengrasante? Cuéntame qué productos usas a diario y te liquido la mejor tarifa especial de hoy.`,
        tags: ['combo', 'garrafa', 'galon', 'ticket_promedio'],
        variables: ['producto']
    },
    {
        id: 'descuento-volumen-5-10',
        categoria: 'combos',
        titulo: 'Descuentos por Volumen (5% y 10%)',
        descripcion: 'Escalas de descuento para clientes mayoristas o copropiedades.',
        texto: `✅ Por ser fabricantes directos, contamos con escalas especiales de ahorro:
• Por compras superiores a *$500.000 COP* te otorgamos un *5% de descuento directo* con anticipo del 50%.
• Por compras superiores a *$1'000.000 COP* te otorgamos un *10% de descuento de fábrica*.
• Incluye certificado de análisis de calidad y entrega a domicilio.

¿Qué volumen de garrafas o tambores de 200L requieres para prepararte la cotización formal?`,
        tags: ['volumen', 'mayorista', 'descuento_5_10'],
        variables: []
    },

    // ─── 5. CAMPAÑA BACTOKILL ───
    {
        id: 'bactokil-opcion-1-ensayo',
        categoria: 'bactokil',
        titulo: 'Bactokil Opción 1: Prueba de Litro a $9.500',
        descripcion: 'Abordaje persuasivo sin compromiso para cross-selling de desinfectante.',
        texto: `Ya que terminamos de tomar tu pedido {cliente}, sin ningún tipo de compromiso queremos compartirte algo muy especial de nuestra línea de bioseguridad:

¿Qué te parece si pruebas nuestro nuevo desinfectante hospitalario *Bactokil* desde solo 1 Litro por *$9.500 COP* y nos ayudas a evaluar tú mismo/a si cumple el nivel de calidad insuperable que ya conoces de BioCambio 360? ¿Te lo agregamos a tu despacho de hoy? 🧪🧼`,
        tags: ['bactokil', 'lanzamiento', 'cross_selling', '9500'],
        variables: ['cliente']
    },
    {
        id: 'bactokil-opcion-3-escurrimiento',
        categoria: 'bactokil',
        titulo: 'Bactokil Opción 3: Desinfectante que no se escurre',
        descripcion: 'Pregunta socrática que ataca la ineficiencia de los desinfectantes comunes.',
        texto: `Una pregunta rápida don/doña {cliente}: ¿Has notado que algunos desinfectantes comunes se escurren de inmediato por las paredes y no alcanzan a actuar el tiempo necesario para matar bacterias y hongos?

Formulamos *Bactokil* con una densidad especial y amonios cuaternarios de 5ª generación que se adhieren a la superficie sin generar gases tóxicos ni dañar la ropa. Por solo *$9.500* el litro de ensayo te aseguramos una desinfección total. ¿Lo incluimos en tu paquete?`,
        tags: ['bactokil', 'objecion_calidad', 'efectividad'],
        variables: ['cliente']
    },

    // ─── 6. CUENTAS BANCARIAS Y MEDIOS DE PAGO ───
    {
        id: 'medios-de-pago-oficiales',
        categoria: 'pagos_cuentas',
        titulo: 'Cuentas Bancarias Oficiales de Fábrica',
        descripcion: 'Datos exactos de Daviplata, Bancolombia, Nequi y Wompi.',
        texto: `Manejamos dos Medios de Pago muy cómodos para ti:
✅ *Pago Contraentrega en Efectivo* al recibir tu pedido en Bogotá y Soacha.
✅ *Anticipado por Transferencia Directa* a las cuentas oficiales de la empresa:

🏦 *Bancolombia Cuenta de Ahorros:*
No. 525 371640 18
Titular: Danilo Espinal Ospina (CC 80.762.849)

📱 *Daviplata:*
No. 319 208 1201 — Sandra Liliana Garzón Delgado (CC 1.012.324.636)
No. 319 299 7211 — Yolanda Delgado (CC 39.681.075)

📱 *Nequi:*
No. 319 208 1201 — Yolanda Delgado (CC 39.681.075)

💳 *Pago con Tarjeta / PSE (Wompi):*
https://checkout.wompi.co/l/VPOS_cnfFDd

Por favor compártenos el comprobante cuando realices la transacción para que el domiciliario lo lleve registrado en su planilla. ¡Gracias!`,
        tags: ['cuentas', 'bancolombia', 'daviplata', 'nequi', 'wompi'],
        variables: []
    },

    // ─── 7. MANEJO DE OBJECIONES ───
    {
        id: 'objecion-fabricantes-directos',
        categoria: 'objeciones',
        titulo: 'Objeción: ¿Por qué confiar en Biocambio360?',
        descripcion: 'Garantía de fábrica 100%, sin intermediarios y respaldo de 30 días.',
        texto: `Te garantizamos todos nuestros productos al 100% ya que *somos fabricantes directos en Soacha y no intermediarios* 🏭.

Nuestras fórmulas biodegradables concentradas cuentan con registro y certificado de análisis de calidad. Además, cuentas con *30 días calendario de garantía de fábrica* desde la entrega del producto. Si no estás completamente satisfecho/a con el rendimiento de la fórmula, te brindamos soporte técnico inmediato o cambio de producto. ¡Nuestra prioridad es tu tranquilidad!`,
        tags: ['garantia', 'fabricantes', 'calidad', 'confianza'],
        variables: []
    }
];

/**
 * Reemplaza dinámicamente las variables en el texto del guión
 */
export function interpolateScript(
    template: string,
    vars: {
        cliente?: string;
        asesor?: string;
        producto?: string;
        total?: string;
        ciudad?: string;
        enlace_referido?: string;
    }
): string {
    let result = template;
    result = result.replace(/\{cliente\}/g, vars.cliente || 'Estimado/a cliente');
    result = result.replace(/\{asesor\}/g, vars.asesor || 'Asesor Biocambio360');
    result = result.replace(/\{producto\}/g, vars.producto || 'Detergente Líquido');
    result = result.replace(/\{total\}/g, vars.total || '$0');
    result = result.replace(/\{ciudad\}/g, vars.ciudad || 'tu ciudad');
    result = result.replace(/\{enlace_referido\}/g, vars.enlace_referido || 'https://biocambio360.com/comunidad');
    return result;
}
