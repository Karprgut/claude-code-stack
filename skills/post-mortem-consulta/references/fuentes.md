# Fuentes y endpoints — métodos verificados (último: cierre Kabrita · septiembre 2026)

Cómo se jala cada cifra **con tokens o MCP** (no scraping, no inventar).

> **Lo que cambió en el cierre de septiembre 2026:** ya **no hay exports manuales**. Shopify sale del conector oficial por ShopifyQL, GA4 del MCP por cliente, Meta del MCP en vivo y TikTok del MCP por cliente. Lee la sección §5 antes de pedirle a Kar que baje algo a mano.

## 0. Dónde viven los tokens

Dashboard de Flint: `~/flint-app/flint-v1.0.0 2/dashboard`. Corre `next dev -p 5556`.

- `dashboard/.env.local`:
  - `META_TOKEN_KAB` / `META_TOKEN_RTH` / `META_TOKEN_TBP` — System User token por cliente (Graph API).
  - `META_APP_ID`, `META_APP_SECRET`.
  - `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN`, `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_LOGIN_CUSTOMER_ID`, `GOOGLE_ADS_CUSTOMER_ID_KAB/RTH/TBP`.
  - `MONGODB_URI`.
- **TikTok access token** NO está en `.env.local` — vive en **Mongo** `flint.ad_clients.tiktokAccessToken` (doc por `code`: KAB/RTH/TBP). Los advertiser IDs/customer IDs también están en `ad_clients`.
- La integración por código está en `dashboard/lib/reports-ingest/{meta,google,tiktok}.ts` (Google = OAuth refresh → `googleAds:searchStream` v22; TikTok = `business-api.tiktok.com/open_api/v1.3/report/integrated/get/`).

**Nunca imprimas el valor de un token.** Léelo en un script para *usarlo* (parseando `.env.local` por nombre de key), no lo muestres en consola.

## 1. Camino canónico: API local de Reports (las 3 plataformas con markup)

```bash
curl -s "http://localhost:5556/api/reports/<slug>/snapshot?since=2026-05-01&until=2026-05-31"
```

Estructura real devuelta (**ojo: viene anidado bajo `snapshot`**):

```
{ client, snapshot: { platforms: { meta, google, tiktok }, alerts } }
  platforms.<plat>.accounts[] → { totalSpend, totalResults, totalClicks, monthlyBudget,
                                   campaigns[] → { id,name,status,spend,budget,impressions,
                                                   clicks,cpc,results,resultType,costPerResult,
                                                   engagement, ads[], metrics{} } }
  ads[] → { name, adsetName, campaignName, spend, impressions, clicks, ctr, cpc,
            results, costPerResult, metrics{} }
```

El `metrics{}` por campaña/ad trae el detalle fino:
- **Meta**: `impressions, reach, frequency, cpm, cpc, ctr, inline_link_clicks`, y `action:omni_purchase` (compras), `action_value:omni_purchase` (revenue), `action:link_click`, `action:landing_page_view` (sesiones LP), etc.
- **Google**: `impressions, clicks, ctr, cpc, cpm`, `conversions` (**primarias**), `conversions_value`, `all_conversions`, `all_conversions_value`.
- **TikTok**: `spend, impressions, reach, clicks, ctr, cpc, cpm`, `conversion`, `video_play_actions`, `thruplay`.

El snapshot **ya trae markup** (vista cliente). Total spend = suma de campañas. Llama el endpoint dos veces (mes actual + mes anterior) para deltas.

## 2. Métrica de compras de Google — usar PRIMARIAS, no categoría

Google expone tres conteos distintos; **no son lo mismo**:
- `metrics.conversions` (**primarias**) — lo que el deck histórico reporta como "compras".
- `results` / categoría PURCHASE (`all_conversions` filtrado por `conversion_action_category=PURCHASE`) — ~1.8x mayor (incluye view-through y multi-evento).
- `all_conversions` — enorme (incluye page_view, add_to_cart, etc.), inútil para "compras".

