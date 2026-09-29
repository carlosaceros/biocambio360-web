/**
 * Mapa mental de capacitación — Biocambio360
 * Todo el contenido vive aquí como datos. Cada fase del proyecto de capacitación agrega o
 * profundiza los "hijos" de una rama, sin tocar el motor de render (index.html / styles.css).
 *
 * Estructura de cada nodo hijo:
 *   { titulo, desc, fase? }
 *   - fase: si el contenido completo de este punto se profundiza en una fase futura del mapa,
 *     se muestra una etiqueta "Se profundiza en la Fase N" junto al texto resumen actual.
 */

const MAPA = {
    titulo: 'Biocambio360',
    subtitulo: 'Ciclo completo del cliente: del primer contacto a la fidelización',
    ramas: [
        {
            id: 'origen-crm',
            icono: '🎯',
            color: '#2D6EB5',
            titulo: 'Origen del Lead y CRM',
            resumen: 'De dónde llega un cliente nuevo y qué guardamos de él desde el primer contacto.',
            hijos: [
                {
                    titulo: 'Canales de entrada',
                    desc: 'Un lead puede llegar por WhatsApp (línea Biocambio360 o Total Limpieza), Instagram, Messenger, la tienda virtual, pauta de Meta/Google, tráfico orgánico, referidos o el punto de venta físico. No importa por dónde entre: todo cae en la misma Bandeja de Mensajes, así nunca se pierde un cliente por estar disperso en varios lugares.',
                    enlaces: [{ label: 'Abrir Bandeja de Mensajes', url: 'https://biocambio360.com/admin/inbox' }],
                },
                {
                    titulo: 'Sistema de asignación de leads',
                    desc: 'Solo lo ven coordinadores/administradores, desde la barra lateral de la conversación. La "Asignación automática" decide en este orden: (1) Historial — si este cliente ya fue atendido antes por un asesor que sigue activo, vuelve con el mismo; (2) Carga — si no, elige al asesor con menos conversaciones abiertas en este momento; (3) Rotación — si hay empate, elige a quien lleva más tiempo sin recibir un cliente nuevo. Solo participan usuarios con rol Asesor en estado activo, y la asignación NO le envía ningún mensaje al cliente. También se puede asignar a mano eligiendo el asesor de una lista, que muestra cuántas conversaciones activas tiene cada uno. Esto evita dos problemas comunes: que un cliente quede "huérfano" sin nadie a cargo, o que dos asesores le escriban al mismo tiempo sin saberlo.',
                    enlaces: [{ label: 'Abrir Bandeja de Mensajes', url: 'https://biocambio360.com/admin/inbox' }],
                },
                {
                    titulo: 'Ficha de cada cliente (CRM)',
                    desc: 'Cada cliente tiene una ficha con su nombre, dirección, ciudad, historial de pedidos, productos que ha comprado, método de pago preferido, horario de contacto preferido y un resumen de la última conversación. Así, cualquier asesor que retome el chat —aunque no haya sido quien lo atendió antes— no empieza de cero ni hace sentir al cliente que "no lo conocemos". El perfil completo (con más detalle que la vista rápida del chat) se abre desde el módulo de Clientes.',
                    enlaces: [{ label: 'Abrir módulo de Clientes', url: 'https://biocambio360.com/admin/clientes' }],
                },
                {
                    titulo: 'Barra lateral del chat: la ficha "en vivo" del cliente',
                    desc: 'Al abrir cualquier conversación, el panel derecho muestra todo lo que hace falta para atenderla bien sin salir del chat. De arriba a abajo:',
                    enlaces: [{ label: 'Abrir Bandeja de Mensajes', url: 'https://biocambio360.com/admin/inbox' }],
                    subitems: [
                        {
                            titulo: '🎯 Origen: anuncio de Meta',
                            desc: 'Si el lead llegó haciendo clic en un anuncio de Facebook/Instagram, aquí aparece el titular y el texto exactos de ESE anuncio, con un enlace para verlo. Así el asesor sabe qué oferta o mensaje vio el cliente antes de escribir, y puede seguirle la conversación con ese mismo contexto en vez de empezar a ciegas.',
                        },
                        {
                            titulo: '🛒 Carrito abandonado',
                            desc: 'Si el cliente dejó productos sin pagar en la web, aquí se ve qué dejó, el total, si ya se recuperó o sigue sin comprar, y el detalle de cada recordatorio enviado (hasta 3 por correo y 3 por WhatsApp), si el cliente abrió el correo o hizo clic en el link.',
                        },
                        {
                            titulo: '✨ Agente IA',
                            desc: 'Botones para "Activar ahora" (el agente le escribe de inmediato retomando la conversación), "Programar" (elegir fecha y hora exactas) o "Desactivar en este chat". También muestra la nota-resumen que el propio agente dejó sobre esa conversación.',
                        },
                        {
                            titulo: '✨ Lead del Asistente IA (pre-pedido)',
                            desc: 'Cuando el agente IA atendió la conversación, aquí queda su borrador de pedido: productos, cantidad, datos de entrega, forma de pago y horario de contacto — con un estado (Borrador / Listo para confirmar / Confirmado) y un botón para que el asesor lo confirme como pedido real después de validarlo.',
                        },
                        {
                            titulo: '✅ Venta cerrada por WhatsApp',
                            desc: 'Un campo simple para que el asesor registre el valor de una venta cerrada por chat. Al guardarla, el sistema la reporta automáticamente a Meta (Conversions API) para que las campañas de pauta aprendan qué conversaciones sí terminaron en venta — sin este registro, Meta no se entera de esa venta y no puede optimizar la pauta con ese dato.',
                        },
                        {
                            titulo: '👤 Asignación de Lead',
                            desc: 'Solo para coordinadores/administradores: a quién está asignada la conversación, el botón de asignación automática con su explicación ("¿Cómo decide?"), asignación manual, y la carga actual de cada asesor.',
                        },
                        {
                            titulo: '📋 Perfil CRM',
                            desc: 'Correo, ciudad, si es cliente B2C (hogar) o B2B (empresa), total de pedidos, total gastado histórico, fecha y productos del último pedido — con enlaces directos a su perfil completo y a su temporizador de reabastecimiento.',
                        },
                        {
                            titulo: '🏷️ Etiquetas',
                            desc: 'Marcas rápidas sobre la conversación (por ejemplo, si es un carrito abandonado) para filtrar y encontrar conversaciones similares después.',
                        },
                    ],
                },
                {
                    titulo: 'SARLAFT',
                    desc: 'Sistema de Autocontrol y Gestión del Riesgo Integral de Lavado de Activos, Financiación del Terrorismo y Financiamiento de Armas de Destrucción Masiva — un requisito normativo, no un capricho interno. Desde la ficha del cliente, se puede correr una verificación que compara su nombre (con tolerancia a errores de escritura) contra una lista de personas expuestas públicamente y listas restrictivas conocidas. El resultado queda como Pendiente, Verificado o Rechazado. Cuando un cliente queda en revisión o rechazado, el asesor sigue el protocolo indicado sin excepciones ni atajos, así implique pedir información adicional antes de continuar con la venta.',
                    enlaces: [{ label: 'Abrir módulo de Clientes', url: 'https://biocambio360.com/admin/clientes' }],
                },
                {
                    titulo: 'Cotizador B2B',
                    desc: 'Canal de entrada propio para clientes empresariales o mayoristas: arman su propia cotización directamente en la web (sin pasar por WhatsApp), lo que agiliza el primer contacto con negocios que ya saben exactamente qué necesitan y en qué volumen. Las cotizaciones generadas quedan centralizadas para que un coordinador les haga seguimiento.',
                    enlaces: [
                        { label: 'Ver cotizador (público)', url: 'https://biocambio360.com/cotizador-b2b' },
                        { label: 'Abrir cotizaciones B2B (admin)', url: 'https://biocambio360.com/admin/cotizaciones-b2b' },
                    ],
                },
            ],
        },
        {
            id: 'atencion-ia',
            icono: '💬',
            color: '#E91E8C',
            titulo: 'Atención, Chat y Agente IA',
            resumen: 'Cómo se atiende cada conversación y en qué momento entra a ayudar la inteligencia artificial.',
            hijos: [
                {
                    titulo: 'Bandeja unificada',
                    desc: 'WhatsApp, Messenger e Instagram conviven en un solo lugar. Se puede filtrar por canal (pestañas), por estado (Abiertos, Asignados, Bot, Cerrados) y por cuenta de WhatsApp (Biocambio360 o Total Limpieza), buscar por nombre/teléfono/texto, y el contador de "no leídos" avisa en el título de la pestaña del navegador aunque esté minimizada.',
                    enlaces: [{ label: 'Abrir Bandeja de Mensajes', url: 'https://biocambio360.com/admin/inbox' }],
                },
                {
                    titulo: 'Ficha del cliente y Pedido rápido, sin salir del chat',
                    desc: 'En la cabecera de cada conversación hay dos botones siempre visibles (no hace falta abrir el panel lateral, que en pantallas de menos de 1280px de ancho ni siquiera aparece): "Ficha del cliente" y "Crear pedido". Si el cliente ya existe, la ficha se abre como un panel deslizable con su historial completo de compras, opción de reordenar productos anteriores y notas de CRM — la misma pieza que usa el Punto de Venta, así la experiencia es igual en toda la plataforma. Si el cliente es nuevo, un formulario mínimo (nombre y celular ya vienen del chat) lo crea en segundos y pasa a mostrar la ficha recién creada. "Crear pedido" abre el mismo Pedido Rápido de los asesores, precargado con los datos de esa conversación. Todo esto se abre encima del chat sin perder el hilo: al cerrar, se vuelve exactamente a donde se estaba.',
                    enlaces: [{ label: 'Abrir Bandeja de Mensajes', url: 'https://biocambio360.com/admin/inbox' }],
                },
                {
                    titulo: 'Interruptor global del Agente IA vs. activación por chat',
                    desc: 'Son dos cosas distintas y es fácil confundirlas: el botón "Agente IA activo/pausado" de la barra superior enciende o apaga la IA para TODA la operación (por ejemplo, si el equipo va a estar disponible toda la noche por algo puntual, se puede pausar globalmente). El botón "Activar ahora" de cada chat (barra lateral, ya visto en la Fase 2) solo fuerza ESE chat puntual. Si el interruptor global está apagado, ningún chat responde automático aunque se intente activar uno solo.',
                    enlaces: [{ label: 'Abrir Bandeja de Mensajes', url: 'https://biocambio360.com/admin/inbox' }],
                },
                {
                    titulo: 'Cuándo actúa el Agente IA',
                    desc: 'El agente solo responde automáticamente cuando NO hay un asesor humano conectado (fuera del horario real de cobertura del equipo). Si un humano está atendiendo el chat, la IA se queda en silencio: nunca interrumpe ni compite con un asesor activo. Tiene además límites de seguridad por conversación (un máximo de turnos y de "strikes" por noche) para evitar loops o abusos.',
                },
                {
                    titulo: 'Memoria del cliente',
                    desc: 'El agente recuerda el nombre, la dirección de pedidos anteriores, los productos que ya pidió y el resumen de conversaciones pasadas — evita repetir preguntas que el cliente ya respondió antes, aunque hayan pasado semanas.',
                },
                {
                    titulo: 'Tarjetas de producto y catálogo visual',
                    desc: 'Cuando el cliente pregunta por un producto puntual, el sistema puede enviarle una tarjeta con foto, descripción y todas sus presentaciones con precio (en vez de solo texto plano). El botón 📚 del chat envía el catálogo visual completo organizado por categorías — mucho más fácil de navegar que el PDF plano de antes, y funciona igual en WhatsApp e Instagram.',
                    enlaces: [{ label: 'Ver catálogo visual (público)', url: 'https://biocambio360.com/catalogo' }],
                },
                {
                    titulo: 'Ángulos de mensaje para leads de pauta (A/B)',
                    desc: 'Cuando el lead llega por un anuncio de Meta, el primer mensaje del agente varía el "ángulo" (curiosidad, beneficio directo, llamado a la acción directo, o urgencia) siguiendo principios de copywriting reconocidos (Schwartz, Ogilvy, Isra Bravo). Esto no es al azar: se mide qué ángulo cierra más ventas por tipo de anuncio, para mejorar con datos reales en vez de intuición.',
                },
                {
                    titulo: 'Banco de Textos y guiones comerciales',
                    desc: 'Biblioteca oficial de mensajes y guiones (compartida también con Kommo CRM), con precios dinámicos de la tienda y copiado en un clic — la base para que cualquier asesor responda rápido y con el mensaje correcto, sin improvisar cada vez.',
                    enlaces: [{ label: 'Abrir Banco de Textos', url: 'https://biocambio360.com/admin/banco-textos' }],
                },
                {
                    titulo: 'Entrenamiento del Agente IA',
                    desc: 'Panel donde se ajustan las reglas y los ejemplos que sigue el agente para responder mejor, sin necesidad de tocar código — así el equipo comercial puede afinar su comportamiento con la experiencia del día a día.',
                    enlaces: [{ label: 'Abrir Entrenamiento IA', url: 'https://biocambio360.com/admin/entrenamiento-ia' }],
                },
                {
                    titulo: 'Campañas de WhatsApp (difusiones masivas)',
                    desc: 'Módulo nuevo pensado para reemplazar y mejorar lo que antes solo se hacía desde Kommo: se elige la línea de envío (Biocambio360 o Total Limpieza), una plantilla ya aprobada por Meta, y la audiencia — por filtro de Clientes (etapa, búsqueda, solo activos) o pegando una lista de números a mano. Si la plantilla tiene variables, se puede rellenar automáticamente con el nombre de cada cliente o dejar un texto fijo igual para todos. Antes de enviar, siempre muestra primero el costo estimado (en USD y en pesos) y cuántos quedaron excluidos (número inválido o clientes que pidieron no recibir promociones), y pide confirmación explícita. Cada mensaje enviado queda registrado en la Bandeja de Mensajes: si el cliente responde, la conversación sigue en el mismo chat de siempre, no se queda aparte. Solo lo pueden enviar directores o superadministradores, y queda un historial de cada campaña (plantilla, cuántos, costo).',
                    enlaces: [{ label: 'Abrir Campañas de WhatsApp', url: 'https://biocambio360.com/admin/campanas' }],
                },
            ],
        },
        {
            id: 'protocolo-asesor',
            icono: '📋',
            color: '#7C3AED',
            titulo: 'Protocolo de Venta del Asesor',
            resumen: 'El paso a paso que debería seguir un asesor comercial en pleno ejercicio de venta.',
            hijos: [
                {
                    titulo: '1. Apertura con guion',
                    desc: 'Saludo cálido, identificar la necesidad real del cliente y apoyarse en el Banco de Textos como punto de partida — no como un libreto rígido, sino como base para no perder tiempo redactando desde cero. Si el lead viene de un anuncio, seguirle el mismo contexto que vio (ver el recuadro de "Origen: anuncio de Meta" en la barra lateral, Fase 2) en vez de empezar desde cero.',
                    enlaces: [{ label: 'Abrir Banco de Textos', url: 'https://biocambio360.com/admin/banco-textos' }],
                },
                {
                    titulo: '2. Toma de pedido',
                    desc: 'Registrar producto, presentación (medio galón, galón, 10 litros o 20 litros), cantidad, dirección exacta y ciudad — siempre confirmando cada dato en voz alta con el cliente antes de dar por cerrado el pedido. Si el cliente dice "la misma dirección de siempre", se busca en su historial de pedidos (de cualquier canal) y se le repite la dirección encontrada palabra por palabra para que confirme — nunca se asume en silencio ni se le pide que la reescriba si ya la tenemos.',
                },
                {
                    titulo: '3. Cotización de envío sin salir del chat',
                    desc: 'Botón 🚚 junto al cuadro de texto del chat: se elige departamento y ciudad, cuántas unidades de cada presentación (medio galón, galón, 10L, 20L) y si el pago es contra entrega. Cotiza en tiempo real con el operador logístico, muestra el subsidio que Biocambio360 aplica al flete, y con un clic inserta el mensaje listo para enviar al cliente. Si la zona es de envío gratis se lo dice con seguridad; si no, da un valor aproximado y aclara que el asesor confirma el valor final antes de despachar — así se sigue con el cierre sin quedar frenado esperando una cifra exacta.',
                    enlaces: [{ label: 'Abrir Bandeja de Mensajes', url: 'https://biocambio360.com/admin/inbox' }],
                },
                {
                    titulo: '4. Manejo de objeciones',
                    desc: 'Apoyarse en beneficios reales del producto (rendimiento, ingredientes, diferenciales frente a la competencia) en vez de quedarse solo en el precio — el mismo principio que ahora sigue el agente IA al cotizar, para que la venta no se enfríe justo en el momento de dar la cifra.',
                },
                {
                    titulo: '5. Cierre y posventa inmediata',
                    desc: 'Confirmar el pedido completo, el medio de pago y dejar claro el siguiente paso (cuándo se despacha). Registrar la venta con "Marcar venta cerrada" en la barra lateral (Fase 2) para que quede reportada a las campañas de pauta. La posventa empieza aquí mismo: un cliente que sabe qué esperar reclama menos y confía más.',
                },
            ],
        },
        {
            id: 'cierre-pagos',
            icono: '💳',
            color: '#059669',
            titulo: 'Cierre de Venta y Medios de Pago',
            resumen: 'Las herramientas para convertir un pedido acordado en una venta cerrada.',
            hijos: [
                {
                    titulo: 'Pedido rápido (toma de pedido express)',
                    desc: 'Herramienta que usa el asesor para armar un pedido completo en segundos durante una llamada o un chat, sin saltar entre pantallas (atajo de teclado Ctrl+N). Para un borrador basta nombre y celular; para un pedido completo se necesita además la dirección. El flete se cotiza solo mientras se escribe, con opción de editarlo manualmente si el asesor ya acordó un valor distinto con el cliente. Tiene dos puertas de entrada: desde el Cockpit de Asesores, o directamente desde el botón "Crear pedido" en la cabecera de cualquier chat de la Bandeja de Mensajes (Fase 3), ya precargado con los datos de ese cliente.',
                    enlaces: [{ label: 'Abrir Asesores (Pedido Rápido)', url: 'https://biocambio360.com/admin/asesores' }],
                },
                {
                    titulo: 'Medios de pago',
                    desc: 'Contraentrega, Wompi (tarjeta, PSE, Nequi, transferencia Bancolombia), Addi (compra ahora y paga después a cuotas), transferencia bancaria directa, efectivo en punto de venta y Sistecrédito. Importante: Wompi y Addi NUNCA confirman el pago en el momento de la conversación — la confirmación real llega minutos después por una notificación automática del proveedor, así que nunca se le debe decir al cliente "ya vi que pagaste" hasta que el pedido lo muestre confirmado.',
                },
                {
                    titulo: 'Cupones de descuento',
                    desc: 'Cuatro tipos configurables: porcentaje de descuento, monto fijo en pesos, envío gratis, o "lleva X y paga Y" (combo especial). Se crean y administran desde un solo panel, con reporte de cuánto se ha usado cada uno.',
                    enlaces: [{ label: 'Abrir Cupones', url: 'https://biocambio360.com/admin/cupones' }],
                },
                {
                    titulo: 'Ruleta de descuento (Spin-to-Win)',
                    desc: 'Ventana emergente en la tienda virtual pensada para capturar prospectos nuevos y regalarles un cupón real (de los ya configurados) al girar. Se arma con hasta 15 casillas, mezclando premios con casillas "sin premio" ("a la próxima contarás con mejor suerte"), y se activa o desactiva con un solo interruptor sin tocar código. Vive en la misma pantalla de Cupones, en la pestaña Ruleta.',
                    enlaces: [{ label: 'Abrir configurador de Ruleta', url: 'https://biocambio360.com/admin/cupones' }],
                },
                {
                    titulo: 'Checkout pre-diligenciado (link de pago)',
                    desc: 'El mismo mecanismo de "link con token" se reutiliza en varios lugares: recuperación de carritos abandonados, el botón de cotización de envío del chat (Fase 3) cuando el pago es PSE, etc. El cliente abre el link y ya ve sus productos y datos cargados — solo tiene que confirmar y pagar, sin volver a escribir nada.',
                },
            ],
        },
        {
            id: 'postventa-fidelizacion',
            icono: '🔁',
            color: '#D97706',
            titulo: 'Postventa y Fidelización',
            resumen: 'Cómo se mantiene viva la relación con el cliente después de la primera compra.',
            hijos: [
                {
                    titulo: 'Alertas de recompra',
                    desc: 'El sistema calcula, a partir de la fecha del último pedido y cuánto rinde lo que compró, cuándo se le debería estar acabando el producto. Cada cliente queda en un semáforo: Surtido, Alerta temprana (≤25 días para quedarse sin producto), Crítico (≤10 días) o Vencido (ya se le debió acabar). Los recordatorios automáticos salen por la línea de WhatsApp de Total Limpieza (+57 323 604 5330), separada de la línea principal de ventas.',
                    enlaces: [{ label: 'Abrir Reabastecimiento', url: 'https://biocambio360.com/admin/reabastecimiento' }],
                },
                {
                    titulo: 'Carritos abandonados',
                    desc: 'Si alguien deja productos en el carrito sin pagar, recibe hasta 3 recordatorios en momentos exactos: a las 2 horas, a las 8 horas y a las 24 horas de su última actividad — siempre con un link de pago que ya trae sus datos y productos cargados. Van por correo si el cliente dejó uno, y por WhatsApp cuando ese canal está habilitado. Si el cliente termina comprando por cualquier medio, el carrito se marca "recuperado" automáticamente y deja de recibir mensajes.',
                    enlaces: [{ label: 'Abrir Carritos Abandonados', url: 'https://biocambio360.com/admin/carritos-abandonados' }],
                },
                {
                    titulo: 'Programa de referidos (Comunidad Biocambio360)',
                    desc: 'Cada cliente tiene un código de referido propio. La recompensa estándar es $10.000 COP para quien refiere y $10.000 COP de descuento para el amigo referido. Normalmente se activa como "embajador" después de una compra calificada, pero Diego, Fernando o un administrador pueden activarlo manualmente "a libre demanda" para casos especiales (Fase 2). Por seguridad, la recompensa no queda disponible de inmediato: entra en custodia 24 horas después de que el pedido referido se marca como entregado, para cubrir el caso de una cancelación de último momento.',
                    enlaces: [
                        { label: 'Ver Comunidad (público)', url: 'https://biocambio360.com/comunidad' },
                        { label: 'Abrir módulo de Referidos', url: 'https://biocambio360.com/admin/referidos' },
                    ],
                },
                {
                    titulo: 'Reactivación de conversaciones frías',
                    desc: 'Importante: esta función viene apagada por defecto — un director la debe activar explícitamente para que funcione. Cuando está activa, solo actúa sobre leads con intención real (llegaron por un anuncio o ya tienen un pre-pedido armado), nunca sobre chats sueltos: a las 2-6 horas de silencio manda un check-in cálido que retoma justo donde quedó; a las 8-20 horas, un cierre honesto y sutil (sin inventar urgencia falsa) antes de que se cierre la ventana de 24 horas de WhatsApp.',
                },
            ],
        },
        {
            id: 'logistica-pos-inventario',
            icono: '🚚',
            color: '#0891B2',
            titulo: 'Logística, Punto de Venta e Inventario',
            resumen: 'Todo lo que pasa después de que el pedido está confirmado, hasta que llega a la puerta del cliente.',
            hijos: [
                {
                    titulo: 'Calendario de rutas de entrega',
                    desc: 'Programación de entregas por zona con flota propia: cada zona tiene sus días de reparto asignados, para organizar el día sin depender solo de la memoria de quien coordina y para poder decirle al cliente por chat cuándo le llega su pedido (Fase 3).',
                    enlaces: [{ label: 'Abrir Rutas de Entrega', url: 'https://biocambio360.com/admin/rutas-entrega' }],
                },
                {
                    titulo: 'App "Ruta" para mensajeros',
                    desc: 'Vista móvil pensada para el mensajero: ve las entregas asignadas para el día (última milla) directamente desde su celular, con la misma cuenta con la que entra al resto de la plataforma (no es un enlace aparte ni una app distinta).',
                    enlaces: [{ label: 'Abrir vista de Ruta', url: 'https://biocambio360.com/mensajero' }],
                },
                {
                    titulo: 'Novedades de entrega',
                    desc: 'Cuando un pedido no se puede entregar, se registra el motivo exacto: cliente ausente, sin dinero, dirección errónea, solicitó reprogramación, rechazado, zona de difícil acceso, o perdido por la transportadora. Cada novedad queda con su resolución (reintento programado, devuelto a bodega, o reclamación al seguro de la transportadora) hasta cerrarse — nunca queda en el aire.',
                },
                {
                    titulo: 'Punto de venta (POS)',
                    desc: 'Flujo de ventas presenciales en el local físico, con su propio ticket y proceso de cobro independiente del flujo de WhatsApp. Funciona incluso sin conexión a internet: si se cae la señal, la venta se guarda localmente en el computador y se sincroniza sola con la plataforma en cuanto vuelve la conexión — no se pierde una venta por un corte de internet.',
                    enlaces: [{ label: 'Abrir Punto de Venta', url: 'https://biocambio360.com/admin/pos' }],
                },
                {
                    titulo: 'Inventario (niveles de stock)',
                    desc: 'Ojo con no confundirlo con "Reabastecimiento" de la Fase 5 (que es sobre CUÁNDO un cliente probablemente necesita volver a comprar): este módulo es sobre el stock real disponible de cada producto, con edición de precios con auditoría de cambios — para que un asesor nunca prometa algo que ya no hay.',
                    enlaces: [{ label: 'Abrir Inventario', url: 'https://biocambio360.com/admin/inventario' }],
                },
                {
                    titulo: 'Auditoría de envíos',
                    desc: 'Cada vez que se cotiza un flete (desde el checkout, el asesor o el botón del chat de la Fase 3) queda un registro: destino, costo cotizado, subsidio aplicado y transportadora — para controlar costos de envío y detectar variaciones fuera de lo normal.',
                    enlaces: [{ label: 'Abrir Auditoría de Envíos', url: 'https://biocambio360.com/admin/auditoria-envios' }],
                },
                {
                    titulo: 'Integración con sistema externo',
                    desc: 'Pedidos tomados en otro sistema de gestión (pedidos, inventario, materia prima y contabilidad) llegan automáticamente al tablero de Biocambio360, en la columna "Pendiente", con una insignia visible "🔗 Externo" para que un asesor valide dirección, productos y cotización antes de continuar — nunca se confirma ni despacha nada de forma automática.',
                    enlaces: [{ label: 'Abrir tablero de Pedidos', url: 'https://biocambio360.com/admin/pedidos' }],
                },
            ],
        },
        {
            id: 'produccion-mrp',
            icono: '🏭',
            color: '#DC2626',
            titulo: 'Producción (MRP)',
            resumen: 'Cómo se planea y controla la fabricación de cada producto.',
            hijos: [
                {
                    titulo: 'Lotes de producción y control de calidad',
                    desc: 'Cada lote avanza por un flujo real de calidad: Planeado → En mezclado → En empaque → Cuarentena → Aprobado o Rechazado. Nada sale a la venta sin pasar por esa cuarentena. La plataforma arranca con un histórico de referencia de más de 2.500 lotes para que los reportes no dependan de capturar todo desde cero.',
                    enlaces: [{ label: 'Abrir Producción', url: 'https://biocambio360.com/admin/produccion' }],
                },
                {
                    titulo: 'BOM y costeo (Inteligencia Industrial)',
                    desc: 'La "receta" exacta de cada producto (Bill of Materials) y su costo real de fabricación, insumo por insumo — vive dentro de Producción, en la pestaña "Inteligencia Industrial Big Data".',
                    enlaces: [{ label: 'Abrir Producción', url: 'https://biocambio360.com/admin/produccion' }],
                },
                {
                    titulo: 'Trazabilidad de lotes',
                    desc: 'Registro de qué materias primas se usaron, cuándo y quién liberó cada lote producido — clave si algún día hay que rastrear un problema de calidad hasta su origen exacto.',
                },
            ],
        },
        {
            id: 'gestion-kpis',
            icono: '📊',
            color: '#4F46E5',
            titulo: 'Gestión, KPIs e Informes',
            resumen: 'Cómo se mide el desempeño del equipo y de la operación en general.',
            hijos: [
                {
                    titulo: 'Tablero Kanban de pedidos',
                    desc: 'Cada pedido avanza por columnas: Pendiente → Confirmado → Preparación → Enviado → En camino → Entregado (o Novedad / Cancelado) — de un vistazo se sabe en qué punto está cada venta. Los pedidos que llegan del sistema externo (Fase 6) entran también aquí, marcados con su insignia especial.',
                    enlaces: [{ label: 'Abrir tablero de Pedidos', url: 'https://biocambio360.com/admin/pedidos' }],
                },
                {
                    titulo: 'KPIs de asesores y del Agente IA',
                    desc: 'Tiempo de primera respuesta a un lead nuevo (agrupado en rangos: menos de 5 min, 5-15 min, 15-60 min, 1-4 horas hábiles, más de 4 horas), tiempo hasta el cierre y ventas cerradas — por asesor y también del propio Agente IA, incluyendo qué "ángulo" de mensaje inicial convierte mejor en campañas de pauta (Fase 3). Sirve tanto para detectar quién necesita apoyo como para replicar lo que funciona.',
                    enlaces: [{ label: 'Abrir KPIs de IA', url: 'https://biocambio360.com/admin/kpis-ia' }],
                },
                {
                    titulo: 'Informe Comercial y de Rendimiento',
                    desc: 'Un solo tablero analítico que junta ventas, comportamiento de los asesores, dinámica de recompra y punto de venta — para ver el negocio completo sin saltar entre pantallas sueltas.',
                    enlaces: [{ label: 'Abrir Informe de Ventas', url: 'https://biocambio360.com/admin/informe-ventas' }],
                },
                {
                    titulo: 'Finanzas',
                    desc: 'Histórico y análisis financiero con balance en tiempo real: trazabilidad de ingresos, ticket promedio y rendimiento por periodo.',
                    enlaces: [{ label: 'Abrir Finanzas', url: 'https://biocambio360.com/admin/finanzas' }],
                },
                {
                    titulo: 'Usuarios y permisos',
                    desc: 'Control de acceso por rol, capacidades modulares (qué puede ver y hacer cada tipo de usuario) y trazabilidad de acciones bajo un enfoque de auditoría tipo ISO 9001 — queda registro de quién hizo qué.',
                    enlaces: [{ label: 'Abrir Usuarios & Auditoría', url: 'https://biocambio360.com/admin/usuarios' }],
                },
                {
                    titulo: 'PQRS',
                    desc: 'Peticiones, quejas, reclamos y sugerencias recibidos por WhatsApp. Cada caso llega ya con el resumen que el cliente dio y su horario de contacto preferido, con seguimiento hasta el cierre.',
                    enlaces: [{ label: 'Abrir PQRS', url: 'https://biocambio360.com/admin/pqrs' }],
                },
            ],
        },
    ],
};

