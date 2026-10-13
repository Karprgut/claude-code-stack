---
name: adglow-slides
description: Arma decks y presentaciones estratégicas de Adglow en HTML formato 1920×1080 (con gráficas Chart.js) y los exporta a PDF o PPTX editable. Úsalo cuando pidan un pitch, una propuesta comercial, un plan estratégico/de medios presentable, un kickoff, un cierre de mes o cualquier deck para cliente/junta en cualquiera de los tres sistemas de marca del stack Adglow — Adglow (dark+neón), Havas (B/N+rojo data-hero) o Fantástica (naranja sobre negro, primitivas). Cubre arcos narrativos por tipo de deck, fórmulas de copywriting para slides, jerarquía y layouts responsivos, uso de Chart.js con la paleta de la marca elegida, y el pipeline de build HTML→PDF (Chrome headless)→PPTX. Para el look completo de cada marca se apoya en la skill `adglow-brand-design`. No es para documentos largos scrollables ni runbooks — para eso usa `adglow-deliverable`.
---

# Adglow Slides

Skill para que **cualquier agente** arme presentaciones/decks estratégicos de Adglow con la misma metodología, voz y nivel de acabado que Kar ya estableció. El producto final es un **deck HTML de 1920×1080** con navegación y gráficas Chart.js, en uno de los **tres sistemas de marca** del stack, exportable a **PDF** (Chrome headless) y, cuando aplique, a **PPTX editable nativo**.

Es la versión Adglow de la skill `ckm-slides`: aquí lo de ckm ya viene resuelto por marca, con la voz y la calidad de `adglow-deliverable`.

> **adglow-slides** = deck presentable (pitch, plan, cierre). Si lo que piden es un reporte largo scrollable, un runbook técnico o un findings/action plan, usa **`adglow-deliverable`** en su lugar.

## Antes de empezar

1. **Elige la marca** (Adglow / Havas / Fantástica). Si no la dicen, pregunta o infiere del cliente:
   - **Adglow** → default de la casa, propuestas propias, longtail, self-serve.
   - **Havas** → cuentas Havas (p. ej. reporte Inti), estética data-hero sobria.
   - **Fantástica** → partnership Adglow×Fantástica (Kapital, WOM, Panorama, BanCoppel).
2. **Elige el arco narrativo** según el tipo de deck (ver abajo). El arco define el orden de slides antes de escribir una sola.
3. **Carga el look de la marca** desde la skill `adglow-brand-design` (ver sección "Look por marca"). No redefinas tokens completos aquí; toma de ahí el CSS base (fondo, grid, tipografía, semántica de color) y en este SKILL tienes solo el **mínimo** para arrancar.
4. **Escribe el copy con las fórmulas** de la sección "Copywriting". Datos antes que adjetivos, bandas no puntos.
5. **Construye el HTML** sobre el andamio 1920×1080 (nav + progreso + export PDF). Gráficas con Chart.js en la paleta de la marca.
6. **Buildea** a PDF/PPTX con el pipeline de abajo. Entrega la ruta absoluta.

## Voz y lenguaje (obligatorio)

Idéntica a `adglow-deliverable`:

- **Español neutral / mexicano**, tú forms ("activamos", "no se toca nada"). **Nunca** voseo argentino, **nunca** formas ibéricas marcadas.
- **Experto-conciso**: el lector decide presupuesto. Frases cortas. **Datos antes que adjetivos**. Métricas con unidad explícita (USD, COP, MXN, %, días).
- **Por qué antes de qué**: cada decisión importante lleva una razón corta.
- **Bandas, no puntos**: KPIs como rango (`$2.5 – $4 USD`), con thresholds y condición de ganador.
- **Lo que NO sabemos, se declara**: estimaciones, dumps pendientes, huecos de tracking. Placeholder `{{verificar}}` si falta un dato — no lo inventes.
- Una idea por slide. Headline que se lee en 3 segundos.

## Arcos narrativos típicos

Elige uno y ajústalo. Cada slide = una idea; el arco emocional guía color y jerarquía.

