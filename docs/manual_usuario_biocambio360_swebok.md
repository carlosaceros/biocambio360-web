# Manual de Usuario y Guía Operativa de la Plataforma ERP/CRM Biocambio360
### Basado en Estándares SWEBOK (IEEE Computer Society) y Buenas Prácticas de Transferencia de Conocimiento (Knowledge Transfer)

---

## Control del Documento
- **Organización:** Biocambio360 S.A.S. (Planta de Fabricación Soacha, Cundinamarca)
- **Documento:** MAN-SOP-OPS-001 (Versión 2.5)
- **Áreas SWEBOK de Referencia:** Software Operation (Cap. 12), Software Quality (Cap. 10), Software Engineering Management (Cap. 7), Software Configuration Management (Cap. 6).
- **Destinatarios:** Todo el personal operativo, comercial, logístico, administrativo y directivo de Biocambio360.

---

## 1. Introducción y Arquitectura Funcional de la Plataforma

### 1.1 Propósito
Estandarizar los procedimientos operativos, eliminar dependencias informales ("cero hojas de cálculo sueltas") y asegurar una transferencia de conocimiento estructurada para la capacitación ágil y continua de nuevos colaboradores.

### 1.2 Flujo Integral de la Cadena de Valor (E2E)
```
[Captación Multicanal]
    ├── Tienda Virtual (Shopify-Free Next.js)
    ├── Asesores Call Center / WhatsApp Business
    └── Punto de Venta Físico Mostrador (Soacha)
            │
            ▼
   [Motor de Pedidos ERP] ── (Si es Borrador: NO descuenta stock)
            │
            ├── Confirmado ── (Descuenta stock en bodega automáticamente)
            │
            ▼
    [Alistamiento Bodega] ── (Empaque químico certificado INVIMA)
            │
            ▼
      [Despacho & Ruta] ── (99 Envíos / Flota Propia / Transportadoras)
            │
            ├───────────────┬────────────────────────┐
            ▼               ▼                        ▼
      [Entregado]     [No Entregado / Novedad]   [Siniestro en Ruta]
     (Fidelización)   (Tratamiento Especial:    (Reclamación seguro,
                       Reintento o Devolución)   sin reingreso de stock)
```

---

## 2. Matriz RACI y Modelo de Roles (RBAC)

| Módulo / Proceso | Superadmin | Director | Gestor Logístico | Jefe Planta / Calidad | Asesor Comercial | Cajero Mostrador |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Cockpit Asesores (`/admin/asesores`)** | A | I | I | I | **R / C** | I |
| **Venta Rápida `FastOrderModal`** | A | I | C | I | **R** | **R** |
| **Borradores & Cotizaciones** | A | I | I | I | **R** | I |
| **Novedades Contraentrega** | A | I | **R** | I | **R** | I |
| **Gestión de Pedidos (`/admin/pedidos`)** | A | I | **R** | C | I | I |
| **Punto de Venta (`/admin/pos`)** | A | I | I | I | I | **R** |
| **Producción & Calidad (`/admin/produccion`)**| A | C | C | **R** | I | I |
| **Finanzas & P&L (`/admin/finanzas`)** | A | **R** | I | I | I | I |
| **Mapas de Calor (`/admin/informe-ventas`)**| A | **R** | C | I | I | I |
| **Gestión de Usuarios (`/admin/usuarios`)** | **R / A** | I | I | I | I | I |
| **Bitácora ISO 9001 (`/admin/auditoria-envios`)**| **R / A** | I | C | I | I | I |

*Convenciones RACI:* **R** = Responsable de ejecución, **A** = Aprobador / Responsable final, **C** = Consultado, **I** = Informado.

---

## 3. Procedimientos Operativos Estandarizados (SOPs por Rol)

### ROL: ASESOR COMERCIAL (Karen, Katherine, Andrea, Laura, Camilo)

