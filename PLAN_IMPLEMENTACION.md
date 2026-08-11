# Biocambio360 — Comparación Estado Actual vs PRDs + Plan de Implementación

## Contexto

Análisis del proyecto e-commerce **Biocambio360** (Next.js 16 + Tailwind 4 + Firebase + Wompi + 99Envíos) comparado con los requerimientos de `prd_1.md`, `prd_2.md` y el catálogo de precios `PRECIOS-2026-4-ABRIL-BIOCAMBIO360.csv`.

---

## 1. Comparación Detallada: ¿Qué HAY vs Qué FALTA?

### 🟢 Lo que YA EXISTE y FUNCIONA (NO tocar)

| Componente | Estado | Archivos clave |
|:--|:--|:--|
| **Pagos con Wompi** | ✅ Completo (firma de integridad + webhook) | `wompi-service.ts`, `api/wompi/` |
| **Envíos con 99Envíos** | ✅ Completo (cotización + preenvío) | `99envios-service.ts`, `api/envios/` |
| **Checkout completo** | ✅ Formulario + cálculo envío + pago | `checkout/page.tsx` |
| **Carrito con localStorage** | ✅ Context + persistencia + hydration | `cart-context.tsx` |
| **Cart Drawer lateral** | ✅ Barra de envío gratis + animaciones | `CartDrawer.tsx` |
| **Firebase (productos)** | ✅ CRUD + cache en memoria | `products-service.ts`, `firebase.ts` |
| **Admin panel** | ✅ Gestión de productos | `app/admin/` |
| **Design system** | ✅ Tokens CSS Biocambio360 (blue/pink/Barlow) | `globals.css` |
| **SEO técnico** | ✅ Metadata, Schema.org, sitemap, robots | `product-utils.ts`, `layout.tsx` |
| **ComboBuilder** | ✅ 4 combos predefinidos + combo personalizado | `combos.ts`, `ComboBuilder.tsx` |
| **Comparador de precios** | ✅ Serper + Gemini para precios de mercado | `pricing-service.ts` |

---

### 🟡 Lo que EXISTE PARCIALMENTE

| Requerimiento PRD | Estado actual | Brecha |
|:--|:--|:--|
| **Catálogo de productos** | Solo 4 productos (Detergente, Desengrasante, Suavizante, Blanqueador) con 3 tallas (3.8L, 10L, 20L) | El CSV tiene **~480 líneas** y **~30 categorías** distintas: Ambientador, Limpiapisos (11 aromas), Jabón de Manos, Lavaloza, Cera, Sellador, Silicona, etc. |
| **Kits/Combos** | 4 combos predefinidos (Kit Matrimonio, Megacombo 2/3/4) + combo personalizable | Los PRDs piden kits **por segmento**: Hogar, Airbnb, Restaurante, Oficina, Automotriz. Faltan kits especializados. |
| **Navegación** | Un solo menú: Logo + carrito | PRDs piden: Mega menú por necesidad, selector de perfil (Hogar/Restaurante/Airbnb/Oficina), buscador con lenguaje natural |
| **Home orientada a kits** | El Hero tiene CTA a combos pero el primer contenido es el catálogo unitario | PRDs piden: Home con hero de kits + cards por segmento como entrada principal |
| **Señales de confianza** | ✅ Sección Trust + footer | PRDs piden: Persistentes en header + PDP + carrito + checkout (punto físico, contraentrega visible siempre) |

---

### 🔴 Lo que NO EXISTE AÚN

| Requerimiento PRD | Prioridad | Complejidad |
|:--|:--|:--|
| **Catálogo expandido (~30 categorías del CSV)** | 🔴 Alta | Media |
| **Navegación por categorías/soluciones** | 🔴 Alta | Media |
| **Filtros**: por categoría, aroma, tamaño, precio, uso | 🔴 Alta | Media |
| **Kits por segmento** (Airbnb, Restaurante, etc.) | 🟡 Media | Baja |
| **Calculadora de rendimiento** ("este kit te dura X semanas") | 🟡 Media | Baja |
| **Upsell/Cross-sell en carrito** | 🟡 Media | Media |
| **Landing B2B con formulario de cotización** | 🟡 Media | Baja |
| **Buscador con lenguaje natural** | 🟢 Baja | Media |
| **Quiz de recomendación** | 🟢 Baja | Media |
| **Módulo de recompra** | 🟢 Baja | Alta |

---

## 2. Análisis del CSV vs Catálogo Actual

### Categorías detectadas en el CSV (agrupando ~480 líneas)

