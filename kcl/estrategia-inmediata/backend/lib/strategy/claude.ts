/**
 * Wrapper de Claude — redacta la estrategia custom de Karma a partir del
 * output determinístico del motor + datos del wizard.
 *
 * El producto es la COMPRA DE LA ESTRATEGIA (no la ejecución): el presupuesto
 * se trata como 100% inversión en medios; NO se menciona fee/operativo de Karma.
 *
 * Voz: la del post-mortem de Karma — título = conclusión, dato con su unidad,
 * "por qué antes de qué", lo que no se sabe se declara, cero fluff.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { StrategyInput, StrategyOutput } from './rules'

const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 3200

export type ClaudeStrategyContext = {
  companyName: string
  contactName: string
  input: StrategyInput
  output: StrategyOutput
}

export async function generateCustomStrategy(ctx: ClaudeStrategyContext): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY no está configurada en el entorno')

  const client = new Anthropic({ apiKey })

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: 'user', content: buildPrompt(ctx) }],
  })

  const block = response.content[0]
  if (!block || block.type !== 'text') throw new Error('Claude no devolvió texto')
  return block.text
}

const MXN = (n: number) => `$${Math.round(n).toLocaleString('es-MX')} MXN`

function buildPrompt(ctx: ClaudeStrategyContext): string {
  const { companyName, contactName, input, output } = ctx

  const dateEs = new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Mexico_City',
  }).format(new Date())

  const frentesSummary = output.frentes
    .map((f) => {
      const canales = f.channels.map((c) => c.channelLabel).join(' + ')
      const kpi = f.cplMxn != null ? `${f.kpiLabel}: objetivo < ${MXN(f.cplMxn)}` : f.kpiLabel
      const est = ` · ~${f.estValue.toLocaleString('es-MX')} ${f.estUnitLabel}`
      return `- ${f.objectiveLabel}: ${MXN(f.budgetMxn)}/mes (${f.pct}% del presupuesto) vía ${canales} — ${kpi}${est}${f.landingNeeded ? ' · requiere landing dedicada' : ''}`
    })
    .join('\n')

  const phasesSummary = output.phases.map((p) => `- ${p.name} (${p.weekRange}): ${p.focus}`).join('\n')
  const prereqSummary = output.prerequisites.map((p) => `- ${p}`).join('\n') || '- (ninguno crítico)'
  const outOfScopeSummary = output.outOfScope.map((p) => `- ${p}`).join('\n')
  const warningsSummary = output.warnings.length
    ? output.warnings.map((wn) => `- ${wn}`).join('\n')
    : '- (sin alertas)'

  const presence = [
    input.presence.hasWebsite ? 'sitio web' : 'sin sitio',
    input.presence.hasGbp ? 'Google Business Profile' : 'sin GBP',
    input.presence.hasSocial ? 'redes activas' : 'sin redes',
    input.presence.hasTracking ? 'tracking instalado' : 'sin tracking',
  ].join(', ')

  return `Eres estratega senior de Karma Creative Lab (kmco.io), agencia creativa/digital en México. Un prospecto compró una estrategia auto-servicio. Escribe el plan completo, personalizado y accionable, con la voz de Karma.

CONTEXTO CLAVE: el cliente compró SOLO la estrategia (documento), no la ejecución. El presupuesto que indicó es 100% inversión en MEDIOS. NO menciones ningún fee, costo operativo ni honorarios de Karma; no descuentes nada del presupuesto. Todo el monto se invierte en pauta/medios.

**Fecha de entrega:** ${dateEs} (úsala EXACTAMENTE, no inventes)

**Datos del prospecto**
- Empresa: ${companyName}
- Contacto: ${contactName}
- Industria: ${input.industry}
- Objetivos: ${input.objectives.join(', ')}
- Intereses/servicios marcados: ${input.services.join(', ')}
- Inversión mensual en medios: ${MXN(input.monthlyBudgetMxn)}
- Geografía: ${input.geoType} — ${input.geoValue}
- Presencia actual: ${presence}
- Experiencia con marketing digital: ${input.experience}
- Timeline: ${input.timeline}

**Distribución del presupuesto por frente (ya calculada — NO recalcules)**
${frentesSummary}

**KPIs estimados**
- Resultado primario estimado: ~${output.primaryOutcome.value.toLocaleString('es-MX')} ${output.primaryOutcome.unitLabel}${output.primaryOutcome.costMxn > 0 ? ` (${output.primaryOutcome.costLabel}: ${MXN(output.primaryOutcome.costMxn)})` : ''}
${output.estLeadsTotal > 0 ? `- Leads/mes estimados (frentes de lead/venta): ${output.estLeadsTotal}${output.estCplAvgMxn != null ? ` · CPL promedio: ${MXN(output.estCplAvgMxn)}` : ''}` : ''}
${output.recommendedContentPieces > 0 ? `- Cadencia de contenido recomendada: ~${output.recommendedContentPieces} piezas/mes (recomendación, el cliente la produce o la cotiza aparte)` : ''}

**Fases**
${phasesSummary}

**Prerequisitos**
${prereqSummary}

**Fuera de scope**
${outOfScopeSummary}

**Alertas del motor**
${warningsSummary}

---

Genera en MARKDOWN el plan, conciso pero completo (~1500-1800 palabras). Header con: título, "Preparado por: Karma Creative Lab", "Para: ${contactName} — ${companyName}", "Fecha: ${dateEs}". Luego estas secciones en orden:

## Resumen ejecutivo
2 párrafos: qué proponemos y qué esperar en 30-60-90 días. Directo, sin fluff.

## Diagnóstico
4-5 bullets sobre la situación de ${companyName} dada su presencia (${presence}) e industria (${input.industry}). Señala los huecos que bloquean resultados. Declara lo que NO se sabe y habría que validar.

## Plan por frentes
Expande cada frente de arriba: canal y por qué, audiencia/segmentación concreta, qué landing/destino necesita, el KPI y su objetivo numérico. REGLA ESTRICTA: usa SOLO los frentes y canales listados. Usa los montos para contextualizar qué se puede hacer con ese dinero EN MEDIOS.

## Distribución del presupuesto
Explica brevemente por qué el reparto entre frentes tiene sentido para su etapa. Recuérdale que el 100% es inversión en medios.

## Plan por fase
Expande las fases con acciones concretas semana a semana / mes a mes: qué se prueba, qué se corta, qué se vigila.

## Quick wins primeras 2 semanas
5-6 acciones priorizadas y accionables ya.

## Riesgos y cómo mitigarlos
3 riesgos reales dado su experiencia (${input.experience}), budget (${MXN(input.monthlyBudgetMxn)}) y objetivos, con su mitigación.

## Próximos pasos
CTA claro: si quiere que Karma EJECUTE esta estrategia, que agende kickoff (la ejecución se cotiza aparte).

REGLAS DE VOZ:
- Español mexicano, tú forms. Nunca voseo argentino ni formas ibéricas.
- Cada título de hallazgo es una CONCLUSIÓN, no etiqueta.
- Dato antes que adjetivo: cifras con unidad ($ MXN, %, CPL, leads).
- Por qué antes de qué. Lo que no se sabe, se declara.
- Sin emojis. Rangos cuando no haya dato exacto. Habla en segunda persona a ${contactName}.`
}
