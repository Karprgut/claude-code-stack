# Metodología Adglow

La metodología es lo que hace transferible la calidad. Sin estos principios un entregable se ve "bonito" pero no resiste defensa frente al cliente.

## 1. Hipótesis antes de estructura

Todo brief de test arranca con **la pregunta a responder**, no con el setup. El reader debe poder cerrar el documento después del slide 02 y haber entendido qué vamos a aprender.

**Plantilla:**

> ¿En qué [dimensión] las [variable de interés] entregan [mejor KPI] que la [variable de control]?

Ej.: *"¿En qué etapa del funnel las audiencias 1P de RCN entregan mejor costo por KPI y mayor calidad de tráfico/leads que la segmentación abierta de Meta?"*

Debajo, una caja `.hypo` por hipótesis. Tres es el número estándar (H1/H2/H3 por etapa de funnel, por audiencia, por creativo — la dimensión depende del test).

**Cada hipótesis tiene una sola variable activa**. Si tienes dos variables (audiencia Y creativo), no es una hipótesis — es dos tests apilados; sepáralos o declara que es exploratorio.

## 2. Aislamiento de variables

Cuando estás comparando una variable (audiencia, creativo, formato), **todo lo demás debe ser idéntico**:

- **Mismo creativo** en todos los ad sets de una misma campaña que compara audiencias.
- **Misma audiencia** en todos los ad sets de una campaña que compara creativos.
- **ABO** (Ad Set Budget Optimization) y no CBO — necesitas comparar 1:1 sin que el algoritmo redistribuya.
- **Mismo flight window**. Si un ad set arranca tarde, se pausa o reinicia el set completo.

Este principio aparece literal en los slides del brief — el lector lo ve y entiende por qué confía en el resultado.

## 3. KPIs como bandas, no como números únicos

Nunca `target: $0.20 CPC`. Siempre `target: $0,15 – $0,35 USD`.

Razón: una banda comunica el rango aceptable e implícitamente la incertidumbre del benchmark. Un número único invita debate sobre si fallaste por $0.01.

**Patrón por etapa de funnel (Colombia, referencia 2026):**

| Campaña | KPI primario | Target USD | Secundario |
|---|---|---|---|
| Awareness | CPM | 2,5 – 4,0 | ThruPlay > 15% |
| Tráfico | CPC | 0,15 – 0,35 | CTR > 1,2%, OBC > 0,8% |
| Conversión | CPL | 2,5 – 6,0 | CVR landing > 8% |

Estos benchmarks **se verifican por país y vertical** antes de cada brief. Si no los verificaste, marca placeholder.

## 4. Criterio de ganador multi-condición

Un ad set se declara ganador SOLO si cumple **las tres**:

1. **Costo por KPI primario ≤ target del rango**
2. **Volumen mínimo de significancia**: típicamente 50 conversiones, 800 clics, u 80k impresiones según la campaña
3. **Lift ≥ 15%** vs el ad set control de la misma campaña

Se declara **antes** de correr el test, en el documento. Si no lo declaras antes, el debate post-test va a ser interminable.

## 5. Timeline en fases con regla "no se toca"

Toda campaña de test tiene exactamente estas fases:

1. **Setup & Legal** (2-3 días) — carga de audiencias, hashing PII, validación legal, aprobación creativos.
2. **Aprendizaje** (7 días) — Meta sale de Learning. **No se toca nada.** Solo monitoreo de delivery.
3. **Optimización** (7 días) — solo se pausan ad sets con CPK > 2x target. Sin cambios de creativo ni audiencia.
4. **Lectura** (2 días) — análisis estadístico + redacción.
5. **Decisión** (junta con cliente) — qué se promueve a always-on.

La regla **"no se toca nada"** durante Aprendizaje es la más importante y la más violada. Inclúyela siempre, visualmente destacada.

## 6. Volúmenes esperados como rango con escenario base

Por cada campaña, da un volumen esperado en rango. Ej.: *"2.800 – 6.500 clics"*. La banda viene del cálculo `budget / CPC_min` y `budget / CPC_max`. Reportarlo así protege contra el debate post-test ("creímos que sacaríamos más").

