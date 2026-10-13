// TBP · Brevo webhook → GA4 MP + Meta CAPI (+ atribución de vuelta a Brevo)
// ─────────────────────────────────────────────────────────────────────────
// Recibe el POST `listAddition` de Brevo y reenvía el lead a GA4 (Measurement
// Protocol) y a Meta (Conversions API). v3 · 15-sep-2026:
//   · Consulta el contacto en Brevo para saber de dónde viene el lead:
//       - lead del FORMULARIO INSTANTÁNEO de Meta (llega por Zapier con FORM_ID/EXT_ID)
//         → NO se manda a Meta CAPI (Meta ya lo tiene como lead nativo; mandarlo
//           duplicaba "clientes potenciales del sitio web" y contaminaba la señal
//           de la campaña Web Leads). Sí va a GA4, atribuido a su campaña.
//       - lead del FORMULARIO WEB (tu-sitio.com) → Meta CAPI como evento de sitio
//         (action_source website cuando hay fbp/fbc + user agent del navegador)
//         y GA4 con la sesión real del usuario.
//   · Escribe la atribución (UTM, landing, referrer, fbp/fbc, GA client id) en los
//     atributos del contacto de Brevo, y mapea CAMPAIGN_NAME / CAMPAIGN_ID /
//     ADSET_NAME / AD_NAME desde utm_campaign / utm_id / utm_content / utm_term,
//     para que el CRM vea la fuente de un lead web igual que la de un lead de Meta.
//   · Ya no manda la IP / user agent del servidor de Brevo como si fueran del usuario.
//   · Modo prueba: `?dry=1` en la URL → Meta recibe el evento con test_event_code
//     (pestaña "Probar eventos", no cuenta), GA4 usa el endpoint de validación y
//     no se escribe nada en Brevo. Sirve para verificar la tubería sin ensuciar datos.
// v4 · 17-sep-2026 (fix "generate_lead = Unassigned" en GA4):
//   · El form ahora manda generate_lead CLIENT-SIDE (gtag, pegado a la sesión real)
//     y marca ga_client_sent en /api/attribution. Si el lead web trae esa marca,
//     aquí NO se manda por Measurement Protocol (evita el doble conteo). El MP queda
//     para leads del form de Meta (nunca pisan el sitio) y para leads web sin JS.
//   · Espera 2.5 s y relee Redis si el lead web aún no trae la marca (la
//     confirmación del form y el listAddition de Brevo llegan casi a la vez).
//   · Normaliza ga_session_id: la cookie _ga_* usa formato GS2
//     ("s<id>$o<n>$g…") y el parser viejo mandaba esa cadena entera como
//     session_id → GA4 no podía pegar el evento a la sesión.

import crypto from 'node:crypto';
import { getRedis } from '../lib/redis-client.js';
import { extractClickIds } from '../lib/click-ids.js';