### Pitch / propuesta comercial (10–14 slides)
1. **Portada / hook** — marca + promesa en una línea.
2. **El contexto del cliente** — categoría, momento, presión.
3. **El problema / la tensión** — qué está costando (con cifra).
4. **Costo de no actuar** — cuánto se pierde por periodo.
5. **La tesis / big idea** — nuestra apuesta en una frase.
6. **Cómo lo resolvemos** — enfoque de medios (sin creatividad, solo estrategia).
7. **Unit economics / la matemática** — LTV:CAC, CPA target, bandas.
8. **Plan por línea de campaña** — canal · funnel · KPI · inversión · % (suma = 100%).
9. **Roadmap / fases** — qué activamos y cuándo.
10. **Proyección** — KPI estimado como banda + supuestos.
11. **Por qué nosotros** — diferenciador, no autobombo.
12. **Pendientes pre go-live** — checklist de lo que necesitamos del cliente (siempre el cierre).

**Arco emocional:** curiosidad → tensión → miedo → esperanza → confianza → urgencia.

### Estrategia / plan (12–16 slides)
Diagnóstico → audiencias → tecnología/tracking → planteamiento de medios → plan por línea → proyección → pendientes. Cada bloque abre con un divisor "Sección 0X". Usa la estructura de 6 secciones del plan de medios de `adglow-deliverable` (mercado, competidores, audiencia, requerimientos técnicos, planteamiento, plan por línea) cuando sea propuesta a cliente nuevo.

**Arco:** dónde estamos → qué vimos → qué haremos → qué esperamos → qué necesitamos.

### Cierre de mes / QBR (10–14 slides)
1. Portada + periodo.
2. **Titular del mes** — un big number + una frase (mejor/peor).
3. **Resumen ejecutivo** — 3–4 KPIs vs objetivo (verde/naranja/rojo).
4. **Pacing vs plan** — % consumido vs esperado por tiempo transcurrido.
5–8. **Desempeño por canal** (Meta / Google / TikTok / Spotify) — chips de métricas + delta vs mes anterior.
9. **Qué funcionó / qué no** — dos columnas contrastadas.
10. **Aprendizajes** — hipótesis validadas/refutadas.
11. **Plan del próximo mes** — 3 movimientos concretos.
12. **Pendientes / decisiones que necesitamos.**

**Arco:** resultado → detalle → lectura → siguiente paso.

> Regla transversal de todos los arcos: el **último slide siempre es un checklist accionable** (pendientes del cliente / decisiones de junta). Sin esa lista, el cliente no sabe que la pelota está de su lado.

### Dos reglas transversales más (aprendidas a golpes)

**Todo deck necesita rampa de entrada.** Después de la portada va un **resumen ejecutivo**, nunca el análisis de competencia. Si el lector cae directo en "contra quién competimos" no tiene marco para juzgarlo — la reacción literal fue *"entramos de trancazo a la competencia y no se entiende nada"*. El resumen ejecutivo responde tres cosas antes de que aparezca el primer competidor: **qué necesita el cliente** (o su usuario final), **qué producto/palanca lo resuelve**, y **cuál es el objetivo del plan**. En un plan de medios, el mejor resumen es una tabla `necesidad → producto → palanca de negocio`: aterriza el encargo en el negocio del cliente, y de paso deja armado el argumento de por qué el hueco es de marca y no de producto.

**El número de slides NO es la restricción.** La comprensión sí. Comprimir un plan de medios a 7 slides para que "se vea ágil" le cuesta el argumento: las tablas se aprietan hasta 8pt, dos estrategias distintas terminan apiladas en la misma tabla y nadie entiende cuál es cuál. Si el contenido pide 20 slides, son 20. Un buy plan por escenario y por estrategia (una tabla de 5–7 filas por slide) se lee mejor y **cabe en la escala tipográfica del sistema**; el mismo contenido apilado (18 filas) no.

## Copywriting para slides

Fórmulas cortas; una por slide según su función.

| Función del slide | Fórmula | Plantilla |
|---|---|---|
| Hook / portada | AIDA · gancho | "[Afirmación fuerte]. [Beneficio]. [Para quién]." |
| Problema / tensión | PAS | "¿[Dolor]? Cada [periodo], [consecuencia]. [Solución] lo corrige." |
| Costo de inacción | Cost of Inaction | "Sin [solución], pierdes [monto] cada [periodo]." |
| Big idea / tesis | Contraste | "[Modo viejo] ya no funciona. Entra [modo nuevo]." |
| Solución / enfoque | FAB | "[Palanca] te deja [ventaja], para que logres [beneficio]." |
| Transformación / caso | Antes–Después–Puente | "[Antes]. [Después]. [Nuestra solución] es el puente." |
| Data / proof | Proof Stack | Big number + 1 frase de contexto + fuente. |
| CTA / pendientes | AIDA · urgencia | "[Beneficio inmediato]. [Qué necesitamos]. [Cuándo]." |

