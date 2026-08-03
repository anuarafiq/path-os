"use client";

import { useCallback, useId, useRef, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { useTheme } from "next-themes";

// Sun and moon share one identical centre disc — same centre, same radius, same fill.
// The sun adds rays; the moon punches an offset circle out of the disc via a mask.
// Cross-fading two frames whose shared parts are pixel-identical morphs only the parts
// that differ, so the disc reads as one continuous shape while the rays and the crescent
// notch resolve around it. The view transition below leans on exactly that.
const DISC_R = 6;
const RAY_INNER = 8;
const RAY_OUTER = 10.3;

const RAYS = [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
  const rad = (deg * Math.PI) / 180;
  const sin = Math.sin(rad);
  const cos = Math.cos(rad);
  return {
    x1: 12 + RAY_INNER * sin,
    y1: 12 - RAY_INNER * cos,
    x2: 12 + RAY_OUTER * sin,
    y2: 12 - RAY_OUTER * cos,
  };
});

// Matches the wipe duration in globals.css. Only used to swallow repeat clicks.
const WIPE_MS = 600;

// Hydration-safe mount flag — same pattern (and same reasoning) as components/PageBeams.tsx:
// returns false on the server and on the first client render, true after hydration. This is
// the lint-clean alternative to the setState-in-effect mount guard the React Compiler flags.
const emptySubscribe = () => () => {};
function useHydrated() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useHydrated();
  const iconRef = useRef<SVGSVGElement>(null);
  const lastToggle = useRef(0);
  // useId can contain characters that are awkward in a url(#…) reference, and the sidebars
  // mount two instances at once — strip it down and keep the id unique.
  const maskId = `theme-icon-mask-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  const isDark = hydrated ? resolvedTheme === "dark" : true;

  const toggle = useCallback(() => {
    const next = resolvedTheme === "dark" ? "light" : "dark";

    // A second startViewTransition while one is in flight skips the first mid-animation
    // and flashes, so swallow repeat clicks. This is deliberately a clock and not a
    // "transition is running" flag: a stalled transition (backgrounded tab pauses its
    // animations) never settles `finished`, and a flag cleared there would leave the
    // toggle permanently dead. A timestamp always expires.
    const now = performance.now();
    if (now - lastToggle.current < WIPE_MS) return;
    lastToggle.current = now;

    const icon = iconRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || typeof document.startViewTransition !== "function" || !icon) {
      setTheme(next);
      return;
    }

    // Farthest-corner radius, so the circle fully clears the viewport from any origin.
    const rect = icon.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const radius = Math.hypot(
      Math.max(cx, window.innerWidth - cx),
      Math.max(cy, window.innerHeight - cy)
    );

    const root = document.documentElement;
    root.style.setProperty("--vt-x", `${cx}px`);
    root.style.setProperty("--vt-y", `${cy}px`);
    root.style.setProperty("--vt-r", `${radius}px`);

    // Named imperatively, on the clicked icon only: a duplicate view-transition-name
    // across two *rendered* elements aborts the whole transition, and both sidebar
    // instances (desktop aside + mobile drawer) are in the tree at the same time.
    icon.style.setProperty("view-transition-name", "theme-toggle");

    // flushSync is required — startViewTransition snapshots as soon as its callback
    // returns, and a bare setTheme would not have reached the DOM by then.
    const transition = document.startViewTransition(() => {
      flushSync(() => setTheme(next));
    });

    // Best-effort tidy-up. If this never runs the leftover inline style is harmless:
    // only one of the two sidebar instances is ever displayed, and an element that
    // generates no box is not captured and so cannot collide.
    transition.finished.finally(() => {
      icon.style.removeProperty("view-transition-name");
    });
  }, [resolvedTheme, setTheme]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
    >
      <svg
        ref={iconRef}
        viewBox="0 0 24 24"
        className="theme-icon w-[14px] h-[14px]"
        data-state={isDark ? "sun" : "moon"}
        aria-hidden="true"
      >
        {/* userSpaceOnUse with room to spare: the notch parks well outside the disc in the
            sun state, and an objectBoundingBox mask region would clip it on the way in. */}
        <mask id={maskId} maskUnits="userSpaceOnUse" x="-8" y="-8" width="40" height="40">
          <rect x="-8" y="-8" width="40" height="40" fill="white" />
          <circle className="theme-icon-notch" cx="15.9" cy="8.1" r="6" fill="black" />
        </mask>
        <circle cx="12" cy="12" r={DISC_R} fill="currentColor" mask={`url(#${maskId})`} />
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {RAYS.map((ray, i) => (
            <line
              key={i}
              className="theme-icon-ray"
              style={{ "--r": i } as React.CSSProperties}
              x1={ray.x1}
              y1={ray.y1}
              x2={ray.x2}
              y2={ray.y2}
            />
          ))}
        </g>
      </svg>
    </button>
  );
}
