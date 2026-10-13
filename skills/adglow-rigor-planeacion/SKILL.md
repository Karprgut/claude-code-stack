---
name: adglow-rigor-planeacion
description: Garantiza rigor y evita alucinaciones de IA en todos los documentos de planeación de medios de Adglow (agencia de paid media; partnership Adglow×Fantástica). Úsala cuando pidan revisar/auditar un plan de medios, verificar que un plan esté formulado (fórmulas =, no números pegados), checar/validar benchmarks (CPM, CTR, CVR, CPA, ROAS, alcance, frecuencia), reconciliar inversión contra líneas, correr un QA de planeación antes de entregar, aplicar bien el markup del rate card, o cuando alguien diga "no inventes/no alucines datos", "de dónde salió ese número", "cita la fuente", "esto está hardcodeado". Es la capa de AUDITORÍA y anti-alucinación que se conecta con `kapital-planes-de-medios` (los Flows de Excel y el rate card con markup) — no reemplaza a esa skill, la vigila. NO es para diseñar el deck (usa adglow-deliverable/adglow-slides) ni para escribir copy.
---

# Adglow — Rigor de Planeación (anti-alucinación)

Skill de **auditoría** para que cualquier agente pueda garantizar que un plan de medios de Adglow es **defendible ante el cliente**: cada número tiene fuente o es un supuesto declarado, las tablas **recalculan solas** con fórmulas, los benchmarks son del vertical/geo/plataforma correctos, y todo reconcilia.

Voz: **español mexicano (tú), directa, de auditor.** Sin rodeos. Cuando algo está mal, se dice qué celda, por qué, y cómo se arregla.

> Esta skill NO produce el plan — lo **revisa**. Para construir los Flows de Kapital y el motor Python que edita fórmulas sin romperlas, usa `kapital-planes-de-medios` (skill privada del cliente, no incluida en este repo). Para el acabado del entregable, [[adglow-deliverable]]. Esta skill es el control de calidad que corre **antes de entregar**.

---

## REGLA CERO — no inventes números. Jamás.

**Ningún número entra a un plan de medios de Adglow sin una de estas tres etiquetas:**

1. **DATO** — tiene fuente citada: plataforma/informe/rate card/benchmark oficial **+ fecha**.
2. **SUPUESTO** — es una estimación con racional explícito ("por qué ese número").
3. **NO DISPONIBLE** — no lo tenemos. Se dice literalmente. **No se rellena con un número inventado.**

Está **prohibido** inventar CPMs, CTRs, CVRs, CPAs, tasas de conversión, alcances, frecuencias, tamaños de audiencia, "benchmarks de industria", cuota de mercado o cualquier cifra "que suena razonable". Un número plausible sin fuente es una **alucinación**, y en un plan de medios que va a cliente eso es un pasivo, no un adorno.

**Y las fechas cuentan como números.** Fecha de arranque, ventana de vuelo, duración en días, flighting, meses de pulso: todo eso es dato duro y necesita las mismas tres etiquetas. Es la alucinación que más se cuela, porque una fecha "se ve" inofensiva al lado de un CPM — y no lo es: **la duración es un denominador**. Si la ventana está inventada, el presupuesto diario está inventado, y el cliente va a comprar medios con esa cifra.

### El caso que nos enseñó esto (un plan real, jul 2026)

Un deck de plan de medios llegó a revisión con dos ventanas de vuelo: *"CDMX always-on, 365 días"* y *"Interior: oct 2026 – mar 2027, 182 días"*. Sonaban perfectamente razonables. **Ninguna de las dos venía de ningún lado:**

- El brief solo decía `projectDuration: annual_plus`.
- El slide de **Timeline del masterdeck del cliente estaba literalmente vacío** — el encabezado ahí, y nada debajo.
- Lo único sustentado era que el pico de llegada de Snowbirds es en noviembre. La ventana `oct–mar` la inventó el modelo alrededor de ese dato real.

Nadie lo cachó hasta que el cliente preguntó *"¿de dónde sacamos esas fechas?"*. Y cuando la ventana real resultó ser **ago–dic (153 días)**, todos los presupuestos diarios del deck estaban mal por un factor de 2.4×.

