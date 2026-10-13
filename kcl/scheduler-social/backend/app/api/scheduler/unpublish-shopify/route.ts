import { NextResponse } from 'next/server'

import { writeClient } from '@/sanity/lib/writeClient'
import { unpublishArticle } from '@/lib/shopify'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Reverts every Shopify article that's linked to a draft/scheduled post back
 * to true draft state (published: false, published_at: null). Use this to
 * recover from accidental publishes — the cron will republish at the right
 * time when each scheduledPost passes its scheduledAt.
 */
export async function POST() {
  const posts = await writeClient.fetch<
    Array<{ _id: string; status: string; shopifyArticleId: number }>
  >(
    `*[_type == "scheduledPost" && defined(shopifyArticleId) && status in ["draft", "scheduled"]]{
      _id, status, shopifyArticleId
    }`,
  )

  let unpublished = 0
  let failed = 0
  const errors: string[] = []

  for (const p of posts) {
    try {
      await unpublishArticle(p.shopifyArticleId)
      unpublished++
    } catch (err) {
      failed++
      if (errors.length < 5) {
        errors.push(`${p.shopifyArticleId}: ${(err as Error).message.slice(0, 100)}`)
      }
    }
  }

  return NextResponse.json({
    scanned: posts.length,
    unpublished,
    failed,
    errors,
  })
}
