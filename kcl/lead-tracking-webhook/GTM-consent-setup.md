# TBP · Configurar consentimiento en GTM (`GTM-XXXXXXX`)

Guía paso a paso para que las tags respeten el banner de cookies. Aplica **después** de pegar:
1. El snippet `webflow-head-consent-snippet.html` en el **Head** de Webflow (arriba de GTM).
2. El loader del banner en el **Footer** de Webflow:
   ```html
   <script src="https://tbp-brevo-tracking.vercel.app/cookie-consent.js" defer></script>
   ```

---

## 1. Activar Consent Mode en el contenedor

GTM → **Admin → Container Settings** → marca **"Enable consent overview"** (icono de escudo aparece en la lista de Tags).

## 2. Marcar consentimiento requerido por tag

En **Tags**, abre cada tag → sección **Consent Settings** (abajo) → **"Require additional consent for tag to fire"** y añade:

| Tag | Consentimiento requerido |
|---|---|
| Google Analytics 4 (config + eventos) | `analytics_storage` |
| Google Ads — Conversion `AW-XXXXXXXXXX` | `ad_storage`, `ad_user_data` |
| Google Ads — Remarketing / Conversion Linker | `ad_storage` |
| Meta Pixel (base + Lead) | *(ver paso 3 — no usa Consent Mode)* |

> GA4 y Google Ads, al usar Consent Mode nativo, **ya respetan el estado** aunque no marques nada; marcarlo explícito es la práctica recomendada y bloquea por completo pre-consentimiento.

## 3. Meta Pixel — gate por trigger (no usa Consent Mode de Google)

El Pixel de Meta no entiende `gtag consent`. Dos opciones:

**A) Recomendada — disparar el Pixel solo tras consentimiento:**
1. Crea variable **Data Layer Variable** → nombre `consent_marketing` (clave `consent_marketing`).
2. Crea trigger **Custom Event** → nombre de evento `tbp_consent_update`, condición `consent_marketing` **equals** `true`.
3. En la tag base del Pixel de Meta, cambia su trigger a este nuevo trigger (en lugar de "All Pages").
   - Para el evento **Lead**, deja que dispare en el submit del form **pero** añade una condición de excepción si `consent_marketing` no es `true`, o confía en el `fbq('consent','revoke')` que ya hace el banner.

**B) Alternativa simple:** el banner ya llama `fbq('consent','grant'/'revoke')`. Si dejas el Pixel en "All Pages", Meta encolará eventos hasta el `grant`. Es válido pero menos estricto que A para GDPR.

## 4. (Opcional) Bloquear el fallback de Google Ads del form

El HTML del form tiene un fallback que inyecta `gtag/js?id=AW-XXXXXXXXXX` directo si GTM no está. Con Consent Mode default `denied` ya no setea cookies, pero si quieres bloqueo total revisa que GTM esté presente (lo está) para que ese fallback nunca corra.

## 5. Probar

1. Publica el contenedor de GTM (**Submit → Publish**).
2. En el sitio (incógnito): debe verse el banner y **GA/Ads/Meta NO deben disparar** (revisa con la extensión *Google Tag Assistant* / *Meta Pixel Helper* → 0 eventos antes de aceptar).
3. **Accept all** → en Tag Assistant deben aparecer `consent: update` con todo `granted` y dispararse GA4/Ads/Meta.
4. **Reject all** → siguen bloqueados.
5. Recarga → recuerda la decisión (cookie `tbp_consent`, 6 meses). Cambia preferencias con el botón **"Cookie settings"** (abajo-izquierda) o cualquier link `#cookie-settings`.

## 6. Caducidad / re-consentimiento

El banner re-pregunta automáticamente cuando subes `CONSENT_VERSION` en `cookie-consent.js` (p. ej. si cambia la política) o cuando expira la cookie (180 días).

---

## 7. (Opcional, sep-2026) Modo estricto para las etiquetas de Google

Hoy GA4 y Google Ads corren en **Consent Mode avanzado**: antes de consentir mandan pings
sin cookies (`gcs=G100`) a `google-analytics.com` / `googlesyndication.com`. Es legal y así lo
reconoce iubenda ("Google Consent Mode v2: todo en orden"), pero si TBP prefiere cero llamadas
a Google antes del consentimiento:

1. GTM → Tags → **Google Tag (GA4 G-XXXXXXXXXX)** y **Google Ads (AW-XXXXXXXXXX)** →
   Consent Settings → *Require additional consent for tag to fire* → `analytics_storage` /
   `ad_storage` + `ad_user_data`.
2. Quitar del Head de Webflow el `gtag/js?id=AW-XXXXXXXXXX` directo (está duplicado con la
   tag de Google Ads que ya vive en GTM) o marcarlo igual con consentimiento requerido.
3. Publicar el contenedor y verificar en incógnito: 0 requests a Google antes de aceptar.
