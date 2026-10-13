/**
 * Helpers de Shopify del feature de estrategia. Usan la app "KCL products"
 * (SHOPIFY_KCL_CLIENT_ID/SECRET) que tiene scopes de productos y pedidos —
 * SEPARADA de la app de contenido que usa lib/shopify.ts para el blog.
 */

import type { BudgetTier } from './rules'

const API_VERSION = '2024-10'

function domain(): string {
  const d = process.env.SHOPIFY_DOMAIN
  if (!d) throw new Error('SHOPIFY_DOMAIN no configurado')
  return d.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

let cached: { token: string; expiresAt: number } | null = null

async function kclToken(): Promise<string> {
  const id = process.env.SHOPIFY_KCL_CLIENT_ID
  const secret = process.env.SHOPIFY_KCL_CLIENT_SECRET
  if (!id || !secret) throw new Error('Faltan SHOPIFY_KCL_CLIENT_ID / SHOPIFY_KCL_CLIENT_SECRET')

  const now = Date.now()
  if (cached && cached.expiresAt > now + 60_000) return cached.token

  const res = await fetch(`https://${domain()}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: id, client_secret: secret }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`KCL token exchange falló: ${res.status} ${text.slice(0, 200)}`)
  const data = JSON.parse(text) as { access_token: string; expires_in: number }
  cached = { token: data.access_token, expiresAt: now + (data.expires_in - 60) * 1000 }
  return cached.token
}

async function kclAdmin<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await kclToken()
  const res = await fetch(`https://${domain()}/admin/api/${API_VERSION}${path}`, {
    ...init,
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers || {}),
    },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Shopify ${res.status} on ${path}: ${text.slice(0, 300)}`)
  return text ? (JSON.parse(text) as T) : ({} as T)
}

/** ID de variante por tier, leído de env (se llenan tras crear el producto). */
export function variantIdForTier(tier: BudgetTier): string | null {
  const map: Record<BudgetTier, string | undefined> = {
    tier_1: process.env.SHOPIFY_VARIANT_TIER_1,
    tier_2: process.env.SHOPIFY_VARIANT_TIER_2,
    tier_3: process.env.SHOPIFY_VARIANT_TIER_3,
    tier_4: process.env.SHOPIFY_VARIANT_TIER_4,
  }
  return map[tier] || null
}

type ShopifyOrder = {
  id: number
  email?: string
  line_items?: Array<{ properties?: Array<{ name: string; value: string }> }>
  note_attributes?: Array<{ name: string; value: string }>
}

/** Extrae el submissionId de un pedido (line item property o note attribute). */
export function submissionIdFromOrder(order: ShopifyOrder): string | null {
  for (const li of order.line_items || []) {
    const p = (li.properties || []).find((x) => x.name === 'submissionId' || x.name === '_submissionId')
    if (p?.value) return p.value
  }
  const na = (order.note_attributes || []).find((x) => x.name === 'submissionId')
  return na?.value || null
}

/** Trae un pedido completo por ID (app KCL, scope read_orders). */
export async function getOrder(orderId: string | number): Promise<ShopifyOrder> {
  const data = await kclAdmin<{ order: ShopifyOrder }>(`/orders/${orderId}.json`)
  return data.order
}
