import { NextRequest, NextResponse } from 'next/server'

import { writeClient } from '@/sanity/lib/writeClient'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file required' }, { status: 400 })
  }
  const buffer = Buffer.from(await file.arrayBuffer())
  const asset = await writeClient.assets.upload('image', buffer, {
    filename: file.name,
    contentType: file.type,
  })
  return NextResponse.json({ assetId: asset._id, url: asset.url })
}
