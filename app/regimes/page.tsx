"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFamily } from "@/components/ProfileProvider";
import { apiFetch } from "@/lib/api";
import { RESTRICTIONS } from "@/lib/diets";
import { Spinner } from "@/components/Spinner";

// Re-edit your dietary restrictions any time (they were previously set once at sign-up). Reuses the
// onboarding picker look; saves via PATCH /api/me and refreshes the profile.
export default function RegimesPage() {
  const { me, refresh } = useFamily();
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(() => [...(me.restrictions ?? [])]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const none = selected.length === 0;

  function toggle(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function save() {
    setSaving(true);
    setErr("");
    try {
      const res = await apiFetch("/api/me", { method: "PATCH", body: JSON.stringify({ restrictions: selected }) });
      if (!res.ok) throw new Error("save_failed");
      await refresh();
      router.back();
    } catch {
      setSaving(false);
      setErr("Impossible d'enregistrer. Réessaie dans un instant.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <section>
        <h1 className="text-3xl font-extrabold tracking-tight">Mes régimes</h1>
        <p className="mt-1 text-stone-600">Choisis ce qui te concerne (ou aucun). Ça masque les aliments qui ne te correspondent pas quand tu règles tes goûts.</p>
      </section>

      <div className="grid grid-cols-3 gap-2.5">
        {RESTRICTIONS.map((r) => {
          const on = selected.includes(r.id);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => toggle(r.id)}
              aria-pressed={on}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 bg-white p-3 transition active:scale-95 ${
                on ? "border-[var(--primary)] shadow-[0_4px_0_var(--primary)]" : "border-stone-200"
              }`}
            >
              <span className="text-3xl leading-none" aria-hidden>{r.emoji}</span>
              <span className="text-center text-xs font-bold text-stone-700">{r.label}</span>
            </button>
          );
        })}
      </div>

      {/* "Aucune restriction" just clears the selection; it's implied when nothing is picked. */}
      <button
        type="button"
        onClick={() => setSelected([])}
        aria-pressed={none}
        className={`flex items-center justify-center gap-2 rounded-2xl border-2 py-3 text-sm font-extrabold transition active:scale-95 ${
          none ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]" : "border-stone-200 bg-white text-stone-600"
        }`}
      >
        Aucune restriction
      </button>

      {err && <p className="text-sm font-semibold text-red-600">{err}</p>}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="btn-3d btn-primary flex items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-extrabold disabled:opacity-60"
      >
        {saving ? <Spinner className="h-5 w-5 text-white" /> : "Enregistrer"}
      </button>
    </div>
  );
}
