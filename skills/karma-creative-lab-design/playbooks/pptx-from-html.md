# Playbook · PPTX editable desde un deck HTML

**Cuándo usar este playbook**
Cuando hay que entregar un deck en PowerPoint editable a un cliente o equipo externo (Holanda, Brevo, retailers, etc.) y ya existe — o queremos construir primero — la versión HTML del deck.

**Lo que produce**
Un archivo `.pptx` con:
- Texto seleccionable y editable en PowerPoint / Keynote / Google Slides
- Tablas nativas (filas y celdas se pueden añadir/editar)
- Gráficos nativos (clic derecho → "Editar datos")
- Formas vectoriales (rectángulos, círculos, líneas, etc.)
- Fuente declarada (Poppins, Inter, lo que use la marca)
- Imágenes embebidas (logos, fotos)

**Lo que NO produce**
Pixel-perfect fidelity. PPTX no tiene CSS — sombras suaves, gradientes complejos, `box-shadow` y algunos detalles tipográficos se aproximan, no replican.

---

## 1. La arquitectura (por qué funciona)

Tres piezas trabajando juntas:

```
┌─────────────────────────────┐    ┌─────────────────────────────┐    ┌──────────┐
│ Deck HTML                   │    │ Renderer DOM→PptxGenJS      │    │ PPTX     │
│ - secciones .slide          │ →  │ - lee el DOM                │ →  │ nativo   │
│ - clases consistentes       │    │ - despacha por clase        │    │ editable │
│ - tamaño fijo 1920×1080     │    │ - emite shapes/text/tables  │    │          │
└─────────────────────────────┘    └─────────────────────────────┘    └──────────┘
```

**Por qué este enfoque > las alternativas:**

| Enfoque | Editable | Fidelidad | Esfuerzo | Cuándo |
|---|---|---|---|---|
| **Imagen por slide** (html-to-image + PPT) | ❌ solo a nivel slide | ✅ 100% | Bajo | Solo si el destinatario no edita |
| **DOM→native** (este playbook) | ✅ texto, tablas, charts | ⚠️ aprox 85% | Medio | Cuando edita el destinatario |
| **Reescribir slide por slide** en PptxGenJS sin HTML | ✅ total control | ⚠️ aprox 70% | Muy alto | Decks pequeños sin HTML previo |
| **Export desde PowerPoint nativo a mano** | ✅ | ✅ | Muy alto | Cuando no tienes HTML fuente |

DOM→native es el sweet spot: el HTML lo construimos para revisar/presentar online, el renderer lo convierte para distribuir.

---

## 2. La regla de oro: clases CSS consistentes por layout

El renderer **no parsea contenido libre**. Identifica el layout por las clases CSS de cada slide y aplica el renderer correspondiente.

Para que esto funcione, cada layout del deck HTML debe tener una clase identificable. Las que usamos en el Kabrita seo-deck:

| Clase contenedora | Layout | Renderer |
|---|---|---|
| `.title-main` | Título de cover | `rTitle` |
| `.sec-title` | Section divider | `rSection` |
| `.two-col` | 2 columnas Sí/No | `rTwoCol` |
| `.findings` (3 cards) | 3 hallazgos en fila | `rFindings(3)` |
| `.findings.four` (4 cards) | 4 hallazgos en fila | `rFindings(4)` |
| `.kpis` (4 tiles) | 4 KPIs grandes | `rKpis(4)` |
| `.kpis-5` (5 tiles) | 5 KPIs comprimidos | `rKpis(5)` |
| `.chart-frame .bar` | Bar chart vertical | `rBarChart` (native) |
| `.ct-frame .ct-table` | Tabla comparativa | `rTable` (native) |
| `.dodont` | Do / Don't | `rDoDont` |
| `.opp-grid .opp-card` | Cards de oportunidad | `rOppGrid` |
| `.copy-grid .copy-card` | Snippets copy-paste | `rCopyGrid` |
| `.tickets .ticket` | Tickets de jira | `rTickets` |
| `.code-frame pre` | Bloque de código | `rCodeFrame` |
| `.calendar-grid .week-card` | Calendario semanal | `rCalendar` |
| `.article-detail-grid` | Briefs detallados | `rArticleDetails` |
| `.action-row .action-card` | 3 acciones priorizadas | `rActionRow` |
| `.close-main` | Cierre de deck | `rClosing` |

**Cuando agregues un layout nuevo al HTML:**
1. Dale una clase contenedora distinta y descriptiva
2. Mantén la estructura interna consistente (`.eyebrow`, `.title`, `.body`, etc.)
3. Escribe un renderer nuevo y añádelo al dispatcher

---

## 3. El sistema de coordenadas

