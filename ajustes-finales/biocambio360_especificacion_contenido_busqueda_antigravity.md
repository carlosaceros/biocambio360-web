# Especificación técnica para Antigravity - Contenido ML-01 y optimización del buscador

## 1. Contexto

- **Proyecto:** tienda virtual Biocambio360.
- **Tecnología:** Next.js personalizado.
- **URL revisada:** https://biocambio360-web.vercel.app/
- **Documento fuente:** `MANUAL DE LIMPIEZA DOSIFICACIONES Y RENDIMIENTOS BIOCAMBIO 360.pdf`.
- **Código del documento:** ML-01.
- **Fecha de emisión:** 15/06/2026.
- **Alcance del manual:** 9 familias de producto, con usos, concentración, dilución, cantidad, tiempo de contacto, rendimiento, ejemplos y precauciones.

El objetivo es integrar el contenido técnico del manual en las fichas de producto, enriquecer la información comercial sin inventar propiedades, incorporar una descripción corta ganadora en cada tarjeta del grid y corregir la lentitud del buscador, especialmente en celulares.

## 2. Hallazgos confirmados en la tienda publicada

### 2.1 Grid de productos

La tarjeta actual contiene categoría, nombre, presentaciones, precio y botón de agregar. No existe un bloque de descripción corta entre el nombre y las presentaciones.

### 2.2 Buscador

Durante una prueba carácter por carácter:

1. Al escribir solamente `d`, la URL cambió inmediatamente a `/?q=d`.
2. El input fue desmontado o recreado después de esa primera letra.
3. La escritura perdió la referencia/foco y no pudo continuar de forma estable.

Esto coincide con el síntoma reportado en celulares. La causa principal a corregir es el acoplamiento del `onChange` del input con la navegación o actualización del parámetro `q`. Cada pulsación parece provocar una transición de ruta, reconstrucción del árbol o remontaje del buscador. Adicionalmente, el catálogo contiene más de 100 productos y sus tarjetas son visualmente pesadas; reconstruir el grid completo durante cada pulsación aumenta el bloqueo del hilo principal.

## 3. Principios obligatorios

1. **El PDF ML-01 es la fuente de verdad para dosificaciones y rendimientos**, no para precios, ingredientes, registros o propiedades que no aparezcan allí.
2. **Mapear por ID/SKU estable.** No asignar contenido en tiempo de ejecución buscando palabras en el título.
3. **No mezclar familias.** Por ejemplo, no asumir que un Limpiapisos es un Ambientador Multiusos o que cualquier blanqueador es Oxígeno Activo.
4. **Variantes comparten contenido técnico únicamente si tienen la misma formulación.** Una fragancia o presentación diferente puede reutilizar la guía solo después de confirmar que la fórmula base es la misma.
5. **Conservar los números y las unidades del manual.** No convertir, redondear o extrapolar rendimientos automáticamente.
6. **No convertir una guía aproximada en promesa absoluta.** Usar expresiones como `hasta`, `aproximadamente`, `según el nivel de suciedad` y mostrar el aviso general del manual.
7. **La descripción corta del grid debe tener máximo dos frases**, ser específica, comercialmente fuerte y estar respaldada por contenido aprobado.
8. **El buscador debe mostrar cada carácter de inmediato.** El filtrado y la sincronización de URL nunca deben bloquear el valor visible del input.

## 4. Arquitectura de contenido recomendada

Crear una estructura tipada y separada de la UI. Adaptar los nombres al modelo real del repositorio.

```ts
type ManualSource = {
  documentCode: 'ML-01';
  issuedAt: '2026-06-15';
  page: number;
};

type UsageGuideRow = {
  useOrSurface: string;
  concentration: string;
  dilution: string;
  amount: string;
  contactTime: string;
  approximateYield: string;
};

type ProductManualContent = {
  source: ManualSource;
  familyKey:
    | 'detergente'
    | 'quitamanchas-ropa-color'
    | 'blanqueador'
    | 'ambientador-multiusos'
    | 'lavaloza'
    | 'desengrasante'
    | 'oxigeno-activo'
    | 'suavizante'
    | 'desincrustante-descarbonizante';
  enrichedIntroduction: string;
  shortDescription: string;
  usageRows: UsageGuideRow[];
  examples: string[];
  recommendations: string[];
  warnings: string[];
};

type Product = {
  // Campos existentes...
  shortDescription: string;
  manualContentKey?: ProductManualContent['familyKey'];
};
```

