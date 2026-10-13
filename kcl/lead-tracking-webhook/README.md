# TBP · Brevo lead tracking (A + D)

Tracking dual del formulario de contacto del sitio TBP:

- **A · Client-side** — reemplazar el iframe de Brevo por el HTML embed nativo, escuchar el envío y disparar `dataLayer` (GTM), Meta Pixel y Google Ads conversion.
- **D · Server-side** — webhook de Brevo → Vercel Function → GA4 Measurement Protocol + Meta Conversions API (CAPI).

Ambos lados se deduplican vía `event_id` para que no contemos cada lead dos veces.

---

## Arquitectura

```
                       ┌──────────────────┐
                       │  tu-sitio.com      │
                       │  (Webflow)       │
                       │                  │
                       │  ┌────────────┐  │   submit
                       │  │ Brevo HTML │──┼─────────────► sibforms.com
                       │  │  embed     │  │
                       │  └────────────┘  │
                       │       │          │
                       │   listener       │
                       │       │          │
                       │       ▼          │
                       │  dataLayer.push  │  ◄── A · client-side
                       │  fbq('Lead')     │
                       │  gtag('conv')    │
                       └──────────────────┘
                                                 │
sibforms.com ─── webhook ──► Vercel Function ────┤   D · server-side
                              (este repo)        │
                              │ ▲                ▼
                              │ │       GA4 Measurement Protocol
                              │ └────►  Meta Conversions API (CAPI)
                              │
                          dedup event_id
```

---

## Parte A · Client-side (HTML embed + dataLayer)

### A.1 · Obtener el HTML embed desde Brevo

1. Brevo → **Contacts** → **Forms** → abrir el formulario actual
2. Click en **"Share"** o **"Get the form"** (varía por versión)
3. Elegir **"HTML embed code"** (NO el iframe)
4. Copiar el bloque `<form>...</form>` completo + el `<script>` de validación que Brevo añade

### A.2 · Reemplazar en Webflow

1. En Webflow Designer, abrir la página de Home
2. Encontrar el componente que tiene el iframe (`.code-embed-6` con clase `w-iframe`) — está en el slide-over del CTA "Contact"
3. Borrar el `<iframe>` actual
4. Pegar el HTML embed de Brevo en su lugar
5. **Justo después del cierre `</form>`**, pegar el contenido de [`embed-form-snippet.html`](./embed-form-snippet.html) (el bloque `<script>`)
6. Publicar el sitio

### A.3 · Configurar GTM

En GTM (`GTM-XXXXXXX`):

**Trigger:**
- Tipo: Custom Event
- Event name: `lead_form_submit`

**Tags a disparar:**

| Tag | Tipo | Notas |
|---|---|---|
| GA4 Event | Google Analytics: GA4 Event | event_name = `generate_lead`, params = `form_name`, `form_email_hash`, `event_id` |
| Meta Pixel — Lead | Custom HTML | `fbq('track', 'Lead', {...}, {eventID: '{{event_id}}'})` — el `eventID` es clave para dedup con CAPI |
| Google Ads Conversion | Google Ads Conversion Tracking | conversion_label que tengas para "Lead" |

**Variables a crear en GTM:**
- `event_id` → Data Layer Variable, name = `event_id`
- `form_email_hash` → Data Layer Variable, name = `form_email_hash`
- `form_name` → Data Layer Variable, name = `form_name`

---

## Parte D · Server-side (webhook + CAPI/MP)

### D.1 · Deployar la Vercel Function

```bash
cd "~/Trabajo/Karma Creative Lab Shopify/propuestas/TBP/Brevo-Tracking"
npm install
npx vercel deploy --prod
```

Vercel te dará una URL tipo `https://tbp-brevo-tracking.vercel.app`. El endpoint del webhook será:

```
https://tbp-brevo-tracking.vercel.app/api/brevo-webhook?secret=TU_SECRETO
```

### D.2 · Configurar variables de entorno en Vercel

En el dashboard de Vercel del proyecto → Settings → Environment Variables:

