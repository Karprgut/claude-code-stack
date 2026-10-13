# Quality checklist — antes de entregar

Pásalo punto por punto antes de declarar un entregable Adglow listo. Si fallas tres o más, el documento no está listo.

## Contenido

- [ ] **Hipótesis declarada explícitamente** (si es un brief de test). Tres hipótesis H1/H2/H3, una sola variable activa por hipótesis.
- [ ] **Criterio de ganador multi-condición** publicado en el documento, no en un anexo. Tres condiciones: costo, volumen, lift.
- [ ] **KPIs como bandas**, no como número único. Cada KPI con target y benchmark verificado para el país/vertical.
- [ ] **Volúmenes esperados como rango** con escenario base (no como punto único).
- [ ] **Timeline con fases nombradas** y regla "no se toca nada" visible en la fase de Aprendizaje.
- [ ] **Aislamiento de variables explicado** — el lector entiende por qué confía en la comparación (mismo creativo, ABO, mismo flight).
- [ ] **Pendientes pre go-live** como último slide/sección: checklist concreto de 5-9 items.
- [ ] **Lo que NO sabemos está declarado.** Estimaciones, dependencias pendientes, huecos de tracking.
- [ ] **"Por qué" antes que "qué"** en cada decisión arquitectónica/táctica importante (callout corto).

## Voz

- [ ] **Español neutral / Mexicano**, tú forms. Cero voseo argentino, cero tildes ibéricas.
- [ ] **Frases cortas**. Si una frase tiene tres comas, párrala en dos.
- [ ] **Datos antes que adjetivos.** "Lift de -20% vs control" > "muy buen resultado".
- [ ] **Unidades explícitas** siempre: USD, COP, %, días, kHz, etc.
- [ ] **Fechas ISO** (`YYYY-MM-DD`) en headers y eyebrows.
- [ ] **Anglicismos técnicos preservados**: CPM, CTR, lookalike, custom audience, learning phase. Nunca traducir.

## Identidad visual

- [ ] **Paleta intacta**: cyan/magenta/green/orange. No has agregado azules, rojos, amarillos genéricos.
- [ ] **Semántica de color respetada**: Awareness=cyan, Tráfico=green, Conversión=magenta. Magenta=crítico, Green=ok, Orange=warning.
- [ ] **Fonts cargados**: Space Grotesk + IBM Plex Mono desde Google Fonts.
- [ ] **Fondo dark + grid 48px + scan-line** presentes.
- [ ] **Headings en UPPERCASE** con letter-spacing negativo en h1/h2.
- [ ] **Eyebrows y section-labels en mono uppercase** con letter-spacing positivo (≥0.2em).
- [ ] **Numerales** en tablas/stats en mono.
- [ ] **Identificadores técnicos** envueltos en `<code>` (background cyan pill).
- [ ] **Markers** usados para frases clave en párrafos largos (no para todo el párrafo).
- [ ] **KPI cards** con label/value/sub (tres líneas siempre).

## Slide deck específico

- [ ] **14 slides** (o el número que corresponda — entre 8 y 16). Cada slide cabe en 1600×900 sin scroll obligado.
- [ ] **Portada con inversión + duración + # campañas + tags** abajo.
- [ ] **Brand-mark + slide-num** presentes en cada slide.
- [ ] **Nav fija abajo** con anterior/siguiente/dots/counter.
- [ ] **Botón "Descargar PDF" funcional** arriba derecha (verifica abriendo el HTML en browser).
- [ ] **Teclado**: ←/→/Space/Home/End navegan.
- [ ] **Modo `body.exporting`** mantiene todos los slides visibles para el export.

## Long-form report específico

- [ ] **Hero con eyebrow + h1 + lead + tagstrip**.
- [ ] **TL;DR como callout cyan** justo después del hero (antes de TOC si TL;DR es la promesa del doc).
- [ ] **TOC navegable** con anchors `#section-id` y scroll-margin-top en `<section>`.
- [ ] **KPI grid del estado actual** en la primera sección.
- [ ] **Findings cards** con border-left color según severidad (crit/opp/quality).
- [ ] **Decisions list auto-numerada** con magenta como "Decisiones que necesitamos".
- [ ] **Footer con "People powered · Data smart · Growth focused"** + versión + fecha.

## Runbook específico

