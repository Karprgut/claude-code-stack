/**
 * Motor de reglas para el generador de estrategias de Karma Creative Lab.
 *
 * Input: datos del wizard (presupuesto mensual MXN de MEDIOS, objetivos,
 * servicios, geografía, presencia actual, experiencia, timeline).
 * Output: un plan que distribuye el presupuesto de medios entre frentes
 * quirúrgicos por objetivo, con fases, prerequisitos, "fuera de scope" y KPIs.
 *
 * IMPORTANTE: este producto es la COMPRA DE LA ESTRATEGIA (no la ejecución).
 * Por eso NO se descuenta ningún "operativo" / fee de Karma del presupuesto:
 * el monto que mete el cliente se trata como 100% inversión en medios y se
 * reparte completo entre los frentes.
 *
 * Es determinístico y testeable. La redacción custom la añade Claude después.
 */

// ═══════════════════════════════════════════════════════════════════
// Tipos
// ═══════════════════════════════════════════════════════════════════

export type BudgetTier = 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4'

export type Objective =
  | 'trafico_fisico'
  | 'leads_servicios'
  | 'ventas_online'
  | 'b2b_mayoreo'
  | 'awareness'
  | 'comunidad'

export type Service =
  | 'paid_media'
  | 'contenido'
  | 'web_landing'
  | 'branding'
  | 'seo'
  | 'video'
  | 'gbp_local'

export type Channel =
  | 'meta'
  | 'google_search'
  | 'google_pmax'
  | 'google_local'
  | 'tiktok'
  | 'linkedin'

export type Experience = 'none' | 'some' | 'advanced'
export type Timeline = 'lanzamiento' | 'always_on' | 'estacional'

export type Presence = {
  hasWebsite: boolean
  hasGbp: boolean
  hasSocial: boolean
  hasTracking: boolean
}

export type StrategyInput = {
  industry: string
  objectives: Objective[]
  monthlyBudgetMxn: number
  services: Service[]
  geoType: 'pais' | 'estado' | 'ciudad' | 'zona' | 'global'
  geoValue: string
  presence: Presence
  experience: Experience
  timeline: Timeline
}

export type Frente = {
  objective: Objective
  objectiveLabel: string
  channels: Array<{ channel: Channel; channelLabel: string }>
  budgetMxn: number
  pct: number
  kpiLabel: string
  cplMxn: number | null
  estLeads: number | null
  // Resultado primario estimado por frente, con su UNIDAD propia (no todo es
  // "leads": tráfico→visitas, awareness→alcance, comunidad→interacciones).
  estValue: number
  estUnitLabel: string
  estCostLabel: string
  landingNeeded: boolean
  rationale: string
}

export type StrategyOutput = {
  budgetTier: BudgetTier
  priceMxn: number              // precio del entregable (producto Shopify)
  totalBudgetMxn: number        // 100% medios — se reparte entre frentes
  frentes: Frente[]
  recommendedContentPieces: number // recomendación cualitativa (no descuenta budget)
  estLeadsTotal: number            // solo frentes lead/venta (compat); puede ser 0
  estCplAvgMxn: number | null
  // Headline adaptable: resultado primario con su unidad. NUNCA es "0 leads"
  // para estrategias de tráfico/awareness/comunidad — usa su métrica real.
  primaryOutcome: { value: number; unitLabel: string; costMxn: number; costLabel: string }
  phases: Array<{ name: string; weekRange: string; focus: string }>
  prerequisites: string[]
  outOfScope: string[]
  warnings: string[]
}

// ═══════════════════════════════════════════════════════════════════
// Precio del entregable por tier (aprobado por Kar, en MXN)
// ═══════════════════════════════════════════════════════════════════

export function getBudgetTier(budgetMxn: number): BudgetTier {
  if (budgetMxn < 5000) return 'tier_1'
  if (budgetMxn < 15000) return 'tier_2'
  if (budgetMxn < 50000) return 'tier_3'
  return 'tier_4'
}