| Variable | Dónde sacarla | Notas |
|---|---|---|
| `BREVO_WEBHOOK_SECRET` | Lo inventas tú (string random) | Se valida en el querystring del webhook |
| `GA4_MEASUREMENT_ID` | GA4 Admin → Data Streams → Web → Measurement ID | Empieza con `G-` |
| `GA4_API_SECRET` | GA4 Admin → Data Streams → Web → Measurement Protocol API secrets → Create | |
| `META_PIXEL_ID` | Events Manager → Pixel → Settings | Número largo |
| `META_CAPI_TOKEN` | Events Manager → Pixel → Settings → Conversions API → Generate access token | Token largo |
| `EVENT_SOURCE_URL` | `https://www.tu-sitio.com/` | URL canónica del form |

Después de agregar las variables, redeploy (Vercel lo hace automático en el siguiente push, o manual desde el dashboard).

### D.3 · Configurar el webhook en Brevo

1. Brevo → **Transactional** → **Settings** → **Webhooks** (también en el menú de cada lista)
2. **Add a new webhook**
3. **URL:** `https://tbp-brevo-tracking.vercel.app/api/brevo-webhook?secret=TU_SECRETO`
4. **Events to track:** marcar al menos `Subscription` / `Contact added` (los nombres exactos varían por versión)
5. **HTTP method:** POST
6. **Format:** JSON
7. Guardar

### D.4 · Validar end-to-end

```bash
# Test directo del endpoint (debería responder con 401 sin secret, 200 con secret)
curl -X POST "https://tbp-brevo-tracking.vercel.app/api/brevo-webhook?secret=TU_SECRETO" \
  -H "Content-Type: application/json" \
  -d '{"event":"contact_added","email":"test@example.com"}'

# Ver logs en Vercel
npx vercel logs --prod
```

Después, hacer un envío real desde el form en tu-sitio.com y verificar:
- **GA4** → Reports → Realtime → ver el evento `generate_lead` aparecer
- **Meta Events Manager** → Pixel → Test Events → ver el evento `Lead` con `event_source: server`
- En Meta, ambos deberían deduplicarse por `event_id` (no contar el lead 2 veces)

---

## Estructura del repo

```
TBP brevo tracking/
├── README.md                      ← este archivo
├── embed-form-snippet.html        ← JS que se pega en Webflow después del form (parte A)
├── package.json                   ← deps de la Vercel Function
├── vercel.json                    ← config Vercel
├── .env.example                   ← variables de entorno (para referencia)
└── api/
    └── brevo-webhook.js           ← función serverless (parte D)
```

---

## Decisiones / trade-offs

- **¿Por qué Vercel y no Cloudflare Workers?** Vercel Functions arrancan en Node.js, deploy en una sola línea, free tier amplio. Si en el futuro quieres mover a Workers el código es portable (es solo `fetch` y `crypto`).
- **¿Por qué no se hashea el email del lado del cliente también?** Meta Pixel hashea automáticamente lo que mandas con `em`. Si lo prefieres, hashea client-side antes de mandar a Pixel — el snippet incluye una versión SHA-256 del email vía Web Crypto.
- **Dedup:** mismo `event_id` en client-side (Pixel) y server-side (CAPI). Meta los reconoce como el mismo evento.
- **GA4 client_id:** ideal sería leer la cookie `_ga`. Como el webhook es server-only, usamos un hash del email como pseudo-client-id. Si quieres atribución de sesión correcta, hay que mandar el `_ga` cookie value desde el client-side (vía un campo oculto en Brevo) y propagarlo al webhook — siguiente iteración.
- **Privacidad:** Brevo procesa el lead igual; el webhook solo dispara eventos analíticos. No estás duplicando el lead, solo trackeándolo.

---

## E · Registro de consentimiento (`/api/consent`) — sep-2026

Respuesta al reporte mensual de iubenda (sep-2026). El banner (`public/cookie-consent.js`, v2)
y el form (`brevo-form-tbp.html` → `public/form-injection.js`) mandan una prueba de
consentimiento a `POST /api/consent` (Redis del proyecto, retención 24 meses):

- **type `cookie`** — cada Accept all / Reject all / Save preferences: id anónimo (vive en la cookie
  `tbp_consent`), categorías, versión del banner (`CONSENT_VERSION`) y de la política
  (`POLICY_VERSION`), página, idioma, user agent, país (header de Vercel) y hash salteado de IP.
- **type `form`** — al confirmarse un envío del form: hash SHA-256 del correo, `event_id`, id de
  consentimiento de cookies, versión y texto exacto de la leyenda legal mostrada bajo SEND.

