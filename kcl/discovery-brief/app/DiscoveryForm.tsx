"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BRAND_GUIDE_OPTIONS,
  BRAND_VOICE,
  BUDGET_OPTIONS,
  BUSINESS_TYPES,
  CRITERIA_LABELS,
  CURRENCIES,
  CriterionKey,
  EXISTING_INTEGRATIONS,
  FEATURES,
  FREE_EMAIL_PROVIDERS,
  FormState,
  HAS_ECOMMERCE,
  INITIAL_FORM,
  INVOICING_OPTIONS,
  KPI_PRIMARY,
  LANGUAGES,
  LAUNCH_TIMELINE,
  MARKETS,
  Option,
  PAYMENT_METHODS,
  PLATFORMS,
  SKU_RANGES,
  STEPS,
  SUPPORT_CHANNELS,
  TRANSACTION_VOLUMES,
  labelOf,
  labelsOf,
} from "./questions";
type Status = "idle" | "submitting" | "done";

export default function DiscoveryForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const toggleArr = (
    k:
      | "businessTypes"
      | "markets"
      | "languages"
      | "currencies"
      | "features"
      | "paymentMethods"
      | "existingIntegrations"
      | "supportChannels"
      | "brandVoice",
    value: string
  ) => {
    const current = form[k] as string[];
    const next = current.includes(value)
      ? current.filter((x) => x !== value)
      : [...current, value];
    set(k, next as any);
  };

  const moveCriterion = (from: number, to: number) => {
    const arr = [...form.evaluationCriteria];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    set("evaluationCriteria", arr);
  };

  const validateStep = (s: number): string | null => {
    if (s === 1) {
      if (!form.companyName || form.companyName.trim().length < 2)
        return "Nombre de la empresa";
      if (!form.companyCountry) return "País";
      if (!form.contactName || form.contactName.trim().length < 2)
        return "Nombre del contacto";
      if (!form.contactEmail) return "Email";
      const emailRe = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
      if (!emailRe.test(form.contactEmail)) return "Email válido";
      const domain = form.contactEmail.toLowerCase().split("@")[1];
      if (FREE_EMAIL_PROVIDERS.includes(domain))
        return "Usa tu correo corporativo (no gmail/hotmail/yahoo)";
      if (!form.contactRole) return "Puesto / Rol";
      if (!form.contactPhone) return "Teléfono";
      const phone = form.contactPhone.replace(/[\s\-\(\)\.]/g, "");
      if (!/^\+?\d{8,15}$/.test(phone)) return "Teléfono válido";
      if (!form.hasExistingEcommerce) return "¿Existe un e-commerce previo?";
      if (form.businessTypes.length === 0) return "Modelo de negocio";
      if (!form.projectBudget) return "Presupuesto del proyecto";
    }
    if (s === 2) {
      if (!form.launchTimeline) return "Timeline de lanzamiento";
      if (!form.proposalDeadline) return "Fecha límite para la propuesta";
      if (!form.skuRange) return "Cantidad de SKUs";
      if (form.markets.length === 0) return "Mercados objetivo";
      if (form.languages.length === 0) return "Idiomas";
      if (form.currencies.length === 0) return "Monedas";
      if (!form.primaryKpi) return "KPI primario";
      if (!form.transactionVolume) return "Volumen de transacciones";
    }
    if (s === 3) {
      if (!form.preferredPlatform) return "Plataforma preferida";
      if (form.features.length === 0) return "Features prioritarios";
      if (form.paymentMethods.length === 0) return "Métodos de pago";
      if (!form.invoicing) return "Facturación electrónica";
      if (form.supportChannels.length === 0) return "Canales de soporte";
    }
    if (s === 4) {
      if (!form.hasBrandGuide) return "Manual de marca";
      if (form.brandVoice.length === 0) return "Tono de voz";
      if (!form.mustSucceed || form.mustSucceed.trim().length < 30)
        return "3 cosas que tienen que salir bien (mín. 30 caracteres)";
    }
    return null;
  };

  const nextStep = () => {
    const err = validateStep(step);
    if (err) {
      setError(err);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const prevStep = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 1));
  };

  const submit = async () => {
    setStatus("submitting");
    setError(null);

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo enviar el brief");

      const qs = new URLSearchParams({
        id: data.id ?? "",
        company: form.companyName,
      });
      router.push(`/gracias?${qs.toString()}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setError(msg);
      setStatus("idle");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-10">
      {/* Hero — sits on canvas, no card frame. Lavender accent on title per Linear spec */}
      <header className="pb-2">
        <div className="inline-flex items-center gap-2 mb-6">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="text-[13px] tracking-[0.4px] font-medium text-primary uppercase">
            Lado N · Discovery
          </span>
        </div>
        <h1 className="text-5xl sm:text-6xl md:text-[72px] font-semibold leading-[1.05] mb-5 text-ink" style={{ letterSpacing: "-2.2px" }}>
          Brief de Discovery
          <span className="block text-primary">E-commerce</span>
        </h1>
        <p className="text-lg text-ink-muted max-w-2xl leading-relaxed tracking-body-lg">
          Cuéntanos sobre tu negocio y proyecto. Este brief toma ~10 min
          y nos permite preparar una propuesta certera. Al enviar, generamos
          un PDF con todas tus respuestas.
        </p>
      </header>

      {/* Step indicator card — surface-1 lift with hairline border + top edge */}
      <div className="rounded-lg border border-hairline bg-surface-1 panel-lift p-4">
        <div className="flex gap-2">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const active = n <= step;
            const current = n === step;
            return (
              <div key={label} className="flex-1">
                <div
                  className={`h-0.5 rounded-full transition-all ${
                    current
                      ? "bg-primary"
                      : active
                      ? "bg-primary/50"
                      : "bg-hairline-strong"
                  }`}
                />
                <div
                  className={`text-[11px] mt-2 uppercase tracking-[0.4px] font-medium ${
                    current
                      ? "text-ink"
                      : active
                      ? "text-ink-muted"
                      : "text-ink-tertiary"
                  }`}
                >
                  <span className="font-mono text-[10px] mr-1.5 opacity-60">
                    0{n}
                  </span>
                  {label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <strong className="text-red-300">Campo requerido:</strong> {error}
        </div>
      )}

      {/* STEP 1 — Empresa */}
      {step === 1 && (
        <Section title="Sobre tu empresa">
          <Field label="Nombre de la empresa">
            <input
              value={form.companyName}
              onChange={(e) => set("companyName", e.target.value)}
            />
          </Field>
          <Grid2>
            <Field label="País">
              <input
                value={form.companyCountry}
                onChange={(e) => set("companyCountry", e.target.value)}
              />
            </Field>
            <Field label="Ciudad">
              <input
                value={form.companyCity}
                onChange={(e) => set("companyCity", e.target.value)}
              />
            </Field>
          </Grid2>
          <Divider />
          <Grid2>
            <Field label="Nombre completo del contacto">
              <input
                value={form.contactName}
                onChange={(e) => set("contactName", e.target.value)}
              />
            </Field>
            <Field label="Email corporativo (sin gmail/hotmail/yahoo)">
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => set("contactEmail", e.target.value)}
              />
            </Field>
            <Field label="Puesto / Rol">
              <input
                value={form.contactRole}
                onChange={(e) => set("contactRole", e.target.value)}
              />
            </Field>
            <Field label="Teléfono">
              <input
                value={form.contactPhone}
                onChange={(e) => set("contactPhone", e.target.value)}
              />
            </Field>
          </Grid2>
          <label className="flex items-center gap-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.isDecisionMaker}
              onChange={(e) => set("isDecisionMaker", e.target.checked)}
            />
            Soy tomador de decisión
          </label>

          <Divider />
          <Field label="¿Existe un e-commerce previo?">
            <Select
              value={form.hasExistingEcommerce}
              onChange={(v) => set("hasExistingEcommerce", v)}
              options={HAS_ECOMMERCE}
            />
          </Field>
          {form.hasExistingEcommerce && form.hasExistingEcommerce !== "no" && (
            <Field label="Cuéntanos brevemente qué funciona y qué no del e-commerce actual">
              <textarea
                value={form.existingPlatformNotes}
                onChange={(e) => set("existingPlatformNotes", e.target.value)}
              />
            </Field>
          )}

          <Field label="Modelo de negocio del e-commerce (puedes elegir más de uno)">
            <ToggleGrid
              options={BUSINESS_TYPES}
              selected={form.businessTypes}
              onToggle={(v) => toggleArr("businessTypes", v)}
            />
          </Field>

          <Field label="Presupuesto estimado del proyecto (desarrollo)">
            <Select
              value={form.projectBudget}
              onChange={(v) => set("projectBudget", v)}
              options={BUDGET_OPTIONS}
            />
          </Field>
        </Section>
      )}

      {/* STEP 2 — Proyecto */}
      {step === 2 && (
        <Section title="Sobre el proyecto">
          <Grid2>
            <Field label="Timeline objetivo de lanzamiento">
              <Select
                value={form.launchTimeline}
                onChange={(v) => set("launchTimeline", v)}
                options={LAUNCH_TIMELINE}
              />
            </Field>
            <Field label="Fecha límite para recibir propuesta">
              <input
                type="date"
                value={form.proposalDeadline}
                onChange={(e) => set("proposalDeadline", e.target.value)}
              />
            </Field>
          </Grid2>

          <Field label="Cantidad de SKUs / productos al lanzamiento">
            <Select
              value={form.skuRange}
              onChange={(v) => set("skuRange", v)}
              options={SKU_RANGES}
            />
          </Field>

          <Field label="Mercados objetivo">
            <ToggleGrid
              options={MARKETS}
              selected={form.markets}
              onToggle={(v) => toggleArr("markets", v)}
            />
          </Field>

          <Grid2>
            <Field label="Idiomas requeridos">
              <ToggleGrid
                options={LANGUAGES}
                selected={form.languages}
                onToggle={(v) => toggleArr("languages", v)}
              />
            </Field>
            <Field label="Monedas requeridas">
              <ToggleGrid
                options={CURRENCIES}
                selected={form.currencies}
                onToggle={(v) => toggleArr("currencies", v)}
              />
            </Field>
          </Grid2>

          <Grid2>
            <Field label="KPI primario de éxito">
              <Select
                value={form.primaryKpi}
                onChange={(v) => set("primaryKpi", v)}
                options={KPI_PRIMARY}
              />
            </Field>
            <Field label="Volumen estimado de transacciones">
              <Select
                value={form.transactionVolume}
                onChange={(v) => set("transactionVolume", v)}
                options={TRANSACTION_VOLUMES}
              />
            </Field>
          </Grid2>

          <Field label="Buyer persona principal (opcional)">
            <textarea
              value={form.buyerPersona}
              onChange={(e) => set("buyerPersona", e.target.value)}
              placeholder="Quién, edad, contexto, dolor que resolvemos…"
            />
          </Field>
        </Section>
      )}

      {/* STEP 3 — Stack & Features */}
      {step === 3 && (
        <Section title="Stack y features">
          <Field label="Plataforma preferida">
            <Select
              value={form.preferredPlatform}
              onChange={(v) => set("preferredPlatform", v)}
              options={PLATFORMS}
            />
          </Field>

          <Field label="Features prioritarios para el MVP">
            <p className="text-xs text-ink/55 mb-2">
              Marca todo lo que necesitas en el lanzamiento. El resto queda para
              Fase 2.
            </p>
            <ToggleGrid
              options={FEATURES}
              selected={form.features}
              onToggle={(v) => toggleArr("features", v)}
            />
          </Field>

          <Field label="Métodos de pago requeridos">
            <ToggleGrid
              options={PAYMENT_METHODS}
              selected={form.paymentMethods}
              onToggle={(v) => toggleArr("paymentMethods", v)}
            />
          </Field>

          <Field label="Facturación electrónica">
            <Select
              value={form.invoicing}
              onChange={(v) => set("invoicing", v)}
              options={INVOICING_OPTIONS}
            />
          </Field>

          <Field label="Integraciones existentes con las que debemos conectar">
            <ToggleGrid
              options={EXISTING_INTEGRATIONS}
              selected={form.existingIntegrations}
              onToggle={(v) => toggleArr("existingIntegrations", v)}
            />
          </Field>

          <Field label="Canales de atención al cliente">
            <ToggleGrid
              options={SUPPORT_CHANNELS}
              selected={form.supportChannels}
              onToggle={(v) => toggleArr("supportChannels", v)}
            />
          </Field>
        </Section>
      )}

      {/* STEP 4 — Marca & evaluación */}
      {step === 4 && (
        <Section title="Marca y evaluación">
          <Field label="¿Tienen manual de marca?">
            <Select
              value={form.hasBrandGuide}
              onChange={(v) => set("hasBrandGuide", v)}
              options={BRAND_GUIDE_OPTIONS}
            />
          </Field>

          <Field label="Tono de voz de la marca">
            <ToggleGrid
              options={BRAND_VOICE}
              selected={form.brandVoice}
              onToggle={(v) => toggleArr("brandVoice", v)}
            />
          </Field>

          <div>
            <div className="text-[13px] tracking-[0.4px] text-ink-muted mb-2 font-medium">
              Criterios para evaluar nuestra propuesta
            </div>
            <p className="text-xs text-ink-subtle mb-3">
              Ordena por importancia. #1 es lo que más te importa.
            </p>
            <CriteriaRanker
              items={form.evaluationCriteria}
              labels={CRITERIA_LABELS}
              onMove={moveCriterion}
            />
          </div>

          <Field label="3 cosas que TIENEN que salir bien">
            <textarea
              value={form.mustSucceed}
              onChange={(e) => set("mustSucceed", e.target.value)}
              placeholder="Sé específico — lanzar en tal fecha, capacidad de carga X, integración con Y…"
            />
            <div className="text-xs text-ink-subtle mt-1.5 font-mono">
              {form.mustSucceed.length}/30 caracteres mínimos
            </div>
          </Field>

          <Field label="Notas adicionales (opcional)">
            <textarea
              value={form.extraNotes}
              onChange={(e) => set("extraNotes", e.target.value)}
            />
          </Field>
        </Section>
      )}

      {/* STEP 5 — Review */}
      {step === 5 && (
        <Section title="Revisa tu brief">
          <ReviewBlock label="Empresa">
            <div>
              <strong>{form.companyName}</strong> · {form.companyCountry}
              {form.companyCity ? `, ${form.companyCity}` : ""}
            </div>
            <div>
              {form.contactName} — {form.contactEmail}
            </div>
            <div className="opacity-70">
              {form.contactRole} · {form.contactPhone}
            </div>
            <div className="mt-1">
              <strong>E-commerce previo:</strong>{" "}
              {labelOf(HAS_ECOMMERCE, form.hasExistingEcommerce)}
            </div>
            <div>
              <strong>Modelo:</strong>{" "}
              {labelsOf(BUSINESS_TYPES, form.businessTypes)}
            </div>
            <div>
              <strong>Presupuesto:</strong>{" "}
              {labelOf(BUDGET_OPTIONS, form.projectBudget)}
            </div>
          </ReviewBlock>

          <ReviewBlock label="Proyecto">
            <div>
              <strong>Timeline:</strong>{" "}
              {labelOf(LAUNCH_TIMELINE, form.launchTimeline)}
            </div>
            <div>
              <strong>Fecha límite propuesta:</strong> {form.proposalDeadline}
            </div>
            <div>
              <strong>SKUs:</strong> {labelOf(SKU_RANGES, form.skuRange)}
            </div>
            <div>
              <strong>Mercados:</strong> {labelsOf(MARKETS, form.markets)}
            </div>
            <div>
              <strong>Idiomas:</strong> {labelsOf(LANGUAGES, form.languages)}
            </div>
            <div>
              <strong>Monedas:</strong> {labelsOf(CURRENCIES, form.currencies)}
            </div>
            <div>
              <strong>KPI:</strong> {labelOf(KPI_PRIMARY, form.primaryKpi)}
            </div>
            <div>
              <strong>Volumen:</strong>{" "}
              {labelOf(TRANSACTION_VOLUMES, form.transactionVolume)}
            </div>
            {form.buyerPersona && (
              <div className="opacity-70 italic mt-1">
                "{form.buyerPersona.slice(0, 140)}
                {form.buyerPersona.length > 140 ? "…" : ""}"
              </div>
            )}
          </ReviewBlock>

          <ReviewBlock label="Stack & features">
            <div>
              <strong>Plataforma:</strong>{" "}
              {labelOf(PLATFORMS, form.preferredPlatform)}
            </div>
            <div>
              <strong>Features MVP:</strong>{" "}
              {labelsOf(FEATURES, form.features)}
            </div>
            <div>
              <strong>Pagos:</strong>{" "}
              {labelsOf(PAYMENT_METHODS, form.paymentMethods)}
            </div>
            <div>
              <strong>Facturación:</strong>{" "}
              {labelOf(INVOICING_OPTIONS, form.invoicing)}
            </div>
            <div>
              <strong>Integraciones:</strong>{" "}
              {labelsOf(EXISTING_INTEGRATIONS, form.existingIntegrations)}
            </div>
            <div>
              <strong>Soporte:</strong>{" "}
              {labelsOf(SUPPORT_CHANNELS, form.supportChannels)}
            </div>
          </ReviewBlock>

          <ReviewBlock label="Marca & evaluación">
            <div>
              <strong>Manual de marca:</strong>{" "}
              {labelOf(BRAND_GUIDE_OPTIONS, form.hasBrandGuide)}
            </div>
            <div>
              <strong>Tono:</strong> {labelsOf(BRAND_VOICE, form.brandVoice)}
            </div>
            <div>
              <strong>Criterios:</strong>{" "}
              {form.evaluationCriteria
                .map((k, i) => `${i + 1}. ${CRITERIA_LABELS[k]}`)
                .join(" · ")}
            </div>
            <div className="mt-2">
              <strong>Must succeed:</strong>{" "}
              <span className="opacity-80">{form.mustSucceed}</span>
            </div>
            {form.extraNotes && (
              <div className="opacity-70 mt-1">{form.extraNotes}</div>
            )}
          </ReviewBlock>

        </Section>
      )}

      {/* Nav */}
      <div className="flex justify-between items-center pt-6">
        <button
          type="button"
          onClick={prevStep}
          disabled={step === 1 || status === "submitting"}
          className="rounded-md border border-hairline bg-surface-1 px-4 py-2 text-sm font-medium text-ink hover:bg-surface-2 hover:border-hairline-strong disabled:opacity-30 disabled:hover:bg-surface-1 transition"
        >
          ← Anterior
        </button>
        {step < STEPS.length ? (
          <button
            type="button"
            onClick={nextStep}
            className="rounded-md bg-primary text-white px-5 py-2 text-sm font-medium hover:bg-primary-hover transition"
          >
            Siguiente →
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={status === "submitting"}
            className="rounded-md bg-primary text-white px-5 py-2 text-sm font-medium hover:bg-primary-hover transition disabled:opacity-50"
          >
            {status === "submitting" ? "Enviando…" : "Enviar brief →"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Sub-componentes ───────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-hairline bg-surface-1 panel-lift p-6 sm:p-8 space-y-6">
      <div className="flex items-center gap-2 pb-2 border-b border-hairline">
        <span className="inline-block w-1 h-1 rounded-full bg-primary" />
        <h2 className="text-[13px] uppercase tracking-[0.4px] font-medium text-ink-muted">
          {title}
        </h2>
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-[13px] tracking-[0.4px] text-ink-muted mb-2 font-medium">
        {label}
      </div>
      {children}
    </label>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
}

function Divider() {
  return <hr className="border-hairline" />;
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">—</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ToggleGrid({
  options,
  selected,
  onToggle,
}: {
  options: Option[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {options.map((o) => {
        const active = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onToggle(o.value)}
            className={`text-left text-sm px-3.5 py-2.5 rounded-md border transition ${
              active
                ? "bg-primary/15 border-primary/60 text-ink font-medium"
                : "bg-surface-2 border-hairline text-ink-muted hover:border-hairline-strong hover:bg-surface-3 hover:text-ink"
            }`}
          >
            {active && (
              <span className="text-primary mr-1.5">✓</span>
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function CriteriaRanker({
  items,
  labels,
  onMove,
}: {
  items: CriterionKey[];
  labels: Record<CriterionKey, string>;
  onMove: (from: number, to: number) => void;
}) {
  return (
    <div className="space-y-2">
      {items.map((key, i) => (
        <div
          key={key}
          className="flex items-center gap-3 px-3.5 py-3 rounded-md border border-hairline bg-surface-2"
        >
          <span className="text-base font-semibold font-mono w-6 text-center text-primary">
            {i + 1}
          </span>
          <span className="flex-1 text-sm text-ink">{labels[key]}</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => i > 0 && onMove(i, i - 1)}
              disabled={i === 0}
              className="px-2 py-1 text-xs rounded text-ink-subtle hover:text-ink hover:bg-surface-3 disabled:opacity-20 disabled:hover:bg-transparent"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() =>
                i < items.length - 1 && onMove(i, i + 1)
              }
              disabled={i === items.length - 1}
              className="px-2 py-1 text-xs rounded text-ink-subtle hover:text-ink hover:bg-surface-3 disabled:opacity-20 disabled:hover:bg-transparent"
            >
              ↓
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReviewBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-hairline bg-surface-2 panel-lift p-5">
      <div className="text-[11px] uppercase tracking-[0.4px] font-mono font-medium text-primary mb-3">
        {label}
      </div>
      <div className="text-sm space-y-1.5 text-ink-muted leading-relaxed">
        {children}
      </div>
    </div>
  );
}
