"use client";

import { usePathname } from "next/navigation";

// Re-keys on route change so the new page plays an enter animation (fade + rise).
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-in">
      {children}
    </div>
  );
}