Export (secret = `CONSENT_EXPORT_SECRET` si existe, si no `BREVO_WEBHOOK_SECRET`):

```bash
# JSON del mes
curl "https://tbp-brevo-tracking.vercel.app/api/consent?secret=…&from=2026-09-01&to=2026-09-30"
# CSV
curl -o consent.csv "https://tbp-brevo-tracking.vercel.app/api/consent?secret=…&from=2026-09-01&format=csv"
# Un visitante (id de su cookie tbp_consent) — p. ej. para una solicitud ARCO
curl "https://tbp-brevo-tracking.vercel.app/api/consent?secret=…&id=<uuid>"
# Contadores por mes y acción
curl "https://tbp-brevo-tracking.vercel.app/api/consent?secret=…&stats=1"
```

Otros cambios de la v2 del banner: Accept/Reject con el mismo estilo (igual de visibles), banner
pintado de inmediato (sin depender de rAF), link permanente **Cookie Settings** inyectado en el
footer legal de Webflow (`.pp-disc-termsnc`, junto a Privacy Policy) desde la primera carga, y
`window.dispatchEvent('tbp:consent')` para que `tbp_first_touch` solo se persista en localStorage
con consentimiento de marketing (`GATE_FIRST_TOUCH` en el form).

Política de cookies v2 (`cookie-policy.md` → `cookie-policy.html` → `TBP-Cookie-Policy-2026-09.pdf`)
subida al Asset Manager de Webflow por API con `scripts/webflow-upload-asset.mjs`
(`WF_TOKEN=… node scripts/webflow-upload-asset.mjs <pdf>`). Adenda para el Aviso de Privacidad
de TBP en `Aviso-Privacidad-Adenda-Servicios.md`.

---

## v3 · 15-sep-2026 — seguimiento para la campaña Web Leads

Contexto: la campaña de Meta "TBP - Performance - Web Leads - Sep26" optimiza al evento **Lead** del pixel
`<PIXEL_ID>` (destino sitio). Antes de este cambio, el pixel recibía ~30 Lead/mes por CAPI pero casi
todos eran **re-envíos de leads del formulario instantáneo de Meta** (Zapier los mete a Brevo → `listAddition`
→ webhook → CAPI), no leads del sitio. Eso duplicaba "clientes potenciales del sitio web" en Ads Manager y
contaminaba la señal de la campaña. El form web real trae pocos leads (lista 17: jun 9 · jul 11 · ago 4 · sep 1).

Cambios en `api/brevo-webhook.js` (respaldo en `api/brevo-webhook.v2-sep10.bak.js`):

| Qué | Antes | Ahora |
|---|---|---|
| Fuente del lead | no se distinguía | `GET /v3/contacts/{email}` en Brevo: `FORM_ID`/`EXT_ID` (Zapier) ⇒ `meta_form`; si no ⇒ `web_form` |
| Lead del form de Meta | CAPI Lead (duplicado) | **no va a CAPI** (Meta ya lo tiene como lead nativo); sí va a GA4 atribuido a `CAMPAIGN_NAME/ADSET_NAME/AD_NAME` |
| Lead del sitio con contexto de navegador | `system_generated` + IP/UA del servidor de Brevo | `action_source: website` con `fbp`, `fbc`, `client_user_agent` reales + `em`/`ph`/`fn`/`ln` hasheados |
| Lead del sitio sin contexto | igual | `system_generated` solo con `em`/`ph`/`fn`/`ln` (sin IP/UA falsos) |
| Atribución en el CRM | solo en Redis (30 min) | se escribe en el contacto de Brevo: `UTM_*`, `LANDING_PAGE`, `REFERRER`, `FBP`, `FBC`, `GA_CLIENT_ID` **y** `CAMPAIGN_NAME/CAMPAIGN_ID/ADSET_NAME/AD_NAME` (mismos campos que llena Zapier) |
| GA4 | `generate_lead` | igual + `campaign_id`, `lead_source` (`web_form` / `meta_form`), `form_name` distinto por fuente |
| Pruebas | nada (logs de Vercel duran 1 h) | `?dry=1`: Meta con `test_event_code` (`META_TEST_EVENT_CODE` o `TEST_TBP` → Events Manager › Probar eventos), GA4 por `/debug/mp/collect`, sin escribir en Brevo |

