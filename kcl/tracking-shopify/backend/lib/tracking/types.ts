/** Formas compartidas de la capa de tracking server-side. */

/** Subconjunto del payload de Shopify orders/paid que consumimos. */
export type ShopifyOrder = {
  id: number | string
  name?: string
  order_number?: number
  currency?: string
  total_price?: string
  current_total_price?: string
  created_at?: string
  email?: string
  phone?: string
  order_status_url?: string
  customer?: {
    id?: number | string
    email?: string
    first_name?: string
    last_name?: string
    phone?: string
  }
  billing_address?: ShopifyAddress
  shipping_address?: ShopifyAddress
  client_details?: { browser_ip?: string; user_agent?: string }
  line_items?: Array<{
    product_id?: number | string
    variant_id?: number | string
    title?: string
    quantity?: number
    price?: string
  }>
}

type ShopifyAddress = {
  first_name?: string
  last_name?: string
  city?: string
  zip?: string
  province_code?: string
  country_code?: string
  phone?: string
}

/** Compra normalizada, lista para mapear a cualquier plataforma. */
export type NormalizedPurchase = {
  eventId: string // = ID de la orden → clave de deduplicación con el pixel del navegador
  eventTimeSec: number
  currency: string
  value: number
  orderId: string
  orderName?: string
  sourceUrl?: string
  contents: Array<{ id: string; quantity: number; price: number; title?: string }>
  user: {
    email?: string
    phone?: string
    firstName?: string
    lastName?: string
    city?: string
    zip?: string
    country?: string
    externalId?: string
    clientIp?: string
    userAgent?: string
  }
}

export type SendResult = {
  channel: 'meta' | 'tiktok'
  ok: boolean
  status?: number
  skipped?: boolean
  error?: string
}
