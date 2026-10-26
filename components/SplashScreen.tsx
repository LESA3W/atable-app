"use client";

import { useEffect, useState } from "react";

// Launch screen shown on full page load (app launch / refresh), then fades out.
// Renders in the SSR HTML so it covers content instantly, no flash.
export function SplashScreen() {
  const [fading, setFading] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 1350);
    const t2 = setTimeout(() => setGone(true), 1900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[100] bg-[var(--primary)] transition-opacity duration-500 ${
        fading ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      {/* Logo centered in the middle of the screen (Duolingo splash layout) */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="splash-logo splash-bob h-36 w-36 object-contain drop-shadow-lg" />
      </div>
      {/* Wordmark pinned near the bottom */}
      <div className="absolute inset-x-0 bottom-[max(3rem,env(safe-area-inset-bottom))] text-center">
        <div className="splash-title text-4xl font-extrabold tracking-tight text-white">À table&nbsp;!</div>
      </div>
    </div>
  );
}