El form (`brevo-form-tbp.html` → `public/form-injection.js`) ahora captura también `utm_id` (first touch) y manda
`user_agent` a `/api/attribution`; `api/attribution.js` los guarda.

Variables nuevas en Vercel (producción): `BREVO_API_KEY` (sensitive). Opcional: `META_TEST_EVENT_CODE`.

Prueba en seco (con el secret del webhook 2167746):
```bash
curl -s -X POST "https://tbp-brevo-tracking.vercel.app/api/brevo-webhook?secret=<SECRET>&dry=1" \
  -H "content-type: application/json" \
  -d '{"event":"list_addition","email":"<email de un contacto de Brevo>","list_id":[17],"date":"2026-09-15 14:00:00","id":1}'
```
Respuesta esperada: `source`, `attribution_hit`, `ga4.validation.validationMessages: []`,
`meta.action_source` (`website` si hubo atribución con fbp/fbc + UA) y `meta.response.events_received: 1`.
Validado el 15-sep con un contacto web (em/ph/fn/ln), un contacto de Meta (CAPI omitido) y un email de prueba
con atribución completa (`website`, em+fbp+fbc+UA).

Límites que siguen: la atribución solo existe si el form del sitio corre con nuestro script (Redis 30 min) y el
first touch se persiste con consentimiento de marketing; sin eso el lead entra igual pero sin UTM ni fbc. Los
leads del **formulario instantáneo** dependen del Zap Meta→Brevo, que sigue apuntando al form archivado
(pendiente manual desde el 14-sep).

## v4 · 17-sep-2026 — fix "generate_lead = Unassigned" en GA4

Causa raíz (verificada con Chrome headless contra el sitio real):

1. **El form del chip flotante no tenía hook de atribución.** El script usaba `document.querySelector('#sib-form')`,
   que siempre toma la primera instancia (pop-up Contact). El chip (2ª instancia, que además se clona al abrirse)
   quedaba con **0 listeners de submit** → leads sin UTM/landing/referrer en Brevo y `generate_lead` por MP con un
   `client_id` inventado → Unassigned.
2. **Parser de la sesión de GA4 roto.** La cookie `_ga_G-…` ya usa formato **GS2** (`GS2.1.s<sid>$o<n>$g…`); el
   código esperaba GS1 y mandaba `s1789…$o1$g0…` como `session_id` → GA4 no podía pegar el evento a la sesión
   (afectaba incluso a leads con atribución completa). Los `campaign_*` del MP no cuentan para fuente/medio.

Cambios:

| Pieza | Antes | v4 |
|---|---|---|
| Hook de atribución (`brevo-form-tbp.html`) | `querySelector('#sib-form')` + listener por form | delegación en `document` (captura) con guard `window.__tbpTrackingDelegated`; cede el hilo y aborta si el listener de validación marcó `e.tbpInvalid` o no hay email |
| Sesión GA4 | GS1 | GS2 y GS1 |
| Watcher de éxito | uno por cada submit (submits fallidos duplicaban conversión/pixel al confirmar) | uno solo por página (`window.__tbpSuccessWatcher`), gana el último submit, ignora paneles ya activos al armar |
| `generate_lead` | solo MP desde el webhook | **client-side** vía el gtag.js de la página (config lazy `G-XXXXXXXXXX`, `send_page_view:false`) → pegado a la sesión real; al éxito `POST /api/attribution {partial, ga_client_sent}` |
| `api/attribution.js` | solo escritura completa | acepta `partial: true` (merge del flag) |
| `api/brevo-webhook.js` | MP siempre | lead web con `ga_client_sent` → **no** MP (`client_side_event_already_sent`); si no lo trae, espera 2.5 s y relee Redis; normaliza `ga_session_id`/`ga_session_number` (acepta GS2 crudo del script viejo cacheado) |

MP sigue siendo la vía para los leads del formulario instantáneo de Meta (nunca pisan el sitio → siempre
Unassigned, por diseño; filtrar por `lead_source`) y para leads web sin JS.

