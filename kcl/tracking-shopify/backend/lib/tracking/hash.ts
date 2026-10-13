/** Normalización + hashing SHA-256 de PII para advanced matching (Meta/TikTok). */
import crypto from 'node:crypto'

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

/** email: minúsculas + trim. */
export function normEmail(v?: string | null): string | undefined {
  const t = v?.trim().toLowerCase()
  return t || undefined
}

/** teléfono: solo dígitos con código de país, sin '+' ni separadores. */
export function normPhone(v?: string | null): string | undefined {
  const digits = v?.replace(/[^0-9]/g, '')
  return digits || undefined
}

/** texto genérico (nombre, ciudad): minúsculas + trim, sin espacios extra. */
export function normText(v?: string | null): string | undefined {
  const t = v?.trim().toLowerCase().replace(/\s+/g, ' ')
  return t || undefined
}

/** país a ISO-2 minúsculas. */
export function normCountry(v?: string | null): string | undefined {
  const t = v?.trim().toLowerCase()
  return t && t.length === 2 ? t : undefined
}

/** hashea si hay valor; undefined si no (para no mandar campos vacíos). */
export function hashed(v?: string): string | undefined {
  return v ? sha256(v) : undefined
}
