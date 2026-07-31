export function Logo({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Path OS"
      className={`text-primary ${className}`}
    >
      <circle cx="40" cy="51" r="34" fill="none" stroke="currentColor" strokeWidth="8" />
      <circle cx="40" cy="51" r="23" fill="none" stroke="currentColor" strokeWidth="8" />
      <circle cx="40" cy="51" r="12" fill="none" stroke="currentColor" strokeWidth="7" />
      <circle cx="40" cy="51" r="4.5" fill="currentColor" />
      <line x1="40" y1="51" x2="85.6" y2="10.1" stroke="currentColor" strokeWidth="5.3" strokeLinecap="round" />
      <polygon points="78.4,1.4 70.3,18.3 81.4,10.5" fill="currentColor" />
      <polygon points="94.4,19.7 85.5,15.5 76.6,23.5" fill="currentColor" />
    </svg>
  );
}