## 7. Pendientes pre go-live como checklist concreto

El último slide/sección siempre es un checklist específico de qué necesitamos del cliente. Items típicos:

- [ ] Aprobación del presupuesto + método de facturación
- [ ] Carga de audiencia 1P con consent log firmado
- [ ] Acceso a Business Manager con permisos de creación
- [ ] Pixel + Conversions API verificados en landing/app
- [ ] N creativos aprobados por campaña cumpliendo specs
- [ ] URL de landing con UTMs configurados + políticas legales públicas
- [ ] Persona de contacto para decisiones durante flight

Sin esa lista, el cliente no sabe que la pelota está de su lado.

---

# Estructura por tipo de documento

## Slide deck (brief de test)

14 slides es el número típico. Estructura:

| # | Sección | Qué va |
|---|---|---|
| 01 | Portada | Título + inversión + duración + # campañas + tags |
| 02 | Objetivo & hipótesis | Pregunta + H1/H2/H3 |
| 03 | Estructura del test | N campañas, ABO, qué se compara, por qué este recorte |
| 04-06 | Una slide por campaña | Tabla de ad sets (Control vs Tratamiento) + KPI cards |
| 07 | Duración & cronograma | Timeline visual de 5 fases |
| 08 | Presupuesto & KPIs | KPI grid + tabla de targets por campaña |
| 09 | Estimación de resultados | Volumen esperado + lift esperado + criterio ganador |
| 10-12 | Creativos por etapa | Specs (ratio, peso, duración) + ejemplos de mensaje |
| 13 | Reporting & criterio ganador | Dashboard, check-ins, criterio |
| 14 | Pendientes RCN | Checklist concreto |

## Long-form report (status / diagnóstico)

Estructura scrollable con TOC arriba:

1. **Hero** — título, eyebrow con fecha, tagstrip con keywords
2. **TL;DR** (callout cyan al inicio) — 2-3 frases máximo, plus N findings numerados si aplica
3. **TOC** — navegable, sticky-scroll friendly
4. **KPI grid del estado actual** — 4 KPIs con label/value/sub
5. **Pipeline / arquitectura** (si aplica) — diagrama bronze/silver/gold de capas
6. **Findings** — cards con border-left magenta (crit) / green (opp) / orange (quality)
7. **Decisiones que necesitamos** — lista numerada con `.decision` (auto-numerada)
8. **Anexo** — métricas de éxito (Hoy → Meta tras Fase X) en tabla
9. **Footer** — versión, fecha, "People powered · Data smart · Growth focused"

## Runbook (técnico)

Markdown puro. Estructura:

1. **Header con estado** — fecha, owner, audiencia
2. **State going in** — checklist ✅/❌ de lo que está hecho y lo que falta
3. **Part 1, Part 2, …** — bloques temporales ("TONIGHT before the call", "DURING the call", "POST call")
4. **Cada paso es:** título corto + comando exacto en bloque ` ``` ` + Verify command + qué esperar
5. **Pre-call email template** (si aplica) — quoted block listo para copy-paste

Tono: directo, imperativo, sin explicaciones largas. Quien lo lee ya tiene contexto.

## Findings / Plan de acción

Markdown puro. Estructura:

1. **Header con fecha + audiencia + objetivo**
2. **TL;DR** con bullets numerados de los hallazgos clave + buena noticia/mala noticia
3. **Contexto** (un párrafo corto)
4. **Hallazgo #N — título**
   - `### Qué pasa` — descripción + tabla si aplica
   - `### Impacto` — cuantificado en $/usuarios/% (ej. "807,786 usuarios inactivables hoy")
   - `### Solución propuesta` — corto plazo (con tiempo) + estructural (con tiempo)
   - `### Bloqueador` — qué/quién bloquea
5. **Priorización y owners** — tabla con # / Acción / Tiempo / Owner / Bloqueado por
6. **Decisiones que necesitamos de la junta** — preguntas numeradas
7. **Anexo — Métricas de éxito** — tabla Hoy vs Meta tras Fase 1

---

# Reglas de voz