const META_FORM_LISTS = new Set([13, 18, 19, 20, 21]); // Meta Leads + Sprint/Core/Deep/Brand applications (Zapier)
const WEB_FORM_LISTS  = new Set([6, 7, 17]);           // Latest Leads / TBP Studio / TBP - forms (form del sitio)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.BREVO_WEBHOOK_SECRET;
  if (!secret || req.query.secret !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const dry = req.query.dry === '1' || req.query.dry === 'true';

  const payload = req.body || {};
  console.log('[brevo-webhook] payload received:', JSON.stringify(payload).slice(0, 2000));

  const eventName = (payload.event || payload.event_name || payload['event-name'] || '').toString();
  const cp = payload.contact_properties || {};
  const ids = payload.identifiers || {};
  const email = (
    cp.EMAIL || cp.email || ids.email_id || payload.email || payload['email-address'] ||
    (payload.contact && payload.contact.email) || ''
  ).toString();

  const ignoredEvents = ['unsubscribed', 'unsubscription', 'spam', 'hard_bounce', 'soft_bounce',
    'blocked', 'invalid_email', 'deferred', 'click', 'opened', 'delivered'];
  if (ignoredEvents.some(e => eventName.toLowerCase().includes(e))) {
    return res.status(200).json({ ok: true, skipped: true, reason: 'event_ignored', received_event: eventName });
  }
  if (!email) {
    return res.status(200).json({ ok: true, skipped: true, reason: 'no_email_in_payload', received_event: eventName });
  }

  const emailNormalized = email.toLowerCase().trim();
  const emailHash = sha256(emailNormalized);

  // ── Contacto en Brevo (fuente del lead + datos para match keys) ──
  const contact = await fetchBrevoContact(emailNormalized);
  const attrs = Object.assign({}, contact?.attributes || {}, cp);
  const listIds = Array.isArray(contact?.listIds) ? contact.listIds : [];
  const payloadLists = [].concat(payload.list_id ?? payload.listIds ?? []).map(Number).filter(Boolean);
  const isMetaForm = !!(attrs.FORM_ID || attrs.EXT_ID) ||
    (payloadLists.some(l => META_FORM_LISTS.has(l)) && !payloadLists.some(l => WEB_FORM_LISTS.has(l)) && !listIds.some(l => WEB_FORM_LISTS.has(l)));
  const source = isMetaForm ? 'meta_form' : 'web_form';

  const rawPhone = (attrs.SMS || attrs.PHONE || attrs.WHATSAPP || ids.phone_id || payload.SMS || payload.phone || '').toString();
  const phoneNormalized = rawPhone.replace(/[^0-9]/g, '');
  const phoneHash = phoneNormalized ? sha256(phoneNormalized) : '';
  const { firstName, lastName } = splitName((attrs.NOMBRE || attrs.FIRSTNAME || '').toString(), (attrs.APELLIDOS || attrs.LASTNAME || '').toString());

  const CATEGORY_MAP = { '1': 'Sprint', '2': 'Core', '3': 'Deep', '4': 'Brand Applications' };
  const INDUSTRIA_MAP = { '1': 'Startups & tech', '2': 'Logistics & transportation', '3': 'Professional services',
    '4': 'Real estate', '5': 'Hospitality & travel', '6': 'Food, beverages & spirits', '7': 'Healthcare & wellness',
    '8': 'Fashion & beauty', '9': 'Retail & e-commerce', '10': 'Entertainment & media', '11': 'Education & non-profit' };
  const REGION_MAP = { '1': 'America', '2': 'Europe', '3': 'Middle East', '4': 'Asia', '5': 'Oceania', '6': 'Africa' };
  const categoryRaw = (attrs.CATEGORY || '').toString();
  const industriaRaw = (attrs.INDUSTRIA || '').toString();
  const regionRaw = (attrs.WHERE_ARE_YOU_BASED || '').toString();
  const lead = {
    source,
    category: CATEGORY_MAP[categoryRaw] || categoryRaw || '',
    industria: INDUSTRIA_MAP[industriaRaw] || industriaRaw || '',
    region: REGION_MAP[regionRaw] || regionRaw || '',
    name: (attrs.NOMBRE || '').toString(),
    tellUsAbout: (attrs.TELL_US_ABOUT || '').toString().slice(0, 200)
  };

  // ── Atribución guardada por el form del sitio (Redis, 30 min) ──
  let attribution = {
    utm_source: '', utm_medium: '', utm_campaign: '', utm_id: '', utm_term: '', utm_content: '',
    referrer: '', landing_page: '', ga_client_id: '', ga_session_id: '', ga_session_number: 1,
    fbp: '', fbc: '', user_agent: ''
  };
  let attributionHit = false;
  const readAttribution = async () => {
    try {
      const redis = await getRedis();
      const cached = await redis.get(`attribution:${emailHash}`);
      if (cached) {
        attribution = Object.assign(attribution, typeof cached === 'string' ? JSON.parse(cached) : cached);
        attributionHit = true;
      }
    } catch (e) {
      console.warn('[brevo-webhook] Redis read failed:', e?.message || e);
    }
  };
  await readAttribution();
  // v4: el form marca ga_client_sent al confirmar el envío; Brevo dispara listAddition
  // casi al mismo tiempo → si un lead web aún no trae la marca, esperar y releer una vez.
  if (!isMetaForm && !attribution.ga_client_sent) {
    await sleep(2500);
    await readAttribution();
  }
  const clientSent = !isMetaForm && !!attribution.ga_client_sent;
  attribution.ga_session_id_raw = attribution.ga_session_id;
  attribution.ga_session_id = normalizeGaSessionId(attribution.ga_session_id);
  attribution.ga_session_number = normalizeGaSessionNumber(attribution.ga_session_number, attribution.ga_session_id_raw);
  // Leads del form de Meta: la atribución viene en los atributos que puso Zapier.
  if (isMetaForm) {
    attribution.utm_source = attribution.utm_source || 'facebook';
    attribution.utm_medium = attribution.utm_medium || 'cpa';
    attribution.utm_campaign = attribution.utm_campaign || (attrs.CAMPAIGN_NAME || '').toString();
    attribution.utm_id = attribution.utm_id || (attrs.CAMPAIGN_ID || '').toString();
    attribution.utm_content = attribution.utm_content || (attrs.ADSET_NAME || '').toString();
    attribution.utm_term = attribution.utm_term || (attrs.AD_NAME || '').toString();
  }
  console.log('[brevo-webhook] lead', { source, attributionHit, clientSent, utm_campaign: attribution.utm_campaign,
    has_fbp: !!attribution.fbp, has_fbc: !!attribution.fbc, has_ua: !!attribution.user_agent, has_ga: !!attribution.ga_client_id,
    ga_session_id: attribution.ga_session_id, dry });

  // ── event_id determinístico (dedup entre los N disparos de un mismo envío y con el pixel) ──
  const contactId = (payload.contact_id || payload.id || contact?.id || '').toString();
  const formId = (payload.form_id || attrs.FORM_ID || 'web').toString();
  const eventDateMinute = (payload.event_date || payload.date || '').toString().slice(0, 16);
  const eventId = (attribution.event_id || '').toString() ||
    ((contactId && eventDateMinute) ? `lead_${contactId}_${formId}_${eventDateMinute.replace(/[^0-9]/g, '')}`
      : `lead_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`);
  const eventTime = Math.floor(Date.now() / 1000);
  const sourceUrl = process.env.EVENT_SOURCE_URL || 'https://www.tu-sitio.com/';

  const jobs = [
    clientSent
      ? Promise.resolve({ ok: true, skipped: true, reason: 'client_side_event_already_sent' })
      : sendToGA4MP({ eventId, emailHash, lead, attribution, dry }),
    isMetaForm
      ? Promise.resolve({ ok: true, skipped: true, reason: 'meta_form_lead_already_in_meta' })
      : sendToMetaCAPI({ eventId, emailHash, phoneHash, firstName, lastName, eventTime, sourceUrl, lead, attribution, dry }),
    (!isMetaForm && attributionHit && !dry)
      ? writeAttributionToBrevo(emailNormalized, attribution)
      : Promise.resolve({ ok: true, skipped: true, reason: isMetaForm ? 'meta_form_lead' : (dry ? 'dry_run' : 'no_attribution_cached') })
  ];
  const [ga4Result, metaResult, brevoResult] = await Promise.allSettled(jobs);

  return res.status(200).json({
    ok: true, dry, source, event_id: eventId, attribution_hit: attributionHit, ga_client_sent: clientSent,
    ga4: summarize(ga4Result), meta: summarize(metaResult), brevo: summarize(brevoResult)
  });
}

