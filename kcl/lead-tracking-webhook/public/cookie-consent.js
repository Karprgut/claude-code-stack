/* ============================================================
   TBP · Cookie consent v2 (GDPR opt-in + Google Consent Mode v2
   + registro de consentimiento + reopener permanente)
   ────────────────────────────────────────────────────────────
   Carga vía Webflow Project Settings → Custom Code → FOOTER:
     <script src="https://tbp-brevo-tracking.vercel.app/cookie-consent.js" defer></script>

   REQUISITO PREVIO (Webflow → Custom Code → HEAD, ANTES de GTM):
   el snippet de Consent Mode "default denied" debe correr primero.
   Ver webflow-head-consent-snippet.html en este repo.

   Qué hace (v2, sep-2026 — respuesta al reporte de iubenda):
   - Banner opt-in con "Reject all" y "Accept all" IGUAL de visibles
     (mismo estilo), + "Manage preferences". Se pinta de inmediato,
     sin depender de animaciones/rAF (los escáneres lo ven).
   - Link permanente "Cookie Settings" en el footer legal del sitio
     (junto a Privacy Policy) desde la primera carga, + botón
     flotante tras decidir. Cualquier <a href="#cookie-settings">
     o [data-tbp-open] reabre las preferencias.
   - Registro de consentimiento: cada decisión (accept/reject/save)
     se manda a /api/consent con un id anónimo que vive en la cookie
     → prueba de consentimiento (GDPR art. 7.2). Export con secret.
   - Al guardar: gtag('consent','update'), fbq consent grant/revoke,
     dataLayer.push({event:'tbp_consent_update', ...}) para GTM y
     window.dispatchEvent(new CustomEvent('tbp:consent')).
   - Persiste en cookie `tbp_consent` (6 meses) con versión; re-pregunta
     si sube CONSENT_VERSION.
   ============================================================ */
