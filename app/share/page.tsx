"use client";

function Step({ n, text }: { n: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[var(--primary-soft)] px-4 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-base font-extrabold text-white">
        {n}
      </span>
      <span className="font-bold text-foreground">{text}</span>
    </div>
  );
}

export default function SharePage() {
  return (
    <div className="flex w-full flex-col items-center gap-4 print:gap-0 print:p-0">
      <button
        type="button"
        onClick={() => window.print()}
        className="btn-3d btn-primary px-6 py-3 text-base print:hidden"
      >
        🖨️ Imprimer en A4
      </button>
      <p className="max-w-sm text-center text-sm text-muted print:hidden">
        À coller dans la cuisine. Imprime en A4 vertical&nbsp;: la famille scanne pour régler ses
        goûts et voir quoi manger.
      </p>

      {/* The printable A4 poster */}
      <article className="w-full max-w-[520px] overflow-hidden rounded-[28px] border-4 border-[var(--card-border)] bg-white px-8 py-10 text-center shadow-[var(--shadow-card)] print:max-w-none print:rounded-none print:border-0 print:px-6 print:py-4 print:shadow-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="mx-auto h-44 w-44 object-contain" />
        <h1 className="mt-2 text-5xl font-extrabold tracking-tight text-foreground">À table !</h1>
        <p className="mt-2 text-lg font-semibold text-muted">
          Les repas de la famille, sans prise de tête.
        </p>

        <div className="mx-auto mt-6 flex max-w-sm flex-col gap-2 text-left">
          <Step n="1" text="Scanne le QR avec ton téléphone" />
          <Step n="2" text="Dis ce que tu aimes (ou pas)" />
          <Step n="3" text="On sait quoi cuisiner pour tout le monde" />
        </div>

        <div className="mx-auto mt-7 w-fit rounded-3xl border-4 border-[var(--primary)] bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/share-qr.jpg"
            alt="QR code vers l'application À table"
            className="h-60 w-60"
          />
        </div>
        <p className="mt-4 text-2xl font-extrabold text-[var(--primary)]">a-taaaable.vercel.app</p>
        <p className="mt-1 text-sm font-semibold text-muted">
          Scanne avec l&apos;appareil photo, ou tape le lien.
        </p>
      </article>
    </div>
  );
}
