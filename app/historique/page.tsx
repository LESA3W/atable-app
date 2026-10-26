"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/Skeleton";
import { useFamily } from "@/components/ProfileProvider";
import { apiFetch } from "@/lib/api";
import type { MealLogEntry } from "@/lib/types";

const COURSE_EMOJI: Record<string, string> = {
  entree: "🥗",
  plat: "🍲",
  dessert: "🍰",
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  // Capitalize the month (only that part; the rest stays as fr-FR formats it).
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  })
    .formatToParts(d)
    .map((p) => (p.type === "month" ? p.value.charAt(0).toUpperCase() + p.value.slice(1) : p.value))
    .join("");
}

export default function HistoriquePage() {
  const { memberLabel } = useFamily();
  const [log, setLog] = useState<MealLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/meal-log")
      .then((r) => r.json())
      .then((data: MealLogEntry[]) => setLog(Array.isArray(data) ? data : []))
      .catch(() => setLog([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <section>
        <h1 className="text-3xl font-extrabold tracking-tight">Historique des repas</h1>
        <p className="mt-1 text-stone-700">
          Tous les repas qu&apos;on a démarrés, du plus récent au plus ancien.
        </p>
      </section>

      {loading ? (
        <ul className="flex flex-col gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </ul>
      ) : log.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50/50 p-6 text-center">
          <p className="text-lg font-bold text-stone-800">Aucun repas pour l&apos;instant</p>
          <p className="mt-1 text-stone-600">
            Va sur{" "}
            <Link href="/" className="font-bold text-orange-700 underline">
              Repas
            </Link>{" "}
            et clique « Démarrer ce repas » pour commencer l&apos;historique.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {log.map((m, i) => (
            <li
              key={m.id}
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              className="card-in clay-card flex items-center justify-between gap-3 border-2 border-stone-100 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="font-bold text-stone-900">
                  <span aria-hidden>{COURSE_EMOJI[m.course] ?? "🍽️"}</span> {m.dishName}
                </div>
                {m.diners.length > 0 && (
                  <div className="text-sm text-stone-500">
                    Pour {m.diners.map((d) => memberLabel(d)).join(", ")}
                  </div>
                )}
              </div>
              <time className="shrink-0 text-right text-xs font-semibold text-stone-400">
                {formatWhen(m.eatenAt)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
