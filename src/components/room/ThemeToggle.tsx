"use client";

export function ThemeToggle({ night, onToggle }: { night: boolean; onToggle: () => void }) {
  return <button type="button" className="pixel-button tone-cream theme-toggle" aria-label={night ? "Switch to day" : "Switch to night"} aria-pressed={night} onClick={onToggle}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {night ? <path d="M20 15.5A9 9 0 0 1 8.5 4 9 9 0 1 0 20 15.5Z" /> : <><rect x="8" y="8" width="8" height="8" /><path d="M12 1v4m0 14v4M1 12h4m14 0h4M4 4l3 3m10 10 3 3M4 20l3-3M17 7l3-3" /></>}
    </svg>
  </button>;
}
