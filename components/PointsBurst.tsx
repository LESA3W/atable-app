"use client";

import { motion, useReducedMotion } from "motion/react";

// A floating "+X" score token, video-game style: it leaps up from the bottom of the
// screen, hangs at the apex, then falls back down while fading — the dopamine hit for
// checking off a cooking step. Later steps spawn bigger, warmer, gold tokens.
export type Burst = {
  id: number;
  points: number; // 0 = label-only (milestone)
  tier: "sm" | "md" | "lg" | "mega";
  label?: string;
  x: number; // horizontal jitter in px around center
};

const TIER: Record<
  Burst["tier"],
  { bg: string; ink: string; size: string; glow: string }
> = {
  sm: { bg: "#e9faf1", ink: "var(--ok)", size: "text-base", glow: "0 8px 18px rgba(43,42,40,0.18)" },
  md: { bg: "var(--primary-soft)", ink: "var(--primary)", size: "text-lg", glow: "0 8px 20px rgba(43,42,40,0.2)" },
  lg: { bg: "var(--primary)", ink: "#fff", size: "text-xl", glow: "0 10px 24px rgba(242,111,28,0.45)" },
  mega: { bg: "var(--gold)", ink: "var(--gold-ink)", size: "text-2xl", glow: "0 12px 30px rgba(245,185,33,0.6)" },
};

function Pill({ b }: { b: Burst }) {
  const t = TIER[b.tier];
  return (
    <div
      className={`flex items-center gap-1 whitespace-nowrap rounded-full px-3.5 py-1.5 font-black tabular-nums ${t.size}`}
      style={{ background: t.bg, color: t.ink, boxShadow: t.glow }}
    >
      {b.label ? <span className="tracking-tight">{b.label}</span> : null}
      {b.points > 0 ? <span>+{b.points}</span> : null}
      <span aria-hidden>{b.tier === "mega" ? "⭐" : "⚡"}</span>
    </div>
  );
}

function Sparkles() {
  const dots = [0, 1, 2, 3, 4, 5, 6];
  return (
    <>
      {dots.map((i) => {
        const ang = (i / dots.length) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full"
            style={{ background: i % 2 ? "var(--primary)" : "var(--gold)" }}
            initial={{ x: "-50%", y: "-50%", opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(ang) * 52 - 3, y: Math.sin(ang) * 52 - 3, opacity: 0, scale: 0.3 }}
            transition={{ duration: 0.75, ease: "easeOut" }}
          />
        );
      })}
    </>
  );
}

export function PointsBurst({ bursts, onDone }: { bursts: Burst[]; onDone: (id: number) => void }) {
  const reduce = useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center" aria-hidden>
      <div className="relative h-0 w-full max-w-lg">
        {bursts.map((b) => (
          <div
            key={b.id}
            className="absolute bottom-36 left-1/2"
            style={{ transform: `translateX(${b.x}px)` }}
          >
            {reduce ? (
              <motion.div
                style={{ x: "-50%" }}
                initial={{ y: 6, scale: 0.9, opacity: 0 }}
                animate={{ y: -18, scale: 1, opacity: [0, 1, 1, 0] }}
                transition={{ duration: 0.95, times: [0, 0.18, 0.6, 1] }}
                onAnimationComplete={() => onDone(b.id)}
              >
                <Pill b={b} />
              </motion.div>
            ) : (
              <motion.div
                style={{ x: "-50%" }}
                initial={{ y: 30, scale: 0.3, opacity: 0 }}
                animate={{
                  y: [30, -232, 96],
                  scale: [0.3, b.tier === "mega" ? 1.35 : 1.16, 0.72],
                  rotate: [0, b.x >= 0 ? 7 : -7, 0],
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: b.tier === "mega" ? 1.65 : 1.35,
                  times: [0, 0.4, 1],
                  ease: ["easeOut", "easeIn"],
                  opacity: { duration: b.tier === "mega" ? 1.65 : 1.35, times: [0, 0.12, 0.62, 1] },
                }}
                onAnimationComplete={() => onDone(b.id)}
              >
                <div className="relative">
                  <Pill b={b} />
                  {b.tier === "mega" && <Sparkles />}
                </div>
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
