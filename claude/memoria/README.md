# Memoria por proyecto

Claude Code guarda memoria en `~/.claude/projects/<cwd-slug>/memory/`, donde `<cwd-slug>` es la
ruta del directorio de trabajo con los `/` cambiados por `-` (`/Users/ana/Trabajo/acme` →
`-Users-ana-Trabajo-acme`). Se carga solo cuando arrancas desde ese cwd exacto. Por eso la
regla del Hub: `cd` al repo del cliente antes de trabajar.

## Formato: un archivo = un hecho

```markdown
---
name: slug-corto-en-kebab
description: una línea que sirve para decidir si este recuerdo es relevante
metadata:
  type: user | feedback | project | reference
---

El hecho. Para feedback y project, sigue con:
**Why:** por qué importa.
**How to apply:** cómo se usa la próxima vez.
Enlaza recuerdos relacionados con [[otro-slug]].
```

| type | Qué guarda | Ejemplo |
|---|---|---|
| `user` | quién es el usuario: rol, experiencia, preferencias | "habla en femenino: 'quedo atenta', nunca 'atento'" |
| `feedback` | correcciones y enfoques confirmados, con el porqué | "nunca citas textuales con atribución en un entregable" |
| `project` | trabajo en curso, decisiones, restricciones que el código no cuenta; fechas absolutas | "la pestaña `v2` del plan es la viva; la anual está vieja" |
| `reference` | punteros a recursos externos | "el launcher de GA4 vive en ~/.config/google-analytics-mcp/" |

## `MEMORY.md`: el índice

Un archivo por carpeta de memoria con **una línea por recuerdo**: `- [Título](archivo.md) — gancho`.
Es lo que se carga al inicio de cada sesión; el contenido de cada recuerdo se lee bajo demanda.
Nunca pongas el contenido en el índice: crece hasta que ya no cabe.

## Lo que aprendí operándola

- **Fechas absolutas.** "Ayer" en un recuerdo no significa nada tres semanas después. Convierte
  todo a fecha (`13-oct-2026`).
- **No guardes lo que el repo ya cuenta.** Estructura del código, commits pasados, el `CLAUDE.md`.
  La memoria es para lo que NO se deduce del disco: por qué se decidió algo, qué intentó y falló,
  qué está pendiente y de quién depende.
- **Un recuerdo equivocado es peor que ninguno.** Si descubres que algo cambió, actualiza o borra
  el archivo en vez de agregar otro que lo contradiga.
- **Cuando un cwd se mueve, la memoria se queda atrás.** Al mover un repo, mueve también su
  carpeta de memoria al slug nuevo, o Claude arranca con amnesia.
- **Respáldala.** Las memorias son lo único de `~/.claude/` que no se puede reconstruir. Ver
  [../gitignore-bloqueo/](../gitignore-bloqueo/).

La [plantilla](plantilla.md) es un recuerdo tipo `project` listo para llenar.
