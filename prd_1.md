Para renovar **BioCambio360** con una visión de CTO y experto en Growth, la clave no es solo cambiar el "look & feel", sino transformar la arquitectura de información para que el usuario deje de comprar "químicos" y empiece a comprar **"soluciones de limpieza"**.

Aquí tienes el desglose de los kits, la estrategia de interfaz y el PRD para la implementación.

## ---

**1\. Extracción y Estructura de Kits**

Basado en las URLs y el catálogo CSV, estos son los pilares de tu oferta prioritaria:

### **Kits de Limpieza (Extraídos de URLs)**

| Kit / Combo | Productos Sugeridos (Basado en CSV BioCambio360) | Propósito / Valor |
| :---- | :---- | :---- |
| **Kit Matrimonio** | Detergente Industrial (20L) \+ Suavizante Floral (Galón) | El "dúo dinámico" para el hogar. |
| **Megacombo \#2** | Detergente (10L) \+ Lavaloza (Galón) \+ Desengrasante (1L) \+ Limpiapisos (Galón) | Limpieza integral de cocina y áreas comunes. |
| **Megacombo \#3** | Detergente (20L) \+ Suavizante (20L) \+ Lavaloza (20L) | Máximo ahorro por volumen (Ideal B2B/Familias grandes). |
| **Megacombo \#4** | Desengrasante Industrial \+ Destapacañerías \+ Pastillas de Cloro \+ Limpiajuntas | "FreshBath & Kitchen": Solución para áreas críticas. |

**Nota:** He filtrado únicamente los productos marcados como **BIOCAMBIO360** del CSV (Alcoholes, Ambientadores, Jabones, Limpiadores técnicos) para asegurar que la oferta sea coherente con la marca.

## ---

**2\. Estrategia de UI/UX Moderna**

Inspirado en la lógica de *Pajarito* pero con el toque técnico y de confianza de BioCambio360:

### **Home orientada a la "Solución"**

* **Selector de Perfil (Persona-Based Navigation):** Un bloque inicial que pregunte: "¿Qué buscas limpiar hoy? \[Hogar\] \[Restaurante\] \[Airbnb\] \[Oficina\]".  
* **Visualización de Ahorro Real:** No solo el precio de oferta. Usa un badge que diga: *"Ahorras $25.000 comparado con compra unitaria"*.  
* **Bundling Visual:** En lugar de fotos individuales, usa composiciones tipo "lifestyle" donde se vean los productos del kit en un entorno real (cocina impecable, lavandería organizada).

### **Product Detail Page (PDP) de Kits**

* **Calculadora de Rendimiento:** Un widget que diga: *"Este kit rinde para 45 lavadas"* o *"3 meses de limpieza profunda"*. Esto eleva la percepción de valor.  
* **Sticky "Add to Cart":** En móvil, el botón de compra y el precio deben estar siempre visibles al hacer scroll.  
* **Sección de "Contenido del Kit":** Desglose visual con iconos de cada producto incluido y su tamaño.

### **Checkout & Carrito (Growth Hacking)**

* **Barra de Progreso de Envío Gratis:** *"Te faltan $15.000 para envío gratis"*.  
* **Cross-sell en el Carrito:** Si llevan el "Kit Matrimonio", sugiere el "Lustrallantas" o "Silicona" como un *add-on* de último minuto con un 10% extra.

## ---

**3\. PRD (Product Requirements Document)**

**Nombre del Proyecto:** Renovación E-commerce BioCambio360 \- "Soluciones 360"

**Objetivo:** Migrar de una venta por catálogo unitario a una venta por soluciones empaquetadas (Kits/Combos) para aumentar el AOV (Average Order Value).

### **1\. Requerimientos Funcionales**

* **RF01: Motor de Bundling:** El CMS debe permitir crear productos "Combo" que descuenten stock de múltiples SKUs unitarios simultáneamente.  
* **RF02: Upsell Inteligente:** Implementar un módulo en el carrito que sugiera productos complementarios basados en la categoría del kit seleccionado.  
* **RF03: Pagos Flexibles:** Integración nativa con pasarelas locales y opción de "Pago Contraentrega" visible desde el producto (factor crítico de confianza).  
* **RF04: SEO para Soluciones:** Creación de landing pages específicas para términos de búsqueda como "Kit de limpieza para Airbnb" o "Limpieza industrial para restaurantes".

### **2\. Requerimientos de UX/UI**

* **RU01: Diseño Mobile-First:** El 80% del tráfico vendrá de móvil; la navegación debe ser por pulgar.  
* **RU02: Micro-interacciones:** Feedback visual cuando se agrega un kit al carrito (animación de "vuelo" del producto).  
* **RU03: Social Proof Dinámico:** Sección de testimonios que muestre el kit específico que compró el cliente.

### **3\. Stack Tecnológico Sugerido**

* **Backend:** Headless e-commerce (Shopify o un CMS robusto) para facilitar la gestión de los kits.  
* **Frontend:** React/Next.js para una carga instantánea y SEO optimizado.  
* **Analytics:** Seguimiento de eventos (GA4) para medir el abandono en el checkout y la efectividad de los upsells.

### **4\. Roadmap de Implementación**

1. **Semana 1-2:** Prototipado en alta fidelidad y definición de la lógica de inventario para combos.  
2. **Semana 3-5:** Desarrollo del core, integración de pasarelas y carga de contenido visual de kits.  
3. **Semana 6:** QA, pruebas de carga y lanzamiento del MVP centrado en los 4 kits principales.

¿Te gustaría que profundice en el diseño de alguna de las historias de usuario para el equipo de desarrollo o que elaboremos el copy persuasivo para los Megacombos?