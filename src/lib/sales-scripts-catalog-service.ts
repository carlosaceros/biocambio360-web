import { PRODUCTOS } from './products-data';

export interface SalesScriptTemplate {
    id: string;
    titulo: string;
    categoria:
        | 'alertas_entrega'
        | 'alertas_recompra'
        | 'productos_precios'
        | 'combos_promociones'
        | 'fletes_cobertura'
        | 'pagos_cuentas'
        | 'objeciones_confianza'
        | 'programa_referidos'
        | 'toma_pedido';
    etiquetas: string[];
    descripcion: string;
    template: string;
    referenciaWord?: string;
    destacado?: boolean;
}

export interface ScriptVariables {
    cliente?: string;
    asesor?: string;
    producto?: string;
    tamano?: string;
    total?: number | string;
    ciudad?: string;
    direccion?: string;
    fechaEntrega?: string;
    codigoReferido?: string;
    guiaSeguimiento?: string;
}

export const SALES_SCRIPT_CATEGORIES = [
    { id: 'alertas_entrega', label: 'Alertas de Entrega Mañana' },
    { id: 'alertas_recompra', label: 'Alertas de Recompra' },
    { id: 'productos_precios', label: 'Fichas y Precios de Productos' },
    { id: 'combos_promociones', label: 'Súper Combos y Promociones' },
    { id: 'fletes_cobertura', label: 'Fletes y Cobertura Nacional' },
    { id: 'pagos_cuentas', label: 'Medios de Pago y Cuentas Oficiales' },
    { id: 'objeciones_confianza', label: 'Manejo de Objeciones y Confianza' },
    { id: 'programa_referidos', label: 'Programa de Referidos y Embajadores' },
    { id: 'toma_pedido', label: 'Toma de Datos y Cierre de Pedido' }
];

// Helper para extraer precios dinámicos del catálogo de productos en tiempo real (SIN IA)
export function getCatalogLivePrice(productIdOrTerm: string, sizeKey: string = '20L', fallback: number = 86000): number {
    const term = productIdOrTerm.toLowerCase();
    
    // 1. Coincidencia exacta de ID
    let prod = PRODUCTOS.find(p => p.id.toLowerCase() === term);

    // 2. Si no es búsqueda explícita de kit o combo, buscar producto individual sin prefijo kit/combo
    if (!prod && !term.includes('combo') && !term.includes('kit')) {
        prod = PRODUCTOS.find(p => 
            !p.id.startsWith('kit-') && 
            !p.id.startsWith('combo-') && 
            (p.id.toLowerCase().includes(term) || p.nombre.toLowerCase().includes(term))
        );
    }

    // 3. Fallback a cualquier coincidencia
    if (!prod) {
        prod = PRODUCTOS.find(p => 
            p.id.toLowerCase().includes(term) || 
            p.nombre.toLowerCase().includes(term)
        );
    }

    if (!prod || !prod.precios) return fallback;

    // Buscar la presentación exacta o normalizada
    if (prod.precios[sizeKey]) return prod.precios[sizeKey];
    if (sizeKey === '20L' && prod.precios['20L']) return prod.precios['20L'];
    if ((sizeKey === '3.8L' || sizeKey === '4L' || sizeKey === 'GALON') && (prod.precios['3.8L'] || prod.precios['GALON'])) {
        return prod.precios['3.8L'] || prod.precios['GALON'] || fallback;
    }
    if (prod.precios['COMBO']) return prod.precios['COMBO'];

    // Primer precio disponible
    const firstVal = Object.values(prod.precios)[0];
    return typeof firstVal === 'number' ? firstVal : fallback;
}

export function formatScriptCurrency(amount: number): string {
    return `$${Math.round(amount).toLocaleString('es-CO')}`;
}

