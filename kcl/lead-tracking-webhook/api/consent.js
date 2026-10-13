// TBP · Registro de consentimiento (cookies + formularios)
// ─────────────────────────────────────────────────────────
// POST  → guarda una prueba de consentimiento (GDPR art. 7.2 / iubenda
//         "Registros de consentimiento" y "Consent Database").
//         Lo llama cookie-consent.js (type "cookie") en cada decisión del
//         banner, y el form de Brevo (type "form") al confirmarse el envío.
//         Content-Type text/plain (request simple, sin preflight) con JSON.
// GET   → exporta registros (JSON o CSV) protegido con secret:
//         /api/consent?secret=…&from=2026-09-01&to=2026-09-30&format=csv
//         /api/consent?secret=…&id=<uuid>          (búsqueda por visitante)
//         /api/consent?secret=…&stats=1            (contadores por mes)
//
// Qué guardamos: id anónimo (vive en la cookie tbp_consent), decisión por
// categoría, acción, versión de banner y política, página, idioma, user
// agent, país (header de Vercel) y un hash salteado de la IP (no la IP).
// Retención: 24 meses (TTL en Redis).

import crypto from 'node:crypto';
import { getRedis } from '../lib/redis-client.js';

const TTL_SECONDS = 2 * 365 * 24 * 3600; // 24 meses
const IDX_KEY = 'consent:idx';
const ACTIONS = ['accept_all', 'reject_all', 'save_preferences', 'form_submit'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'POST') return record(req, res);
  if (req.method === 'GET') return exportRecords(req, res);
  res.setHeader('Allow', 'POST, GET, OPTIONS');
  return res.status(405).json({ error: 'Method not allowed' });
}

// ── POST · guardar registro ────────────────────────────────
async function record(req, res) {
  const p = parseBody(req);
  const type = p.type === 'form' ? 'form' : 'cookie';

  const now = Date.now();
  const rec = {
    type,
    ts: new Date(now).toISOString(),
    action: ACTIONS.includes(p.action) ? p.action : (type === 'form' ? 'form_submit' : 'unknown'),
    page: str(p.page, 300).split('?')[0],
    lang: str(p.lang, 16),
    ua: str(req.headers['user-agent'], 300),
    country: str(req.headers['x-vercel-ip-country'], 8),
    ip_hash: ipHash(req)
  };

  if (type === 'cookie') {
    const id = str(p.id, 64);
    if (!/^[a-f0-9-]{8,64}$/i.test(id)) return res.status(400).json({ error: 'invalid id' });
    rec.id = id;
    rec.v = clampInt(p.v, 1, 99, 0);
    rec.analytics = !!p.analytics;
    rec.marketing = !!p.marketing;
    rec.policy = str(p.policy, 40);
    rec.ts_client = str(p.ts_client, 40);
  } else {
    const emailHash = str(p.email_sha256, 64).toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(emailHash)) return res.status(400).json({ error: 'invalid email_sha256' });
    rec.id = str(p.consent_id, 64) || 'anon';
    rec.email_sha256 = emailHash;
    rec.form = str(p.form, 60);
    rec.event_id = str(p.event_id, 100);
    rec.legal_version = str(p.legal_version, 40);
    rec.legal_text = str(p.legal_text, 600);
  }

  const key = `consent:rec:${now}:${rec.id}`;
  try {
    const redis = await getRedis();
    await Promise.all([
      redis.setEx(key, TTL_SECONDS, JSON.stringify(rec)),
      redis.zAdd(IDX_KEY, [{ score: now, value: key }]),
      redis.hIncrBy(`consent:stats:${rec.ts.slice(0, 7)}`, `${type}:${rec.action}`, 1)
    ]);
    // limpia el índice de entradas fuera de retención
    await redis.zRemRangeByScore(IDX_KEY, '-inf', now - TTL_SECONDS * 1000);
    return res.status(200).json({ ok: true, id: rec.id, ts: rec.ts });
  } catch (e) {
    console.error('[consent] Redis write failed:', e?.message || e);
    return res.status(500).json({ error: 'storage_failed' });
  }
}

// ── GET · exportar ─────────────────────────────────────────
async function exportRecords(req, res) {
  const secret = process.env.CONSENT_EXPORT_SECRET || process.env.BREVO_WEBHOOK_SECRET;
  if (!secret || req.query.secret !== secret) return res.status(401).json({ error: 'Unauthorized' });

  const redis = await getRedis();

  if (req.query.stats) {
    const months = await scanKeys(redis, 'consent:stats:*');
    const out = {};
    for (const k of months.sort()) out[k.replace('consent:stats:', '')] = await redis.hGetAll(k);
    return res.status(200).json({ stats: out, total_indexed: await redis.zCard(IDX_KEY) });
  }

  const from = parseDate(req.query.from, 0);
  const to = parseDate(req.query.to, Date.now() + 864e5);
  const limit = clampInt(req.query.limit, 1, 5000, 1000);
  const idFilter = str(req.query.id, 64);

  let keys = await redis.zRangeByScore(IDX_KEY, from, to, { LIMIT: { offset: 0, count: 5000 } });
  if (idFilter) keys = keys.filter((k) => k.endsWith(`:${idFilter}`));
  keys = keys.slice(-limit);

  const values = keys.length ? await redis.mGet(keys) : [];
  const records = values.filter(Boolean).map((v) => { try { return JSON.parse(v); } catch { return null; } }).filter(Boolean);

  if ((req.query.format || 'json') === 'csv') {
    const cols = ['ts', 'type', 'id', 'action', 'analytics', 'marketing', 'v', 'policy', 'page', 'lang', 'country', 'ua', 'ip_hash', 'email_sha256', 'form', 'event_id', 'legal_version', 'legal_text'];
    const esc = (x) => `"${String(x ?? '').replace(/"/g, '""')}"`;
    const csv = [cols.join(','), ...records.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="tbp-consent-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.status(200).send(csv);
  }
  return res.status(200).json({ count: records.length, from: new Date(from).toISOString(), to: new Date(to).toISOString(), records });
}

// ── helpers ────────────────────────────────────────────────
function parseBody(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  if (Buffer.isBuffer(b)) { try { b = JSON.parse(b.toString('utf8')); } catch { b = {}; } }
  return b && typeof b === 'object' ? b : {};
}
function str(v, max) { return (v == null ? '' : String(v)).slice(0, max); }
function clampInt(v, min, max, dflt) { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt; }
function parseDate(v, dflt) { if (!v) return dflt; const n = /^\d+$/.test(v) ? parseInt(v, 10) : Date.parse(v); return Number.isFinite(n) ? n : dflt; }
function ipHash(req) {
  const ip = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() || req.socket?.remoteAddress || '';
  if (!ip) return '';
  const salt = process.env.CONSENT_EXPORT_SECRET || process.env.BREVO_WEBHOOK_SECRET || 'tbp';
  return crypto.createHash('sha256').update(`${salt}|${ip}`).digest('hex').slice(0, 32);
}
async function scanKeys(redis, pattern) {
  // node-redis v5: scanIterator entrega lotes (arrays); v4 entregaba strings.
  const out = [];
  for await (const batch of redis.scanIterator({ MATCH: pattern, COUNT: 200 })) {
    for (const k of [].concat(batch)) out.push(k);
  }
  return out;
}
