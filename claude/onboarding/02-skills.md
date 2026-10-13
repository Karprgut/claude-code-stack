# 2 · Skills — catálogo e instalación

Un **skill** es una capacidad especializada que Claude carga automáticamente cuando detecta que la tarea encaja (o que tú invocas escribiendo `/nombre-del-skill`). Cada uno trae sus instrucciones, plantillas y sistema visual. Esto es lo que hace que los entregables salgan "con la receta de Karma" y no genéricos.

Hay 20 skills en el paquete: las que creamos nosotros (operación de la agencia) y las instaladas que sí ocupo (diseño y video). Las propias están en [`../../skills/`](../../skills/); las de terceros se instalan desde sus repos.

---

## 2.1 Instalar el paquete de skills

Los skills viven en la carpeta `~/.claude/skills/` de tu Mac. Para instalarlos:

```bash
# 1. Asegúrate de que la carpeta existe
mkdir -p ~/.claude/skills

# 2. Descomprime el paquete dentro de ~/.claude
#    (ajusta la ruta a donde tengas el tar.gz)
tar -xzf "/ruta/a/onboarding-angel/karma-skills.tar.gz" -C ~/.claude

# 3. Verifica
ls ~/.claude/skills
```

Deberías ver las 20 carpetas. Reinicia VS Code (o el chat) y escribe `/` para confirmar que aparecen.

> **Nota:** en mi máquina algunos skills son symlinks a `~/.agents/skills/`. En el paquete ya los "aplané" a carpetas normales, así que en tu equipo quedan como archivos reales dentro de `~/.claude/skills/`. No necesitas recrear los symlinks.

---

## 2.2 Skills que CREAMOS (operación Karma) 🟢

Estos son el corazón de cómo trabajo. Mantienen el sistema visual de cada cliente y la metodología.

### `post-mortem`
Arma el **reporte mensual de cierre** de un cliente (Kabrita, Ruth's Chris, TBP): deck 1920×1080 en el sistema visual del cliente, exportado a **PPTX editable nativo**. Conoce el arco narrativo y los tres perfiles de cliente.
→ Úsalo: *"arma el post-mortem de Kabrita de mayo"*.

### `post-mortem-consulta`
El **paso previo** al post-mortem: reúne y analiza el dataset real de desempeño (Meta + Google + TikTok) vía la API de Reports y el MCP de Meta en vivo. Entrega un brief de datos + CSVs en la carpeta del mes.
→ Úsalo: *"saca los datos del post-mortem de Ruth's Chris de mayo"* — corre ESTE antes de `post-mortem`.

### `adglow-deliverable`
Produce entregables estilo **Adglow** (briefs de test de paid media, status reports, runbooks, hallazgos, kickoffs) en el sistema visual dark+neón de Adglow y con la voz en español. La metodología es transferible a otros clientes.
→ Úsalo: *"hazme un brief de test de audiencias para Adglow"*.

### `sticker-splitter`
Recorta **stickers/elementos individuales** de planchas PNG donde vienen todos juntos. Detecta el fondo, separa cada pieza con transparencia y deja carpetas `Posters/` + `Elementos/`.
→ Úsalo: *"separa los stickers de esta hoja"*.

### Suite de diseño CKM
Son de terceros (`claudekit`, se instalan con `npx skills add`), pero las uso tanto que van en el paquete. Se apoyan entre ellas:

- **`ckm-design`** — Skill maestro de diseño: identidad de marca, tokens, logos (55 estilos, Gemini AI), programa de identidad corporativa (CIP, 50 entregables), presentaciones HTML, banners, íconos, fotos sociales.
- **`ckm-brand`** — Voz de marca, identidad visual, frameworks de mensaje, consistencia de marca, style guides.
- **`ckm-design-system`** — Arquitectura de tokens (primitivo→semántico→componente), specs de componentes, generación de slides.
- **`ckm-slides`** — Presentaciones HTML estratégicas con Chart.js, tokens de diseño, fórmulas de copywriting.
- **`ckm-banner-design`** — Banners para social/ads/web/print con varias direcciones de arte y visuales generados por IA.
- **`ckm-ui-styling`** — Interfaces con shadcn/ui + Tailwind, modo oscuro, diseños sobre canvas.

---

## 2.3 Skills INSTALADOS que sí uso 🔵

De terceros, pero forman parte de mi flujo:

| Skill | Para qué lo uso |
|---|---|
| `frontend-design` | Interfaces y páginas web de calidad producción que evitan el "look de IA genérico". |
| `ui-ux-pro-max` | Inteligencia de UI/UX: 50+ estilos, paletas, pairings de fuentes, guías UX, charts. Para planear/construir/revisar UI. |
| `web-typography` | Elegir y emparejar tipografías web, jerarquía, line-height, carga de fuentes. |
| `svg-illustration` | Reglas de diagramas SVG y patrones de layout para slides. |
| `gsap` | Referencia de animación GSAP (para HyperFrames/video). |
| `hyperframes` | Crear composiciones de video en HTML: títulos, captions, voiceovers, visuales audio-reactivos, transiciones. |
| `hyperframes-cli` | Comandos del CLI de HyperFrames (init, lint, preview, render, transcribe, tts). |
| `hyperframes-registry` | Instalar bloques/componentes del registro de HyperFrames. |
| `website-to-hyperframes` | Capturar un sitio web y convertirlo en video (promos, ads, product tours). |
| `find-skills` | Descubrir e instalar nuevos skills cuando preguntas "¿hay un skill para X?". |

---

## 2.4 Cómo se invoca un skill

Dos formas:

1. **Automática** — describes la tarea en lenguaje natural y Claude carga el skill correcto solo. Ej: *"necesito el reporte mensual de TBP"* → carga `post-mortem`.
2. **Explícita** — escribes `/` y eliges el skill, o pones `/post-mortem` directo.

> No tienes que memorizar nada: escribe `/` en el chat y se despliega la lista con su descripción.

## 2.5 Built-in (vienen con Claude Code, no en el paquete)

Estos ya los trae la herramienta — solo para que sepas que existen: `code-review`, `simplify`, `verify`, `deep-research`, `schedule`, `loop`, `security-review`, `init`, entre otros. Los uso para revisar código, investigar y programar tareas recurrentes.

## ✅ Checklist

- [ ] Descomprimiste el tarball en `~/.claude/skills/`.
- [ ] `ls ~/.claude/skills` muestra 20 carpetas.
- [ ] Escribiendo `/` en el chat aparecen los skills `ckm-*`, `post-mortem`, etc.
