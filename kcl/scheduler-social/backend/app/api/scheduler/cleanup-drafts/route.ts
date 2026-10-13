import { NextResponse } from 'next/server'

import { writeClient } from '@/sanity/lib/writeClient'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const drafts = await writeClient.fetch<Array<{ _id: string }>>(
    `*[_type == "scheduledPost" && status == "draft"]{ _id }`,
  )
  if (drafts.length === 0) {
    return NextResponse.json({ deleted: 0 })
  }
  const tx = writeClient.transaction()
  for (const d of drafts) tx.delete(d._id)
  await tx.commit()
  return NextResponse.json({ deleted: drafts.length })
}
