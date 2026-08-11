# 🚀 Guía de Onboarding Técnico: Tienda Virtual Biocambio360 (Pajarito)

Este documento es un resumen técnico exhaustivo diseñado para que cualquier programador nuevo pueda asimilar rápidamente la arquitectura, el modelo de datos, las integraciones de terceros y el flujo de trabajo de la tienda virtual **Biocambio360** (Pajarito Web), garantizando una continuidad fluida en el mantenimiento y desarrollo de nuevas funcionalidades.

---

## 1. Stack Tecnológico y Arquitectura

El proyecto está construido bajo una arquitectura moderna de renderizado híbrido y del lado del cliente utilizando el ecosistema de React y Next.js:

* **Framework Core**: [Next.js 16.1.6](https://nextjs.org/) utilizando el **App Router** (`src/app`).
* **Librería de UI**: [React 19.2.3](https://react.dev/) con TypeScript estricto.
* **Estilos y Diseño**: [Tailwind CSS v4](https://tailwindcss.com/) integrado a través de PostCSS, combinando un potente sistema de variables CSS nativas (`src/app/globals.css`) para mantener el *Design System* de la marca (colores vibrantes, glassmorphism, modo oscuro/claro).
* **Animaciones e Interacción**: `framer-motion` para micro-animaciones fluidas, transiciones de modales, *quick views* y el *Cart Drawer*.
* **Iconografía**: `lucide-react`.

---

## 2. Estructura del Proyecto

El código fuente está completamente contenido dentro de la carpeta `src/`, organizado modularmente para separar la capa de vistas (UI) de la lógica de negocio e integraciones:

```text
nueva_marca_nextjs/
├── src/
│   ├── app/                # Rutas de la aplicación (Next.js App Router)
│   │   ├── admin/          # Panel de administración interno
│   │   ├── api/            # Endpoints backend (Webhooks de Wompi, Envíos, etc.)
│   │   ├── checkout/       # Flujo completo de pasarela y formulario de compra
│   │   ├── globals.css     # Design System: Tokens de color, utilidades y configuración base
│   │   ├── layout.tsx      # Estructura principal, fuentes optimizadas y proveedores de contexto
│   │   └── page.tsx        # Página de inicio (Hero de kits, catálogo filtrable y señales de confianza)
│   │
│   ├── components/         # Componentes reutilizables de UI
│   │   ├── CartDrawer.tsx  # Carrito lateral deslizable con barra de envío gratis y cross-selling
│   │   ├── ComboBuilder.tsx# Módulo interactivo ("Combotizer") para armar combos a medida
│   │   ├── ProductCard.tsx # Tarjetas de producto con selectores de tamaño y fomento de escasez/ahorro
│   │   └── ProductQuickView.tsx # Modal de vista rápida con detalles completos del producto
│   │
│   ├── hooks/              # Hooks personalizados de React
│   │
│   ├── lib/                # Capa de servicios, utilidades y estado global
│   │   ├── cart-context.tsx# Contexto del carrito de compras (persistencia e hidratación)
│   │   ├── products.ts     # Definición de tipos principales (Product, ProductSize) y cálculo de ahorro
│   │   ├── products-data.ts# Base de datos estática generada a partir del CSV maestro de precios
│   │   ├── combos.ts       # Lógica y datos de los combos/kits predefinidos y reglas de descuento
│   │   ├── wompi-service.ts# Integración criptográfica y validación de pasarela Wompi
│   │   ├── 99envios-service.ts # Integración logística (cotización DANE y preenvíos)
│   │   └── pricing-service.ts  # Servicio de scraping (Serper) e IA (Gemini) para precios de mercado
│   │
│   └── types/              # Definiciones de URLs y tipos globales adicionales
│
├── PRECIOS-2026-4-ABRIL-BIOCAMBIO360.csv # Archivo plano original con precios y catálogo maestro
├── PLAN_IMPLEMENTACION.md  # Bitácora histórica de fases, brechas y requerimientos de negocio
└── package.json            # Dependencias y scripts de ejecución
```

---

## 3. Modelo de Datos y Catálogo Maestro

El catálogo de productos es altamente dinámico y maneja múltiples variantes de tamaño y aroma. Históricamente, el sistema partió de un CSV plano con más de 480 líneas (`PRECIOS-2026-4-ABRIL-BIOCAMBIO360.csv`).

### Interfaz Principal (`src/lib/products.ts`)
Cada producto sigue una estructura estandarizada diseñada para inyectar escasez, confianza y valor comparativo:

```typescript
export interface Product {
    id: string;
    nombre: string;
    slogan: string;
    descripcion: string;
    imgFile: string;
    imgFileSmall?: string;
    beneficios: string[];
    badge: string;            // Ej: "ECONÓMICO", "MÁS VENDIDO"
    color: string;            // Clase de Tailwind para acentos
    categoria: string;        // Ej: "Aseo Hogar", "Línea Industrial", "Automotriz"
    subcategoria?: string;
    faqs: FAQ[];
    precios: Record<string, number>; // Mapa de tamaños a precios finales en COP
    competidorPromedio: Record<string, number>; // Precios del mercado para calcular el ahorro visible
}
```

> **💡 Nota de Mantenimiento:** La semilla completa de productos se encuentra pre-generada e importada desde `src/lib/products-data.ts`. Si se requiere modificar precios o agregar nuevos productos, se debe editar dicho archivo o implementar un sincronizador directo con Firestore/CSV.

### Sistema de Combos (`src/lib/combos.ts`)
El e-commerce está fuertemente enfocado en la venta de volumen mediante kits/combos.
* **Combos Predefinidos**: (Ej. *Kit Matrimonio*, *Suavidad & Aroma*, *Abastecimiento Total*) tienen descuentos fijos precalculados.
* **Combo Personalizado (Combotizer)**: Permite al usuario mezclar productos de tallas grandes (`3.8L`, `10L`, `20L`) aplicando una lógica de descuentos escalonados automáticamente (ej. $\ge 6$ ítems = 15% de descuento).

---

## 4. Gestión del Estado (Carrito de Compras)

El estado global de la compra se administra mediante React Context en `src/lib/cart-context.tsx`.

* **Persistencia Local**: Utiliza `localStorage` bajo la clave `pajarito_cart` para que el usuario no pierda su selección al recargar o regresar a la tienda.
* **Hidratación Segura**: Maneja una bandera interna `isHydrated` para prevenir errores de discrepancia de UI (*hydration mismatches*) entre el servidor de Next.js y el cliente.
* **Cálculo de Ahorro en Tiempo Real**: Expone métodos como `getTotalSavings()` que utilizan la función `calcularAhorro` para mostrarle al usuario exactamente cuánto dinero está ahorrando en comparación con marcas tradicionales, activando disparadores psicológicos de compra (*FOMO*).

---

## 5. Integraciones de Terceros (Servicios Core)

El e-commerce depende de tres pilares externos fundamentales para operar:

### A. Pasarela de Pagos: Wompi (`src/lib/wompi-service.ts`)
Maneja pagos seguros en Colombia (PSE, Tarjetas, Nequi).
* **Firma de Integridad**: Antes de enviar al usuario al *WebCheckout*, se genera un hash SHA256 combinando la referencia de pago, el monto en centavos, la moneda y la variable de entorno secreta `WOMPI_INTEGRITY_SECRET`.
* **Webhooks Dinámicos**: Los eventos asíncronos de confirmación de pago enviados por Wompi se validan usando `validateWebhookDynamicSignature()` en combinación con `WOMPI_EVENTS_SECRET` para garantizar que la transacción no ha sido alterada.

### B. Logística y Envíos: 99Envíos (`src/lib/99envios-service.ts`)
Automatiza el cálculo del flete y la creación de guías desde la fábrica en Soacha (`codigo: '25754000'`).
* **Autenticación**: Gestiona tokens de acceso temporal en caché (duración de 55 minutos) de forma transparente.
* **Cotización en Vivo**: La función `cotizarEnvio()` se comunica con la API pasándole el código DANE de la ciudad de destino, peso estimado y dimensiones, devolviendo la transportadora más económica disponible.
* **Generación de Guías**: `crearPreenvio()` asocia los datos del destinatario para emitir la orden logística de despacho.

### C. Inteligencia de Precios: Serper + Gemini (`src/lib/pricing-service.ts`)
Un servicio innovador que dota a la tienda de inteligencia competitiva.
* Realiza búsquedas automatizadas en Google (vía `Serper.dev`) consultando los precios de productos industriales similares en almacenes de cadena o marketplaces.
* Pasa los resultados crudos a **Gemini 2.5 Flash** solicitando una estructura JSON estricta para extraer el precio promedio real del mercado en presentaciones de `3.8L`, `10L` y `20L`, lo cual alimenta los *badges* de ahorro de la plataforma.

---

## 6. Flujo de Checkout y Experiencia de Usuario

1. **Selección**: El usuario interactúa desde `src/app/page.tsx` agregando productos unitarios o armando kits en el `ComboBuilder`.
2. **Revisión**: El `CartDrawer` le muestra una barra de progreso hacia el envío gratis y le ofrece productos complementarios (*Cross-selling*).
3. **Checkout (`src/app/checkout/`)**:
   * Captura de datos de despacho (Nombre, Cédula/NIT, Teléfono, Dirección, Ciudad mediante autocompletado DANE).
   * Invocación a la API interna que consume `99envios-service.ts` para liquidar el costo exacto de transporte.
   * Generación de la referencia única de pedido y firma criptográfica para redireccionar de forma segura al WebCheckout de Wompi.

---

## 7. Design System y Directrices de UI/UX

Para mantener el estándar premium y la alta conversión de la tienda, cualquier nuevo componente debe apegarse a:
* **Colores Semánticos**: Usar las clases mapeadas a las variables CSS (`var(--brand-blue)`, `var(--brand-pink)`, `var(--brand-surface)`, `var(--brand-dark)`). Evitar colores genéricos de Tailwind sin alinear a la paleta.
* **Bordes y Sombras Premium**: Los elementos principales utilizan esquinas altamente redondeadas (`rounded-2xl`, `rounded-[2.5rem]`) y sombras suaves (`shadow-xl`, `shadow-sm` con bordes sutiles `border border-gray-100` o `border-white/10`).
* **Tipografía**: La jerarquía es crítica. Los títulos utilizan pesos altos (`font-black`) y un tracking ajustado (`tracking-tighter`) para proyectar solidez industrial.

---

## 8. Hoja de Ruta y Próximos Pasos (Continuidad)

Al recibir este proyecto, las tareas prioritarias para dar continuidad al backlog técnico son:

1. **Reemplazo de Imágenes Placeholder**: Gran parte de los productos en `products-data.ts` tienen configurado `"imgFile": "placeholder.png"`. Es prioritario conectar/cargar las fotografías reales de los envases y garrafas en la carpeta `public/` o un CDN externo.
2. **Filtros Avanzados en Catálogo**: Habilitar en `src/app/page.tsx` el filtrado cruzado por tamaño y rango de precios, además de las categorías y subcategorías ya implementadas.
3. **Calculadora de Rendimiento**: Diseñar e integrar un widget visual en el detalle del producto (`ProductQuickView`) que traduzca el volumen en litros a "Cargas de lavado" o "Semanas de duración" estimadas.
4. **Landing B2B (Empresas)**: Implementar la ruta `/empresa` para captación de clientes mayoristas, restaurantes y hoteles con un formulario conectado al servicio de correos electrónico.
5. **Pruebas de Integración**: Realizar transacciones de prueba en el entorno de *sandbox* de Wompi para certificar la correcta ingesta de webhooks en producción.
