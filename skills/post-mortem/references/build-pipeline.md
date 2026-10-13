# Pipeline de export a PPTX

Regla central de KCL (del playbook `Karma Creative Lab Design System/playbooks/pptx-from-html.md`): **DOM/datos → PptxGenJS o python-pptx NATIVO. Nunca image-based** (`html-to-image` + `addImage`). Esto produce texto, tablas y charts editables en PowerPoint/Keynote/Canva.

Canvas siempre **1920×1080** de diseño → 13.333×7.5 in (LAYOUT_WIDE).

```
px → in:  n * 13.333 / 1920
py → in:  n * 7.5  / 1080
fontSize pt ≈ px * 0.5   (mínimo legible 7pt)
```

Hay **dos motores** según cliente. Importa entender de cuál depende cada uno, porque cambia qué archivo editas.

---

## Ruth's Chris — Node / pptxgenjs (HTML es la fuente de verdad)

`pptx-export.js` **lee el DOM** del `index.html` y despacha por clase CSS de cada `.slide`. `build.js` lo corre headless con jsdom.

- **Editas:** `index.html` (contenido + clases de layout). El PPTX se regenera leyendo ese DOM.
- **Helpers:** `hline()`, `redBar()`, `chrome(slide,pageNum)`, `contentHeader(slide,root)`, conversión `px/py`.
- **Dispatcher → renderers por layout:** `rTitle` (cover), `rSection` (divisor), `rKpis`, `rTwoCol`, `rBarChart`, `rFindings`, `rTable`, `rOppGrid`, `rActionRow`, `rClosing`, `rGeneric` (fallback).
- **Layout nuevo** = nueva `.clase` en HTML + nuevo `r{Layout}()` en JS + entrada en el dispatcher. Copia los helpers verbatim, referencia colores solo vía las constantes `C` y `FONT_*`.
- **Build:**
  ```bash
  cd "propuestas/Ruths-Chris/Post-Mortem-<Mes>"
  node build.js   # → Ruths-Chris_Post-Mortem-Paid-Media_<Mes>-2026.pptx
  ```
  El nombre de salida está en `pres.writeFile({fileName: …})` al final de `pptx-export.js` — actualízalo al mes nuevo.

---

## Kabrita / TBP — Python / python-pptx (el builder es la fuente de verdad)

⚠️ **Gotcha clave:** `build_pptx.py` construye los slides **imperativamente en Python** (~1500 líneas), NO lee el HTML. Editar solo el `.html` actualiza el preview web pero **no** el PPTX. Para cambiar el PPTX hay que **editar el `build_pptx.py`** (cifras, textos, deltas) y recompilar. Mantén HTML y builder en sync.

- **Editas:** `build_pptx.py` (y el `.html` si quieres que el preview web cuadre).
- **Estructura:** convierte px→EMU (`PX_TO_EMU = 12192000/1920`), define la paleta como `RGBColor(...)`, y arma cada slide con shapes nativos (`MSO_SHAPE`, text frames, `add_table`). Charts/tablas nativos = editables.
- **Build:**
  ```bash
  cd "propuestas/Kabrita/Post-Mortem-<Mes>"   # o TBP/…
  python3 build_pptx.py
  ```
  Kabrita guarda en una ruta **absoluta hardcodeada** (`… · Editable.pptx`) — cámbiala al mes nuevo. TBP guarda relativo (`TBP_Post_Mortem_<Mes>_2026.pptx`). Requiere `python-pptx` y `lxml` instalados.

### Kabrita · modelo de slides verificado (septiembre 2026 · 33 slides)

El `build_pptx.py` de septiembre reproduce **nativamente las 33 slides** del deck final. Es el canónico: clónalo, no el de mayo ni el de agosto.

Método para clonar `<MesAnt>` → `<MesNuevo>`:

