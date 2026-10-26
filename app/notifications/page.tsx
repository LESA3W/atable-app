"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { NotificationList } from "@/components/NotificationList";
import type { AppNotification } from "@/lib/types";

// The "Notif" nav tab: the same notifications as the header bell, as a full page.
export default function NotificationsPage() {
  const [items, setItems] = useState<AppNotification[]>([]);
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
  }, [load]);

  return (
    <div className="flex flex-col gap-5">
      <section>
        <h1 className="text-3xl font-extrabold tracking-tight">Notifications</h1>
      </section>
      <NotificationList items={items} onClose={() => {}} onChange={load} embedded />
    </div>
  );
}
