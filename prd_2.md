<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# [https://biocambio360.com/pages/oferta-especial-kit-matrimonio](https://biocambio360.com/pages/oferta-especial-kit-matrimonio)

[https://biocambio360.com/pages/oferta-megacombo-2](https://biocambio360.com/pages/oferta-megacombo-2)
[https://biocambio360.com/pages/oferta-megacombo-3-el-equilibrio-perfecto](https://biocambio360.com/pages/oferta-megacombo-3-el-equilibrio-perfecto)
[https://biocambio360.com/pages/oferta-megacombo-4](https://biocambio360.com/pages/oferta-megacombo-4)

teniendo en cuenta que se va a renovar el sitio web de biocambio360 se tiene este listado de productos y se quiere crear una UI y UX moderna, amigable, fácil de usar, con alta percepción de valor que priorice kits, combos, como los uqe te envío en los enlaces  ¿qué crees que debería llevar esta interfaz? como debería ser un PRD para implementarlo

esta es la base de otra marca de la misma empresa que puede servir como inspiración: [https://www.productospajarito.com/](https://www.productospajarito.com/)

Sí: para BioCambio360 yo haría una interfaz claramente orientada a **comprar soluciones**, no solo productos sueltos. La UI/UX debe vender kits por caso de uso, transmitir confianza para reducir fricción de compra online, y luego usar el catálogo unitario como respaldo y no como protagonista principal.[^1][^2]

## Enfoque UX

La evidencia que compartiste apunta a una necesidad estratégica muy clara: BioCambio360 quiere crecer con una comunicación que combine percepción premium, confianza y rendimiento, mientras impulsa kits como “la opción más inteligente” para optimizar la compra. Además, los buyer persona definidos para la marca ya contemplan CTAs específicos de kits, como “Kit Anfitrión 5 Estrellas” y “Kit Restaurante Impecable”, lo que confirma que la arquitectura del sitio debe girar alrededor de soluciones empaquetadas y no solo SKUs aislados.[^2]

La inspiración de Pajarito funciona bien por tres motivos: presenta ahorro visible, simplifica tamaños/presentaciones, usa recomendaciones dentro del carrito, y hace tangible el beneficio económico del combo con mensajes como envío gratis, ahorro estimado y productos sugeridos. Esa lógica es especialmente útil para BioCambio360 porque el listado de precios muestra muchas referencias, formatos y líneas, lo que hace necesario un sistema que reduzca complejidad y agrupe oferta por intención de compra.[^1]

## Qué debe llevar la interfaz

La home debería abrir con un hero centrado en kits prioritarios, no en categorías genéricas: “Kits para hogar”, “Kits para Airbnb”, “Kits para restaurante”, “Kits institucionales” y “Reposición por volumen”. Cada bloque debe incluir 4 elementos visibles sin entrar al detalle: para quién es, qué problema resuelve, cuánto ahorra frente a compra separada, y un CTA doble “Ver kit” / “Comprar ahora”.[^2][^1]

Las piezas clave de la interfaz serían:

- Navegación principal por soluciones: Kits, Combos, Por industria, Por espacio, Catálogo unitario, Mayoreo/B2B.
- Buscador con lenguaje natural: “kit para baño”, “productos para Airbnb”, “combo para cocina”.
- Tarjetas de kit con foto limpia, ahorro en pesos, rendimiento estimado, nivel de uso, y sello de confianza.
- PDP de kit con “qué incluye”, “para cuántos usos alcanza”, “por qué conviene este combo”, “comprados juntos frecuentemente” y “subir o bajar nivel del kit”.
- Carrito inteligente con upsells por compatibilidad, peso/cupo logístico, umbral de envío gratis y ahorro incremental, igual que la lógica vista en Pajarito.[^1]
- Bloques persistentes de confianza: pago contraentrega, ubicación física, rastreo, soporte humano, testimonios, política clara de cambios.[^2]


## Arquitectura recomendada

Yo propondría una arquitectura híbrida, donde el primer nivel sea por solución y el segundo por producto. Eso encaja mejor con los perfiles definidos: familias que quieren ahorro, anfitrionas premium que priorizan rapidez y reseñas, restaurantes que buscan desempeño industrial, y compradores corporativos que necesitan volumen y abastecimiento.[^2]

Una estructura sugerida sería:


| Sección | Objetivo |
| :-- | :-- |
| Home | Priorizar kits estrella, prueba social, beneficios y acceso rápido a soluciones [^2] |
| Landing de kits | Página índice con filtros por tipo de cliente, presupuesto, espacio y frecuencia de uso [^2] |
| Landing por segmento | Airbnb, restaurantes, hogar, oficinas, institucional, automotriz, etc., según portafolio y buyer persona [^2][^1] |
| PDP de kit | Vender el paquete completo, explicar composición, ahorro, reposición y alternativas [^1] |
| PDP de producto unitario | Servir soporte comparativo o recompra, no ser el principal camino de entrada [^1] |
| Carrito | Maximizar ticket medio con upsells contextuales, ahorro y logística visible [^1] |
| B2B / Cotización | Capturar volumen, frecuencia, cobertura y necesidad de abastecimiento [^2] |

## Componentes UI clave

Para que la percepción de valor suba, la interfaz debe hacer visible el beneficio económico y funcional en cada paso. El Excel muestra un portafolio amplio con formatos repetidos por tamaño y línea, así que conviene usar componentes que comparen rendimiento, formato y ahorro sin saturar la pantalla.[^1]

Componentes prioritarios:

- **Mega menú** por necesidad: desinfección, cocina, lavandería, pisos, baños, olores, institucional.
- Selector de perfil: hogar, anfitrión, negocio, empresa.
- “Quiz” breve de recomendación: espacio, frecuencia, tipo de suciedad, presupuesto.
- Cards de kit con badges: más vendido, ideal para Airbnb, industrial, ahorro top.
- Tabla comparativa ligera entre kit básico, recomendado y pro.
- Calculadora de rendimiento: “este kit te dura X semanas”.
- Módulo de recompra: “repón solo lo que más usas”.
- Barra sticky móvil con precio, ahorro y CTA.
- Carrito lateral con recomendaciones por compatibilidad, no por simple cross-sell.[^1]


## Lineamientos visuales

No llevaría BioCambio360 hacia una estética demasiado “eco-artesanal”, porque el documento estratégico insiste en proyectar excelencia, confianza y capacidad de servicio, especialmente para clientes de alto valor y Bogotá. Haría una marca visual más sobria, moderna y técnica: superficies claras, tipografía sans contemporánea, acentos de color por categoría, fotografía de producto consistente y bloques de información muy escaneables.[^2]

La percepción premium vendría de:

- Jerarquía tipográfica limpia.
- Mucho espacio en blanco.
- Tarjetas grandes con composición editorial.
- Mensajes de ahorro y rendimiento como prueba, no como grito promocional.
- Microcopys de seguridad: “Tu inversión está segura”, “Pago contraentrega disponible”, “Proveedor con punto físico”.[^2]
- Iconografía funcional y no decorativa.
- Motion sutil en hover, stepper de cantidad, bundle builder y carrito.


## PRD sugerido

El PRD debería estar orientado a negocio, UX, catálogo y conversión. No solo a “rediseñar la web”, sino a implementar un ecommerce de soluciones con priorización de kits y flujos diferenciados para B2C y B2B.[^1][^2]

### 1. Contexto

BioCambio360 renovará su sitio para mejorar conversión, percepción de valor y confianza, priorizando kits y combos sobre venta unitaria. La estrategia debe responder a buyer personas ya definidos y a un portafolio amplio con múltiples referencias y presentaciones.[^1][^2]

### 2. Objetivos

- Incrementar conversión de kits/combos.
- Aumentar ticket promedio por bundle y upsell.
- Reducir fricción de compra en usuarios nuevos.
- Mejorar captura de leads B2B.
- Facilitar recompra y reposición.[^2][^1]


### 3. KPIs

- % de sesiones que visitan landing de kits.
- % de órdenes con kit vs producto unitario.
- AOV.
- Tasa de add-to-cart desde card de kit.
- Conversión checkout.
- % de upsell aceptado en carrito.
- Leads B2B calificados.
- Tiempo para encontrar producto o solución.[^1][^2]


### 4. Usuarios

- Familiar orientado a ahorro.
- Anfitriona premium/Airbnb.
- Comprador cauteloso que necesita confianza.
- Administrador de restaurante.
- Comprador corporativo.
- Usuario orientado a valores y transparencia.[^2]


### 5. Propuesta de valor

“Comprar por solución, con ahorro real, respaldo visible y entrega confiable.” Esta propuesta resume mejor lo que el documento estratégico pide comunicar a BioCambio360.[^2]

### 6. Alcance funcional MVP

- Home orientada a kits.
- Lister de kits y combos.
- PDP de kit.
- PDP de producto unitario.
- Carrito lateral inteligente.
- Checkout simplificado.
- Landing B2B con formulario/cotización.
- Buscador y filtros.
- CMS para gestionar kits, badges, ahorro, composición y orden de prioridad.[^1][^2]


### 7. Requisitos funcionales

- El sistema debe permitir agrupar productos en kits con nombre, narrativa, ahorro, segmento y stock dependiente.
- Debe mostrar ahorro real comparando bundle vs suma de componentes.
- Debe soportar recomendaciones dinámicas en carrito.
- Debe permitir filtros por industria, necesidad, formato, aroma y presupuesto.
- Debe distinguir flujos B2C y B2B.
- Debe exponer señales de confianza en header, PDP, carrito y checkout.[^1][^2]


### 8. Requisitos de contenido

- Naming de kits.
- Copy por caso de uso.
- Promesas de rendimiento.
- Prueba social y testimonios.
- FAQs por segmento.
- Políticas visibles.
- Mensajes de confianza y origen.[^2]


### 9. Requisitos UX

- Mobile first.
- CTA sticky en móvil.
- Máximo 3 pasos para llegar de home a compra.
- Ficha de kit escaneable en menos de 10 segundos.
- Carrito editable sin salir de contexto.
- Estados claros de envío, ahorro y recomendación.[^1]


### 10. Requisitos no funcionales

- Carga rápida en móvil.
- SEO técnico sólido.
- Integración con analytics y eventos.
- CMS amigable para marketing.
- Accesibilidad AA.
- Escalabilidad para nuevos kits y nuevas líneas.[^1]


### 11. Eventos de analítica

- view_home_kit_module
- select_kit_card
- open_bundle_pdp
- add_bundle_to_cart
- accept_cart_upsell
- start_checkout
- submit_b2b_form
- use_solution_filter
- complete_purchase[^1]


### 12. Roadmap

- Fase 1: research, IA, design system, wireframes.
- Fase 2: UI alta fidelidad y prototipo.
- Fase 3: desarrollo ecommerce MVP.
- Fase 4: tracking, QA, contenido, lanzamiento.
- Fase 5: optimización con tests A/B sobre kits, badges y upsells.


## Prioridades concretas

Si tuviera que definir las 5 apuestas más importantes del rediseño, serían estas:

- Home y navegación pensadas para kits primero.[^2]
- PDP de kit mucho mejor que la PDP de producto unitario.[^1]
- Carrito con upsell logístico y ahorro incremental, inspirado en Pajarito.[^1]
- Capa fuerte de confianza para usuarios cautelosos: punto físico, contraentrega, soporte humano, rastreo.[^2]
- Segmentación visible para Airbnb, hogar, restaurante y corporativo, porque ya existe esa base estratégica.[^2]


## Recomendación de implementación

Yo no haría un ecommerce “catálogo tradicional” con menú por categorías químicas. Haría un ecommerce tipo “solution commerce”: entrada por necesidad, kit como héroe comercial, producto unitario como soporte, y B2B como camino paralelo con cotización, frecuencia y volumen.[^2][^1]

Si te sirve, en el siguiente paso te puedo entregar el PRD ya redactado en formato profesional, con estructura lista para desarrollo, historias de usuario, criterios de aceptación y sitemap.
<span style="display:none">[^3][^4][^5]</span>

<div align="center">⁂</div>

[^1]: PRECIOS-2026.xlsx

[^2]: dbb64dcd0f7df98409a4fa45a887c1c7-5.pdf

[^3]: image-2.jpg

[^4]: image-3.jpg

[^5]: image-4.jpg

