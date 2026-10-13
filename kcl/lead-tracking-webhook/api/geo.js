// TBP · Geo endpoint for the brand-packages landings (/proyectos, /proyectos/core)
// ─────────────────────────────────────────────────────────────────────────────
// Returns the visitor's country as resolved by Vercel's edge network (IP based).
// The landing's head script uses it to serve Spanish + MXN to Mexico and
// English + USD to everyone else. No body, no cookies, nothing stored.
//
// GET https://tbp-brevo-tracking.vercel.app/api/geo  →  { "country": "MX" }

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'private, no-store');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const raw = req.headers['x-vercel-ip-country'];
  const country = typeof raw === 'string' && /^[A-Z]{2}$/i.test(raw) ? raw.toUpperCase() : null;

  return res.status(200).json({ country });
}
