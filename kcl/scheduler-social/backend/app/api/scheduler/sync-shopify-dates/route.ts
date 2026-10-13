import { NextResponse } from 'next/server'

import { writeClient } from '@/sanity/lib/writeClient'
import { setArticleVisibilityDate } from '@/lib/shopify'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST() {
  const posts = await writeClient.fetch<
    Array<{ _id: string; scheduledAt: string; shopifyArticleId: number }>
  >(
    `*[_type == "scheduledPost" && defined(shopifyArticleId) && status in ["draft", "scheduled"]]{
      _id, scheduledAt, shopifyArticleId
    }`,
  )

  let synced = 0
  let failed = 0
  const errors: string[] = []

  for (const p of posts) {
    try {
      await setArticleVisibilityDate(p.shopifyArticleId, p.scheduledAt)
      synced++
    } catch (err) {
      failed++
      if (errors.length < 5) {
        errors.push(`${p.shopifyArticleId}: ${(err as Error).message.slice(0, 100)}`)
      }
    }
  }

  return NextResponse.json({
    scanned: posts.length,
    synced,
    failed,
    errors,
  })
}