Regresión sin ensuciar datos (bloquea sibforms/GA/Ads/Meta; no crea contactos):
```bash
node scripts/cdp-v4-test.mjs          # con public/ local
node scripts/cdp-v4-test.mjs --live   # contra producción, después de publicar
```
Espera: 0 POST de atribución en submit inválido; 1 en el submit del chip con `ga_session_id` numérico;
al éxito 1 conversión de Google Ads, 1 beacon `en=generate_lead` con `sid`/`cid` reales y 1 `ga_client_sent`.

Respaldos previos: `brevo-form-tbp.v3-sep15.bak.html`, `api/brevo-webhook.v3-sep15.bak.js`.


## v5 · 12-oct-2026 — Google Ads en cero: tres fallas y un camino que no depende del navegador

**Síntoma.** Google Ads no contó una sola conversión, de ninguna acción, desde junio: 0 en
septiembre (635 clics) y 0 en octubre (437 clics). El único lead de Search en dos meses (Andrea,
16-sep, con gbraid y gclid en la landing) nunca llegó a Ads.

**Causas encontradas (las tres eran reales a la vez):**

1. **El `</script>` del check-out de Sprint estaba mal cerrado** en el footer code de Webflow
   (`</script` sin `>`). El navegador se tragaba el bloque de conversión que venía después, así que
   en `/proyectos/sprint` nunca disparó `generate_lead` ni la conversión de Ads. Core y Deep estaban
   bien. Por eso Cristina (Sprint, 3-oct) no existe en GA4 y Lucila (Core, 4-oct) sí.
2. **El parámetro `source: 'client_gtag'`** en el evento de gtag (bloque del check-out y
   `brevo-form-tbp.html`). gtag lo trata como fuente de tráfico: GA4 reescribía la sesión del lead
   como `client_gtag / (not set)` (12 sesiones en octubre), con lo que la conversión importada de
   GA4 a Ads jamás podía atribuirse a `google / cpc`. Se quitó en los dos sitios.
3. **El gclid se perdía al guardarlo.** `LANDING_PAGE` se recorta a 250 caracteres en Brevo y el
   gclid va al final de la URL: el de Andrea quedó mutilado. Ahora `lib/click-ids.js` extrae
   `gclid` / `gbraid` / `wbraid` (campo explícito → landing → referrer) y se guardan en atributos
   propios de Brevo (`GCLID`, `GBRAID`, `WBRAID`, creados el 12-oct), desde `/api/lead` al alta y
   desde el webhook. Redis guarda landing y referrer a 1000 caracteres.

**Camino nuevo, que no depende de consentimiento ni de gtag:** `~/Trabajo/Karma\ Creative\ Lab/tbp-leads/subir_conversiones_google.py`
lee los contactos web de Brevo de los últimos 90 días, toma su click id y lo sube a la acción de
conversión "Zapier" (importación de clics, id 7633634119, ya existía) por la **Data Manager API**.
Google rechazó la vía vieja (`ConversionUploadService`) para integraciones nuevas. Corre cada
lunes dentro de `run.sh`, antes de publicar el reporte.

**Pendiente que solo puede hacer Kar:**
- `npm run deploy` aquí (el deploy a producción lo bloquea el clasificador de la sesión).
- Publicar el sitio en Webflow (el footer de Sprint/Core/Deep ya está guardado en el Designer).
- Reautorizar el token de Google Ads con el scope de Data Manager:
  `python3 ~/.config/tbp-leads/authorize-google-ads.py` (actualiza `GOOGLE_ADS_REFRESH_TOKEN`
  en `flint/dashboard/.env.local`). Si la Data Manager API no está habilitada en el proyecto de
  GCP del client id, habilitarla en console.cloud.google.com.
- Un envío real de prueba en `/proyectos/sprint` entrando con `?gclid=prueba` y verificar
  `generate_lead` en GA4 tiempo real. Nunca se hizo y por eso el arreglo del 1-oct pasó por bueno.


### Prueba de punta a punta (12-oct-2026, noche) y snippet v2

Se hizo por fin el envío real: `/proyectos?gclid=PRUEBA…` → clic a Sprint → formulario con
"Prueba Tracking" (`tu-cuenta+prueba@tu-dominio.com`, brief que dice que se ignore). Resultado:

- `/api/lead` 200 y el contacto en Brevo con `GCLID` completo, landing y referrer. Bien.
- **Pero ni `generate_lead` ni la conversión de Ads salieron.** `dataLayer.push` ya no era el
  nuestro: GTM carga asíncrono y, cuando termina después del footer, reemplaza `push` sin
  encadenar al anterior. El interceptor del bloque se perdía en silencio en cualquier carga
  lenta (por eso a veces sí contaba, como Lucila el 4-oct, y a veces no).
