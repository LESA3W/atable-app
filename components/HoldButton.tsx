"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { haptic } from "@/lib/native";

// Hold-to-confirm 3D button: press and hold ~1.5s while a darker fill sweeps left to right
// (same .cook-fill mechanic as CookButton — scaleX on the GPU). Releasing early cancels, which
// is what makes it safe for irreversible actions: a stray tap can never fire it.
const TONES = {
  danger: { bg: "#dc2626", fill: "#991b1b", shadow: "#7f1d1d" },
  primary: { bg: "var(--primary)", fill: "var(--primary-dark)", shadow: "var(--primary-dark)" },
} as const;

export function HoldButton({
  label,
  holdingLabel = "Ne lâche pas…",
  icon,
  tone = "danger",
  fullWidth = false,
  busy = false,
  busyLabel,
  onComplete,
}: {
  label: string;
  holdingLabel?: string;
  icon?: string;
  tone?: keyof typeof TONES;
  fullWidth?: boolean;
  busy?: boolean; // the action is running — the button locks instead of re-arming
  busyLabel?: string;
  onComplete: () => void;
}) {
  const [holding, setHolding] = useState(false);
  const completed = useRef(false);
  const t = TONES[tone];

  function start() {
    if (busy || holding) return;
    completed.current = false; // re-arm so the button stays usable after a cancelled hold
    setHolding(true);
    void haptic("medium"); // "the hold started" — distinct from the global light tap
  }
  function cancel() {
    if (completed.current) return;
    setHolding(false);
  }
  function finish() {
    if (completed.current) return;
    completed.current = true;
    setHolding(false);
    void haptic("success");
    onComplete();
  }

  return (
    <button
      type="button"
      disabled={busy}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault(); // a keyboard "hold" mirrors the pointer one
          start();
        }
      }}
      onKeyUp={cancel}
      className={`btn-3d overflow-hidden px-5 py-3.5 text-[15px] text-white ${fullWidth ? "w-full" : ""}`}
      style={{ background: t.bg, ["--btn-shadow" as string]: t.shadow }}
    >
      {holding && (
        <span aria-hidden className="cook-fill absolute inset-0 z-0" style={{ background: t.fill }} onAnimationEnd={finish} />
      )}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {icon && <Icon name={icon} size={18} strokeWidth={2.6} />}
        <span>{busy ? (busyLabel ?? label) : holding ? holdingLabel : label}</span>
      </span>
    </button>
  );
}
