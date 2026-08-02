"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import BorderGlow from "./BorderGlow";

const GLOW = {
  light: { glowColor: "181 100% 32%", colors: ["#009fa3", "#854ece", "#da4390"] },
  dark: { glowColor: "181 100% 42%", colors: ["#00d3d6", "#a06be0", "#e968a8"] },
};

export function HighlightGlowCard({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const palette = mounted && resolvedTheme === "dark" ? GLOW.dark : GLOW.light;

  return (
    <BorderGlow
      backgroundColor="transparent"
      borderRadius={8}
      glowRadius={14}
      glowIntensity={0.9}
      coneSpread={30}
      edgeSensitivity={35}
      animated={false}
      glowColor={palette.glowColor}
      colors={palette.colors}
      fillOpacity={0}
    >
      {children}
    </BorderGlow>
  );
}
