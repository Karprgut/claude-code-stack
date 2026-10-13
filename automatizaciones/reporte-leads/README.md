> **Ejemplo real.** Es la rutina de un cliente de la agencia (TBP, estudio de branding) con los identificadores quitados. Los tiers, pipelines y el diseño son suyos; el patrón (`run.sh` + `build.py` + `ingesta.py` + subida de conversiones) es lo replicable. Ver [../README.md](../README.md).

# Leads TBP — reporte diario

Cada mañana a las **8:30** se regenera el reporte de leads de TBP y se republica
sobre el mismo artifact, así que el link nunca cambia:

👉 https://claude.ai/code/artifact/<ID>

El reporte muestra **el mes en curso** con su comparativa contra el mes anterior.
El 1° de cada mes arranca solo con el mes nuevo; no hay que tocar nada.

## Qué hace

| paso | qué pasa |
|---|---|
| `build.py` | Baja contactos y deals de **Brevo CRM** + gasto de **Meta Ads**, clasifica cada lead y escribe `out/leads-tbp.html` |
| `run.sh` | Corre el build y luego un `claude -p` que republica ese HTML en el artifact |
| launchd | `io.ejemplo.tbp-leads` dispara `run.sh` a diario |

Todo se trae **por API con credencial, nunca por MCP**: una rutina desatendida que
llama un conector MCP se cuelga en silencio.

## Operación

```bash
cd ~/Trabajo/Karma\ Creative\ Lab/tbp-leads

./run.sh                      # corre todo y publica (lo mismo que hace launchd)
./run.sh --solo-build         # regenera el HTML sin publicar, para revisar
python3 build.py --mes 2026-08   # rehacer un mes cerrado
open out/leads-tbp.html       # ver el resultado local

tail -f logs/$(date +%F).log  # qué pasó hoy
launchctl list | grep tbp     # ¿está cargada la rutina?
```

Apagar o prender la rutina:

```bash
launchctl unload ~/Library/LaunchAgents/io.ejemplo.tbp-leads.plist   # apagar
launchctl load   ~/Library/LaunchAgents/io.ejemplo.tbp-leads.plist   # prender
```

Para cambiar la hora, edita `StartCalendarInterval` en ese plist y recarga.
Si la Mac está dormida a las 8:30, launchd corre la rutina al despertar.

## Credenciales

Viven en `~/.config/tbp-leads/env` (modo 600), fuera de cualquier repo:

| llave | qué es |
|---|---|
| `BREVO_API_KEY` | Cuenta Brevo de TBP (`contacto@cliente.com`) — leads y deals |
| `META_TOKEN_TBP` | System User token de Meta — espejo del que usa Flint |
| `META_ACCOUNT_TBP` | `act_<ID>` (The Branding People) |
| `ARTIFACT_URL` | El artifact que se republica |

Si el token de Meta caduca, el log dice `falló .../insights`; renuévalo en el
mismo lugar donde vive el de Flint y actualiza las dos copias.

## La identidad es la de TBP, no la de KCL

El reporte va vestido con el design system del cliente, que vive en:

    ~/Trabajo/Karma Creative Lab Shopify/propuestas/TBP/Post-Mortem-Agosto/TBP Design System/

Léelo antes de tocar el diseño — `README.md` y `colors_and_type.css` son la fuente.
Lo que manda:

- **Vessel blue `#1F2F8C` es el fondo**, no un acento: el azul es la marca. Crema
  `#F2EEE6` para la tipografía. La tabla invierte a crema con ink `#111`.
- **Dos familias, ninguna tercera:** Bodoni Moda (display, uppercase) + Inter Tight.
  Se cargan de Google Fonts; el DS advierte que son sustitutos de las licenciadas
  (ITC Garamond Condensed y la humanista de producción). Si alguien pide las reales,
  hay que inlinearlas como data URI.
- **Chrome a radio 0; solo los tags son pills de 999.** Sin sombras, sin gradientes,
  sin texturas: el estudio es plano.
- **Sin emoji, nunca** — ni nuestro ni del lead. `limpia()` en `build.py` los quita
  del texto que pegan en el formulario y recorta los monólogos a 105 caracteres.
- Tema único a propósito: el azul no se apaga en modo oscuro. El DS reserva el
  inverse-mode negro para frames editoriales, y un reporte de cuenta no lo es.

Los assets copiados del DS están en `assets/` (`logo.svg`, `tbp-tokens.css` como
referencia). Si el DS cambia, vuelve a copiarlos desde la carpeta de arriba.

## Cómo se clasifica la calidad

Es una heurística sobre lo único que el lead escribió con sus manos
(`TELL_US_ABOUT` del formulario). Está en `calidad()` dentro de `build.py`:

- **Muy buena / Buena** — escribió un brief real (≥45 caracteres con contenido).
- **Media** — eligió una opción del menú del form ("Scale my business") o escribió muy poco.
- **Baja** — una o dos palabras sueltas.
- **Spam** — su propio nombre, un teléfono, un link, un saludo o cadena de bendiciones, o basura explícita.
- **Sin señal** — el instant form de septiembre no tiene campo abierto: nunca le preguntaron. No es spam.

Los registros de prueba (`verify_setup`, correos del dominio de la agencia) se
excluyen del conteo y se anotan al pie de la tabla.

La tabla va **ordenada por calidad**, no por fecha: arriba a quién hay que llamar.
Dentro de cada grupo manda la antigüedad — el que lleva más tiempo esperando sube.
El orden vive en `ORDEN_CALIDAD` en `build.py`.