**Regla:** reporta **compras = `conversions` (primarias)** y **revenue = `conversions_value`** para cuadrar con el método del deck del mes anterior. El ROAS sale de `conversions_value / spend`. (En mayo: primarias 289 vs. categoría 521 — usar 289.) El CSV `Google.csv` puede traer la columna categoría como referencia, pero el deck reporta primarias. Declara esta definición en el brief.

## 3. Breakdowns de Meta (split regional, edad/género, device)

```bash
curl -s -H "x-flint-internal: true" \
  "http://localhost:5556/api/reports/<slug>/breakdown?dimension=region&metric=spend&since=<>&until=<>"
```
- `dimension`: `region` (estados MX), `age_gender`, `device`. `metric`: `spend|impressions|clicks|link_clicks|primary`.
- Devuelve `[{label, value, secondary}]`. El split de Kabrita CDMX/Edomex vs. Resto sale de aquí (sumar `Distrito Federal` + `State of Mexico` = metro).
- **Caveat:** el breakdown da geo del USUARIO. El deck de Kabrita clasifica por **targeting del adset** (`_cdmx_` vs `_rep_` en el nombre) — son lecturas distintas (en mayo geo-metro ~33% vs. targeting-metro ~27%). Para el deck usa la clasificación por adset (ver §4).

## 4. Token directo (Graph API de Meta) — para lo que el snapshot/MCP NO exponen

El snapshot no trae LP-views por adset ni el desglose por adset con la métrica que necesitas, y **el MCP de Meta NO acepta `landing_page_view`** (rechaza el field). Solución: **llamar la Graph API directo con `META_TOKEN_<CODE>`** (leído de `.env.local`, sin imprimirlo):

```js
// adset-level con actions → clasifica por nombre (_cdmx_/_rep_)
const u = new URL(`https://graph.facebook.com/v21.0/act_<ID>/insights`);
u.searchParams.set("level", "adset");
u.searchParams.set("fields", "adset_name,campaign_name,actions");
u.searchParams.set("time_range", JSON.stringify({since, until}));
u.searchParams.set("access_token", TOKEN);
// actions[] → busca action_type "landing_page_view", "link_click", "omni_purchase"
```
- Account-level `reach` dedup (no es aditivo por campaña): `level=account&fields=reach,impressions,spend`.
- Region breakdown autoritativo: `level=account&breakdowns=region&fields=actions,spend` (da `link_click` por estado; `landing_page_view` NO viene por región — por eso se clasifica por adset).
- Mismo patrón sirve para Google/TikTok si algún día Reports no basta (sus libs ya están en `reports-ingest/`).

## 5. Shopify y GA4 — por MCP, ya no por export manual

### Shopify (la fuente de verdad de la venta)

Conector oficial `claude.ai Shopify`, herramienta `run-analytics-query` (ShopifyQL). **Verifica primero a qué tienda apunta** con `get-shop-info`: solo sostiene UNA tienda a la vez y `switch-shop` revoca la anterior.

```sql
-- venta del mes
FROM sales SHOW orders, gross_sales, discounts, sales_reversals, net_sales,
     shipping_charges, taxes, total_sales, average_order_value SINCE 2026-09-01 UNTIL 2026-09-30
-- embudo
FROM sessions SHOW sessions, sessions_with_cart_additions, sessions_that_reached_checkout,
     sessions_that_completed_checkout, conversion_rate SINCE … UNTIL …