Implementar un registro independiente, por ejemplo `manualContentByFamily`, y un mapeo explícito de productos:

```ts
const manualContentKeyByProductId: Record<string, ProductManualContent['familyKey']> = {
  // Usar IDs reales del catálogo; estos valores son ilustrativos.
  'product-id-detergente-principal': 'detergente',
  'product-id-lavaloza': 'lavaloza',
};
```

No introducir duplicación de tablas en cada objeto del catálogo. Cada producto debe referenciar la familia técnica aprobada.

### 4.1 Separar el payload del grid y el detalle

La integración del PDF no debe aumentar la carga del buscador. No enviar las tablas completas, FAQs, recomendaciones, imágenes de alta resolución ni descripciones extensas al componente cliente del catálogo.

```ts
type ProductCardDTO = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  category: string;
  tags: string[];
  searchAliases: string[];
  thumbnail: string;
  variants: Array<{ id: string; label: string; price: number }>;
};

type ProductDetailDTO = ProductCardDTO & {
  longDescription: string;
  manualContent?: ProductManualContent;
  benefits: string[];
  faqs: Array<{ question: string; answer: string }>;
  gallery: string[];
};
```

- La página del catálogo recibe únicamente `ProductCardDTO`.
- La ficha individual resuelve `ProductDetailDTO` en servidor.
- El índice de búsqueda usa solamente campos ligeros y preprocesados.
- No serializar nueve tablas técnicas repetidas dentro de cada producto en el HTML inicial.
- Si varias variantes usan una familia ML-01, resolver la referencia compartida en el detalle sin duplicar datos en el bundle cliente.

## 5. Mapeo controlado entre manual y catálogo

| Familia ML-01 | Página | Productos que pueden ser candidatos | Regla de asignación |
|---|---:|---|---|
| Detergente | 2 | Detergente líquido para ropa, Detergente Líquido Multiusos y variantes | Asignar solo si comparten las dosificaciones del manual. No asignar a shampoos o limpiadores de superficies. |
| Quitamanchas ropa color | 2 | Quitamanchas Ropa Color y variantes de presentación | Confirmar que se trate del producto oxigenado para prendas de color. |
| Blanqueador | 3 | Blanqueador - Desinfectante y variantes con la misma fórmula | No asignar a Oxígeno Activo ni a un blanqueador con formulación diferente. |
| Ambientador multiusos | 3 | Ambientador Multiusos y fragancias de la misma fórmula | No asignar automáticamente a Limpiapisos; validar ficha/SKU. |
| Lavaloza | 4 | Lavaloza Líquido Concentrado y sus presentaciones | Aplicación directa a la familia, conservando las presentaciones activas. |
| Desengrasante | 4 | Desengrasante, Desengrasante Industrial y variantes | Confirmar si todas las variantes comparten capacidad para óxido, ceras y prelavado textil. |
| Oxígeno activo | 5 | Oxígeno Activo en polvo y sus presentaciones | No confundir con blanqueador a base de hipoclorito. |
| Suavizante | 5 | Suavizantes y fragancias con la misma base | Reutilizar dosificación solo si la concentración es igual. La fragancia debe conservar texto propio. |
| Desincrustante descarbonizante | 6 | Desincrustante Descarbonizante | Asignar únicamente al producto para carbonización y altas temperaturas. |

Los productos no cubiertos por ML-01 conservan su contenido técnico actual. Deben recibir `shortDescription`, pero esta se redactará únicamente a partir de su ficha aprobada; no se les copiarán datos de estas nueve familias.

## 6. Contenido enriquecido y descripción corta por familia

Las siguientes descripciones están redactadas a partir del manual. La columna `Short description` es el texto recomendado para el grid y contiene máximo dos frases.

