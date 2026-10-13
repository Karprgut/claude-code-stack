// TBP · Attribution capture endpoint
// ───────────────────────────────────
// Receives a POST from the client-side tracking script with attribution
// data (UTMs, GA client_id, fbp/fbc, referrer, landing page) and stores
// it in Vercel KV keyed by hashed email. The Brevo webhook later looks
// it up by email to enrich GA4 + Meta events with proper attribution.
//
// Why this exists: Brevo's form rejects unknown fields, so we can't
// pipe attribution through the form itself. This is the workaround.

import crypto from 'node:crypto';
import { getRedis } from '../lib/redis-client.js';
import { extractClickIds } from '../lib/click-ids.js';

const TTL_SECONDS = 30 * 60; // 30 minutes

export default async function handler(req, res) {
  // CORS — this endpoint receives requests from tu-sitio.com (browser)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = req.body || {};
  const email = (payload.email || '').toString().trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }

  const emailHash = sha256(email);
  const key = `attribution:${emailHash}`;

  // v4 · update PARCIAL: el form avisa al confirmar el envío que ya mandó
  // generate_lead client-side (ga_client_sent) → el webhook no lo duplica por MP.
  // Se mezcla con el registro existente (si el POST inicial falló, se crea igual).
  if (payload.partial) {
    try {
      const redis = await getRedis();
      const existing = await redis.get(key);
      const merged = Object.assign({}, existing ? (typeof existing === 'string' ? JSON.parse(existing) : existing) : {});
      if (payload.ga_client_sent != null) merged.ga_client_sent = !!payload.ga_client_sent;
      if (payload.ga_client_sent) merged.ga_client_sent_at = Date.now();
      if (payload.event_id && !merged.event_id) merged.event_id = payload.event_id.toString().slice(0, 100);
      merged.updated_at = Date.now();
      await redis.setEx(key, TTL_SECONDS, JSON.stringify(merged));
      return res.status(200).json({ ok: true, partial: true, had_record: !!existing, email_hash: emailHash.slice(0, 12) + '…' });
    } catch (e) {
      console.error('[attribution] Redis partial update failed:', e?.message || e);
      return res.status(500).json({ error: 'storage_failed', message: e?.message });
    }
  }

  const data = {
    utm_source:        (payload.utm_source        || '').toString().slice(0, 200),
    utm_medium:        (payload.utm_medium        || '').toString().slice(0, 200),
    utm_campaign:      (payload.utm_campaign      || '').toString().slice(0, 200),
    utm_id:            (payload.utm_id            || '').toString().slice(0, 200),
    utm_term:          (payload.utm_term          || '').toString().slice(0, 200),
    utm_content:       (payload.utm_content       || '').toString().slice(0, 200),
    referrer:          (payload.referrer          || '').toString().slice(0, 1000),
    landing_page:      (payload.landing_page      || '').toString().slice(0, 1000),
    ...extractClickIds(payload),
    ga_client_id:      (payload.ga_client_id      || '').toString().slice(0, 100),
    ga_session_id:     (payload.ga_session_id     || '').toString().slice(0, 50),
    ga_session_number: parseInt(payload.ga_session_number || '1', 10) || 1,
    fbp:               (payload.fbp || '').toString().slice(0, 200),
    fbc:               (payload.fbc || '').toString().slice(0, 200),
    user_agent:        (payload.user_agent || '').toString().slice(0, 500),
    event_id:          (payload.event_id || '').toString().slice(0, 100),
    stored_at:         Date.now()
  };

  try {
    const redis = await getRedis();
    await redis.setEx(key, TTL_SECONDS, JSON.stringify(data));
    return res.status(200).json({
      ok: true,
      email_hash: emailHash.slice(0, 12) + '…',
      expires_in_seconds: TTL_SECONDS
    });
  } catch (e) {
    console.error('[attribution] Redis write failed:', e?.message || e);
    return res.status(500).json({ error: 'storage_failed', message: e?.message });
  }
}

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}
