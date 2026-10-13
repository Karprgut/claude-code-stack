# MCP de TikTok — piezas y testigos

MCP por cliente: `tiktok-<perfil>` (Kabrita = advertiser **<ADVERTISER_ID>**). El token vive en Mongo `flint.ad_clients.tiktokAccessToken`, no en `.env.local`.

## Desempeño por anuncio

```
report_integrated_get(
  advertiser_id, report_type="BASIC", data_level="AUCTION_AD",
  dimensions=["ad_id"],
  metrics=["ad_name","adgroup_name","campaign_name","spend","impressions","reach",
           "frequency","clicks","ctr","cpm","conversion","cost_per_conversion",
           "video_views_p100","engaged_view"],
  start_date, end_date, order_field="spend", order_type="DESC", page_size=50)
```

Cuadra la suma de `spend` contra el total del canal del snapshot antes de usarlo.

**Reglas del endpoint:** una sola dimensión de ID y debe coincidir con `data_level`; los nombres de campaña/ad group van en `metrics`, no en `dimensions`. Métricas que NO existen y tumban la llamada entera: `conversions`, `cpa`, `roas`, `video_views`, `landing_page_view`, `add_to_cart`, `purchase_value`.

## Testigos visuales — `tiktok_item_id`, no `video_id`

Los anuncios de video suelen ser **Spark Ads** (publicaciones orgánicas impulsadas). En ese formato:

- **`video_id` viene vacío** — no lo uses.
- El campo correcto es **`tiktok_item_id`**, que apunta al post orgánico.

```
ad_get(advertiser_id, filtering={"ad_ids":[...]},
       fields=["ad_id","ad_name","tiktok_item_id","ad_format","ad_text"])
```

La portada se baja del **oEmbed público** de TikTok, sin token:

```
https://www.tiktok.com/oembed?url=https://www.tiktok.com/@<usuario>/video/{tiktok_item_id}
```
→ `thumbnail_url` del JSON. Es el método de `Kabrita/Breakdown-Pautas-<Mes>/dl_tiktok_img.py`; si el breakdown del mes ya corrió, **las portadas ya están en `img_tiktok/` y se reutilizan**.

Los anuncios de **catálogo (DPA / carrusel)** no tienen post orgánico, así que no tienen `tiktok_item_id` ni testigo.

## Lo que hay que declarar

- **Nombres repetidos:** en Kabrita siete de los ocho anuncios se llaman `_001`. La única forma de distinguirlos es el `ad_text`; nombra las piezas por la idea de su copy y dilo en el footer.
- **Sin valor de conversión:** TikTok reporta `conversion` de pixel sin valor asociado, así que **el canal no tiene ROAS** y su CPA no es comparable con el de Meta o Google. Repórtalo como alcance y consumo de video.