**Regla que sale de ahí:** antes de escribir una ventana de vuelo, busca la fecha en el brief, en el Flow y en el masterdeck. Si no está en ninguno, **es un supuesto y se marca como tal en la slide** — no en una nota interna. Y pregúntala: la fecha de arranque casi siempre existe en la cabeza de alguien del lado del cliente, solo que nadie la escribió.

### Cómo distinguir DATO de SUPUESTO al redactar

**DATO** — se cita la fuente inline o en nota al pie:

> CPM Meta feed MX, awareness: **$85–$110 MXN** (Meta Ads Manager, cuenta del cliente, prom. abr–jun 2026).
> CTR display Google, fintech LATAM: **0.45%** (Google Ads benchmarks, informe Q1 2026).

**SUPUESTO** — se marca como tal y se da el racional:

> CVR landing → lead: **~2.5%** *(SUPUESTO: no hay histórico del producto por ser nuevo; se toma el piso del rango observado en otro producto, que comparte formulario y fricción similar).*

**NO DISPONIBLE** — nunca un cero disfrazado:

> Frecuencia esperada CTV: **no disponible** — el inventario programático no reporta alcance único a este nivel; se estimará con post-campaign, no se compromete en el plan.

**Reglas de redacción de supuestos:**
- Un supuesto **siempre** trae racional. "Supuesto: 3%" sin explicación es basura; equivale a inventarlo.
- El racional se ancla en algo real: histórico del cliente, un benchmark análogo citado, o una regla física ("el presupuesto no alcanza para más de X frecuencia con este CPM").
- Los supuestos **se listan juntos** en una sección "Supuestos del plan" al final, para que el cliente los pueda cuestionar de un vistazo.
- Si un resultado del plan **depende críticamente** de un supuesto (ej. el CPA objetivo asume un CVR que nunca hemos medido), se marca como **riesgo** — no se entierra en una celda.

### Frase de cierre mental

Antes de escribir cualquier cifra, pregúntate: **"¿De dónde salió este número?"** Si la respuesta no es una fuente citable o un supuesto con racional, no lo escribas — escribe "no disponible".

---

## 1. Planes FORMULADOS — todo sale de fórmulas (=), nada hardcodeado

En Excel/Sheets/Flows, los números derivados **NO se teclean a mano**: salen de una fórmula que los recalcula solos. Un plan con números pegados es un plan que miente en cuanto alguien cambia una celda de arriba.

### Las cadenas que DEBEN recalcular solas

```
Presupuesto de la línea (input)
   ÷ CPM × 1000        → Impresiones
   × CTR               → Clics            (o Presupuesto ÷ CPC → Clics)
   × CVR               → Conversiones     (o Clics × tasa → leads/ventas)
   ⇒ CPA = Presupuesto ÷ Conversiones
   ⇒ CAC = Presupuesto ÷ Clientes nuevos
   ⇒ ROAS = Ingreso atribuido ÷ Presupuesto
```

También deben ser fórmulas:
- **% de mezcla por línea** = `Presupuesto línea ÷ Gran total` (nunca un % tecleado que no cuadra).
- **Subtotales** por unidad/producto/plataforma/mes = `SUM`/`SUMIFS` de columna completa.
- **Gran total** = suma de subtotales.
- **Tarifa promedio ponderada** de una agrupación = `Σpresupuesto ÷ Σ(presupuesto/tarifa)`, no un promedio simple.

> Mapeo modelo→métrica en los Flows del cliente: **CPM → Impresiones = Inv/Tarifa×1000**; **CPC → Clics = Inv/Tarifa**; **CPL → Leads = Inv/Tarifa**; **CPV → Vistas = Inv/Tarifa**; **CPD → Descargas = Inv/Tarifa**. La etiqueta KPI debe ser **exacta** (`Impresiones`, `Clics`, `Formulario`, `Visualizacion` sin "es") o el VLOOKUP del Modelo falla y todo queda en 0. Detalle en `kapital-planes-de-medios` (skill privada del cliente, no incluida en este repo).

### La regla también aplica al buy plan del DECK, no solo al Excel

Esto es lo que casi se nos va: la disciplina de "nada hardcodeado" se aplicaba religiosamente en los Flows, y luego **el buy plan del deck traía las mismas columnas tecleadas a mano**. Es el mismo plan, en otro archivo, sin red.

