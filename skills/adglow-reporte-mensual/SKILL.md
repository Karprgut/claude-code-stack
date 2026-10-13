---
name: adglow-reporte-mensual
description: >-
  Arma el reporte / cierre mensual de paid media de un cliente de Adglow
  (agencia de paid media; partnership Adglow×Fantástica). Es la versión Adglow
  del post-mortem: un deck de cierre de mes con inversión, pacing vs. plan de
  medios, resultados por plataforma y objetivo, hallazgos, aprendizajes y next
  steps — vestido en el sistema visual de la marca del cliente (Adglow / Havas /
  Fantástica). Úsalo cuando pidan "el post mortem de <cliente>", "el reporte de
  <mes> de <cliente>", "el cierre de mes de Kapital / Havas", "arma/actualiza el
  reporte mensual de paid media", o cuando haya que producir el deck de cierre
  de un cliente con datos del sistema Reports. Cubre de dónde salen las cifras
  (Reports: Meta+Google+TikTok, pacing vs. plan), el arco narrativo del cierre,
  la lectura correcta de KPIs, y el build a 1920×1080 → PPTX editable. NO es para
  planes de medios (usa la skill del cliente) ni para el look de marca a detalle
  (eso lo da adglow-brand-design).
user-invocable: true
---

# Adglow · Reporte mensual de paid media

Skill para producir el **cierre / post-mortem mensual** de un cliente de Adglow
con la metodología, la voz y el nivel de acabado que Kar ya estableció. El
producto final es un **deck de 1920×1080** en el sistema visual de la marca del
cliente, exportado a **PPTX editable nativo** (texto, tablas y charts editables
en PowerPoint/Keynote/Canva — nunca imágenes rasterizadas).

> Es la versión Adglow del skill KCL `post-mortem`. La diferencia clave: aquí
> los datos **no se exportan a mano** — salen del **sistema Reports** de Adglow
> (ingest en vivo de Meta + Google + TikTok, con pacing vs. plan de medios).

## Paso 0 — Confirma cliente, marca y mes (obligatorio)

Antes de tocar nada, deja fijo:

1. **Cliente** y su **marca visual**. Una pieza, una marca — nunca mezcles
   paletas. Deriva la marca del cliente y **confírmala**:

   | Marca del reporte | Clientes típicos |
   |---|---|
   | **Fantástica** (naranja sobre negro) | **Kapital** (fintech MX+CO), WOM, y demás clientes del Grupo Fantástica |
   | **Havas** (negro/blanco + rojo señal) | La cuenta **Havas** (repo/proyecto aparte, reportshavas.com; ojo con el reporte de margen Inti) |
   | **Adglow** (dark + neón) | Clientes bajo Adglow directo y sub-brands como **BlackBird Performance Studio** (BanCoppel Remesas) |

2. **Mes de cierre.** Define el rango: `since=<YYYY-MM-01>`, `until=<último día
   del mes>`, en **zona horaria MX** (mismo criterio que el cron de Reports).
   Para los deltas necesitas también el **mes anterior**.
3. **Localiza el deck del mes anterior** como punto de partida (layouts y tokens
   ya afinados). Clonar y reemplazar; no regeneres desde cero.

## De dónde salen los datos (y qué NO se inventa)

Todas las cifras oficiales del reporte salen del **sistema Reports** de Adglow —
el mismo dashboard con ingest en vivo que ya usa el equipo:

- **Base canónica → Reports.** Inversión, impresiones, clics, resultados,
  CPM/CPC/CTR/CPA/ROAS por campaña y por anuncio, en las **tres plataformas**
  (Meta + Google + TikTok). Los crons hacen `$set` atómico con **tokens por
  cliente**; los datos llegan ya con **markup aplicado** (vista cliente) y en
  **zona horaria MX**. Clientes con datos en vivo hoy: **Kapital (MX+CO)** y la
  cuenta **Havas**.
- **Pacing vs. plan de medios → Reports.** El sistema compara lo **consumido**
  contra el **planeado** del plan de medios y contra lo **esperado por tiempo
  transcurrido**. De ahí sale el bloque de pacing del deck — no lo calcules a
  ojo si el sistema ya lo expone.