- [ ] **State going in** como checklist ✅/❌ en el header.
- [ ] **Bloques temporales** (TONIGHT / DURING / AFTER, o Part 1/2/3).
- [ ] **Comandos exactos en bloques fenced** ` ```bash `, copy-pasteables sin edición.
- [ ] **Verify command** después de cada paso destructivo o de configuración.
- [ ] **Pre-call email template** quoted, listo para copy-paste si el runbook involucra coordinación con cliente.
- [ ] **Sin explicaciones largas** — quien lo lee ya tiene contexto.

## Findings / Plan de acción específico

- [ ] **TL;DR numerado** al inicio con los N hallazgos clave + frase de "buena noticia / mala noticia".
- [ ] **Cada hallazgo con las 4 subsecciones**: Qué pasa / Impacto / Solución (corto plazo + estructural) / Bloqueador.
- [ ] **Impacto cuantificado**: en $, usuarios, %, tiempo. Nunca cualitativo.
- [ ] **Tabla de priorización** con columnas: # / Acción / Tiempo / Owner / Bloqueado por.
- [ ] **"Decisiones que necesitamos de la junta"** como preguntas numeradas explícitas.
- [ ] **Anexo de métricas de éxito** con tabla Hoy → Meta tras Fase N.

## Plan de medios específico

- [ ] **6 secciones canónicas presentes**: mercado, competidores, audiencia, requerimientos técnicos, planteamiento estratégico, plan por línea.
- [ ] **Investigación de mercado con fuentes citadas** al pie de cada slide (Statista, eMarketer, IAB, regulador local, etc.). Sin cita, sin cifra.
- [ ] **Contexto regulatorio nombrado** (SEGOB para apuestas MX, CNBV para banca, COFEPRIS para salud, etc.).
- [ ] **Competidores: 4-6 actores principales** con visitas/mes, share digital estimado, canales activos, mensaje recurrente.
- [ ] **Audiencia: 2-4 clusters** (no perfiles genéricos) con tamaño estimado por cluster, edad/género/NSE/triggers.
- [ ] **Requerimientos técnicos: tracking + tagging + infra + accesos** explicitados como checklist accionable.
- [ ] **Planteamiento estratégico SIN creatividad/copy** — solo roles por canal, funnel, estacionalidad, bidding.
- [ ] **Líneas de campaña: 2-4**. Cada línea con header propio (`.line-header`) + tabla independiente + subtotal.
- [ ] **Tabla con las 9 columnas exactas**: canal, objetivo, funnel, KPI, audiencia, costo KPI, inversión, % inversión, KPI estimado.
- [ ] **Suma de % inversión = 100,0% exacto** (verifica sumando todas las líneas).
- [ ] **Consistencia matemática KPI estimado** = inversión / costo KPI, fila por fila. Verifica con calculadora.
- [ ] **Mínimos de aprendizaje respetados** por canal (Meta ~$30/día, Google ~$20, TikTok ~$50, programmatic ~$100).
- [ ] **Estacionalidad explicitada** en el planteamiento estratégico con propuesta de flighting por mes/quincena.
- [ ] **Costo KPI viene de benchmark verificado**, no inventado. Cita la fuente en el deck o en notas al pie.
- [ ] **3-6 canales** en el mix total. Menos limita reach; más fragmenta budget bajo el piso.
- [ ] **Última slide antes de pendientes: tabla resumen total** con suma por canal y por línea.

## Técnico (HTML)

- [ ] **Self-contained**: un solo archivo `.html`, CSS inline en `<style>`, JS inline en `<script>`. Sin assets externos salvo fonts CDN.
- [ ] **Funciona offline** tras primer load (los fonts cachean).
- [ ] **PDF export funcional**: abre el HTML, da clic en "Descargar PDF", verifica que descarga.
- [ ] **No errores en consola** del browser.
- [ ] **Responsive básico**: el media query a 900-1100px ajusta grids a 1 columna.
- [ ] **html2canvas + jsPDF** cargados desde CDN si hay export PDF (slide deck siempre, long-form opcional).

## Última verificación

- [ ] **Abrí el archivo en browser** y lo navegué de principio a fin.
- [ ] **Generé el PDF** y verifiqué que las 14 páginas se ven correctas.
- [ ] **Releí el doc completo** con el lente del cliente: ¿qué le hace falta para tomar una decisión?
- [ ] **El nombre del archivo sigue convención**: `{tipo}-{tema}-{vN}.{ext}` ej. `brief-meta-audience-test-v1.html`.
- [ ] **Le di al usuario la ruta absoluta** del archivo generado.
