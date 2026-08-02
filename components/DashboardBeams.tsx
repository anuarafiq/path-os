"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
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

// The Beams effect is black geometry lit by a directional light — it only reads against a
// dark backdrop (same as the React Bits reference). Render it only in dark mode, where the
// dashboard background is already near-black; light mode keeps the subtle DotGrid instead.
// Gating (rather than CSS-hiding) also means the WebGL canvas only mounts when it's visible.
export function DashboardBeams() {
  const hydrated = useHydrated();
  const { resolvedTheme } = useTheme();

  if (!hydrated || resolvedTheme !== "dark") return null;

  // fixed + full viewport so the beams fill the whole screen, not just the content box.
  // `md:left-56` insets past the opaque w-56 desktop sidebar (mobile top bar sits at z-30,
  // above this z-0 layer, so it stays visible); content is `relative z-10` and paints on top.
  return (
    <div aria-hidden className="fixed inset-0 md:left-56 z-0 pointer-events-none opacity-70">
      <Beams
        beamWidth={2}
        beamHeight={22}
        beamNumber={12}
        lightColor="#47eafb"
        speed={2}
        noiseIntensity={1.5}
        scale={0.2}
        rotation={30}
      />
    </div>
  );
}
