# <Cliente> — brief

*Hoja de punteros. Si un dato vive en la memoria del repo, apunta a él, no lo copies.*

## En una línea
Qué hace el cliente, qué le hacemos nosotros, desde cuándo.

## Dónde vive
| Qué | Ruta | Remote / rama |
|---|---|---|
| Repo principal | `~/Trabajo/<cliente>` | `org/<cliente>` `main` |
| Entregables | `~/Trabajo/propuestas/<Cliente>/` | `org/propuestas` `propuestas` |
| Memoria | `~/.claude/projects/-Users-<usuario>-Trabajo-<cliente>/memory/` | — |

## Stack y cuentas
- Plataformas de pauta: Meta (`act_<ID>`), Google Ads (`<CUSTOMER_ID>`), TikTok (`<ADVERTISER_ID>`)
- Analítica: GA4 `<GA4_PROPERTY_ID>`, perfil MCP `google-analytics-<cliente>`
- Dónde están los tokens: `secret where META_TOKEN_<CLIENTE>`

## Reglas específicas
- Lo que no se negocia con este cliente (formato, moneda, idioma, firma).

## Estado y pendientes
- Última actividad: <fecha>
- Pendientes: qué, de quién depende, desde cuándo

## Recuerdos clave (apuntadores a memoria)
- `project_<cliente>_<tema>` — una línea de qué dice