**Es una primera pasada, no un veredicto.** Si un lead quedó mal clasificado,
ajusta las listas `CHARLA` / `BASURA` / `OPCIONES_FORM` arriba de `calidad()`.

## Contacto, folders y atribución

- **El nombre del lead es un `mailto:`** con asunto prellenado, y debajo va el correo
  en claro (`user-select:all`, un clic lo selecciona entero). Si el `mailto:` no abre
  el cliente de correo — el artifact corre en un iframe con sandbox y puede bloquearlo —
  el correo visible sigue siendo copiable. Esa es la razón de tener las dos cosas.
- **Baja, Sin señal y Spam se pliegan** en grupos que abren al clic (`button.fold` +
  el JS del final del HTML, unas quince líneas). La tabla abre mostrando solo lo que
  hay que trabajar, pero dice cuántos hay escondidos en cada grupo.

### Atribución: siempre al primer contacto

La columna **Primer contacto** no dice por qué formulario entró el lead, sino qué
canal lo tocó primero. `atribucion()` junta todos los rastros con la hora en que
ocurrió cada uno, ordena, y se queda con el más temprano. Los demás canales quedan
anotados como asistencias y **no cambian el crédito**.

| rastro | qué es | trae hora propia |
|---|---|---|
| `FORM_ID` / `AD_NAME` sin landing | lead form de Meta: el contacto pasó dentro de la app | no, se usa el registro |
| `FBC` | click id de Meta — clic en un anuncio | **sí**, `fb.1.<ms>.<id>` |
| `UTM_SOURCE=google` o `gclid` | Google Ads | no |
| `GA_CLIENT_ID` | client id de GA4 — **primera visita al sitio** | **sí**, `<random>.<epoch>` |
| `FBP` | cookie de Meta — primera visita al sitio | **sí** |

Las dos últimas son la clave: traen dentro la marca de tiempo de la *primera* visita,
no de la última. Con eso:

- Si el clic al anuncio y la primera visita caen en la misma ventana (2 h), el canal
  de ese anuncio es el primer contacto, aunque la persona haya llenado el formulario
  días después. Es el caso de una lead: clic en Meta el 18-sep 18:11, formulario el 19
  a las 02:15 → **Meta**, aunque para el CRM sea "webform" y para Meta no sea una
  conversión de lead form.
- Si la primera visita es **anterior** a cualquier campaña que sepamos leer, el canal
  queda como **Sin identificar** y la campaña baja a asistencia. Colgárselo a la
  campaña sería inventar un first click que no vimos.

### El trackeo se revisa en cada corrida

`señales()` compara cuántos registros del webform llegan sin ningún rastro de origen:

- **todos sin rastro** (y son 3 o más) → hallazgo de acción inmediata: el tracking
  del sitio se rompió.
- **más del 60%** → aviso de atribución incompleta.

`out/resumen.json` guarda `por_canal_primer_contacto` y `trackeo` en cada corrida,
así que el log diario deja el histórico sin tener que abrir el HTML.

## Los hallazgos son reglas, no opinión

`señales()` revisa cinco cosas y publica las tres primeras que apliquen:

1. Deals que cayeron en un pipeline que no es el de su tier (el bug de Brand Applications).
2. Que ningún deal haya pasado de Seguimiento habiendo leads buenos.
3. Un solo anuncio cargando el mes mientras los demás de captación gastan sin traer leads
   (los `eng_*` se excluyen: persiguen engagement, no leads).
4. Deals sin contacto vinculado.
5. Cambio del costo por lead contra el mes anterior.

Si quieres hallazgos redactados con criterio en vez de por regla, pídeselo a
Claude sobre el HTML del día — `out/resumen.json` trae los números ya masticados.

## Ojo con el link compartido

El artifact está compartido "con cualquiera que tenga el link", pero quien lo
abra sigue viendo **la versión anclada**, no la última. Para que el cliente vea
las actualizaciones diarias hay que mover el pin de compartir una vez desde el
menú de la página. Mientras no se mueva, la rutina actualiza el artifact pero el
link público se queda en la versión vieja.


## Conversiones de Google Ads desde el CRM (12-oct-2026)

`subir_conversiones_google.py` sube a Google Ads los leads web de Brevo que traen click id de
Google (`GCLID` / `GBRAID` / `WBRAID`, o parseado de `LANDING_PAGE` / `REFERRER` para leads viejos).
`run.sh` lo llama cada lunes antes de publicar el reporte; si falla, el reporte sale igual.

- Destino: acción "Lead CRM (Brevo)" (importación de clics, id <CONVERSION_ACTION_ID>, creada el 12-oct-2026; la "Zapier" original se eliminó ese mismo día) de la cuenta <CUSTOMER_ID>. Es la ÚNICA acción primaria de la cuenta: la etiqueta del sitio, la importada de GA4 y el lead form quedaron como secundarias para no contar un lead dos o tres veces.
- Vía: Data Manager API. Exige el scope `https://www.googleapis.com/auth/datamanager` en el
  refresh token de `flint/dashboard/.env.local`; se renueva con
  `python3 ~/.config/tbp-leads/authorize-google-ads.py`.
- `--dry` valida sin registrar; `--desde YYYY-MM-DD` cambia la ventana; bitácora en
  `out/.conversiones-google.json` (Google además deduplica por clic + acción).
- Un id recortado por el límite de 250 caracteres de Brevo se descarta solo; por eso una lead
  (16-sep) sube con su `gbraid`, que sí quedó completo.
