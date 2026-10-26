"use client";

import { Icon } from "@/components/Icon";
import { DEADLINE_LABEL, REFERRALS_FOR_LIFETIME, offerStillOpen } from "@/lib/premium";

// Shared between the signup screen, the Réglages card and the paywall, so the three can never drift
// apart on the one thing they all have to explain: how you actually get lifetime access.

const STEPS = [
  "Partage ton lien",
  `${REFERRALS_FOR_LIFETIME} personnes créent leur compte`,
  "Accès gratuit à vie",
];

/** The path to lifetime, spelled out — "invite 2 personnes" hides three separate things. */
export function LifetimeSteps({ tone = "light" }: { tone?: "light" | "dark" }) {
  const num = tone === "dark" ? "bg-white/25 text-white" : "bg-[var(--primary-soft)] text-[var(--primary)]";
  const txt = tone === "dark" ? "text-white/90" : "text-stone-700";
  return (
    <ol className="mt-3 flex flex-col gap-2 text-left">
      {STEPS.map((label, i) => (
        <li key={label} className="flex items-center gap-2.5">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${num}`}
            aria-hidden
          >
            {i + 1}
          </span>
          <span className={`text-sm font-bold ${txt}`}>{label}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * The code, spelled out next to the share button. The link only works for someone who can tap it —
 * over the phone, or once the app is installed from the App Store, the code IS the referral.
 */
export function ReferralCodeBadge({ code, tone = "light" }: { code: string; tone?: "light" | "dark" }) {
  const label = tone === "dark" ? "text-white/75" : "text-stone-500";
  const box = tone === "dark" ? "bg-white/20 text-white" : "bg-[var(--primary-soft)] text-[var(--primary)]";
  return (
    <div className="mt-2.5 flex flex-col items-center gap-1">
      <span className={`text-xs font-bold ${label}`}>ou donne ce code&nbsp;:</span>
      <span className={`rounded-xl px-3 py-1.5 font-mono text-lg font-extrabold tracking-[0.2em] ${box}`}>
        {code}
      </span>
    </div>
  );
}

/** The urgency line. Two colours on purpose: the claim shouts, the date states a fact. */
export function OfferDeadline({ className = "" }: { className?: string }) {
  if (!offerStillOpen()) return null;
  return (
    <p className={`text-xs font-extrabold uppercase tracking-wide ${className}`}>
      <span className="text-[var(--primary)]">Offre limitée&nbsp;!</span>
      {" "}
      <span className="text-stone-900">{`jusqu'au ${DEADLINE_LABEL}`}</span>
    </p>
  );
}

/** One silhouette per person to bring in; it fills orange as they sign up. */
export function ReferralProgress({ done }: { done: number }) {
  const filled = Math.min(REFERRALS_FOR_LIFETIME, Math.max(0, done));
  return (
    <div
      className="mt-3 flex items-center justify-center gap-2"
      aria-label={`${filled} sur ${REFERRALS_FOR_LIFETIME} personnes inscrites`}
    >
      {Array.from({ length: REFERRALS_FOR_LIFETIME }, (_, i) => (
        <span key={i} className={i < filled ? "text-[var(--primary)]" : "text-stone-300"} aria-hidden>
          <Icon name="user" size={22} strokeWidth={2.4} />
        </span>
      ))}
      <span className="ml-1 text-xs font-extrabold text-stone-400">
        {`${filled}/${REFERRALS_FOR_LIFETIME}`}
      </span>
    </div>
  );
}
