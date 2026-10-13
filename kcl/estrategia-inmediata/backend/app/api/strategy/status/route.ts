import { NextRequest } from 'next/server'
import { client } from '@/sanity/lib/client'
import { jsonPublic, preflightPublic } from '@/lib/http'

export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  return preflightPublic()
}

/**
 * GET /api/strategy/status?submissionId=...
 * Lo consulta la página de "Gracias" de Shopify (poller) para saber si la
 * generación post-pago ya terminó y a dónde redirigir.
 * Devuelve { status, slug, publicUrl }.
 */
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('submissionId')
    if (!id) return jsonPublic({ error: 'submissionId requerido' }, 400)

    const sub = await client.fetch(
      `*[_type == "strategySubmission" && _id == $id][0]{
        status,
        "slug": strategy->slug.current,
        "publicUrl": strategy->publicUrl
      }`,
      { id },
    )

    if (!sub) return jsonPublic({ error: 'no encontrada' }, 404)
    return jsonPublic({
      status: sub.status || 'preview',
      slug: sub.slug || null,
      publicUrl: sub.publicUrl || null,
    })
  } catch (err: unknown) {
    console.error('[strategy/status] error:', err)
    const msg = err instanceof Error ? err.message : 'Internal error'
    return jsonPublic({ error: msg }, 500)
  }
}
