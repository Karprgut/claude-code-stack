---
name: adglow-brand-design
description: >-
  Diseña piezas on-brand para las cuatro marcas que maneja el equipo de Adglow
  (agencia de paid media; partnership Adglow×Fantástica). UNA sola skill que
  cubre CUATRO sistemas visuales — Adglow (dark+neon), Havas (negro/blanco/rojo),
  Fantástica (naranja sobre negro) y Kapital (monocromo editorial, el sistema del
  cliente) — y al invocarla eliges la marca. Úsala cuando pidan "diseña/arma/haz
  una pieza, deck, banner, portada, reporte o entregable on-brand para Adglow /
  Havas / Fantástica / Kapital", "ponlo en la marca de Kapital / WOM / BanCoppel /
  BlackBird", "hazlo en la identidad del masterdeck", "aplica el sistema visual de
  <marca>", "usa los tokens de <marca>", "esto va con la identidad de Havas /
  Fantástica", o cuando haya que producir cualquier salida visual (HTML→PDF, slide,
  banner, one-pager, gráfica de reporte) que deba respetar la identidad exacta de
  una de estas marcas. NO es para redactar el contenido/metodología del entregable
  (eso es adglow-deliverable); esta skill es la capa de MARCA y tokens visuales.
---

# Adglow Brand Design

Skill de **sistema visual** para las cuatro marcas del ecosistema Adglow. La usas
para que cualquier pieza —deck, banner, portada, reporte, one-pager, gráfica—
salga con la identidad exacta de la marca correcta, con tokens que **no se
inventan**: están fijados aquí.

> Esta skill cubre la **capa de marca** (color, tipo, componentes, geometría).
> Si además necesitas la **estructura argumental** del entregable (brief de
> test, plan de medios, hallazgos, status), usa `adglow-deliverable` para el
> contenido y esta skill para vestirlo con la marca correcta.

## Paso 0 — Elige la marca (obligatorio)

Antes de escribir una línea de CSS, decide de qué marca es la pieza. Si el
usuario no lo dice explícito, dedúcelo del cliente y **confírmalo**.

| Marca | Cuándo | Clientes / sub-brands típicos |
|---|---|---|
| **Adglow** | Branding propio de la agencia y sus **sub-brands** | Piezas de Adglow, propuestas de la agencia, Strategy Builder, y sub-brands como **BlackBird Performance Studio** (campaña Remesas de BanCoppel) |
| **Havas** | Entregables y **reportes de la cuenta Havas** | Reporte de margen Inti, dashboards y decks de la relación Adglow×Havas (repo/proyecto aparte: reportshavas.com) |
| **Fantástica** | Clientes del **Grupo Fantástica** (partnership Adglow×Fantástica), cuando la pieza **la firma la agencia** | **Kapital** (fintech MX+CO), **WOM** (telco Colombia), y demás clientes de Fantástica |
| **Kapital** | Sistema **del cliente**. Cuando la pieza se presenta **como Kapital**, no como la agencia | Masterdecks de Kapital, planes de medios que Kapital lleva a su comité, decks de producto |

Regla de oro: **una pieza, una marca.** Nunca mezcles paletas de dos sistemas
en el mismo entregable. Un sub-brand (BlackBird) puede tener su propio acento,
pero hereda la disciplina de Adglow, no la de otra marca.

**Agencia vs. cliente** — es la confusión más cara. Kapital aparece dos veces
arriba a propósito: como *cliente de Fantástica* (la pieza la firma la agencia →
sistema Fantástica) y como *marca propia* (la pieza la firma Kapital → sistema
Kapital). Pregúntate **quién firma la pieza**; eso decide, no de quién habla.

## Ficha rápida de tokens (referencia completa en `references/brand-systems.md`)

### Adglow — dark + neon
```
Fondo:     --ink #0b0b10
Magenta:   #F00A5E   → crítico / CONVERSIÓN / alarma
Cyan:      #00D9FF   → info / AWARENESS / default / links
Verde-lima:#B0DA09   → positivo / ok / TRÁFICO / escalar
Naranja:   #F99400   → warning / atención / tiempo
Tipo:  Space Grotesk (display, HEADINGS EN MAYÚSCULAS) + IBM Plex Mono
       (eyebrows/labels/código, uppercase, letter-spacing 0.25em)
Mnemónica de funnel:  Awareness=cyan · Tráfico=verde · Conversión=magenta
Section-label:  símbolo (⬡ ▣ ◊ ◈ ◐ ◔ ◇ ⌬) + número + tema, subrayado cyan
```

