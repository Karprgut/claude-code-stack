import { NextRequest } from 'next/server'
import { writeClient } from '@/sanity/lib/writeClient'
import { jsonWithCors, preflight } from '@/lib/http'
import { validateName, validateBusinessEmail, validatePhone, requireFields } from '@/lib/strategy/validate'
import { generateStrategy, type StrategyInput, type Objective, type Service } from '@/lib/strategy/rules'
import { variantIdForTier } from '@/lib/strategy/shopify'

export const dynamic = 'force-dynamic'

export async function OPTIONS(req: NextRequest) {
  return preflight(req.headers.get('origin'))
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  try {
    const body = (await req.json()) as Record<string, unknown>

    const missing = requireFields(body, [
      'companyName', 'contactName', 'contactEmail',
      'industry', 'objectives', 'services',
      'monthlyBudgetMxn', 'timeline', 'geoType',
    ])
    if (missing) return jsonWithCors(origin, { error: missing }, 400)

    for (const c of [
      validateName(body.companyName, 'Nombre de la empresa'),
      validateName(body.contactName, 'Nombre del contacto'),
      validateBusinessEmail(body.contactEmail),
    ]) {
      if (!c.valid) return jsonWithCors(origin, { error: c.reason }, 400)
    }
    if (body.contactPhone) {
      const p = validatePhone(body.contactPhone)
      if (!p.valid) return jsonWithCors(origin, { error: p.reason }, 400)
    }

    const budget = Number(body.monthlyBudgetMxn)
    if (!Number.isFinite(budget) || budget < 500) {
      return jsonWithCors(origin, { error: 'Inversión mensual inválida (mínimo $500 MXN)' }, 400)
    }

    const input: StrategyInput = {
      industry: String(body.industry),
      objectives: (Array.isArray(body.objectives) ? body.objectives : []) as Objective[],
      monthlyBudgetMxn: budget,
      services: (Array.isArray(body.services) ? body.services : []) as Service[],
      geoType: (body.geoType as StrategyInput['geoType']) || 'global',
      geoValue: String(body.geoValue || ''),
      presence: {
        hasWebsite: Boolean((body.presence as Record<string, unknown>)?.hasWebsite),
        hasGbp: Boolean((body.presence as Record<string, unknown>)?.hasGbp),
        hasSocial: Boolean((body.presence as Record<string, unknown>)?.hasSocial),
        hasTracking: Boolean((body.presence as Record<string, unknown>)?.hasTracking),
      },
      experience: (body.experience as StrategyInput['experience']) || 'none',
      timeline: (body.timeline as StrategyInput['timeline']) || 'always_on',
    }

    const output = generateStrategy(input)

    const submission = await writeClient.create({
      _type: 'strategySubmission',
      status: 'preview',
      companyName: String(body.companyName),
      contactName: String(body.contactName),
      contactEmail: String(body.contactEmail),
      contactPhone: body.contactPhone ? String(body.contactPhone) : undefined,
      industry: input.industry,
      objectives: input.objectives,
      services: input.services,
      monthlyBudgetMxn: input.monthlyBudgetMxn,
      timeline: input.timeline,
      geoType: input.geoType,
      geoValue: input.geoValue,
      experience: input.experience,
      budgetTier: output.budgetTier,
      priceMxn: output.priceMxn,
      inputJson: JSON.stringify(input),
      previewJson: JSON.stringify(output),
    })

    // Preview público: solo los headlines, no el plan completo (eso es de pago).
    return jsonWithCors(origin, {
      success: true,
      submissionId: submission._id,
      preview: {
        budgetTier: output.budgetTier,
        variantId: variantIdForTier(output.budgetTier),
        priceMxn: output.priceMxn,
        totalBudgetMxn: output.totalBudgetMxn,
        recommendedContentPieces: output.recommendedContentPieces,
        estLeadsTotal: output.estLeadsTotal,
        estCplAvgMxn: output.estCplAvgMxn,
        primaryOutcome: output.primaryOutcome,
        frenteCount: output.frentes.length,
        frentes: output.frentes.map((f) => ({
          objectiveLabel: f.objectiveLabel,
          budgetMxn: f.budgetMxn,
          pct: f.pct,
          kpiLabel: f.kpiLabel,
          estValue: f.estValue,
          estUnitLabel: f.estUnitLabel,
        })),
        warnings: output.warnings,
      },
    })
  } catch (err: unknown) {
    console.error('[strategy/preview] error:', err)
    const msg = err instanceof Error ? err.message : 'Internal error'
    return jsonWithCors(origin, { error: msg }, 500)
  }
}
