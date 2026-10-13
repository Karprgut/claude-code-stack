# MCP de Meta — contexto vivo (qué llamar y qué NO)

El MCP de Meta aporta **contexto que el cron de Reports no guarda**. Las cifras oficiales SIEMPRE salen de Reports / token; el MCP solo agrega lectura cualitativa.

## Orden de llamadas (por cada cuenta Meta del cliente)

1. `ads_get_ad_accounts` — confirma que `is_ads_mcp_enabled` y `is_queryable` sean true para `act_<ID>` del cliente. Kabrita = `<ID>` , MCP-enabled.
2. `ads_get_opportunity_score` — score 0-100 + recomendaciones (fragmentación, audiencia estrecha, formatos, música, reels). **Account-level** (no lo atribuyas a una campaña).
3. `ads_insights_anomaly_signal` — anomalías (p. ej. `active_delivery_narrow_audience` con los adset IDs afectados).
4. `ads_insights_auction_ranking_benchmarks` — quality/engagement/conversion ranking por ad (detecta creatividades "Below Average").
5. `ads_insights_industry_benchmark` y `ads_insights_performance_trend` — útiles cuando hay datos, pero **en mayo 2026 devolvieron "No data available"** para Kabrita. Llámalos pero no dependas de ellos; decláralo como hueco si vuelven vacíos.

En mayo, el MCP confirmó el hallazgo de los datos: los 2 adsets *Performance · Lado N · CDMX y Edomex* tenían **audiencia estrecha (37-45K) + solape de subasta (fragmentación)** — exactamente los de peor ROAS. Eso alimenta el Do's & Don'ts y los Next Steps.

## Trampas verificadas (cierre de septiembre 2026)

- **`ads_get_ad_entities` trunca sin avisar.** Una llamada a `level=campaign` sin filtro devolvió 6 campañas con gasto y faltaban dos; se detectó porque los ad sets sumaban más que las campañas (~12% de diferencia). **Siempre:** pide `level=ad_account` para el total autoritativo y filtra `{"field":"campaign.amount_spent","operator":"GREATER_THAN","value":["0"]}` en los niveles de abajo. Cuadra la suma contra el total de cuenta antes de escribir nada.
- **Filtrar por campaña sí funciona** a nivel anuncio: `{"field":"campaign.id","operator":"IN","value":["<id>"]}`. Es la forma de abrir las piezas por bloque de objetivo (bc_/pr_/aw_).
- **El markup puede ser 0.** En Kabrita las 12 reglas de `reports_markups` son `RELATIVE 0`, así que las cifras crudas del MCP **son** la vista del cliente y no hay nada que normalizar. Verifícalo antes de asumir que hay que ajustar.
- **Campañas sin doc de markup quedan fuera del reporte del cliente.** Si una campaña nueva no tiene documento en `reports_markups`, no aparecerá en el dashboard aunque el token esté sano. Revísalo y decláralo.
- **`purchase_value` no existe** como field; usa `purchase_roas` y multiplica por el gasto.

## Testigos visuales — la vía que funciona

Para las piezas de Meta: `ads_get_ig_accounts` → `ads_get_ig_media(ig_account_id)` → descarga directa de `media_url`. Los videos vienen como `.mp4`: saca un cuadro con `ffmpeg -ss 00:00:01 -i x.mp4 -frames:v 1`.

**Dos caminos que NO funcionan, para no repetirlos:**
- El `thumbnail_url` de `ads_get_creatives` devuelve el **avatar de la página en 64 px**, no el creativo.
- El `preview_url` de `ads_get_ad_preview` **no se puede capturar sin sesión** con permisos sobre la página: Chrome headless recibe «la historia de este anuncio no está disponible». Y `ads_get_ad_preview_screenshot` es app-only.

**Hallazgo recurrente:** las variantes `bc_`, `pr_` y `aw_` de un mismo tema comparten `object_story_id` — son **el mismo post orgánico promocionado con tres objetivos a la vez**. Por eso una creatividad cierra venta en consideración y no la cierra en retargeting: lo que cambia es la audiencia, no la pieza. Agrupa por `object_story_id` antes de concluir sobre creatividad.

## Lo que el MCP NO hace (usar el token directo)

- **`ads_get_ad_entities` rechaza `actions:landing_page_view`** (y otros action types finos). Solo acepta una lista cerrada (omni_purchase, link_click, etc.). Para LP-views por adset/región → **Graph API directo con `META_TOKEN_KAB`** (ver `fuentes.md` §4). Kar lo pidió explícito: *"no con el MCP sino con el token"*.
- El MCP devuelve cifras crudas (sin markup) y en formato europeo (`"$44.812,26 MXN"`, `"830.714"`); para los totales del deck usa **Reports** (con markup), no el MCP.
- Para queries grandes el MCP guarda el resultado en archivo (`tool-results/…txt`) — parsea con `jq -r '.ad_entities' | jq …`.

## Caveat de scope

El MCP corre bajo el login de Meta de la sesión, que puede NO ser el System User de los tokens de Reports. Si el MCP no ve `act_…` del cliente, dilo y usa solo Reports/token. Las cifras oficiales no dependen del MCP.