| Familia | Introducción enriquecida para la ficha | Short description para el grid |
|---|---|---|
| Detergente | Diseñado para el lavado manual o en lavadora de ropa diaria, uniformes, ropa de cama, toallas, mantelería y otros textiles lavables. Su dosificación se ajusta al peso de la carga y al nivel de suciedad para equilibrar limpieza, rendimiento y consumo. | **Limpieza precisa para cada carga, desde ropa diaria hasta mantelería. Un litro rinde hasta 14 cargas ligeras con la dosificación recomendada.** |
| Quitamanchas ropa color | Auxiliar de lavado para ayudar a remover manchas difíciles en prendas de color manteniendo la apariencia de los tejidos. Puede usarse a mano o en lavadora con agua fría o tibia, siempre realizando una prueba previa en una zona poco visible. | **Combate manchas difíciles sin renunciar a la apariencia de tus prendas de color. Úsalo en agua fría o tibia y trata hasta 50 prendas por cada 5 L de solución.** |
| Blanqueador | Solución para el lavado de ropa blanca y la limpieza de pisos, inodoros, baños y superficies lavables. Permite aplicaciones directas o diluidas según el uso y exige respetar los tiempos de contacto y las precauciones de seguridad. | **Blanquea ropa blanca y desinfecta pisos, baños, inodoros y superficies lavables. Una solución de 5 L puede cubrir hasta 60 m².** |
| Ambientador multiusos | Producto listo para usar o diluir según la aplicación, diseñado para limpiar superficies, ambientar espacios y ayudar a eliminar olores. El manual contempla vidrios, espejos, pantallas, pisos, paredes, textiles del entorno, vehículos y espacios cerrados. | **Limpia superficies y neutraliza olores mientras refresca cada espacio. Un litro listo para usar puede ambientar hasta 800 m².** |
| Lavaloza | Fórmula lista para usar en vajilla, recipientes y utensilios de cocina. Se aplica sobre una esponja, se frota la superficie y se enjuaga con abundante agua. | **Corta la grasa de platos, ollas y utensilios con aplicación directa y enjuague fácil. Un litro puede rendir entre 500 y 1.000 piezas.** |
| Desengrasante | Solución graduable para grasa ligera, media, pesada o quemada, además de carbonilla, hollín, ceras, recubrimientos, óxido superficial y manchas textiles compatibles. La concentración y el tiempo de contacto deben seleccionarse según la superficie y la severidad de la suciedad. | **Domina grasa ligera, quemada, ceras, hollín y manchas de aceite con la dilución adecuada. Poder versátil desde la cocina hasta el taller.** |
| Oxígeno activo | Agente oxidante para lavandería, remojo, manchas localizadas, superficies, utensilios, equipos, tuberías y tratamiento de agua. La dosificación cambia según el proceso y debe expresarse en gramos, sin convertirla a mililitros. | **Blanquea, desmancha y potencia la limpieza de ropa, superficies, equipos y agua. Un kilogramo puede tratar hasta 60 kg de ropa.** |
| Suavizante | Diseñado para aportar suavidad, facilitar el planchado y dejar una fragancia agradable. Debe agregarse en el compartimiento del suavizante o diluirse antes del último enjuague, evitando el contacto directo con las prendas. | **Suaviza, facilita el planchado y deja una fragancia agradable en cada ciclo. Un litro rinde hasta 20 cargas pequeñas.** |
| Desincrustante descarbonizante | Producto para remover grasa carbonizada, residuos quemados e incrustaciones en equipos y superficies resistentes sometidos a altas temperaturas. La dilución se ajusta entre mantenimiento, carbonización media y carbonización severa. | **Desprende grasa carbonizada y residuos quemados de equipos sometidos a altas temperaturas. En mantenimiento, un litro puede cubrir hasta 50 m².** |

### Reglas editoriales para los productos restantes

Antigravity debe completar `shortDescription` en todos los productos del catálogo con estas reglas:

- Máximo 2 frases y máximo recomendado de 170 caracteres.
- Primera frase: problema o beneficio principal.
- Segunda frase: diferenciador, uso concreto o rendimiento verificable.
- No repetir el nombre completo como relleno.
- No usar superlativos absolutos como `el mejor`, `100% seguro`, `elimina todo` o `garantizado` sin respaldo.
- No inventar duración de fragancia, compatibilidad, hipoalergenicidad, certificaciones o porcentajes.
- Variantes de fragancia deben diferenciarse por su atributo real, no duplicar exactamente la misma frase si el usuario necesita distinguirlas.

## 7. Datos técnicos exactos que deben integrarse

### 7.1 Detergente - ML-01, página 2

