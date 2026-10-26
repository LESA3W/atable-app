"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useFamily } from "@/components/ProfileProvider";
import { Icon } from "@/components/Icon";
import { LifetimeSteps, OfferDeadline, ReferralCodeBadge, ReferralProgress } from "@/components/ReferralBits";
import { haptic } from "@/lib/native";
import { shareReferral } from "@/lib/referral";
import {
  DEADLINE_LABEL,
  REFERRALS_FOR_LIFETIME,
  isPremium,
  offerStillOpen,
  trialDaysLeft,
} from "@/lib/premium";

// Where the account stands (trial / lifetime / lapsed) and the one control that changes it. Lives in
// Réglages so the share link is always one tap away, not only on the screen you see once at signup.
export function ReferralCard() {
  const { me } = useFamily();
  const reduce = useReducedMotion();
  const [state, setState] = useState<"idle" | "shared" | "copied" | "failed">("idle");

  const lifetime = !!me.lifetimeFree;
  const days = trialDaysLeft(me);
  const done = Math.min(REFERRALS_FOR_LIFETIME, me.referralCount ?? 0);
  const active = isPremium(me);

  async function onShare() {
    if (!me.referralCode) return;
    void haptic("medium");
    setState("copied"); // optimistic: shareReferral copies BEFORE it opens the sheet
    const r = await shareReferral(me.referralCode);
    if (r === "failed") setState("failed");
    else void haptic("success");
  }

  // Already premium for good. The offer stops — steps, progress and deadline are meaningless to
  // someone who has already earned it — but the SHARING does not: they still have a code, and taking
  // it away would quietly remove the app's best advocates from the loop.
  if (lifetime) {
    return (
      <section className="clay-card flex flex-col gap-3 border-2 border-[var(--primary)]/25 bg-[var(--primary-soft)] p-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden>🏆</span>
          <div className="min-w-0 flex-1 text-left">
            <p className="font-extrabold text-stone-900">Abonnement premium</p>
            <p className="text-sm font-semibold text-stone-600">Tu y as accès à vie. Rien à payer, jamais.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onShare}
          disabled={!me.referralCode}
          className="btn-3d btn-primary flex w-full items-center justify-center gap-2 py-3.5 text-base font-extrabold disabled:opacity-50"
        >
          <Icon name="user-plus" size={18} strokeWidth={2.6} />
          {state === "copied" ? "Lien copié ✓" : "Faire découvrir À table"}
        </button>
        {me.referralCode && <ReferralCodeBadge code={me.referralCode} />}
      </section>
    );
  }

  return (
    <section className="clay-card flex flex-col gap-3 border-2 border-stone-100 p-4">
      <div className="flex items-center gap-2.5">
        <span className="text-2xl" aria-hidden>{active ? "⏳" : "🔒"}</span>
        <div className="min-w-0 flex-1">
          {active ? (
            <>
              <p className="font-extrabold text-stone-900">{`Il te reste ${days} jour${days > 1 ? "s" : ""}`}</p>
              <p className="text-sm font-semibold text-stone-500">Abonnement premium — tout en accès libre.</p>
            </>
          ) : (
            <p className="font-extrabold text-stone-900">Ton abonnement premium a expiré ☹️</p>
          )}
        </div>
      </div>

      {!lifetime && (
        <>
          {/* Same wording and same steps as the signup screen — one offer, told one way. */}
          <div className="rounded-2xl bg-[var(--primary-soft)] px-3.5 py-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden>🧡</span>
              <p className="text-base font-extrabold leading-tight text-stone-900">
                Garde ton premium <span className="text-[var(--primary)]">à vie</span>
              </p>
            </div>
            <LifetimeSteps />
            <ReferralProgress done={done} />
            <OfferDeadline className="mt-2.5 text-center" />
          </div>

          <motion.div
            animate={reduce || state !== "idle" ? {} : { scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          >
            <button
              type="button"
              onClick={onShare}
              disabled={!me.referralCode}
              className="btn-3d btn-primary flex w-full items-center justify-center gap-2 py-3.5 text-base font-extrabold disabled:opacity-50"
            >
              <Icon name="user-plus" size={18} strokeWidth={2.6} />
              {state === "copied" ? "Lien copié ✓" : "Partager mon lien"}
            </button>
          </motion.div>

          {me.referralCode && <ReferralCodeBadge code={me.referralCode} />}
        </>
      )}
    </section>
  );
}
