import { NextResponse } from 'next/server'

import { syncBlogPostsToScheduler } from '@/lib/blog-sync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const result = await syncBlogPostsToScheduler()
  return NextResponse.json(result)
}