1. **Copia** `Post-Mortem-<MesAnt>/build_pptx.py` → `Post-Mortem-<MesNuevo>/` junto con `reportes/`. Cambia el docstring, la constante `out` (ruta absoluta hardcodeada, línea final de `build()`) y los encabezados del mes (`MES`, `RANGO`, `MES_PREV`).
2. **Intercambia la data en el bloque de constantes de arriba** (plan por canal, ejecutado, `SITIO`, `ROAS_CUENTA`, series mensuales), no slide por slide. El builder de septiembre centraliza las cifras en ~500 líneas de constantes al inicio; editar ahí propaga a todos los slides y evita cifras huérfanas.
3. **Barre los residuos del mes anterior** antes de recompilar:
   ```bash
   grep -niE "DATOS DE (ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)" build_pptx.py
   ```
   Debe salir vacío. Hay slides heredados que no se llaman en `build()` y arrastran cifras viejas hardcodeadas: si los re-agregas a la secuencia, publican números de otro mes.
4. **Revisa los índices de mes.** Las variables que leen la serie por posición (`RES_MES[n]`) apuntan por índice: al agregar un mes hay que correrlas, o el slide publica el dato del mes anterior con el título del nuevo.
5. **No cambies QUÉ métrica reporta cada slide** — el reporte mantiene las mismas métricas mes a mes; si falta un dato, pídelo (no sustituyas).
6. **Recompila, lee el diagnóstico** (ver abajo) y valida fuentes con `unzip -p deck.pptx ppt/slides/slide*.xml | grep -oE 'typeface="[^"]+"' | sort -u` → solo `Poppins`.

**El diagnóstico al final del build es la herramienta de QA.** `build()` imprime tres bloques y los tres deben salir limpios:
- `— ESCALA —` con `FONT_SCALE` y `MIN_PT`.
- el conteo de **desbordes** (texto más alto que su caja) → debe ser 0.
- `— CENTRADO — N slides centrados · M anclados arriba (no cabía)`. Esa M son los **`clamp-top`** y debe ser 0: un bloque más alto que el espacio entre el header y el footer se sale por abajo y pisa el pie. Se arregla acortando el título a una línea (lo que más espacio libera) o comprimiendo filas y tarjetas — nunca dejándolo encimado.

**Helpers/trucos del engine (úsalos, no los reinventes):**
- `add_text(..., size=N)` aplica `FONT_SCALE` global con rampa (nada baja de `MIN_PT`). **Para achicar toda la tipografía de un jalazo y matar desbordes, mueve `FONT_SCALE`** (septiembre corrió en `0.72`) — afecta títulos, tablas, charts y badges.
- `autocenter(s)` centra verticalmente lo dibujado después del título dentro de la zona útil y **nunca deja que un contenedor invada el footer**. Todo slide de contenido la llama al final; si no cabe, devuelve `clamp-top` y queda en el diagnóstico.
- **Numeración de footer secuencial:** contador global `_PAGE=[0]` + `_next_page()` (zero-padded). `chrome()` y `slide_divider()` lo llaman e **ignoran el page_num histórico**; `build()` hace `_PAGE[0]=0` al inicio. Así el footer sale 01..N en orden de `build()` sin renumerar a mano. (El cierre full-bleed va sin número.)
- **Tablas: el ancho de las columnas debe sumar `tw − 60`** (el ancho de la tabla menos el padding de los dos lados). Si suma el ancho completo, la última columna se corta.
- **Barras = shapes top-rounded** (`draw_bar`, `draw_axis`, `delta_badge` up=verde/down=rojo). Cuando un valor excede la escala, **clampea la barra al tope y pon el label real**.
- **Testigos visuales:** `creative_card()` mete el arte real con *contain* (`_img_size` vía PIL + escala), badge de plataforma configurable (`badge_text="META"` / `"TIKTOK"`), y renombra la shape (`pic.name`) para **que la ruta absoluta del disco no viaje en el XML**. Los archivos viven en `reportes/creativos/`. Los `img_ratio`/`name_ratio` existen para que la imagen tome la altura sobrante cuando la tarjeta es alta.
- Componentes reutilizables: `chrome`, `content_header`, `card_top_border`, `card_left_border`, `hbar_row` (con `stacked_segments`), `insight_band` (banda navy "Lectura"), `channel_kpis`, `channel_chart_wins`, `draw_legend`, `_perf_table`, `_revenue_table`.