| Categoría | Variantes (aromas/tipos) | Tamaños | ¿Existe en el sitio? |
|:--|:--|:--|:--|
| **Limpiapisos** | Canela, Citronela, Lavanda, Pino, Vainilla, Talco, Brisa Marina, Frutos Rojos, Manzana Verde, Kiwi | 250ml → 20L | ❌ |
| **Detergente Líquido Ropa** | Normal, Industrial, Ropa Negra | 250ml → 20L | ✅ Parcial (solo 3 tallas) |
| **Suavizante** | Floral, Manzana Verde, Sueño Lavanda, Motas de Algodón | 250ml → 20L | ✅ Parcial |
| **Desengrasante** | Normal, Industrial | 250ml → 20L | ✅ Parcial |
| **Blanqueador/Desinfectante** | Normal, Bicarbonato | 1L → 20L | ✅ Parcial |
| **Ambientador** | Canela, Chicle, Kiwi, Talco, Tutti-Frutti | 250ml → 20L | ❌ |
| **Jabón de Manos** | Neutro, Durazno, Fresa, Kiwi, Manzana Verde | 300ml → 20L | ❌ |
| **Lavaloza** | Normal, Industrial | 250ml → 20L | ❌ |
| **Cera Autobrillante** | Transparente, Roja | 250ml → 20L | ❌ |
| **Sellador Polimérico** | Transparente, Rojo, Amarillo | 250ml → 20L | ❌ |
| **Silicona** | Autos, Motos, Lustramuebles | 250ml → 20L | ❌ |
| **Shampoo** | Autos, Motos, Muebles | 250ml → 20L | ❌ |
| **Lustrallantas** | Autos, Motos | 500ml → 20L | ❌ |
| **Alcohol** | Ethanol 96%, Glicerinado 70% | 500ml → 20L | ❌ |
| **Gel Antibacterial** | 70% | 500ml → 20L | ❌ |
| **Quitamanchas Ropa Color** | — | 250ml → 20L | ❌ |
| **Limpiajuntas** | — | 810ml → 20L | ❌ |
| **Limpiavidrios** | — | 250ml → 20L | ❌ |
| **Eliminador de Olores** | Normal, Limón | 250ml → 20L | ❌ |
| **Quita Óxido** | — | 60ml → 20L | ❌ |
| **Removedor de Ceras** | — | 500ml → 20L | ❌ |
| **Vinagre Industrial** | — | 500ml → Galón | ❌ |
| **Mantequilla Corporal** | Cafettal, Churumbelos, Caribe, Gorgona, Cocuy | — | ❌ |
| **Splash Cuerpo** | 10 fragancias colombianas | 250ml | ❌ |
| **Perfume Autos** | 4 fragancias | 110ml | ❌ |
| **Bactokill** | — | 1L → 20L | ❌ |
| **Oxígeno Activo** | — | 1kg → 20kg | ❌ |
| **Accesorios** | Envases, tapas, dispensadores, atomizadores, etc. | — | ❌ |

> **IMPORTANTE:** De las ~30 categorías en el CSV, el sitio actual solo tiene 4 productos con 3 tallas cada uno. Hay un gap masivo de catálogo.

---

## 3. Plan de Implementación (Incremental, Sin Romper Nada)

### Principios

1. **Zero Breaking Changes**: Todos los cambios son aditivos. No se modifica `wompi-service.ts`, `99envios-service.ts`, `cart-context.tsx`, ni `checkout/page.tsx` en su lógica actual.
2. **Reutilizar infraestructura**: Los nuevos productos usan el mismo tipo `Product`, la misma Firestore collection, el mismo `CartContext`.
3. **CSV como seed data**: Se parsea el CSV para generar los documentos de Firestore y/o el catálogo estático.

---

### Fase 1 — Catálogo Expandido + Navegación por Categorías

> **PRIORIDAD MÁXIMA**: Pasar de 4 productos a todo el catálogo del CSV.

#### Cambios propuestos:

##### A. Expandir el tipo `Product` para soportar más tamaños

El tipo actual solo soporta 3 tallas fijas (`3.8L`, `10L`, `20L`). El CSV tiene tamaños como `250ml`, `500ml`, `810ml`, `1L`, `Galón`, `10L`, `20L`.

**Cambio**: usar `precios` como `Record<string, number>` en vez de llaves fijas.

##### B. Crear sistema de categorías

Nuevo archivo `src/lib/categories.ts` con las ~15 categorías principales y metadatos (icono, color, descripción, slug).

