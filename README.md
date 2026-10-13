# Claude Code Stack

Cómo tengo armado **Claude Code** para operar una agencia de marketing (paid media, reporteo,
entregables, automatizaciones) con varios clientes y varias identidades a la vez. Todo lo que
está aquí lo construí yo, lo uso a diario, y está limpio de credenciales y de datos de clientes
para que cualquiera lo pueda replicar.

No es un framework. Es un conjunto de piezas pequeñas, cada una con su README, que se pueden
tomar por separado:

| Carpeta | Qué hay | Empieza por |
|---|---|---|
| [`claude/`](claude/) | La capa de configuración: `CLAUDE.md` global mínimo, `settings.json`, formato de memoria, el **Hub** (router de proyectos), el **vault de secretos** y el `.gitignore` por bloqueo | [claude/README.md](claude/README.md) |
| [`mcp/`](mcp/) | **MCP multi-cuenta**: un launcher por perfil para Google Ads, GA4, Google Workspace y Shopify, más la receta de los MCP remotos (TikTok, Scrape Creators, Adyntel, ZenRows, Higgsfield) | [mcp/README.md](mcp/README.md) |
| [`skills/`](skills/) | 14 skills propias: inteligencia competitiva, post-mortems, entregables, decks, banners, video, auditoría de planes de medios, scraping, recorte de stickers y el design system de la agencia con su playbook DOM→PPTX | [skills/README.md](skills/README.md) |
| [`automatizaciones/`](automatizaciones/) | Rutinas desatendidas con **launchd + `claude -p`** que republican un artifact cada día: reporte de leads, radar de demanda en LinkedIn, monitor de pauta | [automatizaciones/README.md](automatizaciones/README.md) |
| [`kcl/`](kcl/) | Lo que vive en los repos de la agencia: tracking server-side de Shopify (Meta CAPI + TikTok), **Estrategia Inmediata** (producto que se compra en la tienda: motor de reglas + Claude + extensión de checkout), scheduler de redes, generador de case studies, CLI de Google Ads, formulario de discovery y el webhook de leads con atribución al primer contacto | [kcl/README.md](kcl/README.md) |
| [`flint/`](flint/) | La capa de Claude de **Flint**, mi centro de mando: el `CLAUDE.md` que convierte a Claude Code en el agente, sus subagentes, el CLI de Mongo, **Claude Code como worker** con cola de tareas aprobadas, la ingesta nativa de Meta/Google/TikTok, el agente de insights de paid media y el chat multi-proveedor con herramientas | [flint/README.md](flint/README.md) |
| [`herramientas/`](herramientas/) | Cosas sueltas que no son de Claude pero viven en el mismo flujo: el **Centinela** (avisa si alguien más usa tu Mac), un editor de PDF en el navegador, un verificador de correos y un tablero de vacantes que lee Gmail | [herramientas/README.md](herramientas/README.md) |
| [`docs/`](docs/) | Las lecciones que costaron caro (APIs, PDF, PPTX, launchd, MCP) y la lista de productos que viven en sus propios repos | [docs/lecciones.md](docs/lecciones.md) |

El kit de onboarding con el que un integrante nuevo deja su máquina igual a la mía en una hora
(VS Code + Claude Code, skills, MCPs, forma de trabajar) está en [claude/onboarding/](claude/onboarding/).

## Los cinco principios que atraviesan todo

1. **Una entrada de MCP = una identidad.** Nunca un servidor "que ve todo". Cada cuenta de Google,
   cada tienda de Shopify, cada advertiser de TikTok es un perfil con su propio launcher y su
   propio archivo de credenciales. Así una sesión no puede confundir clientes.
2. **El `.env` es la única fuente de verdad del secreto.** Los launchers leen el `.env` del proyecto
   en cada arranque. Ni la config de Claude ni ningún repo guardan copias. Cuando renuevas un
   token, lo renuevas en un solo lugar.
3. **Lo desatendido va por API con credencial, nunca por MCP.** Una rutina de launchd que llama
   un conector MCP se cuelga en silencio. Los MCP son para la sesión interactiva.
4. **La salida estructurada es la única prueba.** `claude -p` sale con código 0 aunque no haya
   hecho nada. Las rutinas exigen un JSON con `publicado: true` y un número de versión mayor al
   anterior; si no, es fallo y suena una notificación.
5. **El `.gitignore` bloquea todo y abre excepciones.** Enumerar lo prohibido falla con el primer
   nombre que nadie anticipó (`Copia de .env.local.bak`). Bloquear todo falla hacia el lado seguro.

## Replicarlo en 20 minutos

```bash
git clone https://github.com/Karprgut/claude-code-stack.git
cd claude-code-stack

# 1. Capa de Claude: CLAUDE.md global y settings
cp claude/CLAUDE.md ~/.claude/CLAUDE.md            # edita identidad e idioma
cp claude/settings.example.json ~/.claude/settings.json

# 2. Skills: copia (o enlaza) las que te sirvan
for s in ad-intelligence post-mortem sticker-splitter; do
  ln -s "$PWD/skills/$s" ~/.claude/skills/$s
done

# 3. Un MCP multi-cuenta, por ejemplo GA4
mkdir -p ~/.config/google-analytics-mcp
cp mcp/google-analytics/{run.sh,authorize.py} ~/.config/google-analytics-mcp/
python3 ~/.config/google-analytics-mcp/authorize.py mi-cliente   # abre el navegador y registra el servidor
```

Cada carpeta explica sus requisitos. Lo que pide instalación aparte: `pipx` (MCP oficiales de
Google), `node` (Shopify, monitor de pauta, bitácora), `jq` (rutinas), Chrome (PDF).

## Lo que NO está aquí, y por qué

- **Memorias de proyecto** (`~/.claude/projects/*/memory/`): son contexto de clientes. El formato
  sí está documentado en [claude/memoria/](claude/memoria/).
- **Skills ligadas a un cliente o a sistemas internos de un empleador** (planes de medios de un
  cliente con su rate card, el tablero interno de briefs): tienen datos comerciales de terceros.
- **Skills de terceros** que uso pero no escribí (`frontend-design`, `ui-ux-pro-max`, `hyperframes`,
  `agent-reach`, la suite `agency-*`): se instalan desde sus repos.
- **Valores de credenciales**, obviamente. Los archivos `env.ejemplo` traen las llaves vacías.
- **Los repos completos de los productos** (el dashboard y la app iOS de Flint, Prisma, el tema y
  el backend del sitio de la agencia): son privados. Lo replicable de cada uno está en
  [flint/](flint/) y [kcl/](kcl/); el resto está descrito en [docs/productos.md](docs/productos.md).
- **Documentos legales y activos de marca de clientes** (avisos de privacidad, políticas de cookies,
  logos, formularios con su diseño): el código que los usa sí está, con marcadores donde iban.

## Convenciones

- Todo está en **español mexicano**: comentarios, READMEs, mensajes de error. Es el idioma en el
  que opero y en el que Claude me responde (está fijado en `CLAUDE.md`).
- Los nombres de archivo y carpeta también van en español salvo cuando una herramienta exige
  otra cosa (`SKILL.md`, `settings.json`).
- Los marcadores `<CUSTOMER_ID>`, `<ID>`, `<usuario>`, `tu-cuenta@tu-dominio.com` señalan dónde
  iba un valor real que se quitó.

## Licencia

MIT. Úsalo, cámbialo, véndelo. Si te sirve, me gustaría saberlo: [@Karprgut](https://github.com/Karprgut).
