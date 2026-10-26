// Pulsing placeholder block (opacity-only animation, no layout shift).
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-xl bg-stone-200/80 ${className}`} />;
}
