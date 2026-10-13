/**
 * Tracking env — fuente única de credenciales para la capa de conversiones
 * server-side (Meta CAPI, TikTok Events API, GA4 Measurement Protocol, Google Ads).
 *
 * Carga:
 *  - Producción (Vercel): lee process.env tal cual (las vars vienen del dashboard).
 *  - Local: auto-carga `.env.tracking.local` (gitignored) sin dependencias.
 *    Los valores ya presentes en process.env GANAN — nunca pisamos lo inyectado.
 *
 * Público vs secreto y nombres de variables: ver `.env.tracking.local.example`.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

let fileLoaded = false

/** Lee `.env.tracking.local` una sola vez, solo fuera de producción. */
function loadLocalTrackingEnv(): void {
  if (fileLoaded) return
  fileLoaded = true
  if (process.env.NODE_ENV === 'production') return // Vercel inyecta las vars reales

  try {
    const raw = readFileSync(join(process.cwd(), '.env.tracking.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1)
      // Quita comentario inline (# al inicio o precedido por espacio)
      val = val.replace(/(^|\s)#.*$/, '$1').trim()
      // Quita comillas envolventes
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (key && !(key in process.env)) process.env[key] = val
    }
  } catch {
    // El archivo es opcional (p. ej. CI o un checkout sin secretos locales).
  }
}

/** undefined si la var está vacía o ausente, para distinguir "no configurado". */
function read(name: string): string | undefined {
  const v = process.env[name]
  return v && v.trim() ? v.trim() : undefined
}

export type TrackingEnv = {
  meta: { pixelId?: string; token?: string; testCode?: string; graphVersion: string }
  tiktok: { pixelId?: string; token?: string; testCode?: string }
  ga4: { measurementId?: string; apiSecret?: string }
  googleAds: { id?: string; purchaseLabel?: string; leadLabel?: string }
  dryRun: boolean
}

export function getTrackingEnv(): TrackingEnv {
  loadLocalTrackingEnv()
  return {
    meta: {
      pixelId: read('META_PIXEL_ID'),
      token: read('META_CAPI_TOKEN'),
      testCode: read('META_TEST_EVENT_CODE'),
      graphVersion: read('META_GRAPH_VERSION') ?? 'v21.0',
    },
    tiktok: {
      pixelId: read('TIKTOK_PIXEL_ID'),
      token: read('TIKTOK_EVENTS_TOKEN'),
      testCode: read('TIKTOK_TEST_EVENT_CODE'),
    },
    ga4: {
      measurementId: read('GA4_MEASUREMENT_ID'),
      apiSecret: read('GA4_API_SECRET'),
    },
    googleAds: {
      id: read('GOOGLE_ADS_ID'),
      purchaseLabel: read('GOOGLE_ADS_PURCHASE_LABEL'),
      leadLabel: read('GOOGLE_ADS_LEAD_LABEL'),
    },
    dryRun: read('TRACKING_DRY_RUN') === '1',
  }
}

export type ChannelKey = 'meta' | 'tiktok' | 'ga4'

/** Qué canales server-side están completamente configurados (id + secreto). */
export function readyServerChannels(env = getTrackingEnv()): Record<ChannelKey, boolean> {
  return {
    meta: Boolean(env.meta.pixelId && env.meta.token),
    tiktok: Boolean(env.tiktok.pixelId && env.tiktok.token),
    ga4: Boolean(env.ga4.measurementId && env.ga4.apiSecret),
  }
}
