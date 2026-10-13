import { NextRequest, NextResponse } from 'next/server'

import { writeClient } from '@/sanity/lib/writeClient'

export const runtime = 'nodejs'

const SHOPIFY_API_VERSION = '2024-10'

async function deleteShopifyArticle(articleId: number, blogId: number): Promise<boolean> {
  const cid = process.env.SHOPIFY_CLIENT_ID
  const cs = process.env.SHOPIFY_CLIENT_SECRET
  const domain = (process.env.SHOPIFY_DOMAIN || '').replace(/^https?:\/\//, '').replace(/\/$/, '')
  if (!cid || !cs || !domain) return false

  const tokenRes = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: cid, client_secret: cs }),
  })
  if (!tokenRes.ok) return false
  const { access_token } = (await tokenRes.json()) as { access_token: string }

  const res = await fetch(
    `https://${domain}/admin/api/${SHOPIFY_API_VERSION}/blogs/${blogId}/articles/${articleId}.json`,
    {
      method: 'DELETE',
      headers: { 'X-Shopify-Access-Token': access_token },
    },
  )
  return res.ok
}

async function getShopifyBlogId(): Promise<number | null> {
  const cid = process.env.SHOPIFY_CLIENT_ID
  const cs = process.env.SHOPIFY_CLIENT_SECRET
  const domain = (process.env.SHOPIFY_DOMAIN || '').replace(/^https?:\/\//, '').replace(/\/$/, '')
  const handle = process.env.SHOPIFY_BLOG_HANDLE
  if (!cid || !cs || !domain || !handle) return null

  const tokenRes = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: cid, client_secret: cs }),
  })
  if (!tokenRes.ok) return null
  const { access_token } = (await tokenRes.json()) as { access_token: string }

  const res = await fetch(`https://${domain}/admin/api/${SHOPIFY_API_VERSION}/blogs.json`, {
    headers: { 'X-Shopify-Access-Token': access_token },
  })
  if (!res.ok) return null
  const data = (await res.json()) as { blogs: Array<{ id: number; handle: string }> }
  return data.blogs.find((b) => b.handle === handle)?.id ?? null
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const url = new URL(req.url)
  const alsoDeleteShopify = url.searchParams.get('shopify') !== 'false'

  const post = await writeClient.fetch<{
    _id: string
    status?: string
    shopifyArticleId?: number
  } | null>(`*[_id == $id][0]{ _id, status, shopifyArticleId }`, { id })

  if (!post) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  // Default policy: also delete Shopify article only if scheduledPost is still a draft
  // (article is created with published: false during bulk upload). Once promoted/published,
  // we leave Shopify alone so the user manages it manually.
  let shopifyDeleted = false
  if (alsoDeleteShopify && post.shopifyArticleId && post.status === 'draft') {
    const blogId = await getShopifyBlogId()
    if (blogId) {
      shopifyDeleted = await deleteShopifyArticle(post.shopifyArticleId, blogId)
    }
  }

  await writeClient.delete(id)

  return NextResponse.json({ deleted: id, shopifyDeleted })
}
