// TBP · Lead endpoint — formulario propio del check-out (Landing v5)
// ───────────────────────────────────────────────────────────────────
// Reemplaza el submit del embed de Brevo en /proyectos/<tier>.
//
// Qué hace, en orden:
//   1. Guarda la atribución en Redis con el MISMO formato y la MISMA llave
//      que /api/attribution, para que api/brevo-webhook.js la siga leyendo
//      sin cambios (UTMs, fbp/fbc, ga_client_id → GA4 MP + Meta CAPI).
//   2. Crea o actualiza el contacto en Brevo dentro de la lista 17
//      "TBP - forms" con los atributos del formulario.
//
// Por qué la lista 17 importa: el Zap "TBP Studio" (id 360152739) se dispara
// con "New Contact in List 17" y rutea por el atributo CATEGORY
// (1 Sprint · 2 Core · 3 Deep · 4 Brand Applications). Mientras el contacto
// caiga en esa lista con CATEGORY, el Zap sigue funcionando igual que con el
// formulario de Brevo: correo al owner + creación del deal en el CRM.
//
// Deliberadamente NO se escribe FORM_ID: brevo-webhook.js usa FORM_ID/EXT_ID
// para distinguir los leads del formulario instantáneo de Meta (que mete
// Zapier) de los del sitio. Sin FORM_ID, el lead se clasifica como web_form.

import crypto from 'node:crypto';
import { getRedis } from '../lib/redis-client.js';
import { extractClickIds } from '../lib/click-ids.js';

const BREVO_API = 'https://api.brevo.com/v3/contacts';
const LIST_ID = 17;                 // TBP - forms
const TTL_SECONDS = 30 * 60;        // mismo TTL que /api/attribution

// tier → CATEGORY y OWNER, alineados con el recipe del Zap
const TIERS = {
  sprint: { category: '1', owner: '1' }, // Javier
  core:   { category: '2', owner: '2' }, // Karla
  deep:   { category: '3', owner: '3' }  // Hello
};