// ───────────────────────────── helpers ─────────────────────────────

function sha256(str) { return crypto.createHash('sha256').update(str).digest('hex'); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
// _ga_* llega como "<ID>" (GS1 / parser nuevo) o como "s1789662190$o1$g0$t…"
// (GS2 con el parser viejo, todavía cacheado 5 min en CDN/navegador). Solo el id numérico sirve.
function normalizeGaSessionId(v) {
  const s = (v || '').toString();
  const m = s.match(/^s?(\d{9,11})/);
  return m ? m[1] : '';
}
function normalizeGaSessionNumber(n, raw) {
  const fromRaw = ((raw || '').toString().match(/\$o(\d+)/) || [])[1];
  const v = parseInt(fromRaw || n, 10);
  return Number.isFinite(v) && v > 0 ? v : 1;
}
function summarize(s) { return s.status === 'fulfilled' ? s.value : { ok: false, error: s.reason?.message || String(s.reason) }; }
function normName(s) { return (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z\s]/g, '').trim(); }
function splitName(nombre, apellidos) {
  // En Brevo NOMBRE y APELLIDOS suelen traer el nombre completo repetido; se toma
  // la primera palabra como nombre y el resto como apellido.
  const full = normName(nombre) || normName(apellidos);
  if (!full) return { firstName: '', lastName: '' };
  const parts = full.split(/\s+/);
  const ap = normName(apellidos);
  return { firstName: parts[0], lastName: (ap && ap !== full) ? ap : parts.slice(1).join(' ') };
}

