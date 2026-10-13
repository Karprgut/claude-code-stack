---
name: adglow-banners
description: >-
  Diseña y genera banners para social, ads, web heroes y print en los tres
  sistemas de marca del ecosistema Adglow (agencia de paid media; partnership
  Adglow×Fantástica) — Adglow (dark+neón), Havas (negro/blanco/rojo) y
  Fantástica (naranja sobre negro). Úsala cuando pidan "diseña/arma/haz/genera
  un banner, cover, post, story, display ad, hero o pieza gráfica" para
  Facebook, Instagram, LinkedIn, Google Display, YouTube, web hero o print, en
  marca Adglow / Havas / Fantástica (o clientes como Kapital, WOM, BanCoppel,
  BlackBird). Entrega 2–3 direcciones de arte por brief, en HTML+CSS
  self-contained rasterizadas a PNG con Chrome headless, respetando specs de
  plataforma (safe areas, límites de texto) y los tokens exactos de la marca.
  Para el sistema visual completo se apoya en `adglow-brand-design`. NO es para
  decks/presentaciones (usa `adglow-slides`) ni para el contenido/copy del
  entregable (usa `adglow-deliverable` / `adglow-brand-voice`).
---

# Adglow Banners

Skill para producir **banners on-brand** en cualquiera de las tres marcas del
ecosistema Adglow. Un banner es una pieza gráfica de un solo cuadro (social,
ad, hero web, print) — no un deck ni un documento largo.

> Esta skill combina dos capas:
> - **Marca** (color, tipo, geometría) → viene de `adglow-brand-design`; aquí
>   solo doy el mínimo por marca para no reconstruirlo.
> - **Banner-craft** (specs de plataforma, safe areas, direcciones de arte,
>   pipeline HTML→PNG) → es lo propio de esta skill.

## Paso 0 — Elige y CONFIRMA la marca (obligatorio)

Antes de tocar CSS, decide de qué marca es el banner. Si el usuario no lo dice,
dedúcelo del cliente y confírmalo.

| Marca | Cuándo | Clientes / sub-brands |
|---|---|---|
| **Adglow** | Branding propio de la agencia + sub-brands | Piezas Adglow, Strategy Builder, **BlackBird Performance Studio** (Remesas BanCoppel) |
| **Havas** | Cuenta Havas | Reportes/decks Adglow×Havas, Inti |
| **Fantástica** | Grupo Fantástica (partnership) | **Kapital** (fintech MX+CO), **WOM** (telco Colombia) |

**Regla de oro: una pieza, una marca.** Nunca mezcles paletas de dos sistemas.

## Paso 1 — Toma el brief

Reúne (pregunta lo que falte, no inventes):
1. **Propósito** — social cover, ad de campaña, hero web, o pieza print.
2. **Plataforma / tamaño** — cuál plataforma o dimensiones custom (ver specs abajo).
3. **Contenido** — headline, subtexto, CTA, logo, ¿algún dato/número héroe?
4. **Marca** — Adglow / Havas / Fantástica (confirmada en Paso 0).
5. **Cantidad de direcciones** — default **3** direcciones de arte.

## Specs por plataforma

Diseña siempre al tamaño exacto en px. El **safe area** es la zona central donde
va todo lo crítico (texto, logo, CTA); nunca pongas texto pegado al borde.

| Plataforma | Pieza | Tamaño (px) | Ratio | Safe area / notas |
|---|---|---|---|---|
| **Facebook** | Feed post | 1080 × 1080 | 1:1 | margen ≥64px; CTA abajo |
| Facebook | Cover | 820 × 312 | ~2.6:1 | centro 640×250 (se recorta en móvil) |
| Facebook / Meta | Feed link (OG) | 1200 × 630 | 1.91:1 | logo/marca esquina, headline centrado |
| **Instagram** | Feed post | 1080 × 1080 | 1:1 | margen ≥64px |
| Instagram | Portrait feed | 1080 × 1350 | 4:5 | formato que más pantalla ocupa en feed |
| Instagram | Story / Reel | 1080 × 1920 | 9:16 | **safe: excluye top 250px y bottom 320px** (UI de IG) |
| **LinkedIn** | Feed image | 1200 × 627 | 1.91:1 | headline corto, tono B2B |
| LinkedIn | Cover personal | 1584 × 396 | 4:1 | foto/logo a la derecha, texto izquierda |
| **Google Display** | Med. rectangle | 300 × 250 | 6:5 | 1 mensaje + CTA; texto grande |
| Google Display | Leaderboard | 728 × 90 | 8:1 | horizontal, logo izq · CTA der |
| Google Display | Large rectangle | 336 × 280 | 6:5 | igual que med. rectangle |
| Google Display | Half-page | 300 × 600 | 1:2 | vertical, jerarquía top→bottom |
| Google Display | Mobile banner | 320 × 50 | 6.4:1 | mínimo: logo + 3–5 palabras + CTA |
| **YouTube** | Channel art | 2560 × 1440 | 16:9 | **safe TV: centro 1546×423**; resto se recorta |
| **Web** | Hero | 1920 × 600–1080 | ~16:9/3:1 | texto en tercio izquierdo o centrado |
| **Print** | Genérico | a escala | — | **300 DPI, CMYK, 3–5mm bleed** |

