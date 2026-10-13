/** Mapea un pedido de Shopify (orders/paid) a una compra normalizada. */
import { normCountry, normEmail, normPhone, normText } from './hash'
import type { NormalizedPurchase, ShopifyOrder } from './types'

function toNumber(v?: string): number {
  const n = v ? Number.parseFloat(v) : NaN
  return Number.isFinite(n) ? n : 0
}

export function normalizePurchase(order: ShopifyOrder): NormalizedPurchase {
  const orderId = String(order.id)
  const addr = order.billing_address || order.shipping_address || {}
  const customer = order.customer || {}

  const createdMs = order.created_at ? Date.parse(order.created_at) : Date.now()
  const eventTimeSec = Math.floor((Number.isFinite(createdMs) ? createdMs : Date.now()) / 1000)

  return {
    eventId: orderId,
    orderId,
    orderName: order.name,
    eventTimeSec,
    currency: (order.currency || 'MXN').toUpperCase(),
    value: toNumber(order.current_total_price || order.total_price),
    sourceUrl: order.order_status_url,
    contents: (order.line_items || []).map((li) => ({
      id: String(li.product_id ?? li.variant_id ?? ''),
      quantity: li.quantity ?? 1,
      price: toNumber(li.price),
      title: li.title,
    })),
    user: {
      email: normEmail(customer.email || order.email),
      phone: normPhone(customer.phone || order.phone || addr.phone),
      firstName: normText(customer.first_name || addr.first_name),
      lastName: normText(customer.last_name || addr.last_name),
      city: normText(addr.city),
      zip: addr.zip?.trim() || undefined,
      country: normCountry(addr.country_code),
      externalId: customer.id != null ? String(customer.id) : undefined,
      clientIp: order.client_details?.browser_ip,
      userAgent: order.client_details?.user_agent,
    },
  }
}