**Patrones de headline (en MAYÚSCULAS para Adglow):**
- "DE [dolor] A [beneficio]."
- "[Número] FORMAS DE [meta]."
- "POR QUÉ [audiencia] ELIGE [enfoque]."
- "[Modo viejo] MURIÓ. ASÍ SE HACE HOY."

**Reglas de copy Adglow:** número primero, unidad pegada; verbo en presente ("activamos", "escalamos"); nada de relleno adjetival; una cifra load-bearing por slide máximo destacada como big number.

## Jerarquía y layouts responsivos

Cada slide tiene: **eyebrow** (mono, uppercase, letter-spacing) → **headline** (una idea) → **cuerpo/visual** → **footer chrome** (marca + cliente + page-num zero-padded). El ojo va eyebrow → headline → dato.

Layouts base (grids que colapsan en breakpoints):

| Layout | Uso | Grid desktop → colapso |
|---|---|---|
| Portada | Apertura | flex centrado |
| Big number hero | 1 métrica dominante | 1 col, número 120px+ |
| Feature/pilar grid | 3–6 tarjetas | `repeat(3,1fr)` → 2 → 1 |
| Metrics dashboard | 3–4 KPIs | `repeat(4,1fr)` → 2 → 1 |
| Two-column split | Antes/después, qué sí/qué no | `1fr 1fr` → 1 col |
| Plan por línea | Tabla canal×métrica | tabla ancho completo, scroll-x en móvil |
| Chart hero | Gráfica dominante | canvas 80% ancho + leyenda lateral |
| Divisor de sección | "Sección 0X" | full-bleed centrado |

Andamio 1920×1080: contenedor lockeado a 16:9 (letterbox si el viewport no cuadra), `.slide` absolutos con `.active`, `padding` generoso, nav (← counter →), barra de progreso, teclado (flechas/espacio) y **botón Descargar PDF** (no lo quites — así se entregan los decks). Reusa el andamio y las clases de animación (`fadeUp`, `scaleIn`, `stagger`) del template de `ckm-slides` (`references/html-template.md`); no agregues frameworks (Reveal/Marp) ni animaciones decorativas fuera de esas.

## Chart.js con la paleta de la marca

Gráficas siempre con Chart.js 4.x vía CDN, `maintainAspectRatio: false`, contenedor con altura fija (`clamp(240px, 40vh, 460px)`). Colores del dataset = paleta de la marca elegida (nunca los defaults de Chart.js). Grid y ticks tenues sobre el fondo de la marca.

- **Adglow** (fondo `#0b0b10`): series en magenta `#F00A5E`, cyan `#00D9FF`, verde `#B0DA09`, naranja `#F99400`. Grid/ticks `rgba(255,255,255,0.06)` / `#8a8aa0`.
- **Havas** (fondo negro/blanco): **una sola serie de acento** rojo `#FF0044`, el resto en grises; data-hero = un número gigante, gráfica mínima y limpia. Grid casi invisible.
- **Fantástica** (fondo `#0A0A0A`): naranja `#F26E25` como primaria, rojo `#E8351E` y azul `#1A4DDB` como secundarias. Puntos/áreas pueden usar las primitivas como marcadores.

Tipos: `line` (tendencia/pacing), `bar` (comparativo por canal), `doughnut` (mix de inversión), `radar` (audiencias/cobertura). Etiqueta ejes con unidad. Para PPTX editable, las cifras de la gráfica deben existir también como datos (no solo pixeles) — ver pipeline.

## Look por marca — apóyate en `adglow-brand-design`

**El detalle vive en la skill `adglow-brand-design`.** Carga de ahí el CSS base (fondo/grid/scan-line, escala tipográfica, semántica de color, componentes) para la marca elegida y pégalo inline en el HTML (decks self-contained, sin CSS externo). Aquí solo el **mínimo** para orientarte:

