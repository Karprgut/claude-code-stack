# Catálogo de componentes — Adglow Design System

Cada componente abajo aparece en los templates ya incorporado. Esta hoja te dice **cuándo usar cada uno** y **qué color elegir**.

## Semántica de color

| Color | Token | Cuándo |
|---|---|---|
| **Cyan** `#00D9FF` | `--cyan` | Default / información / awareness / links / acento neutro |
| **Magenta** `#F00A5E` | `--magenta` | Conversión / crítico / hallazgo bloqueante / KPI primario en alarma |
| **Green** `#B0DA09` | `--green` | Positivo / OK / tráfico / lift conseguido / oportunidad |
| **Orange** `#F99400` | `--orange` | Warning / atención / tiempo, días / calidad subóptima |
| Purple `#B80090` | `--purple` | Reservado — úsalo solo si necesitas un quinto valor y avísale al usuario |

**Regla mnemónica:** Awareness=cyan, Tráfico=green, Conversión=magenta. Esto se mantiene a lo largo del documento.

## eyebrow (encabezado pequeño mono)

```html
<div class="eyebrow">
  <span class="badge badge-warn"><span class="dot"></span>Borrador v1</span>
  <span>brief · <span class="glow-cyan">2026-05-27</span></span>
</div>
```

Va arriba de cada `<h1>`/`<h2>`. Mono, uppercase, letter-spacing 0.25em.

## section-label

```html
<div class="section-label">⬡ 01 — objetivo &amp; hipótesis</div>
```

Encabeza cada sección/slide después del eyebrow. Símbolo Unicode (⬡ ▣ ◊ ◈ ◐ ◔ ◇ ⌬) + número + tema. Subraya con cyan.

## KPI card

```html
<div class="kpi cyan">
  <div class="label">KPI primario</div>
  <div class="value">CPM</div>
  <div class="sub">target $2,5 – $4 USD</div>
</div>
```

Variantes: `.kpi`, `.kpi.cyan`, `.kpi.magenta`, `.kpi.green`, `.kpi.orange`. Van en `.kpi-grid` (2/3/4 columnas según slide).

**Tres líneas siempre:** label (mono, uppercase) → value (grande, color) → sub (descripción/target).

## card (genérica)

```html
<div class="card cyan">
  <div class="head">
    <span class="tag">01</span>
    <span class="title">Awareness</span>
  </div>
  <p>Descripción corta.</p>
  <div class="obj-kpi">KPI · <strong>CPM</strong></div>
</div>
```

Border-left de 3px en color. Para describir campañas, iniciativas, etapas.

## hypothesis box

```html
<div class="hypo">
  <div class="h-tag">H1 · Awareness</div>
  <p>La audiencia <strong>broad</strong> de Meta gana en CPM puro, pero la <strong>1P de RCN</strong> entrega mejor <em>quality view rate</em>.</p>
</div>
```

Verde sutil. Para H1/H2/H3 explícitas en el brief.

## badge

```html
<span class="badge badge-warn"><span class="dot"></span>Borrador v1</span>
<span class="badge badge-live"><span class="dot"></span>En vuelo</span>
<span class="badge badge-ok"><span class="dot"></span>OK</span>
<span class="badge badge-crit"><span class="dot"></span>Crítico</span>
```

El `.dot` pulsa. Para status de algo (versión del doc, estado de campaña, severidad de hallazgo).

## callout

```html
<div class="callout green">
  <div class="lbl">por qué este recorte</div>
  <p>El catálogo gold tiene <strong>12 audiencias activables</strong>…</p>
</div>
```

Variantes: cyan (default), `.green`, `.orange`. Border-left de 3px. Para "el por qué" detrás de una decisión, una nota técnica, un warning.

## tabla

```html
<table>
  <thead>
    <tr><th>Ad set</th><th>Audiencia</th><th>Origen</th><th class="num">Tamaño</th></tr>
  </thead>
  <tbody>
    <tr>
      <td class="tag-c">A1 · Control</td>
      <td><strong>Broad CO 18-55</strong></td>
      <td>Meta estándar — sin intereses</td>
      <td class="num">~25M</td>
    </tr>
  </tbody>
</table>
```

- `<th>` en mono uppercase cyan
- `.num` alinea a la derecha y usa mono
- `.tag-c` / `.tag-m` / `.tag-g` para identificadores tipo "A1·Control" en mono colorido
- `.ok` / `.warn` / `.crit` para celdas con badge inline

