# Matriz de fuentes

Actualizado 18-sep-2026. Precios y límites cambian; verifica antes de contratar.

---

## Resumen ejecutivo

| Necesidad | Fuente | Costo |
|---|---|---|
| Meta en México | **MCP de Meta** (`ads_library_search`) o **Adyntel** | gratis / $44 mes |
| Meta en UE/España | **API oficial de Meta** — además da reach medido | gratis |
| Google (Search/Display/YouTube) | **Adyntel** `POST /google` | $44 mes |
| TikTok | Adyntel · Commercial Content Library (UE) | $44 mes / gratis |
| Copy de search y PLA | **MCP de Semrush** `paid_search_research` | ya pagado |
| Exploración manual de creativos | BigSpy | $9 mes |
| Publisher · placement · método de compra · CTR ajeno | **AdClarity** (no hay sustituto) | ~$200–500 mes |

---

## 1 · MCP de Meta (primera parada)

Ya conectado. Herramienta: `ads_library_search`.

Sin scraping, sin costo marginal, sin verificación de identidad, y **sí cubre
México** — probado el 18-sep-2026: `search_terms="tarjeta de crédito sin
anualidad"`, `countries=["MX"]`, `ad_active_status=ACTIVE` devolvió
`estimated_total_count: 2755` con anunciantes comerciales reales. **Supera la
limitación UE de la API oficial.** Para cualquier consulta puntual de Meta
empieza aquí.

Parámetros: `search_terms` · `page_ids` · `countries` (ISO-2) ·
`ad_active_status` (ALL/ACTIVE/INACTIVE) · `ad_type` · `limit` (máx. **50**).
Requiere al menos uno de search_terms / page_ids / countries, y que la cuenta
tenga al menos un ad account activo.

⚠️ **El set de campos es más delgado que el de Adyntel.** Devuelve:
`id`, `page_id`, `page_name`, `ad_creative_link_title`, `ad_creation_time`,
`ad_delivery_start_time`, `ad_snapshot_url`, `currency`.

Lo que **no** trae, y por qué importa:

| Falta | Consecuencia |
|---|---|
| `ad_delivery_stop_time` | No hay `last_seen` → **no puedes cerrar la ventana de creativo-días** de un anuncio inactivo |
| cuerpo del anuncio | Sin copy completo para analizar ángulos (solo el título del link) |
| `publisher_platforms` | No separas Facebook de Instagram |

**Cómo se trabaja con eso:** filtra `ACTIVE` y trata la ventana como
`ad_delivery_start_time → hoy`, que para anuncios vivos es correcto. Para
histórico, longevidad de piezas pausadas y copy completo, la ruta sigue siendo
**Adyntel con `status: "all"`** o el polling diario del repo.

Límite de 50 por llamada: sirve para diagnóstico y para el top de una categoría,
no para censar una marca entera.

Complementos útiles del mismo MCP cuando el análisis toca cuentas propias:
`ads_insights_industry_benchmark`, `ads_insights_auction_ranking_benchmarks`,
`ads_insights_performance_trend`.

## 2 · API oficial de Meta Ad Library

```
GET https://graph.facebook.com/v21.0/ads_archive
    ?access_token=…
    &ad_reached_countries=[ES]
    &search_terms=…            (o search_page_ids, máx. 10)
    &ad_active_status=ACTIVE
    &fields=id,page_name,ad_delivery_start_time,ad_delivery_stop_time,
            ad_creative_bodies,ad_creative_link_titles,ad_snapshot_url,
            publisher_platforms,media_type,eu_total_reach
```

⚠️ **El límite que decide todo:** textual de la doc de Meta —

> *"Ads that did not reach any location in the EU will only return if they are
> about social issues, elections or politics."*

**Para México devuelve vacío** en comercial. No la uses ahí ni dejes que nadie
concluya que un competidor "no pauta" con base en esto.

