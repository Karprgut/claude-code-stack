# Skills

Una skill es una carpeta con un `SKILL.md` (frontmatter `name` + `description` + instrucciones) y,
opcionalmente, `references/`, `templates/` y `scripts/`. Claude la carga bajo demanda cuando la
descripción coincide con lo que pides, o cuando la invocas con `/<nombre>`.

Instalación: copia o enlaza la carpeta en `~/.claude/skills/`.

```bash
ln -s "$PWD/skills/post-mortem" ~/.claude/skills/post-mortem
```

## Las 13

| Skill | Qué hace | Trae |
|---|---|---|
| [ad-intelligence](ad-intelligence/) | Inteligencia competitiva de paid media al estilo AdClarity con fuentes públicas: qué pautan los competidores, Share of Voice, huecos. Modelo de **creativo-días** para estimar inversión sin panel y reglas de presentación por clase de confianza | `references/fuentes.md`, `references/lectura.md` |
| [post-mortem](post-mortem/) | El cierre mensual de un cliente: deck 1920×1080 en el sistema visual del cliente, exportado a **PPTX nativo** (python-pptx o pptxgenjs, nunca imágenes). Arco narrativo, checklist de calidad, pipeline de build | `references/{clients,narrative-arc,quality-checklist,build-pipeline}.md` |
| [post-mortem-consulta](post-mortem-consulta/) | El pull de datos que alimenta al anterior: Meta + Google + TikTok por API/MCP, Shopify por ShopifyQL, GA4 por MCP. Deja CSVs y un brief; no arma el deck | `references/{fuentes,meta-mcp,tiktok-mcp}.md` |
| [adglow-deliverable](adglow-deliverable/) | Entregables de agencia con metodología fija: brief de test, plan de medios, reporte largo, runbook, hallazgos. Cinco templates HTML/MD con tokens afinados | `templates/`, `references/{methodology,components-catalogue,quality-checklist}.md` |
| [adglow-slides](adglow-slides/) | Decks estratégicos en HTML 1920×1080 con Chart.js, exportados a PDF (Chrome headless) o PPTX editable. Arcos narrativos por tipo de deck, fórmulas de copy para slides | — |
| [adglow-brand-design](adglow-brand-design/) | Un solo skill, cuatro sistemas visuales; al invocarla eliges la marca. Tokens exactos por marca y los mismos componentes re-vestidos | `references/brand-systems.md` |
| [adglow-brand-voice](adglow-brand-voice/) | Voz, tono y frameworks de mensaje (headline, cuerpo, CTA) por marca; glosario y checklist de revisión de copy | — |
| [adglow-banners](adglow-banners/) | Banners para social, display, hero web y print: 2–3 direcciones de arte por brief, HTML+CSS self-contained rasterizado a PNG, safe areas por plataforma | — |
| [adglow-video](adglow-video/) | Deck → MP4 con voz en off. Modo rápido (Ken Burns + crossfade) y modo premium (HTML animado renderizado cuadro por cuadro con puppeteer + ffmpeg). Voz por `say` de macOS o ElevenLabs | `scripts/{kenburns,assemble,vo_say,vo_elevenlabs}.py`, `render_frames.js` |
| [adglow-reporte-mensual](adglow-reporte-mensual/) | El cierre de mes vestido con el sistema de la marca que firma; de dónde sale cada cifra y cómo se lee el pacing | — |
| [adglow-rigor-planeacion](adglow-rigor-planeacion/) | **Auditoría anti-alucinación** de planes de medios: cada número con fuente o marcado como supuesto, tablas que recalculan con fórmulas, benchmarks del vertical correcto, rangos en vez de falsa precisión | — |
| [scrapecreators-api](scrapecreators-api/) | Referencia de los endpoints de Scrape Creators (TikTok, Instagram, YouTube, LinkedIn, Facebook, X, Reddit…) con ejemplos | — |
| [sticker-splitter](sticker-splitter/) | Recorta planchas PNG de stickers en archivos individuales con transparencia; detecta fondo real, sólido o checkerboard; mosaicos de QA | `sticker_split.py`, `find_dups.py` |

Las `adglow-*` nacieron para una agencia de paid media con tres marcas (la agencia, un socio y
un holding) y están escritas para que **cualquier agente** del equipo produzca al mismo nivel.
Los nombres de marca y los tokens de color son los de esas marcas; cámbialos por los tuyos en
`adglow-brand-design/references/brand-systems.md` y el resto de las skills los heredan.

## Cómo las escribo

- **La descripción es el disparador.** Lleva las frases exactas con las que alguien pediría eso
  ("el post mortem de <cliente>", "qué está pauteando <competidor>") y el "NO es para…" que
  manda a la skill vecina.
- **Lo que se repite va a `references/`**; el `SKILL.md` dice cuándo abrir cada referencia. Leer
  una referencia de 600 líneas "por reflejo" es la forma más cara de gastar la ventana.
- **Un caso real por regla.** Cada regla dura trae el error que la originó ("un deck prometía
  9,140 leads; con tarifas reales eran ~600"). Sin el caso, la regla se ignora.
- **Checklist al final.** La skill no está lista hasta que declara con qué se verifica.
- **Economía de contexto explícita.** Las skills caras dicen qué NO cargar: no vuelques un
  snapshot crudo, mide el overflow por script y abre la imagen de un muestreo.

## Lo que no está aquí

Dos skills de planeación ligadas a un cliente (rate card, reglas de presupuesto, motor que edita
sus Excel) y una ligada al tablero interno de briefs de un empleador. Tienen datos comerciales
de terceros. El patrón de la segunda (jalar un brief de una API, verificar tarifas contra el
histórico real, armar el deck y escribirlo de vuelta) está descrito en [../docs/lecciones.md](../docs/lecciones.md).
