# Perfiles de cliente

Rutas, tokens y fuentes de datos por cliente. **No inventes colores ni fuentes** — usa solo los tokens de aquí (o el `colors_and_type.css` / `DESIGN.md` del cliente, que es la fuente de verdad).

Raíz común: `~/Trabajo/Karma Creative Lab Shopify/propuestas/`. Es un repo git con branch default `propuestas` (sin `main`). Commitea ahí solo si Kar lo pide.

---

## Kabrita — paid media + orgánico, split regional

- **Carpeta:** `propuestas/Kabrita/Post-Mortem-<Mes>/`
- **Deck canónico (septiembre · 33 slides nativas):** `Kabrita/Post-Mortem-Septiembre/build_pptx.py`. Es el que incorpora: contexto de la comparación temprano, Shopify por ShopifyQL, atribución creativa reducida a tabla + testigos por canal, y el bloque regional solo como demanda. **Clona este**, no el de mayo ni el de agosto.
- ⚠️ **Al clonar, busca los avisos `DATOS DE MAYO` en el builder.** Hay slides heredados con cifras viejas hardcodeadas que no se llamaban en `build()`; si los agregas a la secuencia sin reescribirlos, publican números de otro mes. En septiembre aparecieron tres (`slide_09_eficiencia`, `slide_16_organico`, `slide_05_plan_table`).
- **Al clonar, revisa también los índices de mes.** Variables como `_ago = RES_MES[7]` apuntan por posición: al agregar un mes a la serie hay que correrlos, o el título del slide publica el dato del mes anterior.
- **Builder:** `build_pptx.py` (Python · python-pptx nativo). `FONT_SCALE` global para tipografía; `_next_page()` para footer secuencial.
- **Sistema de diseño:** `Kabrita Design System/` (README.md, SKILL.md `kabrita-design`, `colors_and_type.css`, assets). Hay un skill de marca aparte: `kabrita-design`.
- **Datos: ya NO se exporta nada a mano.** Todo lo produce el skill `post-mortem-consulta` y deja CSVs + `consulta-<mes>.md` + testigos en `Post-Mortem-<Mes>/reportes/`:
  - **Meta** → MCP de Meta en vivo (`act_<ID>`). El token de Reports lleva meses invalidado (`OAuthException 190/460`); el markup de la cuenta es `RELATIVE 0`, así que las cifras crudas **son** la vista del cliente.
  - **Google y TikTok** → snapshot de Reports (`localhost:5556`), y TikTok también por su MCP para el detalle por anuncio.
  - **Shopify** → conector oficial con ShopifyQL. **Verifica con `get-shop-info` que apunte a Kabrita**: sostiene una tienda a la vez. Es la fuente de verdad de la venta.
  - **GA4** → MCP `google-analytics-kabrita`, propiedad **<GA4_PROPERTY_ID>**. Embudo, mezcla de canales y orgánico; **no** es la cifra de venta.
  - **Media plan** → Drive export a xlsx, pestaña `<Mes> v2` (la Sheets API está apagada).
  - **Testigos visuales** → `reportes/creativos/`. Meta por `ads_get_ig_media`; TikTok por `tiktok_item_id` + oEmbed. Detalle en las referencias de `post-mortem-consulta`.

**Tokens (de `colors_and_type.css`):**
- Navy/ink `#0C2B66` · ink-2 `#2D3A5C` · ink-3 `#6B7494` · ink-4 `#9AA0B5`
- Canvas `#F4F5F7` · surface `#FFFFFF` · surface-2 `#FAFAFC`
- Acentos analíticos: blue `#4A7FF7`, lavender `#AE8DF5`, orange `#F79646`, green `#89D957`, teal-bright `#00C4CC`, pink `#FCBCD4`
- Líneas: line `#E5E7ED`, line-strong `#C9CDD6`
- Fuente: **Poppins** (Light 300 / Medium 500 / Bold) display y sans. Mono: SF Mono/Menlo.
- **Firma visual:** barras de chart con esquinas superiores redondeadas (~22px, token `--r-bar-top`). Register ejecutivo-analítico, no brutalista.

**Particularidad de contenido:** canales Meta, Google y TikTok + orgánico y canales propios. Moneda MXN.

Desde el **1-sep-2026 la pauta corre con audiencia nacional** (Google fusionó las líneas de República y CDMX; Meta quedó 89% nacional), así que **el split CDMX-Edomex vs. Resto ya no se reporta sobre la pauta**. Solo se conserva el corte regional de la **demanda** (sesiones del sitio por estado, de Shopify), con los hubs definidos como Jalisco, Nuevo León, Puebla, Quintana Roo, Chihuahua y Querétaro. Si el plan vuelve a abrir por geo, el bloque vuelve — ver [narrative-arc.md](narrative-arc.md) § "Bloque regional".

**Dos cifras de venta que no se suman:** Shopify (caja) y GA4 (medición del sitio) difieren por atribución y cobertura. La de negocio es Shopify; GA4 da mezcla de canales. Decláralo en el slide de huecos.

**Google reatribuye conversiones hacia atrás.** Un mes medido hoy vale más que cuando se cerró (agosto: 224 → 274.4 en cinco semanas). Si el corte es a pocos días del cierre, el delta del canal subestima al mes: dilo y vuelve a medir a mitad del mes siguiente.

