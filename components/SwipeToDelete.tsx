"use client";

import { useRef, useState, type ReactNode } from "react";

const OPEN = 92; // px the row slides left to reveal the delete action

// Mail-style swipe-to-delete row: drag the (opaque) front left to reveal a red "Supprimer"
// behind it; release past halfway to keep it open, tap the red panel (or the row's own
// button) to delete. Transform-only (GPU), ease-out snap, and it decides horizontal vs
// vertical intent so the page still scrolls normally.
export function SwipeToDelete({ children, onDelete }: { children: ReactNode; onDelete: () => void }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ active: false, startX: 0, startY: 0, base: 0, decided: false, horiz: false });

  function onDown(e: React.PointerEvent) {
    drag.current = { active: true, startX: e.clientX, startY: e.clientY, base: dx, decided: false, horiz: false };
  }
  function onMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d.active) return;
    const mx = e.clientX - d.startX;
    const my = e.clientY - d.startY;
    if (!d.decided) {
      if (Math.abs(mx) < 6 && Math.abs(my) < 6) return;
      d.decided = true;
      d.horiz = Math.abs(mx) > Math.abs(my);
      if (d.horiz) {
        setDragging(true);
        try {
          (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
        } catch {
          // capture is best-effort
        }
      }
    }
    if (!d.horiz) return;
    setDx(Math.max(-OPEN - 24, Math.min(0, d.base + mx)));
  }
  function onUp() {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    if (d.horiz) {
      setDragging(false);
      setDx(dx < -OPEN / 2 ? -OPEN : 0);
    }
  }

  return (
    <div className="relative overflow-hidden">
      <button
        type="button"
        onClick={onDelete}
        aria-label="Supprimer"
        className="absolute inset-y-0 right-0 flex w-[92px] items-center justify-center bg-red-500 text-sm font-extrabold text-white transition active:bg-red-600"
      >
        Supprimer
      </button>
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragging ? "none" : "transform 220ms var(--ease-out)",
          touchAction: "pan-y",
        }}
        className="relative bg-white"
      >
        {children}
      </div>
    </div>
  );
}
