import { NextRequest, NextResponse, after } from 'next/server'
import { runStrategyGeneration } from '@/lib/strategy/generate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * POST /api/strategy/generate  { submissionId, shopifyOrderId? }
 * Endpoint INTERNO: solo lo llama el webhook (requiere x-internal-token).
 * Responde 200 de inmediato y corre la generación con Claude en segundo plano
 * vía after(), para no bloquear y tener el presupuesto de tiempo completo.
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get('x-internal-token')
  if (!process.env.INTERNAL_TASK_TOKEN || token !== process.env.INTERNAL_TASK_TOKEN) {
    return new NextResponse('forbidden', { status: 403 })
  }

  let body: { submissionId?: string; shopifyOrderId?: string }
  try {
    body = await req.json()
  } catch {
    return new NextResponse('bad json', { status: 400 })
  }
  if (!body.submissionId) return new NextResponse('submissionId requerido', { status: 400 })

  const submissionId = body.submissionId
  const shopifyOrderId = body.shopifyOrderId

  // Corre en segundo plano; la respuesta sale ya.
  after(async () => {
    try {
      const r = await runStrategyGeneration(submissionId, { shopifyOrderId })
      console.log('[strategy/generate] listo:', r.slug, r.publicUrl)
    } catch (err) {
      console.error('[strategy/generate] falló:', err)
    }
  })

  return NextResponse.json({ accepted: true })
}