// Obtener precios dinámicos actuales del catálogo de la tienda
export function getLiveCatalogPrices() {
    const pDetergente20L = getCatalogLivePrice('detergente', '20L', 86000);
    const pDetergenteGalon = getCatalogLivePrice('detergente', '3.8L', 29000);
    const pDesengrasante20L = getCatalogLivePrice('desengrasante', '20L', 98000);
    const pDesengrasanteGalon = getCatalogLivePrice('desengrasante', '3.8L', 32000);
    const pSuavizante20L = getCatalogLivePrice('suavizante', '20L', 78000);
    const pLavaloza20L = getCatalogLivePrice('lavaloza', '20L', 76000);
    const pLimpiapisos20L = getCatalogLivePrice('limpiapisos', '20L', 68000);
    const pComboDuo = getCatalogLivePrice('combo-duo', 'COMBO', 119000);
    const pKitCompleto = getCatalogLivePrice('kit-limpieza-completo', 'COMBO', 148500);

    return {
        detergente20L: pDetergente20L,
        detergenteLitro: Math.round(pDetergente20L / 20),
        detergenteGalon: pDetergenteGalon,
        desengrasante20L: pDesengrasante20L,
        desengrasanteLitro: Math.round(pDesengrasante20L / 20),
        desengrasanteGalon: pDesengrasanteGalon,
        suavizante20L: pSuavizante20L,
        suavizanteLitro: Math.round(pSuavizante20L / 20),
        lavaloza20L: pLavaloza20L,
        lavalozaLitro: Math.round(pLavaloza20L / 20),
        limpiapisos20L: pLimpiapisos20L,
        limpiapisosLitro: Math.round(pLimpiapisos20L / 20),
        comboDuo: pComboDuo,
        kitCompleto: pKitCompleto,
        llaveRegistro: 19000
    };
}

