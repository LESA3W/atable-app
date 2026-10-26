"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";
import { Icon } from "@/components/Icon";

// Horizontal nav for >=md, sitting in the header (orange band). The active tab is
// a white pill so it reads on the orange; inactive tabs are translucent white.
export function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {NAV_ITEMS.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-sm font-extrabold transition active:scale-95 ${
              active
                ? "bg-white text-[var(--primary)] shadow-sm"
                : "text-white/85 hover:bg-white/15 hover:text-white"
            }`}
          >
            <Icon name={l.icon} size={18} />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
