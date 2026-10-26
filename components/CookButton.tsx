"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/Icon";

// "Hold to launch" 3D button (Duolingo-style): press and hold ~1.5s while the
// darker fill sweeps left to right (scaleX, GPU). Release early cancels
// (prevents accidental taps). On full fill, onComplete fires.
export function CookButton({
  label = "Démarrer la cuisine",
  emoji = "👩‍🍳",
  icon,
  doneLabel = "Démarré ✓",
  done = false,
  fullWidth = false,
  compact = false,
  holdHint = false,
  onComplete,
  onDoneClick,
}: {
  label?: string;
  emoji?: string;
  icon?: string;
  doneLabel?: string;
  done?: boolean;
  fullWidth?: boolean;
  compact?: boolean;
  holdHint?: boolean; // show an explicit "press and hold" nudge (for first-timers)
  onComplete: () => void;
  onDoneClick?: () => void; // when set, the "done" state is tappable (e.g. reopen the cook session)
}) {
  const [holding, setHolding] = useState(false);
  const completed = useRef(false);

  function start() {
    if (done) return;
    // Re-arm on every new hold so the button stays usable across launches (e.g. a
    // second meal, or a retry after a failed launch). `completed` still blocks a
    // double onComplete() within a single hold cycle.
    completed.current = false;
    setHolding(true);
  }
  function cancel() {
    if (completed.current) return;
    setHolding(false);
  }
  function finish() {
    if (completed.current) return;
    completed.current = true;
    setHolding(false);
    onComplete();
  }

  const width = fullWidth ? "w-full" : "";
  const size = compact ? "px-4 py-2.5 text-[15px]" : "px-5 py-3 text-sm";

  if (done) {
    const cls = `pop rounded-btn bg-[var(--ok)] text-center font-bold text-white ${width} ${size}`;
    const shadow = { boxShadow: "0 4px 0 #15803d" };
    if (onDoneClick) {
      return (
        <button type="button" onClick={onDoneClick} className={`${cls} inline-flex items-center justify-center gap-2 transition active:scale-[0.98]`} style={shadow}>
          <Icon name="play" size={15} strokeWidth={2.6} /> {doneLabel}
        </button>
      );
    }
    return (
      <div className={cls} style={shadow}>
        {doneLabel}
      </div>
    );
  }

  return (
    <button
      type="button"
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      className={`btn-3d btn-primary overflow-hidden ${width} ${size}`}
    >
      {holding && (
        <span
          aria-hidden
          className="cook-fill absolute inset-0 z-0"
          style={{ background: "var(--primary-dark)" }}
          onAnimationEnd={finish}
        />
      )}
      {/* Visual-only "hold me" hint: a faint fill previews the real sweep, no text. */}
      {holdHint && !holding && (
        <span aria-hidden className="cook-hint absolute inset-0 z-0" style={{ background: "var(--primary-dark)" }} />
      )}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {holding ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="cook-spin h-5 w-5 shrink-0 object-contain" /> Maintiens… ça chauffe&nbsp;!
          </>
        ) : (
          <>
            {icon ? <Icon name={icon} size={17} strokeWidth={2.6} /> : emoji ? <span>{emoji}</span> : null}
            <span>{label}</span>
          </>
        )}
      </span>
      {holding && (
        <>
          <span className="cook-float z-10" style={{ left: "22%" }}>
            🔥
          </span>
          <span className="cook-float z-10" style={{ left: "52%", animationDelay: "0.3s" }}>
            🍳
          </span>
          <span className="cook-float z-10" style={{ left: "80%", animationDelay: "0.15s" }}>
            🔥
          </span>
        </>
      )}
    </button>
  );
}