export function getPriceMxn(tier: BudgetTier): number {
  const prices: Record<BudgetTier, number> = {
    tier_1: 990,
    tier_2: 1990,
    tier_3: 3490,
    tier_4: 4990,
  }
  return prices[tier]
}

// ═══════════════════════════════════════════════════════════════════
// Config por objetivo: canales, CPL benchmark (MXN), KPI
// ═══════════════════════════════════════════════════════════════════

// Benchmarks calibrados con datos REALES de Meta (México, MXN, últimos 90 días,
// 2026-06-05): 4 cuentas / inversión real de varias cuentas (e-commerce, consumo
// CPG, The Branding People agencia, Seguros Atlas leads). Medianas observadas:
// CPM ~$23.5, CPC ~$4.8, CPP ~$47/1000 reach (≈ $0.047/persona alcanzada).
// awareness/tráfico/comunidad anclados a esos datos; leads/ventas/b2b derivados
// del CPC + tasas de conversión de funnel (no había acción directa que medir).
const OBJECTIVE_CONFIG: Record<
  Objective,
  {
    label: string
    channels: Channel[]
    cplMxn: number | null
    kpiLabel: string
    // Benchmark del resultado PRIMARIO de este objetivo (costo por unidad y
    // etiqueta de la unidad). Define la métrica estimada del frente.
    estCostMxn: number
    estUnitLabel: string
    estCostLabel: string
    landingNeeded: boolean
    weight: number
    rationale: string
  }
> = {
  trafico_fisico: {
    label: 'Tráfico a punto físico',
    channels: ['google_local', 'google_pmax', 'meta'],
    cplMxn: null,
    kpiLabel: 'Visitas a tienda / clics "Cómo llegar"',
    estCostMxn: 6, // ~CPC mediano MX ($4.8) + premium de acción de mayor intención
    estUnitLabel: 'visitas/mes est.',
    estCostLabel: 'Costo / visita',
    landingNeeded: false,
    weight: 1,
    rationale:
      'Google Local (PMax store visits + LIAs) y Meta con segmentación por radio capturan demanda cercana con intención inmediata.',
  },
  leads_servicios: {
    label: 'Leads de servicios',
    channels: ['meta', 'google_search'],
    cplMxn: 80,
    kpiLabel: 'Costo por lead (CPL)',
    estCostMxn: 70, // CPC MX (~$4.8) ÷ CVR de landing ~7% — banda MX típica $40-90
    estUnitLabel: 'leads/mes est.',
    estCostLabel: 'CPL prom.',
    landingNeeded: true,
    weight: 1,
    rationale:
      'Meta Lead Ads para volumen y Google Search para alta intención ("servicio + ciudad"). Cada servicio necesita su landing para no quemar pauta.',
  },
  ventas_online: {
    label: 'Ventas e-commerce',
    channels: ['google_pmax', 'meta', 'google_search'],
    cplMxn: 150,
    kpiLabel: 'Costo por compra (CPA) / ROAS',
    estCostMxn: 150, // CPC e-commerce MX (~$2.4 en una cuenta real) ÷ CVR ~1.5-2% de compra
    estUnitLabel: 'compras/mes est.',
    estCostLabel: 'CPA prom.',
    landingNeeded: false,
    weight: 1,
    rationale:
      'Google PMax con feed de productos + Meta Advantage+ Shopping cubren prospecting y retargeting; Search captura búsquedas de producto con intención.',
  },
  b2b_mayoreo: {
    label: 'B2B / mayoreo',
    channels: ['meta', 'google_search', 'linkedin'],
    cplMxn: 300,
    kpiLabel: 'CPL B2B (vertical premium)',
    estCostMxn: 300, // ~4x CPL de servicios: vertical premium, menor volumen
    estUnitLabel: 'leads/mes est.',
    estCostLabel: 'CPL B2B prom.',
    landingNeeded: true,
    weight: 1,
    rationale:
      'Vertical premium: Meta Lead Ads + Google Search de mayoreo, con landing B2B dedicada (catálogo, precios, formulario). CPL mayor pero LTV recurrente.',
  },
  awareness: {
    label: 'Awareness / marca',
    channels: ['meta', 'tiktok'],
    cplMxn: null,
    kpiLabel: 'Alcance / CPM / recordación',
    estCostMxn: 0.06, // CPP real MX ~$47/1000 reach = $0.047/persona (+colchón saturación)
    estUnitLabel: 'personas alcanzadas/mes',
    estCostLabel: 'Costo / persona',
    landingNeeded: false,
    weight: 0.8,
    rationale:
      'Meta y TikTok en formatos de video corto construyen alcance y recordación a CPM bajo; ideal para llenar pools de remarketing.',
  },
  comunidad: {
    label: 'Comunidad / orgánico',
    channels: ['meta', 'tiktok'],
    cplMxn: null,
    kpiLabel: 'Crecimiento de seguidores / engagement',
    estCostMxn: 1.5, // interacciones (reacción/clic/comentario) < link-click; barato vs CPC
    estUnitLabel: 'interacciones/mes est.',
    estCostLabel: 'Costo / interacción',
    landingNeeded: false,
    weight: 0.6,
    rationale:
      'Crecimiento de comunidad apoyado por pauta de engagement; el motor real es el contenido.',
  },
}

