// Native bridge for the Capacitor iOS shell. Everything here is a NO-OP on the web / PWA — the
// helpers only do anything when the app runs inside the native WebView (Capacitor.isNativePlatform()).
// The Capacitor JS is imported statically: a dynamic import() code-splits into a chunk that the
// native WebView (loading the remote Vercel URL) can fail to fetch, which silently killed the haptics.
// registerPlugin() is inert on web (it only proxies to the native plugin at call time), so a static
// import is SSR- and web-safe. This is the "real native value" layer for Guideline 4.2.
import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export type Haptic =
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "error"
  | "selection";

// Fire a native haptic. On iOS Safari / PWA `navigator.vibrate` is a no-op, so we don't even try it
// here — this is deliberately native-only. Safe to call from any handler; it self-guards.
export async function haptic(kind: Haptic = "light"): Promise<void> {
  if (!isNative()) return;
  try {
    if (kind === "success" || kind === "warning" || kind === "error") {
      const type = { success: NotificationType.Success, warning: NotificationType.Warning, error: NotificationType.Error }[kind];
      await Haptics.notification({ type });
    } else if (kind === "selection") {
      await Haptics.selectionStart();
      await Haptics.selectionChanged();
      await Haptics.selectionEnd();
    } else {
      const style = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy }[kind];
      await Haptics.impact({ style });
    }
  } catch {
    // Plugin absent (older shell) or call rejected — ignore, it's a nicety not a requirement.
  }
}

// Light haptic every time `value` goes UP — for any progress bar that advances (cook points, etc.).
// No haptic on mount, and none when it stays flat or drops.
export function useProgressHaptic(value: number): void {
  const prev = useRef(value);
  useEffect(() => {
    if (value > prev.current) void haptic("light");
    prev.current = value;
  }, [value]);
}

// Light haptic on ANY change of `value` (up or down) — e.g. the shopping total: one buzz per cent it
// moves, so dragging the budget slider from cheapest to premium fires a run of them, one per step.
export function useChangeHaptic(value: number): void {
  const prev = useRef(value);
  useEffect(() => {
    if (value !== prev.current) void haptic("light");
    prev.current = value;
  }, [value]);
}