| Uso | Concentración | Dilución | Cantidad recomendada | Contacto | Rendimiento |
|---|---|---|---|---|---|
| Carga ligera, 2-3 kg | 100% | Listo para usar | Ligera 70 ml; moderada 80 ml; pesada 90 ml | Ciclo completo | 11-14 cargas/L |
| Carga estándar, 4-5 kg | 100% | Listo para usar | Ligera 120 ml; moderada 130 ml; pesada 140 ml | Ciclo completo | 7-8 cargas/L |
| Carga pesada, 6 kg o más | 100% | Listo para usar | Ligera 200 ml; moderada 210 ml; pesada 220 ml | Ciclo completo | 4-5 cargas/L |
| Lavado a mano | Variable | Diluir en 10 L de agua según suciedad | Según carga | 15-30 min | Variable |

**Ejemplos:** ropa de uso diario, uniformes, ropa de cama, toallas, mantelería y otros textiles lavables.

**Recomendaciones:** respetar instrucciones de la prenda; para manchas difíciles, remojar aproximadamente 30 minutos; ajustar cantidad por carga y suciedad.

### 7.2 Quitamanchas ropa color - ML-01, página 2

| Uso | Concentración | Dilución | Cantidad | Contacto | Rendimiento |
|---|---|---|---|---|---|
| Lavado a mano | 2% | 100 ml en 5 L de agua | 20 ml/L | 15-30 min | 25-50 prendas/5 L |
| Lavado en lavadora | Variable | 125 ml por carga | Según carga | Ciclo completo | 1 carga por 125 ml |

**Precauciones:** usar agua fría o tibia; no usar agua caliente; no usar en lana, seda, cuero, lino fino ni fibras delicadas incompatibles con productos oxigenados; realizar prueba previa en zona poco visible.

### 7.3 Blanqueador - ML-01, página 3

| Uso | Concentración | Dilución | Cantidad | Contacto | Rendimiento |
|---|---|---|---|---|---|
| Aplicación directa sobre superficies | 100% | Listo para usar | 1000 ml/L | 5 min | 20-40 m²/L |
| Lavado de ropa blanca | 1% | 100 ml por 10 L de agua | 10 ml/L | 10 min | 20-40 prendas/10 L |
| Pisos | 1% | 50 ml por 5 L de agua | 10 ml/L | 5-10 min | 30-60 m²/5 L |
| Inodoros | 100% | Directo, sin diluir | 1000 ml/L | 10 min | 10-20 aplicaciones/L |
| Superficies | 1% | 50 ml por 5 L de agua | 10 ml/L | Secado al aire | 20-40 m²/5 L |

**Aplicación directa:** usar una pequeña cantidad, dejar actuar 5 minutos, frotar y enjuagar con abundante agua.

**Precauciones destacadas:** no mezclar con otros productos químicos o de limpieza; mantener lejos de niños y animales; conservar en lugar fresco y seco; usar guantes.

### 7.4 Ambientador multiusos - ML-01, página 3

| Uso | Concentración | Dilución | Cantidad | Contacto | Rendimiento |
|---|---|---|---|---|---|
| Vidrios, ventanas, espejos y transparentes | 100% | Listo para usar | 1000 ml/L | Inmediato | 80-120 m²/L |
| Pantallas electrónicas, lentes y gafas | 100% | Listo para usar | 1000 ml/L | Inmediato | 150-250 unidades/L |
| Pisos, paredes y superficies lavables | 2,5% | 250 ml en 10 L | 25 ml/L | Inmediato | 80-120 m²/10 L |
| Ambientación de espacios cerrados | 100% | Listo para usar | 1000 ml/L | Inmediato | 500-800 m²/L |
| Eliminación de olores | 100% | Listo para usar | 1000 ml/L | Inmediato | 100-150 m²/L |

**Ejemplos:** vidrios, vitrinas, espejos, pantallas, lentes, pisos, paredes, oficinas, hogares, vehículos, cortinas, tapicerías, alfombras y espacios cerrados.

### 7.5 Lavaloza - ML-01, página 4

| Uso | Concentración | Dilución | Cantidad | Contacto | Rendimiento |
|---|---|---|---|---|---|
| Vajilla y utensilios de uso general | 100% | Listo para usar | 1000 ml/L | Inmediato | 500-1000 piezas/L |

**Modo de uso:** aplicar sobre una esponja, frotar el utensilio o plato y enjuagar bien.