PptxGenJS trabaja en **pulgadas**, no en píxeles. Para diseñar en HTML a 1920×1080 y luego portar a PPTX `LAYOUT_WIDE` (13.333 × 7.5 in):

```js
const CW = 13.333, CH = 7.5;
const px = n => +(n * CW / 1920).toFixed(3);   // px de diseño → pulgadas (eje X)
const py = n => +(n * CH / 1080).toFixed(3);   // px de diseño → pulgadas (eje Y)
```

Uso:
```js
slide.addText('Hola', {
  x: px(120), y: py(160),   // posición en el deck HTML, traducida a inches
  w: px(800), h: py(60),
  fontSize: 28              // pt directo (PPTX usa pt nativo)
});
```

**Conversión de tipografía:**
- En el HTML, fuentes en `px`
- En PPTX, fuentes en `pt`
- Conversión aproximada en este sistema: `pt = px * 0.5`
- 56px → 28pt, 32px → 16pt, 14px → 7pt

**Mínimo legible:** no bajar de 7pt para body text en PPTX. Si una micro-copy en HTML es 11px, en PPTX usar 7-8pt.

---

## 4. La API esencial de PptxGenJS

### Estructura básica

```js
const pres = new PptxGenJS();
pres.layout = 'LAYOUT_WIDE';      // 13.333 x 7.5 in (16:9)
pres.title = 'Deck Title';
pres.author = 'Karma Creative Lab';

const slide = pres.addSlide();
slide.background = { fill: 'F4F5F7' };  // ← usar fill:, no color:
// ... añadir contenido
slide.addNotes('Speaker notes aquí');

await pres.writeFile({ fileName: 'mi-deck.pptx' });
```

### Texto

```js
slide.addText('Hola mundo', {
  x: 1, y: 1, w: 8, h: 0.6,
  fontFace: 'Poppins',         // ← OJO: si la fuente no está en la máquina del receptor, fallback
  fontSize: 18,                // pt
  bold: true,
  italic: false,
  color: '0C2B66',             // hex SIN '#'
  align: 'left',               // 'left' | 'center' | 'right' | 'justify'
  valign: 'top',               // 'top' | 'middle' | 'bottom'
  charSpacing: 4,              // letter-spacing equiv (en centi-em)
});
```

### Shapes

```js
// Rectángulo
slide.addShape('rect', {
  x: 1, y: 1, w: 4, h: 2,
  fill: { color: 'FFFFFF' },
  line: { color: '0C2B66', width: 2 }   // borde opcional
});

// Rectángulo redondeado
slide.addShape('roundRect', {
  x: 1, y: 1, w: 4, h: 2,
  fill: { color: 'AE8DF5' },
  line: { color: 'AE8DF5', width: 0 },
  rectRadius: 0.2   // pulgadas
});

// Elipse / círculo
slide.addShape('ellipse', {
  x: 1, y: 1, w: 0.2, h: 0.2,
  fill: { color: 'FF0033' },
  line: { color: 'FF0033', width: 0 }
});
```

⚠️ **Anti-patrón:** `addShape('line', { h: 0 })` falla en algunas versiones.
**Patrón correcto:** usa un `rect` muy delgado:

```js
function hline(slide, x, y, w, color = 'E5E7ED') {
  slide.addShape('rect', {
    x, y, w, h: 0.012,                    // 0.012" ≈ 1px en pantalla
    fill: { color }, line: { color, width: 0 }
  });
}
```

### Tabla nativa

```js
const headers = [
  { text: 'Col 1', options: { bold: true, color: '6B7494', fill: { color: 'F4F5F7' }, fontSize: 9 } },
  { text: 'Col 2', options: { bold: true, color: '6B7494', fill: { color: 'F4F5F7' }, fontSize: 9 } }
];
const rows = [
  ['Celda A1', 'Celda A2'],
  ['Celda B1', 'Celda B2'],
  [{ text: 'Con formato', options: { bold: true, color: '0C2B66' } }, 'Texto normal']
];
slide.addTable([headers, ...rows], {
  x: 0.5, y: 1.5, w: 12,
  border: { type: 'solid', color: 'E5E7ED', pt: 0.5 },
  fontFace: 'Poppins', fontSize: 10,
  autoPage: false
});
```

Resultado: tabla editable en PowerPoint. Filas y celdas se pueden añadir/quitar/modificar.

### Gráfico nativo

