# Especificación de cambios para Antigravity — Biocambio360

## 1. Contexto del trabajo

- **Proyecto:** tienda virtual Biocambio360.
- **Tecnología:** desarrollo personalizado en Next.js.
- **URL pública revisada:** https://biocambio360-web.vercel.app/
- **Fuente de solicitudes:** video de revisión `WhatsApp Video 2026-08-04 at 13.05.39.mp4`.
- **Duración del video:** 7 min 41 s.
- **Objetivo:** corregir datos de productos, descripciones, atributos técnicos, presentaciones, precios e imágenes antes de publicar la tienda.

Esta especificación interpreta y consolida las solicitudes del video. Las marcas de tiempo son aproximadas y sirven para localizar la evidencia original.

## 2. Resultado esperado

La tienda debe conservar el diseño, la navegación, el carrito y la experiencia visual actuales. Los cambios se concentran en la integridad de la información de producto:

1. Cada producto debe tener una descripción propia y coherente con su función.
2. Ningún producto debe heredar textos, propiedades químicas o casos de uso de otro.
3. Presentaciones y precios deben coincidir en tarjeta, vista rápida, detalle, carrito y metadatos.
4. Las afirmaciones químicas o comerciales deben provenir de fichas técnicas o de la tabla maestra aprobada.
5. Las imágenes suministradas deben quedar asociadas al producto y presentación correctos.

## 3. Reglas obligatorias de implementación

1. **Localizar la fuente única de datos de producto antes de editar.** Determinar si los productos viven en un archivo TypeScript/JSON, un seed, un CMS o una base de datos. Corregir la fuente de verdad; no parchear únicamente el componente visual.
2. **No inventar datos.** No crear porcentajes de biodegradabilidad, pH, tensioactivos, concentraciones, diluciones, precios, certificaciones, registros, rendimientos ni compatibilidades que no estén respaldados por la ficha técnica o la tabla maestra.
3. **No hacer reemplazos globales ciegos.** La frase correcta debe aplicarse en campos de sostenibilidad pertinentes, sin modificar expresiones distintas como “100% colombiano”.
4. **Actualizar todas las superficies consumidoras del mismo dato:** catálogo, tarjeta, chips de presentaciones, vista rápida, ficha detallada, total del carrito, buscador, filtros, datos estructurados, metadata y cualquier caché o estado derivado.
5. **Preservar la interfaz existente.** No rediseñar páginas, cambiar colores, tipografías, jerarquía, rutas o funcionamiento del checkout salvo que sea estrictamente necesario para corregir la información solicitada.
6. **Mantener el comportamiento responsive** en escritorio, tableta y móvil.
7. **No usar texto genérico para llenar campos incompletos.** Si falta información técnica aprobada, dejar el campo claramente pendiente en la fuente de datos o bloquear la publicación del producto; no mostrar afirmaciones no verificadas al cliente.

## 4. Solicitudes interpretadas del video

### BIO-01 — Retirar la presentación de 500 ml del Lavaloza Líquido Concentrado

- **Tiempo del video:** 00:08–00:20.
- **Producto:** Lavaloza Líquido Concentrado.
- **Ruta:** https://biocambio360-web.vercel.app/producto/lavaloza-liquido-concentrado
- **Problema:** la presentación `500ML` continúa disponible. En la versión pública revisada ya no aparece en la tarjeta principal, pero sí aparece en la vista detallada, en el selector, en la ficha técnica y como opción de compra por `$7.500`.
- **Cambio solicitado:** eliminar por completo la presentación de 500 ml de este producto.
- **Alcance técnico:** retirar el variant/SKU de 500 ml de la fuente de producto y de todos sus datos derivados. No basta con ocultar el chip con CSS.
- **Criterios de aceptación:**
  - `500ML`, `500 ml` y su precio no aparecen en tarjeta, vista rápida, detalle, ficha técnica, carrito ni datos estructurados.
  - Las presentaciones restantes conservan sus precios e imágenes correctos.
  - Ningún enlace o estado persistido permite agregar el SKU retirado al carrito.

### BIO-02 — Corregir la afirmación de biodegradabilidad

