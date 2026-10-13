import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function GraciasPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; company?: string }>;
}) {
  const { id, company } = await searchParams;

  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-2xl px-5 sm:px-8 py-20 sm:py-28">
        <div className="inline-flex items-center gap-2 mb-6">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="text-[13px] tracking-[0.4px] font-medium text-primary uppercase">
            Lado N · Discovery
          </span>
        </div>

        <h1
          className="text-5xl sm:text-6xl font-semibold leading-[1.05] mb-6 text-ink"
          style={{ letterSpacing: "-2px" }}
        >
          Brief recibido.
          <span className="block text-primary">Gracias.</span>
        </h1>

        <p className="text-lg text-ink-muted leading-relaxed mb-8 max-w-xl">
          {company ? (
            <>
              Tu brief de <strong className="text-ink">{company}</strong> llegó
              a <usuaria>. Te respondemos en las próximas <strong className="text-ink">48 horas hábiles</strong>{" "}
              con preguntas de seguimiento o una propuesta inicial.
            </>
          ) : (
            <>
              Tu brief llegó a <usuaria>. Te respondemos en las próximas{" "}
              <strong className="text-ink">48 horas hábiles</strong> con
              preguntas de seguimiento o una propuesta inicial.
            </>
          )}
        </p>

        <div className="rounded-lg border border-hairline bg-surface-1 panel-lift p-6 mb-8">
          <div className="text-[11px] uppercase tracking-[0.4px] font-mono font-medium text-primary mb-2">
            Brief ID
          </div>
          <div className="font-mono text-sm text-ink-muted">
            {id ?? "—"}
          </div>
          <p className="text-xs text-ink-subtle mt-4 leading-relaxed">
            Guarda este ID si necesitas hacer referencia al brief en una
            comunicación posterior.
          </p>
        </div>

        <Link
          href="/"
          className="inline-block text-sm text-primary hover:text-primary-hover underline underline-offset-4"
        >
          ← Volver al inicio
        </Link>
      </div>
    </main>
  );
}