// Catálogo base de guiones 100% fiel a TEXTOS RESPUESTA BIOCAMBIO360_2025.docx y mejorado sin fricción
export const RAW_SALES_SCRIPTS_CATALOG: SalesScriptTemplate[] = [
    // ─── 1. PROTOCOLO DE ALERTAS DE ENTREGA ────────────────────────────
    {
        id: 'alerta-entrega-manana',
        titulo: 'Alerta Entrega Día Siguiente (Oficial)',
        categoria: 'alertas_entrega',
        etiquetas: ['Alerta', 'Entrega', 'Mañana', 'Contraentrega'],
        descripcion: 'Mensaje rotativo que se envía a última hora de la tarde al cliente cuyo pedido se entregará mañana.',
        referenciaWord: 'P329: Alerta Entrega',
        destacado: true,
        template: `🖐Hola {cliente}, cordial saludo de *BioCambio360* Productos de Limpieza. 🌱

👉 Te informo que tu pedido de *{producto}* será entregado el día *{fecha_entrega}* 🚗🛵, por favor estar atentos para recibirlo.

💰 Valor a pagar: *{total}* (Pago contraentrega)
📍 Dirección confirmada: *{direccion}*

👉 Si eres tan amable de regalarnos tu *UBICACIÓN ACTUAL POR WHATSAPP* 📍 por si el domiciliario necesita mayor precisión en la ruta.

👉 Te recomendamos por favor si te surge algún inconveniente o necesitas reprogramar la franja horaria, informarnos con anticipación. ¡Muchas gracias por elegirnos! 🙌`
    },
    {
        id: 'alerta-entrega-no-confirmacion',
        titulo: 'Alerta Entrega: Reintento por No Confirmación',
        categoria: 'alertas_entrega',
        etiquetas: ['Alerta', 'Reintento', 'Ubicación'],
        descripcion: 'Cuando el cliente no ha respondido la alerta previa para asegurar la ruta del domiciliario.',
        referenciaWord: 'P339: No Confirmación Alerta',
        destacado: false,
        template: `🙏 Hola {cliente}, te agradecemos nos confirmes si el día de mañana podemos llevar a cabo la entrega de tu pedido de *{producto}* ❓

👉 Si eres tan amable de regalarnos tu *UBICACIÓN ACTUAL* 📍 para agilizar la entrega de tu pedido y asegurar que el domiciliario llegue sin contratiempos. 🛵📦`
    },
    {
        id: 'alerta-entrega-guia-nacional',
        titulo: 'Alerta Envío Nacional con Guía y Transportadora',
        categoria: 'alertas_entrega',
        etiquetas: ['Guía', 'Nacional', 'Transportadora', 'Seguimiento'],
        descripcion: 'Envío de número de guía nacional con instrucciones de inspección al recibir el producto.',
        referenciaWord: 'P910: Revisión Entregas Exxe',
        destacado: false,
        template: `👋🏻 Hola {cliente}, cordial saludo de *BioCambio360* productos de limpieza de alta concentración.

Apreciado cliente, a continuación te compartimos los datos de tu guía para seguimiento a tu entrega:
🚛 Guía de rastreo: *{guia_seguimiento}*
📦 Producto: *{producto}*

👉 Te agradecemos en el momento de tu entrega tener en cuenta:
✅ Verificar que tus garrafas estén en óptimo estado.
✅ El producto cuenta con precinto de seguridad hermético directo de fábrica.
✅ Si tu pedido fue pagado anticipado, no debes realizar ningún pago adicional. En caso de contraentrega, tener listo el valor exacto de *{total}*.

¡Quedamos atentos a cualquier inquietud durante el trayecto! 📲`
    },

    // ─── 2. PROTOCOLO DE ALERTAS DE RECOMPRA ───────────────────────────
    {
        id: 'alerta-recompra-detergente',
        titulo: 'Alerta Recompra: Detergente Líquido Bicarbonato',
        categoria: 'alertas_recompra',
        etiquetas: ['Recompra', 'Detergente', 'Bicarbonato', 'Fidelización'],
        descripcion: 'Seguimiento cordial a clientes que adquirieron detergente hace 45-60 días.',
        referenciaWord: 'P950: Campaña Ropa',
        destacado: true,
        template: `🖐 Hola {cliente}, cordial saludo de *BioCambio360*. Te saluda {asesor} 🧑🏻‍💻

Esperamos que estés disfrutando el aroma primaveral y la máxima limpieza en tu ropa con nuestra fórmula con *Bicarbonato Activo*. 🫧✨

Calculamos que tu garrafa de 20L debe estar en su última fase de rendimiento. Queremos consentirte en tu recompra:
✅ Garrafa de 20 Litros a solo *{precio_detergente_20l}* (⭐ A solo *{precio_detergente_litro}/Litro* ⭐)
✅ *Domicilio completamente GRATIS* en Bogotá y Soacha 🏠🛵
✅ Pago Contraentrega al recibir en tu puerta.

¿Te gustaría que te agendemos tu garrafa de reposición para que nunca te falte en tu hogar? 😊👇`
    },
    {
        id: 'alerta-recompra-desengrasante',
        titulo: 'Alerta Recompra: Desengrasante Industrial Multiusos',
        categoria: 'alertas_recompra',
        etiquetas: ['Recompra', 'Desengrasante', 'Cocina', 'Taller'],
        descripcion: 'Para clientes de negocios, restaurantes, hogares y talleres.',
        referenciaWord: 'P474: Desengrasante 20LT',
        destacado: false,
        template: `🖐 Hola {cliente}, cordial saludo de parte de {asesor} en *BioCambio360* 🧽💧

¿Cómo te ha parecido el poder arrancagrasa del Desengrasante Concentrado en tus superficies y cocina?

Sabemos que mantener tus espacios impecables es prioridad. Por ser cliente fiel de la casa:
✅ Caneca de 20 Litros a precio preferencial de *{precio_desengrasante_20l}* (LITRO a *{precio_desengrasante_litro}*)
✅ Rinde para más de 100 diluciones en agua.
✅ Domicilio prioritario con entrega en 24-48 horas y pago contraentrega.

¿Deseas que te despachemos una garrafa para esta semana? Quedo muy atento. 👨‍💼`
    },

    // ─── 3. PRODUCTOS & PRECIOS DINÁMICOS ──────────────────────────────
    {
        id: 'producto-detergente-ropa-20l',
        titulo: 'Ficha & Oferta: Jabón Líquido para Ropa 20L',
        categoria: 'productos_precios',
        etiquetas: ['Detergente', '20 Litros', 'Bicarbonato', 'Rey'],
        descripcion: 'Guión base de venta del producto estrella con precios dinámicos de la tienda virtual.',
        referenciaWord: 'P160 & P950: Jabón para Ropa 20L',
        destacado: true,
        template: `🖐 Hola {cliente}, cordial saludo de *BioCambio360* Productos de Limpieza de alta concentración.
🤵‍♂️ Mi nombre es {asesor}, es un gusto atenderte hoy.

✅ La garrafa de *20 Litros de Jabón Líquido para Ropa* te cuesta *{precio_detergente_20l}*.
✅ Al llevar los 20 litros cada litro te sale a solo ⭐*LITRO {precio_detergente_litro}*⭐
✅ Formulado tipo Jabón Tradicional Concentrado con *DESENGRASANTE TEXTIL y BICARBONATO*, que elimina grasa y manchas difíciles sin desgastar las fibras ni desteñir.
✅ Rinde para más de 280 lavadas porque viene espeso y concentrado.
✅ Aroma Primaveral Floral intenso y duradero.
✅ Compatible con lavadoras automáticas HE y tradicionales de carga frontal o superior (baja espuma controlada).

*📢 DOMICILIO GRATIS EN BOGOTÁ Y ZONAS ALEDAÑAS ‼🎁🛵🏠*
Pago contraentrega en efectivo o transferencia al recibir.

¿Cuántas garrafas te gustaría agendar para tu entrega? 🫧`
    },
    {
        id: 'producto-desengrasante-industrial-20l',
        titulo: 'Ficha & Oferta: Desengrasante Industrial 20L',
        categoria: 'productos_precios',
        etiquetas: ['Desengrasante', 'Industrial', 'Motores', 'Grasa'],
        descripcion: 'Formulación para grasa pesada, cocinas industriales, talleres y pisos.',
        referenciaWord: 'P488 & P964: Desengrasante Industrial 20LT',
        destacado: true,
        template: `🖐 Hola {cliente}, con mucho gusto te brindo la información:

✅ La garrafa de 20 Litros de *Desengrasante Industrial Multiusos* te cuesta *{precio_desengrasante_20l}*.
✅ Cada litro te sale a ⭐*LITRO {precio_desengrasante_litro}*⭐
✅ Cuenta con una concentración activa que permite dilución de hasta 1 en 5 partes de agua para limpieza general, o puro para motores y grasa quemada.
✅ Libre de soda cáustica agresiva, protege metales y superficies.
✅ Aroma agradable madera cítrica.

*📢 DOMICILIO GRATIS EN BOGOTÁ Y SOACHA ‼🎁🛵🏠*
¿Te agendamos tu pedido con entrega contraentrega? 🧼`
    },
    {
        id: 'producto-suavizante-textil-20l',
        titulo: 'Ficha & Oferta: Suavizante Textil 20L Microcápsulas',
        categoria: 'productos_precios',
        etiquetas: ['Suavizante', 'Ropa', 'Aroma', 'Microcápsulas'],
        descripcion: 'Suavizante con fragancia que perdura en las prendas.',
        referenciaWord: 'P526: Suavizante 20 LT',
        destacado: false,
        template: `🖐 Hola {cliente}, te comparto los detalles de nuestro *Suavizante Textil*:

✅ Garrafa de 20 Litros por solo *{precio_suavizante_20l}* (⭐ *{precio_suavizante_litro}/Litro* ⭐).
✅ Nueva formulación con *microcápsulas de fragancia activa* que liberan aroma con el movimiento y el planchado.
✅ Fragancias disponibles: 🌺 *Floral Primaveral* o 🍏 *Manzana Verde*.
✅ Deja las fibras suaves, facilita el planchado y reduce la estática.

*Incluye Domicilio Gratis en Bogotá y Soacha con pago contraentrega.* 🏠🛵
¿Cuál aroma prefieres que te enviemos?`
    },
    {
        id: 'producto-llave-registro-dosificadora',
        titulo: 'Accesorio: Llave / Válvula Dosificadora para Garrafa 20L',
        categoria: 'productos_precios',
        etiquetas: ['Llave', 'Registro', 'Dosificador', 'Accesorio'],
        descripcion: 'Explicación del uso y costo de la llave registro para garrafas de 20 litros.',
        referenciaWord: 'P344 & P350: Registro/Llave Uso y Compra',
        destacado: false,
        template: `🚰 El precio de la *Llave Dosificadora (Registro)* es de *{precio_llave}* adicionales. 🤩

✅ Se compra *una única vez* y puedes reutilizarla en todas las garrafas de 20 Litros que compres en el futuro.
✅ Te permite servir el producto cómodamente sin necesidad de levantar o voltear la garrafa pesada de 20 kilos.
✅ Para su uso óptimo, la primera vez se retira la contratapa de ventilación superior para que ingrese aire y fluya con excelente presión. 🚰

¿Te gustaría agregar la llave dosificadora a tu pedido por solo *{precio_llave}*? 😊`
    },

    // ─── 4. COMBOS Y PROMOCIONES ───────────────────────────────────────
    {
        id: 'combo-duo-10-10',
        titulo: 'Súper Combo Dúo 10L/10L (Detergente + Desengrasante)',
        categoria: 'combos_promociones',
        etiquetas: ['Combo', 'Dúo', '10 Litros', 'Oferta'],
        descripcion: 'El combo más vendido: 2 bidones de 10L (20L totales).',
        referenciaWord: 'P253 & P267: Súper Combos en Promoción',
        destacado: true,
        template: `💖👉 *SÚPER COMBO DÚO 10L/10L EN PROMOCIÓN* 💖
Lleva 20 Litros de limpieza total con *DOMICILIO COMPLETAMENTE GRATIS* 🚐🛵💨

Incluye:
1️⃣ *Bidón 10 Litros:* Jabón Líquido Ropa con Bicarbonato Activo.
2️⃣ *Bidón 10 Litros:* Desengrasante Textil y Multiusos Concentrado.

💰 Precio de Oferta: *{precio_combo_duo}*
(Te estás ahorrando más de $30.000 COP frente a compras individuales).

✅ Domicilio Gratis en Bogotá y municipios aledaños.
✅ Pago Contraentrega al recibir en tu puerta.

¿Deseas aprovechar esta promoción y recibirlo mañana mismo? 🚽🧹💧`
    },
    {
        id: 'combo-garrafa-mas-galon',
        titulo: 'Promoción: Garrafa 20L + Galón Adicional con Descuento',
        categoria: 'combos_promociones',
        etiquetas: ['Garrafa', 'Galón', 'Cross-sell', 'Descuento'],
        descripcion: 'Oferta de venta cruzada de un galón adicional sin costo de flete extra.',
        referenciaWord: 'P294 & P884: Combo Garrafa + Galón',
        destacado: false,
        template: `🎁 *OFERTA ESPECIAL POR TU COMPRA* 🤩
Por la compra de tu Garrafa de 20 Litros, tienes derecho a llevar un *Galón de 4 Litros adicional* (Suavizante, Desengrasante, Lavaloza o Limpiapisos) con precio especial de fábrica y *CERO COSTO ADICIONAL DE ENVÍO*. 🛒

👉 Galón de 4 Litros en oferta: desde *$29.000*.
Aprovechas el mismo flete y dejas tu dotación completa de limpieza para los próximos 3 meses.

¿Te gustaría agregar un galón a tu entrega de mañana? 😊👇`
    },

    // ─── 5. FLETES Y COBERTURA (TRANSPARENCIA DE FÁBRICA) ──────────────
    {
        id: 'flete-bogota-soacha-gratis',
        titulo: 'Flete Local: Bogotá D.C. y Soacha (100% Gratis)',
        categoria: 'fletes_cobertura',
        etiquetas: ['Bogotá', 'Soacha', 'Gratis', 'Local'],
        descripcion: 'Confirmación de entrega local sin ningún recargo.',
        referenciaWord: 'P178: Domicilio Gratis en Bogotá y Soacha',
        destacado: true,
        template: `🛵 *DOMICILIO COMPLETAMENTE GRATIS EN BOGOTÁ Y SOACHA* 🎁🏠

Te informamos que para la ciudad de Bogotá (las 20 localidades) y el municipio de Soacha, el *domicilio es 100% GRATIS* directo de nuestra fábrica en San Nicolás.

✅ No pagas ni un solo peso de flete.
✅ Entrega ágil en 24 a 48 horas.
✅ Pagas en efectivo o transferencia únicamente cuando recibes tus productos. 🤝`
    },
    {
        id: 'flete-nacional-subsidiado',
        titulo: 'Flete Nacional: Cobertura Subsidiada de Fábrica (Cero Fricción)',
        categoria: 'fletes_cobertura',
        etiquetas: ['Nacional', 'Subsidiado', 'Beneficio', 'Fabrica'],
        descripcion: 'Explicación del subsidio que asume Biocambio360 en los fletes nacionales para no generar rechazo.',
        referenciaWord: 'P890: Entrega a Nivel Nacional (Mejorado)',
        destacado: true,
        template: `🚛 *ENVÍO NACIONAL CON BENEFICIO DIRECTO DE FÁBRICA* 🇨🇴

¡Claro que sí! Hacemos despachos a nivel nacional a través de nuestras transportadoras aliadas.

👉 En *BioCambio360 asumimos y subsidiamos la mayor parte del costo del flete nacional*, dejándote una tarifa mínima muy económica como un beneficio directo de fábrica para que disfrutes de productos industriales en tu ciudad.

💡 *Tip de Ahorro:* Si agregas una segunda garrafa o un galón al mismo pedido, el costo por unidad de envío baja notablemente porque optimizamos el volumen de carga.

Indícanos por favor tu Ciudad o Municipio y te cotizamos el envío con el subsidio aplicado de inmediato. 📲`
    },
    {
        id: 'flete-sin-cobertura-amable',
        titulo: 'Zona sin Cobertura Directa (Alternativa Cercana)',
        categoria: 'fletes_cobertura',
        etiquetas: ['Sin Cobertura', 'Alternativa', 'Amable'],
        descripcion: 'Manejo elegante cuando la transportadora no llega a un municipio remoto.',
        referenciaWord: 'P360: No Cobertura',
        destacado: false,
        template: `🖐 Hola {cliente}, cordial saludo de *BioCambio360*.

Por el momento nuestras transportadoras aliadas no cuentan con ruta directa regular en tu vereda o municipio.

💡 *Alternativa que eligen muchos clientes:* Si tienes un familiar, amigo o lugar de trabajo en la cabecera municipal principal o en Bogotá/Soacha, te lo podemos entregar allí sin problema (incluso con domicilio gratis en la sabana) para que ellos te lo reciban.

¡Esperamos muy pronto seguir expandiendo nuestras rutas hasta tu puerta! 🙏🌱`
    },

    // ─── 6. PAGOS Y CUENTAS OFICIALES ──────────────────────────────────
    {
        id: 'medios-de-pago-oficiales',
        titulo: 'Medios de Pago Oficiales y Cuentas de Transferencia',
        categoria: 'pagos_cuentas',
        etiquetas: ['Cuentas', 'Bancolombia', 'Daviplata', 'Nequi', 'Wompi'],
        descripcion: 'Cuentas bancarias oficiales de los fundadores con nombres y cédulas registradas en el SGC.',
        referenciaWord: 'P21: Modo de Pago & Cuentas Oficiales',
        destacado: true,
        template: `💳 *MEDIOS DE PAGO OFICIALES BIOCAMBIO360* 🛡️

Manejamos total flexibilidad para tu tranquilidad:

1️⃣ *PAGO CONTRAENTREGA EN EFECTIVO:*
Pagas únicamente cuando recibes el producto en tu puerta en Bogotá, Soacha y municipios con ruta.

2️⃣ *TRANSFERENCIAS OFICIALES DIRECTAS:*
Si prefieres pagar por transferencia bancaria anticipada:

🟡 *Bancolombia (Cuenta de Ahorros):*
*No. 525 371640 18*
Titular: *Danilo Espinal Ospina* (C.C. 1.012.324.636)

🔴 *Daviplata Oficial:*
*319 208 1201*
Titular: *Sandra Liliana Garzón* (C.C. 39.681.075)

🟣 *Nequi Oficial:*
*300 654 2853* / *319 208 1201*

3️⃣ *PAGO EN LÍNEA CON TARJETA O PSE / ADDI:*
Puedes pagar en nuestra plataforma web https://biocambio360.com mediante Wompi (Bancolombia) o Addi en 3 cuotas sin interés.

*Nota:* Una vez realices la transferencia, por favor compártenos el comprobante por este chat para verificarlo en tesorería y despachar de inmediato. ✅`
    },

    // ─── 7. MANEJO DE OBJECIONES & CREDIBILIDAD ────────────────────────
    {
        id: 'objecion-desconfianza-estafas',
        titulo: 'Manejo de Objeción: Desconfianza de Compras por Internet',
        categoria: 'objeciones_confianza',
        etiquetas: ['Objeción', 'Seguridad', 'Contraentrega', 'Confianza'],
        descripcion: 'Brinda total tranquilidad explicando que somos fabricantes y el pago es contraentrega.',
        referenciaWord: 'P906: Credibilidad y Confianza',
        destacado: true,
        template: `🖐 Hola {cliente}, comprendemos perfectamente tu preocupación. Hoy en día es muy prudente cuidar las compras por internet debido a tantas malas experiencias con intermediarios.

Por esa misma razón en *BioCambio360* trabajamos con total transparencia:
1. *Pagas Contraentrega:* No tienes que transferir un solo peso por adelantado. El dinero solo sale de tus manos cuando el domiciliario llega a tu casa y tú tienes tus garrafas físicamente al frente.
2. *Somos Fabricantes Nacionales:* Nuestra planta y bodega principal está ubicada en Soacha (San Nicolás, Calle 45 Sur No. 7C - 60) y contamos con registro mercantil y certificados de calidad SGC.
3. *Garantía de Satisfacción:* Si el producto presenta alguna novedad en el sellado, el domiciliario te lo reemplaza de inmediato sin costo.

Tu compra con nosotros es 100% segura y con el respaldo directo de fábrica. 🤝 ¿Deseas que agendemos tu pedido para entrega?`
    },
    {
        id: 'objecion-espuma-vs-concentracion',
        titulo: 'Manejo de Objeción: ¿Por qué no hace tanta espuma como los de tienda?',
        categoria: 'objeciones_confianza',
        etiquetas: ['Espuma', 'Lavadoras HE', 'Bicarbonato', 'Rendimiento'],
        descripcion: 'Explica la química industrial: los agentes químicos de limpieza limpian las fibras, la espuma innecesaria solo desgasta mangueras.',
        referenciaWord: 'P964: Jabón Industrial & Espuma Controlada',
        destacado: false,
        template: `🧼 Excelente pregunta {cliente}. En la industria química profesional existe un mito muy común: creer que *"a más espuma, más limpio"*.

La realidad técnica es diferente:
✅ La espuma es solo un agente visual generado por espesantes artificiales. Lo que realmente desmancha y desprende el mugre son los *tensoactivos concentrados y el Bicarbonato Activo*.
✅ Nuestro jabón cuenta con *Espuma Controlada de Alta Eficiencia (HE)*: limpia a profundidad entre las fibras textiles sin saturar el tambor ni dejar residuos jabonosos en las mangueras de tu lavadora.
✅ Esto te permite ahorrar miles de litros de agua en los enjuagues y prolonga la vida útil de tu electrodoméstico.

¡Vas a notar la diferencia desde la primera lavada con prendas verdaderamente suaves, desmanchadas y con aroma inconfundible! 🌿👚`
    },

    // ─── 8. PROGRAMA DE REFERIDOS ──────────────────────────────────────
    {
        id: 'referidos-invitacion-amigos',
        titulo: 'Programa de Referidos: Invitación y Beneficios',
        categoria: 'programa_referidos',
        etiquetas: ['Referidos', 'Comisión 20%', 'Descuento 10%', 'Premios'],
        descripcion: 'Guión para invitar a un cliente fiel a convertirse en embajador y ganar comisiones.',
        referenciaWord: 'P972: Referidos Texto Inicial',
        destacado: true,
        template: `🩵 Nos alegra enormemente tu satisfacción con nuestros productos, {cliente}. 🫂

Por ser un cliente especial de la casa, te queremos invitar a nuestro *CLUB DE EMBAJADORES Y REFERIDOS BIOCAMBIO360*:

1️⃣ 🤩 *Ganas el 20% de comisión* en saldo redimible o dinero por cada compra que realicen tus amigos o familiares con tu código. 💵
2️⃣ 🤓 *Tu referido recibe 10% de descuento de bienvenida* o un bono de $10.000 en su primer pedido. 🎁
3️⃣ 🧐 *¡Garrafa de 20L GRATIS!:* Al completar 10 amigos referidos, te obsequiamos una caneca de 20 Litros completamente gratis directo a tu puerta.

👉 Tu enlace único para compartir por WhatsApp es:
*{enlace_referido}*

¿A qué vecino, familiar o amigo de tu conjunto le recomendarías ahorrar en aseo hoy mismo? 🫧🧼`
    },

    // ─── 9. TOMA DE DATOS Y CIERRE DE PEDIDO ────────────────────────────
    {
        id: 'toma-datos-cliente-cierre',
        titulo: 'Toma de Datos para Registro de Pedido',
        categoria: 'toma_pedido',
        etiquetas: ['Datos', 'Cierre', 'Dirección', 'Registro'],
        descripcion: 'Formato estándar y cortés para solicitar los datos completos de despacho.',
        referenciaWord: 'P397: Texto Pedido',
        destacado: true,
        template: `🖐 ¡Con el mayor gusto {cliente}! Para agendar tu entrega y generar tu orden de despacho, por favor facilítanos los siguientes datos:

1️⃣ Nombre y Apellido completos:
2️⃣ Número de Cédula o NIT:
3️⃣ Teléfono celular de contacto:
4️⃣ Ciudad y Municipio:
5️⃣ Barrio y Localidad:
6️⃣ Dirección exacta de entrega:
7️⃣ (Si vives en conjunto o edificio: Nombre del conjunto, Torre/Bloque y Apartamento):
8️⃣ Método de pago preferido: (Contraentrega en efectivo / Transferencia anticipada)

Con estos datos te agendamos de inmediato en la ruta de mañana. ¡Muchas gracias! 📋🛵`
    }
];

