---
name: adglow-deliverable
description: Produce Adglow client deliverables (test briefs, status reports, runbooks, findings/action plans) at the quality bar Kar has set. Use when asked to draft any Adglow-style document — paid-media test brief, audience activation plan, technical runbook, hallazgos/diagnóstico, status report, kickoff doc. Covers the Adglow dark+neon visual system, the hypothesis-driven content structure, and the Spanish voice. The methodology is transferable to similar agency deliverables across clients (RCN, KCL, etc.).
---

# Adglow Deliverable

Skill para que **cualquier agente** pueda producir entregables Adglow con la misma metodología y nivel de acabado.

Cubre cuatro formatos canónicos, todos derivados de los entregables reales del proyecto Adglow × RCN (`rcn-audience-etl/docs/`):

| Formato | Cuándo usar | Template |
|---|---|---|
| **Slide deck HTML** (1600×900, con nav + export PDF) | Brief de test, propuesta comercial, kickoff, presentación a junta | [templates/slide-deck.html](templates/slide-deck.html) |
| **Plan de medios HTML** (slide deck especializado, 16 slides) | **Propuesta de plan de medios a cliente nuevo** — investigación de mercado + competidores + audiencia + tech + estrategia + plan por línea de campaña | [templates/plan-de-medios.html](templates/plan-de-medios.html) |
| **Long-form report HTML** (scrollable, con TOC) | Status, diagnóstico técnico, arquitectura, post-mortem, plan de acción largo | [templates/long-form-report.html](templates/long-form-report.html) |
| **Runbook MD** | Setup técnico paso a paso, handoff a junior, sesión técnica con cliente | [templates/runbook.md](templates/runbook.md) |
| **Findings / Action plan MD** | Hallazgos de auditoría, plan a presentar en junta, decisiones que necesitamos | [templates/findings-action-plan.md](templates/findings-action-plan.md) |

### Sub-tipo: Plan de medios (propuesta a cliente)

Cuando el usuario pida **"propuesta de plan de medios"** para una vertical (apuestas deportivas, banca, retail, salud, etc.), usa específicamente [templates/plan-de-medios.html](templates/plan-de-medios.html). Sigue la estructura canónica de **6 secciones**:

1. **Investigación de mercado** (vertical + país + contexto regulatorio)
2. **Investigación de competidores**
3. **Audiencia**
4. **Requerimientos técnicos**
5. **Planteamiento estratégico** (sin creatividad ni contenido — solo media)
6. **Plan de medios por línea de campaña** (tabla con: canal, objetivo, funnel, KPI, audiencia, costo KPI, inversión, % inversión, KPI estimado)

Las reglas específicas de plan de medios (suma de % = 100% exacto, consistencia matemática `KPI_estimado = inversión / costo_KPI`, mínimos de aprendizaje por canal, fuentes válidas para benchmarks de mercado) están en [references/methodology.md](references/methodology.md) sección "Plan de medios — reglas específicas".

## Antes de empezar

1. **Identifica el formato.** Si el usuario pide algo presentable a cliente y discreto en alcance (un solo test, una propuesta) → **slide deck**. Si es status/diagnóstico largo de un sistema → **long-form report**. Si es ejecutable por una persona técnica → **runbook**. Si es para alinear decisiones de junta → **findings**.
2. **Copia el template completo** al destino (`docs/`, `public/docs/`, según convenga). No regeneres el CSS desde cero — los tokens y componentes ya están afinados.
3. **Reemplaza placeholders** marcados con `{{…}}` o comentarios `<!-- TODO -->`.
4. **Lee** [references/methodology.md](references/methodology.md) **antes de escribir el contenido**. Define la estructura argumental.
5. **Usa** [references/components-catalogue.md](references/components-catalogue.md) cuando necesites un componente visual nuevo (KPI card, finding card, hypothesis box, pipeline diagram, decision list).
6. **Cierra con** [references/quality-checklist.md](references/quality-checklist.md) **antes de declarar el entregable listo**.

## Voz y lenguaje (obligatorio)

- **Español neutral / Mexicano**, tú forms ("activamos", "no se toca nada"). **Nunca** voseo argentino, **nunca** "tildes" o formas ibéricas marcadas.
- **Tono experto-conciso**: el lector es un decisor de marketing/tech de un cliente grande. Frases cortas. Datos antes que adjetivos. Métricas con unidades explícitas (USD, COP, %, días).
- **Por qué antes de qué**. Cada decisión técnica importante lleva un callout corto explicando la razón (sirve para auditar el documento meses después).
- **Bandas, no puntos.** KPIs se reportan como rango (`$2,5 – $4 USD`) no como número único. Da los thresholds y las condiciones de ganador.
- **Lo que NO sabemos**, se declara. Si una métrica es estimación, dilo. Si una audiencia depende de un dump pendiente, dilo. Si el tracking tiene huecos, dilo.

