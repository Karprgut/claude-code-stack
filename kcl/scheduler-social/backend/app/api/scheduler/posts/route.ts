import { NextRequest, NextResponse } from 'next/server'

import { writeClient } from '@/sanity/lib/writeClient'
import { client } from '@/sanity/lib/client'

export const runtime = 'nodejs'

export async function GET() {
  const posts = await client.fetch(
    `*[_type == "scheduledPost"] | order(scheduledAt desc){
      _id, caption, scheduledAt, status, platforms, accountId, mediaType,
      "mediaUrl": coalesce(videoFile.asset->url, media.asset->url),
      results
    }`,
  )
  return NextResponse.json({ posts })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { caption, mediaAssetId, mediaType, platforms, accountId, scheduledAt } = body

  if (!caption || !platforms?.length || !accountId || !scheduledAt) {
    return NextResponse.json(
      { error: 'caption, platforms, accountId, scheduledAt are required' },
      { status: 400 },
    )
  }

  const doc = {
    _type: 'scheduledPost' as const,
    caption,
    mediaType: mediaType ?? 'IMAGE',
    platforms,
    accountId,
    scheduledAt,
    status: 'scheduled',
    ...(mediaAssetId && {
      media: {
        _type: 'image',
        asset: { _type: 'reference', _ref: mediaAssetId },
      },
    }),
  }

  const created = await writeClient.create(doc)
  return NextResponse.json({ post: created })
}
