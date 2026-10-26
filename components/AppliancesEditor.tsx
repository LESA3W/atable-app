"use client";

import { useEffect, useState } from "react";
import { APPLIANCE_DETAILS, APPLIANCES, APPLIANCES_LS, DETAIL_LS } from "@/data/appliances";
import { ApplianceModelPicker } from "./ApplianceModelPicker";
import { Icon } from "./Icon";

// Profile section to edit the brand/model of appliances that need it (Vorwerk, air fryer, cuiseur
// auto). Hidden until at least one such appliance has been selected in the Repas flow. Each row taps
// into the same two-step picker (Quelle marque ? -> Quel modèle ?). Client-side only (localStorage).
export function AppliancesEditor() {
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    try {
      const a = JSON.parse(localStorage.getItem(APPLIANCES_LS) || "[]");
      const d = JSON.parse(localStorage.getItem(DETAIL_LS) || "{}");
      if (Array.isArray(a)) setSelected(a.filter((x): x is string => typeof x === "string"));
      if (d && typeof d === "object") setDetail(d);
    } catch {
      /* private mode */
    }
  }, []);

  const editable = selected.filter((k) => APPLIANCE_DETAILS[k]);
  if (editable.length === 0) return null; // hidden until a brand/model appliance is chosen

  function save(key: string, value: string) {
    setDetail((cur) => {
      const next = { ...cur, [key]: value };
      try {
        localStorage.setItem(DETAIL_LS, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
    setEditing(null);
  }

  return (
    <section className="clay-card border-2 border-stone-100 p-4">
      <h2 className="text-lg font-extrabold text-stone-900">Mes appareils</h2>
      <p className="mt-1 text-sm text-stone-500">La marque et le modèle, pour des idées de recettes plus justes.</p>
      <div className="mt-3 flex flex-col gap-2">
        {editable.map((k) => {
          const det = APPLIANCE_DETAILS[k];
          const val = detail[k] ?? "";
          const icon = APPLIANCES.find((a) => a.key === k)?.icon ?? "cooker";
          return (
            <button
              key={k}
              type="button"
              onClick={() => setEditing(k)}
              className="flex items-center gap-3 rounded-2xl border-2 border-stone-100 bg-white px-3 py-2.5 text-left transition active:scale-[0.99]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
                <Icon name={icon} size={22} strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold text-stone-800">{det.label}</span>
                <span className={`block truncate text-sm font-semibold ${val ? "text-stone-500" : "text-stone-400"}`}>{val || "À préciser"}</span>
              </span>
              <span className="shrink-0 text-[var(--primary)]" aria-hidden>
                <Icon name="edit" size={18} strokeWidth={2} />
              </span>
            </button>
          );
        })}
      </div>
      {editing && <ApplianceModelPicker applianceKey={editing} initialValue={detail[editing]} onSave={(v) => save(editing, v)} onClose={() => setEditing(null)} />}
    </section>
  );
}