**Ejemplos:** platos, vasos, cubiertos, ollas, bandejas, recipientes y utensilios de cocina.

### 7.6 Desengrasante - ML-01, página 4

| Uso | Concentración | Dilución producto:agua | Cantidad | Contacto | Rendimiento |
|---|---|---|---|---|---|
| Grasa liviana | 9%-20% | 1:10 a 1:4 | 90-200 ml/L | 2-5 min | 40-80 m²/L |
| Grasa media | 25% | 1:3 | 250 ml/L | 5 min | 30-50 m²/L |
| Grasa pesada o quemada | 50%-100% | 1:1 o puro | 500-1000 ml/L | 5-10 min | 10-30 m²/L |
| Desincrustación: carbonilla, hollín, grasa endurecida, sarro orgánico | 9%-25% | 1:10 a 1:3 | 90-250 ml/L | 10-15 min | 20-50 m²/L |
| Remoción de ceras, recubrimientos y sellantes | 50%-100% | 1:1 o puro | 500-1000 ml/L | 0,5-5 min | 15-30 m²/L |
| Quitaóxido superficial en metales resistentes | 50%-100% | 1:1 o puro | 500-1000 ml/L | 2-10 min | 10-25 m²/L |
| Prelavado textil: grasa, tinta, maquillaje, aceite | 100% | Listo para usar | 1000 ml/L | 5-10 min | 200-400 manchas/L |

**Ejemplos:** cocinas, estufas, hornos, campanas, parrillas, motores, talleres, maquinaria, azulejos, pisos, lavandería y superficies industriales.

**Aplicación:** esponja, trapo, brocha, mopa, aspersión, inmersión o lavado a presión.

### 7.7 Oxígeno activo - ML-01, página 5

| Uso | Concentración | Dilución | Cantidad | Contacto | Rendimiento |
|---|---|---|---|---|---|
| Lavandería manual o automática | Variable | 15-30 g por kg de ropa seca | 15-30 g/kg | Ciclo completo | 30-60 kg de ropa/kg de producto |
| Remojo de ropa | Variable | 30-50 g en 5 L de agua | 6-10 g/L | 60-120 min | 100-160 L/kg |
| Manchas difíciles | Pasta directa | Aplicación localizada | Según necesidad | 10-15 min | 500-1000 manchas/kg |
| Limpieza de superficies | Variable | 10-20 g/L | 10-20 g/L | 10-15 min | 50-100 m²/kg |
| Utensilios, equipos y tuberías | 0,5%-1% | 5-10 g/L | 5-10 g/L | 15-30 min | 100-200 L/kg |
| Tratamiento de agua, choque | Variable | 15-30 g/1000 L | Según volumen | Continuo | 33.000-66.000 L/kg |
| Tratamiento de agua, mantenimiento | Variable | 5-10 g/1000 L | Según volumen | Continuo | 100.000-200.000 L/kg |

**Ejemplos:** lavandería, superficies lavables, industria alimentaria, equipos, tuberías, piscinas y spas.

### 7.8 Suavizante - ML-01, página 5

| Uso | Concentración | Dilución | Cantidad | Contacto | Rendimiento |
|---|---|---|---|---|---|
| Carga pequeña, 2-4 kg | 100% | Listo para usar | 50 ml | Ciclo final | 20 cargas/L |
| Carga mediana, 5-7 kg | 100% | Listo para usar | 100 ml | Ciclo final | 10 cargas/L |
| Carga grande, 8 kg o más | 100% | Listo para usar | 200 ml | Ciclo final | 5 cargas/L |
| Prendas delicadas | 5% aprox. | 50 ml en 1 L de agua | 50 ml | 5 min | 20 aplicaciones/L |

**Modo de uso:** agitar; usar el compartimiento de suavizante o diluir antes del último enjuague; para lavado a mano, diluir en 1 L y sumergir 5 minutos; no aplicar directamente sobre prendas; no mezclar con otros suavizantes.

### 7.9 Desincrustante descarbonizante - ML-01, página 6

| Uso | Concentración | Dilución | Cantidad | Contacto | Rendimiento |
|---|---|---|---|---|---|
| Carbonización severa | 100% | Listo para usar | 1000 ml/L | 10-20 min | 8-20 m²/L |
| Carbonización media | 50% | 1:1 | 500 ml/L | 10-15 min | 15-30 m²/L |
| Mantenimiento o suciedad leve | 33% | 1:2 | 333 ml/L | 5-10 min | 25-50 m²/L |

