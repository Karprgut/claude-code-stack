import { NextRequest, NextResponse } from 'next/server'

import { basenameWithoutExt, upsertBlog } from '@/lib/bulk-upload'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const dateYMD = formData.get('date')
  if (typeof dateYMD !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateYMD)) {
    return NextResponse.json({ error: 'date (YYYY-MM-DD) required' }, { status: 400 })
  }

  const files = formData.getAll('files').filter((f): f is File => f instanceof File)
  if (files.length === 0) {
    return NextResponse.json({ error: 'no files received' }, { status: 400 })
  }

  const results: Array<{
    name: string
    pairKey: string
    id: string
    shopifyArticleId?: number
    created: boolean
    merged: boolean
    error?: string
  }> = []

  for (const file of files) {
    try {
      const text = await file.text()
      const pairKey = basenameWithoutExt(file.name)
      const { _id, shopifyArticleId, created, merged } = await upsertBlog({
        pairKey,
        dateYMD,
        filename: file.name,
        rawMarkdown: text,
      })
      results.push({ name: file.name, pairKey, id: _id, shopifyArticleId, created, merged })
    } catch (err) {
      results.push({
        name: file.name,
        pairKey: basenameWithoutExt(file.name),
        id: '',
        created: false,
        merged: false,
        error: (err as Error).message,
      })
    }
  }

  return NextResponse.json({
    processed: results.length,
    created: results.filter((r) => r.created).length,
    merged: results.filter((r) => r.merged).length,
    results,
  })
}
