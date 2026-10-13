// TBP · Click ids de Google Ads (gclid / gbraid / wbraid)
// ──────────────────────────────────────────────────────
// Google Ads solo puede contar un lead del CRM si tenemos el id del clic que lo trajo.
// El id viene en la URL de aterrizaje (y, cuando la persona navega de /proyectos al
// check-out, en el referrer). Guardarlo en un campo propio evita que se pierda cuando
// la URL completa se recorta a 250 caracteres en Brevo: el 16-sep-2026 un lead de
// Search (Andrea) llegó con el gclid cortado a la mitad y Ads nunca lo contó.
//
// Orden de preferencia: campo explícito del payload → landing_page → referrer.

const KEYS = ['gclid', 'gbraid', 'wbraid'];

function fromUrl(url) {
  const out = {};
  if (!url) return out;
  try {
    const u = new URL(String(url));
    for (const k of KEYS) {
      const v = u.searchParams.get(k);
      if (v && /^[A-Za-z0-9_-]{8,200}$/.test(v)) out[k] = v;
    }
  } catch (_) {
    // No es una URL completa: buscar los parámetros a mano.
    for (const k of KEYS) {
      const m = String(url).match(new RegExp('[?&]' + k + '=([A-Za-z0-9_-]{8,200})'));
      if (m) out[k] = m[1];
    }
  }
  return out;
}

export function extractClickIds(payload = {}) {
  const explicit = {};
  for (const k of KEYS) {
    const v = payload[k];
    if (v && /^[A-Za-z0-9_-]{8,200}$/.test(String(v))) explicit[k] = String(v);
  }
  // Un referrer propio (tu-sitio.com) puede traer el gclid que la landing ya perdió.
  return Object.assign({}, fromUrl(payload.referrer), fromUrl(payload.landing_page), explicit);
}

export { KEYS as CLICK_ID_KEYS };