- **Tú**, no usted, no vos.
- **Mexicano neutral**: "activamos", "pegarle a la banda alta", "no se toca nada", "fijar el budget", "subir el lift".
- **Nunca**: voseo argentino ("activá", "probá", "andá"), tildes ibéricas marcadas ("vale", "currar", "molar").
- **Anglicismos OK cuando son el término técnico**: CPM, CTR, CVR, lookalike, flight, learning phase, custom audience. **No traducir** estos términos al español si son nombres convencionales del oficio.
- **Cifras**: punto decimal o coma según norma local; ser consistente dentro del documento. En CO/MX el estándar es coma decimal y punto miles (`$1.000`, `$0,35`). En USD usa coma decimal cuando reportes para LatAm.
- **Fechas**: ISO `YYYY-MM-DD` en headers y eyebrows. Texto largo: `27 de mayo de 2026`.
- **Por qué antes de qué**: cada decisión arquitectónica/táctica tiene un callout corto con la razón. Esto es lo que hace defendible el documento.

# Plan de medios — reglas específicas

Una **propuesta de plan de medios** es un formato dedicado, distinto del brief de test. El brief defiende UN test con UNA pregunta; el plan de medios distribuye TODA la inversión del cliente para un periodo entre múltiples canales y líneas de campaña.

## Estructura canónica de 6 secciones

| # | Sección | Qué responde |
|---|---|---|
| 1 | **Investigación de mercado** | Tamaño, crecimiento, regulación, drivers de demanda, estacionalidad de la vertical en el país |
| 2 | **Investigación de competidores** | Quiénes son los 4-6 actores, share of voice, canales activos, mensajes recurrentes, inversión estimada |
| 3 | **Audiencia** | Perfil principal + segmentos a activar (clusters), con tamaño estimado por segmento |
| 4 | **Requerimientos técnicos** | Tracking (pixel, CAPI, SDK), tagging (UTMs), infra (landing, formularios, integraciones), accesos |
| 5 | **Planteamiento estratégico** | Funnel + roles por canal + estacionalidad + bidding. **Sin creatividad ni contenido** — solo media |
| 6 | **Plan de medios por línea de campaña** | Tabla con columnas: canal, objetivo, funnel, KPI, audiencia, costo KPI, inversión, % inversión, KPI estimado |

Una sección no se salta. Si no tienes datos para una sección (p.ej. competidores), declara el gap y propón cómo cerrarlo en Fase 0.

## Regla de la suma 100%

**La suma de `% inversión` de TODOS los renglones del plan debe ser exactamente 100,0%.** No 99,8%. No 100,2%. Calcula los porcentajes desde la inversión absoluta y ajusta la línea más grande para absorber el redondeo.

```
% inversión = inversión_canal / inversión_total × 100
```

Si la suma no cierra, el plan no se entrega.

## Consistencia matemática KPI estimado

**KPI estimado debe ser internamente consistente con costo KPI e inversión:**

```
KPI_estimado = inversión / costo_KPI
```

Ejemplo: si inversión = $10.000 USD y costo CPL = $4 USD, entonces KPI estimado = 2.500 leads. No 2.000, no 3.000.

Si tu intuición sugiere otro número, no inventes — ajusta el costo KPI hacia el lado conservador y recalcula. El cliente va a hacer esa misma división.

## Mínimos de aprendizaje por canal

Cada canal tiene una inversión mínima para salir de learning phase. Si la inversión por ad set/campaña queda por debajo, esa línea no entrega resultados confiables.

| Canal | Mínimo USD/día por ad set | Notas |
|---|---|---|
| Meta (FB/IG) | ~$30 | Para conversiones; awareness puede ir más bajo |
| Google Search | ~$20 | Búsqueda con keywords mid-tail |
| Google Display / YouTube | ~$30 | Reach + view |
| TikTok | ~$50 | Mayor minimum por menor escala de audiencias específicas |
| Programmatic (DV360/TTD) | ~$100 | Fees + minimum delivery |
| LinkedIn | ~$50 | CPC alto requiere budget para volumen |
| Native (Outbrain/Taboola) | ~$30 | OK desde 30 USD/día |

