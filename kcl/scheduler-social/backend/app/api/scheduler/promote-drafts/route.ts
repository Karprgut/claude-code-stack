import { NextRequest, NextResponse } from 'next/server'

import { writeClient } from '@/sanity/lib/writeClient'
import { setArticleVisibilityDate } from '@/lib/shopify'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface DraftDoc {
  _id: string
  scheduledAt: string
  hasCaption: boolean
  hasMedia: boolean
  blogId?: string
  shopifyArticleId?: number
  platforms?: string[]
  accountId?: string
}

interface PromoteBody {
  // Manual override mode: pick platforms + account explicitly
  platforms?: string[]
  accountId?: string
  // Auto mode: use each draft's already-assigned platforms+accountId (set
  // during bulk upload from filename detection). Send `useAssigned: true`
  // and omit platforms/accountId.
  useAssigned?: boolean
  timeOfDay?: string
  requireMedia?: boolean
  dryRun?: boolean
}

function parseTimeOfDay(t: string | undefined): { hours: number; minutes: number } {
  if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return { hours: 12, minutes: 0 }
  const [h, m] = t.split(':').map((x) => parseInt(x, 10))
  return { hours: Math.min(23, Math.max(0, h)), minutes: Math.min(59, Math.max(0, m)) }
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as PromoteBody
  const useAssigned = body.useAssigned === true
  const overridePlatforms = (body.platforms || []).filter(
    (p): p is 'instagram' | 'facebook' | 'linkedin' =>
      p === 'instagram' || p === 'facebook' || p === 'linkedin',
  )

  if (!useAssigned && (overridePlatforms.length === 0 || !body.accountId)) {
    return NextResponse.json(
      { error: 'platforms + accountId requeridos (o useAssigned: true)' },
      { status: 400 },
    )
  }

  const drafts: DraftDoc[] = await writeClient.fetch(
    `*[_type == "scheduledPost" && status == "draft"]{
      _id, scheduledAt, shopifyArticleId, platforms, accountId,
      "hasCaption": defined(caption) && length(caption) > 0,
      "hasMedia": defined(media.asset) || defined(videoFile.asset),
      "blogId": sourceBlog._ref
    }`,
  )

  const eligible = drafts.filter((d) => {
    if (!d.hasCaption) return false
    if (useAssigned) {
      // Use the draft's own assigned platforms+accountId
      if (!d.platforms?.length) return false
      if (!d.accountId) return false
      const needsMedia = body.requireMedia !== false && d.platforms.includes('instagram')
      if (needsMedia && !d.hasMedia) return false
    } else {
      // Manual override mode
      const needsMedia = body.requireMedia !== false && overridePlatforms.includes('instagram')
      if (needsMedia && !d.hasMedia) return false
    }
    return true
  })

  if (body.dryRun) {
    return NextResponse.json({
      dryRun: true,
      totalDrafts: drafts.length,
      eligible: eligible.length,
    })
  }

  const { hours, minutes } = parseTimeOfDay(body.timeOfDay)

  const tx = writeClient.transaction()
  let blogsSynced = 0
  let metaCount = 0
  let liCount = 0
  const shopifyTargets: Array<{ articleId: number; iso: string }> = []
  for (const d of eligible) {
    const date = new Date(d.scheduledAt)
    date.setHours(hours, minutes, 0, 0)
    const iso = date.toISOString()

    const finalPlatforms = useAssigned ? d.platforms! : overridePlatforms
    const finalAccountId = useAssigned ? d.accountId! : body.accountId!

    if (finalPlatforms.includes('linkedin')) liCount++
    else metaCount++

    tx.patch(d._id, (p) =>
      p.set({
        status: 'scheduled',
        platforms: finalPlatforms,
        accountId: finalAccountId,
        scheduledAt: iso,
      }),
    )
    if (d.blogId) {
      tx.patch(d.blogId, (p) => p.set({ publishedAt: iso }))
      blogsSynced++
    }
    if (d.shopifyArticleId) {
      shopifyTargets.push({ articleId: d.shopifyArticleId, iso })
    }
  }

  await tx.commit()

  // Sync Shopify article visibility dates (kept hidden, just sets the date)
  let shopifyDatesSynced = 0
  for (const t of shopifyTargets) {
    try {
      await setArticleVisibilityDate(t.articleId, t.iso)
      shopifyDatesSynced++
    } catch {
      /* swallow per-article failures, they don't block the rest */
    }
  }

  return NextResponse.json({
    promoted: eligible.length,
    skipped: drafts.length - eligible.length,
    blogsSynced,
    shopifyDatesSynced,
    metaCount,
    linkedInCount: liCount,
  })
}
