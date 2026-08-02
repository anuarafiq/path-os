import { cn } from "@/lib/utils";

export function DotGrid({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-[0.15]",
        "[mask-image:radial-gradient(ellipse_65%_65%_at_50%_0%,black,transparent)]",
        className,
      )}
    >
      <defs>
        <pattern id="dot-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" className="fill-foreground" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dot-grid)" />
    </svg>
  );
}
