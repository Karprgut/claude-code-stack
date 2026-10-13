import type { LinkedInAccount, MetaAccount } from './types'

function parseJsonEnv<T>(raw: string | undefined, name: string): T[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error(`${name} must be a JSON array`)
    return parsed as T[]
  } catch (err) {
    throw new Error(`Invalid ${name}: ${(err as Error).message}`)
  }
}

export function getMetaAccounts(): MetaAccount[] {
  return parseJsonEnv<MetaAccount>(process.env.META_ACCOUNTS_JSON, 'META_ACCOUNTS_JSON')
}

export function getLinkedInAccounts(): LinkedInAccount[] {
  return parseJsonEnv<LinkedInAccount>(
    process.env.LINKEDIN_ACCOUNTS_JSON,
    'LINKEDIN_ACCOUNTS_JSON',
  )
}

export function findMetaAccount(id: string): MetaAccount | undefined {
  return getMetaAccounts().find((a) => a.id === id)
}

export function findLinkedInAccount(id: string): LinkedInAccount | undefined {
  return getLinkedInAccounts().find((a) => a.id === id)
}
