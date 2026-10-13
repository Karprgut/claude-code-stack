import { findLinkedInAccount, findMetaAccount } from './accounts'
import { publishToFacebook, publishToInstagram } from './meta'
import { publishToLinkedIn } from './linkedin'
import type { Platform, PublishInput, PublishResult } from './types'

export async function publishToPlatform(
  platform: Platform,
  accountId: string,
  input: PublishInput,
): Promise<PublishResult> {
  try {
    if (platform === 'instagram' || platform === 'facebook') {
      const account = findMetaAccount(accountId)
      if (!account) throw new Error(`Meta account "${accountId}" not found in META_ACCOUNTS_JSON`)
      return platform === 'instagram'
        ? await publishToInstagram(account, input)
        : await publishToFacebook(account, input)
    }
    if (platform === 'linkedin') {
      const account = findLinkedInAccount(accountId)
      if (!account)
        throw new Error(`LinkedIn account "${accountId}" not found in LINKEDIN_ACCOUNTS_JSON`)
      return await publishToLinkedIn(account, input)
    }
    throw new Error(`Unknown platform: ${platform}`)
  } catch (err) {
    return {
      platform,
      publishedAt: new Date().toISOString(),
      error: (err as Error).message,
    }
  }
}
