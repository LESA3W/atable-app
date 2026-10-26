"use client";

import { useEffect, useState } from "react";
import { finishOAuthPopup } from "@/lib/social";

// Rendered by ProfileProvider when the app loads on an /oauth/* route — i.e. inside the social-login
// popup after the provider redirects back with the token. It finishes the handshake (posts the token
// to the opener window, which then advances the real onboarding) and normally closes itself within a
// second. The "you can close this" fallback covers the rare case where the auto-close is blocked.
export function OAuthPopupFinisher() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    void finishOAuthPopup();
    const t = setTimeout(() => setSlow(true), 3500);
    return () => clearTimeout(t);
  }, []);
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="text-lg font-extrabold text-stone-700">Connexion en cours…</p>
      {/* Neutral, not a success claim: this popup can't know the handshake succeeded (the opener window
          does). Saying "réussie" here would lie when Google returns an error / the token never posts. */}
      {slow && <p className="text-sm font-bold text-stone-400">Tu peux fermer cette fenêtre et revenir à l&apos;application.</p>}
    </main>
  );
}
