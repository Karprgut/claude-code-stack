import { NextRequest, NextResponse } from 'next/server'

import { client } from '@/sanity/lib/client'
import { writeClient } from '@/sanity/lib/writeClient'
import { publishToPlatform } from '@/lib/social/publish'
import { syncBlogPostsToScheduler } from '@/lib/blog-sync'
import { publishArticle } from '@/lib/shopify'
import type { Platform, PublishResult } from '@/lib/social/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

interface DuePost {
  _id: string
  caption: string
  mediaUrl?: string
  mediaType?: 'IMAGE' | 'VIDEO' | 'REELS'
  format?: 'post' | 'reel' | 'story'
  platforms: Platform[]
  accountId: string
  shopifyArticleId?: number
}

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = req.headers.get('authorization')
  return header === `Bearer ${secret}`
}

async function processPost(post: DuePost): Promise<PublishResult[]> {
  await writeClient
    .patch(post._id)
    .set({ status: 'publishing', publishingStartedAt: new Date().toISOString() })
    .commit()
  const results: PublishResult[] = []
  for (const platform of post.platforms) {
    const result = await publishToPlatform(platform, post.accountId, {
      caption: post.caption,
      mediaUrl: post.mediaUrl,
      mediaType: post.mediaType,
      format: post.format,
    })
    results.push(result)
  }

  // If this entry has a linked Shopify article, flip it live too
  if (post.shopifyArticleId) {
    try {
      await publishArticle(post.shopifyArticleId, new Date().toISOString())
    } catch (err) {
      results.push({
        platform: 'instagram',
        publishedAt: new Date().toISOString(),
        error: `Shopify article publish failed: ${(err as Error).message}`,
      })
    }
  }

  const anyFailed = results.some((r) => r.error)
  await writeClient
    .patch(post._id)
    .set({
      status: anyFailed ? 'failed' : 'published',
      results,
    })
    .commit()
  return results
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const synced = await syncBlogPostsToScheduler().catch((err) => ({
    scanned: 0,
    created: 0,
    blogs: [],
    error: (err as Error).message,
  }))

  // Pick up scheduled posts AND posts stuck in 'publishing' for > 360s
  // (longer than maxDuration=300, so the previous cron invocation is guaranteed
  // dead and we won't double-publish a post that is still processing elsewhere).
  const due: DuePost[] = await client.fetch(
    `*[_type == "scheduledPost" && scheduledAt <= now() && (
      status == "scheduled" ||
      (status == "publishing" && (!defined(publishingStartedAt) || publishingStartedAt < $stuckThreshold))
    )]{
      _id, caption, mediaType, format, platforms, accountId, shopifyArticleId,
      "mediaUrl": coalesce(videoFile.asset->url, media.asset->url)
    }`,
    { stuckThreshold: new Date(Date.now() - 360_000).toISOString() },
  )

  // Process in parallel — Promise.allSettled lets one slow post not block the others.
  // Each post owns its own try/catch in processPost; we wrap here to catch unexpected throws.
  const settled = await Promise.allSettled(due.map((post) => processPost(post)))

  const summary: Array<{ id: string; results: PublishResult[]; error?: string }> = []
  for (let i = 0; i < due.length; i++) {
    const post = due[i]
    const outcome = settled[i]
    if (outcome.status === 'fulfilled') {
      summary.push({ id: post._id, results: outcome.value })
    } else {
      const errMsg = (outcome.reason as Error)?.message ?? 'unknown error'
      await writeClient
        .patch(post._id)
        .set({
          status: 'failed',
          results: [{ platform: 'instagram', error: errMsg, publishedAt: new Date().toISOString() }],
        })
        .commit()
        .catch(() => {})
      summary.push({ id: post._id, results: [], error: errMsg })
    }
  }

  return NextResponse.json({ synced, processed: summary.length, summary })
}
