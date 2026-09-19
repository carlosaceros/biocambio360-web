# Informe Forense y Estrategia de Integración: Excels "nuevos_19_sept"
## Biocambio360 S.A.S. — Conciliación Industrial, Trazabilidad SGC y Calidad de Datos

---

## 1. Radiografía Forense de los Archivos Auditados

El script automatizado `scripts/etl_parse_production_and_sgc.py` ejecutó una auditoría exhaustiva sobre los archivos recibidos en la carpeta `EXCELS POR INTEGRAR/nuevos_19_sept`:

| Componente | Tipo de Información | Volumen / Registros | Impacto Operativo |
|---|---|---|---|
| **Carpetas `2025/` (11 Meses)** | Órdenes de Producción SGC individuales (`FR-001-POE-007`) | **1,536 archivos Excel** | Histórico lote por lote de todo el año 2025: formulaciones, materias primas pesadas, presentaciones envasadas (250ml a 20L). |
| **Carpetas `2026/` (9 Meses a Septiembre)** | Órdenes de Producción SGC individuales (`FR-001-POE-007`) | **1,325 archivos Excel** (103 en Septiembre 2026) | Trazabilidad activa de los últimos lotes fabricados en planta para cruzar contra pedidos despachados. |
| **`PRODUCCIÓN APP.xlsx`** | Bitácora de Planta y Control de Calidad | **2,539 batches** en hoja `FORMULARIO1` | Registro de tanques, operarios (`PESADO POR`, `ELABORADO POR`, `REVISADO POR`), parámetros fisicoquímicos (pH, densidad, viscosidad) y enlaces fotográficos de etiquetas. |
| **`USUARIOS.xlsx`** | Mapeo de Canales y Líneas Telefónicas | **21 registros** | Credenciales y números oficiales de WhatsApp para atención de clientes y campañas publicitarias (Biocambio360, Chan Chan, Pajarito). |
| **TOTAL GENERAL** | **Órdenes SGC + Bitácora + Líneas** | **2,861 Órdenes + 2,539 Batches** | **La base de datos industrial y de formulación más completa en la historia de la compañía.** |

---

## 2. Catálogo de Productos Formulados Identificados

En el muestreo de órdenes de producción se identificaron 15 fórmulas activas elaboradas en la planta de Soacha:
1. `Detergente líquido para ropa` (Garrafas 20L, 10L, Galón, 1L)
2. `Detergente ropa Laundry` (Línea industrial)
3. `Desengrasante Multiusos / Industrial` (Garrafas 20L, 10L, Galón)
4. `Oxígeno Activo Desinfectante` (Polvo 1Kg, 4Kg, 10Kg, 20Kg)
5. `Blanqueador Desinfectante`
6. `Detergente lavaloza líquido concentrado`
7. `Detergente lavaloza líquido CB`
8. `Suavizante textil manzana verde fc`
9. `Suavizante floral fc`
10. `Limpiapisos desinfectante pino`
11. `Limpiapisos lavanda`
12. `Limpiapisos citronela`
13. `Quitamanchas ropa color`
14. `Alcohol glicerinado 70%` / `Alcohol ethanol 96%`
15. `Pastillas de cloro efervescente`

---

## 3. ¿Cómo se integran estos datos para transformar el ERP y la Calidad?

### Eje 1: Conciliación Industrial "Sell-in vs Sell-out" (Merma y Rendimiento)
- **Problema actual:** Se sabe cuánto dinero se vendió, pero existía una brecha sobre el volumen físico exacto envasado en planta versus lo entregado por las transportadoras.
- **Solución con la integración:** 
  - Al cruzar los 2,861 archivos de lotes con los 135,000 pedidos comerciales, el sistema puede calcular con precisión decimal la **tasa de merma de envasado**:
    $$\text{Merma \%} = \frac{\text{Kg Formulados en Tanque} - \text{Kg Facturados en Pedidos}}{\text{Kg Formulados en Tanque}} \times 100$$
  - Permite descubrir si hay fugas en líneas de llenado, sobrantes no registrados o pérdidas en transporte.

### Eje 2: Trazabilidad INVIMA y Control de Calidad en el Módulo `/admin/produccion`
- La hoja `FORMULARIO1` de `PRODUCCIÓN APP.xlsx` aporta 2,539 registros de calidad.
- Al migrar estos datos a la colección `production_batches` de Firestore:
  - Cuando un cliente reporte un problema con su detergente o desengrasante, el asesor o director de calidad puede ingresar el número de lote (ej. `300926114`) y ver inmediatamente:
    - Tanque en que se mezcló.
    - Operarios responsables (quién pesó, quién elaboró, quién revisó empaque).
    - pH medido (ej. 9.5 para detergente, 11.35 para desengrasante).
    - Densidad y viscosidad.
    - Foto del lote en fábrica.

### Eje 3: Costeo Real de Materias Primas e Insumos (BOM)
- Cada orden POE-007 contiene la hoja `INSUMOS` y `LOTES`, desglosando los gramos exactos de tensoactivos (ej. Ácido Sulfónico, Soda Cáustica, Procide, Fragancia, Bicarbonato).
- Esto permite al ERP calcular el **Costo de Bienes Vendidos (COGS)** real por cada garrafa de 20L o 10L, superando los costos teóricos y mostrando el margen de contribución neto por línea de producto.

### Eje 4: Trazabilidad de Canales Comerciales (`USUARIOS.xlsx`)
- Se integra en la base de datos de asesores para asociar automáticamente las líneas telefónicas (+57 324 100 5353, etc.) y campañas de Meta con los pedidos entrantes en el Fast Order Modal y CRM.

---

## 4. Hoja de Ruta Técnica de Ejecución (ETL Pipeline)

1. **Fase 1 (Completada):** Auditoría forense y caracterización con `scripts/etl_parse_production_and_sgc.py`.
2. **Fase 2 (Próximo Despliegue):** Script de extracción masiva a JSON estructurado (`data/production_batches_2025_2026.json`) consolidando fecha, lote, producto, Kg totales y presentaciones.
3. **Fase 3:** Carga sincronizada a Firestore en colección `production_orders` para consulta en tiempo real desde `/admin/produccion`.
4. **Fase 4:** Panel de auditoría de mermas y KPIs de eficiencia de planta en `/admin/finanzas` y `/admin/informe-ventas`.
