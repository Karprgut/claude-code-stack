/**
 * Envío del entregable por correo con Resend (API REST, sin dependencias).
 * Se llama tras generar la estrategia (best-effort, no bloquea la generación).
 * El correo incluye un RESUMEN de la estrategia (números clave + frentes +
 * resumen ejecutivo) además del botón al entregable completo.
 *
 * Requiere en el entorno:
 *   RESEND_API_KEY  — API key de Resend
 *   RESEND_FROM     — remitente verificado, ej. "Karma Creative Lab <tu-cuenta@tu-dominio.com>"
 *   STRATEGY_EMAIL_BCC — opcional; copia oculta interna (lista separada por comas).
 *                        Default: tu-cuenta@tu-dominio.com.
 */

import type { StrategyOutput } from './rules'

export type StrategyEmailInput = {
  contactEmail: string
  contactName: string
  companyName: string
  publicUrl: string
  output: StrategyOutput
  summaryText: string
}

const MXN = (n: number) => `$${Math.round(n || 0).toLocaleString('es-MX')} MXN`

export async function sendStrategyEmail(
  input: StrategyEmailInput,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY no configurada' }
  const from = process.env.RESEND_FROM || 'Karma Creative Lab <tu-cuenta@tu-dominio.com>'

  // Copia interna oculta (BCC). Configurable con STRATEGY_EMAIL_BCC; default la cuenta de la agencia.
  const bcc = (process.env.STRATEGY_EMAIL_BCC ?? 'tu-cuenta@tu-dominio.com')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const html = buildHtml(input)
  const text = buildText(input)

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [input.contactEmail],
        ...(bcc.length ? { bcc } : {}),
        subject: `Tu estrategia para ${input.companyName} está lista`,
        html,
        text,
      }),
    })
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string }
    if (!res.ok) return { ok: false, error: data.message || `Resend ${res.status}` }
    return { ok: true, id: data.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'error' }
  }
}

function buildText({ contactName, companyName, publicUrl, output, summaryText }: StrategyEmailInput): string {
  const frentes = output.frentes
    .map(
      (f) =>
        `  • ${f.objectiveLabel}: ${MXN(f.budgetMxn)} (${f.pct}%) — ~${f.estValue.toLocaleString('es-MX')} ${f.estUnitLabel}`,
    )
    .join('\n')
  const po = output.primaryOutcome
  return (
    `Hola ${contactName},\n\n` +
    `Tu estrategia para ${companyName} ya está lista.\n\n` +
    `RESUMEN\n` +
    `Inversión mensual en medios: ${MXN(output.totalBudgetMxn)}\n` +
    `Resultado estimado: ~${po.value.toLocaleString('es-MX')} ${po.unitLabel}${po.costMxn > 0 ? ` · ${po.costLabel}: ${MXN(po.costMxn)}` : ''}\n\n` +
    `Frentes:\n${frentes}\n\n` +
    (summaryText ? `${summaryText}\n\n` : '') +
    `Estrategia completa: ${publicUrl}\n\n` +
    `— Karma Creative Lab`
  )
}

function buildHtml({ contactName, companyName, publicUrl, output, summaryText }: StrategyEmailInput): string {
  const frentesRows = output.frentes
    .map(
      (f) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #e5e5e5;font-size:14px;"><b>${escapeHtml(f.objectiveLabel)}</b><br><span style="color:#777;font-size:12px;">${escapeHtml(f.kpiLabel)} · ~${f.estValue.toLocaleString('es-MX')} ${escapeHtml(f.estUnitLabel)}</span></td>
        <td style="padding:8px 0;border-bottom:1px solid #e5e5e5;font-size:14px;text-align:right;white-space:nowrap;"><b>${MXN(f.budgetMxn)}</b><br><span style="color:#777;font-size:12px;">${f.pct}%</span></td>
      </tr>`,
    )
    .join('')

  const po = output.primaryOutcome
  const kpis = `~${po.value.toLocaleString('es-MX')} ${po.unitLabel}${po.costMxn > 0 ? ` · ${po.costLabel} ${MXN(po.costMxn)}` : ''}`

  return `<!DOCTYPE html><html lang="es"><body style="margin:0;background:#FAFAFA;font-family:-apple-system,Segoe UI,Arial,sans-serif;color:#0A0A0A;">
  <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
    <div style="font-family:'Courier New',monospace;font-size:12px;letter-spacing:2px;color:#FF0033;margin-bottom:8px;">KARMA CREATIVE LAB</div>
    <h1 style="font-size:30px;line-height:1.1;text-transform:uppercase;margin:0 0 16px;">Tu estrategia está lista</h1>
    <p style="font-size:16px;line-height:1.5;margin:0 0 24px;">Hola ${escapeHtml(contactName)}, este es el resumen de tu plan para <b>${escapeHtml(companyName)}</b>. El documento completo está en el botón de abajo.</p>

    <!-- Resumen: número grande -->
    <div style="border:3px solid #0A0A0A;box-shadow:5px 5px 0 #00FF41;padding:18px;margin-bottom:8px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#777;">Inversión mensual en medios</div>
      <div style="font-size:32px;font-weight:700;">${MXN(output.totalBudgetMxn)}</div>
      <div style="font-size:13px;color:#555;margin-top:4px;">${kpis}</div>
    </div>

    <!-- Frentes -->
    <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:1px;margin:26px 0 6px;">Frentes</h2>
    <table style="width:100%;border-collapse:collapse;">${frentesRows}</table>

    ${
      summaryText
        ? `<h2 style="font-size:14px;text-transform:uppercase;letter-spacing:1px;margin:26px 0 6px;">Resumen ejecutivo</h2>
    <p style="font-size:14px;line-height:1.6;color:#333;margin:0 0 24px;">${escapeHtml(summaryText)}</p>`
        : ''
    }

    <a href="${publicUrl}" style="display:inline-block;background:#0A0A0A;color:#FAFAFA;text-decoration:none;font-weight:700;text-transform:uppercase;padding:14px 26px;border:3px solid #0A0A0A;box-shadow:5px 5px 0 #00FF41;margin-top:8px;">Ver estrategia completa →</a>
    <p style="font-size:13px;line-height:1.5;color:#555;margin:24px 0 0;">Si el botón no abre, copia este enlace:<br><a href="${publicUrl}" style="color:#0A0A0A;">${publicUrl}</a></p>
    <hr style="border:0;border-top:3px solid #0A0A0A;margin:32px 0;">
    <p style="font-size:13px;line-height:1.5;color:#555;margin:0;">¿Quieres que <b>ejecutemos</b> esta estrategia contigo? Responde este correo y agendamos un kickoff.</p>
  </div>
</body></html>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
