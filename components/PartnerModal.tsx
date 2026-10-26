"use client";

import { useState } from "react";
import { partnerLinks, type Market } from "@/lib/shopping";

// Partner linking flow, opened after picking a store: accept terms -> sign in / sign up
// on the partner site -> come back -> confirmation. A believable mock (no real API):
// the sign-in/up buttons open the store's site, and the user confirms when done.
export function PartnerModal({
  market,
  onLinked,
  onClose,
}: {
  market: Market;
  onLinked: () => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"terms" | "auth" | "return" | "done">("terms");
  const [mode, setMode] = useState<"in" | "up">("in");
  const links = partnerLinks(market.name);

  function openPartner(m: "in" | "up") {
    setMode(m);
    try {
      window.open(m === "in" ? links.signin : links.signup, "_blank", "noopener,noreferrer");
    } catch {
      // popup blocked; the user can still confirm manually
    }
    setStep("return");
  }

  function finish() {
    setStep("done");
    setTimeout(onLinked, 1300);
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-6" onClick={onClose}>
      <div
        className="modal-in w-full max-w-xs rounded-3xl bg-[var(--background)] p-6 text-center text-stone-800 shadow-[0_20px_50px_rgba(43,42,40,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        {step === "terms" && (
          <div key="terms" className="step-in flex flex-col items-center gap-3">
            <Badge market={market} />
            <h2 className="text-2xl font-extrabold">Rejoins-nous&nbsp;!</h2>
            <p className="text-sm font-semibold leading-snug text-stone-600">
              Clique sur <b>Accepter</b> pour accepter les conditions de {market.name}, accéder à nos recettes
              et laisser À&nbsp;table utiliser le site de {market.name} pour toi.
            </p>
            <a
              href={links.terms}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-bold text-[var(--primary)] underline underline-offset-2"
            >
              conditions d&apos;utilisation
            </a>
            <button type="button" onClick={() => setStep("auth")} className="btn-3d btn-primary mt-2 w-full py-3.5 text-base">
              Accepter
            </button>
            <button type="button" onClick={onClose} className="pt-1 text-base font-bold text-[var(--primary)] transition active:scale-95">
              Refuser
            </button>
          </div>
        )}

        {step === "auth" && (
          <div key="auth" className="step-in flex flex-col items-center gap-3">
            <Badge market={market} />
            <h2 className="text-xl font-extrabold">On te connecte à {market.name}</h2>
            <p className="text-sm font-semibold text-stone-600">
              Tu vas être redirigé vers le site partenaire <b>{market.name}</b>.
            </p>
            <button type="button" onClick={() => openPartner("in")} className="btn-3d btn-primary mt-2 w-full py-3.5 text-base">
              Se connecter
            </button>
            <button type="button" onClick={() => openPartner("up")} className="btn-3d btn-neutral w-full py-3.5 text-base">
              Créer un compte
            </button>
          </div>
        )}

        {step === "return" && (
          <div key="return" className="step-in flex flex-col items-center gap-3">
            <Badge market={market} />
            <h2 className="text-xl font-extrabold">Presque fini&nbsp;!</h2>
            <p className="text-sm font-semibold text-stone-600">
              {mode === "in" ? "Connecte-toi" : "Crée ton compte"} sur {market.name} dans l&apos;onglet ouvert,
              puis reviens ici.
            </p>
            <button type="button" onClick={finish} className="btn-3d btn-primary mt-2 w-full py-3.5 text-base">
              J&apos;ai lié mon compte
            </button>
            <button type="button" onClick={() => setStep("auth")} className="pt-1 text-sm font-bold text-stone-400 underline transition active:scale-95">
              Retour
            </button>
          </div>
        )}

        {step === "done" && (
          <div key="done" className="flex flex-col items-center gap-3 py-3">
            <span className="pop text-5xl" aria-hidden>
              🎉
            </span>
            <h2 className="text-xl font-extrabold">Compte {market.name} lié&nbsp;!</h2>
            <p className="text-sm font-semibold text-stone-600">À&nbsp;table remplira ta liste de courses pour toi.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Badge({ market }: { market: Market }) {
  return (
    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-[var(--shadow-card)]">
      {market.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/markets/${market.logo}`} alt="" className="h-10 w-10 object-contain" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/logo.png" alt="" className="h-12 w-12 object-contain" />
      )}
    </span>
  );
}
