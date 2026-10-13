import type { LinkedInAccount, PublishInput, PublishResult } from './types'

const API = 'https://api.linkedin.com'

async function registerUpload(
  account: LinkedInAccount,
  recipe: string,
): Promise<{
  uploadUrl: string
  asset: string
}> {
  const res = await fetch(`${API}/v2/assets?action=registerUpload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: [recipe],
        owner: account.urn,
        serviceRelationships: [
          {
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent',
          },
        ],
      },
    }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`LinkedIn registerUpload failed: ${JSON.stringify(json)}`)
  return {
    uploadUrl:
      json.value.uploadMechanism[
        'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
      ].uploadUrl,
    asset: json.value.asset,
  }
}

async function uploadBinary(uploadUrl: string, account: LinkedInAccount, mediaUrl: string) {
  const fileRes = await fetch(mediaUrl)
  if (!fileRes.ok) throw new Error(`Could not download media from ${mediaUrl}`)
  // Preserve the source MIME type. Without it LinkedIn stores the raw bytes with the
  // wrong content type and the rendered image comes out corrupt.
  const contentType = fileRes.headers.get('content-type') || 'image/jpeg'
  const buffer = await fileRes.arrayBuffer()
  const upload = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': contentType,
    },
    body: buffer,
  })
  if (!upload.ok) throw new Error(`LinkedIn binary upload failed (${upload.status})`)
}

// LinkedIn processes the uploaded asset asynchronously. If we create the post before the
// asset is AVAILABLE, it publishes with no image / a broken thumbnail. Poll until ready.
async function waitForAsset(
  account: LinkedInAccount,
  asset: string,
  timeoutMs = 30_000,
): Promise<void> {
  const assetId = asset.split(':').pop()
  const deadline = Date.now() + timeoutMs
  for (let attempt = 0; Date.now() < deadline; attempt++) {
    const res = await fetch(`${API}/v2/assets/${assetId}`, {
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    })
    if (res.ok) {
      const json = await res.json()
      const recipes: Array<{ status?: string }> = json?.recipes ?? []
      const status = recipes[0]?.status
      if (status === 'AVAILABLE') return
      if (status === 'PROCESSING_FAILED' || status === 'CLIENT_ERROR' || status === 'SERVER_ERROR') {
        throw new Error(`LinkedIn asset processing failed: ${status}`)
      }
    }
    // Backoff: 1s, 1.5s, 2s, ... capped at 3s.
    await new Promise((r) => setTimeout(r, Math.min(1000 + attempt * 500, 3000)))
  }
  throw new Error(`LinkedIn asset did not become AVAILABLE within ${Math.round(timeoutMs / 1000)}s`)
}

function isVideoMedia(input: PublishInput): boolean {
  return (
    input.mediaType === 'VIDEO' ||
    input.mediaType === 'REELS' ||
    /\.(mp4|mov|m4v|webm)(\?|#|$)/i.test(input.mediaUrl ?? '')
  )
}

export async function publishToLinkedIn(
  account: LinkedInAccount,
  input: PublishInput,
): Promise<PublishResult> {
  let mediaAsset: string | undefined
  const isVideo = isVideoMedia(input)
  if (input.mediaUrl) {
    // Use the matching recipe: a video uploaded under the image recipe renders corrupt.
    const recipe = isVideo
      ? 'urn:li:digitalmediaRecipe:feedshare-video'
      : 'urn:li:digitalmediaRecipe:feedshare-image'
    const { uploadUrl, asset } = await registerUpload(account, recipe)
    await uploadBinary(uploadUrl, account, input.mediaUrl)
    // Video transcoding on LinkedIn's side takes much longer than image processing.
    await waitForAsset(account, asset, isVideo ? 180_000 : 30_000)
    mediaAsset = asset
  }

  const body = {
    author: account.urn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: input.caption },
        shareMediaCategory: mediaAsset ? (isVideo ? 'VIDEO' : 'IMAGE') : 'NONE',
        ...(mediaAsset && {
          media: [
            {
              status: 'READY',
              media: mediaAsset,
            },
          ],
        }),
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  }

  const res = await fetch(`${API}/v2/ugcPosts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`LinkedIn publish failed: ${JSON.stringify(json)}`)

  const externalId: string = json.id

  return {
    platform: 'linkedin',
    externalId,
    permalink: `https://www.linkedin.com/feed/update/${externalId}`,
    publishedAt: new Date().toISOString(),
  }
}
