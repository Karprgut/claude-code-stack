# Vault de secretos: una fuente de verdad para todos los `.env`

**El problema.** Cuarenta variables repetidas en diez archivos `.env` de cuatro proyectos,
quince de ellas con valores distintos entre copias. Renovar un token significaba editar de dos a
cuatro archivos y adivinar cuál copia era la buena.

**La solución.** Un vault local (`~/.secrets/`, fuera de todo repo) que guarda cada valor una
sola vez y regenera los `.env` byte por byte. Un CLI (`secret`) para consultarlo sin abrir
archivos. Un mapa legible (`~/Hub/secrets.md`) con nombres y hashes, **sin valores**, que sí se
puede commitear.

```
~/.secrets/
  tenants/<empresa>.env    valores compartidos por 2+ archivos de esa empresa, con valor idéntico
  files/<slug>.env         valores propios de un archivo: exclusivos o divergentes del inquilino
  templates/<slug>.tmpl    el .env ORIGINAL con ${VAR} en lugar del valor (conserva comentarios y orden)
  notas/*.env              credenciales sin proyecto asignado todavía
  manifest.tsv             slug → inquilino → ruta destino
```

Detalle de la estructura y precedencia: [VAULT.md](VAULT.md) (es el README que vive dentro de `~/.secrets`).

## Archivos

| Archivo | Qué hace |
|---|---|
| [`secret`](secret) | El CLI. Cópialo a `~/tools/secret` (o a tu PATH) |
| [`build_vault.py`](build_vault.py) | Construye `~/.secrets` a partir de los `.env` vivos. Edita `FILES` con tus rutas |
| [`gen_manifest.py`](gen_manifest.py) | Regenera `~/Hub/secrets.md` desde el vault. Nunca escribe valores |

## El CLI

```sh
secret files                 # el mapa de archivos
secret list [slug]           # nombres de variables, sin valores
secret get VAR [slug]        # UN valor (avisa si hay ambigüedad entre copias)
secret where VAR             # en qué archivos vive y si coinciden (por hash)
secret check                 # divergencias, llaves inválidas y cruces entre empresas
secret diff --all            # ¿el vault sigue reproduciendo los .env en disco?
secret sync --all            # propaga el vault a los .env (respalda antes)
secret notas                 # credenciales sin proyecto asignado
```

## Por qué importa para Claude

`secret where VAR` cuesta ~64 tokens y dice en qué archivos vive la variable y si las copias
coinciden. Abrir un `.env` cuesta ~1,200 tokens, y además no te dice cuál copia es la canónica.
El `CLAUDE.md` del Hub le dice a Claude que use el CLI y nunca lea un `.env` completo.

## Flujo de renovación de un token

```
1. secret where GOOGLE_ADS_REFRESH_TOKEN     # cuántas copias hay y si divergen
2. editar ~/.secrets/tenants/<empresa>.env    # una sola vez
3. secret diff --all                          # que solo cambie lo esperado
4. secret sync --all                          # propagar, respalda antes de escribir
5. actualizar Railway / Vercel a mano         # el vault es local, no toca producción
```

## Lo que descubrió el primer `secret check`

Que dos empresas compartían **la misma app de OAuth de Google Cloud**: revocarla tumbaba el
reporteo de las dos a la vez. El mapa de hashes lo hizo visible sin exponer un solo valor.
