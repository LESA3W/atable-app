"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useFamily } from "@/components/ProfileProvider";
import { haptic } from "@/lib/native";
import { shareReferral } from "@/lib/referral";
import { LifetimeSteps, OfferDeadline, ReferralProgress } from "@/components/ReferralBits";
import { REFERRALS_FOR_LIFETIME, isPremium, referralsLeft } from "@/lib/premium";

/** True while this account may use the premium surfaces (trial running, or lifetime earned). */
export function usePremium(): boolean {
  const { me } = useFamily();
  return isPremium(me);
}

// The offer itself — 🧡 + how lifetime is earned + the share button. Shared by every premium
// surface so they can never tell a different story: the blur wrapper, the cook dialog, the courses
// overlay. `big` gives it a touch more room where it stands alone (courses).
function PremiumOfferCard({ feature, big = false }: { feature: string; big?: boolean }) {
  const { me } = useFamily();
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const done = REFERRALS_FOR_LIFETIME - referralsLeft(me);
  const reduce = useReducedMotion();

  async function onShare() {
    if (!me.referralCode) return;
    void haptic("medium");
    setState("copied"); // optimistic: shareReferral copies BEFORE it opens the sheet
    const r = await shareReferral(me.referralCode);
    if (r === "failed") setState("failed");
    else void haptic("success");
  }

  return (
    <>
      <span className={big ? "text-5xl" : "text-4xl"} aria-hidden>🧡</span>
      <h2 className={`mt-2 font-extrabold text-stone-900 ${big ? "text-2xl" : "text-xl"}`}>
        Garde ton premium <span className="text-[var(--primary)]">à vie</span>
      </h2>
      <p className="mt-1.5 text-sm font-semibold text-stone-600">
        {`${feature} demande un abonnement premium. Ton essai est terminé `}☹️
      </p>

      <LifetimeSteps />
      <ReferralProgress done={done} />

      <motion.div
        className="mt-3.5"
        animate={reduce || state !== "idle" ? {} : { scale: [1, 1.03, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      >
        <button
          type="button"
          onClick={onShare}
          disabled={!me.referralCode}
          className="btn-3d btn-primary w-full py-3.5 text-base font-extrabold disabled:opacity-50"
        >
          {state === "copied" ? "Lien copié ✓" : "Partager mon lien"}
        </button>
      </motion.div>
      {state === "failed" && <p className="mt-2 text-xs font-semibold text-red-600">Le partage a échoué, réessaie.</p>}

      <OfferDeadline className="mt-2.5" />
    </>
  );
}

const CARD_SPRING = { type: "spring" as const, stiffness: 260, damping: 20 };

/**
 * Blur-wrapper: the real screen stays ON SCREEN but blurred (you see what you're missing) with the
 * offer centered over it. Used where blurring the whole surface is fine (the recipe sheet).
 */
export function PremiumGate({ feature, children }: { feature: string; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  if (usePremium()) return <>{children}</>;

  return (
    <div className="relative min-h-0 flex-1">
      <div className="pointer-events-none select-none blur-[7px] saturate-[0.85]" aria-hidden style={{ opacity: 0.55 }}>
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex items-center justify-center px-5">
        <motion.div
          className="clay-card w-full max-w-sm border-2 border-stone-100 p-6 text-center"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 22, scale: 0.94 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          transition={reduce ? { duration: 0.25 } : CARD_SPRING}
        >
          <PremiumOfferCard feature={feature} />
        </motion.div>
      </div>
    </div>
  );
}

/**
 * Fixed, viewport-centered offer. The page behind is blurred by the caller (only the parts worth
 * paywalling), and this stays dead-centre no matter how tall that content grows once it loads —
 * that's why it's `fixed`, not absolute. The backdrop is click-through (pointer-events-none) so you
 * can still SCROLL the blurred list under it and tap the back button; only the card itself catches
 * taps. Scroll is deliberately NOT locked.
 */
export function PremiumOverlay({ feature }: { feature: string }) {
  const reduce = useReducedMotion();
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center px-6">
      <motion.div
        className="pointer-events-auto clay-card w-full max-w-sm border-2 border-stone-100 p-7 text-center shadow-[0_24px_60px_rgba(43,42,40,0.28)]"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 22, scale: 0.94 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        transition={reduce ? { duration: 0.25 } : CARD_SPRING}
      >
        <PremiumOfferCard feature={feature} big />
      </motion.div>
    </div>
  );
}

/**
 * Inline variant for a single control (the "Démarrer la cuisine" button): no blur, just an intercept
 * that opens the same offer as a dialog. Used where blurring the whole screen would be overkill.
 */
export function PremiumLockDialog({ feature, onClose }: { feature: string; onClose: () => void }) {
  const reduce = useReducedMotion();
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-6" onClick={onClose}>
      <motion.div
        className="w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-[0_20px_50px_rgba(43,42,40,0.28)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.94 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        transition={reduce ? { duration: 0.25 } : CARD_SPRING}
      >
        <PremiumOfferCard feature={feature} />
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-full px-4 py-2.5 text-sm font-bold text-stone-500"
        >
          Plus tard
        </button>
      </motion.div>
    </div>
  );
}