#### SOP-ADV-01: Prospección y Recompra Inteligente en el Cockpit
- **Objetivo:** Atender llamadas o mensajes de WhatsApp reduciendo el ciclo de contacto a menos de 2 minutos.
- **Ruta:** `/admin/asesores`
- **Paso a Paso:**
  1. Ingresa a la pestaña **"Clientes Prioritarios & Tareas"**.
  2. Identifica los clientes con indicador *"Ciclo Recompra Cumplido"* (cada 25-35 días según consumo promedio de 20L o galones).
  3. Haz clic en el botón verde **WhatsApp** para abrir el chat con el cliente con el mensaje pre-redactado de cortesía.
  4. Si el cliente solicita pedido de inmediato, haz clic en **"⚡ Pedido 1-Clic"**. Los datos del cliente se precargarán automáticamente en el modal de venta rápida.

#### SOP-ADV-02: Creación y Cierre de Cotizaciones en Borrador
- **Objetivo:** Generar cotizaciones formales para clientes indecisos sin alterar el inventario físico ni los estados financieros.
- **Ruta:** Atajo `Ctrl + N` o botón flotante **"⚡ Nuevo Pedido Rápido"**.
- **Paso a Paso:**
  1. Digita el número de celular del cliente (búsqueda automática en CRM). Si no existe, ingresa nombre, dirección y ciudad.
  2. Agrega los productos solicitados y el método de entrega (Flota Propia o 99 Envíos con cotización automática de flete).
  3. Si el cliente manifiesta: *"Voy a consultar con mi socio"*, *"Espero el pago de quincena"* o *"Envíame la cotización formal"*:
     - **NO** confirmes el pedido.
     - Selecciona el **Motivo de Pausa / Cotización**.
     - Haz clic en **"💾 Guardar como Borrador / Actualizar Borrador"**.
  4. El sistema generará una pantalla con botón para enviar por WhatsApp la cotización formal con el desglose exacto de productos, flete y total.
  5. **Regla Innegociable:** Este borrador no descuenta stock en bodega.
  6. Para retomar la venta: ve a la pestaña **"Borradores & Cotizaciones"**, haz clic en **"⚡ Retomar & Cerrar"**, confirma con el cliente y haz clic en **"Confirmar y Despachar"**. En ese instante se descuenta el stock y pasa a bodega.

#### SOP-ADV-03: Tratamiento y Rescate de Pedidos Contraentrega No Entregados
- **Objetivo:** Recuperar pedidos contraentrega que la transportadora reportó como fallidos, evitando pérdidas logísticas.
- **Ruta:** Pestaña **"⚠️ Novedades & Rescate"** en `/admin/asesores` o botón en `/admin/pedidos`.
- **Paso a Paso:**
  1. Revisa las tarjetas en rojo. Cada tarjeta muestra el motivo original (ej: *Cliente Ausente*, *Sin Efectivo*, *Dirección Errónea*).
  2. Haz clic en **"Contactar por WhatsApp"** para validar con el cliente qué ocurrió.
  3. Haz clic en **"⚡ Tratar Novedad"** para abrir el modal de resolución:
     - **Opción A (Reintento de Entrega):** Acuerda la nueva fecha y franja horaria. Si la política comercial aplica flete adicional, selecciona la tarifa especial (ej: `+$10.000` o `$0 Cortesía`). Si es en Bogotá/Sabana, asígnalo a **Flota Propia Biocambio360** para entrega directa.
     - **Opción B (Devolver a Bodega):** Si el cliente desistió definitivamente, confirma la devolución. El sistema cancela la orden y **restituye el stock físico a bodega**.
     - **Opción C (Pérdida / Siniestro Transportadora):** Si el paquete fue hurtado o extraviado por la empresa de mensajería, regístralo con el número de radicado. **No restituye stock** y genera el expediente para cobro de seguro.

---

### ROL: GESTOR OPERATIVO Y LOGÍSTICO