**Regla de oro — no inventes cifras.** Si una plataforma no devolvió datos para
el rango (token vencido, cuenta sin gasto, canal caído), o si falta el plan de
medios de una línea, **decláralo como hueco**, no lo rellenes con estimaciones
inventadas. Un dato estimado se marca como estimación. Un canal caído se reporta
como hecho. El reporte debe poder auditarse meses después.

> Nunca imprimas valores de tokens. Los tokens (Meta System User / por cliente,
> OAuth Google, token TikTok) viven en el `.env` / la config del dashboard;
> tú solo consumes la salida de Reports.

## Arco narrativo del cierre de mes

El deck cuenta una historia, no es un volcado de tablas. Orden canónico:

1. **Portada** — cliente, marca, "Reporte / Cierre de <mes> <año>", periodo.
2. **Resumen ejecutivo** — 3-5 bullets con lo que importa: inversión total,
   resultado principal (leads / conversiones / ventas / ROAS), pacing global vs.
   plan, y el titular del mes (qué funcionó, qué no). Cada bullet con su cifra.
3. **Inversión y pacing vs. plan** — cuánto se invirtió por canal vs. lo
   planeado; **% consumido vs. % esperado por tiempo transcurrido**. Aquí se ve
   si el mes fue sub-ejecutado, on-track o sobre-ejecutado.
4. **Resultados por plataforma / objetivo** — Meta, Google y TikTok, cada uno
   con sus KPIs por objetivo (awareness / tráfico / conversión). Filas por
   campaña donde aporte. Delta vs. mes anterior en cada cifra clave.
5. **Hallazgos** — qué pasó y **por qué**. Cada hallazgo: qué observamos →
   impacto cuantificado → lectura. Datos antes que adjetivos.
6. **Aprendizajes** — lo que el mes nos enseñó (audiencias, formatos, creativos,
   horarios, canales) y qué se replica o se corta.
7. **Next steps** — acciones concretas para el mes siguiente, con dueño y, donde
   aplique, ajuste de plan/presupuesto. Cierra con lo que necesitamos del
   cliente (aprobaciones, accesos, creativos).

Regla de titulares: **cada título de slide es una conclusión, no una etiqueta.**
Mal: "Inversión por canal". Bien: "Google consumió 92% del plan y trajo el 60%
de las conversiones a menor CPA". El eyebrow da el tema; el título da la lectura.

## KPIs y su lectura correcta

Toda cifra con su **unidad** ($/MXN/COP, %, ROAS, leads) y, donde aplique, su
**delta** vs. mes anterior (up/down/flat). Lecturas obligadas:

- **CPM** (costo por mil impresiones) — eficiencia de compra de alcance. Sube →
  subasta más cara o segmentación más estrecha; contextualiza contra el mes
  previo, no en absoluto.
- **CPC** (costo por clic) — precio del tráfico. Léelo junto al CTR: CPC alto con
  CTR bajo = creativo/segmentación flojos.
- **CTR** (clics ÷ impresiones) — relevancia del creativo/oferta. Es señal, no
  meta; un CTR alto que no baja el CPA no vale.
- **CPA / CAC** (costo por adquisición / por cliente) — el KPI de performance por
  excelencia. Compáralo contra el **target del plan de medios**, no contra cero.
- **ROAS** (ingreso ÷ inversión) — solo donde hay valor de conversión trackeado.
  Si la atribución tiene huecos, dilo; un ROAS sin ventana de atribución clara
  se reporta con su caveat. Clientes lead-gen (sin venta directa) **no llevan
  ROAS**: su KPI es leads y costo por lead.
- **Alcance / Frecuencia** — frecuencia alta con CTR/CPA que empeoran = fatiga de
  creativo; es un hallazgo, no un dato de relleno.
- **Pacing** — **% consumido** vs. **% esperado por tiempo transcurrido**. A día
  20 de un mes de 30, lo esperado es ~67% del plan. Consumido muy por debajo =
  sub-ejecución (riesgo de dejar presupuesto en la mesa); muy por encima =
  posible agotamiento antes de fin de mes. Léelo por canal, no solo global.

## Formato y build — 1920×1080 en la marca del cliente → PPTX

El look completo de cada marca lo da **`adglow-brand-design`**: ahí están los
tokens exactos (hex al carácter), tipografías y patrones HTML+CSS por marca
(Adglow dark+neón, Havas negro/blanco+rojo data-hero, Fantástica naranja sobre
negro con las tres primitivas). **No inventes colores ni fuentes** — cópialos de
esa skill.

