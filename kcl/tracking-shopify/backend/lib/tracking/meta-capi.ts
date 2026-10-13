/**
 * Meta Conversions API — evento Purchase server-side.
 * Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
 * Dedup con el pixel del navegador vía `event_id` (= ID de la orden).
 */
import { hashed, sha256 } from './hash'
import type { NormalizedPurchase, SendResult } from './types'
import type { TrackingEnv } from './env'

export async function sendMetaPurchase(
  p: NormalizedPurchase,
  env: TrackingEnv,
): Promise<SendResult> {
  const { pixelId, token, testCode, graphVersion } = env.meta
  if (!pixelId || !token) return { channel: 'meta', ok: false, skipped: true }

  const userData: Record<string, unknown> = {
    em: hashed(p.user.email),
    ph: hashed(p.user.phone),
    fn: hashed(p.user.firstName),
    ln: hashed(p.user.lastName),
    ct: hashed(p.user.city),
    zp: hashed(p.user.zip?.toLowerCase()),
    country: hashed(p.user.country),
    external_id: p.user.externalId ? sha256(p.user.externalId) : undefined,
    client_ip_address: p.user.clientIp,
    client_user_agent: p.user.userAgent,
  }
  // Meta espera arrays para los campos hasheados; quita los vacíos.
  const cleanUser: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(userData)) {
    if (v == null) continue
    cleanUser[k] = k === 'client_ip_address' || k === 'client_user_agent' ? v : [v]
  }

  const payload = {
    data: [
      {
        event_name: 'Purchase',
        event_time: p.eventTimeSec,
        event_id: p.eventId,
        action_source: 'website',
        event_source_url: p.sourceUrl,
        user_data: cleanUser,
        custom_data: {
          currency: p.currency,
          value: p.value,
          order_id: p.orderId,
          content_type: 'product',
          contents: p.contents.map((c) => ({
            id: c.id,
            quantity: c.quantity,
            item_price: c.price,
          })),
        },
      },
    ],
    ...(testCode ? { test_event_code: testCode } : {}),
  }

  if (env.dryRun) {
    console.log('[tracking:meta] DRY_RUN', JSON.stringify(payload))
    return { channel: 'meta', ok: true, skipped: true }
  }

  try {
    const url = `https://graph.facebook.com/${graphVersion}/${pixelId}/events?access_token=${encodeURIComponent(token)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { channel: 'meta', ok: false, status: res.status, error: body.slice(0, 500) }
    }
    return { channel: 'meta', ok: true, status: res.status }
  } catch (err) {
    return { channel: 'meta', ok: false, error: (err as Error).message }
  }
}