**Ejemplos:** parrillas, planchas, hornos, bandejas, campanas, quemadores, freidoras, asadores, rejillas, marmitas, ollas, sartenes y superficies resistentes con grasa carbonizada o residuos quemados.

## 8. Aviso general obligatorio del manual

Mostrar este aviso en la sección técnica de las familias ML-01, preferiblemente en un bloque `Importante`:

> Las dosificaciones y rendimientos son una guía general. Pueden variar según el tipo y grado de suciedad, dureza del agua, temperatura, método de limpieza, superficie, tiempo de acción y condiciones ambientales. Realice una prueba preliminar y ajuste la aplicación a las condiciones específicas de uso.

No mostrar este aviso en cada tarjeta del grid; pertenece a la ficha detallada.

## 9. Diseño de la ficha de producto

Agregar una sección `Dosificación y rendimiento` después de la descripción/beneficios y antes de las FAQs o productos relacionados.

### Escritorio

- Tabla con las seis columnas del manual.
- Encabezado fijo dentro del bloque si la tabla es larga.
- Unidades visibles y sin abreviaturas ambiguas.
- Bloques separados para ejemplos, recomendaciones y precauciones.

### Móvil

- No comprimir seis columnas en una tabla ilegible.
- Transformar cada fila en una tarjeta vertical con etiquetas: uso, concentración, dilución, cantidad, contacto y rendimiento.
- Mantener números y unidades juntos para evitar saltos confusos.
- Permitir acordeón por uso si la familia tiene muchas filas, como Desengrasante u Oxígeno Activo.

### Accesibilidad

- Tabla semántica real en escritorio: `table`, `thead`, `tbody`, `th scope="col"`.
- Encabezado visible `Dosificación y rendimiento`.
- Precauciones con texto, no solo color o iconos.
- El contenido debe poder leerse sin JavaScript cuando la página se renderice en servidor.

## 10. Cambio requerido en el grid

Agregar `shortDescription` inmediatamente después del `<h3>` y antes de los botones de presentación.

```tsx
<h3>{product.name}</h3>
<p className="mt-2 text-sm text-slate-600 leading-snug line-clamp-3 min-h-[3.75rem]">
  {product.shortDescription}
</p>
<VariantSelector variants={product.variants} />
```

Las clases son orientativas; respetar el sistema visual existente. Usar altura mínima consistente para evitar que el precio y el botón salten entre tarjetas. En pantallas estrechas, comprobar que la descripción no expulse el precio fuera del primer viewport de la tarjeta.

### Validación automática sugerida

- `shortDescription` requerido para todo producto publicable.
- Longitud máxima recomendada: 170 caracteres.
- Máximo dos frases detectables.
- No permitir HTML dentro del campo.
- Incorporar `name`, `shortDescription`, categoría, tags y usos aprobados al índice de búsqueda.

## 11. Corrección técnica del buscador

### Límite recomendado entre servidor y cliente en Next.js

- El Server Component carga o prepara una vez la colección ligera de `ProductCardDTO`.
- Un componente cliente estable, por ejemplo `ProductCatalogClient`, mantiene `inputValue`, consulta diferida, filtros y paginación.
- `page.tsx` no debe volver a obtener todo el catálogo ni reconstruir el árbol del App Router por cada cambio de `q`.
- El parámetro inicial `q` puede hidratar el estado inicial, pero después la escritura vive en el componente cliente.
- El contenido ML-01 completo se carga en la página de detalle y no participa en el filtrado del grid.

### SEARCH-01 - Mantener el input estable

- El `onChange` solo debe actualizar estado local inmediato.
- No ejecutar `router.push`, `router.replace`, `redirect`, `refresh` ni una Server Action por cada pulsación.
- No asignar al input una `key` derivada de `q`, del pathname o del conjunto de resultados.
- El componente del buscador debe permanecer montado y conservar foco, selección y composición del teclado.

```tsx
const [inputValue, setInputValue] = useState(initialQuery);
const deferredQuery = useDeferredValue(inputValue);

<input
  type="search"
  value={inputValue}
  onChange={(event) => setInputValue(event.target.value)}
  inputMode="search"
  enterKeyHint="search"
  autoComplete="off"
/>
```

