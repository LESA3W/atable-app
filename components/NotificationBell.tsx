"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { NotificationList } from "@/components/NotificationList";
import type { AppNotification } from "@/lib/types";

// Header bell + red unread badge. Polls every 30s and on focus/visibility (paused
// while the tab is hidden). Opens the notification list (bottom sheet).
export function NotificationBell() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/notifications");
      if (res.ok) setItems((await res.json()) as AppNotification[]);
    } catch {
      // best effort
    }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(() => {
      if (!document.hidden) load();
    }, 30000);
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [load]);

  const unread = items.filter((n) => !n.read).length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={unread > 0 ? `Notifications, ${unread} non lues` : "Notifications"}
        className="relative flex h-11 w-11 items-center justify-center rounded-full text-white transition hover:bg-white/15 active:scale-95"
      >
        <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="pop absolute right-0.5 top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-extrabold text-white ring-2 ring-[var(--primary)]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <NotificationList items={items} onClose={() => setOpen(false)} onChange={load} />
      )}
    </>
  );
}