// Compilador puro de plantillas de texto (SIN IA, 0 ms)
export function compileSalesScript(script: SalesScriptTemplate, vars: ScriptVariables): string {
    const prices = getLiveCatalogPrices();

    const clientName = vars.cliente?.trim() || 'Apreciado cliente';
    const advisorName = vars.asesor?.trim() || 'tu Asesor Comercial';
    const productName = vars.producto?.trim() || 'Jabón Líquido para Ropa 20L';
    const address = vars.direccion?.trim() || 'tu dirección de entrega';
    const deliveryDate = vars.fechaEntrega?.trim() || 'MAÑANA';
    const trackingCode = vars.guiaSeguimiento?.trim() || '99E-123456';
    const refLink = vars.codigoReferido
        ? `https://biocambio360.com/?ref=${vars.codigoReferido.trim()}`
        : 'https://biocambio360.com/comunidad';

    let totalStr = '';
    if (typeof vars.total === 'number') {
        totalStr = formatScriptCurrency(vars.total);
    } else if (typeof vars.total === 'string' && vars.total.trim()) {
        totalStr = vars.total.trim();
    } else {
        totalStr = formatScriptCurrency(prices.detergente20L);
    }

    let text = script.template;

    // Sustituir variables de contexto
    text = text.replace(/\{cliente\}/g, clientName);
    text = text.replace(/\{asesor\}/g, advisorName);
    text = text.replace(/\{producto\}/g, productName);
    text = text.replace(/\{direccion\}/g, address);
    text = text.replace(/\{total\}/g, totalStr);
    text = text.replace(/\{fecha_entrega\}/g, deliveryDate);
    text = text.replace(/\{guia_seguimiento\}/g, trackingCode);
    text = text.replace(/\{enlace_referido\}/g, refLink);

    // Sustituir precios dinámicos de catálogo (SIN IA)
    text = text.replace(/\{precio_detergente_20l\}/g, formatScriptCurrency(prices.detergente20L));
    text = text.replace(/\{precio_detergente_litro\}/g, formatScriptCurrency(prices.detergenteLitro));
    text = text.replace(/\{precio_detergente_galon\}/g, formatScriptCurrency(prices.detergenteGalon));
    text = text.replace(/\{precio_desengrasante_20l\}/g, formatScriptCurrency(prices.desengrasante20L));
    text = text.replace(/\{precio_desengrasante_litro\}/g, formatScriptCurrency(prices.desengrasanteLitro));
    text = text.replace(/\{precio_desengrasante_galon\}/g, formatScriptCurrency(prices.desengrasanteGalon));
    text = text.replace(/\{precio_suavizante_20l\}/g, formatScriptCurrency(prices.suavizante20L));
    text = text.replace(/\{precio_suavizante_litro\}/g, formatScriptCurrency(prices.suavizanteLitro));
    text = text.replace(/\{precio_combo_duo\}/g, formatScriptCurrency(prices.comboDuo));
    text = text.replace(/\{precio_kit_completo\}/g, formatScriptCurrency(prices.kitCompleto));
    text = text.replace(/\{precio_llave\}/g, formatScriptCurrency(prices.llaveRegistro));

    return text;
}

// Obtener todos los guiones precompilados en caliente (0 ms)
export function getAllCompiledSalesScripts(vars: ScriptVariables = {}): (SalesScriptTemplate & { textoCompilado: string })[] {
    return RAW_SALES_SCRIPTS_CATALOG.map(script => ({
        ...script,
        textoCompilado: compileSalesScript(script, vars)
    }));
}
