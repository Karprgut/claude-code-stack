/**
 * Orquesta la generación del entregable tras el pago:
 *   submission (Sanity) → motor de reglas → Claude → doc `strategy` con slug +
 *   URL final → marca la submission como completed.
 *
 * Idempotente: si la submission ya está completed, devuelve la existente (el
 * webhook de Shopify puede reintentar).
 */

import { writeClient } from '@/sanity/lib/writeClient'
import { generateStrategy, type StrategyInput } from './rules'
import { generateCustomStrategy } from './claude'
import { sendStrategyEmail } from './email'

const RESULT_PATH = '/pages/estrategia-resultado'

function shortToken(): string {
  // Sufijo corto para el slug. crypto está disponible en el runtime de Node.
  return globalThis.crypto.randomUUID().split('-')[0]
}

/** Extrae el texto de la sección "Resumen ejecutivo" del markdown, sin formato. */
function extractExecutiveSummary(md: string): string {
  if (!md) return ''
  const m = md.match(/##\s*Resumen ejecutivo\s*\n([\s\S]*?)(?:\n##\s|$)/i)
  let body = m ? m[1] : md
  body = body
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  return body.length > 700 ? body.slice(0, 697).trimEnd() + '…' : body
}

export async function runStrategyGeneration(
  submissionId: string,
  opts: { shopifyOrderId?: string } = {},
): Promise<{ slug: string; publicUrl: string; strategyId: string; already: boolean }> {
  const submission = await writeClient.getDocument(submissionId)
  if (!submission) throw new Error(`Submission ${submissionId} no encontrada`)

  // Idempotencia
  if (submission.status === 'completed' && submission.strategy?._ref) {
    const existing = await writeClient.getDocument(submission.strategy._ref)
    return {
      slug: existing?.slug?.current ?? '',
      publicUrl: existing?.publicUrl ?? '',
      strategyId: submission.strategy._ref,
      already: true,
    }
  }

  if (!submission.inputJson) throw new Error(`Submission ${submissionId} sin inputJson`)
  const input = JSON.parse(submission.inputJson) as StrategyInput
  const output = generateStrategy(input)

  const customInsights = await generateCustomStrategy({
    companyName: submission.companyName,
    contactName: submission.contactName,
    input,
    output,
  })

  const slug = `${shortToken()}-${shortToken()}`
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://karmacreativelab.com').replace(/\/$/, '')
  const publicUrl = `${base}${RESULT_PATH}?slug=${slug}`

  const strategy = await writeClient.create({
    _type: 'strategy',
    slug: { _type: 'slug', current: slug },
    publicUrl,
    companyName: submission.companyName,
    contactName: submission.contactName,
    contactEmail: submission.contactEmail,
    customInsights,
    outputJson: JSON.stringify(output),
    emailSent: false,
    submission: { _type: 'reference', _ref: submissionId },
  })

  await writeClient
    .patch(submissionId)
    .set({
      status: 'completed',
      strategy: { _type: 'reference', _ref: strategy._id },
      ...(opts.shopifyOrderId ? { shopifyOrderId: opts.shopifyOrderId } : {}),
    })
    .commit()

  // Email al cliente con el link — best-effort, no bloquea ni revierte si falla.
  if (submission.contactEmail) {
    try {
      const mail = await sendStrategyEmail({
        contactEmail: submission.contactEmail,
        contactName: submission.contactName || '',
        companyName: submission.companyName || '',
        publicUrl,
        output,
        summaryText: extractExecutiveSummary(customInsights),
      })
      if (mail.ok) {
        await writeClient.patch(strategy._id).set({ emailSent: true }).commit().catch(() => null)
      } else {
        console.warn('[generate] email no enviado:', mail.error)
      }
    } catch (err) {
      console.warn('[generate] email falló:', err)
    }
  }

  return { slug, publicUrl, strategyId: strategy._id, already: false }
}