```js
slide.addChart('bar', [{                  // ← string 'bar', NO PG.ChartType.bar
  name: 'Revenue',
  labels: ['Ene', 'Feb', 'Mar'],
  values: [352983, 319264, 468679]
}], {
  x: 1, y: 1.5, w: 11, h: 5,
  barDir: 'col',                          // 'col' vertical | 'bar' horizontal
  chartColors: ['4A7FF7', 'AE8DF5', 'F79646'],
  catAxisLabelFontFace: 'Poppins', catAxisLabelFontSize: 9,
  valAxisLabelFontFace: 'Poppins', valAxisLabelFontSize: 9,
  showValue: true,
  dataLabelFontFace: 'Poppins', dataLabelFontSize: 10, dataLabelFontBold: true,
  showLegend: false,
  barGapWidthPct: 60
});
```

El gráfico es editable: clic derecho → "Edit data" abre Excel/Numbers con los valores.

### Imagen embebida

```js
// Por path (solo funciona si PptxGenJS puede hacer fetch — falla en file://)
slide.addImage({ path: 'assets/logo.png', x: 0.5, y: 0.5, w: 1.5, h: 0.5 });

// Por data URL (✅ recomendado, funciona en file://)
slide.addImage({ data: 'data:image/png;base64,iVBORw...', x: 0.5, y: 0.5, w: 1.5, h: 0.5 });
```

---

## 5. Los 8 anti-patrones que rompen el export

Aprendidos a sangre y fuego en el deck de Kabrita:

| # | Anti-patrón | Síntoma | Fix |
|---|---|---|---|
| 1 | `addImage({ path: 'assets/x.png' })` cuando abres con `file://` | TypeError: Failed to fetch | Pre-carga como data URL con `FileReader.readAsDataURL` |
| 2 | `slide.background = { color: 'FFF' }` | Background no aplica en algunas versiones | Usar `{ fill: 'FFF' }` |
| 3 | `addShape('line', { h: 0 })` | El render falla silenciosamente | Usar `rect` con `h: 0.012` (helper `hline`) |
| 4 | `addChart(PG.ChartType.bar, ...)` | TypeError: cannot read 'bar' of undefined | Usar string `'bar'` directo |
| 5 | `line: { type: 'none' }` | Propiedad no reconocida | Usar `line: { width: 0 }` |
| 6 | `lineSpacingMultiple: 1.4` en `addText` | Ignorado / error en algunas versiones | Omitir; usar saltos de línea explícitos |
| 7 | `color: '#FF0033'` con `#` | Color se ignora, queda negro | hex SIN `#`: `'FF0033'` |
| 8 | Bajar a `fontSize: 5-6` | Texto ilegible en proyección | Mínimo 7pt para body, 9-10pt ideal |

**Defensa universal:** envolver cada renderer en `try/catch` y mostrar el slide específico que falló:

```js
for (let i = 0; i < slides.length; i++) {
  const s = pres.addSlide();
  try {
    renderSlide(s, slides[i]);
  } catch (err) {
    console.error('Slide', i+1, 'failed:', err);
    s.addText(`Error renderizando slide ${i+1}\n${err.message}`, {
      x: 1, y: 3, w: 11, h: 1, color: 'CC0000', align: 'center'
    });
    // El export continúa; el slide roto queda con un placeholder visible
  }
}
```

---

## 6. La estructura mental del renderer

Cinco helpers + un dispatcher + un renderer por layout:

```js
// === Setup ===
const CW = 13.333, CH = 7.5;
const px = n => n * CW / 1920;
const py = n => n * CH / 1080;
const C = { /* paleta de marca, hex sin # */ };

// === Helpers comunes ===
function chrome(slide, root) { /* eyebrow + logo + page num + footer */ }
function contentHeader(slide, root) { /* eyebrow + title + sub */ }
function hline(slide, x, y, w, color) { /* línea horizontal */ }
function insightBox(slide, root) { /* callout de cierre con fondo lavanda */ }

// === Logo precargado ===
let LOGO_DATA = null;
async function preloadLogo() {
  const res = await fetch('assets/logo.png');
  const blob = await res.blob();
  LOGO_DATA = await new Promise(r => {
    const fr = new FileReader();
    fr.onload = () => r(fr.result);
    fr.readAsDataURL(blob);
  });
}

// === Renderers por layout ===
function rTitle(slide, root) { ... }
function rSection(slide, root) { ... }
function rFindings(slide, root, cols) { ... }
function rKpis(slide, root, cols) { ... }
function rBarChart(slide, root) { ... }
function rTable(slide, root) { ... }
// ... uno por cada layout

// === Dispatcher (orden de prioridad importa) ===
function renderSlide(s, root) {
  if (root.querySelector('.title-main')) return rTitle(s, root);
  if (root.querySelector('.close-main')) return rClosing(s, root);
  if (root.querySelector('.sec-title')) return rSection(s, root);
  if (root.querySelector('.kpis-5')) return rKpis(s, root, 5);
  if (root.querySelector('.kpis')) return rKpis(s, root, 4);
  if (root.querySelector('.findings.four')) return rFindings(s, root, 4);
  if (root.querySelector('.findings')) return rFindings(s, root, 3);
  // ... más layouts
  rGeneric(s, root);   // fallback con texto de error
}

// === Main ===
async function exportPptx() {
  await loadScript('https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js');
  await preloadLogo();
  await document.fonts.ready;

  const slides = [...document.querySelectorAll('deck-stage > section.slide')];
  const pres = new (window.PptxGenJS || window.pptxgen)();
  pres.layout = 'LAYOUT_WIDE';

  for (const root of slides) {
    const s = pres.addSlide();
    try { renderSlide(s, root); } catch (err) { /* placeholder */ }
    s.addNotes(root.getAttribute('data-screen-label'));
  }

  await pres.writeFile({ fileName: 'export.pptx' });
}
```