## timeline (fases)

```html
<div class="timeline">
  <div class="phase">
    <div class="num">Fase 01</div>
    <div class="title">Setup &amp; Legal</div>
    <div class="days">3 días</div>
    <p>Carga audiencia 1P, hashing PII…</p>
  </div>
  <!-- repetir -->
</div>
```

5 columnas, border-top cyan en cada fase. Para cronograma de test.

## specs grid (creativos)

```html
<div class="specs-grid">
  <div class="spec-card">
    <h4>Video Feed / Reels</h4>
    <div class="ratio">9:16</div>
    <div class="meta">
      <strong>1080×1920</strong> · MP4/MOV · H.264 · &lt; 4 GB<br>
      Duración <strong>6-15 seg</strong>
    </div>
  </div>
  <!-- repetir -->
</div>
```

3 columnas. Para specs técnicas de creativos por etapa.

## checklist (pendientes)

```html
<ul class="checklist">
  <li><strong>Aprobación del presupuesto</strong> · USD $3.000 (~$12M COP) y método de facturación</li>
  <li><strong>Carga de la audiencia 1P</strong> firmada digitalmente con consent log (legal RCN)</li>
</ul>
```

Cuadrito ☐ naranja al frente. Para entregables/pendientes pre go-live.

## clean list (◆ bullets)

```html
<ul class="clean">
  <li><strong>Costo por KPI primario</strong> ≤ target del rango</li>
  <li>Volumen mínimo de significancia: <strong>50 conversiones</strong></li>
</ul>
```

Bullet cyan ◆. Para listas que no son checklist.

## marker highlight

```html
<p>El test mide <span class="marker-cyan">audiencias 1st-party</span> contra <span class="marker-magenta">segmentación estándar</span>.</p>
```

Variantes: `.marker-cyan`, `.marker-magenta`, `.marker-green`, `.marker-orange`. Background tipo plumón en la mitad inferior. Para resaltar frases clave en párrafos.

## glow text

```html
<h1>Test de Audiencias <span class="accent">en Meta Ads</span></h1>
<h2>Lead capture · <span class="glow-magenta">CPL</span></h2>
```

`.accent` y `.glow-cyan`/`.glow-magenta`/`.glow-green`/`.glow-orange` aplican text-shadow neón. Para enfatizar palabras clave en títulos.

---

# Componentes específicos del long-form report

## hero

```html
<header class="hero">
  <div class="eyebrow">Adglow × {{Cliente}} · <span class="glow-cyan">{{2026-05-12}}</span></div>
  <h1>Status &amp; <span class="accent">plan de acción</span></h1>
  <p class="lead">Resumen del estado del pipeline …</p>
  <div class="tagstrip">
    <em>databricks</em> · <span>fivetran</span> · <em>meta capi</em> · <span>identity graph</span>
  </div>
</header>
```

## TOC

```html
<nav class="toc">
  <ol>
    <li><a href="#tldr">TL;DR</a></li>
    <li><a href="#hallazgos">Hallazgos</a></li>
    <li><a href="#prioridades">Priorización</a></li>
  </ol>
</nav>
```

## finding card

```html
<div class="finding crit">
  <div class="head">
    <span class="tag">crítico · 01</span>
    <span class="title">Identidad fragmentada</span>
  </div>
  <p>807,786 usuarios identificados que no podemos activar…</p>
</div>
```

Variantes: `.crit` (magenta), `.opp` (green, oportunidad), `.quality` (orange, calidad).

## pipeline diagram (capas bronze/silver/gold)