A cambio, en UE/UK regala **`eu_total_reach`** (obligación del DSA): cifra
publicada por la plataforma → **confianza A**, el único punto del sistema donde
no se modela nada. Retención ~12 meses.

Fricción: verificación de identidad con ID oficial, app de desarrollador, y
token que **caduca cada 60 días**.

Países cubiertos: los 27 de la UE + GB.

## 3 · Google Ads Transparency Center

**No tiene API oficial.** Es un endpoint RPC con protobuf-JSON y presupuesto por
IP: desde datacenter se agotan decenas o cientos de llamadas antes de que todo
se vuelva `302 → google.com/sorry`.

Consulta manual (perfectamente válida para verificar):
```
https://adstransparency.google.com/?region=MX&domain=<dominio>
```

Programático → **Adyntel**:
```
POST https://api.adyntel.com/google
{ "api_key": "…", "email": "…", "company_domain": "nu.com.mx",
  "media_type": "video",              // opcional: text | image | video
  "continuation_token": "…" }         // paginación
```
Respuesta: `data.ads[]` con `creative_id`, `format` (Text/Image/Video),
`start`, `last_seen`, `original_url`, `variants[].content`.

El `format` es el mejor proxy de superficie disponible: **Text → Search,
Image → Display, Video → YouTube**. No es el desglose por publisher de
AdClarity, pero separa intención de alcance, que es la distinción que cambia
decisiones de plan.

## 4 · Adyntel — la pieza que desbloquea México

**$44/mes · 5,000 créditos** (~$0.0098 por llamada) · $179/25k · $321/50k ·
50 créditos gratis de prueba. 1 llamada = 1 crédito. Sin cargo si no hay ads.

Catálogo completo, verificado contra su OpenAPI el 18-sep-2026:

| Endpoint | Qué da |
|---|---|
| `POST /facebook` | **Meta (FB+IG) por dominio o página, mundial**, sin verificación de identidad |
| `POST /facebook_ad_search` | Meta por keyword |
| `POST /google` | Google ATC: `text`→Search, `image`→Display, `video`→YouTube |
| `POST /google_shopping` | PLA / Shopping (+ `/google_shopping_status`, **gratis**) |
| `POST /linkedin` | LinkedIn por dominio o page_id, **con modo batch** |
| `POST /linkedin-keyword-search` | LinkedIn por keyword |
| `POST /tiktok_search` | TikTok **por keyword** (+ `/tiktok_ad_details`) |

Tres parámetros que cambian el resultado y es fácil no prender:

- **`active_status: "all"`** en `/facebook` — sin esto solo ves lo activo hoy y
  **no hay `last_seen`**, que es justo lo que cierra la ventana de creativo-días.
- **`extract_text: true`** en `/google` — sin esto Google devuelve la imagen sin
  copy, y te quedas sin materia prima para analizar ángulos de mensaje.
- **`country_code`** en `/facebook` y `/tiktok_search` — es lo que aterriza el
  corte a México.

⚠️ **Trampa de créditos.** `all_ads: true` auto-pagina y, textual de su doc,
*"no hay forma de detenerlo"*. Una página = un crédito. Un dominio con 10,000
anuncios se come el plan de $44 **entero, en una sola llamada**. Acota siempre.

Dos cosas buenas: un **204 (sin anuncios) no se cobra**, y hay webhooks + `jobId`
para pulls largos en asíncrono.

Un matiz de dependencia: el parámetro `data_provider` (`rapidapi` | `apify`)
revela que **Adyntel orquesta proveedores de terceros**, no raspa por su cuenta.
Es un agregador. Baja tu costo y tu riesgo legal, pero encadena tu disponibilidad
a proveedores que no controla ninguno de los dos.

```
POST https://api.adyntel.com/facebook
{ "api_key": "…", "email": "…",
  "company_domain": "nu.com.mx",      // o facebook_page_url (https://…)
  "country_code": "MX",
  "status": "all",                    // active | inactive | all
  "use_continuation_token": true }
```

