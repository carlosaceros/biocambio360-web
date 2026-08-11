# 📋 Especificación Técnica y Alcance Final: Tienda Virtual Biocambio360

Este documento formaliza los **Requerimientos Funcionales (RF)**, **Requerimientos No Funcionales (RNF)** y las **Historias de Usuario (HU)** necesarios para concluir exitosamente el desarrollo e implementación de la tienda virtual **Biocambio360**, garantizando una plataforma transaccional de alto rendimiento, optimizada para motores generativos de búsqueda y con una logística de envíos robusta y subsidiada.

---

## 🎯 Alcance del Proyecto (Fase Final)
1. **Catálogo Visual Completo**: Reemplazo total de placeholders por imágenes reales optimizadas en todos los SKUs.
2. **Logística Automatizada**: Puesta en producción de la cotización y emisión de guías mediante **99 Envíos**.
3. **Subsidios de Flete por Peso**: Lógica de descuentos dinámicos sobre el costo de transporte basado en tablas de referencia volumétricas y de peso.
4. **Módulo de Contenidos (Blog Moderno)**: Arquitectura de información nativamente preparada para SEO tradicional, AEO (Answer Engine Optimization), GEO (Generative Engine Optimization) y consumo por sistemas RAG (Retrieval-Augmented Generation).
5. **Experiencia Premium y Rendimiento**: Diseño *Mobile-First* estricto y cumplimiento del 100% en las métricas de **Core Web Vitals**.

---

## ⚙️ 1. Requerimientos Funcionales (RF)

### **Módulo de Catálogo e Imágenes**
* **RF01 - Mapeo de Activos Visuales**: El sistema debe asociar cada SKU y variante de tamaño a una imagen fotográfica real en formato WebP/AVIF almacenada localmente o en un CDN.
* **RF02 - Soporte Multivista**: Se deben admitir al menos dos vistas por producto: una imagen principal para el catálogo/grid (`imgFile`) y una miniatura optimizada para el *Cart Drawer* y *Checkout* (`imgFileSmall`).

### **Módulo de Envíos y Conexión Logística (99 Envíos)**
* **RF03 - Cotización Dinámica por DANE**: El sistema de *checkout* debe capturar el código DANE del municipio/ciudad del comprador y consultar en tiempo real la API de 99 Envíos para obtener la transportadora más económica con `exito: true`.
* **RF04 - Cálculo Volumétrico Agregado**: El payload de cotización debe totalizar dinámicamente el peso (kg) y volumen aproximado (alto $\times$ largo $\times$ ancho) de todos los ítems presentes en el carrito.
* **RF05 - Generación Automática de Preenvíos**: Al recibir una confirmación exitosa de pago (vía Webhook de Wompi o selección de Contraentrega), el backend debe emitir inmediatamente la guía logística invocando el endpoint `/preenvio` de 99 Envíos.

### **Módulo de Subsidios de Envío**
* **RF06 - Ingesta de Tabla de Subsidios**: El motor de reglas del carrito debe incorporar una matriz de subsidios donde el porcentaje de absorción del flete dependa del peso total y/o monto del pedido.
* **RF07 - Descuento en Liquidación Final**: Si el envío califica para subsidio, el sistema debe restar el valor correspondiente del flete devuelto por 99 Envíos antes de sumarlo al total a pagar, desglosando visualmente el beneficio: *"Costo de Envío: ~~$X~~ -> $Y (Subsidio Biocambio360)"*.

### **Módulo de Blog (SEO, AEO, GEO y RAGs)**
* **RF08 - Renderizado MDX / Estructurado**: Implementar un gestor de artículos estáticos basados en archivos Markdown/MDX enriquecidos o conectados a un Headless CMS.
* **RF09 - Marcado Semántico Avanzado (SEO/AEO)**: Generación automática de metadatos estructurados `JSON-LD` tipo `Article` y `FAQPage` por cada entrada del blog, formulando los encabezados H2/H3 como preguntas directas para facilitar su captura por motores de respuestas (AEO).
* **RF10 - Optimización Generativa (GEO)**: Inclusión sistemática de tablas comparativas de rendimiento, citas de autoridad técnica, porcentajes de concentración y terminología química precisa para elevar la puntuación de relevancia en resúmenes generados por IA (ChatGPT, Perplexity, Gemini).
* **RF11 - Endpoint de Ingesta RAG**: Exponer una ruta estática (ej. `/api/blog-feed.json` o un sitemap de texto plano) que devuelva el contenido limpio de los artículos sin artefactos de UI, optimizado para la vectorización y consulta por agentes de IA conversacionales propios o externos.

---

## ⚡ 2. Requerimientos No Funcionales (RNF)

