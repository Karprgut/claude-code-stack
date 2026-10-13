import { NextRequest, NextResponse } from 'next/server'

import { writeClient } from '@/sanity/lib/writeClient'
import { detectRouteFromName } from '@/lib/bulk-upload'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface PostStub {
  _id: string
  pairKey?: string
  status?: string
  platforms?: string[]
  accountId?: string
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url)
  const includeScheduled = url.searchParams.get('includeScheduled') === 'true'

  const filter = includeScheduled
    ? `status in ["draft", "scheduled"]`
    : `status == "draft"`

  const posts: PostStub[] = await writeClient.fetch(
    `*[_type == "scheduledPost" && ${filter}]{ _id, pairKey, status, platforms, accountId }`,
  )

  const tx = writeClient.transaction()
  let routedMeta = 0
  let routedLinkedIn = 0
  let unmatched = 0

  const summary: Array<{ id: string; pairKey: string; platforms: string[]; group: string }> = []

  for (const p of posts) {
    if (!p.pairKey) {
      unmatched++
      continue
    }
    const route = detectRouteFromName(p.pairKey)
    if (!route.group) {
      unmatched++
      continue
    }
    const patch: Record<string, unknown> = {}
    if (route.platforms.length) patch.platforms = route.platforms
    if (route.accountId) patch.accountId = route.accountId
    if (route.format) patch.format = route.format
    if (Object.keys(patch).length === 0) {
      unmatched++
      continue
    }
    tx.patch(p._id, (x) => x.set(patch))
    if (route.group === 'linkedin') routedLinkedIn++
    else routedMeta++
    summary.push({
      id: p._id,
      pairKey: p.pairKey,
      platforms: route.platforms,
      group: route.group,
    })
  }

  if (routedMeta + routedLinkedIn > 0) await tx.commit()

  return NextResponse.json({
    scanned: posts.length,
    routedMeta,
    routedLinkedIn,
    unmatched,
    sample: summary.slice(0, 10),
  })
}
