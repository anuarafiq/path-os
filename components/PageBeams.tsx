"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import Beams from "./Beams";

// Hydration-safe "are we on the client yet" flag. useSyncExternalStore returns the
// getServerSnapshot value (false) during SSR *and* the first client render, then re-renders
// with getSnapshot (true) after hydration — so the first client render matches the server.
// This is the lint-clean alternative to the setState-in-effect mount guard the React
// Compiler flags (see .claude/CLAUDE.md), and it's what makes the theme gate below safe:
// next-themes sets `.dark` pre-hydration, so `resolvedTheme` is already "dark" on the first
// client render but null on the server — gating on `hydrated` avoids that mismatch.
const emptySubscribe = () => () => {};
function useHydrated() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

// Chat pages want a clean, distraction-free surface for reading/typing.
const HIDDEN_PATHS = new Set(["/coach", "/employer/coach"]);
// The only route shapes with no sidebar (confirmed: 3 layout.tsx files total in the app —
// root, (candidate), (employer) — so everything else sits behind a w-56 sidebar).
const NO_SIDEBAR_PATHS = new Set(["/", "/login", "/signup"]);

// Global decorative background, mounted once in app/layout.tsx. Fixed + full viewport so it
// fills the whole screen, not just a content box. `md:left-56` insets past the opaque w-56
// desktop sidebar on candidate/employer routes (mobile top bar sits at z-30, above this z-0
// layer, so it stays visible); real page content is `relative z-10` (sealed at the layout
// level) and paints on top. See .claude/ARCHITECTURE.md "Page backgrounds" for the full
// stacking-order writeup and why this can't use `-z-10` (WebKit canvas gotcha).
export function PageBeams() {
  const hydrated = useHydrated();
  const { resolvedTheme } = useTheme();
  const pathname = usePathname();

  if (!hydrated || HIDDEN_PATHS.has(pathname)) return null;

  const noSidebar = NO_SIDEBAR_PATHS.has(pathname) || pathname.startsWith("/p/");
  const isDark = resolvedTheme === "dark";

  return (
    <div
      aria-hidden
      className={cn(
        "fixed inset-0 z-0 pointer-events-none",
        !noSidebar && "md:left-56",
        isDark ? "opacity-70" : "opacity-15"
      )}
    >
      <Beams
        beamWidth={2}
        beamHeight={22}
        beamNumber={12}
        lightColor={isDark ? "#47eafb" : "#009fa3"}
        diffuseColor={isDark ? "#000000" : "#ffffff"}
        speed={2}
        noiseIntensity={1.5}
        scale={0.2}
        rotation={30}
      />
    </div>
  );
}
