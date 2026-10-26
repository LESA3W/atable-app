// A small spinning ring that inherits the current text colour. Use next to a loading
// label so "something is happening" is concrete, not just static text.
export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`spin shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