```html
<div class="pipeline">
  <div class="layer-label">SOURCES</div>
  <div class="pipeline-layer">
    <div class="pipe-card source"><div class="pcap">Athena</div><div class="ptitle">rcn_dynamodb_sso</div><div class="pmeta">JDBC read-only</div></div>
    <div class="pipe-card source"><div class="pcap">Segment</div><div class="ptitle">events_snapshot</div><div class="pmeta">9.7M events</div></div>
  </div>
  <div class="arrow">▼ ingest</div>
  <div class="layer-label">BRONZE</div>
  <div class="pipeline-layer single">
    <div class="pipe-card bronze"><div class="pcap">rcn.bronze</div><div class="ptitle">raw snapshots</div></div>
  </div>
  <div class="arrow">▼ clean + hash PII</div>
  <div class="layer-label">SILVER</div>
  <div class="pipeline-layer">
    <div class="pipe-card silver"><div class="pcap">rcn.silver</div><div class="ptitle">identity_graph</div></div>
    <div class="pipe-card silver"><div class="pcap">rcn.silver</div><div class="ptitle">canonical_users</div></div>
  </div>
  <div class="arrow">▼ activate</div>
  <div class="layer-label">GOLD <span class="glow">·activables·</span></div>
  <div class="pipeline-layer single">
    <div class="pipe-card gold"><div class="pcap">rcn.gold</div><div class="ptitle">audiences_catalog</div><div class="pmeta">15 audiencias hasheadas</div></div>
  </div>
</div>
```

Variantes de `.pipe-card`: `.source` (orange), `.bronze`, `.silver`, `.gold` (green), `.star` (magenta, destacado).

## decisions list

```html
<div class="decisions">
  <div class="decision">
    <h4>¿Quién pide los dumps a los 5 portales?</h4>
    <p>Necesitamos un sponsor con autoridad cross-portal.</p>
  </div>
  <div class="decision">
    <h4>¿Plazo objetivo para entrega de dumps?</h4>
    <p>Propuesta: 2026-05-26 (2 semanas).</p>
  </div>
</div>
```

Auto-numerado (`01`, `02`, …) en magenta. Para "Decisiones que necesitamos de la junta".

---

# Reglas tipográficas

| Elemento | Font | Weight | Case | Letter-spacing |
|---|---|---|---|---|
| h1 | sans | 700 | UPPER | -0.02em |
| h2 | sans | 700 | UPPER | -0.02em |
| h3 | sans | 700 | UPPER | normal |
| h4 | sans | 700 | UPPER | 0.12em |
| eyebrow | mono | 400 | UPPER | 0.25em |
| section-label | mono | 400 | UPPER | 0.3em |
| body p | sans | 400 | sentence | normal |
| code / mono inline | mono | 400 | as-is | normal |
| .lead | sans | 400 | sentence | normal (font 19px) |

**Numerales** en tablas y stats: mono. **Identificadores técnicos** (`gclid`, `rcn.silver.identity_graph`): mono + cyan background pill.

# Componentes específicos de Plan de medios

Estos componentes existen en `templates/plan-de-medios.html`. Si los necesitas en otro template, copia el CSS desde ahí.

## market-stat (estadística de mercado con fuente)

```html
<div class="market-stat">
  <div class="ms-label">Tamaño mercado MX</div>
  <div class="ms-value">USD $2.4B</div>
  <div class="ms-sub">2025e · CAGR <strong>+14%</strong></div>
  <div class="ms-source">Fuente: Statista · ABTM 2025</div>
</div>
```

KPI card con cuarta línea: `ms-source` en mono 9px gris. Sin fuente, sin cifra.

## competitor-card (ficha de competidor)

```html
<div class="competitor-card">
  <div class="cc-head">
    <div class="cc-logo">CL</div>
    <div>
      <div class="cc-name">Caliente.mx</div>
      <div class="cc-tag">Líder de mercado · 100+ años</div>
    </div>
  </div>
  <div class="cc-stats">
    <div><span class="lbl">Visitas/mes</span><span class="val">18.2M</span></div>
    <div><span class="lbl">Share digital</span><span class="val">~38%</span></div>
    <div><span class="lbl">Canales activos</span><span class="val">FB · IG · YT · TV</span></div>
  </div>
  <p class="cc-msg">Mensaje recurrente: "El sitio #1 de México"</p>
</div>
```

Logo placeholder con iniciales sobre fondo cyan. Stats en grid. Mensaje recurrente al pie.

## audience-card (segmento de audiencia)

```html
<div class="audience-card">
  <div class="ac-avatar">👤</div>
  <div class="ac-tag">Cluster A · Core</div>
  <h4>Apostador frecuente Liga MX</h4>
  <ul class="clean">
    <li><strong>Edad:</strong> 25-44</li>
    <li><strong>Género:</strong> 85% M / 15% F</li>
    <li><strong>NSE:</strong> C+, C, D+</li>
    <li><strong>Tamaño estimado:</strong> 4.2M</li>
    <li><strong>Triggers:</strong> jornada Liga MX, eventos UFC</li>
  </ul>
</div>
```

