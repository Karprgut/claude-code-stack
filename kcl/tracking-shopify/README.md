# Karma · Sistema de tracking (Meta + TikTok + Google Ads + GA4)

Tracking consolidado para `karmacreativelab.com` (Shopify). Objetivo: medir bien
los eventos y **sacar los scripts sueltos del theme**, centralizando en GTM
(navegador) + el backend de Vercel (server-side).

## ALCANCE ACTUAL — Fase 1: solo PURCHASE

Decidido el 2026-05-31: arrancamos **solo con la conversión de compra**. Lead,
engagement (view_item/add_to_cart/begin_checkout) y TikTok quedan para una Fase 2
opcional (ver "Fase 2" abajo).

| Canal | Cómo entra `purchase` | Acción |
|---|---|---|
| Meta | CAPI server-side (webhook) | ✅ código + creds listos → solo subir a Vercel |
| GA4 | app Google & YouTube | ✅ ya funciona |
| Google Ads | **import desde GA4** | ⚙️ linkear GA4↔Ads + importar `purchase` |
| TikTok | — | ⏸️ en pausa |

**En Fase 1 NO se importa GTM** (sus tags son de engagement/lead). El snippet
`analytics-datalayer.liquid` queda en el theme pero dormido hasta la Fase 2.

## Arquitectura (quién dispara qué)

```
                    STOREFRONT (theme)              CHECKOUT / GRACIAS         SERVER (webhook orders/paid)
                    ──────────────────              ──────────────────         ───────────────────────────
view_item     ───►  dataLayer → GTM ─► Meta/TikTok/GAds
add_to_cart   ───►  dataLayer → GTM ─► Meta/TikTok
begin_checkout ──►  dataLayer → GTM ─► Meta/TikTok
generate_lead ───►  dataLayer → GTM ─► Meta/TikTok/GAds Lead/GA4
purchase      ─────────────────────────────────────────────────────────────►  Meta CAPI + TikTok Events API
GA4 (todo ecommerce, incl. purchase)  ◄── app Google & YouTube (Customer Events)
Google Ads purchase  ◄── import desde GA4 (purchase)  ← se configura en Google Ads
```

### Decisión clave: NO hay Web Pixel custom

Lo planeé originalmente, pero al construir quedó claro que **es mejor sin él**:

- **Meta/TikTok purchase = solo server.** El webhook ya trae email, teléfono, IP
  y user-agent del cliente → match quality alto. Si además metiéramos la app
  oficial de Meta/TikTok, esas apps mandan **su propio** CAPI y **duplicarían**
  la compra. Server-only cuenta una vez. ✓
- **Google Ads purchase = import desde GA4.** GA4 ya recibe `purchase` por la app
  Google & YouTube. Linkeando GA4 ↔ Google Ads e importando el evento, la
  conversión entra sin una sola línea de código. ✓
- **GA4 = la app.** En GTM GA4 solo añade `generate_lead` (lo que la app no manda).

Resultado: el único script de marketing hardcodeado en el theme es el **loader de
GTM** (que ya estaba). Todo lo demás se administra desde GTM y el backend.

> Más adelante, si quieres dedup browser+server de Meta con cookies `_fbp/_fbc`,
> se añade un Web Pixel que capture esas cookies y las mande al backend. Hoy no
> hace falta para contar bien.

---

## Qué se tocó / creó

**Theme** (`karma-theme`, branch `shopify-theme` → auto-deploy a Shopify):
- `layout/theme.liquid` — borrado el snippet roto de Google Ads (disparaba en
  cada pageview con `transaction_id` vacío y sin `gtag`). Se añadió el render de
  `analytics-datalayer`.
- `snippets/analytics-datalayer.liquid` — **nuevo.** Empuja `view_item`,
  `add_to_cart`, `begin_checkout`, `generate_lead` al dataLayer (esquema GA4).

**Backend** (`karma-backend`, Next.js en Vercel):
- `lib/tracking/` — `env.ts`, `hash.ts`, `types.ts`, `normalize.ts`,
  `meta-capi.ts`, `tiktok-events.ts`, `index.ts`.
