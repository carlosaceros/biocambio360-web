# Solicitud de integración técnica — Sincronización de pedidos

**De:** Biocambio360 — Equipo de Desarrollo
**Para:** Equipo técnico del sistema de gestión de pedidos, inventario, materia prima y contabilidad
**Fecha:** 28 de septiembre de 2026

## 1. Contexto

Identificamos que su sistema ya gestiona pedidos de clientes, además de inventario, materia prima y contabilidad. Biocambio360 tiene su propio tablero de pedidos (Kanban) donde asesores comerciales dan seguimiento a cada venta desde que se toma hasta que se entrega. Hoy esos dos mundos están separados: un pedido tomado en su sistema no aparece en nuestro tablero, lo que genera riesgo de despachos duplicados, información desactualizada y trabajo manual de reconciliación.

Esta es una solicitud para que su sistema **exponga un servicio** que nos permita traer esos pedidos a nuestro tablero automáticamente, identificados claramente como pendientes de validación por un asesor antes de continuar el flujo normal (cotización de envío, confirmación de pago, despacho).

## 2. Objetivo

Que cada pedido tomado en su sistema llegue a nuestro tablero de pedidos en la columna **"Pendiente"**, marcado como originado en su sistema, sin duplicados, para que un asesor lo valide (dirección, productos, cotización) antes de continuar.

## 3. Alcance — por fases

| Fase | Dato | Prioridad |
|---|---|---|
| **1 (esta solicitud)** | Pedidos de clientes | Alta — objetivo inmediato |
| 2 | Inventario / niveles de stock por producto | Futura |
| 3 | Materia prima (consumo, existencias) | Futura |
| 4 | Contabilidad (asientos, conciliación) | Futura |

Proponemos avanzar primero con **pedidos** y, una vez funcionando de forma confiable, evaluar juntos las siguientes fases.

## 4. Opción técnica recomendada: webhook desde su sistema hacia el nuestro

La forma más simple y confiable: cuando se cree un pedido en su sistema, su sistema hace una petición `POST` a un endpoint que ya tenemos disponible de nuestro lado. Esto evita que ustedes tengan que exponer autenticación ni una API propia — solo necesitan poder hacer una petición HTTP saliente.

**Endpoint ya disponible:**
```
POST https://biocambio360.com/api/integraciones/pedidos-externos
```

**Autenticación:** header `Authorization: Bearer <token>`. El token se las compartiremos por un canal seguro (no por este documento), una vez confirmen que este es el mecanismo que van a usar.

**Alternativas** si un webhook no es viable de su lado en el corto plazo:
- **Opción B (nosotros consultamos su API):** si ya tienen un endpoint REST que liste pedidos nuevos, nosotros hacemos "polling" periódico (por ejemplo cada 5 minutos) y consumimos lo nuevo. Necesitaríamos: URL del endpoint, forma de autenticación, y un filtro por fecha o un cursor/paginación para no repetir pedidos ya traídos.
- **Opción C (respaldo):** exportación periódica a un archivo (JSON o CSV) en una ubicación compartida (SFTP, S3, Google Drive). Es la opción menos automatizada pero la más rápida de implementar si las anteriores no son posibles de inmediato.

Nuestra preferencia es la **Opción A (webhook)** por ser la más confiable y de menor latencia.

## 5. Contrato de datos propuesto (JSON)

```json
{
  "idExterno": "string (obligatorio) — identificador único del pedido en su sistema",
  "sistema": "string (opcional) — nombre de su sistema, ej. \"ERP-Ventas\"",
  "fecha": "string ISO 8601 (opcional)",
  "cliente": {
    "nombre": "string (obligatorio)",
    "cedula": "string (opcional)",
    "celular": "string (obligatorio)",
    "email": "string (opcional)",
    "departamento": "string (opcional)",
    "ciudad": "string (obligatorio)",
    "direccion": "string (obligatorio)",
    "barrio": "string (opcional)"
  },
  "productos": [
    {
      "nombre": "string (obligatorio) — nombre del producto tal como lo manejan ustedes",
      "presentacion": "string (opcional) — ej. \"20L\", \"10L\", \"1/2 galón\"",
      "cantidad": "number (obligatorio)",
      "precioUnitario": "number (obligatorio) — en pesos colombianos, sin decimales"
    }
  ],
  "envio": "number (opcional) — costo de envío si ya lo tienen calculado",
  "total": "number (opcional) — si no se envía, lo calculamos como suma de productos + envío",
  "metodoPago": "string (opcional) — ej. \"contraentrega\", \"transferencia\"; por defecto \"contraentrega\"",
  "notas": "string (opcional)"
}
```

**Notas sobre el contrato:**
- `idExterno` es la clave de idempotencia: si reenvían el mismo pedido (por ejemplo, por un reintento de red), no se duplica — respondemos con el pedido ya existente.
- El nombre del producto (`productos[].nombre`) se intenta emparejar automáticamente contra nuestro catálogo. Si no logramos identificarlo con certeza, el pedido se crea de todas formas, pero queda marcado visualmente para que el asesor lo revise antes de confirmar (no se pierde ni se inventa el producto).
- No es necesario que conozcan nuestros IDs de producto internos — basta el nombre tal como ustedes lo manejan.

**Respuestas del endpoint:**
- `201` — pedido creado. `{ "ok": true, "orderId": "...", "productosNoIdentificados": [...] }`
- `200` — pedido ya existía (mismo `idExterno`). `{ "ok": true, "orderId": "...", "yaExistia": true }`
- `400` — payload inválido o incompleto (faltan campos obligatorios).
- `401` — token de autenticación inválido o ausente.

## 6. Qué hacemos con el pedido de nuestro lado

- Se crea en el estado **"Pendiente"** de nuestro tablero.
- Queda marcado con una insignia visible "🔗 Externo · sin validar" (o "revisar productos" si algún artículo no se pudo identificar).
- El asesor valida la información (dirección, productos, cotización de envío) antes de continuar con el flujo normal de confirmación y despacho — no se despacha nada automáticamente sin esa validación humana.

## 7. Lo que podemos ofrecer a cambio

Si a ustedes también les sirve tener visibilidad de los pedidos o del inventario que manejamos nosotros (por ejemplo, para evitar que un mismo producto se venda dos veces desde ambos sistemas), podemos exponer un servicio simétrico de nuestro lado con el mismo enfoque (webhook o API REST). Con gusto lo conversamos una vez esta primera fase esté funcionando.

## 8. Información que necesitamos de ustedes para avanzar

1. Nombre del sistema (para identificarlo en el tablero y en nuestros registros).
2. Confirmación de cuál opción técnica es viable de su lado (A: webhook, B: nosotros consultamos su API, o C: archivo periódico).
3. Si es Opción B: URL del endpoint, método de autenticación, y forma de filtrar solo pedidos nuevos.
4. Un contacto técnico para coordinar la prueba inicial.

## 9. Próximos pasos propuestos

1. Confirmar la opción técnica (idealmente A).
2. Compartirles el token de autenticación por un canal seguro.
3. Hacer una prueba con 1-2 pedidos reales o de prueba, verificar que llegan correctamente a nuestro tablero.
4. Pasar a operación normal, monitoreando los primeros días.
5. Evaluar juntos si continuamos con inventario (Fase 2) como siguiente paso.