const CHANNEL_LABELS: Record<Channel, string> = {
  meta: 'Meta (Facebook / Instagram)',
  google_search: 'Google Search',
  google_pmax: 'Google Performance Max',
  google_local: 'Google Local (PMax visitas + LIAs)',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
}

// ═══════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════

export function generateStrategy(input: StrategyInput): StrategyOutput {
  const total = Math.max(0, Math.round(input.monthlyBudgetMxn))
  const tier = getBudgetTier(total)
  const priceMxn = getPriceMxn(tier)

  // ── Frentes (objetivos quirúrgicos) — reparten el 100% del presupuesto ──
  const objectives = input.objectives.length > 0 ? input.objectives : ['leads_servicios' as Objective]
  const maxFrentes = getMaxFrentes(total, objectives.length)
  const chosenObjectives = objectives.slice(0, maxFrentes)

  const weightSum = chosenObjectives.reduce((s, o) => s + OBJECTIVE_CONFIG[o].weight, 0)
  const frentes: Frente[] = chosenObjectives
    .map((obj) => {
      const cfg = OBJECTIVE_CONFIG[obj]
      const share = cfg.weight / weightSum
      const budgetMxn = Math.round(total * share)
      const cpl = cfg.cplMxn
      return {
        objective: obj,
        objectiveLabel: cfg.label,
        channels: cfg.channels.map((c) => ({ channel: c, channelLabel: CHANNEL_LABELS[c] })),
        budgetMxn,
        pct: Math.round(share * 100),
        kpiLabel: cfg.kpiLabel,
        cplMxn: cpl,
        estLeads: null as number | null, // se calcula tras el ajuste de redondeo
        estValue: 0,
        estUnitLabel: cfg.estUnitLabel,
        estCostLabel: cfg.estCostLabel,
        landingNeeded: cfg.landingNeeded,
        rationale: cfg.rationale,
      }
    })
    .sort((a, b) => b.budgetMxn - a.budgetMxn)

  // Ajuste de redondeo: la diferencia se mete en el frente más grande.
  const diff = total - frentes.reduce((s, f) => s + f.budgetMxn, 0)
  if (diff !== 0 && frentes.length > 0) frentes[0].budgetMxn += diff

  // Estimaciones por frente con el budget YA ajustado (su métrica propia).
  for (const f of frentes) {
    const cfg = OBJECTIVE_CONFIG[f.objective]
    f.estValue = cfg.estCostMxn > 0 ? Math.round(f.budgetMxn / cfg.estCostMxn) : 0
    f.estLeads = f.cplMxn && f.cplMxn > 0 ? Math.round(f.budgetMxn / f.cplMxn) : null
  }

  // ── KPIs agregados ───────────────────────────────────────────────
  const leadFrentes = frentes.filter((f) => f.estLeads != null)
  const estLeadsTotal = leadFrentes.reduce((s, f) => s + (f.estLeads || 0), 0)
  const estCplAvgMxn =
    estLeadsTotal > 0
      ? Math.round(leadFrentes.reduce((s, f) => s + f.budgetMxn, 0) / estLeadsTotal)
      : null

  // Headline adaptable: suma los frentes que comparten la unidad del frente más
  // grande (p. ej. leads de servicios + B2B se suman; visitas no se mezclan con
  // leads). Nunca es "0 leads" — usa la métrica real del objetivo dominante.
  const primaryOutcome = (() => {
    if (frentes.length === 0) {
      return { value: 0, unitLabel: 'resultados/mes est.', costMxn: 0, costLabel: 'Costo / resultado' }
    }
    const top = frentes[0]
    const sameUnit = frentes.filter((f) => f.estUnitLabel === top.estUnitLabel)
    const value = sameUnit.reduce((s, f) => s + f.estValue, 0)
    const budget = sameUnit.reduce((s, f) => s + f.budgetMxn, 0)
    // Costo por unidad: entero si ≥$10, con 2 decimales si es sub-peso/bajo
    // (p. ej. awareness ~$0.06/persona no debe mostrarse como "$0").
    const raw = value > 0 ? budget / value : 0
    const costMxn = raw >= 10 ? Math.round(raw) : Math.round(raw * 100) / 100
    return {
      value,
      unitLabel: top.estUnitLabel,
      costMxn,
      costLabel: top.estCostLabel,
    }
  })()

  // ── Recomendación de contenido (cualitativa, NO descuenta budget) ──
  const wantsContent = input.services.includes('contenido') || input.services.includes('video')
  const recommendedContentPieces = wantsContent
    ? clamp(Math.round(total / 1500) + 4, 4, 30)
    : 0

  return {
    budgetTier: tier,
    priceMxn,
    totalBudgetMxn: total,
    frentes,
    recommendedContentPieces,
    estLeadsTotal,
    estCplAvgMxn,
    primaryOutcome,
    phases: buildPhases(input),
    prerequisites: buildPrerequisites(input, frentes),
    outOfScope: buildOutOfScope(input),
    warnings: buildWarnings(input, total, frentes),
  }
}

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