async function fetchBrevoContact(email) {
  const key = process.env.BREVO_API_KEY;
  if (!key) { console.warn('[brevo-webhook] BREVO_API_KEY missing: no contact lookup'); return null; }
  try {
    const r = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, { headers: { 'api-key': key, accept: 'application/json' } });
    if (!r.ok) { console.warn('[brevo-webhook] contact lookup', r.status); return null; }
    return await r.json();
  } catch (e) { console.warn('[brevo-webhook] contact lookup failed:', e?.message || e); return null; }
}

async function writeAttributionToBrevo(email, a) {
  const key = process.env.BREVO_API_KEY;
  if (!key) return { ok: false, skipped: true, reason: 'missing_brevo_key' };
  const attributes = {};
  const put = (k, v) => { if (v) attributes[k] = v.toString().slice(0, 250); };
  put('UTM_SOURCE', a.utm_source); put('UTM_MEDIUM', a.utm_medium); put('UTM_CAMPAIGN', a.utm_campaign);
  put('UTM_TERM', a.utm_term); put('UTM_CONTENT', a.utm_content);
  put('LANDING_PAGE', a.landing_page); put('REFERRER', a.referrer);
  put('FBP', a.fbp); put('FBC', a.fbc); put('GA_CLIENT_ID', a.ga_client_id);
  // Click ids de Google Ads en campos propios (la LANDING_PAGE se recorta a 250 y los perdía).
  const ids = extractClickIds(a);
  put('GCLID', ids.gclid); put('GBRAID', ids.gbraid); put('WBRAID', ids.wbraid);
  // Mismos campos que llena Zapier para los leads de Meta → el CRM ve la fuente igual.
  put('CAMPAIGN_NAME', a.utm_campaign); put('CAMPAIGN_ID', a.utm_id); put('ADSET_NAME', a.utm_content); put('AD_NAME', a.utm_term);
  if (!Object.keys(attributes).length) return { ok: true, skipped: true, reason: 'nothing_to_write' };
  try {
    const r = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
      method: 'PUT', headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ attributes })
    });
    return { ok: r.ok, status: r.status, written: Object.keys(attributes) };
  } catch (e) { return { ok: false, error: e?.message || String(e) }; }
}