### Límites de texto (legibilidad + reglas de plataforma)
- **Máx 2 tipografías** por banner (las de la marca).
- Headline ≥ ~5% de la altura del canvas; cuerpo ≥ 16px equivalente.
- **1 solo CTA** por banner, con verbo de acción.
- **Ads (Meta/Google): texto < 20% del área.** Meta penaliza banners saturados
  de texto; deja respirar el fondo.
- En formatos chicos (300×250, 320×50) reduce a **1 idea + CTA**. No metas
  párrafos.

## Marca — mínimo por sistema

Los tokens completos, patrones HTML/CSS y reglas de uso viven en
`adglow-brand-design` (`references/brand-systems.md`). **Cópialos de ahí, no
reconstruyas el CSS.** Aquí solo el mínimo para orientar la dirección de arte:

### Adglow — dark + neón
```
Fondo:      --ink #0b0b10  (+ grid 48px + scan-line sutil)
Magenta:    #F00A5E  → crítico / conversión / alarma
Cyan:       #00D9FF  → info / awareness / default / links
Verde-lima: #B0DA09  → positivo / tráfico / escalar
Naranja:    #F99400  → warning / atención / tiempo
Tipo:  Space Grotesk (HEADINGS EN MAYÚSCULAS) + IBM Plex Mono
       (eyebrows/labels, uppercase, letter-spacing 0.25em)
Vibe:  técnico-neón; el acento neón resalta sobre fondo oscuro.
```

### Havas — negro / blanco / rojo
```
void #000000 · ink #0A0A0A · bone #FAFAFA · paper #FFFFFF
ÚNICO acento: rojo señal #FF0044 (pressed #CC0036)
Tipo:  Bricolage Grotesque (display pesada, cuadrada) + General Sans (body)
       + JetBrains Mono (números/timestamps)
Vibe:  la DATA es el héroe; el rojo es la ÚNICA señal, se usa con avaricia.
       Banner casi todo B/N con un solo golpe de rojo.
```

### Fantástica — naranja sobre negro
```
negro #0A0A0A · naranja #F26E25 (primario, NO cubre demasiada superficie)
rojo #E8351E · azul #1A4DDB
Primitivas: △ triángulo rojo · ● círculo azul · ■ cuadrado naranja
   → bullet / separador / índice / firma de footer
Tipo:  grotesca tipo Helvetica (geometría exacta; nada redondeado ni serif)
Vibe:  directo y geométrico; el color es señal escasa.
```

## Paso 2 — Genera 2–3 direcciones de arte por brief

Toma el mismo brief y resuélvelo con **2 o 3 rutas visuales distintas dentro de
la marca elegida** (no cambies de marca entre direcciones). Ejemplos de ejes
para diferenciarlas, respetando siempre el sistema:

- **Adglow:** (a) tipografía gigante como héroe sobre grid neón · (b) dato/KPI
  héroe con acento por función · (c) composición geométrica con líneas/scan-line.
- **Havas:** (a) número/dato gigante en rojo sobre B/N · (b) editorial de puro
  tipo cuadrado, rojo mínimo · (c) bloque de color sólido con recorte de tipo.
- **Fantástica:** (a) primitivas como elemento gráfico central · (b) headline
  grotesco sobre naranja/negro con firma de primitivas · (c) composición
  modular tipo grid con las tres formas.

Cada dirección: nombre corto, mismo tamaño exacto, misma marca, mismo mensaje.

## Paso 3 — HTML+CSS → PNG con Chrome headless

Autora cada banner como **HTML self-contained** (fuentes por `@import` o
embebidas en base64) y rasterízalo a PNG al tamaño exacto:

