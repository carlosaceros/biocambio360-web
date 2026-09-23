# Product Requirements Document (PRD)
## Integración de WhatsApp Cloud API en CRM Custom (Next.js + Firebase)

### 1. Visión General del Proyecto
**Objetivo:** Integrar la API de WhatsApp Cloud (Graph API de Meta) directamente en un CRM propietario construido en Next.js y alojado en Vercel (biocambio360.com). El sistema centralizará la bandeja de entrada de mensajes sin depender de CRMs de terceros (SaaS), permitiendo envío de mensajes proactivos (ej. "Recordatorio 1-Clic") y habilitando una capa de Inteligencia Artificial como middleware.

**Stack Tecnológico:**
*   **Frontend/Backend:** Next.js (App Router) alojado en Vercel.
*   **Base de Datos/Reactividad:** Firebase (Firestore) - Admin SDK para backend, Client SDK para frontend.
*   **API de Mensajería:** Meta Graph API (WhatsApp Cloud API).
*   **IA (Futuro):** Google Gemini (o similar) para triaje y consultas al ERP.

### 2. Alcance y Características Principales (MVP)

#### 2.1. Webhook de Recepción (Inbound)
*   **Ruta:** `/app/api/webhook/whatsapp/route.ts` (Obligatorio configurar `export const runtime = 'nodejs';` para compatibilidad con Firebase Admin en Vercel).
*   **Método GET:** Validación del `hub.verify_token` y respuesta del `hub.challenge` para vincular con Meta for Developers.
*   **Método POST:** 
    *   Recepción de *payloads* asíncronos (mensajes de texto, multimedia, estados de lectura).
    *   Extracción de datos clave: Número de teléfono (`from`), nombre de perfil, contenido del mensaje y timestamp.
    *   Escritura inmediata en Firestore antes de retornar HTTP 200 para evitar *timeouts* de Meta.

#### 2.2. Base de Datos y Sincronización en Tiempo Real (Firestore)
*   **Estructura de Datos propuesta:**
    *   Colección principal: `conversations` (ID del documento = número de teléfono).
    *   Campos del documento: `lastMessage`, `timestamp`, `unreadCount`, `status` (abierto, cerrado, bot).
    *   Subcolección: `messages` (Almacena el historial individual de cada chat).
*   **Frontend:** Uso de `onSnapshot` de Firebase para escuchar cambios en la subcolección de mensajes y actualizar la UI de la bandeja de entrada al instante sin WebSockets adicionales.

#### 2.3. Envío de Mensajes (Outbound - Respuestas Manuales)
*   **Endpoint/Server Action:** Función para que los agentes humanos envíen mensajes de texto o multimedia desde la interfaz del CRM.
*   **Acción:** Realiza una petición `POST` al endpoint de Meta `https://graph.facebook.com/v19.0/{PHONE_NUMBER_ID}/messages` usando un Token de Acceso Permanente.
*   **Persistencia:** Tras el envío exitoso (HTTP 200 de Meta), el mensaje se guarda en Firestore para reflejarse en el historial del chat.

#### 2.4. Mensajería Proactiva ("Recordatorio 1-Clic")
*   **Funcionalidad:** Botón en el módulo de "Reabastecimiento" del ERP que dispara un mensaje pre-aprobado a clientes con estado "Vencido".
*   **Tipo de Plantilla:** Marketing (Promocional/Re-enganche).
*   **Flujo:** El CRM inyecta las variables (ej. nombre del cliente, producto habitual) en la plantilla y hace el POST a la API de Meta.

#### 2.5. Capa de IA / Middleware (Intercepción)
*   El Webhook evaluará el estado de la conversación antes de alertar al agente humano.
*   La IA analizará la intención del mensaje entrante, consultará el ERP si es necesario (ej. estado de pedidos) o precalificará al cliente antes de cambiar el estado de la conversación a "Asignado a Humano".

### 3. Modelo de Costos y Facturación
*   **Licencias SaaS de CRM:** $0 USD.
*   **Infraestructura (Vercel/Firebase):** Basado en el consumo actual de biocambio360.com.
*   **Costos de Meta API (Colombia +57):**
    *   Conversaciones de Marketing (Recordatorios 1-clic): ~$0.0125 USD por mensaje entregado.
    *   Conversaciones de Utilidad/Servicio: ~$0.0008 USD por mensaje.
*   **Requisito:** Tarjeta de crédito internacional configurada en Meta Business Manager.

### 4. Cronograma de Implementación (4 a 7 días)
*   **Fase 1 (Días 1-2):** Configuración en Meta, creación del Webhook en Next.js, conexión y escritura en Firestore.
*   **Fase 2 (Días 3-4):** Reactividad en UI, Server Actions para envío de mensajes 1-a-1, y disparadores para plantillas masivas (1-Clic).
*   **Fase 3 (Días 5-7):** Integración de lógica condicional en el Webhook para el bot/IA, prompts y pruebas de estrés en staging/producción.

### 5. Variables de Entorno Requeridas (Vercel)
*   `WHATSAPP_VERIFY_TOKEN`: Token seguro para la validación del webhook.
*   `WHATSAPP_PERMANENT_TOKEN`: Token del usuario del sistema en Meta.
*   `WHATSAPP_PHONE_ID`: Identificador del número de teléfono en la API.
*   `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`: Credenciales de servicio para Admin SDK.