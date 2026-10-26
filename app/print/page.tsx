"use client";

import { useEffect, useState } from "react";

export default function PrintPage() {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  return (
    <div className="flex flex-col items-center gap-5">
      <p className="text-stone-700 print:hidden">
        Imprime cette carte et colle-la dans un endroit incontournable de la cuisine (intérieur
        d&apos;une porte de placard). Maman scanne, et hop&nbsp;!
      </p>

      <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-orange-200 bg-white px-8 py-10 text-center shadow-sm print:border-stone-300 print:shadow-none">
        <div className="text-5xl" aria-hidden>
          🍽️
        </div>
        <h1 className="text-2xl font-extrabold leading-tight">
          Qu&apos;est-ce qu&apos;on mange&nbsp;?
        </h1>
        <p className="max-w-[16rem] text-stone-600">
          Scanne-moi&nbsp;: choisis qui mange, je propose les plats que tout le monde aime.
        </p>
        {origin ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/qr?data=${encodeURIComponent(origin)}`}
            alt="QR code vers l'application"
            width={240}
            height={240}
            className="h-60 w-60"
          />
        ) : (
          <div className="h-60 w-60 animate-pulse rounded-xl bg-stone-100" />
        )}
        <p className="text-sm font-semibold text-stone-400">{origin.replace(/^https?:\/\//, "")}</p>
      </div>

      <button
        type="button"
        onClick={() => window.print()}
        className="btn-3d btn-primary px-6 py-3 text-lg print:hidden"
      >
        🖨️ Imprimer la carte
      </button>
    </div>
  );
}
