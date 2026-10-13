import { NextRequest, NextResponse, after } from 'next/server'
import crypto from 'node:crypto'
import { writeClient } from '@/sanity/lib/writeClient'
import { submissionIdFromOrder } from '@/lib/strategy/shopify'
import { trackPurchaseFromOrder } from '@/lib/tracking'
import type { ShopifyOrder } from '@/lib/tracking/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 20

/**
 * Webhook de Shopify (orders/paid). Verifica HMAC con el app secret de KCL
 * (SHOPIFY_WEBHOOK_SECRET). Marca la submission como paid_pending y dispara la
 * generación en /api/strategy/generate (que corre en segundo plano). Responde
 * rápido para cumplir el límite de Shopify; la generación NO bloquea aquí.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET
  if (!secret) return new NextResponse('not configured', { status: 500 })

  const raw = await req.text()
  const hmacHeader = req.headers.get('x-shopify-hmac-sha256') || ''
  const digest = crypto.createHmac('sha256', secret).update(raw, 'utf8').digest('base64')
  const a = Buffer.from(digest)
  const b = Buffer.from(hmacHeader)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return new NextResponse('invalid hmac', { status: 401 })
  }

  if ((req.headers.get('x-shopify-topic') || '') !== 'orders/paid') {
    return NextResponse.json({ received: true, ignored: true })
  }

  let order: { id: number } & Record<string, unknown>
  try {
    order = JSON.parse(raw)
  } catch {
    return new NextResponse('bad json', { status: 400 })
  }

  // Conversiones server-side (Meta CAPI + TikTok) para TODA orden pagada,
  // independientemente de si es una compra de estrategia. event_id = ID de orden.
  after(async () => {
    try {
      await trackPurchaseFromOrder(order as unknown as ShopifyOrder)
    } catch (err) {
      console.error('[webhook] tracking falló:', err)
    }
  })

  const submissionId = submissionIdFromOrder(order)
  if (!submissionId) return NextResponse.json({ received: true, note: 'sin submissionId' })

  const origin = req.nextUrl.origin
  const internalToken = process.env.INTERNAL_TASK_TOKEN || ''

  after(async () => {
    try {
      const sub = await writeClient.getDocument(submissionId)
      if (sub && sub.status === 'completed') return // idempotente
      await writeClient
        .patch(submissionId)
        .set({ status: 'paid_pending', shopifyOrderId: String(order.id) })
        .commit()
        .catch(() => null)
      // Dispara la generación (corre en su propia función con maxDuration alto).
      await fetch(`${origin}/api/strategy/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-token': internalToken },
        body: JSON.stringify({ submissionId, shopifyOrderId: String(order.id) }),
      }).catch((e) => console.error('[webhook] fetch generate falló:', e))
    } catch (err) {
      console.error('[webhook] after() falló:', err)
    }
  })

  return NextResponse.json({ received: true })
}
