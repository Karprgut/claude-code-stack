import { NextRequest, NextResponse } from 'next/server'

import { syncBlogPostsToScheduler } from '@/lib/blog-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = req.headers.get('authorization')
  return header === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const result = await syncBlogPostsToScheduler()
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  return GET(req)
}