No envolver `setInputValue` en debounce ni en `startTransition`: la letra visible es prioritaria.

### SEARCH-02 - Filtrar con valor diferido

Precalcular una cadena normalizada una sola vez cuando cambie el catálogo.

```ts
const normalizeSearchText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es-CO')
    .trim();

const indexedProducts = useMemo(
  () => products.map((product) => ({
    product,
    searchText: normalizeSearchText([
      product.name,
      product.shortDescription,
      product.category,
      ...(product.tags ?? []),
      ...(product.searchAliases ?? []),
    ].filter(Boolean).join(' ')),
  })),
  [products],
);

const tokens = useMemo(
  () => normalizeSearchText(deferredQuery).split(/\s+/).filter(Boolean),
  [deferredQuery],
);

const filteredProducts = useMemo(
  () => indexedProducts
    .filter(({ searchText }) => tokens.every((token) => searchText.includes(token)))
    .map(({ product }) => product),
  [indexedProducts, tokens],
);
```

Para un catálogo local de aproximadamente 100-120 productos no se necesita una petición de red por carácter. El costo principal debe reducirse evitando remontajes y renderizados pesados.

### SEARCH-03 - Sincronizar la URL sin navegación por carácter

Si se necesita una URL compartible, actualizarla después de una pausa de 350-500 ms y sin provocar navegación de Next.js.

```ts
useEffect(() => {
  const timeoutId = window.setTimeout(() => {
    const url = new URL(window.location.href);
    if (inputValue.trim()) url.searchParams.set('q', inputValue.trim());
    else url.searchParams.delete('q');
    window.history.replaceState(window.history.state, '', url);
  }, 400);

  return () => window.clearTimeout(timeoutId);
}, [inputValue]);
```

La búsqueda inicial puede leer `q` al cargar la página. No utilizar `useSearchParams` como fuente reactiva única del valor visible si esto reconstruye la página.

Alternativa válida: actualizar `q` únicamente al presionar Enter o enviar el formulario.

### SEARCH-04 - Evitar renderizado pesado del catálogo

- Envolver `ProductCard` con `React.memo`.
- Mantener callbacks y props estables.
- No recalcular normalización, precios, descuentos o variantes dentro de cada tarjeta durante cada pulsación.
- Renderizar una primera página de 12-24 resultados; no montar las más de 100 tarjetas de una vez.
- Reiniciar la paginación a la primera página cuando cambie `deferredQuery`.
- Usar claves estables por `product.id`, nunca por índice.
- Usar `next/image` con `sizes` correcto y `loading="lazy"`; reservar `priority` para las primeras imágenes visibles.
- Aislar contadores de oferta, carrusel, carrito y otros estados que cambian con frecuencia para que no provoquen el rerender del grid completo.
- Evaluar `content-visibility: auto` para secciones inferiores, sin usarlo como sustituto de paginación.

### SEARCH-05 - Si la fuente de datos exige búsqueda remota

Solo aplicar este flujo si el catálogo no está disponible localmente:

- Mínimo 2 caracteres antes de consultar.
- Debounce de 200-300 ms sobre la consulta, nunca sobre el input visible.
- Cancelar la petición anterior con `AbortController`.
- Cachear consultas repetidas.
- Ignorar respuestas antiguas que lleguen después de una consulta más reciente.
- Mostrar estado no bloqueante; nunca deshabilitar el input mientras llegan resultados.

### SEARCH-06 - Experiencia móvil y accesibilidad

- Mantener tamaño de fuente mínimo de 16 px en móvil para evitar zoom de iOS.
- Preservar foco después de cada actualización.
- Soportar eventos de composición del teclado; no ejecutar búsqueda intermedia mientras `isComposing` sea verdadero.
- Botón `Limpiar` accesible y visible solo cuando exista consulta.
- Informar cantidad de resultados mediante una región `aria-live="polite"`.
- Mantener navegación por teclado y etiquetas accesibles.
- Estados explícitos para 0 resultados, 1 resultado y múltiples resultados.

## 12. Pruebas de aceptación del buscador

