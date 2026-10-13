/**
 * TikTok Events API v1.3 — evento CompletePayment server-side.
 * Docs: https://business-api.tiktok.com/portal/docs?id=1771101027431425
 * Dedup con el pixel del navegador vía `event_id` (= ID de la orden).
 */
import { hashed } from './hash'
import type { NormalizedPurchase, SendResult } from './types'
import type { TrackingEnv } from './env'

const ENDPOINT = 'https://business-api.tiktok.com/open_api/v1.3/event/track/'

export async function sendTiktokPurchase(
  p: NormalizedPurchase,
  env: TrackingEnv,
): Promise<SendResult> {
  const { pixelId, token, testCode } = env.tiktok
  if (!pixelId || !token) return { channel: 'tiktok', ok: false, skipped: true }

  const user: Record<string, unknown> = {
    email: hashed(p.user.email),
    phone: hashed(p.user.phone),
    external_id: hashed(p.user.externalId),
    ip: p.user.clientIp,
    user_agent: p.user.userAgent,
  }
  for (const k of Object.keys(user)) if (user[k] == null) delete user[k]

  const payload = {
    event_source: 'web',
    event_source_id: pixelId,
    data: [
      {
        event: 'CompletePayment',
        event_time: p.eventTimeSec,
        event_id: p.eventId,
        user,
        properties: {
          currency: p.currency,
          value: p.value,
          order_id: p.orderId,
          contents: p.contents.map((c) => ({
            content_id: c.id,
            content_type: 'product',
            content_name: c.title,
            quantity: c.quantity,
            price: c.price,
          })),
        },
        page: p.sourceUrl ? { url: p.sourceUrl } : undefined,
      },
    ],
    ...(testCode ? { test_event_code: testCode } : {}),
  }

  if (env.dryRun) {
    console.log('[tracking:tiktok] DRY_RUN', JSON.stringify(payload))
    return { channel: 'tiktok', ok: true, skipped: true }
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Access-Token': token },
      body: JSON.stringify(payload),
    })
    const body = (await res.json().catch(() => ({}))) as { code?: number; message?: string }
    // TikTok responde 200 con code:0 cuando todo va bien; code != 0 es error lógico.
    if (!res.ok || (body.code != null && body.code !== 0)) {
      return {
        channel: 'tiktok',
        ok: false,
        status: res.status,
        error: `code=${body.code} ${body.message ?? ''}`.trim(),
      }
    }
    return { channel: 'tiktok', ok: true, status: res.status }
  } catch (err) {
    return { channel: 'tiktok', ok: false, error: (err as Error).message }
  }
}
