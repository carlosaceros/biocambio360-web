# 🚀 Guía de Onboarding Técnico — Biocambio360 (E-commerce)

¡Bienvenido al equipo! Este documento es un resumen arquitectónico y técnico integral diseñado para que cualquier programador nuevo pueda tomar el control de la tienda virtual **Biocambio360** (evolución técnica de la plataforma *Pajarito*), entender sus flujos de datos, stack tecnológico y continuar con su desarrollo y mantenimiento sin fricciones.

---

## 1. Visión General del Proyecto y Estrategia de Negocio

**Biocambio360** es un e-commerce B2C y B2B centrado en la venta de **soluciones de limpieza profesional, automotriz e industrial**. 
A diferencia de tiendas de limpieza tradicionales, la plataforma utiliza una estrategia de **Growth y empaquetado inteligente (Bundling)** orientada a vender "soluciones completas" (Kits y Combos) con fórmulas altamente concentradas (que rinden hasta 3 veces más), aumentando así el **AOV (Average Order Value)** y la fidelización del usuario.

---

## 2. Stack Tecnológico Core

El proyecto está construido sobre una arquitectura moderna, rápida y altamente tipada:

- **Framework**: **Next.js 16** utilizando el **App Router** (`src/app`).
- **Lenguaje**: **TypeScript** con tipado estricto para garantizar la estabilidad del modelo de datos.
- **Estilos**: **Tailwind CSS v4** configurado nativamente con `@tailwindcss/postcss`. Hace uso intensivo de variables CSS en `src/app/globals.css` para el **Design System** (tokens de color corporativos: `--brand-blue`, `--brand-pink`, `--brand-dark`, `--brand-surface`, etc.).
- **Animaciones e Interfaz Dinámica**: **Framer Motion** (`framer-motion`) para gestionar micro-interacciones premium (ej. animaciones al agregar al carrito, modales de vista rápida y el panel lateral del carrito). Iconografía vectorial mediante **Lucide React** (`lucide-react`).
- **Base de Datos y Autenticación**: **Firebase / Firestore** (Región `us-east1`) y **Firebase Authentication**.

---

## 3. Arquitectura de Carpetas (`src/`)

La lógica está completamente modularizada dentro del directorio `src/`:

```text
src/
├── app/                  # Rutas del App Router de Next.js
│   ├── admin/            # Panel de administración interno
│   ├── api/              # Route Handlers (Endpoints backend: wompi, envios, cron, etc.)
│   ├── checkout/         # Flujo completo de pasarela y formulario de compra
│   ├── producto/         # Páginas de detalle de producto (PDP)
│   ├── layout.tsx        # Layout principal (proveedores de contexto, fuentes, SEO)
│   └── page.tsx          # Home page orientada a conversión, hero y catálogo
│
├── components/           # Componentes de UI reutilizables
│   ├── ComboBuilder.tsx  # Módulo interactivo "Combotizador" (Combos fijos y personalizados)
│   ├── CartDrawer.tsx    # Carrito lateral deslizable con barra de envío gratis
│   ├── ProductCard.tsx   # Tarjetas de producto con selectores de tamaño rápidos
│   └── ProductQuickView  # Modal de vista rápida de producto
│
├── lib/                  # Lógica de negocio, servicios e integraciones
│   ├── cart-context.tsx  # Estado global del carrito (React Context + LocalStorage)
│   ├── products-data.ts  # Catálogo estático masivo pre-cargado (Seed Data)
│   ├── products-service  # Lógica de conexión, caché y CRUD con Firestore (productos)
│   ├── orders-service.ts # Persistencia de pedidos y líneas de tiempo en Firestore
│   ├── wompi-service.ts  # Generación y validación de firmas criptográficas para pagos
│   └── 99envios-service  # Cotización en tiempo real y generación de guías de envío
│
└── types/                # Interfaces TypeScript estrictas
    └── order.ts          # Modelo de datos de Pedidos, Estados y Timeline
```

---

## 4. Gestión de Datos y Estado Global

### A. Catálogo Híbrido (Memoria + Firestore)
Para garantizar tiempos de carga instantáneos (SSR/SSG) y minimizar costos de lectura en Firestore, el sistema implementa un patrón de **caché en memoria**:
- En `src/lib/products-data.ts` reside una lista exhaustiva de SKUs pre-cargados.
- La función `getAllProducts()` en `src/lib/products-service.ts` consulta Firestore y fusiona los resultados con los datos locales, manteniendo una **caché activa de 5 minutos**.

