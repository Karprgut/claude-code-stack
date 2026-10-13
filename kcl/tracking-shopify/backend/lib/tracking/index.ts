/**
 * Orquestador de conversiones server-side.
 *
 * Dispara el evento Purchase a Meta CAPI y TikTok Events API en paralelo desde
 * el webhook `orders/paid`. NUNCA lanza: cada canal captura su error y se
 * reporta agregado, para no romper el flujo del webhook.
 *
 * Fuera de alcance a propósito (se evita doble conteo):
 *  - GA4 purchase  → lo manda la app Google & YouTube (Customer Events).
 *  - Google Ads    → conversión en el navegador (Web Pixel), donde existe la cookie.
 */
import { getTrackingEnv } from './env'
import { normalizePurchase } from './normalize'
import { sendMetaPurchase } from './meta-capi'
import { sendTiktokPurchase } from './tiktok-events'
import type { SendResult, ShopifyOrder } from './types'

export async function trackPurchaseFromOrder(order: ShopifyOrder): Promise<SendResult[]> {
  const env = getTrackingEnv()
  const purchase = normalizePurchase(order)

  const tasks: Array<Promise<SendResult>> = []
  if (env.meta.pixelId && env.meta.token) tasks.push(sendMetaPurchase(purchase, env))
  if (env.tiktok.pixelId && env.tiktok.token) tasks.push(sendTiktokPurchase(purchase, env))

  if (tasks.length === 0) {
    console.warn('[tracking] sin canales server configurados; se omite Purchase', {
      orderId: purchase.orderId,
    })
    return []
  }

  const settled = await Promise.allSettled(tasks)
  const results: SendResult[] = settled.map((s) =>
    s.status === 'fulfilled'
      ? s.value
      : { channel: 'meta', ok: false, error: String(s.reason) },
  )

  for (const r of results) {
    if (r.ok) console.log(`[tracking:${r.channel}] Purchase ok`, { orderId: purchase.orderId })
    else console.error(`[tracking:${r.channel}] Purchase FALLÓ`, { orderId: purchase.orderId, ...r })
  }
  return results
}

export type { SendResult } from './types'
