---
name: post-mortem-consulta
description: Reúne y analiza el dataset real de desempeño que alimenta el post-mortem mensual de un cliente de Karma Creative Lab (Kabrita, Ruth's Chris, TBP) — Meta + Google + TikTok — usando los tokens/datos del sistema Reports de Flint (snapshot por rango de mes vía la API local) más el MCP de Meta en vivo para el contexto que el cron no guarda (benchmarks de industria, ranking de subasta, anomalías, tendencia, opportunity score, ad library competitiva). Úsalo cuando pidan "la consulta / los datos del post mortem de <cliente>", "saca el desempeño de <mes> de <cliente>", o cualquier pull de cifras de paid media de un cliente KCL para cerrar mes o revisar a media marcha. Entrega un brief de datos + CSVs en la carpeta del mes, listos para el skill `post-mortem`.
user-invocable: true
---

# Post-Mortem · Consulta de datos

Skill **de consulta** que produce el dataset crudo + analizado para un post-mortem de KCL **sin exportar CSVs a mano**. Reemplaza el paso 3 del skill `post-mortem` ("reúne los datos crudos") jalando los mismos números programáticamente y agregando contexto vivo del MCP de Meta.

**Es híbrido por diseño:**
- **Base canónica → Reports (Flint).** Las cifras oficiales (inversión, impresiones, clics, resultados, CPM/CPC/CPA/ROAS, por campaña y por ad) salen del snapshot por **rango de mes** de la API local de Reports. Ya vienen con markup aplicado (vista cliente) y en zona horaria MX.
- **Contexto vivo → MCP de Meta.** Lo que el cron NO guarda: benchmark de industria, ranking de subasta (quality/engagement/conversion), señal de anomalía, tendencia intra-mes, opportunity score y ad library competitiva. Eso lo trae el MCP de Meta directo.

El producto es un **brief de datos** (`consulta-<mes>.md`) + **CSVs por plataforma** dejados en la carpeta de datos del mes del cliente, listos para que el skill **`post-mortem`** compile el deck. No construye el deck — lo alimenta.

> Salida que se usa fuera de post-mortem: también responde consultas ad-hoc ("¿cómo va Kabrita en Meta este mes?", "compara CPA de mayo vs abril en Ruth's"). En ese caso entrega el brief y omite los CSVs.

## Clientes

| Cliente | slug | code | Meta account | Tipo | Particularidad de datos |
|---|---|---|---|---|---|
| **Kabrita** | `kab` | KAB | `act_<ID>` | Paid media (Meta/Google/TikTok) + orgánico | Meta **solo por MCP** (el token de Reports está invalidado). Venta por **Shopify/ShopifyQL**, embudo por **GA4** (prop. <GA4_PROPERTY_ID>). Desde sep-2026 la pauta es **nacional**: el corte regional sobrevive solo en la demanda. Moneda MXN. |
| **Ruth's Chris** | `rth` | RTH | `act_<ID>` | Paid media (Meta + Google PMax) | Roles de canal diferenciados. Moneda MXN. |
| **TBP** | `tbp` | TBP | (lead-gen) | Lead-gen / email | **Sin ROAS** — KPIs: leads, costo por lead, alcance. Google suele estar **bloqueado por saldo** (repórtalo como hecho). |

focusMetrics y los IDs de cuenta viven en Mongo `ad_clients` (`{_id: "KAB"|"RTH"|"TBP"}`). ⚠️ **`monthlyBudget` está desfasado** y no corresponde a ningún mes real: el plan vivo del slide "plan vs. ejecutado" es la pestaña `<Mes> v2` del media plan en Drive (ver [references/fuentes.md](references/fuentes.md) §5).

## Antes de empezar

1. **Confirma cliente y mes.** Si no te lo dan, pregunta. El mes define el rango: `since=<YYYY-MM-01>`, `until=<último día del mes>`. Para deltas necesitas también el **mes anterior**.
2. **Asegura la API local de Reports arriba** (los tokens viven en el `.env` del dashboard; nunca los imprimas):
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:5556/api/reports/clients
   ```
   Si no responde `200`, levántala en background y espera a que abra:
   ```bash
    cd "~/flint-app/flint-v1.0.0 2/dashboard" && pnpm dev   # `next dev -p 5556`
   ```
   (Nunca `pnpm build` — Kar maneja los builds.) Si el puerto ya está ocupado (`EADDRINUSE`), **ya hay un server de Kar arriba** — no lo levantes, solo consume `:5556`.
3. **Lee** [references/fuentes.md](references/fuentes.md) para los endpoints exactos, el mapeo JSON→métricas del deck, la lógica de deltas, y **§5: Shopify/GA4/media plan sin exports manuales**.
4. **Lee** [references/meta-mcp.md](references/meta-mcp.md) para qué herramientas del MCP de Meta llamar, en qué orden, las trampas verificadas (truncación silenciosa, markup 0) y **cómo bajar los testigos visuales**.
5. **Lee** [references/tiktok-mcp.md](references/tiktok-mcp.md) si el cliente corre TikTok: desempeño por anuncio y testigos vía `tiktok_item_id` (NO `video_id`).

## Flujo

1. **Snapshot del mes (canónico).** Una llamada trae las 3 plataformas:
   ```bash
   curl -s "http://localhost:5556/api/reports/<slug>/snapshot?since=<YYYY-MM-01>&until=<YYYY-MM-DD>"
   ```
   Devuelve `CampaignsSnapshot`: `platforms.{meta,google,tiktok}.accounts[]` → `campaigns[]` → `ads[]`. De aquí salen todos los totales y las filas por campaña.
2. **Snapshot del mes anterior** (mismo endpoint, fechas del mes previo) → para **deltas** up/down/flat de cada cifra.
3. **Breakdowns de Meta** (edad/género, device, y región **solo si la pauta se segmenta por geo**). Requiere header interno:
   ```bash
   curl -s -H "x-flint-internal: true" \
     "http://localhost:5556/api/reports/<slug>/breakdown?dimension=region&metric=spend&since=<>&until=<>"
   ```
   Dimensiones: `region` (estados MX → arma el split de Kabrita), `age_gender`, `device`. Métricas: `spend|impressions|clicks|link_clicks|primary`.
4. **Contexto vivo del MCP de Meta** por cada cuenta Meta (ver [references/meta-mcp.md](references/meta-mcp.md)): industry benchmark, auction ranking, anomaly signal, performance trend, opportunity score y —si aporta— ad library competitiva.
5. **Analiza y cuadra:** totales por plataforma, filas por campaña, **deltas vs. mes anterior** y **plan vs. ejecutado** contra la línea neta de IVA del media plan. Cuadra la suma de campañas contra el total de cuenta antes de escribir nada (el MCP trunca sin avisar). Cifras siempre con unidad ($/MXN, %, ROAS, CPA, leads). **Por qué antes de qué** en cada hallazgo.
6. **Escribe la salida** en la carpeta del mes del cliente (ver rutas abajo):
   - `consulta-<mes>.md` — brief: totales, deltas, plan vs. ejecutado, benchmarks/anomalías del MCP, el corte regional de la demanda (Kabrita), y un bloque **"Lo que NO sabemos"** (huecos de tracking, atribución parcial, canal caído, dato estimado, maduración de conversiones de Google).
   - `creativos/` — los **testigos visuales** de cada pieza reportada (PNG). Sin esto el deck no tiene el bloque de atribución creativa.
   - CSVs por plataforma con el shape que ya consume el deck: `meta.csv`, `Google.csv`, `tiktok.csv` (nombres/columnas en [references/fuentes.md](references/fuentes.md)).
7. **Handoff:** termina diciendo "datos listos en `<carpeta>` — corre el skill `post-mortem` para compilar el deck".

## Rutas de salida (carpeta de datos del mes)

Raíz: `~/Trabajo/Karma Creative Lab Shopify/propuestas/`

| Cliente | Carpeta de datos |
|---|---|
| Kabrita | `Kabrita/Post-Mortem-<Mes>/reportes/` |
| Ruth's Chris | `Ruths-Chris/Post-Mortem-<Mes>/reportes/` |
| TBP | `TBP/Post-Mortem-<Mes>/data/` |

Si la carpeta del mes aún no existe, el skill `post-mortem` la crea clonando el mes anterior — puedes crear solo la subcarpeta de datos y dejar ahí los CSVs + el brief.

## Reglas (obligatorias)

- **Nunca imprimas valores de tokens.** Los tokens (Meta System User, OAuth Google, token TikTok) viven en SSM / `.env` / `ad_clients`. La API local los usa; tú solo consumes la API.
- **Markup = vista cliente.** El snapshot ya trae spend con markup aplicado (lo que ve el cliente). Para el post-mortem eso es lo correcto. No lo "des-apliques".
- **Zona horaria MX** para los límites de mes (el cron ya usa MX para "this month"; respeta el mismo criterio en `since/until`).
- **No inventes números.** Si una plataforma no devolvió datos para el rango (token vencido, cuenta sin gasto, Google bloqueado por saldo en TBP), repórtalo como **hueco declarado**, no lo rellenes.
- **Caveat del MCP de Meta:** el MCP corre bajo el login de Meta conectado en la sesión, que puede NO ser el mismo System User de los tokens de Reports. Si el MCP no ve la cuenta `act_…` del cliente, dilo y usa solo la base canónica de Reports para esas cifras. Las cifras oficiales SIEMPRE salen de Reports; el MCP solo agrega contexto.
- **Voz:** español mexicano, tú. Datos antes que adjetivos. Por qué antes de qué. Lo que no sabemos se declara. (Mismo registro que el skill `post-mortem`.)

## Guarda memoria

Toda corrida relevante (cliente, mes, hallazgos clave, huecos de tracking, cambios de cuenta/token) se guarda en `ai_memory` de Flint cuando trabajes desde el repo de Flint, o como nota del cliente. No dupliques lo que ya está en el deck.

## GA4 de TBP (orgánico / leads) — ya NO es export manual

Hay MCP local `google-analytics-tbp` (propiedad **367885093**, tbpmx.com, stream tbp.studio). Si la sesión no lo tiene cargado, consúltalo por stdio con `propuestas/TBP/Brevo-Tracking/scripts/ga4-query.py tbp call run_report '{...}'` (Data API: `date_ranges`, `dimensions`, `metrics`, `dimension_filter`).

Reglas al leer GA4 de TBP (verificadas 18-sep-2026):
- **Excluir el 14-sep-2026 país = Seychelles / fuente `trafficheap.cc`** (bot referral, 507 sesiones en un día, solo `page_view`/`first_visit` en la home). Filtra `country != Seychelles AND sessionSource != trafficheap.cc` en cualquier pull de orgánico/referral. Hay anotación en la propiedad.
- **`generate_lead` anteriores al 17-sep-2026 salen "Unassigned / (not set)"** porque llegaban por Measurement Protocol sin pegarse a la sesión (fix v4 del form el 17-sep). No se reprocesan: repórtalos por total, no por canal.
- **Los leads de Meta Lead Form (Zapier → Brevo → MP) siempre serán Unassigned** en Adquisición de tráfico: nunca pisan el sitio. Sepáralos con la dimensión personalizada `lead_source` (`web_form` vs `meta_instant_form`), no por canal.
- El día en curso muestra sesiones "(not set)" hasta que GA4 cierra el procesamiento (24–48 h): no cierres mes con datos de hoy.