/** Cuántos frentes paralelos sostiene el presupuesto de medios. */
function getMaxFrentes(budgetMxn: number, requested: number): number {
  let cap: number
  if (budgetMxn < 3000) cap = 1
  else if (budgetMxn < 8000) cap = 2
  else if (budgetMxn < 25000) cap = 3
  else cap = 4
  return Math.max(1, Math.min(cap, requested))
}

function buildPhases(input: StrategyInput): Array<{ name: string; weekRange: string; focus: string }> {
  const setupFocus =
    'Diagnóstico de posicionamiento, setup de tracking (Pixel + CAPI + GTM) y construcción de landings/creatives base.'

  if (input.timeline === 'lanzamiento') {
    return [
      { name: 'Diagnóstico + build', weekRange: 'Semana 1-2', focus: setupFocus },
      { name: 'Lanzamiento', weekRange: 'Semana 3-4', focus: 'Salida en frío con prospecting agresivo en los frentes definidos; llenar pools de remarketing.' },
      { name: 'Optimización', weekRange: 'Semana 5+', focus: 'Cortar lo que no da CPL/CPA objetivo, duplicar ganadores, abrir remarketing.' },
    ]
  }
  if (input.timeline === 'estacional') {
    return [
      { name: 'Pre-pico', weekRange: '2-4 semanas antes', focus: 'Awareness + consideración; llenar remarketing y dejar listas landings y creatives.' },
      { name: 'Pico', weekRange: 'Semana del evento', focus: 'Conversión máxima: Search + Meta/Google en los frentes core. ~70% del budget aquí.' },
      { name: 'Post-pico', weekRange: '1 semana después', focus: 'Retención y remarketing de compradores/leads recientes.' },
    ]
  }
  return [
    { name: 'Diagnóstico + build', weekRange: 'Mes 1', focus: setupFocus },
    { name: 'Optimización', weekRange: 'Mes 2', focus: 'Aprender CPL/CPA reales por frente, cortar underperformers, iterar creatives y copy.' },
    { name: 'Always-on', weekRange: 'Mes 3+', focus: 'Sostener ganadores, refresh mensual de contenido y competidores, probar 1 palanca nueva por mes.' },
  ]
}