- **Tiempo del video:** 00:21–01:01; reiterado en 05:09–05:23.
- **Productos mencionados:** Lavaloza Líquido Concentrado y detergentes de ropa/multiusos.
- **Problema:** se muestra `Fórmula 100% Biodegradable Certificada`. La revisión indica que no se debe afirmar 100%; se menciona un valor aproximado de 94–95%, suficiente para la norma, pero ese porcentaje no debe publicarse sin respaldo documental.
- **Texto aprobado solicitado en el video:** `Fórmula biodegradable certificada`.
- **Cambio solicitado:** reemplazar la afirmación de 100% por el texto aprobado en los campos de sostenibilidad correspondientes.
- **Alcance técnico:** auditar todos los productos y componentes que consuman este atributo. No alterar `100% Colombiano` ni otras afirmaciones independientes.
- **Criterios de aceptación:**
  - La cadena `Fórmula 100% Biodegradable Certificada` no aparece en la aplicación.
  - Lavaloza y los detergentes muestran `Fórmula biodegradable certificada` cuando corresponda según su ficha.
  - No se publica `94%`, `95%` ni otro porcentaje sin una fuente técnica aprobada.

### BIO-03 — Reescribir la ficha del Alcohol Glicerinado 70%

- **Tiempo del video:** 01:03–01:34.
- **Ruta:** https://biocambio360-web.vercel.app/producto/alcohol-glicerinado-70
- **Problema confirmado en la URL pública:** la ficha contiene texto de detergente de ropa: `¿Tu ropa blanca luce percudida...?`, recomendaciones sobre telas y una afirmación falsa sobre `tensioactivos de grado profesional y pH balanceado`.
- **Cambio solicitado:** crear contenido exclusivo para el Alcohol Glicerinado 70%, basado en su ficha técnica.
- **Enfoque semántico permitido:** solución antiséptica con 70% de alcohol etílico y glicerina humectante; aplicaciones y precauciones solamente si están aprobadas técnicamente.
- **Eliminar o sustituir:** referencias a ropa, lavadoras, detergente, tensioactivos, pH balanceado, fibras y biodegradabilidad genérica.
- **Campos que deben revisarse:** resumen, problema, alternativa, ventaja, distribución, ficha informativa para LLM/AI, beneficios, instrucciones, ficha técnica, FAQ, metadata y datos estructurados.
- **Criterio de aceptación:** cada bloque describe alcohol glicerinado; no queda ningún texto heredado de detergente o lavandería.

### BIO-04 — Reescribir la ficha de Bactokill con énfasis en desinfección

- **Tiempo del video:** 01:41–02:28.
- **Ruta:** https://biocambio360-web.vercel.app/producto/bactokill
- **Problema confirmado:** el contenido habla principalmente de grasa pesada, cocinas, talleres, aceites y desengrasantes. El revisor indica que la función principal de Bactokill debe enfocarse en desinfección y que la descripción actual es genérica.
- **Cambio solicitado:** reemplazar los bloques copiados por una descripción particular de Bactokill, respaldada por la ficha técnica.
- **Eliminar o validar antes de conservar:** `desengrasante/desinfectante`, emulsificación de grasa, aceites, hidrocarburos, pH controlado y cualquier homologación o sector no documentado.
- **Criterio de aceptación:** Bactokill y Desengrasante no comparten la misma descripción; Bactokill comunica su finalidad de desinfección sin atribuir propiedades no verificadas.

### BIO-05 — Reescribir la ficha del Blanqueador–Desinfectante

- **Tiempo del video:** 02:32–03:28.
- **Ruta:** https://biocambio360-web.vercel.app/producto/blanqueador-desinfectante-desinfectante
- **Problema confirmado:** usa el mismo bloque genérico del detergente y afirma que está formulado con `tensioactivos de grado profesional y pH balanceado`. El revisor indica expresamente que este producto no tiene esos atributos.
- **Cambio solicitado:** redactar contenido específico para un blanqueador/desinfectante con hipoclorito de sodio estabilizado, utilizando únicamente la información aprobada.
- **Eliminar:** tensioactivos, pH balanceado, protección de ropa de color y cualquier promesa propia del detergente.
- **Criterio de aceptación:** la ficha explica blanqueo/desinfección, usos, restricciones y seguridad según la ficha técnica; no conserva texto de detergente.

