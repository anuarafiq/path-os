"use client";

import { cn } from "@/lib/utils";

export function ChatPanel({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  // Two layout modes on one always-mounted element (so the chat's state survives
  // close/reopen and navigation):
  //  - Mobile: a fixed, full-width overlay. overflow-hidden clips the off-canvas
  //    inner so sliding it out never adds horizontal page scroll.
  //  - Desktop (md+): a real in-flow flex column beside <main> — sticky, full
  //    height, its width animating 0 <-> 420px. Because it's a genuine flex item,
  //    <main> reflows on its own; no margin/padding hack needed.
  return (
    <div
      className={cn(
        "fixed inset-y-0 right-0 z-50 w-full overflow-hidden pointer-events-none",
        "md:sticky md:inset-y-auto md:right-auto md:top-0 md:z-auto md:h-screen md:shrink-0 md:pointer-events-auto md:transition-[width] md:duration-300",
        open ? "md:w-[420px]" : "md:w-0"
      )}
    >
      <div
        aria-hidden={!open}
        className={cn(
          "glass border-l border-border flex flex-col h-full w-full md:w-[420px] md:shrink-0 pointer-events-auto",
          "transition-transform duration-300 md:transition-none",
          open ? "translate-x-0" : "translate-x-full md:translate-x-0"
        )}
      >
        {children}
      </div>
    </div>
  );
}