En el buy plan estilo INTI, estas dos columnas son **derivadas** y jamás se escriben:

```
Daily  = Budget ÷ días de la ventana        ← la ventana es el denominador
Split% = Budget ÷ Budget total del plan     ← siempre suma 100.0%
```

El builder del deck (Python/JS) debe **calcularlas en código** a partir de `(budget, días)`, igual que el Flow las calcula con fórmulas. Si están pegadas, en el momento en que alguien mueve la ventana de vuelo —y **siempre** se mueve— el deck sigue mostrando los diarios viejos y nadie se entera, porque el total sí cuadra.

Pasó exactamente así en un plan real: la ventana pasó de 365 a 153 días y los `Daily` seguían siendo los de 365. El total ($4.8M) cuadraba perfecto; los diarios mentían por 2.4×. **Un número derivado que no se deriva es una bomba de tiempo, no un error de dedo.**

Corolario: si el mismo contenido sale en dos formatos (PPTX y HTML, deck y Excel), no mantengas dos copias de las cifras. Una sola fuente de datos y dos renderers — ver el patrón en [[adglow-slides]].

### Checklist de integridad de fórmulas

- [ ] **Celdas duras detectadas.** Toda celda de una columna derivada (impresiones, clics, conversiones, CPA, %, subtotales) contiene una fórmula `=`, no un literal. En Excel: selecciona la columna y verifica que no haya constantes donde debería haber fórmula (`Ir a especial → Constantes`). Cualquier número pegado en zona de cálculo es un defecto.
- [ ] **Totales reconcilian.** El header/resumen (ej. "Presupuesto Medios") **== suma de la tabla de líneas**. Si difieren aunque sea $1, hay una fórmula rota o una celda dura.
- [ ] **% suma 100%.** La columna de % de mezcla suma exactamente 100.00% (con SUMIF de columna completa, no rango parcial que se queda corto al agregar filas).
- [ ] **Consistencia matemática por línea.** `KPI_estimado == Presupuesto ÷ costo_KPI` (o la fórmula del modelo). Si el KPI estimado no es reproducible desde inversión y tarifa, está inventado.
- [ ] **Sin tarifa vacía.** Toda línea (working media y programática) tiene Tarifa; una tarifa vacía deja las métricas en 0 silenciosamente.
- [ ] **Cambio de input propaga.** Cambia el presupuesto de una línea a mano y verifica que impresiones/clics/conversiones/%/totales se actualizan solos. Si algo no se movió, estaba hardcodeado.
- [ ] **Valores horneados para compartir.** openpyxl guarda fórmulas SIN valor cacheado → Quick Look/Drive/Gmail/Numbers muestran **$0**. Antes de compartir con cliente/partner, round-trip con LibreOffice headless (`soffice --headless --calc --convert-to xlsx`) que hornea valores dejando fórmulas vivas. Ver gotchas en `kapital-planes-de-medios` (skill privada del cliente, no incluida en este repo).

---

## 2. Uso correcto de benchmarks

Un benchmark mal elegido es peor que no tenerlo: da falsa confianza. Reglas:

1. **El benchmark debe coincidir en las cuatro dimensiones:** **vertical** (fintech ≠ retail ≠ apuestas) × **geo** (MX ≠ COL ≠ US) × **plataforma** (Meta ≠ Google ≠ TikTok ≠ programática DSP) × **objetivo/funnel** (awareness ≠ tráfico ≠ conversión). Un CPM de Meta awareness US-retail **no** sirve para Google conversión MX-fintech.
2. **No mezcles fuentes en una misma comparación.** Si comparas CTR entre líneas, todas del mismo informe/fecha. Mezclar "CTR de un blog de 2022" con "CTR real de la cuenta 2026" produce conclusiones falsas.
3. **Documenta fuente + fecha, siempre.** Un benchmark sin fecha es sospechoso; el paid media se mueve rápido y un CPM de hace 18 meses puede estar 40% desfasado.
4. **Distingue tres cosas que la gente confunde:**
   - **Benchmark de industria** — referencia externa ("así rinde el mercado").
   - **Meta del plan** — lo que nos comprometemos a lograr (puede ser más agresiva o más conservadora que el benchmark; se justifica).
   - **Histórico real del cliente** — lo que la cuenta ya rindió. **Este manda** sobre el benchmark de industria cuando existe. Si tenemos data de la cuenta del cliente, usarla antes que cualquier informe genérico.
