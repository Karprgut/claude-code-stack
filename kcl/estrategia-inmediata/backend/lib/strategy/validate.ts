/**
 * Validaciones de input compartidas por las rutas de brief y estrategia.
 * Rechaza correos personales (queremos correo corporativo) y formatos basura.
 */

export type Check = { valid: boolean; reason?: string }

const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.es', 'outlook.com',
  'outlook.es', 'live.com', 'yahoo.com', 'yahoo.es', 'yahoo.com.mx',
  'icloud.com', 'me.com', 'aol.com', 'protonmail.com', 'proton.me',
])

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i

export function validateName(value: unknown, field: string): Check {
  if (typeof value !== 'string' || value.trim().length < 2) {
    return { valid: false, reason: `${field} inválido` }
  }
  return { valid: true }
}

export function validateBusinessEmail(value: unknown): Check {
  if (typeof value !== 'string' || !EMAIL_RE.test(value)) {
    return { valid: false, reason: 'Email inválido' }
  }
  const domain = value.toLowerCase().split('@')[1]
  if (FREE_EMAIL_DOMAINS.has(domain)) {
    return { valid: false, reason: 'Usa tu correo corporativo (no gmail/hotmail/yahoo)' }
  }
  return { valid: true }
}

export function validatePhone(value: unknown): Check {
  if (typeof value !== 'string') return { valid: false, reason: 'Teléfono inválido' }
  const phone = value.replace(/[\s\-().]/g, '')
  if (!/^\+?\d{8,15}$/.test(phone)) return { valid: false, reason: 'Teléfono inválido' }
  return { valid: true }
}

/** Verifica que todos los campos requeridos vengan presentes y no vacíos. */
export function requireFields(body: Record<string, unknown>, fields: string[]): string | null {
  for (const f of fields) {
    const v = body[f]
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
      return `Falta el campo requerido: ${f}`
    }
  }
  return null
}
