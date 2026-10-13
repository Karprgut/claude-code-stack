# Hub — router de proyectos de <Tu Nombre>

Esta carpeta es un **índice/router**, no un workspace donde vive código. Úsala para:
- Planear o cruzar información entre clientes
- Averiguar en qué repo vive un cliente
- Poner al día una sesión nueva sobre todo el portafolio
- Consultar qué se conversó antes (`bitacora/`)

Para trabajo de implementación, `cd` al repo del cliente primero. Ahí toma el control la
memoria por proyecto y el `CLAUDE.md` de ese repo si tiene.

*Última verificación contra disco: <fecha>.*

## Mapa de proyectos

| Cliente / proyecto | Tipo | Ubicación | Git remote | Actividad |
|---|---|---|---|---|
| **Cliente A** | Sitio Shopify | `~/Trabajo/cliente-a` | `org/cliente-a` `main` | activo |
| **Cliente B** | Paid media + reporteo | `~/Trabajo/cliente-b` | `org/cliente-b` `main` | activo |
| **Producto propio** | App Next.js | `~/Trabajo/producto` | `tu-usuario/producto` `main` | activo |

Detalle completo, incluyendo directorios de memoria y deuda pendiente: [projects.md](projects.md).

## Briefs por cliente
[Cliente A](clients/cliente-a.md) · [Cliente B](clients/cliente-b.md)

## Secretos y variables de entorno

[secrets.md](secrets.md) es el mapa cruzado de las variables de entorno de todos los proyectos:
qué variable vive en qué archivo, cuál copia es la canónica y cuáles divergen. **No contiene valores.**

**La ruta barata es el CLI, no el archivo.** `secret where VAR` cuesta ~64 tokens y te dice en qué
archivos vive la variable y si las copias coinciden; `secret get VAR [slug]` te da el valor. Úsalos
en lugar de abrir un `.env`, que cuesta ~1,200 tokens y además no te dice cuál copia es la canónica.

## Dónde está cada capa de contexto

| Capa | Ubicación | Se carga… |
|---|---|---|
| Global (mínima) | `~/.claude/CLAUDE.md` | en **toda** sesión |
| Router del portafolio | `~/Hub/` | al arrancar desde `~/Hub`, o leyéndolo bajo demanda |
| Memoria por proyecto | `~/.claude/projects/<cwd-slug>/memory/` | al arrancar desde ese cwd exacto |
| Contexto del repo | `<repo>/CLAUDE.md` | al arrancar desde ese repo |
| Skills | `~/.claude/skills/` | bajo demanda vía la herramienta Skill |
| Secretos (mapa) | `~/Hub/secrets.md` | bajo demanda; sin valores |
| Secretos (valores) | `~/.secrets/` | vía `secret get`, nunca se leen completos |

## Reglas de operación

1. **`cd` primero, luego trabaja.** La memoria está indexada por cwd. Trabajar el cliente X desde
   el cwd del cliente Y contamina la memoria de Y.
2. **Las ediciones del Hub se quedan en el Hub.** Lo de nivel portafolio va a `clients/<cliente>.md`;
   los detalles de implementación van a la memoria del repo.
3. **No dupliques.** Si un dato ya vive en memoria, apunta a él desde el brief.
4. **Verifica antes de afirmar.** Si vas a citar una ruta o un remote, confírmalo contra el disco.
5. **Los secretos se renuevan en el vault, no en el `.env`.** Editas `~/.secrets/tenants/<empresa>.env`,
   corres `secret sync --all`, y actualizas Railway/Vercel aparte.

## Mantenimiento
Toca el Hub cuando: se mueva un repo o cambie su remote · entre o salga un cliente · detectes un
archivo de memoria en el directorio equivocado.
