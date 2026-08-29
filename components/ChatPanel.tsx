"use client";

import { cn } from "@/lib/utils";

export function ChatPanel({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  // Two layout modes, only one mounted at a time on mobile (a Tailwind v4
  // `translate` toggle here silently no-ops in some renders and leaves the
  // panel visually stuck open, so mobile visibility uses plain display
  // instead of a slide transform):
  //  - Mobile: a fixed, full-width overlay, shown/hidden outright.
  //  - Desktop (md+): a real in-flow flex column beside <main> — sticky, full
  //    height, always mounted, its width animating 0 <-> 420px. Because it's
  //    a genuine flex item, <main> reflows on its own; no margin/padding hack
  //    needed.
  return (
    <div
      className={cn(
        "fixed inset-y-0 right-0 z-50 w-full overflow-hidden",
        open ? "flex" : "hidden",
        "md:flex md:sticky md:inset-y-auto md:right-auto md:top-0 md:z-auto md:h-screen md:shrink-0 md:motion-safe:transition-[width] md:motion-safe:duration-300",
        open ? "md:w-[420px]" : "md:w-0"
      )}
    >
      <div
        aria-hidden={!open}
        className="glass border-l border-border flex flex-col h-full w-full md:w-[420px] md:shrink-0"
      >
        {children}
      </div>
    </div>
  );
}