- `app/api/shopify/webhook/route.ts` — dispara `trackPurchaseFromOrder()` en
  TODA orden pagada (no solo estrategias).
- `.env.tracking.local` (gitignored) + `.env.tracking.local.example`.

**GTM** (`GTM-XXXXXXX`):
- `tracking/karma-gtm-container.json` — 13 tags, 4 triggers, 7 variables.

---

## Instalación — Fase 1 (solo purchase)

### 1) Backend → Vercel
El `.env.tracking.local` ya tiene `META_PIXEL_ID` + `META_CAPI_TOKEN`. Sube esas
mismas a **Vercel → karmacreativelab → Settings → Environment Variables**
(Production + Preview) y **redeploy**:
- `META_PIXEL_ID`, `META_CAPI_TOKEN`, `META_GRAPH_VERSION`

(GA4/TikTok/GoogleAds no se usan server-side en Fase 1; no hace falta subirlas.)

Prueba local sin enviar nada real: `TRACKING_DRY_RUN=1` + pedido de prueba →
verás el payload en consola.

### 2) Probar Meta CAPI
1. En Vercel pon temporalmente `META_TEST_EVENT_CODE` (lo sacas de Events Manager
   → Test Events).
2. Haz un pedido de prueba en Shopify (o uno real y lo reembolsas).
3. Events Manager → **Test Events** → debe aparecer `Purchase` con `event_id` =
   ID de la orden, value y currency.
4. Quita `META_TEST_EVENT_CODE` y redeploy.

### 3) Theme
Ya editado (se borró el snippet roto de Google Ads). Haz commit/push de
`karma-theme` (GitHub↔Shopify lo despliega). El snippet `analytics-datalayer`
queda dormido hasta Fase 2 — no estorba.

### 4) Google Ads — compra vía import de GA4
1. GA4 (G-XXXXXXXXXX) → **Admin → Product links → Google Ads** → linkea la cuenta.
2. Google Ads → **Goals → Conversions → + New → Import → GA4 (Web)** → importa
   `purchase`. (Tarda ~24-48h en mostrar datos.)

### ✅ Con eso Fase 1 está completa: Meta + GA4 + Google Ads miden la compra.

---

## Fase 2 (opcional, cuando la quieras)
Engagement (view_item, add_to_cart, begin_checkout), Lead y TikTok:
1. **GTM:** Admin → Import Container → `karma-gtm-container.json` → Merge.
2. Reemplaza variables `Meta Pixel ID` (y `TikTok Pixel ID` si activas TikTok).
3. **Pausa los 5 tags `TikTok Pixel - ...`** si TikTok sigue apagado.
4. Para Lead en Google Ads: crea la acción `Submit lead form` y pon su label en la
   variable `Google Ads Lead Label`; si no, pausa el tag `Google Ads - Lead`.
5. Preview (Tag Assistant) → Publish.

---

## Cómo probar (Fase 1)

| Canal | Dónde se ve | Qué buscar |
|---|---|---|
| Meta CAPI | Events Manager → Test Events (`META_TEST_EVENT_CODE`) | `Purchase` con `event_id` = ID de orden |
| GA4 | GA4 → Realtime / DebugView | `purchase` (de la app) |
| Google Ads | Conversiones (~24-48h) | `purchase` importada de GA4 |

---

## Pendientes de Kar (Fase 1)
- [x] Meta Pixel ID + CAPI token en el env
- [ ] Subir `META_*` a Vercel + redeploy
- [ ] Probar Meta CAPI con Test Events
- [ ] Push del theme (`karma-theme`)
- [ ] Linkear GA4 ↔ Google Ads e importar `purchase`
- [ ] Linkear GA4 ↔ Google Ads e importar `purchase`
- [ ] Confirmar: ¿checkout en *checkout extensibility* o aún *Additional scripts*?
      (No bloquea el purchase porque va server-side; solo define dónde vive el poller de estrategia.)
```