Pedir `status: "all"` es lo que permite reconstruir histórico y medir longevidad.

**Tienen servidor MCP propio** (`docs.adyntel.com/integrations/adyntel-mcp-server`)
— vale considerarlo como entrada de `/mcp` en lugar de llamar la API a mano.

Lo que se compra es el **mantenimiento del scraping y su riesgo**, no el dato: la
información sigue siendo pública. Eso importa si la salida se le vende a un
cliente — ver el apartado legal abajo.

## 4b · Lo que Adyntel NO cubre (el punto ciego)

Adyntel resuelve la **cobertura de acceso** —poder sacar programáticamente lo que
las bibliotecas ya contienen— pero no la **cobertura de universo**: qué contienen
esas bibliotecas. Son cuatro jardines amurallados. Queda invisible:

| Ausente | Por qué importa en México |
|---|---|
| Display programático (DV360, The Trade Desk, Xandr) | No existe biblioteca pública. Punto ciego total. |
| Native (Taboola, Outbrain, MGID) | Solo lo ve **Anstrex** ($69–219/mes) |
| **Retail media** (Amazon Ads, Mercado Libre Ads, Walmart Connect) | Parte real del mix de e-commerce MX, sin biblioteca |
| Pinterest, Snapchat, Reddit, audio/Spotify | Sin biblioteca o sin API |
| CTV / TV conectada | Requiere panel de Smart TVs — esto sí es AdClarity |

**Cómo se dice en un reporte:** si el competidor es intensivo en programática,
native o retail media, se verá **artificialmente pequeño**. Declara el punto
ciego en la nota al pie en vez de dejar que la cifra se lea como completa.

**El consuelo, que es real:** Meta + Google concentran la mayor parte de la
inversión digital en México. Cubrir bien esas dos capta la mayoría del gasto
aunque no capte la mayoría de los publishers.

## 5 · TikTok

- **Commercial Content Library** — oficial, cobertura sólida solo en **UE**.
- **Creative Center** — gratis, exploración de creativos y tendencias, sin API.
- Adyntel cubre TikTok programáticamente.

## 6 · MCP de Semrush

Sirve para **paid search** (Ads Copies, PLA, keywords pagadas), que es justo lo
que las bibliotecas de display cubren peor.

⚠️ Dos cosas verificadas el 18-sep-2026:
- La cuenta **no tiene unidades de API disponibles** (`no_api_units`). Si falla,
  repórtalo factual y sigue con las otras fuentes.
- **AdClarity no está expuesta en el MCP de Semrush.** Sus toolkits son
  organic/paid search, backlinks, traffic, audience, shopping. La inteligencia
  de display/video/social de AdClarity solo vive en su interfaz web.

## 7 · Herramientas de espionaje (nivel 2)

BigSpy ($9–99) · Minea ($49–399) · Dropispy ($29–249) · Foreplay ($49–199) ·
Anstrex ($69–219, el mejor en native: Taboola/Outbrain/MGID) · AdSpy ($149) ·
PowerAdSpy ($59–249).

**Ninguna tiene API.** Sirven para explorar a mano, no para alimentar un
pipeline. BigSpy a $9/mes vale como herramienta de consulta humana.

---

## Lo legal

Las bibliotecas de anuncios son **información pública por diseño**; varias
existen por mandato regulatorio (DSA). Consultarlas no tiene problema.

El punto fino es el **Transparency Center de Google**: no tiene API y sus ToS
prohíben el scraping automatizado. Para uso interno de inteligencia competitiva
es práctica establecida de industria. **Si la salida se le vende a un cliente
como servicio, apóyate en un proveedor comercial** (Adyntel, adlibrary.com) en
vez de raspar directo: ellos asumen el riesgo operativo y contractual, y $44/mes
es barato para transferirlo.