#### SOP-LOG-01: Tablero Kanban y Alistamiento de Pedidos
- **Objetivo:** Procesar y rotar pedidos a través de las etapas operativas sin pérdidas de información.
- **Ruta:** `/admin/pedidos`
- **Paso a Paso:**
  1. **Pendiente:** Pedidos entrantes pendientes de verificación telefónica o pago.
  2. **Confirmado:** Pedidos listos para impresión de rótulos de despacho.
  3. **En Preparación:** Bodega empaca los bidones con precinto de seguridad antiderrames y lote INVIMA visible.
  4. **Enviado / En Camino:** Pedido entregado al vehículo de Flota Propia o recolectado por 99 Envíos.
  5. Al cambiar de etapa, el sistema solicita un comentario logístico opcional y envía automáticamente un correo electrónico al cliente con el enlace de rastreo en vivo de su guía.

---

### ROL: CAJERO MOSTRADOR SOACHA

#### SOP-POS-01: Cobro Táctil y Facturación Rápida
- **Objetivo:** Registrar ventas en punto de fábrica en menos de 15 segundos.
- **Ruta:** `/admin/pos`
- **Paso a Paso:**
  1. Toca sobre la categoría de productos (Detergentes, Desengrasantes, Ambientadores, Desinfectantes).
  2. Selecciona la presentación requerida: Galón (3.8L), Garrafa (10L), Caneca (20L) o Envase de 1L.
  3. Elige el medio de pago: Efectivo Mostrador, Transferencia Bancolombia/Nequi, Wompi QR o Contraentrega local.
  4. Haz clic en **"Completar Venta"** para imprimir la tirilla de caja. El inventario local de la tienda de fábrica se descuenta en tiempo real.

#### SOP-POS-02: Arqueo Ciego de Caja
- **Objetivo:** Garantizar la transparencia en la custodia de efectivo diario.
- **Paso a Paso:**
  1. Al finalizar el turno, el cajero cuenta el dinero físico presente en el cajón monedero.
  2. Ingresa el valor contado en el campo de "Arqueo Ciego" (el cajero no ve el total esperado del sistema antes de digitar).
  3. El sistema compara el valor real con las ventas registradas y emite el reporte de cuadre (Sobrante, Faltante o Exacto) registrando la firma digital en auditoría ISO 9001.

---

### ROL: JEFE DE PLANTA & CALIDAD (Diego)

#### SOP-PRD-01: Planificación de Lotes Químicos y Trazabilidad INVIMA
- **Objetivo:** Controlar las recetas químicas (BOM) y los registros sanitarios de cada lote producido.
- **Ruta:** `/admin/produccion`
- **Paso a Paso:**
  1. Selecciona el producto a formular (ej: *Detergente Enzimático Concentrado 20L*).
  2. El sistema valida las materias primas necesarias (Tensoactivos, Enzimas, Colorante, Esencia, Preservantes).
  3. Genera la orden de producción con el número de lote consecutivo (ej: `LOT-2026-09-001`).
  4. Asienta la liberación de calidad (densidad, viscosidad, pH 7.0 ± 0.5) antes de autorizar el paso a bodega de producto terminado disponible para la venta.

---

### ROL: DIRECTOR ESTRATÉGICO (Fernando, Danilo, Julián)

#### SOP-DIR-01: Auditoría Financiera, P&L y Márgenes de Contribución
- **Objetivo:** Evaluar la salud financiera y la rentabilidad neta diaria y mensual.
- **Ruta:** `/admin/finanzas`
- **Paso a Paso:**
  1. Configura el selector de periodo: Hoy, Últimos 7 Días, Mes Actual o Rango Personalizado.
  2. Examina los KPIs clave: Ventas Brutas, Ventas Entregadas, Fletes Recaudados y Descuentos de Cupones.
  3. Revisa la distribución por medios de pago (Contraentrega vs Wompi vs Addi vs Mostrador).
  4. Revisa los costos fijos asignados (nómina, arrendamiento planta Soacha, servicios) para verificar el margen neto operativo real.

