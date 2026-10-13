import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import {
  BRAND_GUIDE_OPTIONS,
  BRAND_VOICE,
  BUDGET_OPTIONS,
  BUSINESS_TYPES,
  CRITERIA_LABELS,
  CURRENCIES,
  EXISTING_INTEGRATIONS,
  FEATURES,
  FREE_EMAIL_PROVIDERS,
  FormState,
  HAS_ECOMMERCE,
  INVOICING_OPTIONS,
  KPI_PRIMARY,
  LANGUAGES,
  LAUNCH_TIMELINE,
  MARKETS,
  Option,
  PAYMENT_METHODS,
  PLATFORMS,
  SKU_RANGES,
  SUPPORT_CHANNELS,
  TRANSACTION_VOLUMES,
} from "../../questions";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const labelOf = (opts: Option[], value: string) =>
  opts.find((o) => o.value === value)?.label ?? value ?? "—";

const labelsOf = (opts: Option[], values: string[]) =>
  !values || values.length === 0
    ? "—"
    : values.map((v) => labelOf(opts, v)).join(", ");

const emailRe = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as FormState;

    // ─── Validation ─────────────────────────────────────────────
    const required: Array<[keyof FormState, string]> = [
      ["companyName", "Nombre de la empresa"],
      ["companyCountry", "País"],
      ["contactName", "Nombre del contacto"],
      ["contactEmail", "Email"],
      ["contactRole", "Puesto"],
      ["contactPhone", "Teléfono"],
      ["hasExistingEcommerce", "E-commerce previo"],
      ["projectBudget", "Presupuesto"],
      ["launchTimeline", "Timeline"],
      ["proposalDeadline", "Fecha límite propuesta"],
      ["skuRange", "Rango de SKUs"],
      ["primaryKpi", "KPI primario"],
      ["transactionVolume", "Volumen de transacciones"],
      ["preferredPlatform", "Plataforma preferida"],
      ["invoicing", "Facturación"],
      ["hasBrandGuide", "Manual de marca"],
      ["mustSucceed", "3 cosas que tienen que salir bien"],
    ];
    for (const [k, label] of required) {
      const v = body[k];
      if (!v || (typeof v === "string" && v.trim() === ""))
        return NextResponse.json(
          { error: `Falta: ${label}` },
          { status: 400 }
        );
    }

    const arrayRequired: Array<[keyof FormState, string]> = [
      ["businessTypes", "Modelo de negocio"],
      ["markets", "Mercados"],
      ["languages", "Idiomas"],
      ["currencies", "Monedas"],
      ["features", "Features MVP"],
      ["paymentMethods", "Métodos de pago"],
      ["supportChannels", "Canales de soporte"],
      ["brandVoice", "Tono de voz"],
    ];
    for (const [k, label] of arrayRequired) {
      const v = body[k] as unknown;
      if (!Array.isArray(v) || v.length === 0)
        return NextResponse.json(
          { error: `Falta: ${label}` },
          { status: 400 }
        );
    }

    if (!emailRe.test(body.contactEmail))
      return NextResponse.json({ error: "Email no válido" }, { status: 400 });
    const domain = body.contactEmail.toLowerCase().split("@")[1];
    if (FREE_EMAIL_PROVIDERS.includes(domain))
      return NextResponse.json(
        { error: "Usa tu correo corporativo (no gmail/hotmail/yahoo)" },
        { status: 400 }
      );

    const phone = body.contactPhone.replace(/[\s\-()\.]/g, "");
    if (!/^\+?\d{8,15}$/.test(phone))
      return NextResponse.json(
        { error: "Teléfono no válido" },
        { status: 400 }
      );

    if (body.mustSucceed.trim().length < 30)
      return NextResponse.json(
        { error: "‘Cosas que tienen que salir bien’: mínimo 30 caracteres" },
        { status: 400 }
      );

    // ─── ID ─────────────────────────────────────────────────────
    const id =
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 8).toUpperCase();

    // ─── Email ──────────────────────────────────────────────────
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error(
        "[submit] RESEND_API_KEY not set — brief not delivered. id:",
        id
      );
      return NextResponse.json(
        {
          error:
            "El servicio de envío no está configurado. Contacta al administrador (RESEND_API_KEY).",
        },
        { status: 503 }
      );
    }

    const resend = new Resend(apiKey);

    const criteriaRanked = (body.evaluationCriteria || [])
      .map((k, i) => `${i + 1}. ${CRITERIA_LABELS[k] ?? k}`)
      .join(" · ");

    const row = (label: string, value: string) => `
      <tr style="border-bottom: 1px solid #23252a;">
        <td style="padding: 10px 0; color: #8a8f98; width: 180px; vertical-align: top; font-size: 13px;">${label}</td>
        <td style="padding: 10px 0; color: #f7f8f8; font-size: 14px;">${value || "—"}</td>
      </tr>`;
    const sectionTitle = (text: string) => `
      <h2 style="color: #5e6ad2; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 500; margin: 32px 0 12px 0; padding-bottom: 8px; border-bottom: 1px solid #23252a;">${text}</h2>`;
    const block = (title: string, content: string) => `
      <div style="margin-top: 16px; padding: 16px; background: #141516; border-left: 3px solid #5e6ad2; border-radius: 4px;">
        <p style="color: #8a8f98; font-size: 11px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">${title}</p>
        <p style="margin: 0; line-height: 1.6; color: #f7f8f8; white-space: pre-wrap;">${content}</p>
      </div>`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 680px; margin: 0 auto; background: #0f1011; color: #f7f8f8; padding: 32px; border-radius: 12px; border: 1px solid #23252a;">
        <div style="display: inline-flex; align-items: center; gap: 8px; margin-bottom: 16px;">
          <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #5e6ad2;"></span>
          <span style="color: #5e6ad2; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 500;">Lado N · Discovery</span>
        </div>
        <h1 style="color: #f7f8f8; font-size: 26px; margin: 0 0 4px 0; font-weight: 600; letter-spacing: -0.8px;">Nuevo Brief de Discovery</h1>
        <p style="color: #8a8f98; margin: 0; font-size: 14px;">${body.companyName} · ${body.companyCity ? `${body.companyCity}, ` : ""}${body.companyCountry}</p>

        ${sectionTitle("Empresa & contacto")}
        <table style="width: 100%; border-collapse: collapse;">
          ${row("Empresa", `<strong>${body.companyName}</strong>`)}
          ${row("Ubicación", `${body.companyCity ? `${body.companyCity}, ` : ""}${body.companyCountry}`)}
          ${row("Contacto", `<strong>${body.contactName}</strong>${body.isDecisionMaker ? ' <span style="background:#5e6ad2;color:#fff;padding:2px 6px;border-radius:3px;font-size:10px;font-weight:600;margin-left:6px;">DECISOR</span>' : ""}`)}
          ${row("Puesto", body.contactRole)}
          ${row("Email", `<a href="mailto:${body.contactEmail}" style="color: #828fff;">${body.contactEmail}</a>`)}
          ${row("Teléfono", `<a href="tel:${body.contactPhone}" style="color: #828fff;">${body.contactPhone}</a>`)}
          ${row("E-commerce previo", labelOf(HAS_ECOMMERCE, body.hasExistingEcommerce))}
          ${body.existingPlatformNotes ? row("Detalle e-commerce actual", body.existingPlatformNotes) : ""}
          ${row("Modelo de negocio", labelsOf(BUSINESS_TYPES, body.businessTypes))}
          ${row("Presupuesto", `<strong style="color: #828fff;">${labelOf(BUDGET_OPTIONS, body.projectBudget)}</strong>`)}
        </table>

        ${sectionTitle("Proyecto")}
        <table style="width: 100%; border-collapse: collapse;">
          ${row("Timeline lanzamiento", labelOf(LAUNCH_TIMELINE, body.launchTimeline))}
          ${row("Deadline propuesta", `<strong style="color: #828fff;">${body.proposalDeadline}</strong>`)}
          ${row("SKUs", labelOf(SKU_RANGES, body.skuRange))}
          ${row("Mercados", labelsOf(MARKETS, body.markets))}
          ${row("Idiomas", labelsOf(LANGUAGES, body.languages))}
          ${row("Monedas", labelsOf(CURRENCIES, body.currencies))}
          ${row("KPI primario", labelOf(KPI_PRIMARY, body.primaryKpi))}
          ${row("Volumen transacciones", labelOf(TRANSACTION_VOLUMES, body.transactionVolume))}
        </table>
        ${body.buyerPersona ? block("Buyer persona", body.buyerPersona) : ""}

        ${sectionTitle("Stack & features")}
        <table style="width: 100%; border-collapse: collapse;">
          ${row("Plataforma preferida", labelOf(PLATFORMS, body.preferredPlatform))}
          ${row("Features MVP", labelsOf(FEATURES, body.features))}
          ${row("Métodos de pago", labelsOf(PAYMENT_METHODS, body.paymentMethods))}
          ${row("Facturación electrónica", labelOf(INVOICING_OPTIONS, body.invoicing))}
          ${row("Integraciones existentes", labelsOf(EXISTING_INTEGRATIONS, body.existingIntegrations))}
          ${row("Canales de soporte", labelsOf(SUPPORT_CHANNELS, body.supportChannels))}
        </table>

        ${sectionTitle("Marca & evaluación")}
        <table style="width: 100%; border-collapse: collapse;">
          ${row("Manual de marca", labelOf(BRAND_GUIDE_OPTIONS, body.hasBrandGuide))}
          ${row("Tono de voz", labelsOf(BRAND_VOICE, body.brandVoice))}
          ${row("Criterios (#1 = más importante)", criteriaRanked)}
        </table>

        ${block("Cosas que TIENEN que salir bien", body.mustSucceed)}
        ${body.extraNotes ? block("Notas adicionales", body.extraNotes) : ""}

        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #23252a; text-align: center;">
          <p style="color: #62666d; font-size: 11px; margin: 0;">
            Brief ID: <code style="background: #141516; padding: 2px 6px; border-radius: 3px; color: #828fff;">${id}</code>
          </p>
          <p style="color: #62666d; font-size: 11px; margin: 8px 0 0 0;">
            Recibido el ${new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" })}
          </p>
        </div>
      </div>
    `;

    const fromAddress =
      process.env.RESEND_FROM ?? "Lado N <onboarding@resend.dev>";

    const { error: sendError } = await resend.emails.send({
      from: fromAddress,
      to: ["tu-cuenta@tu-dominio.com"],
      replyTo: body.contactEmail,
      subject: `Brief Discovery — ${body.companyName} · ${labelOf(BUDGET_OPTIONS, body.projectBudget)} · ${body.proposalDeadline}`,
      html,
    });

    if (sendError) {
      console.error("[submit] Resend error:", sendError);
      return NextResponse.json(
        { error: `Error enviando el correo: ${sendError.message ?? sendError}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    console.error("[submit] error:", err);
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