### BIO-06 — Corregir la categoría y el contenido de Cera Autobrillante

- **Tiempo del video:** 03:30–04:08.
- **Ruta:** https://biocambio360-web.vercel.app/producto/cera-autobrillante
- **Problema confirmado:** la ficha habla del sol, el polvo de las vías, carrocería, plásticos, llantas, cuidado vehicular, protección UV, autolavados y flotas. El revisor aclara que esta cera es para pisos, no para automóviles.
- **Cambio solicitado:** sustituir todo el contenido automotriz por contenido específico para cera autobrillante de pisos, basado en la ficha técnica.
- **Revisar también:** categoría, perfiles, filtros, productos relacionados, metadata, texto para LLM/AI y datos estructurados.
- **Criterio de aceptación:** no aparecen `vehículo`, `carrocería`, `llantas`, `autolavados`, `flotas` ni `protección UV`, salvo que una ficha técnica aprobada demuestre que existe una variante automotriz distinta. El producto actual debe quedar asociado a pisos.

### BIO-07 — Diferenciar Desengrasante de Bactokill

- **Tiempo del video:** 04:11–04:25.
- **Ruta:** https://biocambio360-web.vercel.app/producto/desengrasante-multiusos
- **Problema confirmado:** Desengrasante y Bactokill comparten prácticamente la misma plantilla y varias afirmaciones.
- **Cambio solicitado:** crear una descripción exclusiva del Desengrasante, centrada en remoción de grasas y los usos respaldados por su ficha; retirar la desinfección si no está certificada.
- **Criterio de aceptación:** los dos productos no tienen párrafos duplicados ni intercambian funciones. El campo `FICHA INFORMATIVA` tampoco debe llamar al producto `desengrasante/desinfectante` si esa doble función no está documentada.

### BIO-08 — Validar precios y contenido del Detergente Líquido Multiusos

- **Tiempo del video:** 04:25–05:23; instrucción global reiterada en 07:14–07:20.
- **Ruta:** https://biocambio360-web.vercel.app/producto/detergente-liquido-multiusos
- **Problema 1:** el revisor detecta precios que no corresponden y solicita cotejarlos con la tabla maestra. El video no entrega una lista inequívoca de precios finales aprobados.
- **Estado público observado el 11 de agosto de 2026:** `1/2G $18.000`, `3.8L $29.000`, `10L $46.000`, `20L $86.000`. Estos valores son evidencia del estado actual, no autorización para conservarlos.
- **Cambio de precios:** comparar cada presentación contra la tabla maestra oficial y actualizar la fuente única de precios. Si la tabla no está disponible en el repositorio o en los insumos del proyecto, detener solamente este subcambio y solicitarla; no inferir precios.
- **Problema 2:** se repite contenido que también aparece en Blanqueador. Determinar qué texto corresponde realmente al detergente y retirar la copia del producto incorrecto.
- **Problema 3:** la sostenibilidad vuelve a declararse como 100%; aplicar BIO-02.
- **Criterios de aceptación:**
  - Un mismo variant muestra el mismo precio en tarjeta, vista rápida, detalle, carrito y checkout.
  - Los precios coinciden con la tabla maestra aprobada.
  - La descripción del detergente es exclusiva y técnicamente coherente.
  - El pH y demás atributos provienen de su ficha técnica.

### BIO-09 — Reescribir la ficha de Limpiapisos Brisa Marina

- **Tiempo del video:** 05:24–06:06.
- **Ruta:** https://biocambio360-web.vercel.app/producto/limpiapisos-brisa-marina
- **Problema confirmado:** la ficha reutiliza el texto sobre ropa blanca, ropa de color, lavadoras y detergente. El encabezado cambia, pero el resto del contenido sigue siendo genérico.
- **Cambio solicitado:** redactar todos los bloques con enfoque en limpieza de pisos y aroma Brisa Marina, usando la ficha técnica para superficies compatibles, dilución, pH y beneficios.
- **Eliminar:** referencias a lavado de ropa, fibras, lavadoras y cualquier afirmación copiada que no corresponda.
- **Criterio de aceptación:** todos los bloques y FAQs se refieren al uso real del limpiapisos y no a productos de lavandería.