### ADGLOW (default de la casa)
- Fondo tinta `#0b0b10` + grid 48px + scan-line. Acentos neón: magenta `#F00A5E` (conversión/alarma), cyan `#00D9FF` (info/awareness), verde `#B0DA09` (positivo/escala), naranja `#F99400` (warning/tiempo).
- Tipografía: **Space Grotesk** (sans) + **IBM Plex Mono** (mono). **Headings en MAYÚSCULAS**; eyebrows en mono uppercase `0.2em` letter-spacing. Markers tipo plumón para frases clave.

### HAVAS
- Negro / blanco, **rojo `#FF0044` como único acento**. Estética **data-hero**: un número domina, todo lo demás es tipografía. Cero neón, cero ruido.
- Tipografía: **Bricolage Grotesque** (display) + **General Sans** (texto) + **JetBrains Mono** (data/labels).

### FANTÁSTICA
- Naranja `#F26E25` sobre negro `#0A0A0A`; secundarios rojo `#E8351E` y azul `#1A4DDB`.
- **Primitivas geométricas** (triángulo / círculo / cuadrado) como elementos gráficos y viñetas. Tipografía grotesca tipo Helvetica (peso alto para titulares).

Si `adglow-brand-design` no está disponible en el entorno, usa estos mínimos como fallback y márcalo como `{{verificar tokens en adglow-brand-design}}`.

## Pipeline de build (HTML → PDF → PPTX)

**1. HTML es la fuente de verdad.** Un solo archivo self-contained, 1920×1080, tokens inline, Chart.js por CDN. Abrir en browser = preview instantáneo, sin build step.

**2. HTML → PDF (Chrome headless).** Para entregar el deck como PDF (así lo reciben los clientes):

```bash
# macOS — imprime cada slide a página. El HTML debe tener @media print
# con una regla que muestre todas las slides (una por página, sin nav).
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="deck.pdf" \
  --print-to-pdf-no-header \
  "file:///ruta/absoluta/deck.html"
```

Alternativa por-slide (screenshot 1920×1080 → luego ensamblar) cuando quieras control pixel-perfect:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --window-size=1920,1080 \
  --screenshot="slide-01.png" --hide-scrollbars \
  "file:///ruta/absoluta/deck.html#1"