async function sendToGA4MP({ eventId, emailHash, lead, attribution, dry }) {
  const measurementId = process.env.GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_API_SECRET;
  if (!measurementId || !apiSecret) return { ok: false, skipped: true, reason: 'missing_credentials' };
  const clientId = attribution.ga_client_id || (emailHash.slice(0, 16) + '.' + Math.floor(Date.now() / 1000));
  const base = dry ? 'https://www.google-analytics.com/debug/mp/collect' : 'https://www.google-analytics.com/mp/collect';
  const url = `${base}?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`;
  const body = {
    client_id: clientId,
    user_id: emailHash,
    events: [{
      name: 'generate_lead',
      params: {
        event_id: eventId, engagement_time_msec: 1000, currency: 'MXN', value: 1.0,
        form_name: lead.source === 'meta_form' ? 'meta_instant_form' : 'tbp_contact_brevo',
        source: 'brevo_webhook', lead_source: lead.source,
        ...(attribution.ga_session_id     ? { session_id: attribution.ga_session_id } : {}),
        ...(attribution.ga_session_number ? { session_number: attribution.ga_session_number } : {}),
        ...(lead.category  ? { service_category: lead.category } : {}),
        ...(lead.industria ? { industry: lead.industria } : {}),
        ...(lead.region    ? { region: lead.region } : {}),
        ...(attribution.utm_source   ? { campaign_source: attribution.utm_source } : {}),
        ...(attribution.utm_medium   ? { campaign_medium: attribution.utm_medium } : {}),
        ...(attribution.utm_campaign ? { campaign: attribution.utm_campaign } : {}),
        ...(attribution.utm_id       ? { campaign_id: attribution.utm_id } : {}),
        ...(attribution.utm_term     ? { campaign_term: attribution.utm_term } : {}),
        ...(attribution.utm_content  ? { campaign_content: attribution.utm_content } : {}),
        ...(attribution.referrer     ? { page_referrer: attribution.referrer } : {}),
        ...(attribution.landing_page ? { landing_page: attribution.landing_page } : {})
      }
    }],
    user_properties: {
      lead_source: { value: lead.source === 'meta_form' ? 'meta_instant_form' : 'brevo_form' },
      ...(lead.category  ? { lead_service_category: { value: lead.category } } : {}),
      ...(lead.industria ? { lead_industry: { value: lead.industria } } : {}),
      ...(lead.region    ? { lead_region: { value: lead.region } } : {})
    }
  };
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  let validation = null;
  if (dry) { try { validation = await r.json(); } catch (_) {} }
  return { ok: r.ok, status: r.status, ...(validation ? { validation } : {}) };
}

async function sendToMetaCAPI({ eventId, emailHash, phoneHash, firstName, lastName, eventTime, sourceUrl, lead, attribution, dry }) {
  const datasetId = process.env.META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  if (!datasetId || !token) return { ok: false, skipped: true, reason: 'missing_credentials' };
  // Evento de SITIO cuando tenemos el contexto del navegador (fbp/fbc + user agent que
  // capturó el form); si no, evento de CRM (system_generated) solo con email/teléfono.
  const website = !!(attribution.user_agent && (attribution.fbp || attribution.fbc));
  const userData = {
    em: [emailHash],
    ...(phoneHash ? { ph: [phoneHash] } : {}),
    ...(firstName ? { fn: [sha256(firstName)] } : {}),
    ...(lastName  ? { ln: [sha256(lastName)] } : {}),
    ...(attribution.fbp ? { fbp: attribution.fbp } : {}),
    ...(attribution.fbc ? { fbc: attribution.fbc } : {}),
    ...(website ? { client_user_agent: attribution.user_agent } : {})
  };
  const body = {
    data: [{
      event_name: 'Lead',
      event_time: eventTime,
      event_id: eventId,
      action_source: website ? 'website' : 'system_generated',
      event_source_url: attribution.landing_page || sourceUrl,
      user_data: userData,
      custom_data: {
        ...(website ? {} : { event_source: 'crm', lead_event_source: 'Brevo' }),
        currency: 'MXN', value: 1.0, content_name: 'TBP Contact Form',
        ...(lead.category  ? { service_category: lead.category } : {}),
        ...(lead.industria ? { industry: lead.industria } : {}),
        ...(lead.region    ? { region: lead.region } : {}),
        ...(attribution.utm_source   ? { utm_source: attribution.utm_source } : {}),
        ...(attribution.utm_medium   ? { utm_medium: attribution.utm_medium } : {}),
        ...(attribution.utm_campaign ? { utm_campaign: attribution.utm_campaign } : {}),
        ...(attribution.utm_id       ? { utm_id: attribution.utm_id } : {}),
        ...(attribution.referrer     ? { referrer: attribution.referrer } : {})
      }
    }],
    ...(dry ? { test_event_code: process.env.META_TEST_EVENT_CODE || 'TEST_TBP' } : {}),
    access_token: token
  };
  const r = await fetch(`https://graph.facebook.com/v25.0/${encodeURIComponent(datasetId)}/events`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  let data = null; try { data = await r.json(); } catch (_) {}
  return { ok: r.ok, status: r.status, action_source: body.data[0].action_source, match_keys: Object.keys(userData), response: data };
}