#### SOP-DIR-02: Mapas de Calor de Distribución Geográfica
- **Objetivo:** Optimizar las rutas logísticas y la inversión publicitaria por localidad y departamento.
- **Ruta:** `/admin/informe-ventas` -> Pestaña **"🗺️ Distribución Geográfica"**
- **Paso a Paso:**
  1. **Vista Bogotá & Sabana:** Analiza qué localidades (Kennedy, Suba, Engativá, Usaquén, Bosa) tienen mayor densidad de pedidos. Utiliza esta información para programar camiones de Flota Propia en rutas optimizadas (Norte vs Sur/Occidente) y reducir fletes externos.
  2. **Vista Nacional:** Revisa la tasa de efectividad contraentrega en departamentos como Antioquia, Valle del Cauca y Santander para ajustar tarifas de envío o exigir anticipo en zonas con mayor tasa de devolución.

---

## 4. Guía de Resolución de Problemas (Troubleshooting) y Escalamiento

| Incidente | Causa Probable | Procedimiento de Solución Inmediata | Nivel de Escalamiento |
| :--- | :--- | :--- | :--- |
| **Cliente no recibió enlace de tracking** | Guía aún no generada o correo rebotado | Ingresar al pedido, copiar la guía y enviar manualmente el enlace directo oficial (generado con `shipping-tracking.ts`) por WhatsApp. | Nivel 1: Asesor Comercial |
| **Transportadora no encuentra la dirección** | Nomenclatura ambigua | Abrir modal de novedad, llamar al cliente por WhatsApp, solicitar ubicación GPS en tiempo real y actualizar la dirección en la orden. | Nivel 1: Asesor Comercial |
| **Paquete averiado o derramado en ruta** | Falla de embalaje o maltrato de transportadora | Declarar siniestro en el modal (`resolucion: perdido_transportadora`), ingresar radicado de reclamación y reprogramar un nuevo despacho al cliente sin costo adicional. | Nivel 2: Gestor Logístico |
| **Diferencia en arqueo de caja mostrador** | Billete no registrado o cambio mal entregado | Ejecutar arqueo ciego, cotejar vouchers de datáfono Wompi y notas de traslados físicos antes del cierre definitivo de turno. | Nivel 2: Gestor Operativo |

---

## 5. Instrumento de Evaluación Formativa y Certificación de Uso (Checklist SWEBOK)

Para certificar a un nuevo colaborador en la plataforma Biocambio360, el supervisor debe validar el 100% de los siguientes hitos:

- [ ] **Hito 1 (Navegación):** El usuario inicia sesión, reconoce su rol y las limitaciones de sus capacidades en el menú lateral.
- [ ] **Hito 2 (Venta Rápida):** Crea un pedido en menos de 45 segundos usando el atajo `Ctrl + N` y busca un cliente en el CRM por celular.
- [ ] **Hito 3 (Borrador Comercial):** Guarda una cotización como borrador seleccionando el motivo de pausa y la comparte por WhatsApp.
- [ ] **Hito 4 (Retoma y Cierre):** Retoma el borrador desde la pestaña correspondiente y lo pasa a confirmado, verificando que el stock de bodega se descuente correctamente.
- [ ] **Hito 5 (Novedad Contraentrega):** Gestiona un caso de cliente ausente, programa un reintento con tarifa especial y registra la nota de auditoría ISO 9001.
- [ ] **Hito 6 (Tours Guiados):** Utiliza el botón flotante `🎓 Tours & Ayuda` para repetir y afianzar cualquiera de los 5 flujos interactivos de la plataforma.

---
*Fin del Manual Operativo Biocambio360 — Documento controlado bajo política de calidad ISO 9001:2015.*