```

Incluye en el CSS un bloque `@media print` que fuerce `.slide { page-break-after: always; position: static; opacity: 1; }` y oculte `.nav-controls` / progress bar, para que las N slides salgan como N páginas 16:9.

**3. PPTX editable (cuando el cliente lo pida editable).** Regla central heredada de KCL: **datos → PPTX nativo, nunca image-based.** El texto, tablas y charts deben quedar editables en PowerPoint/Keynote/Canva.

- Canvas de diseño **1920×1080** → `LAYOUT_WIDE` 13.333×7.5 in. `EMU_PER_PX = 6350`; **pt = px × 0.5**.
- **Node / pptxgenjs**: un `pptx-export.js` lee el DOM del HTML y despacha por clase CSS de cada `.slide`.
- **Python / python-pptx**: builder imperativo con shapes nativos, `add_table` y charts nativos. Es el que usamos para decks densos en tabla (planes de medios).
- El playbook maestro está en `Karma Creative Lab Design System/playbooks/pptx-from-html.md`.

> ⚠️ **El botón "PPTX" del shell de decks de la app exporta IMÁGENES** (una por slide, vía pptxgenjs + `addImage`). Es un PDF con pasos extra: no sirve como entregable editable. Para un PPTX de verdad, compila aparte con python-pptx. Ver [[adglow-briefs]].

### Fuente única de verdad: un `content.py`, dos renderers

Si el mismo deck sale en **dos formatos** (PPTX editable + HTML), **no mantengas dos copias de las cifras.** El builder de PPTX y el de HTML van a divergir — no es hipótesis, es cuestión de tiempo: alguien corrige un número en uno y no en el otro.

El patrón que funciona:

```
content.py      ← ÚNICA fuente: cifras, copy, estructura (sin imports de render)
build_pptx.py   ← import content → PPTX nativo editable
build_html.py   ← import content → deck HTML 1600×900 (Chrome headless → PDF)
```

- Los **derivados se calculan en `content.py`** (p. ej. `Daily = budget ÷ días`, `Split = budget ÷ total`), no en cada renderer. Cambias la ventana de vuelo en un lugar y los dos entregables se recompilan iguales.
- El **texto enriquecido** (negritas dentro de un párrafo) se guarda como lista de tuplas `(texto, estilo)` y cada renderer la traduce a lo suyo — runs de pptx o `<strong>`. Así el copy tampoco se duplica.
- **Verifícalo, no lo asumas:** extrae todas las cifras de los dos archivos y compáralas.

```python
# saca $..., %, "N días", "N clics"… de ambos y diffea los Counters
# si divergen, uno de los dos entregables ya está mintiendo
```

### Las dos trampas del PPTX nativo (las dos ya nos mordieron)

**1. PPTX no tiene eje de peso. Cada peso es una FAMILIA distinta.**
No existe `font-weight: 300` en PPTX — solo hay bold on/off. Un titular en Light se pide por **nombre de familia**: `typeface="Inter Tight Light"`, no `Inter Tight` + weight. Y si la fuente solo existe como **variable font** (el caso de Inter Tight en Google Fonts), hay que instanciar las estáticas y **reescribir el name table** para que cada peso tenga su propia familia:

```python
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
inst = instancer.instantiateVariableFont(TTFont('Var[wght].ttf'), {'wght': 300})
inst['name'].setName('Inter Tight Light', 1, 3, 1, 0x409)   # familia
inst['name'].setName('Regular', 2, 3, 1, 0x409)             # subfamilia
inst['OS/2'].usWeightClass = 300
inst.save('InterTight-Light.ttf')   # → ~/Library/Fonts
```

**2. `row.height` es un MÍNIMO, no una altura fija.**
Si una celda envuelve a dos líneas, PowerPoint (y LibreOffice) **crecen la fila**. Por eso **nunca** posiciones lo que va debajo de una tabla calculando `top + rowh × nrows`: el pie de fuente se te encima del footer en cuanto una celda se alarga. Ancla los pies y las bandas a una **y fija**, o usa una altura de fila de peor caso. (Esta nos pegó tres veces en un solo deck.)

### Verificación obligatoria tras exportar

```bash
# 1. Solo las fuentes de la marca — cero sustituciones
unzip -p deck.pptx "ppt/slides/slide*.xml" | grep -oE 'typeface="[^"]+"' | sort -u
# 2. Cero imágenes → confirma que es nativo y no un PDF disfrazado
unzip -l deck.pptx | grep -c "ppt/media/"     # debe dar 0
# 3. Míralo renderizado. Los choques de layout NO los cacha ninguna verificación automática.
soffice --headless --convert-to pdf deck.pptx && pdftoppm -r 72 -png deck.pdf p
```

**Nombre de archivo:** `{marca}-{tipo}-{tema}-vN.{ext}` — ej. `adglow-pitch-wom-relanzamiento-v1.html`, `fantastica-plan-kapital-h2-v2.pptx`, `havas-cierre-inti-2026-07.pdf`.

## Qué NO hacer

- **No inventes métricas ni benchmarks.** Placeholder `{{verificar}}` si falta.
- **No mezcles marcas** en un mismo deck. Una marca = una paleta = una tipografía.
- **No uses los colores default de Chart.js** — siempre la paleta de la marca.
- **No agregues frameworks** de presentación ni animaciones decorativas fuera de las autorizadas.
- **No quites el botón Descargar PDF** ni el footer chrome.
- **No exportes PPTX image-based** (screenshot + addImage). Debe ser nativo/editable. **El botón PPTX del shell de la app hace exactamente eso** — no lo entregues como si fuera editable.
- **No mantengas dos copias de las cifras.** Un `content.py`, dos renderers. Si el PPTX y el HTML guardan cada uno sus números, ya divergieron.
- **No cuelgues nada de la altura de una tabla** en PPTX (`top + rowh × nrows`): las filas crecen. Ancla a y fija.
- **No abras con competencia.** Primero el resumen ejecutivo.
- **No traduzcas la metodología** salvo cliente anglo. Default español.

## Memoria del proyecto

Kar opera Karma Creative Lab; Adglow vive en `~/adglow`. Contexto vivo (marcas, clientes del partnership Fantástica, tokens de Meta, decks previos) en `~/.claude/projects/-Users-<usuario>-adglow/memory/`. Decks pesados van a la rama huérfana `propuestas/` (regla <25MB). Skills hermanas: `adglow-deliverable` (voz/calidad/entregables no-deck), `adglow-brand-design` (tokens completos por marca).