Tres por slide en grid. Cluster A/B/C como tag de colores cyan/green/magenta.

## media-plan-table (tabla con 9 columnas)

```html
<div class="line-header">
  <span class="lh-tag">Línea 01</span>
  <h3>Adquisición de cuentas nuevas</h3>
  <div class="lh-budget">USD $60.000 · 60%</div>
</div>

<table class="media-plan-table">
  <thead>
    <tr>
      <th>Canal</th>
      <th>Objetivo</th>
      <th>Funnel</th>
      <th>KPI</th>
      <th>Audiencia</th>
      <th class="num">Costo KPI</th>
      <th class="num">Inversión</th>
      <th class="num">% inv</th>
      <th class="num">KPI estimado</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="tag-c">Meta</td>
      <td>Leads</td>
      <td>BOFU</td>
      <td>CPL</td>
      <td>Lookalike 1% conversores</td>
      <td class="num">$4,5</td>
      <td class="num">$25.000</td>
      <td class="num"><span class="bar"><span class="bar-fill" style="width:25%"></span></span> 25,0%</td>
      <td class="num">5.555</td>
    </tr>
    <!-- … más filas … -->
  </tbody>
  <tfoot>
    <tr>
      <td colspan="6"><strong>Subtotal línea 01</strong></td>
      <td class="num"><strong>$60.000</strong></td>
      <td class="num"><strong>60,0%</strong></td>
      <td class="num"><strong>{{KPI estimado total}}</strong></td>
    </tr>
  </tfoot>
</table>
```

- `font-size: 12.5px` para que las 9 columnas quepan en 1600px.
- `.num` alinea a la derecha, mono.
- `.bar` + `.bar-fill` renderiza la barra inline antes del `%`.
- `<tfoot>` con subtotal por línea.
- Una `<table>` por línea de campaña, precedida por `.line-header`.
- Al final del último plan, una tabla resumen total con suma de las líneas.

## bar (% inversión visual)

```html
<span class="bar"><span class="bar-fill" style="width:42%"></span></span> 42,0%
```

```css
.bar { display: inline-block; width: 50px; height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; vertical-align: middle; margin-right: 6px; overflow: hidden; }
.bar-fill { display: block; height: 100%; background: var(--cyan); border-radius: 2px; }
```

Variante por línea: `.bar-fill.magenta` / `.bar-fill.green` / `.bar-fill.orange` según el color de la línea de campaña.

## line-header (separador de línea de campaña)

```html
<div class="line-header">
  <span class="lh-tag">Línea 02</span>
  <h3>Reactivación de usuarios inactivos</h3>
  <div class="lh-budget">USD $25.000 · 25%</div>
</div>
```

Aparece justo antes de cada `media-plan-table`. Tag colorido + título + budget en USD y % a la derecha.

## funnel-mini (icono visual TOFU/MOFU/BOFU)

```html
<span class="funnel-mini tofu">TOFU</span>
<span class="funnel-mini mofu">MOFU</span>
<span class="funnel-mini bofu">BOFU</span>
```

Pill pequeña en mono para la columna Funnel de la tabla. Variantes:
- `.tofu` cyan — awareness/reach
- `.mofu` green — consideración/tráfico
- `.bofu` magenta — conversión

## seasonality-chart (barras de estacionalidad por mes/quincena)

```html
<div class="seasonality">
  <div class="month"><div class="bar-v" style="height: 40%"></div><span>Ene</span></div>
  <div class="month hi"><div class="bar-v" style="height: 90%"></div><span>Feb</span></div>
  <div class="month"><div class="bar-v" style="height: 50%"></div><span>Mar</span></div>
  <!-- 12 meses -->
</div>
```

Barras verticales por mes con altura proporcional al % de budget asignado. `.hi` resalta picos de estacionalidad.

# Símbolos Unicode usados en section-labels

`⬡ ▣ ◊ ◈ ◐ ◔ ◇ ⌬ ⬢ ⬣ ◢ ◣ ◤ ◥ ▲ ▼ ◆ ◇ ▰`

Elige según vibe — cyan tipo "circuit" para tech (⬡ ⌬), geométrico para estructura (▣ ◊), círculos para fases/tiempo (◐ ◔).