const ALLOWED_ORIGINS = [
  'https://www.tu-sitio.com',
  'https://tu-sitio.com',
  'https://tbp-dev.webflow.io'
];

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('[lead] falta BREVO_API_KEY');
    return res.status(500).json({ error: 'server_misconfigured' });
  }

  const p = req.body || {};
  const email = str(p.email, 200).toLowerCase();
  const tier = str(p.tier, 20).toLowerCase();

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'invalid_email' });
  }
  if (!TIERS[tier]) {
    return res.status(400).json({ error: 'invalid_tier' });
  }

  const eventId = str(p.event_id, 100) || ('lead_' + Date.now().toString(36) + '_' + crypto.randomBytes(5).toString('hex'));
  // gclid / gbraid / wbraid: lo que Google Ads necesita para contar este lead (ver lib/click-ids.js)
  const clickIds = extractClickIds(p);

  // ── 1 · Atribución a Redis (formato idéntico a /api/attribution) ──────────
  try {
    const redis = await getRedis();
    const data = {
      utm_source:        str(p.utm_source, 200),
      utm_medium:        str(p.utm_medium, 200),
      utm_campaign:      str(p.utm_campaign, 200),
      utm_id:            str(p.utm_id, 200),
      utm_term:          str(p.utm_term, 200),
      utm_content:       str(p.utm_content, 200),
      referrer:          str(p.referrer, 1000),
      landing_page:      str(p.landing_page, 1000),
      ...clickIds,
      ga_client_id:      str(p.ga_client_id, 100),
      ga_session_id:     str(p.ga_session_id, 50),
      ga_session_number: parseInt(p.ga_session_number || '1', 10) || 1,
      fbp:               str(p.fbp, 200),
      fbc:               str(p.fbc, 200),
      user_agent:        str(p.user_agent || req.headers['user-agent'], 500),
      event_id:          eventId,
      ga_client_sent:    !!p.ga_client_sent,
      stored_at:         Date.now()
    };
    await redis.setEx(`attribution:${sha256(email)}`, TTL_SECONDS, JSON.stringify(data));
  } catch (e) {
    // La atribución es best-effort: si Redis falla, el lead NO se pierde.
    console.error('[lead] no se pudo guardar la atribución:', e?.message || e);
  }

  // ── 2 · Contacto en Brevo ────────────────────────────────────────────────
  const { first, last } = splitName(str(p.name, 120));
  const attributes = {
    NOMBRE: jsonSafe(first),
    APELLIDOS: jsonSafe(last),
    CATEGORY: TIERS[tier].category,
    OWNER: TIERS[tier].owner,
    CREATED_AT: new Date().toISOString().slice(0, 10),
    EXTRA_NAMING: !!p.extra_naming,
    EXTRA_APPLICATIONS: !!p.extra_applications
  };

  // El teléfono va a DOS atributos a propósito:
  //   WHATSAPP → es el campo que pide el diseño nuevo y el semánticamente correcto.
  //   SMS      → es el que lee la plantilla de correo del Zap ({{SMS}}) y donde vive
  //              todo el histórico del formulario viejo de Brevo. Si solo escribiéramos
  //              WHATSAPP, el teléfono llegaría vacío en el correo al owner.
  const whatsapp = joinPhone(str(p.code, 8), str(p.whatsapp, 32));
  if (whatsapp) {
    attributes.WHATSAPP = whatsapp;
    attributes.SMS = whatsapp;
  }

  const about = jsonSafe(str(p.about, 2000), { paragraphs: true });
  if (about) attributes.TELL_US_ABOUT = about;

  const industry = enumVal(p.industry, 11);
  if (industry) attributes.INDUSTRIA = industry;

  const based = enumVal(p.based, 6);
  if (based) attributes.WHERE_ARE_YOU_BASED = based;

  // Atribución desde el ALTA, no solo desde el webhook. El Zap "TBP Studio" dispara en cuanto
  // el contacto entra a la lista 17 y arma el correo al owner con {{CAMPAIGN_NAME}}; el webhook
  // escribe esos campos unos segundos después, así que era una carrera: a veces el correo salía
  // con la campaña vacía (prueba 4 del 13-oct-2026) y a veces llena (prueba 3). Con los campos
  // aquí, el Zap siempre los encuentra. El webhook los vuelve a escribir con los mismos valores.
  const put = (k, v) => { const t = str(v, 250); if (t) attributes[k] = t; };
  put('UTM_SOURCE', p.utm_source); put('UTM_MEDIUM', p.utm_medium); put('UTM_CAMPAIGN', p.utm_campaign);
  put('UTM_TERM', p.utm_term); put('UTM_CONTENT', p.utm_content);
  put('CAMPAIGN_NAME', p.utm_campaign); put('CAMPAIGN_ID', p.utm_id);
  put('ADSET_NAME', p.utm_content); put('AD_NAME', p.utm_term);
  put('LANDING_PAGE', p.landing_page); put('REFERRER', p.referrer);
  put('GA_CLIENT_ID', p.ga_client_id); put('FBP', p.fbp); put('FBC', p.fbc);
  // Click ids de Google en atributos propios (completos; LANDING_PAGE se recorta a 250).
  if (clickIds.gclid)  attributes.GCLID  = clickIds.gclid;
  if (clickIds.gbraid) attributes.GBRAID = clickIds.gbraid;
  if (clickIds.wbraid) attributes.WBRAID = clickIds.wbraid;

  try {
    const r = await fetch(BREVO_API, {
      method: 'POST',
      headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        email,
        attributes,
        listIds: [LIST_ID],
        updateEnabled: true   // si ya existe, se actualiza en vez de fallar
      })
    });

    if (!r.ok && r.status !== 204) {
      const body = await r.text();
      console.error('[lead] Brevo respondió', r.status, body);
      return res.status(502).json({ error: 'brevo_failed', status: r.status });
    }

    return res.status(200).json({ ok: true, event_id: eventId, tier });
  } catch (e) {
    console.error('[lead] fallo al llamar a Brevo:', e?.message || e);
    return res.status(502).json({ error: 'brevo_unreachable' });
  }
}

function str(v, max) {
  return (v == null ? '' : String(v)).trim().slice(0, max);
}

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

// El Zap "TBP Studio" (id 360152739) arma el body del deal como JSON CRUDO
// ("deal_description": "{{TELL_US_ABOUT}}") e interpola el valor del atributo SIN escaparlo.
// Un salto de línea es un carácter de control dentro de un string JSON: lo invalida, Brevo
// responde 400 y el deal nunca se crea. El correo al owner sí sale, porque el Gmail es el step
// anterior — por eso el fallo es silencioso. Pasó con 5 leads entre julio y octubre de 2026.
// Mientras el Zap siga armando JSON a mano, todo lo que escribamos aquí tiene que ser seguro
// de interpolar: sin saltos de línea, sin comillas dobles y sin backslashes.
function jsonSafe(s, { paragraphs = false } = {}) {
  if (!s) return '';
  let out = s;
  // Los párrafos se conservan como separador visible en vez de perderse.
  if (paragraphs) out = out.replace(/\s*\n\s*\n\s*/g, ' · ');
  return out
    .replace(/[\u0000-\u001F\u007F\u2028\u2029]+/g, ' ')  // saltos, tabs y control chars
    .replace(/\\/g, '/')                                   // backslash = escape inválido en JSON
    .replace(/"/g, "'")                                    // comilla doble = cierra el string
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Brevo guarda nombre y apellidos por separado; el form pide un solo campo.
function splitName(full) {
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

function joinPhone(code, number) {
  const digits = number.replace(/[^\d]/g, '');
  if (!digits) return '';
  const cc = code.replace(/[^\d+]/g, '') || '+52';
  return (cc.startsWith('+') ? cc : '+' + cc) + digits;
}

// Los selects mandan el id del enum de Brevo (1..n). Cualquier otra cosa se descarta.
function enumVal(v, max) {
  const n = parseInt(v, 10);
  return Number.isInteger(n) && n >= 1 && n <= max ? String(n) : '';
}
