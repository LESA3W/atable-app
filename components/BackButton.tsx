"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";

// Slim top bar carrying just a back chevron, shown on deep screens (where the orange header and the
// bottom nav are hidden), mirroring the meal wizard's top-left back control. Sticky so it stays put
// while scrolling; its height matches --header-h in the [data-chrome="bare"] state so in-page sticky
// sub-headers (e.g. /courses "Total estimé") pin flush right below it. Phones only — desktop keeps
// the full header (with TopNav).
export function BackButton({ fallback = "/semaine" }: { fallback?: string }) {
  const router = useRouter();
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push(fallback);
  };
  return (
    <div className="sticky top-0 z-30 flex items-center bg-[var(--background)] px-2 pb-1 pt-[calc(env(safe-area-inset-top)+8px)] md:hidden print:hidden">
      <button
        type="button"
        onClick={goBack}
        aria-label="Retour"
        className="flex h-11 w-11 items-center justify-center rounded-full text-stone-500 transition active:scale-90"
      >
        <Icon name="chevron-left" size={26} strokeWidth={2.5} />
      </button>
    </div>
  );
}
