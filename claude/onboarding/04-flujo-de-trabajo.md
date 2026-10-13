# 4 · Cómo trabajo día a día

Esto es lo que no se ve en los archivos: las reglas, la estructura y los hábitos que hacen que todo salga consistente. Si entiendes esta guía, trabajas como yo.

---

## 4.1 La regla #1: trabaja DENTRO del repo del cliente

Cada cliente tiene su carpeta. **Antes de pedirle algo a Claude sobre un cliente, abre la carpeta de ESE cliente** (`File → Open Folder` en VS Code, o `cd` en terminal).

¿Por qué? Porque:
- Claude lee el `CLAUDE.md` de ESE proyecto (sus reglas específicas).
- La **memoria** de Claude se guarda por proyecto — así no se contaminan los clientes entre sí (ya nos pasó: notas de un cliente terminaron en el proyecto de otro).

> Si me ves mencionar un cliente desde la carpeta equivocada, Claude te lo va a avisar y a ofrecer cambiarse. Hazle caso.

## 4.2 El mapa de proyectos: `~/Hub/`

Toda la operación está indexada en `~/Hub/`:

- **`~/Hub/projects.md`** — índice maestro: dónde vive cada repo, su stack, su estado, su git.
- **`~/Hub/clients/<cliente>.md`** — brief por cliente.

Cuando no sepas dónde está algo de un cliente, dile a Claude *"lee el Hub y dime dónde está el repo de X"*. Ese es el punto de partida.

## 4.3 Los dos niveles de CLAUDE.md

`CLAUDE.md` son instrucciones que Claude lee solo. Hay dos:

1. **Global** (`~/.claude/CLAUDE.md`) — aplica a TODO. Aquí viven mis reglas universales (idioma, identidad, deploys, etc.).
2. **Por proyecto** (`<repo>/CLAUDE.md`) — reglas de ese cliente.

Reglas globales que ya están definidas y debes respetar:

| Regla | Detalle |
|---|---|
| **Idioma** | Claude responde en **español mexicano (tú)**. Nada de voseo argentino ni formas de España. |
| **Firma de entregables** | Los entregables a cliente se firman con **tu-cuenta@tu-dominio.com + www.karmacreativelab.com**, NO con kar@kmco.io. |
| **Deploys** | Vercel bajo el handle **`<tu-handle-de-vercel>`** (`npx vercel`). |
| **Identidad de marca** | Sistema de diseño **brutalista** por defecto (alto contraste, bordes gruesos, sombras duras) — salvo que el cliente tenga su propio sistema. |
| **Gate de cliente** | Si mencionas un cliente desde la carpeta equivocada, Claude lo señala y ofrece cambiarse. |

## 4.4 La memoria de Claude

Claude guarda "memorias" (hechos persistentes) por proyecto, en `~/.claude/projects/<proyecto>/memory/`. Ahí están datos que no se deducen del código: IDs de cuentas de anuncios, decisiones, pendientes, preferencias.

- Tú no las editas a mano; Claude las escribe cuando algo merece recordarse.
- Si Claude propone recordar algo, está bien. Si algo cambió, dile *"actualiza la memoria de X"*.
- Cada conversación arranca con un índice (`MEMORY.md`) cargado, por eso Claude "ya sabe" cosas de sesiones pasadas.

## 4.5 Stacks que vas a ver

| Tipo | Detalle |
|---|---|
| **Shopify (temas)** | Varios clientes (Kabrita, Niko Niko, karma-theme). Integración **Shopify ↔ GitHub activa**: hacer push = deploy. Cuidado con eso. |
| **Vercel** | Backends, formularios, tracking. Deploy con `npx vercel` (handle `<tu-handle-de-vercel>`). |
| **PrestaShop** | Estación Mascota (NO es Shopify). |
| **Propuestas/decks** | HTML 16:9 → PPTX editable nativo. Las propuestas son decks de slides, no documentos long-form. |

## 4.6 Formato de entregables (importante)

- Las **propuestas** son **decks de slides 16:9** + su **PPTX editable nativo**. Incluso el HTML se estiliza como slides, no como página de texto corrido.
- Los **post-mortems** son decks 1920×1080 en el sistema visual del cliente, exportados a PPTX. Usa el skill `post-mortem` (y antes, `post-mortem-consulta` para los datos).
- Respeta el sistema visual de CADA cliente (colores, fuentes). Los skills `ckm-*` y `post-mortem` ya los conocen.

## 4.7 Comandos/flujos que más uso

- `/post-mortem-consulta` → `/post-mortem` — cierre mensual de un cliente de paid media.
- `/code-review` — revisar cambios de código antes de subirlos.
- `/deep-research` — investigación multi-fuente con fuentes citadas.
- `/schedule` — programar tareas recurrentes (ej. el borrador de post-mortems cada mes).
- Describir la tarea en lenguaje natural y dejar que Claude elija el skill.

## 4.8 Hábitos que pido

1. **Abre la carpeta correcta antes de trabajar** (regla #1).
2. **Lee el Hub** cuando no sepas dónde está algo.
3. **No subas llaves/credenciales a Git.** Revisa el `.gitignore`.
4. **Cuidado con push en repos Shopify** — se deployean solos.
5. **Verifica antes de afirmar.** Si un dato/archivo se menciona en memoria, confírmalo antes de actuar.
6. **Firma los entregables con el correo de Karma**, no con el personal.
7. Cuando termines algo grande, pídele a Claude que **actualice la memoria** del proyecto.

## ✅ Listo

Con esto tienes mi forma de trabajar completa: entorno (01), skills (02), conectores (03) y método (04). Cualquier duda, pregúntame — o pregúntale a Claude *"lee el onboarding en onboarding-angel/ y explícame X"*.

Bienvenido a Karma 🖤