(function () {
  "use strict";

  if (window.__tbpConsentLoaded) return;
  window.__tbpConsentLoaded = true;

  // ── Config ────────────────────────────────────────────────
  // Si cambia la política: sube CONSENT_VERSION (re-pregunta a todos y deja
  // registro de cada decisión), actualiza POLICY_VERSION y POLICY_URL.
  var CONSENT_VERSION = 2;                // v2 (10-sep-2026): política nueva + registro de consentimiento
  var POLICY_VERSION = "2026-09-10";  // fecha "Last updated" de la política enlazada
  var POLICY_URL = "https://cdn.prod.website-files.com/68ae09ab4fb8e082bdd9f99d/6aa33b474e4b86816f60cf0f_TBP-Cookie-Policy-2026-09.pdf"; // v2 subida por API (scripts/webflow-upload-asset.mjs); v1 sigue en 6a1f345c…_TBP-Cookie-Policy.pdf
  var LOG_ENDPOINT = "https://tbp-brevo-tracking.vercel.app/api/consent";
  var COOKIE_NAME = "tbp_consent";
  var COOKIE_DAYS = 180;              // ~6 meses (GDPR re-consent)
  var FOOTER_LEGAL_SELECTOR = ".pp-disc-termsnc"; // contenedor de Privacy Policy / Disclaimer / Terms en Webflow
  var SHOW_FLOATING_REOPENER = false; // Nota 36 (6-oct-2026): el flotante estorbaba visualmente.
                                      // Revocar consentimiento sigue disponible por el link
                                      // "Cookie Settings" del footer legal, que se inyecta siempre.

  // Categorías (necessary siempre on, no se puede desactivar)
  var CATEGORIES = [
    {
      key: "analytics",
      title: "Analytics",
      desc: "Help us understand how visitors use the site (Google Analytics 4)."
    },
    {
      key: "marketing",
      title: "Marketing",
      desc: "Measure ad performance and show relevant ads (Google Ads, Meta Pixel, Brevo)."
    }
  ];

  // ── Helpers ───────────────────────────────────────────────
  function uuid() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    } catch (e) {}
    var s = "", h = "0123456789abcdef";
    for (var i = 0; i < 32; i++) s += h[(Math.random() * 16) | 0];
    return s.slice(0, 8) + "-" + s.slice(8, 12) + "-4" + s.slice(13, 16) + "-a" + s.slice(17, 20) + "-" + s.slice(20);
  }

  function readCookieRaw() {
    var m = document.cookie.match(new RegExp("(?:^|; )" + COOKIE_NAME + "=([^;]*)"));
    if (!m) return null;
    try { return JSON.parse(decodeURIComponent(m[1])); } catch (e) { return null; }
  }

  function readConsent() {
    var data = readCookieRaw();
    if (!data || data.v !== CONSENT_VERSION) return null; // versión vieja → re-preguntar
    return data;
  }

  function writeConsent(state, id) {
    var data = {
      v: CONSENT_VERSION,
      id: id,
      ts: new Date().toISOString(),
      analytics: !!state.analytics,
      marketing: !!state.marketing
    };
    var exp = new Date();
    exp.setTime(exp.getTime() + COOKIE_DAYS * 864e5);
    document.cookie =
      COOKIE_NAME + "=" + encodeURIComponent(JSON.stringify(data)) +
      "; expires=" + exp.toUTCString() +
      "; path=/; SameSite=Lax" +
      (location.protocol === "https:" ? "; Secure" : "");
    return data;
  }

  // ── Registro de consentimiento (prueba GDPR) ──────────────
  function logConsent(data, action) {
    try {
      var payload = JSON.stringify({
        type: "cookie",
        id: data.id,
        v: data.v,
        action: action,                       // accept_all | reject_all | save_preferences
        analytics: !!data.analytics,
        marketing: !!data.marketing,
        policy: POLICY_VERSION,
        page: location.pathname,
        lang: document.documentElement.lang || navigator.language || "",
        ts_client: data.ts
      });
      // text/plain = request "simple" (sin preflight CORS); el endpoint parsea JSON.
      if (typeof fetch === "function") {
        fetch(LOG_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: payload,
          keepalive: true
        }).catch(function () {});
      } else if (navigator.sendBeacon) {
        navigator.sendBeacon(LOG_ENDPOINT, payload);
      }
    } catch (e) {}
  }

  // ── Aplicar consentimiento a las plataformas ──────────────
  function gtag() {
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag === "function") {
      window.gtag.apply(null, arguments);
    } else {
      window.dataLayer.push(arguments);
    }
  }

  function applyConsent(state) {
    var analytics = state.analytics ? "granted" : "denied";
    var marketing = state.marketing ? "granted" : "denied";

    // Google Consent Mode v2
    gtag("consent", "update", {
      analytics_storage: analytics,
      ad_storage: marketing,
      ad_user_data: marketing,
      ad_personalization: marketing
    });

    // Meta Pixel (no usa Consent Mode de Google)
    if (typeof window.fbq === "function") {
      window.fbq("consent", state.marketing ? "grant" : "revoke");
    }

    // Señal para GTM (triggers por estado de consentimiento)
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "tbp_consent_update",
      consent_analytics: !!state.analytics,
      consent_marketing: !!state.marketing
    });

    // Señal DOM para otros scripts del sitio (form/atribución)
    try {
      window.dispatchEvent(new CustomEvent("tbp:consent", {
        detail: { analytics: !!state.analytics, marketing: !!state.marketing, id: state.id || "" }
      }));
    } catch (e) {}
  }

  // ── Estilos ───────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById("tbp-consent-styles")) return;
    // Paleta TBP: off-white #f7f6f5, negro #000, grises #565656/#ddd/#ccc.
    // Fuentes de marca KMR Melange (ya cargadas por Webflow).
    // z-index por DEBAJO del cursor custom (.cursor = z-index:1001).
    var css =
      ":root{--tbp-c-bg:#fff;--tbp-c-fg:#000;--tbp-c-muted:#565656;--tbp-c-line:#ddd;--tbp-c-soft:#f7f6f5;}" +
      "#tbp-consent,#tbp-consent *,#tbp-consent-modal,#tbp-consent-modal *{box-sizing:border-box;font-family:'KMR Melange Semi Light',Arial,sans-serif;}" +
      "@keyframes tbpSlideUp{from{transform:translateY(110%)}to{transform:translateY(0)}}" +
      "#tbp-consent{position:fixed;z-index:995;left:0;right:0;bottom:0;display:block;background:var(--tbp-c-bg);color:var(--tbp-c-fg);padding:18px clamp(16px,4vw,40px);border-top:1px solid var(--tbp-c-line);box-shadow:0 -2px 18px rgba(0,0,0,.08);transform:translateY(0);animation:tbpSlideUp .35s ease both;}" +
      "#tbp-consent.tbp-hidden{display:none;}" +
      "#tbp-consent .tbp-row{max-width:1200px;margin:0 auto;display:flex;gap:24px;align-items:center;flex-wrap:wrap;justify-content:space-between;}" +
      "#tbp-consent .tbp-copy{flex:1 1 380px;font-size:13px;line-height:1.55;color:var(--tbp-c-muted);}" +
      "#tbp-consent .tbp-copy strong{font-family:'KMR Melange Bold',Arial,sans-serif;color:var(--tbp-c-fg);font-weight:700;}" +
      "#tbp-consent .tbp-copy a{color:var(--tbp-c-fg);text-decoration:underline;text-underline-offset:2px;}" +
      "#tbp-consent .tbp-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center;}" +
      // Accept y Reject: MISMO estilo (igual de visibles) — requisito EDPB/CNIL/AEPD
      "#tbp-consent button{font-family:'KMR Melange Bold',Arial,sans-serif;font-size:12px;letter-spacing:.04em;text-transform:uppercase;padding:11px 18px;border:1px solid var(--tbp-c-fg);background:var(--tbp-c-fg);color:#fff;cursor:pointer;transition:.18s;min-width:132px;text-align:center;}" +
      "#tbp-consent button:hover{background:#222;border-color:#222;}" +
      "#tbp-consent button.tbp-link{border:none;background:none;color:var(--tbp-c-fg);text-decoration:underline;text-underline-offset:2px;padding:11px 6px;min-width:0;}" +
      "#tbp-consent button.tbp-link:hover{background:none;color:var(--tbp-c-muted);}" +
      // modal
      "#tbp-consent-modal{position:fixed;inset:0;z-index:1000;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.45);padding:16px;}" +
      "#tbp-consent-modal.tbp-open{display:flex;}" +
      "#tbp-consent-modal .tbp-card{background:var(--tbp-c-bg);color:var(--tbp-c-fg);max-width:560px;width:100%;max-height:90vh;overflow:auto;padding:clamp(22px,4vw,38px);border:1px solid var(--tbp-c-line);}" +
      "#tbp-consent-modal h2{font-family:'KMR Melange Bold',Arial,sans-serif;font-size:21px;margin:0 0 6px;color:var(--tbp-c-fg);}" +
      "#tbp-consent-modal p.tbp-intro{font-size:13px;line-height:1.55;color:var(--tbp-c-muted);margin:0 0 20px;}" +
      "#tbp-consent-modal p.tbp-intro a{color:var(--tbp-c-fg);text-decoration:underline;text-underline-offset:2px;}" +
      "#tbp-consent-modal .tbp-cat{border-top:1px solid var(--tbp-c-line);padding:16px 0;display:flex;gap:14px;align-items:flex-start;justify-content:space-between;}" +
      "#tbp-consent-modal .tbp-cat h3{font-family:'KMR Melange Bold',Arial,sans-serif;font-size:14px;margin:0 0 4px;color:var(--tbp-c-fg);}" +
      "#tbp-consent-modal .tbp-cat p{font-size:12.5px;line-height:1.5;color:var(--tbp-c-muted);margin:0;}" +
      "#tbp-consent-modal .tbp-badge{font-family:'KMR Melange Bold',Arial,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--tbp-c-muted);background:var(--tbp-c-soft);border:1px solid var(--tbp-c-line);padding:4px 8px;white-space:nowrap;}" +
      "#tbp-consent-modal .tbp-switch{position:relative;width:44px;height:24px;flex:0 0 auto;}" +
      "#tbp-consent-modal .tbp-switch input{position:absolute;opacity:0;width:100%;height:100%;margin:0;cursor:pointer;}" +
      "#tbp-consent-modal .tbp-slider{position:absolute;inset:0;background:#ccc;transition:.2s;border-radius:24px;}" +
      "#tbp-consent-modal .tbp-slider::before{content:'';position:absolute;height:18px;width:18px;left:3px;top:3px;background:#fff;transition:.2s;border-radius:50%;}" +
      "#tbp-consent-modal input:checked + .tbp-slider{background:var(--tbp-c-fg);}" +
      "#tbp-consent-modal input:checked + .tbp-slider::before{transform:translateX(20px);}" +
      "#tbp-consent-modal .tbp-modal-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:24px;justify-content:flex-end;}" +
      "#tbp-consent-modal button{font-family:'KMR Melange Bold',Arial,sans-serif;font-size:12px;letter-spacing:.04em;text-transform:uppercase;padding:11px 18px;border:1px solid var(--tbp-c-fg);background:transparent;color:var(--tbp-c-fg);cursor:pointer;transition:.18s;}" +
      "#tbp-consent-modal button:hover{background:var(--tbp-c-soft);}" +
      "#tbp-consent-modal button.tbp-primary{background:var(--tbp-c-fg);border-color:var(--tbp-c-fg);color:#fff;}" +
      "#tbp-consent-modal button.tbp-primary:hover{background:#222;}" +
      // re-opener flotante
      "#tbp-consent-reopen{position:fixed;left:16px;bottom:16px;z-index:990;font-family:'KMR Melange Bold',Arial,sans-serif;font-size:11px;letter-spacing:.04em;text-transform:uppercase;background:var(--tbp-c-bg);color:var(--tbp-c-fg);border:1px solid var(--tbp-c-line);padding:9px 12px;cursor:pointer;opacity:.7;transition:.2s;}" +
      "#tbp-consent-reopen:hover{opacity:1;background:var(--tbp-c-soft);}" +
      // link permanente en footer (hereda el estilo de los links legales de Webflow)
      "#tbp-cookie-settings-link{cursor:pointer;}" +
      "@media(max-width:640px){#tbp-consent .tbp-actions{width:100%;}#tbp-consent button{flex:1 1 auto;min-width:0;}}";
    var s = document.createElement("style");
    s.id = "tbp-consent-styles";
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ── UI ────────────────────────────────────────────────────
  function buildBanner() {
    var el = document.createElement("div");
    el.id = "tbp-consent";
    el.className = "tbp-cookie-banner cookie-banner";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-label", "Cookie consent banner");
    el.setAttribute("data-cookie-banner", "tbp");
    el.setAttribute("data-nosnippet", "");
    el.innerHTML =
      '<div class="tbp-row">' +
      '<div class="tbp-copy"><strong>We use cookies.</strong> We use cookies to analyze traffic and measure our marketing. ' +
      "You can accept all, reject all, or manage your preferences by category. " +
      'You can change your choice at any time from &ldquo;Cookie Settings&rdquo; in the footer. ' +
      'See our <a href="' + POLICY_URL + '" target="_blank" rel="noopener">Cookie Policy</a>.</div>' +
      '<div class="tbp-actions">' +
      '<button type="button" class="tbp-link" id="tbp-consent-prefs" data-tbp="prefs" data-action="preferences" aria-label="Manage cookie preferences">Manage preferences</button>' +
      '<button type="button" id="tbp-consent-reject" data-tbp="reject" data-action="reject" aria-label="Reject all cookies">Reject all</button>' +
      '<button type="button" id="tbp-consent-accept" data-tbp="accept" data-action="accept" aria-label="Accept all cookies">Accept all</button>' +
      "</div></div>";
    document.body.appendChild(el);
    return el;
  }

  function buildModal(current) {
    var el = document.createElement("div");
    el.id = "tbp-consent-modal";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", "Cookie preferences");
    var cats = CATEGORIES.map(function (c) {
      var checked = current && current[c.key] ? "checked" : "";
      return (
        '<div class="tbp-cat">' +
        "<div><h3>" + c.title + "</h3><p>" + c.desc + "</p></div>" +
        '<label class="tbp-switch"><input type="checkbox" data-cat="' +
        c.key + '" ' + checked + ' aria-label="' + c.title + ' cookies"><span class="tbp-slider"></span></label>' +
        "</div>"
      );
    }).join("");
    el.innerHTML =
      '<div class="tbp-card">' +
      "<h2>Cookie preferences</h2>" +
      '<p class="tbp-intro">Choose which cookies you allow. Necessary cookies are always on. ' +
      'Details in our <a href="' + POLICY_URL + '" target="_blank" rel="noopener">Cookie Policy</a>.</p>' +
      '<div class="tbp-cat"><div><h3>Necessary</h3><p>Required for the site to work and to remember your choices. Always active.</p></div>' +
      '<span class="tbp-badge">Always on</span></div>' +
      cats +
      '<div class="tbp-modal-actions">' +
      '<button type="button" id="tbp-modal-reject" data-tbp="reject" data-action="reject" aria-label="Reject all cookies">Reject all</button>' +
      '<button type="button" id="tbp-modal-save" data-tbp="save" data-action="save" aria-label="Save cookie preferences">Save preferences</button>' +
      '<button type="button" class="tbp-primary" id="tbp-modal-accept" data-tbp="accept" data-action="accept" aria-label="Accept all cookies">Accept all</button>' +
      "</div></div>";
    document.body.appendChild(el);
    return el;
  }

  function buildReopener() {
    if (!SHOW_FLOATING_REOPENER) return;
    if (document.getElementById("tbp-consent-reopen")) return;
    var b = document.createElement("button");
    b.id = "tbp-consent-reopen";
    b.type = "button";
    b.setAttribute("aria-label", "Open cookie settings");
    b.textContent = "Cookie settings";
    b.addEventListener("click", openModal);
    document.body.appendChild(b);
  }

  // Link permanente "Cookie Settings" en el footer legal (visible SIEMPRE,
  // también antes de decidir). Si Webflow ya trae <a href="#cookie-settings">,
  // no duplica.
  function injectFooterLink() {
    if (document.querySelector('a[href="#cookie-settings"]')) return;
    var holder = document.querySelector(FOOTER_LEGAL_SELECTOR);
    if (!holder) return;
    var a = document.createElement("a");
    a.href = "#cookie-settings";
    a.id = "tbp-cookie-settings-link";
    a.className = "link-footer-type2 last";
    a.setAttribute("data-tbp-open", "");
    a.textContent = "Cookie Settings";
    holder.appendChild(a);
  }

  // ── State / orquestación ──────────────────────────────────
  var banner, modal;

  function showBanner() {
    if (!banner) {
      banner = buildBanner();
      banner.addEventListener("click", onBannerClick);
    }
    banner.classList.remove("tbp-hidden");
  }

  function hideBanner() {
    if (banner) banner.classList.add("tbp-hidden");
  }

  function openModal() {
    var current = readConsent() || { analytics: false, marketing: false };
    if (!modal) {
      modal = buildModal(current);
      modal.addEventListener("click", onModalClick);
    } else {
      CATEGORIES.forEach(function (c) {
        var input = modal.querySelector('input[data-cat="' + c.key + '"]');
        if (input) input.checked = !!current[c.key];
      });
    }
    modal.classList.add("tbp-open");
  }

  function closeModal() {
    if (modal) modal.classList.remove("tbp-open");
  }

  function commit(state, action) {
    var prev = readCookieRaw();
    var id = (prev && typeof prev.id === "string" && prev.id) ? prev.id : uuid();
    var data = writeConsent(state, id);
    applyConsent(data);
    logConsent(data, action);
    hideBanner();
    closeModal();
    buildReopener();
  }

  function readModalToggles() {
    var state = {};
    CATEGORIES.forEach(function (c) {
      var input = modal && modal.querySelector('input[data-cat="' + c.key + '"]');
      state[c.key] = !!(input && input.checked);
    });
    return state;
  }

  function acceptAll() { commit({ analytics: true, marketing: true }, "accept_all"); }
  function rejectAll() { commit({ analytics: false, marketing: false }, "reject_all"); }

  function onBannerClick(e) {
    var t = e.target.closest("[data-tbp]");
    if (!t) return;
    var a = t.getAttribute("data-tbp");
    if (a === "accept") acceptAll();
    else if (a === "reject") rejectAll();
    else if (a === "prefs") openModal();
  }

  function onModalClick(e) {
    if (e.target === modal) return closeModal(); // click en backdrop
    var t = e.target.closest("[data-tbp]");
    if (!t) return;
    var a = t.getAttribute("data-tbp");
    if (a === "accept") acceptAll();
    else if (a === "reject") rejectAll();
    else if (a === "save") commit(readModalToggles(), "save_preferences");
  }

  // Abrir preferencias desde cualquier link del sitio:
  //   <a href="#cookie-settings"> o cualquier elemento [data-tbp-open]
  function wireExternalOpeners() {
    document.addEventListener("click", function (e) {
      var t = e.target.closest('[data-tbp-open],a[href="#cookie-settings"]');
      if (t) {
        e.preventDefault();
        openModal();
      }
    });
    window.addEventListener("hashchange", function () {
      if (location.hash === "#cookie-settings") openModal();
    });
    if (location.hash === "#cookie-settings") openModal();
  }

  // ── Init ──────────────────────────────────────────────────
  function init() {
    injectStyles();
    injectFooterLink();
    wireExternalOpeners();
    var existing = readConsent();
    if (existing) {
      // ya decidió antes (y misma versión) → re-aplica y muestra re-opener
      applyConsent(existing);
      buildReopener();
    } else {
      // sin consentimiento válido → todo sigue denied (default del head) + banner
      showBanner();
    }
  }

  // API pública mínima (debug / integraciones)
  window.tbpConsent = {
    version: CONSENT_VERSION,
    policy: POLICY_VERSION,
    get: readConsent,
    open: function () { openModal(); },
    acceptAll: acceptAll,
    rejectAll: rejectAll
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
