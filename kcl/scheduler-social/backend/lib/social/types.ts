export type Platform = 'instagram' | 'facebook' | 'linkedin'

export type MediaType = 'IMAGE' | 'VIDEO' | 'REELS'

export type PostFormat = 'post' | 'reel' | 'story'

export interface MetaAccount {
  id: string
  label: string
  pageId: string
  pageToken: string
  igUserId?: string
}

export interface LinkedInAccount {
  id: string
  label: string
  urn: string
  accessToken: string
}

export interface PublishInput {
  caption: string
  mediaUrl?: string
  mediaType?: MediaType
  format?: PostFormat
}

export interface PublishResult {
  platform: Platform
  externalId?: string
  permalink?: string
  publishedAt: string
  error?: string
}