// ─── Motor de render: línea de tiempo del viaje del cliente ───
// Cada rama es un paso pineado en la línea de tiempo. La tarjeta muestra solo título + resumen
// (vista rápida por tooltip); el detalle completo (hijos, enlaces, subitems) se abre en un modal,
// así ningún contenido se pierde y no se rompe el layout al ver varios pasos a la vez.

const norm = (s) =>
    (s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');

function highlight(text, query) {
    if (!query) return text;
    const idx = norm(text).indexOf(norm(query));
    if (idx === -1) return text;
    return (
        text.slice(0, idx) +
        '<mark>' + text.slice(idx, idx + query.length) + '</mark>' +
        text.slice(idx + query.length)
    );
}

function textoHijo(hijo) {
    return norm([hijo.titulo, hijo.desc, ...(hijo.subitems ?? []).flatMap((s) => [s.titulo, s.desc])].join(' '));
}

function coincidencias(rama, query) {
    if (!query) return { ramaMatch: true, hijoMatches: rama.hijos.map(() => false), alguna: true };
    const nq = norm(query);
    const ramaMatch = norm(rama.titulo + ' ' + rama.resumen).includes(nq);
    const hijoMatches = rama.hijos.map((h) => textoHijo(h).includes(nq));
    return { ramaMatch, hijoMatches, alguna: ramaMatch || hijoMatches.some(Boolean) };
}

function construirHijosHtml(hijos, query) {
    return hijos
        .map((hijo, i) => {
            let html = `
                <div class="hijo-titulo">${highlight(hijo.titulo, query)}</div>
                <div class="hijo-desc">${highlight(hijo.desc, query)}</div>
            `;

            if (hijo.enlaces?.length) {
                html += `<div class="hijo-enlaces">${hijo.enlaces
                    .map((e) => `<a href="${e.url}" target="_blank" rel="noopener">🔗 ${e.label}</a>`)
                    .join('')}</div>`;
            }

            if (hijo.subitems?.length) {
                html += '<ul class="subitems-lista">' + hijo.subitems.map((s) => `
                    <li class="subitem">
                        <div class="subitem-titulo">${highlight(s.titulo, query)}</div>
                        <div class="subitem-desc">${highlight(s.desc, query)}</div>
                    </li>
                `).join('') + '</ul>';
            }

            return `<li class="hijo" data-hijo-idx="${i}">${html}</li>`;
        })
        .join('');
}

let ultimoFoco = null;

function abrirModal(rama, query) {
    ultimoFoco = document.activeElement;

    document.getElementById('modal').style.setProperty('--modal-color', rama.color);
    document.getElementById('modalIcon').textContent = rama.icono;
    document.getElementById('modalTitle').innerHTML = highlight(rama.titulo, query);
    document.getElementById('modalResumen').innerHTML = highlight(rama.resumen, query);
    document.getElementById('modalBody').innerHTML =
        `<ul class="hijos-lista">${construirHijosHtml(rama.hijos, query)}</ul>`;

    const overlay = document.getElementById('modalOverlay');
    overlay.hidden = false;
    document.body.classList.add('modal-abierto');
    document.getElementById('modalClose').focus();

    if (query) {
        const { hijoMatches } = coincidencias(rama, query);
        const primerIdx = hijoMatches.findIndex(Boolean);
        if (primerIdx !== -1) {
            document
                .querySelector(`#modalBody .hijo[data-hijo-idx="${primerIdx}"]`)
                ?.scrollIntoView({ block: 'start' });
        }
    }
}

function cerrarModal() {
    document.getElementById('modalOverlay').hidden = true;
    document.body.classList.remove('modal-abierto');
    ultimoFoco?.focus();
}

function crearCardPin(rama, idx, query) {
    const { ramaMatch, hijoMatches, alguna } = coincidencias(rama, query);
    const soloCoincideAdentro = Boolean(query) && !ramaMatch && hijoMatches.some(Boolean);

    const wrap = document.createElement('div');
    wrap.className = 'card-pin' + (soloCoincideAdentro ? ' match-interno' : '');
    wrap.style.setProperty('--pin-color', rama.color);
    if (query && !alguna) wrap.classList.add('oculto');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card-pin-btn';
    btn.setAttribute('aria-haspopup', 'dialog');

    const previewHijos = rama.hijos
        .slice(0, 4)
        .map((h) => `<li>${highlight(h.titulo, query)}</li>`)
        .join('');
    const masTexto = rama.hijos.length > 4
        ? `<li class="card-tooltip-mas">+${rama.hijos.length - 4} más</li>`
        : '';

    const metaTexto = `Paso ${idx + 1} de ${MAPA.ramas.length} · ${rama.hijos.length} temas · clic para ver el detalle`
        + (soloCoincideAdentro ? ' · 🔍 coincidencia en el detalle' : '');

    btn.innerHTML = `
        <span class="card-pin-inner">
            <span class="card-pin-head">
                <span class="card-pin-icon">${rama.icono}</span>
                <span class="card-pin-num">${String(idx + 1).padStart(2, '0')}</span>
            </span>
            <span class="card-pin-title">${highlight(rama.titulo, query)}</span>
            <span class="card-pin-resumen">${highlight(rama.resumen, query)}</span>
            <span class="card-pin-meta">${metaTexto}</span>
        </span>
    `;
    btn.addEventListener('click', () => abrirModal(rama, query));

    const tooltip = document.createElement('div');
    tooltip.className = 'card-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.innerHTML = `<strong>Incluye</strong><ul>${previewHijos}${masTexto}</ul>`;

    wrap.appendChild(btn);
    wrap.appendChild(tooltip);
    return wrap;
}

function dibujarRuta() {
    const svg = document.querySelector('.timeline-path');
    const timeline = document.querySelector('.timeline');
    if (!svg || !timeline) return;

    if (window.innerWidth < 768) {
        svg.innerHTML = '';
        return;
    }

    const cards = Array.from(document.querySelectorAll('.card-pin:not(.oculto)'));
    if (cards.length < 2) {
        svg.innerHTML = '';
        return;
    }

    const trackRect = timeline.getBoundingClientRect();
    svg.setAttribute('width', trackRect.width);
    svg.setAttribute('height', trackRect.height);
    svg.setAttribute('viewBox', `0 0 ${trackRect.width} ${trackRect.height}`);

    const puntos = cards.map((c) => {
        const r = c.getBoundingClientRect();
        return {
            x: r.left - trackRect.left + r.width / 2,
            y: r.top - trackRect.top + r.height / 2,
        };
    });

    let d = `M ${puntos[0].x} ${puntos[0].y}`;
    for (let i = 1; i < puntos.length; i++) {
        const prev = puntos[i - 1];
        const cur = puntos[i];
        const midY = (prev.y + cur.y) / 2;
        d += ` C ${prev.x} ${midY}, ${cur.x} ${midY}, ${cur.x} ${cur.y}`;
    }

    svg.innerHTML = `<path d="${d}" class="timeline-path-line" />`;
}

function render(query = '') {
    const q = query.trim();
    const root = document.getElementById('mapa-root');
    root.className = 'timeline';
    root.innerHTML = '';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'timeline-path');
    svg.setAttribute('aria-hidden', 'true');
    root.appendChild(svg);

    const track = document.createElement('div');
    track.className = 'timeline-track';

    let totalVisibles = 0;
    MAPA.ramas.forEach((rama, idx) => {
        const card = crearCardPin(rama, idx, q);
        if (!card.classList.contains('oculto')) totalVisibles++;
        track.appendChild(card);
    });
    root.appendChild(track);

    const vacio = document.getElementById('sin-resultados');
    vacio.hidden = totalVisibles > 0;

    requestAnimationFrame(dibujarRuta);
}

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(dibujarRuta, 150);
});

document.addEventListener('DOMContentLoaded', () => {
    render();

    const searchInput = document.getElementById('search');
    searchInput.addEventListener('input', (e) => render(e.target.value));

    document.getElementById('modalClose').addEventListener('click', cerrarModal);
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target.id === 'modalOverlay') cerrarModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !document.getElementById('modalOverlay').hidden) cerrarModal();
    });
});
