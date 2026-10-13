---
name: post-mortem
description: Produce el post-mortem mensual de un cliente de Karma Creative Lab (Kabrita, Ruth's Chris, TBP) al nivel de acabado que Kar ya estableció — deck de 1920×1080 en el sistema visual del cliente, exportado a PPTX editable nativo. Úsalo cuando pidan "el post mortem de <cliente>", el reporte mensual de paid media / lead-gen, o cuando haya que armar/actualizar un deck de cierre de mes. Cubre el arco narrativo común, los tres perfiles de cliente (colores, fuentes, pipeline de build) y la metodología de datos.
user-invocable: true
---

# Post-Mortem · Karma Creative Lab

Skill para producir el **post-mortem mensual** de un cliente de KCL con la misma metodología, voz y nivel de acabado que los decks que Kar ya entregó. El producto final es un **deck de 1920×1080** en el sistema visual del cliente, exportado a **PPTX editable nativo** (texto, tablas y charts editables en PowerPoint/Keynote/Canva — nunca imágenes rasterizadas).

Hoy cubre tres clientes. La metodología es transferible a clientes nuevos.

| Cliente | Tipo de reporte | Sistema visual | Pipeline build |
|---|---|---|---|
| **Kabrita** | Paid media (Meta/Google/TikTok) + orgánico y canales propios. Venta de caja por Shopify | Navy `#0C2B66` sobre off-white `#F4F5F7`, Poppins, paleta analítica (azul/lavanda/naranja/teal). Barras top-rounded. | Python · `build_pptx.py` |
| **Ruth's Chris** | Paid media (Meta + Google PMax) | **Brutalista** B/N + rojo señal `#FF0033`, Arial Black + Helvetica Neue, esquinas a 90°, borde 2px, slash rojo | Node · `build.js` + `pptx-export.js` |
| **TBP** | **Lead-gen / email** (Brevo, leads de Meta, Google bloqueado por saldo, orgánico GA4) | Vessel Blue `#1F2F8C` + cream, ivypresto-display + KMR Melange (Typekit), chrome **FLAT** | Python · `build_pptx.py` |

Perfiles completos (rutas canónicas, tokens, datos): [references/clients.md](references/clients.md).

## Antes de empezar

1. **Confirma el cliente y el mes.** Cada cliente tiene su carpeta bajo `propuestas/<Cliente>/Post-Mortem-<Mes>/`. Si trabajas un cliente, hazlo desde su carpeta para no cruzar memoria/datos entre clientes.
2. **Localiza el deck canónico del mes anterior** (ver [references/clients.md](references/clients.md)). Es tu punto de partida: layouts ya afinados, tokens ya correctos.
3. **Reúne los datos del mes** corriendo el skill `post-mortem-consulta`, que los jala por MCP/tokens y deja CSVs + `consulta-<mes>.md` + testigos en `reportes/` (Kabrita/RC) o `data/` (TBP). **En Kabrita ya no hay exports manuales** — ver [references/clients.md](references/clients.md) § Datos para qué fuente alimenta cada bloque.
4. **Lee** [references/narrative-arc.md](references/narrative-arc.md) antes de tocar contenido — define qué cuenta cada slide y en qué orden.
5. **Cierra con** [references/quality-checklist.md](references/quality-checklist.md) antes de declarar el deck listo.

## Metodología de build: clonar y reemplazar

El método probado (lo recomienda el propio `DESIGN.md` de Ruth's Chris): **NO regeneres el deck desde cero.** Duplica la carpeta del mes anterior, reemplaza datos y vuelve a compilar.

1. **Duplica** `propuestas/<Cliente>/Post-Mortem-<MesAnterior>/` → `Post-Mortem-<MesNuevo>/`.
2. **Vacía** los datos crudos viejos de `reportes/`/`data/` y coloca los del mes nuevo. Barre también los residuos dentro del builder: slides heredados con cifras hardcodeadas de otro mes, e índices de mes que apuntan por posición (ver [references/build-pipeline.md](references/build-pipeline.md)).
3. **Edita el contenido en el HTML** (`index.html` o `Post Mortem … .html`) slide por slide: cifras, deltas, títulos-conclusión, hallazgos, do's & don'ts, next steps. Los `content-title` son **conclusiones**, no etiquetas (ver § Voz).
4. **Recompila el PPTX** con el pipeline del cliente (ver [references/build-pipeline.md](references/build-pipeline.md)).
5. **Verifica** export con la checklist (font-safety, letter-spacing, overflow, cifras cuadradas).

Para un cliente nuevo sin deck previo: arranca del deck de un cliente del **mismo tipo** (paid media → Kabrita o Ruth's Chris; lead-gen → TBP), reskinéalo con sus tokens y crea su `DESIGN.md`.

## Voz y lenguaje (obligatorio)

- **Español mexicano**, tú forms. Nunca voseo argentino ni formas ibéricas. Bilingüe EN/ES está bien en etiquetas ("Quick win", "Do's & Don'ts").
- **El título de cada slide es una conclusión, no una etiqueta.** Mal: "Inversión por canal". Bien: "73% de Meta y 80% de Google se dirigieron al Resto del país". El `content-eyebrow` da el tema; el `content-title` da la lectura.
- **Datos antes que adjetivos.** Toda cifra con su unidad ($, %, k MXN, leads, ROAS, CPA, sesiones) y, donde aplique, su **delta vs. mes anterior o vs. Q** (up/down/flat).
- **Por qué antes de qué.** Cada hallazgo y cada recomendación lleva la razón, no solo el dato. El deck debe poder auditarse meses después.
- **Lo que NO sabemos se declara.** Tracking con huecos, atribución parcial, una campaña bloqueada por saldo, un dato estimado → dilo en el slide, no lo escondas.
- **Honestidad operativa.** Si el mes fue flojo (baja ejecución, canal caído), el post-mortem lo dice con datos y propone el fix. No es un brochure de marketing; es un documento de revisión de desempeño.

## Identidad visual

Cada cliente tiene su sistema cerrado — **no inventes colores ni fuentes**. Usa solo los tokens del cliente (en su `colors_and_type.css` / `DESIGN.md`). Reglas transversales de KCL: deck a 1920×1080, fuentes que no se sustituyan en el export, charts y tablas **nativos** (editables), nada de drop shadows fuera del sistema del cliente. Detalle por cliente en [references/clients.md](references/clients.md).

## Pipeline de export a PPTX

Dos motores según cliente (Node/pptxgenjs vs. Python/python-pptx), misma regla central: **DOM→PPTX nativo, nunca image-based.** Coordenadas, anti-patrones y comandos en [references/build-pipeline.md](references/build-pipeline.md). El playbook maestro de KCL vive en `Karma Creative Lab Design System/playbooks/pptx-from-html.md`.