5. **Usa rangos, no falsa precisión.** `CPM $85–$110` es honesto; `CPM $97.34` finge una exactitud que no existe. Dos decimales en un benchmark de industria casi siempre es señal de invención o de copiar sin pensar.
6. **Marca los benchmarks débiles.** Si la fuente es vieja (>12 meses), de otro geo aproximado, o de muestra chica, dilo: *"(benchmark débil: informe global 2024, no MX; usar solo como orden de magnitud)"*.

### Fuentes válidas (en orden de preferencia)
1. **Histórico real de la cuenta del cliente** (Meta Ads Manager, Google Ads, TikTok, reportes en vivo de Adglow/Havas).
2. **Benchmarks nativos de plataforma** con geo/vertical (Meta, Google Ads benchmarks, TikTok).
3. **Rate card Adglow×Fantástica** (tarifas programáticas con markup — ver §6).
4. **Informes de industria fechados** de fuente identificable.
> Nunca: "un CPM típico de la industria es…" sin fuente. Eso es la alucinación clásica.

---

## 3. Reconciliación y sanity checks

Antes de creerle a un plan, verifica que sus números **son físicamente posibles** y **cierran entre sí**:

- **Inversión total = suma de líneas.** Punto de partida. Si no cuadra, nada más importa hasta arreglarlo.
- **Unit economics coherentes y con fórmula visible:**
  - `CAC = Inversión ÷ Clientes nuevos`
  - `LTV:CAC` — sano si ≥ 3x; bandera si el plan lo asume sin fuente del LTV. (si un producto va bajo agua, no lo maquilles.)
  - `ROAS = Ingreso atribuido ÷ Inversión` — y declara la **ventana de atribución**; un ROAS sin ventana no significa nada.
- **Alcance y frecuencia plausibles vs universo.** Alcance ≤ tamaño real de la audiencia direccionable (no puedes alcanzar 8M si el segmento son 3M). Frecuencia en rango razonable (típico 2–8 en flight; frecuencia 40 en una semana es error de cálculo o de inventario mal leído).
- **CPM/CPC dentro de rango del benchmark citado.** Si tu plan usa un CPM 3x abajo del mercado, o lo justificas con fuente, o es un error.
- **CTV y OLV comparten Formato="Video"** → el SUMIFS debe segmentar por **Medio** o doble-cuenta. Mismo cuidado para cualquier par de canales que comparta Formato.
- **Markup del rate card aplicado bien** — ver §6.

Si un sanity check falla, **no lo silencies**: repórtalo como hallazgo (celda + qué está mal + fix).

---

## 4. Reconciliación del markup (rate card Adglow×Fantástica)

- El **rate card programático ya trae el markup** del partnership. En documentos de **cliente** se muestran **tarifas**, nunca el cálculo de margen (regla interna). Copias con margen explícito → sufijo `-INTERNO`.
- **Verifica que cada línea programática use la tarifa del rate card vigente** (con su fecha), no una tarifa inventada ni una del working media.
- **No apliques markup dos veces.** Si la tarifa ya es con markup, el presupuesto de cliente no vuelve a inflarse.
- **Programática = capa incremental** (30–35% del working media, se **SUMA**, no canibaliza). Verifica que el nuevo total = WM + programática y que el header lo refleje vía SUMIF de columna completa.
- Rate card, composición por producto (`COMP_*`) y reglas (ej. un producto de app = App Install CPD, no CPL) viven en `kapital-planes-de-medios` (skill privada del cliente, no incluida en este repo). Esta skill solo **verifica** que se aplicaron bien.

---

## 5. Checklist de QA final (antes de entregar cualquier plan)

Corre esto completo. Si algo falla, no se entrega.