Multiplica por # de ad sets y por # de días para verificar que cada línea del plan está sobre el piso. Si una línea queda debajo, o concentras inversión o eliminas esa línea.

## Líneas de campaña — taxonomía

Una "línea de campaña" agrupa actividades con un mismo **objetivo de negocio**. Las líneas típicas:

- **Adquisición** — usuarios/clientes nuevos
- **Reactivación** — usuarios que tuvieron actividad y la perdieron
- **Retention / Engagement** — mantener actividad recurrente
- **Eventos / Estacionalidad** — picos puntuales (Mundial, Hot Sale, Buen Fin, Black Friday)
- **Branding / Awareness** — top-of-funnel sostenido

Cada línea aparece como **bloque separado** en el plan de medios (no como filas mezcladas con otra línea). Cada línea tiene su propia hipótesis de negocio y % asignado del budget.

## Fuentes válidas para investigación de mercado

Para que el cliente no cuestione tus números:

**Tamaño de mercado y crecimiento:**
- Statista, eMarketer, Insider Intelligence, GroupM / This Year Next Year
- IAB local (IAB México, IAB Colombia, IAB Argentina, etc.)
- Cámaras sectoriales locales (AMVO para e-commerce MX, AMIPCI, ABTM para apuestas MX)

**Regulación:**
- Documento original del regulador (SEGOB para apuestas MX, CNBV para banca, COFEPRIS para salud)
- No cites blogs interpretando regulación — cita el documento

**Competidores — share digital:**
- Similarweb (tráfico web)
- SEMrush, Sistrix (SEO)
- Meta Ad Library (creativos activos)
- Google Ads Transparency Center (creativos activos)
- Pathmatics / SensorTower (advertising spend estimado)

**Comportamiento de consumidor:**
- Google Trends (interés por keyword)
- Statista Consumer Insights
- Encuestas propias del cliente si las tiene

Cada cifra en el deck cita la fuente al pie de la slide en mono pequeño. Sin cita = sin cifra.

## Estacionalidad

Toda vertical tiene estacionalidad. Identifícala y propón gasto modulado (no flat). Ejemplos:

- **Apuestas deportivas MX:** Liga MX (apertura ago-dic, clausura ene-may), Mundial (cada 4 años), Eurocopa, Super Bowl, UFC PPV, NBA finals
- **Retail / e-commerce MX:** Hot Sale (mayo), Buen Fin (noviembre), Navidad, Día de las Madres
- **Educación:** enero, agosto (vuelta a clases)
- **Turismo:** verano, Semana Santa, fin de año

El plan debe explicitar el flighting: % del budget por mes/quincena/semana según el calendario de estacionalidad.

## Lo que NO va en un plan de medios

- **Creatividades / mensajes / copy** — son anexo creativo separado (o etapa posterior)
- **Landing copy / wireframes** — anexo de producto
- **Detalles de implementación técnica línea por línea** — anexo técnico
- **Pricing de fees de Adglow** — propuesta comercial separada

El plan de medios cubre el **qué pauta, dónde, con qué budget, midiendo qué**. Punto.

---

# Reglas de cantidad

- Slides: 14 es el target para un brief de test. 8-10 para una propuesta corta. Más de 16 es señal de que algo sobra.
- Long-form report: 6-8 secciones es típico. Más de 10 sugiere fragmentar en dos docs.
- Hipótesis: 3 por test. Más de 3 es vago, menos de 2 es debate.
- Ad sets por campaña: típicamente 3 (control + 2 tratamientos). Más diluye el budget per-set por debajo de significancia.
- KPI cards por slide: 3-4. Más de 4 satura.
- Items en checklist de pendientes: 5-9. Más es señal de que el proyecto no está listo.
- Plan de medios: 16 slides es el target (1 portada + 1 resumen + 2 mercado + 2 competidores + 2 audiencia + 2 tech + 2 estrategia + 3 plan por línea + 1 pendientes). 12-20 es el rango.
- Líneas de campaña en un plan de medios: 2-4. Más de 4 diluye el budget; menos de 2 no es plan, es un single-objective brief.
- Canales en un plan de medios: 3-6. Menos limita el reach; más fragmenta el budget bajo el mínimo de aprendizaje.