### B. Carrito de Compras (`CartContext`)
El estado del carrito se maneja puramente en el cliente mediante `src/lib/cart-context.tsx`:
- **Persistencia**: Se sincroniza automáticamente con `localStorage` bajo la llave `pajarito_cart`.
- **Hidratación**: Maneja un estado interno `isHydrated` para prevenir errores de discrepancia en el renderizado del lado del servidor (SSR vs. CSR).
- **Cálculo de Ahorros**: Cada ítem evalúa su precio frente al competidor promedio (`competidorPromedio`) para calcular de forma dinámica el ahorro en pesos y porcentaje, incentivando el gatillo psicológico de fomo/ahorro.

---

## 5. Integraciones Críticas de Terceros

Cualquier cambio en los flujos de checkout debe respetar el contrato de estas dos integraciones core:

### 1. Pasarela de Pagos: Wompi
- **Servicio**: `src/lib/wompi-service.ts`
- **Endpoints**: `src/app/api/wompi/`
- **Mecanismo de Seguridad**: Utiliza criptografía nativa de Node.js (`crypto`) para generar la firma de integridad requerida por el WebCheckout de Wompi mediante la fórmula `SHA256(reference + amountInCents + currency + integritySecret)`.
- **Webhooks**: Valida dinámicamente las notificaciones de estado de transacción usando el secreto de eventos (`WOMPI_EVENTS_SECRET`).

### 2. Logística y Envíos: 99Envíos
- **Servicio**: `src/lib/99envios-service.ts`
- **Endpoints**: `src/app/api/envios/`
- **Flujo**:
  1. **Autenticación**: Gestiona internamente un token JWT temporal en caché con duración de 55 minutos para evitar peticiones redundantes de login.
  2. **Cotización**: Al ingresar los datos en el checkout, consulta la API de 99Envíos enviando el código DANE de la ciudad destino, peso volumétrico predeterminado (~5kg por galón) y el origen fijo configurado (Planta Soacha / Biocambio360).
  3. **Pre-envío**: Tras la confirmación del pedido, genera automáticamente la guía logística con soporte para envíos estándar o **pago contraentrega**.

---

## 6. Módulos Clave de Growth y Conversión

### El "Combotizador" (`ComboBuilder.tsx`)
Ubicado en la página principal y accesible en el ancla `#combos`, es el motor principal para elevar el ticket promedio:
- **Pestaña 1 (Combos Populares)**: Muestra paquetes preconfigurados en `src/lib/combos.ts` (ej. *Kit Matrimonio*, *Abastecimiento Total*) con beneficios claros, duración estimada y gradientes de diseño atractivos.
- **Pestaña 2 (Arma tu Combo)**: Permite al usuario seleccionar SKUs individuales y aplicar **descuentos escalonados automáticos** según el volumen:
  - 2 ítems = **5% de descuento**
  - 3 ítems = **7% de descuento**
  - 4 ítems = **10% de descuento**
  - 6+ ítems = **15% de descuento**
- **Barra de Envío Gratis**: Se actualiza en tiempo real mostrando los pesos faltantes para alcanzar el umbral de envío gratuito ($100.000 COP).

---

## 7. Hoja de Ruta y Continuidad (Próximos Pasos)

Para dar continuidad inmediata al proyecto, enfócate en las siguientes tareas prioritarias (documentadas a fondo en `PLAN_IMPLEMENTACION.md`):

1. **Expansión del Catálogo de Productos (Fase 1)**
   - Actualmente la base activa en UI expone un subconjunto de productos. En la raíz del proyecto existe el archivo maestro `PRECIOS-2026-4-ABRIL-BIOCAMBIO360.csv` con **~480 líneas y ~30 categorías** (Limpiapisos con aromas, Ceras, Línea Automotriz, etc.).
   - **Objetivo**: Ejecutar o refinar el script de migración/parseo para poblar Firestore o actualizar `products-data.ts` soportando múltiples tamaños dinámicos (desde 250ml hasta 20L).

2. **Reemplazo de Assets Visuales**
   - Muchos SKUs recién importados tienen configurada la imagen `placeholder.png`. Se requiere coordinar con el cliente la carga de fotografías o renders finales en la carpeta `public/images/` o en un bucket de almacenamiento.

3. **Navegación por Segmentos (Fase 2)**
   - Implementar el menú de navegación superior y selectores basados en **arquetipos de cliente** (Hogar, Restaurante, Oficina, Airbnb) tal como lo describen los documentos de requerimientos de producto (`prd_1.md` y `prd_2.md`).

---

## 🛠️ Comandos de Uso Diario

- **Iniciar entorno de desarrollo local** (Puerto configurado en 3001 para evitar colisiones):
  ```bash
  npm run dev
  ```
- **Construcción para Producción**:
  ```bash
  npm run build
  ```
- **Verificación de Linter**:
  ```bash
  npm run lint
  ```

---
*¡Mucho éxito en esta etapa! Tienes en tus manos una plataforma robusta, rápida y optimizada para escalar.*
