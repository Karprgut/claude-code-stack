import { NextRequest, NextResponse } from 'next/server'

import { writeClient } from '@/sanity/lib/writeClient'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SHOPIFY_API_VERSION = '2024-10'

async function shopifyAuth(): Promise<{ token: string; domain: string } | null> {
  const cid = process.env.SHOPIFY_CLIENT_ID
  const cs = process.env.SHOPIFY_CLIENT_SECRET
  const domain = (process.env.SHOPIFY_DOMAIN || '').replace(/^https?:\/\//, '').replace(/\/$/, '')
  if (!cid || !cs || !domain) return null
  const res = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: cid, client_secret: cs }),
  })
  if (!res.ok) return null
  const { access_token } = (await res.json()) as { access_token: string }
  return { token: access_token, domain }
}

async function getShopifyBlogId(token: string, domain: string): Promise<number | null> {
  const handle = process.env.SHOPIFY_BLOG_HANDLE
  if (!handle) return null
  const res = await fetch(`https://${domain}/admin/api/${SHOPIFY_API_VERSION}/blogs.json`, {
    headers: { 'X-Shopify-Access-Token': token },
  })
  if (!res.ok) return null
  const data = (await res.json()) as { blogs: Array<{ id: number; handle: string }> }
  return data.blogs.find((b) => b.handle === handle)?.id ?? null
}

async function deleteShopifyArticle(
  token: string,
  domain: string,
  blogId: number,
  articleId: number,
): Promise<boolean> {
  const res = await fetch(
    `https://${domain}/admin/api/${SHOPIFY_API_VERSION}/blogs/${blogId}/articles/${articleId}.json`,
    {
      method: 'DELETE',
      headers: { 'X-Shopify-Access-Token': token },
    },
  )
  return res.ok
}

interface BulkDeleteBody {
  ids: string[]
  alsoDeleteShopify?: boolean
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as BulkDeleteBody
  const ids = (body.ids || []).filter((x) => typeof x === 'string')
  const alsoDeleteShopify = body.alsoDeleteShopify !== false

  if (ids.length === 0) {
    return NextResponse.json({ error: 'ids required' }, { status: 400 })
  }

  const posts = await writeClient.fetch<
    Array<{ _id: string; status?: string; shopifyArticleId?: number }>
  >(`*[_id in $ids]{ _id, status, shopifyArticleId }`, { ids })

  // Delete Shopify articles for drafts (they were created with published: false)
  let shopifyDeleted = 0
  if (alsoDeleteShopify) {
    const auth = await shopifyAuth()
    if (auth) {
      const blogId = await getShopifyBlogId(auth.token, auth.domain)
      if (blogId) {
        for (const p of posts) {
          if (p.shopifyArticleId && p.status === 'draft') {
            const ok = await deleteShopifyArticle(auth.token, auth.domain, blogId, p.shopifyArticleId)
            if (ok) shopifyDeleted++
          }
        }
      }
    }
  }

  // Delete Sanity docs in one transaction
  const tx = writeClient.transaction()
  for (const p of posts) tx.delete(p._id)
  await tx.commit()

  return NextResponse.json({
    deleted: posts.length,
    shopifyDeleted,
    requested: ids.length,
  })
}
