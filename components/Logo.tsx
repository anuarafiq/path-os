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
      <rect width="40" height="40" rx={size >= 64 ? 12 : 8} fill="var(--bg-elevated)" />
      <text
        x="20"
        y="21"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="var(--font-heading), var(--font-sans), sans-serif"
        fontWeight="700"
        fontSize="21"
        fill="var(--brand)"
      >
        P
      </text>
    </svg>
  );
}
