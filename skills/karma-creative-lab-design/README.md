# Karma Creative Lab — Design System

**Karma Creative Lab** is a strategic laboratory — a studio for brand systems, audience strategy, content, artistic production, training, and AI integration. The product surface is a single **marketing / editorial website** (built in Next.js + Sanity, with a migration to Shopify for commerce). Content is in **Spanish**.

> "Estructuras que piensan."  
> "El ruido también es lenguaje."  
> "Tu marca es un circuito, no una promesa."

The visual language is **brutalist with glitch accents**: thick 4px black borders, hard offset shadows (never blurred), Space Grotesk display in uppercase, B&W imagery, and two electric accents — **neon green (#00FF41)** for positive / primary actions and **fluorescent red (#FF0033)** for alerts, glitch, and critical accents.

---

## Sources

All context was extracted from the local codebase attached at  
`Karma Creative Lab/karmacreativelab/` (Next.js 15 + Tailwind + Sanity; includes a parallel `shopify-theme/` port).

Key reference files inside the codebase:
- `BRANDBOOK-FINAL.md` — the canonical brandbook (visual system, voice, motifs).
- `app/globals.css`, `assets/theme.css`, `tailwind.config.ts` — CSS/design tokens.
- `app/page.tsx`, `components/HeroBanner.tsx`, `components/ServiceSection.tsx` — Next.js component patterns.
- `shopify-theme/sections/{manifesto,pilares,que-es-karma,animated-banner,gallery,contact}.liquid` — editorial section templates and default copy.
- `public/Elements/` — all visual assets (logos, service cards, symbol pack, glitch GIFs, background patterns).
- `public/copys.pdf` — marketing copy (not parsed; binary reference only).

GitHub mirror: `Karprgut/karmacreativelab` (default branch `main`).

No Figma was provided.

---

## Index

| File | Purpose |
|---|---|
| `README.md` | This manifest. Context, voice, visual foundations, iconography. |
| `SKILL.md` | Agent skill entry — load before designing for Karma. |
| `colors_and_type.css` | CSS custom properties: colors, type, spacing, shadows, motion. |
| `assets/logos/` | `karma-logo.png` (black), `karma-logo-blanco.png` (white, with drop-shadow), `titulo.png`. |
| `assets/bg/` | Background textures, `glitch.gif`, `render4.gif`, `render6.gif`, `separador.webp`, `Background.svg`. |
| `assets/icons/` | The three process icons: `observar.svg`, `interpretar.svg`, `trazar.svg`. |
| `assets/services/` | The six service category images: ai, artistico, capacitacion, contenido, estrategia, producto. |
| `assets/symbols/` | The 9-piece brutalist symbol pack (`simbolo-1…9.webp`). |
| `assets/recursos/` | Generic brutalist graphic resources (Recurso 2…18). |
| `preview/` | Small HTML cards that populate the Design System tab. |
| `ui_kits/website/` | React (JSX) UI kit for the marketing site with a click-thru demo. |

---

## CONTENT FUNDAMENTALS

**Language:** Spanish (Mexico). Never translate unless a project is explicitly English.

**Voice:** Abstract, sober, unadorned. Philosophical without being pretentious. Technical without being cold. Poetic without being cheesy. A language that does not need to emphasize — it just exists.

**Tone:** Specular, laboratory-like. Observes, interprets, maps. Never sells, never promises.

**Person:** Mostly first-person plural (**"nosotros"** / "observamos", "trazamos", "actuamos como científicos creativos"). Addresses the reader sparingly and directly — no "tú" pandering, no "¡descubre!" calls-to-action. When an imperative is used, it's short and declarative: `EXPLORAR SISTEMA`, `DESCUBRE MÁS`, `VER MÁS`.

**Casing:** Headlines, buttons, nav, labels — **ALL CAPS**, always. Body copy: sentence case. Mono/technical labels: uppercase with tracked letter-spacing.

**Emoji:** **No.** Never in final copy. The Brandbook uses unicode typographic marks (✦, ★, ◆, ⬢, ◉, ∞, ∿, →) as *decoration*, not punctuation.

**Punctuation quirks:** Short declarative sentences, often two per line. Periods where commas would usually go — for rhythm. Uses the `→` arrow, `·` middle dot and `★` as separators. ASCII blocks and `──` dividers show up in presentations.

**Examples (use these as templates):**

✓ "Observamos sistemas. Trazamos rutas."  
✓ "El error es parte del código."  
✓ "Imperfección intencional."  
✓ "Karma Creative Lab es un laboratorio de estrategia y creatividad."  
✓ "Actuamos como científicos creativos. Experimentamos, medimos y ajustamos hasta encontrar la estructura exacta."  
✓ "No diseñamos para gustar. Diseñamos para funcionar."  
✓ "LABORATORIO ESTRATÉGICO" (as a section header, caps)

✗ "¡Somos la mejor agencia creativa!"  
✗ "Soluciones integrales para tu marca."  
✗ "Llevamos tu negocio al siguiente nivel."  
✗ Anything with 🚀, 💡, ✨ or similar.

**Nuclear phrases** (reusable one-liners — deploy as posters, hero subtitles, slide-endings):
- *Estructuras que piensan.*
- *Sistema que muta.*
- *Procesar es crear.*
- *Tu marca es un circuito, no una promesa.*
- *Arquitectura visual para ideas vivas.*
- *El ruido también es lenguaje.*

---

## VISUAL FOUNDATIONS

### Color
Two-tone core (**#0A0A0A + #FAFAFA**) with a single warm-neutral rest surface (**#F5F0EB cream**) and two electric accents (**#00FF41 green**, **#FF0033 red**). The greyscale ramp (`--karma-gray-100…900`) is for borders, dividers and disabled states — never for soft backgrounds. **No gradients, no tints, no blended fills.**

- **Green (#00FF41)** — primary CTAs, positive accents, the sticky menu button, CTA backgrounds. This is the "Karma" accent.
- **Red (#FF0033)** — alert, glitch, section dividers, number badges. Used sparingly.
- **Cream (#F5F0EB)** — alternate section backgrounds for breathing room, blog reading surfaces.

### Type
- **Space Grotesk 700 / Black 900** — all headlines, section titles, button text. Uppercase. Tight tracking (-0.02 to -0.05em). Line-height 0.9–1.1.
- **Inter 400 / 500 / 700** — body, paragraphs, UI, forms.
- **Courier Prime (fallback Courier New)** — timestamps, captions, meta labels, codes, barcode IDs.
- **Serif logo** — the wordmark "karma" is a custom brutalist serif (PNG asset). Do not recreate; use the PNG.

See `colors_and_type.css` for the full scale.

### Spacing
8-pt scale with aggressive jumps for hero space: `4, 8, 16, 24, 32, 48, 64, 96, 128px`. Prefer **negative space over decoration**. Hero blocks frequently use 96–128px padding.

### Backgrounds
- Dominant mode: solid **#FAFAFA** or solid **#0A0A0A**. Large areas of flat color are the default.
- Alt surface: **#F5F0EB cream** for editorial reading.
- Textures: subtle **SVG noise/grain** overlaid at ~5% opacity (see `.grain-bg` utility in `colors_and_type.css` companion stylesheet).
- Full-bleed B&W pattern assets (`assets/services/*.webp`) — concentric circles, halftones, distorted dots — used as card imagery or large section dividers.
- Motion: `assets/bg/glitch.gif`, `render4.gif`, `render6.gif` — placed behind or beside content for low-key kinetic energy. Animation does not play over copy, only beside or behind glass-like frames.

### Animation / Motion
- **Easing:** Fast, snappy — `cubic-bezier(0.2, 0.8, 0.2, 1)` or linear for ticker/marquee.
- **Duration:** 0.15–0.3s for interactive state changes. Never >0.4s.
- No bouncy/spring curves. No long crossfades. Scroll animations are minimal; when present, they snap.
- A horizontal **marquee / ticker** of phrases across a black band is a recurring device (20s linear loop, never pauses).

### Hover states
The canonical hover: **the shadow collapses.** Default element sits with `translate(0,0)` + `shadow-brutal (8px 8px)`. On hover: `translate(4px, 4px)` + `shadow-brutal-sm (4px 4px)`. It mimics a physical button press. Sometimes the fill inverts (black↔white or black↔green).

### Press states
Full collapse: `translate(8px, 8px)` + no shadow. Or color invert. Never opacity.

### Borders
- Standard: **4px solid #0A0A0A**. This is the baseline for cards, inputs, menus, images.
- Subtle: 2px (used inside card internals).
- Statement: 8px (used for hero frames, manifesto quotes).
- Always solid, never dashed, never dotted, never blurred.

### Shadows
**Brutal offset shadows only.** `8px 8px 0 0 #0A0A0A` (standard), `12px 12px 0 0 #0A0A0A` (statement), `4px 4px 0 0` (after hover collapse). Accent variants: `… 0 0 #FF0033` (red) or `… 0 0 #00FF41` (green) for high-energy surfaces. **Never use a blurred/diffuse shadow anywhere.**

### Cards
Shape: square or tall rectangle, zero (or 2–4px max) corner radius, 4px black border, 8×8 brutal shadow, white or cream fill. Hover inverts to black + white text with either red or green shadow. Number badges (01, 02…) sit rotated 12° in a corner with red fill and their own shadow.

### Transparency / blur
**Avoid blur entirely.** A tiny exception: the half-opacity overlay on the hero logo box (`rgba(0,0,0,0.5)` flat layer behind the logo, no blur) to dim a background GIF. No `backdrop-filter`, no glassmorphism.

### Corner radii
- Default: `0px`.
- `2px` allowed for input internals.
- `4px` is the absolute max — use sparingly. Pill shapes, rounded buttons, circular badges are all **forbidden**.

### Imagery
- **Grayscale by default.** Color reveal on hover (`filter: grayscale(1) contrast(1.2)` → `filter: none`).
- All images sit inside a 4px black frame.
- Mood: cool, industrial, B&W with grain. Never warm stock photography. Never soft-focus.
- Prefer generative / abstract / pattern imagery over literal photography. The provided asset pack is almost entirely abstract.

### Layout rules
- Modular grid, visible seams. Borders between grid cells are part of the design.
- Asymmetry is encouraged. Avoid perfectly-centered hero layouts.
- A recurring hero structure: **2-column × 3-row grid** with 6 bordered cells (title / logo / CTA / sistemas / process / glitch).
- A fixed floating menu toggle (green square, top-right, 8×8 shadow) on every public page.
- Marquee / scrolling announcement bars above or below hero.

### Fixed / floating elements
- Top-right 80×80 green menu toggle (brutal shadow) — persists across scroll.
- When open, a "post-it" green menu card slides down beneath it (4px border, 12×12 shadow).
- No floating chat bubbles, no cookie banners mid-scroll, no parallax.

---

## ICONOGRAPHY

Karma uses **very little iconography**. The pattern is: typography + asset photos do most of the work.

### What exists in the system
1. **Three process SVGs** — `assets/icons/{observar, interpretar, trazar}.svg`. These are the "Observar → Interpretar → Trazar" triptych that appears in the hero grid. Hand-drawn / brutalist style, B&W. They are the ONLY native icon set.
2. **Symbol pack** (`assets/symbols/simbolo-1…9.webp`) — 9 abstract brutalist marks (stars, circles, stacks). Used as decorative motifs, number-badge backgrounds, section openers. Treat as imagery, not icons — they don't resize well below ~80px.
3. **Unicode typographic marks** used in place of icons: `✦ ★ ◆ ⬢ ◉ ∞ ∿ → ↗ ↓ ↘ ⚡ 01010101`. These are set in `Space Grotesk` or `Courier Prime` at size.
4. **NO emoji.** The one place emoji appeared (`ServiceSection.tsx` props carrying 🎨 / 💻 / 📱) is legacy placeholder content and should be stripped on sight.
5. **NO icon font / sprite / Lucide / Heroicons / Font Awesome** is installed. There is no `react-icons`, no SVG sprite file.

### Substitution policy
If a design requires a UI icon not present in the native set (e.g. menu, close, search, cart, arrow), **use Lucide via CDN** (`https://unpkg.com/lucide@latest`) at stroke-width 2, color inherited from text. Lucide matches the brand's hand-drawn geometric weight better than Heroicons/FontAwesome.

> ⚠️ **Flag on use:** any Lucide icon in a final design is a *substitution*, not a brand asset. The three process SVGs are the only "real" brand icons.

### When to use what
- **Process / methodology diagrams** → `assets/icons/{observar, interpretar, trazar}.svg`
- **Decorative marks on headings / stickers / badges** → Unicode (`★`, `✦`, `◆`)
- **Section dividers / large decorative** → `assets/symbols/simbolo-*.webp`
- **UI controls (menu, arrow, x, cart)** → Lucide via CDN, 2px stroke, uppercase-cased label next to it when size permits
- **Loaders / glitch accents** → `assets/bg/glitch.gif` (B&W animated GIF)

---

## Font substitution

The brand specifies **Space Grotesk** and **Inter** — both freely available on Google Fonts. `colors_and_type.css` loads them directly. **Courier Prime** replaces the brand-spec "Courier New" — Courier Prime is a cleaner web-font that preserves the typewriter feel. If the user wants true Courier New, set `--font-mono: 'Courier New', monospace;` in their page.

No other fonts are substituted. The logo is always served as a **PNG**, never re-typeset.

---

## Caveats — things I could not verify

- The **real serif logo file** is a PNG only (`karma-logo.png`). No SVG version was in the codebase. If the user has an SVG or vector file, upload it and I'll swap.
- `public/copys.pdf` was not parsed — it's binary marketing copy. All tone examples above are pulled from Liquid templates and the Brandbook.
- The `app/reservas/`, `app/tienda/`, `app/brandbook/`, `app/blog/` pages exist but are not mocked in the UI kit — the homepage + service-detail flow covers the shared component vocabulary. Tell me if you want one of those flows mocked.
