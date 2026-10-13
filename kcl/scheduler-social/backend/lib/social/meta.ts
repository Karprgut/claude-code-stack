import type { MetaAccount, PublishInput, PublishResult } from './types'

const GRAPH = 'https://graph.facebook.com/v21.0'

async function graph<T = unknown>(
  path: string,
  params: Record<string, string>,
  method: 'GET' | 'POST' = 'POST',
): Promise<T> {
  const url = new URL(`${GRAPH}${path}`)
  if (method === 'GET') {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  const res = await fetch(url.toString(), {
    method,
    body: method === 'POST' ? new URLSearchParams(params) : undefined,
  })
  const json = await res.json()
  if (!res.ok || json.error) {
    throw new Error(`Meta API error: ${JSON.stringify(json.error ?? json)}`)
  }
  return json as T
}

export async function publishToFacebook(
  account: MetaAccount,
  input: PublishInput,
): Promise<PublishResult> {
  const params: Record<string, string> = {
    access_token: account.pageToken,
    message: input.caption,
  }
  let path = `/${account.pageId}/feed`
  if (input.mediaUrl) {
    path = `/${account.pageId}/photos`
    params.url = input.mediaUrl
    params.caption = input.caption
    delete params.message
  }
  const data = await graph<{ id: string; post_id?: string }>(path, params)
  const externalId = data.post_id ?? data.id
  return {
    platform: 'facebook',
    externalId,
    permalink: `https://www.facebook.com/${externalId}`,
    publishedAt: new Date().toISOString(),
  }
}

// Reels/video containers can take 30s–2min to finish processing on Meta's side.
// Poll until a deadline (the cron route's maxDuration must be larger than this).
async function waitForContainer(
  containerId: string,
  token: string,
  timeoutMs = 240_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  let delay = 3000
  while (Date.now() < deadline) {
    const data = await graph<{ status_code: string }>(
      `/${containerId}`,
      { fields: 'status_code', access_token: token },
      'GET',
    )
    if (data.status_code === 'FINISHED') return
    if (data.status_code === 'ERROR' || data.status_code === 'EXPIRED') {
      throw new Error(`IG container failed: ${data.status_code}`)
    }
    await new Promise((r) => setTimeout(r, delay))
    delay = Math.min(delay + 1000, 6000)
  }
  throw new Error('IG container did not finish in time')
}

export async function publishToInstagram(
  account: MetaAccount,
  input: PublishInput,
): Promise<PublishResult> {
  if (!account.igUserId) throw new Error(`Account ${account.id} has no igUserId configured`)
  if (!input.mediaUrl) throw new Error('Instagram requires a media URL (image or video)')

  const params: Record<string, string> = {
    access_token: account.pageToken,
  }

  const isVideoFile =
    input.mediaType === 'VIDEO' ||
    input.mediaType === 'REELS' ||
    /\.(mp4|mov|m4v|webm)(\?|$)/i.test(input.mediaUrl)

  // Stories don't support a caption (silently dropped); posts and reels do.
  if (input.format !== 'story') {
    params.caption = input.caption
  }

  // Map our (format, isVideoFile) to Instagram's media_type:
  //   post + image  → IMAGE  (image_url)
  //   post + video  → REELS  (video_url) — Meta deprecated plain VIDEO posts
  //   reel + *      → REELS  (video_url)
  //   story + image → STORIES + image_url
  //   story + video → STORIES + video_url
  let igMediaType: 'IMAGE' | 'REELS' | 'STORIES'
  if (input.format === 'story') igMediaType = 'STORIES'
  else if (input.format === 'reel' || isVideoFile) igMediaType = 'REELS'
  else igMediaType = 'IMAGE'

  if (igMediaType === 'IMAGE') {
    params.image_url = input.mediaUrl
  } else {
    params.media_type = igMediaType
    if (isVideoFile) params.video_url = input.mediaUrl
    else params.image_url = input.mediaUrl
  }

  const container = await graph<{ id: string }>(`/${account.igUserId}/media`, params)
  if (igMediaType !== 'IMAGE') {
    await waitForContainer(container.id, account.pageToken)
  }

  const published = await graph<{ id: string }>(`/${account.igUserId}/media_publish`, {
    creation_id: container.id,
    access_token: account.pageToken,
  })

  const permalinkData = await graph<{ permalink?: string }>(
    `/${published.id}`,
    { fields: 'permalink', access_token: account.pageToken },
    'GET',
  ).catch(() => ({ permalink: undefined }))

  return {
    platform: 'instagram',
    externalId: published.id,
    permalink: permalinkData.permalink,
    publishedAt: new Date().toISOString(),
  }
}