##### C. Parsear CSV → Seed Firestore

Script de seed que parsea el CSV y crea documentos en Firestore agrupados por categoría+variante (ej: "Limpiapisos Canela" como un producto con múltiples tamaños/precios).

##### D. Navbar con Mega Menú

Reemplazar el header mínimo actual con navegación por categorías + acceso a kits + buscador.

##### E. Página de catálogo con filtros

Nueva ruta `/catalogo` con grid de ProductCards y filtros por categoría, tamaño, precio.

#### Archivos involucrados:

| Acción | Archivo |
|:--|:--|
| MODIFICAR | `src/lib/products.ts` — Type más flexible |
| MODIFICAR | `src/lib/cart-context.tsx` — Aceptar `string` en vez de union type para sizes |
| NUEVO | `src/lib/categories.ts` — Definición de categorías |
| NUEVO | `src/lib/csv-seed.ts` — Parser CSV → Firestore |
| NUEVO | `src/components/Navbar.tsx` — Mega menú por categorías |
| NUEVO | `src/app/catalogo/page.tsx` — Catálogo filtrable |
| MODIFICAR | `src/app/page.tsx` — Hero orientado a kits + secciones por segmento |
| MODIFICAR | `src/components/ProductCard.tsx` — Soporte para múltiples tamaños |
| MODIFICAR | `src/components/CartDrawer.tsx` — Mostrar nombre de tamaño genérico |

---

### Fase 2 — Kits por Segmento + Calculadora de Rendimiento

##### A. Ampliar los combos con kits por segmento

Nuevos kits en `combos.ts`:
- **Kit Anfitrión 5 Estrellas** (Airbnb): Limpiapisos Lavanda + Ambientador + Jabón Manos + Eliminador Olores
- **Kit Restaurante Impecable**: Desengrasante Industrial + Lavaloza Industrial + Blanqueador + Limpiajuntas
- **Kit Auto Pro**: Shampoo Autos + Silicona Autos + Lustrallantas + Perfume Auto
- **Kit Oficina**: Jabón Manos + Gel Antibacterial + Limpiapisos + Limpiavidrios

##### B. Calculadora de rendimiento
Widget que muestra "este kit rinde para X lavadas / Y semanas" basado en dosificación.

##### C. Tabla comparativa Básico/Recomendado/Pro
Componente de comparación para que el usuario vea tiers.

#### Archivos involucrados:

| Acción | Archivo |
|:--|:--|
| MODIFICAR | `src/lib/combos.ts` — Nuevos kits por segmento |
| NUEVO | `src/components/KitsBySegment.tsx` — Selector por perfil |
| NUEVO | `src/components/YieldCalculator.tsx` — Calculadora de rendimiento |
| MODIFICAR | `src/components/ComboBuilder.tsx` — Integrar kits por segmento |

---

### Fase 3 — Upsells en Carrito + Landing B2B

##### A. Cross-sell contextual en CartDrawer
Cuando el usuario tiene Detergente, sugerir Suavizante. Cuando tiene kit auto, sugerir Perfume.

##### B. Landing B2B
Ruta `/empresa` con formulario de cotización (nombre empresa, volumen, frecuencia, contacto). Envía email via `email-service.ts` existente.

#### Archivos involucrados:

| Acción | Archivo |
|:--|:--|
| MODIFICAR | `src/components/CartDrawer.tsx` — Sección de upsell contextual |
| NUEVO | `src/app/empresa/page.tsx` — Landing B2B |
| NUEVO | `src/lib/upsell-rules.ts` — Reglas de cross-sell |

---

## 4. Verificación

- Lanzar servidor local con `npm run dev` en puerto 3001
- Verificar que checkout + pagos + envíos sigan funcionando idéntico
- Navegar el catálogo expandido
- Probar los nuevos kits por segmento
- Validar que el carrito acepta los nuevos productos con tamaños distintos

---

## Preguntas Pendientes

1. **¿Empezamos con la Fase 1?** Es la que tiene mayor impacto (pasar de 4 productos a todo el catálogo).
2. **Imágenes de productos**: El CSV no tiene imágenes. Los nuevos productos usarán una imagen genérica (emoji/placeholder) a menos que tengas fotos en algún lado. ¿Tienes fotos de los productos nuevos o usamos placeholders por ahora?
3. **Confirmación de precios**: ¿Los precios del CSV son los precios finales de venta al público? ¿O son precios mayoristas? Esto afecta la lógica de descuentos y la comparación con competidores.
