# ~/.secrets — fuente de verdad de las variables de entorno

**Nunca metas esta carpeta a un repo de git.** Permisos: 700 la carpeta, 600 los archivos.

## Estructura

    tenants/<empresa>.env    valores compartidos por 2+ archivos de esa empresa, con valor identico
    files/<slug>.env         valores propios de un archivo: exclusivos o divergentes del inquilino
    templates/<slug>.tmpl    el .env ORIGINAL con ${VAR} en lugar del valor
                             (conserva comentarios, orden y lineas en blanco tal cual)
    notas/*.env              credenciales sin proyecto asignado todavia
    manifest.tsv             slug -> inquilino -> ruta destino

## Como funciona

`secret sync <slug>` toma el template, sustituye desde tenants + files, y escribe el .env
destino. Por construccion reproduce el archivo byte por byte, asi que `secret diff --all`
debe salir siempre en "identico". Si sale distinto, alguien edito un .env a mano.

## Flujo de renovacion de un token

    1. secret where GOOGLE_ADS_REFRESH_TOKEN     # ver cuantas copias hay y si divergen
    2. editar ~/.secrets/tenants/kcl.env         # una sola vez
    3. secret diff --all                         # revisar que solo cambie lo esperado
    4. secret sync --all                         # propagar, respalda antes de escribir
    5. actualizar Railway / Vercel a mano        # el vault es local, no toca produccion

## Precedencia

files/<slug>.env gana sobre tenants/<empresa>.env. Si una variable debe ser distinta en un
archivo, va en su files/. Si debe ser igual en varios, va en el tenant.

El mapa legible (sin valores) esta en ~/Hub/secrets.md y ese si se commitea.
