# Flint: la capa de Claude de mi centro de mando

Flint es el producto que construí para salir de las hojas de cálculo: **una sola base de datos**
(MongoDB) con campañas de Meta, Google y TikTok, pendientes, agenda, personas, métricas y salud,
y **tres superficies** encima: un tablero web (Next.js 15), una app de iOS (SwiftUI) y **Claude
Code como agente de terminal** que se opera escribiendo. El repo completo del producto
(dashboard, iOS, Terraform) es privado. Aquí está lo que lo hace funcionar con Claude y la
arquitectura, que es la parte replicable.

| Carpeta / archivo | Qué es |
|---|---|
| [CLAUDE.md](CLAUDE.md) | **Flint como agente.** El `CLAUDE.md` del repo convierte a Claude Code en Flint: lee el perfil del usuario de Mongo al arrancar, carga la memoria compartida, corre la rutina de la mañana y la del cierre del día, puntúa al equipo, genera resúmenes, y devuelve la lista completa de pendientes en cada cambio. Es un sistema de ~300 líneas de reglas que sobreviven a la compactación |
| [agents/](agents/) | Cuatro subagentes: `day` (compañero del día), `summarizer` (cierre), `ops` (tareas operativas en `ops/<tarea>/`), `dashboard` (desarrollo del tablero) |
| [scripts/mongo-cli.mjs](scripts/mongo-cli.mjs) | El CLI con el que Claude escribe y lee Mongo durante la conversación: todos, archivo, scores, feedback, wishlist, milestones, **memoria compartida entre IAs**, recurrentes, consultas crudas. [docs/CLI_REFERENCE.md](docs/CLI_REFERENCE.md) lo documenta |
| [task-watcher/](task-watcher/) | **Claude Code como worker.** El tablero encola tareas (`claude_code_tasks`); el watcher las toma cuando se aprueban, corre `claude -p` sobre el repo del proyecto, escribe el resultado de vuelta y avisa por ntfy. [api/claude-code-tasks/](api/claude-code-tasks/) son los endpoints de crear, aprobar, rechazar y recibir el resultado |
| [lib/reports-ingest/](lib/reports-ingest/) | Ingesta nativa de Meta Marketing API, Google Ads API y TikTok Marketing API por cliente: campañas, ad sets, anuncios, métricas, markup, snapshots por rango. Es el sistema "Reports" del que beben las skills de post-mortem |
| [lib/insights-agent/](lib/insights-agent/) | **Agente de insights de paid media.** Pipeline de 6 fases: normaliza al esquema canónico, diagnostica con reglas (fragmentación, concentración, aprendizaje delgado, fuga post-clic), puntúa, prioriza y sintetiza con un LLM. Regla no negociable: nunca compara awareness contra conversión. [lib/insights-agent/methodology.md](lib/insights-agent/methodology.md) es la metodología |
| [lib/chat/](lib/chat/) | Chat multi-proveedor (Anthropic, OpenAI) dentro del tablero con **tool use**: leer archivos, consultar Mongo, manejar pendientes. El router elige proveedor; las herramientas son genéricas |
| [schemas/collections.md](schemas/collections.md) | El esquema de cada colección de Mongo. Claude lo lee antes de insertar |
| [workflows/](workflows/) | GitHub Actions: deploy a EC2 por ECR + SSM, resumen diario, resumen semanal, rollover de pendientes |
| [docs/](docs/) | Guía de usuario, referencia del CLI, arquitectura técnica de campañas, cómo sacar tokens de Meta, Google Ads y TikTok, métricas disponibles por API, guía para generar un System User token de Meta (para mandar al admin de un cliente) y guía para habilitar HealthKit (para el owner del Apple Developer Team) |
| [SETUP.md](SETUP.md) · [flint-init.sh](flint-init.sh) | Instalación desde cero (Mongo Atlas, AWS, iOS, CI/CD) y el script interactivo que arma el `.env.local` |
| [ops-campaigns/](ops-campaigns/) | Cómo corre la ingesta en el servidor (cron → `/api/cron/*-sync` con secreto) y el camino viejo por scraping con sesión persistida, que quedó como respaldo |
| [README-producto.md](README-producto.md) | El README original del producto con la lista completa de funciones |

## Ideas que valen la pena aunque no uses Flint

- **El `CLAUDE.md` como producto.** No es un archivo de contexto: es el sistema operativo del
  agente. Reglas con "MANDATORY", rutinas con pasos numerados que "NEVER skip", y la regla de
  que todo feedback nuevo se escribe ahí (no en memoria) porque es lo único que sobrevive a la
  compactación.
- **Memoria compartida entre IAs** en una colección de Mongo con `source`: lo que aprende Claude
  Code lo ve el chat del tablero y viceversa.
- **Nunca asumir el día de la semana.** `date` por Bash al arrancar; el fin de semana tiene su
  propia rutina ligera.
- **Dos frontends, una API.** Cada pantalla existe en web y en iOS contra los mismos endpoints;
  la regla está en el `CLAUDE.md` para que Claude no implemente solo una.
- **Las métricas de resultado no se comparan entre etapas del embudo.** 10,000 clics no son "más
  eficientes" que 50 compras. Cada regla del agente de insights segmenta por `funnel_stage`
  antes de rankear.
- **Claude Code como worker con aprobación humana.** La tarea se encola, alguien la aprueba, el
  watcher la ejecuta y el resultado vuelve al tablero. El watcher registra la ausencia de
  respuesta como fallo: una tarea que "terminó" sin salida fue la lección.