## Identidad visual — Adglow Design System

Los cuatro formatos comparten el mismo sistema visual. Está **inline** dentro de cada template (no hay CSS externo — los entregables son self-contained y portables como un solo archivo).

**Tokens base (no cambies sin razón):**

```
--ink:     #0b0b10    (fondo)
--magenta: #F00A5E    (crítico, conversión, KPI primario alarma)
--cyan:    #00D9FF    (info, awareness, links, acento neutral)
--green:   #B0DA09    (positivo, ok, tráfico, escalamiento)
--orange:  #F99400    (warning, atención, días/tiempo)
--purple:  #B80090    (reservado, raramente usado)

Fonts: Space Grotesk (sans, body 700 default), IBM Plex Mono (mono)
Background: dark + grid 48px + scan-line overlay
Tipo: UPPERCASE en headings, eyebrows en mono uppercase 0.2em letter-spacing
Markers: highlight estilo plumón en 4 colores para frases clave
```

**Cuándo qué color:** ver [references/components-catalogue.md](references/components-catalogue.md) sección "Semántica de color".

## Estructura argumental (no es opcional)

Cada formato sigue una estructura específica. Lee la metodología completa antes de escribir, pero las tres reglas fundacionales:

1. **Hipótesis explícita.** Un brief de test arranca con la pregunta a responder + hipótesis H1/H2/H3 *antes* de la estructura. Sin hipótesis declarada, el test no se reporta — esto se hace cumplir desde el slide 02.
2. **Criterio de ganador multi-condición.** Costo ≤ target **Y** volumen ≥ umbral significancia **Y** lift ≥ 15% vs control. Las tres. Se declara antes de correr el test, no después.
3. **Pendientes pre go-live.** El último slide/sección siempre es un checklist concreto de qué necesitamos del cliente antes de arrancar. Aprobación de budget, accesos, creativos, pixel/CAPI, contacto de decisiones. Sin esa lista, el cliente no sabe que la pelota está de su lado.

Para hallazgos/diagnóstico, la estructura por hallazgo es: **Qué pasa → Impacto cuantificado → Solución (corto plazo + estructural) → Bloqueador**. Y se cierra con tabla de **Priorización (acción, tiempo, owner, bloqueado por)** + sección **Decisiones que necesitamos de la junta**.

## Flujo de trabajo

```
1. Identificar formato → 2. Copiar template → 3. Leer methodology.md
4. Escribir contenido sustituyendo placeholders
5. Revisar con quality-checklist.md → 6. Entregar ruta absoluta al usuario
```

**Ubicación recomendada:** dentro del repo del cliente, en `docs/` o `public/docs/`. Nombra el archivo `{tipo}-{tema}-{vN}.{ext}` ej. `brief-meta-audience-test-v1.html`, `status-pipeline-2026-05-12.html`, `runbook-setup-databricks.md`.

## Qué NO hacer

- **No inventes métricas.** Si no sabes el CPM benchmark de un país, pide el dato o marca el placeholder como `{{verificar benchmark}}`.
- **No agregues frameworks de presentación** (Reveal.js, Marp, etc.) — los templates son HTML+CSS+JS vanilla a propósito, para que cualquiera los abra en un browser sin build step.
- **No cambies la paleta** sin avisar. Es la identidad de Adglow.
- **No traduzcas la metodología a inglés** salvo que el cliente sea anglo. El default es español.
- **No elimines el botón de Descargar PDF** del slide deck — es parte de cómo se entregan los briefs al cliente.
- **No agregues animaciones decorativas.** Las transiciones existentes (`slideFade`, `pulse` en dots) son las únicas autorizadas. Cualquier animación adicional rompe la estética sobria de la marca.

## Memoria del usuario

El usuario opera Karma Creative Lab; Adglow es uno de sus proyectos (`~/adglow`). Para contexto del proyecto vivo, lee los memos del proyecto en `~/.claude/projects/-Users-<usuario>-adglow/memory/` — ahí están el estado de Strategy Builder, infra de Stripe, hosting en Railway, etc.

La metodología documentada aquí es **transferible**: si el usuario te pide aplicarla a otro cliente (KCL, Flint, Niko Niko), copia los templates al repo correspondiente y sustituye marca, paleta secundaria si aplica, y voz — la estructura argumental y los principios se mantienen.