Pipeline (clonar y reemplazar, no regenerar):

1. **Clona** el deck del mes anterior del cliente → carpeta del mes nuevo.
2. **Trae los datos** del sistema Reports (snapshot del mes + mes anterior para
   deltas + pacing vs. plan). Cuadra totales por plataforma, filas por campaña y
   el bloque de pacing.
3. **Edita el contenido en el HTML** slide por slide: cifras, deltas, títulos-
   conclusión, hallazgos, aprendizajes, next steps.
4. **Renderiza / exporta** a PPTX editable nativo. El deck se autora en HTML+CSS
   vanilla a **1920×1080** y se exporta a **PPTX** (DOM→PPTX nativo, nunca
   image-based) o a PDF con Chrome headless para preview. Charts y tablas
   **nativos y editables**, con la paleta de la marca del cliente.
5. **Verifica** con la checklist de cierre.

Reglas de export que no se negocian: fuentes de la marca que **no se sustituyan**
en el PPTX, `print-color-adjust: exact` para que no se laven los fondos oscuros
(Adglow/Fantástica) ni el rojo de Havas, tamaño exacto 1920×1080, y cero drop
shadows fuera del sistema del cliente.

**Ubicación de salida:** dentro de la carpeta del cliente (rama `propuestas` u
otra según convención). Nombra `{marca}-reporte-{cliente}-{YYYY-MM}-vN.{ext}`,
ej. `fantastica-reporte-kapital-2026-06-v1.pptx`.

## Voz y lenguaje (obligatorio)

- **Español mexicano**, tú/tuteo. Nunca voseo argentino ni formas ibéricas.
  Bilingüe EN/ES está bien en etiquetas ("Quick win", "Next steps").
- **El título de cada slide es una conclusión, no una etiqueta.**
- **Datos antes que adjetivos.** Toda cifra con unidad y, donde aplique, su delta.
- **Por qué antes de qué.** Cada hallazgo y cada recomendación lleva su razón.
- **Lo que NO sabemos se declara.** Tracking con huecos, atribución parcial,
  canal caído, dato estimado → dilo en el slide, no lo escondas.
- **Honestidad operativa.** Si el mes fue flojo (sub-ejecución, canal caído,
  CPA arriba de target), el reporte lo dice con datos y propone el fix. No es un
  brochure; es un documento de revisión de desempeño.

## Checklist de cierre

Corre esto antes de declarar el reporte listo. Si algo falla, no entregues.

- [ ] Cliente, marca y **mes** correctos; una sola marca en toda la pieza.
- [ ] Todas las cifras salen del sistema **Reports** (Meta+Google+TikTok);
      ninguna inventada. Huecos declarados donde falten datos.
- [ ] **Pacing** presente: % consumido vs. % esperado por tiempo transcurrido,
      por canal y global.
- [ ] Deltas vs. **mes anterior** en cada KPI clave (up/down/flat).
- [ ] CPA/CAC comparado contra el **target del plan de medios**; ROAS solo donde
      hay valor de conversión trackeado (con su caveat de atribución).
- [ ] Arco completo: resumen ejecutivo → inversión/pacing → resultados por
      plataforma → hallazgos → aprendizajes → next steps.
- [ ] Títulos de slide son **conclusiones**, no etiquetas.
- [ ] Cada hallazgo lleva su "por qué"; cada next step lleva dueño.
- [ ] **Tokens exactos** de la marca (vía `adglow-brand-design`); sin hex ni
      fuentes inventados.
- [ ] Export a **1920×1080 · PPTX editable nativo**: texto/tablas/charts
      editables, fuentes no sustituidas, colores sólidos (`print-color-adjust`).

## Memoria del proyecto

El usuario opera Karma Creative Lab; Adglow vive en `~/adglow`.
Para contexto vivo de cada cliente/marca (Kapital y su plan de medios, la cuenta
Havas y el gotcha de markup Inti, WOM, BanCoppel/BlackBird, y el detalle del
sistema Reports con Google+TikTok) lee los memos del proyecto en
`~/.claude/projects/-Users-<usuario>-adglow/memory/`.