### **Rendimiento y Core Web Vitals (RNF01 - RNF03)**
* **RNF01 - LCP (Largest Contentful Paint) $\le 2.5\text{s}$**: Las imágenes de héroe en la *Home* y en las *Product Detail Pages* deben precargarse explícitamente (`fetchPriority="high"`) y servirse redimensionadas desde el servidor.
* **RNF02 - CLS (Cumulative Layout Shift) $\le 0.1$**: Todos los contenedores de imágenes, modales emergentes y avisos publicitarios deben tener dimensiones fijas o relaciones de aspecto declaradas en CSS para evitar saltos visuales durante la carga.
* **RNF03 - INP (Interaction to Next Paint) $\le 200\text{ms}$**: La adición de productos al carrito y el filtrado por categorías deben ofrecer respuesta visual inmediata optimizando el ciclo de re-renderizado de React 19 y delegando cálculos complejos a funciones puras memorizadas (`useMemo`).

### **Usabilidad y Diseño Mobile-First (RNF04 - RNF05)**
* **RNF04 - Ergonomía de Pulgar (*Thumb-Zone*)**: Las acciones primarias (Botón flotante de menú, acceso al carrito, *Sticky Add-to-Cart* en productos) deben ubicarse en el tercio inferior de la pantalla para navegación fluida a una mano en dispositivos móviles.
* **RNF05 - Confiabilidad Transaccional**: Toda pantalla de pago y selección de envíos debe cargarse bajo protocolo seguro TLS 1.3, exponiendo certificaciones visibles y tiempos de respuesta de cotización inferiores a $3\text{s}$.

---

## 👥 3. Historias de Usuario (HU) y Criterios de Aceptación

### **HU01: Visualización de Imágenes Reales en Catálogo**
> **Como** cliente potencial navegando la tienda virtual,  
> **Quiero** ver fotografías nítidas, profesionales y consistentes de cada garrafa y presentación,  
> **Para** identificar inmediatamente el producto, su tamaño real y sentir la confianza de un empaque industrial de alta calidad.

* **Criterios de Aceptación**:
  1. Al cargar la ruta `/` o `/catalogo`, ninguna tarjeta de producto debe mostrar la imagen genérica de placeholder.
  2. Al cambiar de tamaño en la vista rápida (*Quick View*), la imagen debe actualizarse dinámicamente si existe una foto específica para dicha presentación.
  3. Las imágenes deben contar con el atributo `alt` descriptivo conteniendo el nombre y tamaño del producto para cumplimiento de accesibilidad y SEO visual.

---

### **HU02: Liquidación de Envíos Transparente con 99 Envíos**
> **Como** comprador en proceso de finalización de compra,  
> **Quiero** seleccionar mi departamento y ciudad para que el sistema calcule automáticamente el costo exacto y tiempo estimado de entrega a través de 99 Envíos,  
> **Para** evitar sorpresas en el precio final y saber exactamente cuándo llegará mi pedido.

* **Criterios de Aceptación**:
  1. El formulario de *checkout* debe incluir un autocompletado rápido de ciudades de Colombia mapeadas a sus respectivos códigos DANE.
  2. Al seleccionar la ciudad, el sistema debe invocar la API de cotización y reflejar el costo más bajo disponible en el resumen de costos.
  3. Si la API de 99 Envíos sufre un retraso o error, se debe mostrar un mensaje amigable permitiendo reintentar o acogerse a una tarifa plana de contingencia.

---

### **HU03: Aplicación Automática de Subsidios por Peso**
> **Como** cliente institucional o de compras por mayoreo,  
> **Quiero** que el e-commerce asuma una parte o la totalidad del costo de despacho a medida que agrego garrafas pesadas al carrito,  
> **Para** que el costo logístico no desincentive mi orden de alto volumen.

* **Criterios de Aceptación**:
  1. El sistema debe calcular el peso total en kilogramos sumando el peso individual declarado de cada ítem en el carrito.
  2. El valor del flete cotizado debe someterse a la tabla de subsidios. Si el pedido pesa, por ejemplo, más de 15kg y supera el monto mínimo, el flete al usuario debe mostrar un descuento proporcional.
  3. El carrito lateral (*Cart Drawer*) debe notificar con un aviso dinámico: *"¡Felicidades! Por el peso/volumen de tu compra, Biocambio360 te subsidia el $X\%$ del envío"*.

---

### **HU04: Consumo de Artículos Técnicos (Blog AEO/GEO)**
> **Como** jefe de mantenimiento o dueño de negocio buscando asesoría en limpieza,  
> **Quiero** encontrar artículos profundos y guías de aplicación industrial redactadas en formato claro y directo,  
> **Para** resolver mis problemas de desinfección y descubrir orgánicamente que los productos de Biocambio360 son la solución ideal.

* **Criterios de Aceptación**:
  1. La sección de blog debe listar artículos con tiempos de lectura estimados, autoría técnica y categorías claras.
  2. El código fuente de cada artículo debe incluir marcado `JSON-LD` válido sin errores en la herramienta de prueba de resultados enriquecidos de Google.
  3. Las preguntas clave del artículo deben estar maquetadas en etiquetas H2/H3 autoconclusivas para facilitar la indexación directa como fragmentos destacados (*Featured Snippets*) en buscadores e IAs.
  4. Los agentes LLM externos deben poder leer el archivo `blog-feed.json` o `.md` expuesto públicamente para extraer el conocimiento sin bloqueos de renderizado de JavaScript.
