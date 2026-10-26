import type { Market } from "@/lib/shopping";

// One nearby Drive/delivery store: chain logo (or its first letter as fallback), name + city,
// street address, its services (Drive and/or Livraison), and distance. A round orange checkbox on
// the right fills with a tick when selected. White card, used on both the orange onboarding step
// and the light settings editor.
export function MarketCard({
  market,
  selected,
  onClick,
}: {
  market: Market;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left transition active:scale-[0.98] ${
        selected ? "border-[var(--primary)] bg-[var(--primary-soft)]" : "border-stone-200 bg-white"
      }`}
    >
      {/* Fixed 48px logo box for every chain (was per-brand sizes) so all cards line up the same. */}
      {market.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/markets/${market.logo}`} alt="" className="h-12 w-12 shrink-0 object-contain" />
      ) : (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-xl font-black text-stone-400">
          {market.name.slice(0, 1).toUpperCase()}
        </span>
      )}
      {/* Fixed 3-line layout so every card is the same height:
          1) chain name + city + · distance   2) street address   3) Drive / Livraison labels. */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="truncate text-base font-extrabold text-stone-900">
            {market.name}
            {market.city && <span className="font-semibold text-stone-500"> {market.city}</span>}
          </span>
          <span className="shrink-0 text-xs font-semibold text-stone-400">· {(market.dist / 1000).toFixed(1)} km</span>
        </div>
        {/* Address line kept even when unknown (nbsp) so cards without an address stay the same size. */}
        <div className="min-h-[1rem] truncate text-xs font-semibold text-stone-500">{market.address || " "}</div>
        <div className="mt-1.5 flex min-h-[1.25rem] flex-wrap items-center gap-1.5">
          {market.services.map((s) => (
            <span
              key={s}
              className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
                s === "Drive" ? "bg-orange-100 text-orange-700" : "bg-sky-100 text-sky-700"
              }`}
            >
              {s}
            </span>
          ))}
        </div>
      </div>
      {/* Round orange checkbox: empty ring, fills with a white tick when selected (same as the dish cards). */}
      <span
        aria-hidden
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[var(--primary)] transition-colors ${
          selected ? "bg-[var(--primary)]" : "bg-white"
        }`}
      >
        {selected && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </span>
    </button>
  );
}