1. En un dispositivo móvil real o emulación con CPU 4x, escribir `desengrasante` a velocidad normal.
2. Cada letra debe aparecer inmediatamente y en orden; no puede perderse ninguna.
3. `document.activeElement` debe seguir siendo el input después de cada pulsación.
4. El input no debe desmontarse ni perder la posición del cursor.
5. No debe generarse una navegación Next.js, petición RSC o recarga por cada carácter.
6. Si la URL se sincroniza, debe hacerlo después de la pausa configurada o al enviar.
7. Objetivo: respuesta visual del input menor de 100 ms y Web Vital INP menor de 200 ms en p75.
8. No debe existir una tarea larga superior a 50 ms atribuible al filtrado durante la escritura normal.
9. Buscar con y sin tildes debe producir el mismo resultado relevante: `oxigeno`/`oxígeno`.
10. Probar consultas parciales, varias palabras, mayúsculas, espacios repetidos y limpieza del campo.
11. Al limpiar, restaurar la primera página del catálogo sin navegación completa.
12. El contador debe coincidir con el arreglo filtrado y no mezclar totales provenientes de fuentes distintas.

## 13. Pruebas de aceptación del contenido

- Las nueve familias muestran una sección de dosificación basada en ML-01.
- Cada fila conserva concentración, dilución, cantidad, contacto y rendimiento correctos.
- Oxígeno Activo mantiene gramos; no se convierte a mililitros.
- Las precauciones del Blanqueador y Quitamanchas son visibles.
- Todos los productos publicables poseen `shortDescription` de máximo dos frases.
- Las tarjetas mantienen altura y alineación visual coherentes.
- En móvil, las tablas se transforman en bloques legibles y no generan scroll horizontal de toda la página.
- Ningún producto no cubierto hereda dosificaciones de otra familia.
- El aviso general del manual aparece en las fichas cubiertas.
- El contenido renderiza en SSR y es indexable; no cargar la guía únicamente después de hidratar el cliente.
- Ejecutar lint, typecheck, pruebas y build de producción según `package.json`.

## 14. Entrega esperada de Antigravity

Antigravity debe entregar:

1. Mapa final `productId -> manualContentKey`.
2. Lista de productos no mapeados y razón.
3. Archivos modificados.
4. Short descriptions incorporadas para todos los productos.
5. Evidencia de pruebas de contenido y responsive.
6. Evidencia del buscador antes/después: foco, escritura completa, número de renders, navegaciones y métricas INP.
7. Bloqueos por fichas técnicas faltantes, sin rellenarlos con supuestos.

## 15. Prompt maestro listo para Antigravity

```text
Trabaja sobre el repositorio Next.js de Biocambio360 e implementa íntegramente la especificación “Contenido ML-01 y optimización del buscador”.

Primero inspecciona el modelo real de productos y localiza la fuente única del catálogo. Crea una estructura tipada para el contenido técnico del manual ML-01 del 15/06/2026 y un mapeo explícito por product ID/SKU. No asignes familias mediante coincidencias de texto en tiempo de ejecución y no copies dosificaciones a productos no cubiertos.

Integra en las fichas las tablas, ejemplos, recomendaciones, precauciones y el aviso general de la especificación. Conserva exactamente números y unidades. Agrega `shortDescription` a todos los productos publicables: máximo dos frases, máximo recomendado de 170 caracteres, específica y respaldada por información aprobada. En el grid muéstrala entre el nombre y las presentaciones, conservando alineación y responsive.

Corrige el buscador con estas prioridades:
1. El valor visible del input debe actualizarse inmediatamente con estado local.
2. No uses router.push/router.replace/refresh ni Server Actions por carácter.
3. Usa un valor diferido para filtrar un índice normalizado y memoizado.
4. Si se conserva `q`, sincronízalo después de una pausa con History API o al enviar.
5. Evita remontar el input y reduce rerenders del grid con memoización, paginación e imágenes lazy.
6. Aísla contadores y estados frecuentes para que no reconstruyan todas las tarjetas.

No inventes propiedades, concentraciones, precios, certificaciones o compatibilidades. Si una variante no puede vincularse de forma segura con ML-01, conserva su contenido actual, redacta la short description desde su ficha aprobada y repórtala como no mapeada.

Al finalizar, ejecuta lint, typecheck, pruebas y build. Prueba el buscador en móvil escribiendo “desengrasante” carácter por carácter y demuestra que conserva foco, no pierde letras, no navega por pulsación y cumple el presupuesto de interacción. Entrega el mapa de familias, archivos modificados, short descriptions, pruebas y bloqueos.
```