**Anti-alucinación**
- [ ] Cada número es DATO (fuente+fecha), SUPUESTO (con racional) o NO DISPONIBLE. Cero cifras huérfanas.
- [ ] Los supuestos están listados juntos y los críticos marcados como riesgo.
- [ ] Ningún "benchmark de industria" sin fuente citada.
- [ ] **Cada fecha tiene fuente.** Arranque, ventana de vuelo, duración y flighting salen del brief, del Flow o del cliente — o van marcados como supuesto **en la slide**, no en una nota interna.
- [ ] **Ninguna afirmación de estado que no verificaste.** No escribas que algo está "aprobado", "firmado" o "cerrado" si no lo comprobaste: el masterdeck del cliente suele ser también una propuesta. Ver [[adglow-brand-voice]].

**Fórmulas**
- [ ] Sin celdas duras en columnas derivadas (impresiones, clics, conversiones, CPA, %, subtotales, totales).
- [ ] Cambiar un input propaga a métricas, %, subtotales y gran total.
- [ ] Toda línea tiene Tarifa; ninguna métrica en 0 por tarifa vacía.
- [ ] **En el buy plan del deck: `Daily` y `Split%` se calculan en código** desde `(budget, días)`. Cambia la ventana de vuelo y verifica que los diarios se movieron. Si no se movieron, estaban pegados.
- [ ] **Si el contenido sale en dos formatos** (PPTX + HTML, deck + Excel), las cifras vienen de una sola fuente. Compáralas: deben ser idénticas.

**Reconciliación**
- [ ] Header/resumen == suma de líneas (al peso).
- [ ] % de mezcla suma 100.00%.
- [ ] `KPI_estimado == Inversión ÷ costo_KPI` en cada línea.
- [ ] Unit economics con fórmula visible y ventana de atribución declarada.

**Benchmarks y plausibilidad**
- [ ] Benchmarks del vertical+geo+plataforma+objetivo correctos; fuente+fecha; rangos, no falsa precisión.
- [ ] Histórico del cliente usado cuando existe (manda sobre industria).
- [ ] Alcance ≤ universo; frecuencia plausible; CPM/CPC en rango.

**Markup / rate card**
- [ ] Tarifas del rate card vigente; markup aplicado una sola vez; margen no expuesto en copia de cliente.
- [ ] Programática sumada como incremental, total reconcilia.

**Compartible**
- [ ] Valores horneados (LibreOffice round-trip) si el archivo va a cliente/partner — no $0 en preview.
- [ ] Sin hojas internas / archivos de forecast/facturación en la copia externa.

---

## 6. Cómo se integra sin romper fórmulas

- Esta skill **audita**; los cambios estructurales a los Flows los hace el motor Python de `kapital-planes-de-medios` (skill privada del cliente, no incluida en este repo) (`integrate_v2.py`, etc.), que ya sabe insertar filas heredando estilo+fórmulas y reajustar referencias.
- Al revisar, **no toques fórmulas a mano dentro de un Flow** salvo para corregir una celda dura puntual; si hay que reinsertar líneas, hazlo por el motor para no romper el `shift_formula_rows` ni las referencias cross-sheet.
- **Valida siempre recalculando** con LibreOffice headless, no con el viewport (openpyxl no cachea valores). Criterio de validación: **header "Presupuesto Medios" == total de la tabla** y **% total = 100%** en cada Flow.
- Gotchas de openpyxl/cross-sheet/casing/KPI exacto: todos documentados en `kapital-planes-de-medios` (skill privada del cliente, no incluida en este repo) — léelos antes de tocar un Flow.

---

## Qué NO hacer

- **No inventes ni un solo número.** Es la razón de existir de esta skill.
- **No inventes fechas.** Una ventana de vuelo sin fuente es una alucinación con traje de sastre — y como la duración es el denominador del presupuesto diario, arrastra a todo el plan.
- **No afirmes que algo está aprobado** sin verificarlo. El masterdeck del cliente casi siempre es también una propuesta.
- **No conviertas un supuesto en dato** quitándole la etiqueta para que "se vea más sólido".
- **No mezcles fuentes de benchmark** en una comparación.
- **No des falsa precisión** (dos decimales en benchmarks de industria).
- **No teclees números derivados a mano** en un plan formulado.
- **No expongas el margen/markup** en copias de cliente.
- **No valides con el viewport** — recalcula con LibreOffice.
- **No entierres riesgos** en celdas; súbelos a la sección de supuestos/riesgos.