---

# Errores que invalidan una propuesta (aprendizajes de dirección)

Estos tres errores no son de estilo — tumban la defensa de todo el deck. Verifícalos SIEMPRE.

## 1. Precisión de categoría

Identifica la **subcategoría exacta** del cliente y usa SOLO competidores y estadísticas que sean pares reales de esa subcategoría. **No mezcles categorías adyacentes pero distintas** (variety/dollar store ≠ hard-discount de abarrotes; neobanco ≠ fintech de crédito; farmacia ≠ retail de belleza). Un set competitivo mal armado —o un CAGR de la categoría equivocada— **invalida el análisis competitivo completo** y ancla mal la narrativa desde la portada, no es "un dato suelto". Si dudas de la categoría, decláralo como supuesto y usa el set correcto más cercano; nunca metas competidores de otra categoría para llenar la tabla.

*Caso Joi Dollar Plus:* es variety/dollar (Waldo's, Miniso, Dollarcity), no hard-discount (Tiendas 3B, Neto). Meter 3B/Neto invalidó todo el competitivo.

## 2. Usa el stack de medición que el cliente YA tiene

Antes de proponer tracking, averigua qué mide ya el cliente (footfall en punto de venta tipo **Getin.mx**, pixel/CAPI, CRM, CDP, POS). Si ya hay medición real, **no propongas mecanismos redundantes que dependen de la cooperación del comprador** (canjear un cupón físico en caja). Diseña la medición sobre el dato real:

- Grupos de **flight** (tiendas/radios expuestos) vs **control** (comparables sin flight).
- Cruzar ventanas de exposición (quincenas, horarios de pauta) contra el tráfico real por hora.
- Leer **uplift** = footfall en horas/días de flight vs baseline histórico de la misma unidad (pre-flight) y vs control.
- El semáforo de saturación / horas pico es **insumo de planeación** (en qué franjas concentrar el spend), no solo operación de piso.

Sé honesto con lo que cada fuente **sí y no** entrega: un footfall da **lift agregado a nivel tienda/geo**, NO atribución por canal. Si hace falta desglose por canal: o vives sin él y optimizas a nivel tienda/radio (suele bastar para un piloto), o un código promocional **ligero solo para reporting de mezcla**, sin pretender que es lo que prueba la visita. Un diseño de correlación temporal con dato real es más defendible que un cupón.

## 3. Portabilidad del framework

En pilotos de expansión o multi-mercado, prueba que el framework (radios/geo, personas, timing, mezcla de canal) es **portátil**: mismo método, se aplica igual en una plaza que en otra (CDMX ≈ Querétaro). No lo cuentes como un especial de una sola ciudad.

## 4. Alcance omnicanal e híbrido (no te quedes en digital-performance)

Cuando el objetivo, la geo o el presupuesto lo ameriten, **cruza medios que se refuerzan**, no solo Meta/Google/TikTok:

- **Digital extendido / híbrido:** OOH, **DOOH**, **CTV**, **OTT**, **Audio (Spotify)**. Para pilotos hiper-locales prioriza lo que cruza cerca del punto de venta (DOOH en la zona, audio geo-segmentado, CTV local).
- **ATL cuando amerite** (inversiones grandes, awareness masivo, lanzamientos): TV abierta/paga, radio, vallas tradicionales, activaciones/BTL.
- Justifica **por qué cada capa** (por qué DOOH aquí, por qué aún no TV) — la mezcla se defiende, no se rellena.

**Herramientas de medición/planeación cross-canal (programática e híbrido):** cuando el plan incluya programática, DOOH, CTV/OTT o requiera medir audiencias online+offline, considera y nombra:
- **Illumin** — planeación y activación de *journeys* cross-canal en programática.
- **FBDS.io** — medición/atribución de audiencias en medios programáticos e híbridos.

Úsalas para sustentar la medición de la capa programática/híbrida (junto al stack del cliente, p. ej. footfall como Getin). No las metas si el plan es puramente performance digital.
