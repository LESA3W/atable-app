"use client";

import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { useFamilyOptional } from "@/components/ProfileProvider";

// Header avatar of the logged-in member; tap for a small menu (switch Famille/groupe + code + logout).
export function ProfileButton() {
  const ctx = useFamilyOptional();
  const [open, setOpen] = useState(false);

  // Public pages (/invite) render the chrome without an account behind it — nothing to show here.
  if (!ctx) return null;
  const { me, family, families, switchFamily, logout } = ctx;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Profil ${me.name}`}
        className="flex items-center rounded-full ring-2 ring-white/60 transition hover:ring-white active:scale-95"
      >
        <Avatar person={me} size={40} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 z-50 mt-2 w-60 rounded-2xl border-2 border-orange-100 bg-white p-3 text-stone-800 shadow-[0_8px_28px_rgba(43,42,40,0.2)]">
            <div className="flex items-center gap-2">
              <Avatar person={me} size={38} />
              <div className="min-w-0">
                <div className="truncate font-extrabold">{me.name}</div>
                <div className="truncate text-xs font-semibold text-stone-500">{family.name}</div>
              </div>
            </div>
            {families.length > 1 && (
              <div className="mt-2 flex flex-col gap-0.5 border-t border-stone-100 pt-2">
                <div className="px-1 pb-0.5 text-[11px] font-bold uppercase tracking-wide text-stone-400">Mes Famille/groupe</div>
                {families.map((f) => {
                  const active = f.id === family.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        if (!active) switchFamily(f.id);
                        setOpen(false);
                      }}
                      aria-current={active ? "true" : undefined}
                      className={`flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-left text-sm font-bold transition active:scale-[0.98] ${active ? "bg-[var(--primary-soft)] text-[var(--primary-dark)]" : "text-stone-700 hover:bg-stone-50"}`}
                    >
                      <span className="min-w-0 truncate">{f.name}</span>
                      {active && (
                        <span className="shrink-0 text-[var(--primary)]" aria-hidden>
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="mt-2 rounded-xl bg-orange-50 px-2 py-2 text-center text-sm text-stone-700">
              Code Famille/groupe&nbsp;: <span className="font-mono text-base font-extrabold tracking-wider text-orange-700">{family.code}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="mt-2 w-full rounded-xl py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
            >
              Se déconnecter
            </button>
          </div>
        </>
      )}
    </div>
  );
}