### Havas — negro / blanco / rojo
```
void   #000000     ink  #0A0A0A
bone   #FAFAFA     paper #FFFFFF
ÚNICO acento:  rojo señal #FF0044  (pressed #CC0036)
Tipo:  Bricolage Grotesque (display variable, pesada y cuadrada)
     + General Sans (body) + JetBrains Mono (numérico/códigos/timestamps)
Principio:  la DATA es el héroe; el rojo es la ÚNICA señal, se usa con avaricia
Section-label:  sobre cada H1/H2, SIEMPRE en rojo, con letter-spacing
```

### Fantástica — naranja sobre negro
```
negro   #0A0A0A
naranja #F26E25   → primario (NUNCA cubre demasiada superficie)
rojo    #E8351E
azul    #1A4DDB
Tres formas primitivas:  △ triángulo rojo · ● círculo azul · ■ cuadrado naranja
   → sirven como bullet, separador, índice de slides y firma en footer
Tipo:  grotesca tipo Helvetica (la geometría de las primitivas la renderiza
       Helvetica exacta)
```

### Kapital — monocromo editorial (sistema del CLIENTE)
```
negro   #000000   → portada, separadores de sección, píldoras, fila hero de tabla
blanco  #FFFFFF   → fondo de las slides de contenido
tinta   #141413   → texto principal   ·  #3D3D3A secundario  ·  #6B7280 labels
                    #9E9E9E micro-texto
líneas  #CCCCCC reglas  ·  #E0E0E0 bordes de tabla  ·  #EEEEEE cajas
rojo    #C00000   → ÚNICO acento, y SOLO alerta crítica (2 usos en 49 slides)
Tipo:  Inter Tight — ExtraLight 200 (portada) · Light 300 (títulos) · 400 cuerpo
       · 500 labels · 600 wordmark
Escala @1600×900:  portada 89px/200 · título 62px/300 · lead 27px · cuerpo 24px
       · tabla 20px · nota 17px · versalita 15px (letter-spacing .2em)
Error típico:  quedarse corto de escala. El cuerpo va en ~24px, NO en 14px.
```

## Técnica de producción — HTML → PDF con Chrome headless

Igual que en `adglow-deliverable`: las piezas se autoral en **HTML+CSS vanilla**
(self-contained, sin build step) y se rasterizan a PDF con **Chrome headless**.
Es la ruta robusta y determinista (respeta `@page`, fuentes reales y color).

```bash
# 1) Escribe la pieza como HTML self-contained (fuentes por @import o embebidas)
# 2) Renderiza a PDF a tamaño exacto con Chrome headless:
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu \
  --no-pdf-header-footer \
  --print-to-pdf="salida.pdf" \
  "file:///ruta/absoluta/pieza.html"
```

Reglas de impresión (van en el `<style>` de la pieza):

```css
@page { size: 1600px 900px; margin: 0; }         /* deck 16:9 */
/* one-pager / reporte:  @page { size: A4; margin: 0; }  */

html, body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.slide { page-break-after: always; break-after: page; }
```

- `print-color-adjust: exact` es **obligatorio**: sin él Chrome lava los fondos
  oscuros de Adglow y el rojo de Havas.
- Espera a que carguen las fuentes: si usas `@import` de Google Fonts, dale a
  Chrome `--virtual-time-budget=2000` o embebe las fuentes en base64.
- Para banners de un solo tamaño (ej. 1080×1080, 1200×630) usa
  `--screenshot="banner.png" --window-size=1080,1080` en vez de `--print-to-pdf`.

Los patrones/plantillas HTML+CSS listos para cada marca están en
[references/brand-systems.md](references/brand-systems.md) — **cópialos, no
reconstruyas el CSS desde cero**.

## Flujo de trabajo

