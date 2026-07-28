export function Logo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      role="img"
      aria-label="Path OS"
    >
      <rect width="40" height="40" rx={size >= 64 ? 12 : 8} fill="var(--muted)" />
      <path
        d="M10 28 L18 20 L30 11"
        stroke="var(--brand)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="28" r="2.4" fill="var(--brand)" opacity="0.55" />
      <circle cx="18" cy="20" r="2.4" fill="var(--brand)" opacity="0.8" />
      <circle cx="30" cy="11" r="3.2" fill="var(--brand)" />
    </svg>
  );
}
