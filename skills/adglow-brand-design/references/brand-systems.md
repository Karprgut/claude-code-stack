# Sistemas de marca — Adglow · Havas · Fantástica · Kapital

Referencia detallada de los cuatro sistemas visuales. Cada uno trae: tokens
exactos, tipografías, reglas de uso (proporciones y do/don'ts), componentes
característicos y patrones HTML+CSS listos para producir piezas on-brand con la
técnica **HTML → PDF con Chrome headless** (ver SKILL.md).

**Adglow / Havas / Fantástica** son sistemas de **agencia**: la pieza se ve como
la agencia. **Kapital** es el sistema del **cliente**: se usa cuando el
entregable se presenta como Kapital (masterdecks, planes de medios que el
cliente lleva a su comité), no como Adglow. Si dudas, pregunta quién firma la
pieza — eso decide el sistema.

Todos los patrones son **self-contained** (sin CSS externo, sin build). Copia el
bloque `:root` y el patrón base de la marca correspondiente; no reconstruyas el
CSS desde cero.

---

## 1) ADGLOW — dark + neon

Identidad propia de la agencia y de sus sub-brands (ej. **BlackBird Performance
Studio** para la campaña Remesas de BanCoppel). Estética técnica, oscura, con
neón funcional: el color **significa** algo (no es decoración).

### Tokens exactos

```css
:root {
  /* Superficie */
  --ink:      #0b0b10;   /* fondo base */
  --ink-elev: #14141a;   /* superficie elevada (cards) */

  /* Texto sobre oscuro */
  --fg-1: rgba(255,255,255,1);
  --fg-2: rgba(255,255,255,0.60);
  --fg-3: rgba(255,255,255,0.40);
  --fg-4: rgba(255,255,255,0.25);

  /* Neón funcional */
  --magenta: #F00A5E;   /* crítico · CONVERSIÓN · alarma / KPI primario */
  --cyan:    #00D9FF;   /* info · AWARENESS · default · links · neutral */
  --green:   #B0DA09;   /* positivo · ok · TRÁFICO · escalar */
  --orange:  #F99400;   /* warning · atención · días/tiempo */
  --purple:  #B80090;   /* reservado, casi nunca */

  /* Bordes y markers (plumón) */
  --border-hair:  rgba(255,255,255,0.06);
  --border-cyan:  rgba(0,217,255,0.15);
  --marker-cyan:    rgba(0,217,255,0.18);
  --marker-magenta: rgba(240,10,94,0.18);
  --marker-green:   rgba(176,218,9,0.22);
  --marker-orange:  rgba(249,148,0,0.18);

  /* Glows */
  --glow-cyan-md:    0 0 25px rgba(0,217,255,0.30), 0 0 50px rgba(0,217,255,0.15);
  --glow-magenta-md: 0 0 25px rgba(240,10,94,0.30), 0 0 50px rgba(240,10,94,0.15);
  --glow-green-md:   0 0 25px rgba(176,218,9,0.30), 0 0 50px rgba(176,218,9,0.15);

  --font-sans: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, Menlo, monospace;
}
```

### Tipografía

- **Space Grotesk** — display y body. Headings **SIEMPRE EN MAYÚSCULAS**,
  `letter-spacing: -0.02em`, `line-height: 0.95`, peso 700.
- **IBM Plex Mono** — eyebrows, labels, section-labels, código, cifras técnicas.
  `text-transform: uppercase`, `letter-spacing: 0.25em`, peso 400.

### Semántica de color (mnemónica de funnel — no negociable)

| Función | Color |
|---|---|
| Awareness | **cyan** #00D9FF |
| Tráfico / consideración | **verde-lima** #B0DA09 |
| Conversión | **magenta** #F00A5E |
| Warning / tiempo / días | **naranja** #F99400 |
| Neutral / default / info / links | **cyan** #00D9FF |

Regla: cuando dudes, usa cyan (es el neutral). El magenta es señal fuerte,
resérvalo para conversión/alarma.

### Do / Don't

- **Do:** fondo `--ink` con grid 48px + scan-line; glows suaves en cifras clave;
  markers estilo plumón para resaltar una frase.
- **Do:** section-label con símbolo + número + tema, subrayado cyan.
- **Don't:** fondos claros; headings en minúsculas; usar magenta como decoración;
  animaciones decorativas fuera de `slideFade`/`pulse`.

### Componentes característicos

- **Section-label:** `⬡ 01 · AUDIENCIA` con subrayado cyan. Símbolos rotan por
  sección: `⬡ ▣ ◊ ◈ ◐ ◔ ◇ ⌬`.
- **KPI card** sobre `--ink-elev`, cifra grande con glow del color de su función.
- **Eyebrow** en mono uppercase 0.25em arriba del H1.
- **Marker** (highlight plumón) en 4 colores para frases clave.

### Patrón base — deck 1600×900 (Chrome headless → PDF)

```html
<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Adglow · {{tema}}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&family=IBM+Plex+Mono:wght@400;500;700&display=swap');
:root{ /* …pega el bloque :root de Adglow de arriba… */ }
@page { size: 1600px 900px; margin: 0; }
*{box-sizing:border-box}
html,body{margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{
  background:var(--ink); color:var(--fg-1);
  font-family:var(--font-sans); font-weight:700; font-size:16px; line-height:1.45;
  background-image:
    linear-gradient(rgba(0,217,255,.025) 1px,transparent 1px),
    linear-gradient(90deg,rgba(0,217,255,.025) 1px,transparent 1px);
  background-size:48px 48px;
}
.slide{
  width:1600px; height:900px; padding:64px 56px; position:relative;
  display:flex; flex-direction:column; justify-content:center;
  page-break-after:always; break-after:page; overflow:hidden;
}
.slide::before{ /* scan-line */
  content:''; position:absolute; inset:0; pointer-events:none;
  background:repeating-linear-gradient(0deg,transparent 0,transparent 3px,rgba(255,255,255,.012) 3px,rgba(255,255,255,.012) 4px);
}
.section-label{
  font-family:var(--font-mono); font-size:12px; letter-spacing:.25em;
  text-transform:uppercase; color:var(--cyan);
  border-bottom:1px solid var(--border-cyan); padding-bottom:8px;
  display:inline-block; margin-bottom:28px;
}
h1{ font-size:clamp(48px,6vw,96px); line-height:.95; letter-spacing:-.02em;
    text-transform:uppercase; margin:0 0 24px; }
h1 .accent{ color:var(--cyan); text-shadow:var(--glow-cyan-md); }
.eyebrow{ font-family:var(--font-mono); font-size:11px; letter-spacing:.25em;
    text-transform:uppercase; color:var(--fg-3); margin-bottom:16px; }
.kpi{ background:var(--ink-elev); border:1px solid var(--border-hair);
    border-radius:12px; padding:24px 28px; }
.kpi .num{ font-size:56px; color:var(--magenta); text-shadow:var(--glow-magenta-md); }
.mark-cyan{ background:var(--marker-cyan); padding:0 .15em; }
</style></head><body>
  <section class="slide">
    <span class="section-label">⬡ 01 · AUDIENCIA</span>
    <div class="eyebrow">Adglow · Paid Media</div>
    <h1>Escalamos lo que <span class="accent">convierte</span></h1>
    <div class="kpi"><div class="num">$2.5–4.0</div>CPA objetivo (USD)</div>
  </section>
  <!-- duplica .slide por slide -->
</body></html>
```

### Sub-brands

Un sub-brand (**BlackBird Performance Studio**, navy + amarillo, para BanCoppel
Remesas) **hereda la disciplina de Adglow** (oscuridad, grid, tipografía, color
funcional) pero puede tener su propio par de acentos. El acento del sub-brand no
puede contradecir la semántica (ej. no uses su amarillo para marcar "alarma" si
en Adglow eso es magenta). Documenta el par de acentos del sub-brand en la pieza.

---

## 2) HAVAS — negro / blanco / rojo

Para entregables y **reportes de la cuenta Havas** (proyecto/repo aparte,
reportshavas.com; reporte de margen Inti). Filosofía brutalista-editorial: **la
data es el héroe**, tipografía pesada y cuadrada, y **un solo rojo** como única
señal.

### Tokens exactos

```css
:root {
  --void:  #000000;
  --ink:   #0A0A0A;
  --bone:  #FAFAFA;   /* fondo claro / texto sobre oscuro */
  --paper: #FFFFFF;

  --signal:        #FF0044;   /* ÚNICO acento — rojo señal */
  --signal-pressed:#CC0036;   /* estado pressed / hover */

  /* Grises derivados (por opacidad, no nuevos hex) */
  --ink-70: rgba(10,10,10,.70);
  --ink-40: rgba(10,10,10,.40);
  --ink-12: rgba(10,10,10,.12);

  --font-display: 'Bricolage Grotesque', Arial, sans-serif;
  --font-body:    'General Sans', Arial, sans-serif;
  --font-mono:    'JetBrains Mono', ui-monospace, monospace;
}
```

### Tipografía

- **Bricolage Grotesque** (variable) — display/titulares. Pesada, cuadrada,
  apretada. Es la voz visual.
- **General Sans** — body, párrafos, labels largos.
- **JetBrains Mono** — TODO lo numérico: cifras de KPI, códigos, IDs,
  timestamps, tablas de datos.

### Reglas de uso (proporciones)

- **Solo** negro / blanco / gris + **un** rojo. Cero otros colores, ni siquiera
  para gráficas: las series se diferencian por peso/patrón, no por color.
- El **rojo se usa con avaricia**: marca la cifra clave, el estado crítico, la
  línea de tendencia que importa. Si todo es rojo, nada es señal.
- La data ocupa el mayor peso visual de la página; el texto de apoyo es chico y
  gris.
- **Section-label sobre cada H1/H2**, SIEMPRE en rojo, con letter-spacing.

### Do / Don't

- **Do:** números enormes en JetBrains Mono; tablas densas y limpias; un rojo por
  pantalla como máximo protagonista.
- **Don't:** gradientes, sombras suaves, colores extra, rojo decorativo, tipos
  redondeados/serif.

### Componentes característicos

- **Section-label rojo** con letter-spacing encima de cada encabezado.
- **Big-number:** cifra dominante en mono, con delta chico (verde/rojo NO — el
  delta positivo/negativo se marca con `+`/`−` y peso, no con color; solo lo
  crítico va en rojo).
- **Data table** con bordes hairline `--ink-12` y header en mayúsculas.

### Patrón base — reporte A4 (Chrome headless → PDF)

```html
<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Havas · Reporte {{tema}}</title>
<style>
@import url('https://api.fontshare.com/v2/css?f[]=bricolage-grotesque@700,800&f[]=general-sans@400,500,600&display=swap');
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap');
:root{ /* …pega el bloque :root de Havas… */ }
@page { size: A4; margin: 0; }
*{box-sizing:border-box}
html,body{margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{ background:var(--paper); color:var(--ink);
  font-family:var(--font-body); font-size:13px; line-height:1.5; }
.page{ padding:48px 56px; min-height:297mm; }
.section-label{
  font-family:var(--font-mono); font-size:11px; letter-spacing:.3em;
  text-transform:uppercase; color:var(--signal); margin-bottom:10px; display:block;
}
h1{ font-family:var(--font-display); font-weight:800; font-size:56px;
    line-height:.98; letter-spacing:-.02em; margin:0 0 24px; }
h2{ font-family:var(--font-display); font-weight:700; font-size:28px;
    letter-spacing:-.01em; margin:32px 0 12px; }
.big-number{ font-family:var(--font-mono); font-weight:600; font-size:72px;
    line-height:1; letter-spacing:-.02em; }
.big-number.crit{ color:var(--signal); }
table{ width:100%; border-collapse:collapse; font-family:var(--font-mono);
    font-size:12px; }
th{ text-align:left; text-transform:uppercase; letter-spacing:.08em;
    font-size:10px; color:var(--ink-40); border-bottom:1px solid var(--ink-12);
    padding:8px 10px; }
td{ padding:8px 10px; border-bottom:1px solid var(--ink-12); }
td.crit{ color:var(--signal); }
</style></head><body>
  <div class="page">
    <span class="section-label">Reporte · Margen</span>
    <h1>Inti · Julio 2026</h1>
    <div class="big-number crit">$1.24M</div>
    <table>
      <thead><tr><th>Campaña</th><th>Inversión</th><th>Margen</th></tr></thead>
      <tbody><tr><td>Awareness Q3</td><td>$420K</td><td class="crit">$0</td></tr></tbody>
    </table>
  </div>
</body></html>
```

> Nota de negocio: en el reporte de margen Havas, campañas **sin markup** salen
> en `$0`. Cada mes hay que asignar markup a las campañas nuevas en
> `/reports/admin/inti`. La pieza debe marcar esos `$0` con `.crit` (rojo) para
> que salten a la vista.

---

## 3) FANTÁSTICA — naranja sobre negro

Para clientes del **Grupo Fantástica** (partnership Adglow×Fantástica):
**Kapital** (fintech MX+CO), **WOM** (telco Colombia) y demás. Estética suiza-
brutalista: negro dominante, naranja como acento medido, y **tres primitivas
geométricas** como sistema de bullets/separadores/índice/firma.

### Tokens exactos

```css
:root {
  --negro:   #0A0A0A;
  --naranja: #F26E25;   /* primario — NUNCA cubre demasiada superficie */
  --rojo:    #E8351E;   /* primitiva: triángulo */
  --azul:    #1A4DDB;   /* primitiva: círculo */
  /* naranja también es la primitiva: cuadrado */

  --bone: #F5F1EA;      /* claro para texto/inversos */
  --font-grotesk: 'Helvetica Neue', Helvetica, Arial, sans-serif;
}
```

### Tipografía

- **Grotesca tipo Helvetica** (Helvetica Neue / Helvetica / Arial fallback).
  La geometría exacta de las tres primitivas se apoya en la métrica de
  Helvetica; no sustituyas por una grotesca de proporciones distintas.
- Titulares apretados, `letter-spacing: -0.02em`, alto contraste de peso
  (regular vs bold), nada de itálicas ni serif.

### Las tres formas primitivas (firma del sistema)

| Forma | Color | Uso |
|---|---|---|
| **△ Triángulo** | rojo #E8351E | bullet de énfasis, alerta |
| **● Círculo** | azul #1A4DDB | bullet neutral, dato |
| **■ Cuadrado** | naranja #F26E25 | bullet primario, acción |

Las tres juntas (`△ ● ■`) funcionan como **separador**, **índice de slides**
(una por sección) y **firma en el footer**. Geometría exacta, tamaños iguales,
alineadas a baseline.

### Reglas de uso (proporciones)

- Base **negra**. El **naranja es acento**, nunca cubre grandes superficies: úsalo
  para 1 palabra clave, una barra, un bullet, no para fondos enteros.
- Rojo y azul se reservan a sus primitivas y a acentos puntuales; no compiten con
  el naranja como color de marca.
- Composición de rejilla estricta, mucho aire negro.

### Do / Don't

- **Do:** las tres primitivas como bullets/índice/firma; naranja quirúrgico;
  Helvetica apretada; rejilla suiza.
- **Don't:** naranja de fondo full-bleed; gradientes; formas redondeadas
  decorativas ajenas a las primitivas; mezclar los 3 colores en una sola cifra.

### Componentes característicos

- **Trío de primitivas** como firma de footer y como índice de sección.
- **Bullet primitivo:** `■` naranja antes de cada ítem de acción.
- **Slide de portada** negra con las tres primitivas grandes + titular Helvetica.

### Patrón base — deck 1600×900 (Chrome headless → PDF)

```html
<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Fantástica · {{cliente}} · {{tema}}</title>
<style>
:root{ /* …pega el bloque :root de Fantástica… */ }
@page { size: 1600px 900px; margin: 0; }
*{box-sizing:border-box}
html,body{margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{ background:var(--negro); color:var(--bone);
  font-family:var(--font-grotesk); font-size:18px; line-height:1.4;
  letter-spacing:-.01em; }
.slide{ width:1600px; height:900px; padding:80px 72px; position:relative;
  display:flex; flex-direction:column; justify-content:center;
  page-break-after:always; break-after:page; }
h1{ font-size:96px; font-weight:700; line-height:.98; letter-spacing:-.03em;
    margin:0 0 24px; }
h1 .acc{ color:var(--naranja); }           /* naranja: 1 palabra, no más */
.primitives{ display:flex; gap:16px; align-items:center; }
.tri{ width:0;height:0; border-left:14px solid transparent;
      border-right:14px solid transparent; border-bottom:24px solid var(--rojo); }
.cir{ width:24px;height:24px; border-radius:50%; background:var(--azul); }
.sqr{ width:24px;height:24px; background:var(--naranja); }
.bullet{ display:flex; align-items:center; gap:12px; margin:8px 0; }
.bullet .sqr{ width:14px; height:14px; }
.footer{ position:absolute; bottom:48px; left:72px;
  display:flex; align-items:center; gap:12px;
  font-size:12px; letter-spacing:.1em; text-transform:uppercase; color:#888; }
.footer .primitives .tri{ border-bottom-width:16px; border-left-width:9px; border-right-width:9px; }
.footer .primitives .cir,.footer .primitives .sqr{ width:16px; height:16px; }
</style></head><body>
  <section class="slide">
    <div class="primitives" style="margin-bottom:32px">
      <span class="tri"></span><span class="cir"></span><span class="sqr"></span>
    </div>
    <h1>Plan de medios <span class="acc">2026</span></h1>
    <div class="bullet"><span class="sqr"></span> Programática incremental +35%</div>
    <div class="footer">
      <span class="primitives"><span class="tri"></span><span class="cir"></span><span class="sqr"></span></span>
      Fantástica × Adglow · Kapital
    </div>
  </section>
</body></html>
```

---

## 4) KAPITAL — monocromo editorial

Sistema **del cliente**, no de la agencia. Es la identidad del *Masterdeck Expats
2026* de Kapital (fintech MX+CO). Se usa cuando el entregable se presenta **como
Kapital**: masterdecks, planes de medios que Kapital lleva a su comité, decks de
producto. Cuando la pieza la firma la agencia, usa **Fantástica** (Kapital es
cliente del partnership Adglow×Fantástica) — no mezcles los dos.

Estética editorial suiza: **monocromo estricto**, titulares en pesos ultraligeros,
mucho aire, reglas finas. El color no decora; solo el rojo aparece, y solo para
alertas críticas.

> Tokens verificados contra `Masterdeck_ Expats 2026.pptx` (49 slides): paleta
> extraída de los `srgbClr` reales, tipografía de las fuentes **embebidas**
> (el `<a:fontScheme>` del tema declara Arial, pero ninguna slide lo usa).

### Tokens exactos

```css
:root {
  /* base — monocromo estricto */
  --k-black:   #000000;  /* portada, separadores de sección, píldoras, fila hero */
  --k-white:   #FFFFFF;  /* fondo de slides de contenido */
  --k-ink:     #141413;  /* texto principal sobre blanco (casi-negro cálido) */
  --k-ink-2:   #3D3D3A;  /* texto secundario */
  --k-ink-3:   #6B7280;  /* labels, versalitas */
  --k-ink-4:   #9E9E9E;  /* micro-texto, pies de fuente */
  --k-rule:    #CCCCCC;  /* reglas finas de header/footer */
  --k-line:    #E0E0E0;  /* bordes de tabla */
  --k-fill:    #EEEEEE;  /* cajas de contenido sobre blanco */
  --k-fill-dk: #1F1F1F;  /* cajas sobre negro */

  /* acento — ÚNICO, y solo para alerta crítica */
  --k-red:     #C00000;
  --k-red-bg:  #FDECEE;

  --k-font: 'Inter Tight', 'Helvetica Neue', Helvetica, Arial, sans-serif;
}
```

### Tipografía

**Inter Tight** en cinco pesos: ExtraLight 200 · Light 300 · Regular 400 ·
Medium 500 · SemiBold 600. Helvetica Neue es el fallback histórico (aparece en
el masterdeck en slides viejas). Cárgala así:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@200;300;400;500;600&display=swap');
```

**Escala** — el masterdeck es 960×540; a **1600×900** el factor es **pt × 2.22**:

| Rol | pt (pptx) | px @1600×900 | Peso |
|---|---|---|---|
| Titular de portada | 40 | **89** | 200 ExtraLight |
| Título de slide | 28 | **62** | 300 Light |
| Lead / subtítulo | 12 | **27** | 400 |
| Cuerpo | 11 | **24** | 400 |
| Secundario / tabla | 9 | **20** | 400 |
| Nota, fuente al pie | 7.5 | **17** | 400 |
| Versalita / label | 7 | **15** | 500, `letter-spacing:.2em`, uppercase |

El error más común es **quedarse corto de escala**: el cuerpo va en ~24px, no en
14px. El masterdeck respira porque el texto es grande y hay poco de él.

### Reglas de uso (proporciones)

- **Blanco por defecto** para slides de contenido; **negro** solo para portada y
  separadores de sección. La alternancia negro/blanco es la que marca el ritmo.
- Titulares en **200/300**. Nunca bold en un `h1`/`h2` — el contraste lo da el
  tamaño, no el peso.
- El **rojo es excepcional**: en 49 slides del masterdeck aparece 2 veces. Si tu
  pieza tiene más de un rojo, algo está mal.
- Mucho aire. Antes de meter una caja más, quita contenido.

### Do / Don't

- **Do:** monocromo; titulares ultraligeros y grandes; píldoras negras como
  etiqueta; reglas finas de 1px; tablas con fila hero en negro; mucho blanco.
- **Don't:** color decorativo; gradientes, sombras o glow; naranja de Fantástica
  ni neón de Adglow; bold en titulares; texto de cuerpo por debajo de 20px.

### Componentes característicos

- **Header:** wordmark `Kapital` a la izquierda + regla fina 1px `--k-rule` que
  corre hasta la derecha + fecha en versalitas (`JULIO 2026`) al extremo.
- **Footer:** regla corta (~170px) abajo a la izquierda + etiqueta en versalitas.
- **Píldora negra:** `border-radius:999px`, fondo negro, texto blanco. Es la
  etiqueta de fila/sección del sistema (`Objetivos de negocio`, `Plan CDMX`…).
- **Fila hero:** en una tabla comparativa, la fila de Kapital va en negro con
  esquinas redondeadas — así se lee de un golpe contra los competidores.
- **Tarjeta de dato:** caja `--k-fill` (o `--k-fill-dk` sobre negro) con label en
  versalitas, cifra grande en peso 200, sub y fuente al pie.

### Patrón base — deck 1600×900 (Chrome headless → PDF)

```html
<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Kapital · {{tema}}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@200;300;400;500;600&display=swap');
:root{ /* …pega el bloque :root de Kapital… */ }
@page { size: 1600px 900px; margin: 0; }
*{box-sizing:border-box}
html,body{margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{ background:var(--k-white); color:var(--k-ink);
  font-family:var(--k-font); font-size:24px; line-height:1.5; }
.slide{ width:1600px; height:900px; padding:64px 88px 56px; position:relative;
  display:flex; flex-direction:column; page-break-after:always; break-after:page; }
.slide.cover{ background:var(--k-black); color:#fff; }

/* header */
.hd{ display:flex; align-items:center; gap:24px; }
.hd .wordmark{ font-size:34px; font-weight:600; letter-spacing:-.02em; }
.hd .rule{ flex:1; height:1px; background:var(--k-rule); }
.hd .date{ font-size:15px; letter-spacing:.2em; text-transform:uppercase; color:var(--k-ink-3); }

/* tipografía */
h1{ font-size:89px; font-weight:200; line-height:1.06; letter-spacing:-.025em; margin:0 0 24px; }
h2{ font-size:62px; font-weight:300; line-height:1.1;  letter-spacing:-.02em;  margin:0 0 16px; }
.lead{ font-size:27px; color:var(--k-ink-2); max-width:1150px; }
.note{ font-size:17px; color:var(--k-ink-4); }

/* componentes */
.pill{ display:inline-block; background:var(--k-black); color:#fff;
  border-radius:999px; padding:10px 26px; font-size:20px; font-weight:500; }
.box{ background:var(--k-fill); border-radius:12px; padding:24px 28px; font-size:20px; }
.box.alert{ background:var(--k-red-bg); color:var(--k-red); }  /* solo alerta crítica */
table{ width:100%; border-collapse:collapse; font-size:20px; }
thead th{ text-align:left; font-size:15px; letter-spacing:.16em; text-transform:uppercase;
  color:var(--k-ink-3); font-weight:500; padding:0 16px 12px; border-bottom:1px solid var(--k-ink); }
tbody td{ padding:14px 16px; border-bottom:1px solid var(--k-line); color:var(--k-ink-2); }
tbody tr.hero td{ background:var(--k-black); color:#fff; border-bottom-color:var(--k-black); }
tbody tr.hero td:first-child{ border-radius:10px 0 0 10px; }
tbody tr.hero td:last-child { border-radius:0 10px 10px 0; }

/* footer */
.ft{ margin-top:auto; }
.ft .rule{ width:170px; height:1px; background:var(--k-rule); margin-bottom:10px; }
.ft span{ font-size:15px; letter-spacing:.2em; text-transform:uppercase; color:var(--k-ink-4); }
</style></head><body>
  <section class="slide cover">
    <div class="hd"><span class="wordmark">Kapital</span><span class="rule"></span>
      <span class="date">Julio 2026</span></div>
    <div style="margin:auto 0">
      <h1>Plan de Medios 2026<br><span style="color:#9E9E9E">El banco que entiende al Expat</span></h1>
    </div>
    <div class="ft"><div class="rule"></div><span>Kapital Expats</span></div>
  </section>
</body></html>
```

---

## Recordatorio de render (las cuatro marcas)

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --no-pdf-header-footer \
  --virtual-time-budget=2500 \
  --print-to-pdf="salida.pdf" \
  "file:///ruta/absoluta/pieza.html"

# Banner de tamaño fijo (PNG) en vez de PDF:
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --hide-scrollbars \
  --window-size=1080,1080 \
  --screenshot="banner.png" \
  "file:///ruta/absoluta/banner.html"
```

`--virtual-time-budget` da tiempo a que carguen las fuentes por `@import`. Si el
render debe ser 100% determinista, embebe las fuentes en base64 dentro del CSS.