function buildPrerequisites(input: StrategyInput, frentes: Frente[]): string[] {
  const reqs = new Set<string>()

  if (!input.presence.hasTracking) {
    reqs.add('Setup de medición en semana 1: Meta Pixel + Conversions API (CAPI) + Google Tag vía GTM.')
  }
  reqs.add('Mínimo 3 variantes de creative por frente de prospecting.')

  if (frentes.some((f) => f.landingNeeded) && !input.presence.hasWebsite) {
    reqs.add('Landing pages dedicadas por frente (sin destino no se puede correr pauta de servicios/B2B).')
  } else if (frentes.some((f) => f.landingNeeded)) {
    reqs.add('Landing pages dedicadas por servicio/frente (aunque exista sitio, cada frente necesita su destino).')
  }

  if (frentes.some((f) => f.objective === 'trafico_fisico') && !input.presence.hasGbp) {
    reqs.add('Google Business Profile optimizado: fotos, posts, productos y atributos correctos.')
  }

  if (input.experience === 'none') {
    reqs.add('Configurar Google Analytics 4 (GA4) para atribución multicanal.')
  }

  return Array.from(reqs)
}

function buildOutOfScope(input: StrategyInput): string[] {
  const all: Array<{ service: Service; label: string }> = [
    { service: 'seo', label: 'SEO técnico (migración de URLs, dedupe de slugs)' },
    { service: 'web_landing', label: 'Rediseño completo de sitio / e-commerce' },
    { service: 'branding', label: 'Rebranding integral (naming, manual de marca completo)' },
    { service: 'video', label: 'Producción de video de alto presupuesto (sets, talento)' },
    { service: 'contenido', label: 'Community management / atención de mensajes 24/7' },
  ]
  const out = all.filter((x) => !input.services.includes(x.service)).map((x) => x.label)
  out.push('Ejecución y gestión de campañas (este entregable es la estrategia; la ejecución se cotiza aparte con Karma)')
  out.push('Influencer / vocería y email marketing (cotizables aparte)')
  return out
}

function buildWarnings(input: StrategyInput, total: number, frentes: Frente[]): string[] {
  const w: string[] = []

  if (total < 3000) {
    w.push('Presupuesto bajo: concentramos en 1 frente para que tenga masa crítica y salga de learning. Abrir más frentes fragmenta la inversión.')
  }

  if (input.objectives.length > frentes.length) {
    w.push(
      `Pediste ${input.objectives.length} objetivos pero el budget sostiene ${frentes.length} frente(s) con foco. Priorizamos los de mayor impacto; el resto entra cuando escale la inversión.`,
    )
  }

  if (frentes.some((f) => f.objective === 'ventas_online') && !input.presence.hasWebsite) {
    w.push('Objetivo de ventas online sin tienda detectada: el e-commerce funcional es prerequisito para correr pauta de ventas.')
  }

  if (input.experience === 'none' && frentes.length > 2) {
    w.push('Para equipos sin experiencia previa, arrancar con 1-2 frentes da mejor lectura que abrir varios a la vez.')
  }

  if (!input.services.includes('paid_media')) {
    w.push('El presupuesto se asume como inversión en medios. Sin pauta, el alcance depende del orgánico, que es más lento.')
  }

  return w
}
