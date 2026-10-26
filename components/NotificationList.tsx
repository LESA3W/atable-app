"use client";

import { useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { useFamily } from "@/components/ProfileProvider";
import type { AppNotification } from "@/lib/types";

function describe(n: AppNotification): string {
  const name = typeof n.payload.name === "string" ? n.payload.name : "Quelqu'un";
  switch (n.type) {
    case "join_request":
      return `${name} demande à rejoindre la famille/groupe.`;
    case "member_joined":
      return `${name} a rejoint la famille/groupe.`;
    case "join_refused":
      return "Ta demande a été refusée.";
    case "join_accepted": {
      const fam = typeof n.payload.familyName === "string" && n.payload.familyName ? n.payload.familyName : "la famille/groupe";
      return `Ta demande a été acceptée — bienvenue dans ${fam} !`;
    }
    case "family_invite": {
      const inviter = typeof n.payload.inviterName === "string" ? n.payload.inviterName : "Quelqu'un";
      const fam = typeof n.payload.familyName === "string" ? n.payload.familyName : "sa famille/groupe";
      return `${inviter} t'invite à rejoindre ${fam}.`;
    }
    case "invite_refused":
      return `${name} a refusé ton invitation.`;
    default:
      return n.type;
  }
}

export function NotificationList({
  items,
  onClose,
  onChange,
  embedded = false,
}: {
  items: AppNotification[];
  onClose: () => void;
  onChange: () => void;
  embedded?: boolean;
}) {
  const { refresh } = useFamily();
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, id: -1, startY: 0, dy: 0, startT: 0 });

  // Lock the page behind the sheet so only the sheet (and its list) can scroll (modal only).
  useEffect(() => {
    if (embedded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [embedded]);

  // Swipe-to-dismiss: drag the top handle/header down. Only transform is touched.
  // Pointer capture goes on the drag zone itself (the element carrying the move/up
  // handlers) so the gesture keeps tracking even past the element's bounds.
  function onDragStart(e: React.PointerEvent) {
    const zone = e.currentTarget as HTMLElement;
    try {
      zone.setPointerCapture(e.pointerId);
    } catch {
      // setPointerCapture can throw for non-active pointers; drag still works
    }
    if (sheetRef.current) sheetRef.current.style.transition = "none";
    drag.current = { active: true, id: e.pointerId, startY: e.clientY, dy: 0, startT: e.timeStamp };
  }
  function onDragMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d.active || e.pointerId !== d.id) return;
    d.dy = Math.max(0, e.clientY - d.startY); // downward only
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${d.dy}px)`;
  }
  function onDragEnd(e: React.PointerEvent) {
    const d = drag.current;
    if (!d.active || e.pointerId !== d.id) return;
    d.active = false;
    const el = sheetRef.current;
    if (!el) return;
    const velocity = d.dy / Math.max(1, e.timeStamp - d.startT);
    if (d.dy > 80 || velocity > 0.35) {
      onClose();
      return;
    }
    el.style.transition = "transform 260ms var(--ease-out)";
    el.style.transform = "translateY(0px)";
  }

  // Mark everything read when the list opens (clears the badge); actions stay usable.
  useEffect(() => {
    apiFetch("/api/notifications", { method: "POST", body: JSON.stringify({ op: "markRead" }) })
      .then(() => onChange())
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function decide(requestId: string, op: "accept" | "refuse") {
    try {
      await apiFetch("/api/join-requests", {
        method: "POST",
        body: JSON.stringify({ op, id: requestId }),
      });
      await refresh();
      onChange();
    } catch {
      // best effort
    }
  }

  // The invitee decides on an invite sent to them (a different flow from the admin one above).
  async function inviteDecide(inviteId: string, op: "accept" | "refuse") {
    try {
      await apiFetch("/api/invites", { method: "POST", body: JSON.stringify({ op, id: inviteId }) });
      await refresh();
      onChange();
    } catch {
      // best effort
    }
  }

  const body =
    items.length === 0 ? (
      <div className={`flex flex-col items-center justify-center text-center text-stone-500 ${embedded ? "min-h-[58vh] py-10" : "flex-1 py-10"}`}>
        <div className="text-4xl" aria-hidden>
          📭
        </div>
        <p className="mt-2 font-semibold">Aucune nouvelle pour le moment</p>
      </div>
    ) : (
      <ul className={`flex flex-col gap-2 ${embedded ? "" : "flex-1 overflow-y-auto px-4 pb-4"}`}>
        {items.map((n) => {
          const requestId = typeof n.payload.requestId === "string" ? n.payload.requestId : null;
          // A join_request notification is only ever delivered to admins of THAT family (see
          // requestJoin), so receiving one already proves admin rights there — don't re-gate on the
          // ACTIVE family's role (that hid the buttons for a multi-group admin viewing another group).
          const isAdminJoin = n.type === "join_request" && !!requestId;
          const inviteId = typeof n.payload.inviteId === "string" ? n.payload.inviteId : null;
          const isInvite = n.type === "family_invite" && inviteId;
          return (
            <li
              key={n.id}
              className={`rounded-2xl border-2 px-3 py-2.5 ${
                n.read ? "border-stone-100 bg-white" : "border-orange-200 bg-orange-50/60"
              }`}
            >
              <div className="flex items-start gap-2">
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange-500" aria-hidden />}
                <p className="text-sm font-semibold text-stone-800">{describe(n)}</p>
              </div>
              {isAdminJoin && (
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => decide(requestId, "accept")} className="btn-3d btn-primary flex-1 rounded-full py-2 text-sm">
                    Accepter
                  </button>
                  <button type="button" onClick={() => decide(requestId, "refuse")} className="btn-3d btn-neutral flex-1 rounded-full py-2 text-sm">
                    Refuser
                  </button>
                </div>
              )}
              {isInvite && (
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => inviteDecide(inviteId, "accept")} className="btn-3d btn-primary flex-1 rounded-full py-2 text-sm">
                    Rejoindre
                  </button>
                  <button type="button" onClick={() => inviteDecide(inviteId, "refuse")} className="btn-3d btn-neutral flex-1 rounded-full py-2 text-sm">
                    Refuser
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );

  // Embedded (the /notifications tab): plain in-page section, no overlay, so the nav stays usable.
  if (embedded) return body;

  return (
    <div className="fixed inset-0 z-[80]" onClick={onClose}>
      {/* Full-height sheet: rises to just below the header, dismissible by swiping down.
          No dark backdrop; the page behind is scroll-locked while this is open. */}
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        className="fixed inset-x-0 bottom-0 top-[var(--header-h)] mx-auto flex w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_-8px_28px_rgba(43,42,40,0.2)]"
      >
        {/* Drag zone: the grabber + header. Dragging it down closes the sheet. */}
        <div
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          style={{ touchAction: "none" }}
          className="shrink-0 cursor-grab px-4 pb-2 pt-2.5 active:cursor-grabbing"
        >
          <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-stone-300" aria-hidden />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold">Notifications</h2>
            <button type="button" onClick={onClose} className="btn-3d btn-primary rounded-full px-4 py-2 text-sm">
              Fermer
            </button>
          </div>
        </div>
        {body}
      </div>
    </div>
  );
}
