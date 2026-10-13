# La capa de Claude

Claude Code carga contexto en capas. Esta carpeta tiene mi versión de cada una, lista para copiar.

| Capa | Dónde vive en tu Mac | Se carga… | Aquí |
|---|---|---|---|
| Global (mínima) | `~/.claude/CLAUDE.md` | en **toda** sesión | [CLAUDE.md](CLAUDE.md) |
| Settings | `~/.claude/settings.json` | siempre | [settings.example.json](settings.example.json) |
| Router del portafolio | `~/Hub/` | al arrancar desde ahí, o leyéndolo bajo demanda | [hub/](hub/) |
| Memoria por proyecto | `~/.claude/projects/<cwd-slug>/memory/` | al arrancar desde ese cwd exacto | [memoria/](memoria/) |
| Skills | `~/.claude/skills/` | bajo demanda, por la herramienta Skill | [../skills/](../skills/) |
| Secretos (mapa) | `~/Hub/secrets.md` | bajo demanda; sin valores | [secretos/](secretos/) |
| Secretos (valores) | `~/.secrets/` | vía `secret get`, nunca se leen completos | [secretos/](secretos/) |

## La regla que ordena todo: `cd` primero, luego trabaja

La memoria está indexada por directorio de trabajo. Si trabajas el cliente X desde la carpeta del
cliente Y, los aprendizajes de X se guardan en la memoria de Y y la siguiente sesión de Y
arranca contaminada. Me pasó dos veces antes de escribir la regla en el `CLAUDE.md` global:
cuando el usuario menciona un cliente desde una carpeta que no es la suya, Claude lo dice una
vez y ofrece cambiarse.

El **Hub** existe para que eso sea barato: es un índice que dice en qué carpeta vive cada
cliente, con qué remote y qué stack. No guarda código. Se consulta desde cualquier cwd.

## `CLAUDE.md` global: mantenlo mínimo

Se inyecta en cada conversación, sin importar la carpeta. Cada línea cuesta tokens en todas las
sesiones del día. Lo que es específico de un cliente va al `CLAUDE.md` de ese repo o a su memoria;
lo que es específico de un flujo va a una skill. El global solo dice quién eres, en qué idioma
respondes, dónde está el mapa y la regla del `cd`.

## `settings.json`

Lo que vale la pena fijar:

- `model` y `modelSettings.*.effortLevel`: el modelo por defecto y el esfuerzo de razonamiento.
- `env.MCP_TIMEOUT`: los MCP de Google tardan en arrancar; sin esto Claude los da por muertos.
- `permissions.allow`: los comandos que ya no quieres aprobar a mano. La lista se construye sola
  con el tiempo (o con `/fewer-permission-prompts`); en el ejemplo van los genéricos.
- `autoMode.allow`: excepciones explícitas para el modo automático, redactadas en lenguaje
  natural. Es la forma de decirle "este header con este token hacia este dominio es mío".

## Respaldo

`~/.claude/` guarda transcripciones (cientos de MB), sesiones y cachés de autenticación. Nada de
eso se versiona. Lo único irreconstruible son las skills escritas a mano y las memorias; para
eso está el [`.gitignore` por bloqueo](gitignore-bloqueo/): `~/.claude/` es un repo privado
cuyo `.gitignore` bloquea todo y abre solo `skills/`, `CLAUDE.md` y `projects/*/memory/`.
