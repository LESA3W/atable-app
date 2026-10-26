"use client";

import { useEffect, useRef, useState } from "react";
import { animate, AnimatePresence, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from "motion/react";
import { haptic } from "@/lib/native";
import { DEADLINE_LABEL, TRIAL_DAYS } from "@/lib/premium";
import { shareReferral } from "@/lib/referral";
import { LifetimeSteps, OfferDeadline, ReferralCodeBadge, ReferralProgress } from "@/components/ReferralBits";

// Fullscreen post-signup reward. Orchestrated as ONE staggered load (emil): the mascot springs up and
// keeps celebrating, "Ton compte est créé !" rises in, then a number races upward (faster and faster)
// with intensifying haptics and lands on the new user's founding-member rank — confetti + rings burst,
// then the rank line, the founder badge and the CTA reveal in sequence.
// Haptics are native-only (the Capacitor iOS shell): one tick per +1 of the number, see below.
const CONFETTI = Array.from({ length: 22 }, (_, i) => ({
  angle: (i / 22) * Math.PI * 2 + (i % 2 ? 0.14 : 0),
  dist: 130 + (i % 4) * 34,
  color: ["#ffffff", "#ffe7d5", "#ffd21f", "#ff8a3d", "#c4530f"][i % 5],
  size: i % 3 === 0 ? 12 : 8,
  delay: (i % 6) * 0.03,
}));
const EASE_OUT = [0.23, 1, 0.32, 1] as const; // emil's strong ease-out for entrances
const MIN_TICK_MS = 38; // fastest the Taptic Engine plays distinct taps (~26/s)

export function SignupCelebration({
  rank,
  referralCode,
  onDone,
}: {
  rank: number;
  referralCode?: string | null;
  onDone: () => void | Promise<void>;
}) {
  const reduce = useReducedMotion();
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");
  const [leaving, setLeaving] = useState(false);

  // Hand off to the family gate with a real transition instead of a hard cut. Both screens sit on the
  // SAME orange field, so only the CONTENT moves: it lifts and fades while the background never
  // blinks, and the gate's own page-in brings the next content up through it.
  function goNext() {
    if (leaving) return;
    void haptic("light");
    if (reduce) return void onDone();
    setLeaving(true);
    window.setTimeout(() => void onDone(), 320);
  }

  // Native share sheet when the OS offers one (iOS WKWebView does), clipboard otherwise. A cancelled
  // sheet rejects with AbortError — that is the user changing their mind, not a failure to report.
  async function share() {
    if (!referralCode) return;
    void haptic("medium");
    setShareState("copied"); // optimistic: shareReferral copies BEFORE it opens the sheet
    const r = await shareReferral(referralCode);
    if (r !== "failed") void haptic("success");
  }

  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString("fr-FR"));
  const [revealed, setRevealed] = useState(false);
  const lastTick = useRef(-1);
  const lastFired = useRef(0);

  // One native tick per +1 of the DISPLAYED number, fired on the same frame the digit changes.
  // Physical ceiling: the Taptic Engine can't play faster than ~1 per 38ms — beyond that the taps
  // merge into a buzz and the bridge calls pile up — so ticks closer than that are dropped. Up to
  // ~50 members it is literally one buzz per member; past that it stays as dense as iOS allows.
  useMotionValueEvent(count, "change", (v) => {
    if (reduce) return;
    const n = Math.round(v);
    if (n === lastTick.current) return; // same digit on screen -> no new tick
    lastTick.current = n;
    const now = Date.now();
    if (now - lastFired.current < MIN_TICK_MS) return;
    lastFired.current = now;
    const p = rank > 0 ? Math.min(1, v / rank) : 1;
    void haptic(p > 0.62 ? "medium" : "light"); // firms up as the number races
  });

  useEffect(() => {
    if (reduce) {
      count.set(rank);
      setRevealed(true);
      return;
    }
    // Let the mascot + title land first, then race the number (delay ~0.55s).
    const controls = animate(count, rank, {
      duration: Math.min(2.6, Math.max(1.5, rank / 120)),
      delay: 0.55,
      ease: [0.55, 0, 0.9, 0.3], // accelerates — the number climbs faster and faster
      onComplete: () => {
        void haptic("success"); // the run of ticks lands on one notification buzz
        setRevealed(true);
      },
    });
    return () => controls.stop();
  }, [rank, reduce, count]);

  return (
    // Scrollable: with the trial + referral blocks this no longer fits a short phone, and a CTA you
    // cannot reach is a CTA that does not exist. min-h-full keeps it centred when it does fit.
    <div className="page-in fixed inset-0 z-[95] overflow-y-auto overscroll-contain bg-[var(--primary)] text-center text-white">
      <motion.div
        className="flex min-h-full flex-col items-center justify-center px-8 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))]"
        animate={leaving && !reduce ? { opacity: 0, y: -26, scale: 0.96 } : { opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: EASE_OUT }}
      >
      {/* Warm glow, brightening a touch on the reveal. */}
      <motion.div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.26),transparent_62%)]"
        aria-hidden
        animate={reduce ? {} : { opacity: revealed ? [0.7, 1, 0.85] : 0.7, scale: revealed ? [1, 1.06, 1] : 1 }}
        transition={{ duration: 1.1, ease: EASE_OUT }}
      />

      {/* Mascot: springs up from below, then celebrates forever (bob + wiggle). Does a little jump on the reveal. */}
      <motion.div
        className="relative z-10 mb-2"
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.35, y: 70, rotate: -14 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0, rotate: 0 }}
        transition={reduce ? { duration: 0.3 } : { type: "spring", stiffness: 240, damping: 15, delay: 0.05 }}
      >
        <motion.div
          animate={reduce ? {} : revealed ? { y: [0, -26, 0], rotate: [0, -6, 6, 0] } : { y: [0, -12, 0], rotate: [0, -3, 3, 0] }}
          transition={reduce ? {} : revealed ? { duration: 0.6, ease: EASE_OUT } : { duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.7 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {/* No drop-shadow filter: iOS Safari renders it as the element's BOX shadow, which shows up as a
              dark square behind the mascot. The PNG already carries its own ground shadow. */}
          <img src="/mascotte.png" alt="" className="h-36 w-36 object-contain" aria-hidden />
        </motion.div>
      </motion.div>

      {/* Confetti + expanding rings burst on the reveal. */}
      {revealed && !reduce && (
        <>
          <div className="pointer-events-none absolute left-1/2 top-[52%] h-0 w-0" aria-hidden>
            {CONFETTI.map((c, i) => (
              <motion.span
                key={i}
                className="absolute rounded-sm"
                style={{ backgroundColor: c.color, width: c.size, height: c.size }}
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.6 }}
                animate={{ opacity: [0, 1, 1, 0], x: Math.cos(c.angle) * c.dist, y: Math.sin(c.angle) * c.dist + 70, scale: [0.6, 1, 1, 0.5], rotate: 260 }}
                transition={{ duration: 1.2, delay: c.delay, ease: EASE_OUT }}
              />
            ))}
          </div>
          <div className="pointer-events-none absolute left-1/2 top-[52%] h-0 w-0" aria-hidden>
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute -left-10 -top-10 h-20 w-20 rounded-full border-2 border-white/45"
                initial={{ opacity: 0.55, scale: 0.4 }}
                animate={{ opacity: 0, scale: 3.4 }}
                transition={{ duration: 1.1, delay: i * 0.18, ease: "easeOut" }}
              />
            ))}
          </div>
        </>
      )}

      {/* Title — replaces the old "Bienvenue". */}
      <motion.p
        className="relative z-10 mb-1 text-2xl font-extrabold tracking-tight"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={reduce ? { duration: 0.3 } : { duration: 0.5, ease: EASE_OUT, delay: 0.32 }}
      >
        Ton compte est créé 🎉
      </motion.p>

      {/* The founding-member number racing up = the WHOA moment. */}
      <motion.span
        className="relative z-10 text-[5.5rem] font-extrabold leading-none tabular-nums drop-shadow-sm sm:text-[7rem]"
        animate={revealed && !reduce ? { scale: [1, 1.18, 1] } : { scale: 1 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
      >
        {rounded}
      </motion.span>

      <AnimatePresence>
        {revealed && (
          <motion.div
            className="relative z-10 mt-4 flex flex-col items-center gap-4"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE_OUT, delayChildren: 0.05, staggerChildren: 0.08 }}
          >
            <motion.p className="text-xl font-extrabold" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE_OUT }}>
              {`Tu es le ${rank.toLocaleString("fr-FR")}`}
              <sup>e</sup>
              {" membre !"}
            </motion.p>

            {/* ---- What you get, right now. Deliberately the quiet block: it's already yours. ---- */}
            <motion.div
              className="w-full max-w-xs rounded-3xl bg-white/15 px-5 py-4"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              transition={reduce ? { duration: 0.3 } : { duration: 0.5, ease: EASE_OUT }}
            >
              <span className="text-3xl" aria-hidden>🎁</span>
              <p className="mt-1 text-xl font-extrabold leading-tight">
                {`On t'offre ${TRIAL_DAYS} jours d'abonnement premium`}
              </p>
              <p className="mt-1.5 text-base font-extrabold text-white">
                <u className="underline decoration-2 underline-offset-4">Aucune</u>
                {" carte nécessaire !"}
              </p>
              <p className="mt-1 text-sm font-semibold text-white/80">Tout en accès libre.</p>
            </motion.div>

            {/* The two offers stack: the trial you already have, PLUS the way to keep it. */}
            <motion.p
              className="text-3xl font-extrabold leading-none text-white/70"
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
            >
              +
            </motion.p>

            {/* ---- The one we actually want them to take. Solid white on orange = the loudest thing
                    on the screen, and the only element that moves on its own after landing. ---- */}
            <motion.div
              className="relative w-full max-w-xs overflow-hidden rounded-3xl bg-white p-5 text-stone-800 shadow-[0_18px_40px_rgba(43,42,40,0.28)]"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 26, scale: 0.9 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              transition={reduce ? { duration: 0.3 } : { type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
            >
              <span className="text-3xl" aria-hidden>🧡</span>
              <p className="mt-1 text-xl font-extrabold leading-tight text-stone-900">
                Garde ton premium <span className="text-[var(--primary)]">à vie</span>
              </p>

              {/* Spelled out as steps: "invite 2 people" hides three separate things that have to
                  happen, and the third one is the payoff. */}
              <LifetimeSteps />

              {/* Progress — one silhouette per person still to bring in. */}
              <ReferralProgress done={0} />

              <motion.div
                className="mt-3"
                animate={reduce || shareState !== "idle" ? {} : { scale: [1, 1.03, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
              >
                <button
                  type="button"
                  onClick={share}
                  disabled={!referralCode}
                  className="btn-3d btn-primary w-full py-3.5 text-base font-extrabold disabled:opacity-50"
                >
                  {shareState === "copied" ? "Lien copié ✓" : "Partager mon lien"}
                </button>
              </motion.div>

              {referralCode && <ReferralCodeBadge code={referralCode} />}

              <OfferDeadline className="mt-2.5" />
            </motion.div>

            {/* Escape hatch, kept plainly available: nobody is ever forced to share to use the app. */}
            <motion.button
              type="button"
              onClick={goNext}
              className="mt-1 rounded-full px-6 py-3 text-base font-extrabold text-white/85 underline decoration-white/40 underline-offset-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.3 }}
            >
              C&apos;est parti&nbsp;!
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
      </motion.div>
    </div>
  );
}