```
0. Elige y CONFIRMA la marca
1. Abre references/brand-systems.md → copia los tokens :root y el patrón base
   de esa marca (deck / banner / reporte)
2. Sustituye contenido; respeta las reglas de uso de color y tipo de la marca
3. Renderiza con Chrome headless (PDF o PNG a tamaño exacto)
4. Corre el Checklist de fidelidad de marca (abajo) antes de entregar
5. Devuelve la ruta absoluta del archivo generado
```

**Ubicación de salida:** dentro del repo/carpeta del cliente. Nombra
`{marca}-{tipo}-{tema}-{vN}.{ext}` ej. `havas-reporte-margen-2026-07-v1.pdf`,
`fantastica-deck-kapital-h2-v2.pdf`, `adglow-banner-blackbird-1080-v1.png`.

## Voz y lenguaje

- **Español mexicano**, tú/tuteo ("activamos", "no se toca"). **Nunca** voseo
  argentino, nunca formas ibéricas marcadas.
- El texto de la pieza sigue la marca: Adglow es técnico-neón, Havas es seco y
  data-first, Fantástica es directo y geométrico. El **tono editorial** del
  contenido lo define `adglow-deliverable`; aquí sólo garantizas que la marca
  se vea bien.

## Checklist de fidelidad de marca

Corre esto antes de declarar la pieza lista. Si algo falla, no entregues.

**Universal**
- [ ] Una sola marca en toda la pieza; cero contaminación de paletas.
- [ ] Tokens **exactos** de `references/brand-systems.md` (hex al carácter), sin
      hex inventados ni "aproximados".
- [ ] Fuentes de la marca cargadas y visibles en el PDF (no fallback a system).
- [ ] `print-color-adjust: exact`; fondos y acentos salen sólidos en el PDF.
- [ ] Tamaño de salida exacto (`@page` correcto o `--window-size` correcto).

**Adglow**
- [ ] Fondo `--ink #0b0b10` con grid 48px + scan-line.
- [ ] Headings en Space Grotesk **MAYÚSCULAS**; eyebrows/labels en IBM Plex Mono
      uppercase 0.25em.
- [ ] Color por función correcta: awareness=cyan, tráfico=verde, conversión=
      magenta, warning/tiempo=naranja. Cyan es el default/neutral.
- [ ] Section-labels con símbolo + número + tema, subrayado cyan.
- [ ] Sub-brand (ej. BlackBird) hereda la disciplina Adglow; su acento propio no
      contradice la semántica de color.

**Havas**
- [ ] Solo negro/blanco/gris + **un** rojo `#FF0044` (pressed `#CC0036`). Cero
      otros colores.
- [ ] El rojo aparece con avaricia: es señal, no decoración.
- [ ] Tipografía pesada y cuadrada (Bricolage Grotesque display); números en
      JetBrains Mono; la data manda visualmente.
- [ ] Section-label en rojo con letter-spacing sobre cada H1/H2.

**Fantástica**
- [ ] Naranja `#F26E25` como primario pero **sin cubrir demasiada superficie**;
      la base es negro.
- [ ] Las tres primitivas (△ rojo, ● azul, ■ naranja) presentes como bullet /
      separador / índice / firma en footer, con geometría exacta (Helvetica).
- [ ] Tipografía grotesca tipo Helvetica; nada redondeado ni serif.

## Qué NO hacer

- **No inventes tokens.** Los hex están en `references/brand-systems.md`. Si
  necesitas un tono que no existe, deriva por opacidad del token, no un hex nuevo.
- **No mezcles marcas.** Un reporte Havas no lleva cyan de Adglow; un deck de
  Kapital no lleva magenta de Adglow.
- **No metas frameworks de slides** (Reveal, Marp). HTML+CSS+JS vanilla, como en
  `adglow-deliverable`, para que abra en cualquier browser sin build.
- **No sobre-uses el acento.** En Havas y Fantástica el color es señal escasa;
  saturarlo mata la marca.
- **No traduzcas al inglés** salvo que el cliente sea anglo.

## Memoria del proyecto

El usuario opera Karma Creative Lab; Adglow vive en `~/adglow`.
Para contexto vivo de cada marca/cliente lee los memos en
`~/.claude/projects/-Users-<usuario>-adglow/memory/` — ahí están
Kapital (Fantástica), WOM, BanCoppel/BlackBird, el reporte Havas Inti, etc.