**Secuencia de `build()` (septiembre):** portada · resumen · **contexto de la comparación** (temprano) · presupuesto y gasto por plataforma (serie del año) · resultados por mes · hallazgos-comparativo · logros · plan-vs-ejecutado · plan abierto por línea · mes-vs-mes-anterior · **▸ divisor** Resultados por canal · distribución-de-resultados · eficiencia · Meta-lectura · Meta-frecuencia-de-retargeting · Meta-awareness · Google-lectura · TikTok-lectura · orgánico-GA4 · GA4-atribución · Shopify-referrer · distribución-regional-Shopify · blog · **▸ divisor** Atribución creativa · piezas-Meta · testigos-Meta · piezas-TikTok · testigos-TikTok · lo-validado · **lo-que-NO-sabemos** · do's & don'ts · next-steps · cierre.

Slides definidos pero **sin llamar** en `build()` (se retiraron porque la pauta dejó de abrir por geo, o porque su contenido se consolidó): `slide_06_inv_region`, `slide_07_imp_region`, `slide_08_clics_compras`, `slide_08b_sesiones_region`, `slide_05_plan_table`, `slide_12_meta_radio`, `slide_14_google_radio`, `slide_18_creativa`, `slide_perf_consideracion`, `slide_perf_retargeting`, `slide_perf_promocionado`. Re-agrégalos con una línea si vuelven a aplicar — y revísales las cifras antes.

**Numéricos que cambian de definición:** Google "compras" = **conversiones primarias** (no categoría PURCHASE) — ver `post-mortem-consulta/references/fuentes.md §2`. Alcance Meta = dedup account-level (no suma de campañas). Cifra de venta = **Shopify**, no GA4.

### Preview y assets

```bash
# PDF para revisar el deck completo sin abrir PowerPoint
soffice --headless --convert-to pdf "<deck>.pptx"
# webp/video → png para los testigos
ffmpeg -i pieza.webp pieza.png
ffmpeg -ss 00:00:01 -i pieza.mp4 -frames:v 1 pieza.png
```

## Los 8 anti-patrones que rompen el export (pptxgenjs)

1. `addImage({path:'assets/x.png'})` desde `file://` → preload como data URL (FileReader).
2. `slide.background = {color}` → usar `{fill}`.
3. `addShape('line',{h:0})` → usar rect `h:0.012` (helper `hline`).
4. `addChart(PG.ChartType.bar,…)` → string literal `'bar'`.
5. `line:{type:'none'}` → `line:{width:0}`.
6. `lineSpacingMultiple` → omitir, no es válido.
7. Colores `#FF0033` → hex sin prefijo: `'FF0033'`.
8. fontSize < 7pt → mínimo 7pt en body.

CDN pptxgenjs (browser): `https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js` (incluye JSZip). En Node, `pptxgenjs` vía `require` (RC usa v4 en su `node_modules`).

## Verificación de fuentes (crítico, sobre todo Ruth's Chris)

Tras cada export, confirma que no haya sustitución de fuentes ni letter-spacing:

```bash
# Solo deben aparecer las fuentes del sistema del cliente:
unzip -p deck.pptx ppt/slides/slide*.xml | grep -oE 'typeface="[^"]+"' | sort -u
# Letter-spacing debe ser 0 (sin atributos spc=):
unzip -p deck.pptx ppt/slides/slide1.xml | grep -c 'spc='   # → 0 en RC
```

RC: solo `Arial Black` + `Helvetica Neue`. Kabrita: Poppins (cuidado — Poppins NO es de sistema; en el PPTX se incrusta o se acepta sustitución a Helvetica/Arial; verifica con Kar). TBP: ivypresto/KMR son Typekit (web) — en PPTX caen a fuentes locales; usa equivalentes seguros si el deck va a abrirse en máquinas del cliente.