### BIO-10 — Reescribir la ficha de Sellador Polimérico

- **Tiempo del video:** 06:07–06:48.
- **Ruta:** https://biocambio360-web.vercel.app/producto/sellador-polimerico
- **Problema confirmado:** la ficha contiene `¿Tu ropa blanca luce percudida...?`, detergente, telas, tensioactivos y pH balanceado, conceptos que no corresponden al sellador.
- **Cambio solicitado:** crear contenido específico de protección, sellado y acabado de pisos, de acuerdo con la ficha técnica y las superficies aprobadas.
- **Criterio de aceptación:** no quedan referencias a ropa, lavadora, detergente o biodegradabilidad genérica. Beneficios, instrucciones y ficha informativa describen un sellador polimérico.

### BIO-11 — Completar y asociar correctamente las imágenes de productos

- **Tiempo del video:** 06:49–07:12.
- **Problema:** durante la revisión todavía existen tarjetas con el placeholder `BIOCAMBIO360 — Imagen de Producto`. El revisor informa que está incorporando imágenes progresivamente.
- **Cambio solicitado:** usar las imágenes reales que estén disponibles en los assets del proyecto y asociarlas por producto/SKU/presentación.
- **Reglas:**
  - No generar imágenes con IA ni reutilizar la fotografía de otro producto.
  - No deformar envases ni recortar etiquetas.
  - Conservar proporción, fondo y calidad.
  - Si una imagen aprobada todavía no existe, mantener un fallback neutro y registrar el producto como pendiente; no ocultar la tarjeta ni inventar un recurso.
- **Productos que se observan con placeholder en el tramo final del video:** Shampoo para Muebles y Tapicería, Limpiavidrios Concentrado, Lustrallantas y Protector de Cauchos, Shampoo para Autos y Motos, Silicona para Muebles/Autos/Motos y Jabón para Manos Antibacterial. Confirmar la lista contra el estado real de los assets.
- **Criterio de aceptación:** cada imagen real corresponde a su producto, se visualiza correctamente en tarjetas, vista rápida y detalle, y dispone de `alt` descriptivo.

### BIO-12 — Auditoría global de coherencia antes de publicar

- **Tiempo del video:** 07:13–07:40.
- **Solicitud consolidada:** revisar nuevamente precios contra la tabla y corregir las descripciones repetidas o desfasadas.
- **Búsquedas mínimas que deben ejecutarse en datos y contenido:**
  - `Tu ropa blanca luce percudida`
  - `tensioactivos de grado profesional y pH balanceado`
  - `Fórmula 100% Biodegradable Certificada`
  - `desengrasante/desinfectante`
  - `carrocería`, `llantas`, `vehículo`, `autolavados` dentro de Cera Autobrillante
  - placeholders de imagen o rutas de asset inexistentes
- **Resultado:** cada coincidencia debe justificarse para ese producto o corregirse. No se acepta la misma plantilla descriptiva aplicada masivamente cambiando solo el nombre.

## 5. Matriz resumida de contenido

| Producto | Enfoque correcto | Contenido que no debe permanecer |
|---|---|---|
| Lavaloza Líquido Concentrado | Vajillas, ollas, grasa de cocina, uso aprobado | Presentación 500 ml; afirmación 100% biodegradable |
| Alcohol Glicerinado 70% | Antisepsia y usos aprobados del alcohol al 70% | Ropa, lavadora, detergente, tensioactivos, pH balanceado |
| Bactokill | Desinfección según ficha técnica | Plantilla de grasa/desengrasante no respaldada |
| Blanqueador–Desinfectante | Hipoclorito, blanqueo y desinfección segura | Ropa de color, tensioactivos, pH balanceado, plantilla de detergente |
| Cera Autobrillante | Protección y brillo de pisos | Carrocería, llantas, vehículos, autolavados, protección UV automotriz |
| Desengrasante | Remoción de grasas y superficies aprobadas | Desinfección no certificada; copia de Bactokill |
| Detergente Líquido Multiusos | Lavandería y cuidado de fibras según ficha | Precios no cotejados; afirmación 100% biodegradable |
| Limpiapisos Brisa Marina | Limpieza de pisos y aroma | Ropa, lavadora, detergente, fibras |
| Sellador Polimérico | Sellado, protección y acabado de pisos | Ropa, lavadora, detergente, tensioactivos genéricos |