---

## 7. Cómo aplicar este playbook a un proyecto nuevo

### Paso 1: Diseña el HTML primero
Decide los layouts que necesitas y dale a cada uno una clase única. **No mezcles dos layouts dentro de un slide** — si necesitas algo híbrido, crea un layout nuevo con su propia clase.

### Paso 2: Copia el template
Toma `pptx-export-template.js` (en este mismo directorio) como punto de partida. Ya trae:
- Helpers `chrome`, `contentHeader`, `hline`, `insightBox`
- Loader del CDN
- Preload de logo
- Dispatcher vacío
- Manejo de errores

### Paso 3: Escribe un renderer por layout
Para cada layout nuevo, escribe una función `r[NombreLayout]` que:
1. Lea los textos con `txt(root.querySelector('.subselector'))`
2. Calcule posiciones desde la grilla (1920×1080 → `px(...)`, `py(...)`)
3. Emita `slide.addShape(...)` para cards/badges/divisores
4. Emita `slide.addText(...)` para títulos/body
5. Use `slide.addTable(...)` si hay datos tabulares
6. Use `slide.addChart(...)` si hay datos cuantitativos

### Paso 4: Conecta al dispatcher
Añade el detector en `renderSlide()` siguiendo el orden de prioridad correcto (más específico primero — `.findings.four` antes que `.findings`).

### Paso 5: Prueba slide por slide
Empieza con 2-3 slides representativos. Exporta, abre en PowerPoint, verifica que el texto es editable y que el layout se mantiene. Itera. Luego escala al resto.

### Paso 6: Botón de descarga
Coloca un botón flotante en la esquina del deck HTML. Usa el patrón del `index.html` de Kabrita SEO-2026:
- Botón fijo abajo-derecha
- Overlay con barra de progreso
- Loading lazy del CDN (no impacta el load inicial del deck)

---

## 8. Referencia rápida de la paleta

Cuando uses el design system de Kabrita:
```js
const C = {
  navy: '0C2B66', navy90: '1B3A75', navyWash: 'ECEEFF',
  lavender: 'AE8DF5', lavender100: 'E3E3FF',
  blue: '4A7FF7', blue200: 'C2DCFF',
  orange: 'F79646', orange300: 'FCD9B0',
  tealBright: '00C4CC',
  green: '4FB849', yellowGreen: 'C9E265',
  red: 'E1261C',
  bg: 'F4F5F7', surface: 'FFFFFF', line: 'E5E7ED',
  ink: '0C2B66', ink2: '2D3A5C', ink3: '6B7494', ink4: '9AA0B5'
};
```

Cuando uses Karma Creative Lab brutalist:
```js
const C = {
  black: '0A0A0A', white: 'FAFAFA', cream: 'F5F0EB',
  red: 'FF0033', green: '00FF41',
  gray100: 'E5E5E5', gray500: '666666', gray800: '2A2A2A'
};
```

---

## 9. Archivos de referencia

- **Caso de uso completo:** `propuestas/Kabrita/SEO-2026/pptx-export.js` (44 slides, 17 layouts, ~1000 líneas)
- **Template starter:** `Karma Creative Lab Design System/playbooks/pptx-export-template.js`
- **PptxGenJS docs:** https://gitbrent.github.io/PptxGenJS/docs/api-presentation.html
- **PptxGenJS bundle CDN:** `https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js`

---

## 10. Cuándo NO usar este playbook

- **Decks muy cortos (1-3 slides)** → más rápido escribir PPT a mano
- **Decks pesados en charts complejos** (combo chart, scatter con múltiples series, mapas) → PptxGenJS los soporta pero la API es verbose, valorar si rinde
- **Cliente pidió específicamente que sea "no editable"** (raro pero pasa) → usar el modo image-based
- **Output objetivo es PDF, no PPTX** → exportar HTML a PDF con `@media print` y `window.print()` es más simple y fiel

---

*Karma Creative Lab · Playbook v1 · 2026-05-11*