-- regional (sustituye al export «Sessions by location»)
FROM sessions SHOW sessions GROUP BY session_region ORDER BY sessions DESC LIMIT 40 SINCE … UNTIL …
-- ventas por referrer (sustituye al export «Total sales by referrer»)
FROM sales SHOW orders, total_sales GROUP BY order_referrer_source, order_referrer_name SINCE … UNTIL …
-- serie del año, para la tabla mes a mes
FROM sales SHOW orders, total_sales, average_order_value TIMESERIES month SINCE 2026-01-01 UNTIL …
FROM sessions SHOW sessions TIMESERIES month SINCE 2026-01-01 UNTIL …
-- curva diaria y blog
FROM sessions SHOW sessions TIMESERIES day SINCE … UNTIL …
FROM sessions SHOW sessions WHERE landing_page_path CONTAINS '/blogs/' GROUP BY referrer_source SINCE … UNTIL …
```

**Trampas:** `CONTAINS` funciona, `LIKE` no. La `conversion_rate` que devuelve ShopifyQL usa *checkouts completados / sesiones*; el deck histórico usa **órdenes / sesiones** — calcula esa, no la de la API. El MCP local `shopify-mcp` (`~/.config/shopify-mcp`) **no tiene ShopifyQL**: sus 14 herramientas cubren órdenes, clientes y productos, así que sirve para venta de caja y regional por dirección de envío, pero no para sesiones, embudo ni blog.

### GA4 (embudo, mezcla de canales y orgánico)

MCP por cliente: `google-analytics-<perfil>` (Kabrita = propiedad **<GA4_PROPERTY_ID>**). Perfiles en `~/.config/google-analytics-mcp/env.<perfil>`.

```
run_report(property_id, date_ranges=[sep, ago], dimensions=["sessionDefaultChannelGroup"],
           metrics=["sessions","engagedSessions","totalRevenue","transactions"])
run_report(..., dimensions=["region"])        # geo de usuario
run_report(..., dimensions=["sessionSource"]) # abre Paid Social en Meta vs. TikTok
run_report(..., dimensions=["yearMonth"])     # serie del año
```

**Trampa:** los totales de la serie `yearMonth` **no cuadran con la suma del desglose por canal** (GA4 colapsa categorías al desglosar). Usa `yearMonth` para totales y el desglose solo para composición; declara la diferencia.

### Las dos cifras de venta no se suman

Shopify y GA4 miden el mismo sitio con bases distintas (en septiembre: N órdenes/$X contra M transacciones/$Y, ~25% menos en GA4). **La cifra de negocio del deck es Shopify**; GA4 aporta mezcla de canales y orgánico. Nunca las sumes ni las sustituyas entre sí.

### Media plan — por Drive, no por Sheets API

La Sheets API está **apagada** en el proyecto de las credenciales, así que `read_sheet_values` y `get_spreadsheet_info` fallan con `SERVICE_DISABLED`. La vía que funciona:

```
get_drive_file_download_url(file_id, export_format="xlsx", user_google_email="tu-cuenta@tu-dominio.com")
```
y se parsea con `openpyxl`. El `read_file_content` de Drive solo devuelve la estructura (`[merged]`), y el export a CSV solo trae la primera hoja. **La pestaña viva es `<Mes> v2`**, no la anual ni la del mes sin sufijo. Ojo: algunas celdas de esa pestaña arrastran residuos del mes anterior — valida que el total cuadre antes de usarlas.

### El `monthlyBudget` de Mongo está desfasado

`ad_clients.monthlyBudget` no corresponde a ningún mes real. **El plan vivo es el media plan**, no Mongo.

## 6. CSVs de salida (shape que consume el deck)

Déjalos en la carpeta de datos del mes: `meta.csv`, `meta-adsets.csv`, `meta-ads.csv`, `Google.csv`, `Google-ads.csv`, `tiktok.csv`, `tiktok-ads.csv`. Guarda el JSON crudo + scripts en `reportes/_raw/` como provenance (snapshot-<mes>.json, digest, extractores .mjs). Columnas: campaña/adset/ad + Inversión, Impresiones, Alcance, Clics, CTR, CPM, CPC, Compras, Valor, ROAS, CPA según plataforma.

## 7. Regla de oro

Si falta un dato, **pídelo** (como hizo Kar con los 2 exports), no sustituyas la métrica del slide por otra para tapar el hueco. El reporte mantiene las MISMAS métricas mes a mes; solo cambian los números.
