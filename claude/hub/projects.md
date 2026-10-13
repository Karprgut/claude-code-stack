# Projects — índice único de verdad

**Última verificación contra disco: <fecha>.** Todo lo de abajo (remotes, ramas, fechas de último
commit, conteos de memoria) se leyó del filesystem ese día, no se heredó de la revisión anterior.

## Índice rápido

| Proyecto | Ubicación | Git remote | Rama | Último commit | Brief |
|---|---|---|---|---|---|
| **Cliente A** | `~/Trabajo/cliente-a` | `org/cliente-a` | `main` | 2026-10-01 | [cliente-a](clients/cliente-a.md) |
| ↳ sub-repo | `~/Trabajo/cliente-a/reportes` | `org/cliente-a-reportes` | `main` | 2026-09-15 | ↑ |
| **Utilidades sueltas** | varias, sin git | — | — | — | [utilidades](clients/utilidades.md) |

## Cambios importantes desde la revisión anterior (<fecha anterior>)

1. Qué estaba mal en el índice y quedó corregido.
2. Repos que aparecieron y el Hub nunca listó.

## Directorios de memoria por proyecto

La memoria está indexada por cwd (`~/.claude/projects/<cwd-slug>/memory/`). Estado real hoy:

| Proyecto | Directorio | Memoria | Transcripts |
|---|---|---|---|
| Cliente A | `-Users-<usuario>-Trabajo-cliente-a` | 12 archivos | 30 |
| Cliente A *(cwd viejo)* | `-Users-<usuario>-cliente-a` | 8 archivos | 0 |

### Deuda pendiente en memoria
- **Cliente A quedó partido en dos cwd.** La memoria útil está en el slug viejo. Consolidar.

## Bitácora de conversaciones

`~/Hub/bitacora/` guarda el registro destilado de todas las sesiones en disco. Cómo regenerarla:
ver [README.md](README.md).
