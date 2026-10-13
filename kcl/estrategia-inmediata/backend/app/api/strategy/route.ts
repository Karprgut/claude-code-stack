import { NextRequest } from 'next/server'
import { client } from '@/sanity/lib/client'
import { jsonWithCors, preflight } from '@/lib/http'
import { markdownToHtml } from '@/lib/shopify'

export const dynamic = 'force-dynamic'

export async function OPTIONS(req: NextRequest) {
  return preflight(req.headers.get('origin'))
}

/**
 * GET /api/strategy?slug=... — devuelve el entregable público (markdown de
 * Claude + output del motor) para que la página de resultado en Shopify lo
 * renderice. Solo lee estrategias ya generadas (completed).
 */
export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin')
  try {
    const slug = req.nextUrl.searchParams.get('slug')
    if (!slug) return jsonWithCors(origin, { error: 'slug requerido' }, 400)

    const doc = await client.fetch(
      `*[_type == "strategy" && slug.current == $slug][0]{
        companyName, contactName, customInsights, outputJson, publicUrl, _createdAt
      }`,
      { slug },
    )

    if (!doc) return jsonWithCors(origin, { error: 'Estrategia no encontrada' }, 404)

    const output = doc.outputJson ? JSON.parse(doc.outputJson) : null
    return jsonWithCors(origin, {
      companyName: doc.companyName,
      contactName: doc.contactName,
      customInsights: doc.customInsights,
      customInsightsHtml: doc.customInsights ? markdownToHtml(doc.customInsights) : '',
      output,
      createdAt: doc._createdAt,
    })
  } catch (err: unknown) {
    console.error('[strategy GET] error:', err)
    const msg = err instanceof Error ? err.message : 'Internal error'
    return jsonWithCors(origin, { error: msg }, 500)
  }
}