- **v2 del bloque:** ya no envuelve `push`; revisa `window.dataLayer` cada 400 ms buscando
  `lead_form_submit` y deduplica por `event_id` (`window.__tbpLeadsVistos`). Inyectada en la
  pestaña de la prueba, disparó los dos eventos y GA4 tiempo real mostró `generate_lead`.
  Está guardada en el footer de Sprint, Core y Deep; falta publicar el sitio.
- Pendiente menor: las UTM no sobreviven el paso de `/proyectos` al check-out (solo el gclid,
  por `url_passthrough`). El reporte las recupera del referrer, así que no se pierde la
  atribución, pero `UTM_SOURCE` queda vacío en Brevo para esos leads.
- El contacto de prueba disparó el Zap (correo a Javi + deal): borrar los dos a mano.


### 12-oct-2026, madrugada · v5 del check-out, primer toque en /proyectos y dos trampas más

Pruebas de punta a punta 2 y 3 (con UTM + gclid de prueba, aterrizando en /proyectos y pasando al
check-out). Lo que salió y lo que se arregló:

1. **En /proyectos nunca se guardaba el primer toque.** `form-injection.js` solo lo guarda donde
   inyecta el formulario, y en la landing no lo inyecta. Ahora el footer de /proyectos lo guarda
   (`Landing-V5/proyectos-first-touch-snippet.html`), con la misma regla de consentimiento.
2. **Las UTM se perdían entre /proyectos y el check-out.** v4: `utm()` y `clickId()` buscan en la URL
   actual, luego en el primer toque y luego en `document.referrer`, que trae todo sin depender de
   almacenamiento ni consentimiento.
3. **Un comentario con la etiqueta de cierre de script escrita literalmente** (en el vigilante de
   Sprint) cerraba el script ahí: el resto del bloque se pintaba como texto en la página y el
   vigilante no corría. Nunca escribir esa etiqueta dentro de un comentario de JS en Webflow.
4. **El evento submit ya no llega al script.** El formulario tiene `data-turnstile-sitekey` (anti-spam
   de Webflow) y algo a nivel de documento se traga el submit: clic, Enter y `requestSubmit()` no
   disparaban nada, ni siquiera un envío a Webflow. **v5:** el envío se engancha al clic del botón
   (`type=button`, capture) y a Enter; el listener de submit queda solo de respaldo. Probado
   inyectado en Core: lead en Brevo con UTM_SOURCE=google, CAMPAIGN_ID y GCLID; `generate_lead` en
   GA4 tiempo real; conversión de Ads disparada por el vigilante real.

Orden de verificación que ya quedó como rutina: bajar el HTML publicado y contar cierres de script
bien formados; en la pestaña, `'__tbpLeadsVistos' in window` dice si el vigilante corrió; y el envío
se valida en Brevo (atributos), GA4 (tiempo real) y el dataLayer (entradas `generate_lead` y
`conversion`). Leads de prueba: `kar+prueba-tracking@`, `kar+prueba2-tracking@` (no llegó a crearse)
y `tu-cuenta+prueba@tu-dominio.com`; el subidor los excluye. Borrar contactos y deals a mano.

### 13-oct-2026 · El correo del Zap salía con la campaña vacía (a veces)

El Zap "TBP Studio" dispara con "New Contact in List 17" y arma el correo al owner con
`{{CAMPAIGN_NAME}}`, `{{ADSET_NAME}}` y `{{AD_NAME}}`. `/api/lead` creaba el contacto solo con
nombre, tier y click ids; las UTM y la campaña las escribía el webhook unos segundos después
(espera 2.5 s + relectura de Redis). Carrera: si el Zap leía antes, el correo salía sin campaña
(prueba 4); si el webhook ganaba, salía con ella (prueba 3). Ahora `/api/lead` escribe desde el alta
UTM_*, CAMPAIGN_NAME/ID, ADSET_NAME, AD_NAME, LANDING_PAGE, REFERRER, GA_CLIENT_ID, FBP y FBC;
el webhook los reescribe con los mismos valores. Requiere `npm run deploy`.
