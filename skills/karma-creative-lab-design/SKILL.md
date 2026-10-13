---
name: karma-creative-lab-design
description: Use this skill to generate well-branded interfaces and assets for Karma Creative Lab, a brutalist strategic laboratory brand. Supports production code and throwaway prototypes/mocks/slides. Contains essential design guidelines (voice, typography, color, motion), real brand assets (logos, symbols, pattern images, process icons), CSS tokens, and a React UI kit recreating the marketing site.
user-invocable: true
---

Read `README.md` first — it has the brand context, voice/tone rules, full visual foundations, and iconography policy. Then explore:

- `colors_and_type.css` — drop-in tokens for color, type, spacing, shadows, motion. Import at the top of any HTML file.
- `assets/` — real brand assets. Copy what you need into the artifact; do not hotlink, do not re-draw. The three brand icons are `assets/icons/{observar, interpretar, trazar}.svg`.
- `ui_kits/website/` — React JSX components that recreate the marketing-site vocabulary (hero grid, service cards, manifesto, ticker, footer, button, input). `index.html` is a working click-thru demo.
- `preview/*.html` — atomic specimens (one concept per file) you can crib from.

If creating visual artifacts (slides, mocks, throwaway prototypes), copy assets out and create static HTML. If working on production code (Next.js / Shopify), use `colors_and_type.css` as the token source and the `components/HeroBanner.tsx` + `components/ServiceSection.tsx` in the codebase as the React patterns.

**The non-negotiables:**
1. **Spanish copy**, short declarative sentences, no emoji, ALL CAPS for headlines/buttons/labels.
2. **4px solid black borders**, **hard offset shadows (never blurred)**, **near-zero corner radii**.
3. **Space Grotesk** display + **Inter** body + **Courier Prime** mono. Headlines uppercase with tight negative tracking.
4. Two accents only: **#00FF41 green** (primary) and **#FF0033 red** (alert/glitch). No gradients. No soft shadows. No blur.
5. Use the **karma wordmark PNG** — don't re-typeset the logo.

If the user invokes this skill without guidance, ask what surface they're designing (web page, slide deck, social post, mockup), what copy they have, and whether it's in Spanish. Then act as an expert Karma designer and output HTML artifacts or production code.