---

## Ruth's Chris — paid media, brutalista

- **Carpeta:** `propuestas/Ruths-Chris/Post-Mortem-<Mes>/`  *(reubicado 2026-05-29 desde flint-app)*
- **Deck canónico (abril):** `Ruths-Chris/Post-Mortem-Abril/index.html`
- **Builder:** `build.js` + `pptx-export.js` (Node · pptxgenjs + jsdom). `node_modules/` ya instalado.
- **Sistema de diseño:** `Ruths-Chris/Post-Mortem-Abril/DESIGN.md` — **la referencia más completa y limpia de KCL.** Léela entera antes de tocar el deck.
- **Datos crudos:** `Ruths-Chris/Post-Mortem-Abril/reportes/` — `Campaign report.xlsx`, `Informe-sin-titulo-abr-2026.xlsx`.
- **Salida:** `Ruths-Chris_Post-Mortem-Paid-Media_<Mes>-2026.pptx`

**Tokens (de `DESIGN.md`):**
- **Tres colores únicos:** ink `#0A0A0A`, white `#FFFFFF`, signal red `#FF0033` (+ greys derivados ink-2 `#2A2A2A`/ink-3 `#666666`/ink-4 `#999999`). Red-deep `#CC0029`, red-tint `#FFE5EB`. Hairline `#E5E5E5`.
- **Dos fuentes de sistema:** Arial Black 900 (display) + Helvetica Neue 400/700 (body). **Nunca Google Fonts** — se sustituirían en el export.
- `charSpacing: 0` en TODO. Esquinas a `0px`. Borde 2px ink en cada card. **Acento rojo 6–10px arriba de cada card.** UPPERCASE por defecto.
- Portada/divisores/cierre = negro full-bleed; contenido = blanco. Rojo escaso: marca, acento de card, una señal crítica por slide.
- El punto del título hero va en rojo vía `<em>.</em>` (gesto de firma).

**Particularidad:** Meta (por campaña) + Google Ads Performance Max. Canales con roles diferenciados. Moneda MXN. Componentes: kpi-tile, two-col, finding-card (numeral rojo), opp-card (badge cuadrado rojo), action-card (bullet = dash rojo 14×3px), tabla con winner-row roja, bar-chart nativo barras ink.

---

## TBP — lead-gen / email, editorial sobrio

- **Carpeta:** `propuestas/TBP/Post-Mortem-<Mes>/`
- **Deck canónico (abril):** `TBP/Post-Mortem-Abril/Post Mortem Abril · TBP.html` (= `index.html`)
- **Builder:** `build_pptx.py` (Python · python-pptx). Tokens en `colors_and_type.css`.
- **Sistema de diseño:** `TBP/Post-Mortem-Abril/TBP Design System/`
- **Datos crudos:** `TBP/Post-Mortem-Abril/data/` — `Informe de campaña (8).csv` (Meta), GA4 `Adquisición_de_tráfico…csv`, `Informe-sin-título-abr…csv`. Contexto Brevo en `propuestas/TBP/Brevo-Tracking/`.

**Tokens (de `colors_and_type.css`):**
- Vessel Blue `#1F2F8C` · blue-deep `#0E1A57` · blue-soft `#2D3FA0` · blue-tint `#4F60C0`
- Cream `#F2EEE6` · cream-page `#F7F6F5` · cream-soft `#EAE5DB` · stone `#B7B2A7` · graphite `#5C5C5C`
- Ink `#000000` · ink-bg `#0A0A0A` · paper `#FFFFFF`
- Fuentes: **ivypresto-display** (display, serif elegante) + **KMR Melange Grotesk** (sans), vía Typekit `https://use.typekit.net/<KIT_ID>.css`.
- **Chrome FLAT** (sin sombras), divisores "Sección 0X".

**Particularidad:** reporte de **lead-gen**, no ROAS. KPIs: leads, costo por lead, alcance, salud de funnel, demanda orgánica. Google suele estar **bloqueado por saldo** (reportarlo como hecho). Meta es el canal líder en leads. Bloque Orgánico · GA4 (profundidad de sesión). Moneda MXN/USD según contexto del cliente.

---

## Datos: qué exportar de cada plataforma

| Plataforma | Export | Métricas que alimentan el deck |
|---|---|---|
| **Meta Ads** | Informe de campaña (CSV) | Inversión, impresiones, alcance, clics, CPM, CPC, compras/leads, ROAS, costo por resultado, por campaña |
| **Google Ads** | Reporte de campaña (CSV) | Inversión, impresiones, clics, conversiones, CPA, ROAS (PMax para RC) |
| **TikTok** | Export (XLSX) | Inversión, impresiones, CPM, clics, awareness |
| **GA4** | Adquisición de tráfico · grupo de canales | Sesiones por canal, orgánico vs. paid, engagement/profundidad |
| **Shopify** | Sessions by location / by referrer · Total sales by referrer | Revenue por referrer, sesiones por región (split CDMX/Resto en Kabrita), atribución orgánica |
| **Brevo** (TBP) | CRM / campañas | Leads capturados, funnel de email |

Pega los CSV/XLSX crudos en la carpeta de datos del mes y cruza contra el **plan de medios** para el slide "plan vs. ejecutado".