```css
/* en el <style> del banner */
html, body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.banner { width: 1080px; height: 1080px; overflow: hidden; }
```

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu \
  --hide-scrollbars \
  --force-device-scale-factor=2 \
  --virtual-time-budget=2000 \
  --window-size=1080,1080 \
  --screenshot="fantastica-banner-kapital-1080-v1.png" \
  "file:///ruta/absoluta/banner.html"
```

- `print-color-adjust: exact` es **obligatorio**: sin él Chrome lava el fondo
  oscuro de Adglow/Fantástica y el rojo de Havas.
- `--window-size` = dimensiones exactas de la plataforma.
- `--force-device-scale-factor=2` para retina/print; para print exporta a 300 DPI.
- `--virtual-time-budget=2000` da tiempo a que carguen las Google Fonts (o
  embébelas en base64 para determinismo).
- Genera un HTML por dirección; nómbralos y rasterízalos uno por uno.

## Paso 4 — Checklist de calidad (antes de entregar)

**Craft del banner (universal)**
- [ ] Salida al **tamaño exacto** de la plataforma (px correctos).
- [ ] Contenido crítico dentro del **safe area**; nada pegado al borde ni en zona
      recortada (stories, YouTube TV-safe, FB cover móvil).
- [ ] **Contraste ≥ 4.5:1** texto vs fondo; legible en móvil a tamaño real.
- [ ] **Jerarquía clara**: 1 headline héroe → subtexto → CTA. Se lee en 1–2 seg.
- [ ] **1 solo CTA** con verbo de acción, visible y con área suficiente.
- [ ] Máx 2 tipografías (las de la marca). En ads, texto **< 20%** del área.
- [ ] Sin viudas/huérfanas feas; el texto no se corta ni se sale del cuadro.

**Fidelidad de marca** (detalle en `adglow-brand-design`)
- [ ] **Una sola marca**, cero contaminación de paletas entre direcciones.
- [ ] **Tokens exactos** (hex al carácter); nada "aproximado".
- [ ] Fuentes de la marca cargadas y visibles en el PNG (no fallback a system).
- [ ] **Adglow:** fondo `#0b0b10` + grid/scan-line; color por función
      (awareness=cyan, tráfico=verde, conversión=magenta, tiempo=naranja).
- [ ] **Havas:** solo B/N + un rojo `#FF0044` usado con avaricia; la data manda.
- [ ] **Fantástica:** naranja sin cubrir demasiada superficie; primitivas
      (△●■) con geometría Helvetica exacta.

## Flujo de trabajo (resumen)

```
0. Elige y confirma la marca
1. Toma el brief (propósito, plataforma/tamaño, contenido, cantidad)
2. Genera 2–3 direcciones de arte dentro de esa marca
3. Autora cada una en HTML self-contained → PNG con Chrome headless
4. Corre el checklist de calidad
5. Presenta las direcciones lado a lado + devuelve rutas absolutas de los PNG
```

**Ubicación / nombre de salida:** en la carpeta del cliente. Nombra
`{marca}-banner-{tema}-{ancho}x{alto}-v{N}.png`, ej.
`adglow-banner-blackbird-1080x1080-v1.png`,
`havas-banner-inti-1200x630-v1.png`,
`fantastica-banner-kapital-1080x1920-v1.png`.

## Qué NO hacer

- **No inventes tokens ni tamaños.** Hex en `adglow-brand-design`; tamaños en la
  tabla de specs. Si necesitas un tono, derívalo por opacidad, no un hex nuevo.
- **No mezcles marcas** entre direcciones de un mismo brief.
- **No satures de texto** los ads (< 20%) ni metas párrafos en formatos chicos.
- **No uses esta skill para decks** (eso es `adglow-slides`) ni para el copy de
  la pieza (eso es `adglow-brand-voice` / `adglow-deliverable`).
- **No traduzcas al inglés** salvo que el cliente sea anglo. Default español mexicano.

## Voz y lenguaje

Español mexicano, tú/tuteo ("activamos", "no se toca"). Nunca voseo argentino ni
formas ibéricas. El copy de la pieza sigue la voz de la marca; esta skill
garantiza que el banner se **vea** on-brand.

## Memoria del proyecto

Adglow vive en `~/adglow`. Contexto vivo de cada marca/cliente en
`~/.claude/projects/-Users-<usuario>-adglow/memory/` (Kapital,
WOM, BanCoppel/BlackBird, Havas Inti).
