"use client";

import { passwordScore } from "@/lib/password";

const LABELS = ["Trop court", "Faible", "Moyen", "Fort", "Très fort"];
const COLORS = ["#E53935", "#FB8C00", "#FBC02D", "#43A047", "#1B9E4B"];

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const s = passwordScore(password);
  const pct = ((s + 1) / 5) * 100;
  return (
    <div className="mt-1.5">
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/25">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: COLORS[s] }}
        />
      </div>
      <div className="mt-1 text-xs font-bold text-white/90">
        Mot de passe&nbsp;: <span style={{ color: COLORS[s] }}>{LABELS[s]}</span>
      </div>
    </div>
  );
}