## 6. Orden recomendado de implementación

1. Identificar modelo de datos, fuente de precios, fichas técnicas y mapeo de assets.
2. Corregir presentaciones y precios en la fuente única.
3. Corregir atributos técnicos verificables.
4. Sustituir descripciones producto por producto.
5. Completar el mapeo de imágenes disponibles.
6. Verificar todas las superficies consumidoras.
7. Ejecutar pruebas del proyecto, compilación de producción y revisión responsive.

## 7. Pruebas y criterios generales de cierre

- Ejecutar los scripts disponibles de lint, tipos, pruebas y build definidos en `package.json`.
- La compilación de producción de Next.js debe terminar sin errores.
- No debe haber errores nuevos en consola ni rutas de imágenes rotas.
- Probar selectores de presentación, cambio de precio, cantidad, agregar al carrito y persistencia del carrito.
- Verificar escritorio, tableta y móvil.
- Confirmar que las páginas conservan su ruta y que metadata/datos estructurados reflejan el mismo nombre, presentación y precio visibles.
- Comparar una muestra de productos corregidos contra su ficha técnica y contra la tabla de precios aprobada.
- Entregar un resumen de archivos modificados, datos corregidos, pruebas realizadas y pendientes que dependan de información externa.

## 8. Prompt maestro listo para copiar en Antigravity

```text
Trabaja sobre el proyecto Next.js de la tienda Biocambio360. Implementa la especificación “Especificación de cambios para Antigravity — Biocambio360” completa, respetando sus identificadores BIO-01 a BIO-12.

Antes de modificar código, inspecciona el repositorio y localiza la fuente única de productos, variantes, precios, descripciones, fichas técnicas e imágenes. No parches únicamente los componentes. Corrige la fuente de verdad y verifica todos sus consumidores: catálogo, tarjeta, vista rápida, ficha detallada, carrito, checkout, buscador, filtros, metadata y datos estructurados.

Restricciones críticas:
- No rediseñes la interfaz ni cambies las rutas.
- No inventes precios, porcentajes, pH, ingredientes, certificaciones, diluciones, compatibilidades ni beneficios.
- Usa como autoridad las fichas técnicas y la tabla maestra de precios disponibles en el proyecto.
- Si falta la tabla de precios o una ficha necesaria, implementa los cambios independientes y reporta ese punto como bloqueado; no adivines el dato.
- No hagas reemplazos globales ciegos. “100% Colombiano” debe conservarse; la afirmación que debe corregirse es “Fórmula 100% Biodegradable Certificada”.
- No uses imágenes de otros productos ni generadas por IA.

Prioridades:
1. Eliminar realmente el SKU/presentación de 500 ml del Lavaloza en todos los flujos.
2. Corregir la biodegradabilidad a “Fórmula biodegradable certificada” donde corresponda.
3. Reescribir las fichas señaladas para que cada producto tenga contenido propio y técnicamente correcto.
4. Cotejar todos los precios con la tabla maestra y garantizar consistencia entre vistas y carrito.
5. Asociar las imágenes reales disponibles y mantener fallback neutro para las pendientes.

Al terminar:
1. Ejecuta lint, typecheck, pruebas y build según los scripts existentes.
2. Prueba selectores de presentación, precios, carrito y responsive.
3. Busca las cadenas problemáticas indicadas en BIO-12 y confirma que no sobreviven en productos incorrectos.
4. Entrega una tabla con: ID BIO, archivos modificados, cambio aplicado, evidencia de prueba y cualquier bloqueo restante.
```

## 9. Dependencias que no deben resolverse por inferencia

- **Tabla maestra de precios:** indispensable para cerrar BIO-08 y la auditoría global de precios.
- **Fichas técnicas aprobadas:** necesarias para redactar o validar atributos químicos, pH, usos, seguridad y diluciones.
- **Imágenes finales faltantes:** necesarias para sustituir todos los placeholders; el video indica que este insumo seguía en construcción.

Si alguno de estos recursos no está dentro del repositorio, Antigravity debe señalar exactamente el producto/campo bloqueado y continuar con los cambios que sí son independientes.
