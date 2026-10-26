import type { CSSProperties } from "react";

// Hand-drawn, flat, COLORED food icons (French-appropriate). Per-food — replaces the category
// emoji in the taste swipe and wherever a single food is shown. Foods not yet drawn fall back to
// their category emoji (hasFoodIcon === false). viewBox 0 0 48 48, same filled spirit as the
// category line icons but with real colors. Growing set; drawn category by category.
const ICONS: Record<string, React.ReactNode> = {
  // ── Viandes ──
  poulet: (
    <>
      <g transform="rotate(-38 30 17)">
        <rect x="26.5" y="7" width="6" height="15" rx="3" fill="#f4ecdb" />
        <circle cx="26" cy="8" r="3.4" fill="#f4ecdb" />
        <circle cx="33" cy="8" r="3.4" fill="#f4ecdb" />
      </g>
      <ellipse cx="19" cy="31" rx="12.5" ry="11.5" fill="#cf8a4a" />
      <ellipse cx="14.5" cy="27" rx="3.4" ry="2.2" fill="#e2a869" />
    </>
  ),
  dinde: (
    <>
      <rect x="15" y="15" width="3.5" height="8" rx="1.75" fill="#f4ecdb" />
      <rect x="29.5" y="15" width="3.5" height="8" rx="1.75" fill="#f4ecdb" />
      <circle cx="16.7" cy="15" r="3" fill="#f4ecdb" />
      <circle cx="31.3" cy="15" r="3" fill="#f4ecdb" />
      <ellipse cx="24" cy="31" rx="16" ry="11.5" fill="#c07d3b" />
      <ellipse cx="24" cy="27.5" rx="14.5" ry="7.5" fill="#d6924b" />
    </>
  ),
  "steak-hache": (
    <>
      <ellipse cx="24" cy="27" rx="15" ry="10" fill="#c15a44" />
      <ellipse cx="24" cy="24" rx="15" ry="8" fill="#cf6a53" />
      <circle cx="18" cy="23" r="1.4" fill="#9c4230" />
      <circle cx="26" cy="21" r="1.4" fill="#9c4230" />
      <circle cx="30" cy="25" r="1.4" fill="#9c4230" />
      <circle cx="21" cy="26" r="1.4" fill="#9c4230" />
      <circle cx="28" cy="27" r="1.4" fill="#9c4230" />
    </>
  ),
  steak: (
    <>
      <path d="M10 27 Q8 15 23 15 Q39 15 38 26 Q39 36 23 36 Q9 37 10 27 Z" fill="#b23b2e" />
      <path d="M37 17 Q43 26 36 35 Q33 26 37 17 Z" fill="#ecdccb" />
      <path d="M16 22 Q22 20 30 23" stroke="#c85042" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M15 28 Q22 26 29 29" stroke="#c85042" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </>
  ),
  veau: (
    <>
      <ellipse cx="23" cy="26" rx="13" ry="11" fill="#e6b0a8" />
      <ellipse cx="23" cy="26" rx="13" ry="11" fill="none" stroke="#d59a92" strokeWidth="2" />
      <circle cx="14" cy="19.5" r="3.4" fill="#f4ece0" />
      <ellipse cx="21" cy="24" rx="4" ry="2.4" fill="#eec0b8" opacity="0.7" />
    </>
  ),
  porc: (
    <>
      <ellipse cx="25" cy="28" rx="13" ry="11" fill="#dda07f" />
      <path d="M11 19 Q22 11 35 16" stroke="#f4ece0" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <ellipse cx="25" cy="29" rx="6.5" ry="5" fill="#d3946f" opacity="0.6" />
    </>
  ),
  agneau: (
    <>
      <rect x="21.7" y="6" width="4.6" height="17" rx="2.3" fill="#f4ece0" />
      <circle cx="24" cy="6.5" r="2.6" fill="#f4ece0" />
      <circle cx="24" cy="31" r="11.5" fill="#c15848" />
      <ellipse cx="20" cy="27" rx="3" ry="2" fill="#cf6a5a" />
    </>
  ),
  lapin: (
    <>
      <ellipse cx="22" cy="32" rx="11" ry="7.5" fill="#a9805c" />
      <circle cx="32" cy="27" r="6" fill="#a9805c" />
      <ellipse cx="30" cy="16" rx="2.4" ry="6" fill="#a9805c" transform="rotate(-12 30 16)" />
      <ellipse cx="35" cy="16.5" rx="2.4" ry="6" fill="#a9805c" transform="rotate(10 35 16.5)" />
      <circle cx="11.5" cy="31" r="2.6" fill="#efe4d7" />
      <circle cx="34" cy="26" r="1" fill="#3c2f26" />
    </>
  ),
  canard: (
    <>
      <ellipse cx="22" cy="30" rx="12.5" ry="8" fill="#8a6a45" />
      <circle cx="33" cy="22" r="5.5" fill="#8a6a45" />
      <path d="M37 21 L44 23 L37 25 Z" fill="#e6a13f" />
      <circle cx="33" cy="21" r="1.1" fill="#2b2118" />
      <path d="M12 31 Q6 30 8 26 Q12 28 14 31 Z" fill="#7a5c3b" />
    </>
  ),
  saucisses: (
    <g transform="rotate(-18 24 24)">
      <rect x="7" y="17" width="31" height="7.5" rx="3.75" fill="#a5673c" />
      <rect x="7" y="25.5" width="31" height="7.5" rx="3.75" fill="#b3743f" />
      <circle cx="8" cy="20.75" r="1.6" fill="#7d4c29" />
      <circle cx="8" cy="29.25" r="1.6" fill="#7d4c29" />
    </g>
  ),
  merguez: (
    <>
      <path d="M12 32 Q16 15 24 15 Q32 15 36 32" stroke="#b23e28" strokeWidth="8.5" fill="none" strokeLinecap="round" />
      <path d="M12 32 Q16 15 24 15 Q32 15 36 32" stroke="#9a3320" strokeWidth="8.5" fill="none" strokeLinecap="round" strokeDasharray="0.5 6" opacity="0.6" />
    </>
  ),
  "jambon-blanc": (
    <>
      <path d="M13 14 Q24 11 35 14 Q39 24 35 34 Q24 37 13 34 Q9 24 13 14 Z" fill="#f2b1b8" />
      <path d="M13 14 Q24 11 35 14 Q39 24 35 34 Q24 37 13 34 Q9 24 13 14 Z" fill="none" stroke="#e295a0" strokeWidth="2" />
      <ellipse cx="24" cy="24" rx="4.5" ry="3.5" fill="#f7c8cd" />
    </>
  ),
};

export function hasFoodIcon(id: string): boolean {
  return id in ICONS;
}

export function FoodIcon({
  id,
  size = 48,
  className,
  style,
}: {
  id: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const shape = ICONS[id];
  if (!shape) return null;
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={className} style={style} aria-hidden>
      {shape}
    </svg>
  );
}
