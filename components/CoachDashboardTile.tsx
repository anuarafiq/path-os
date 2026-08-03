"use client";

import { Bot } from "lucide-react";
import { useCoachPanel } from "@/components/CoachPanelContext";

export function CoachDashboardTile({ label, desc }: { label: string; desc: string }) {
  const openCoach = useCoachPanel();

  return (
    <button
      type="button"
      onClick={() => openCoach?.()}
      className="flex items-start gap-4 rounded-lg p-4 transition-all duration-200 group hover:-translate-y-0.5 active:scale-[0.98] bg-gradient-coach shadow-card hover:brightness-105 text-left w-full"
    >
      <Bot className="w-5 h-5 mt-0.5 shrink-0 text-white" aria-hidden="true" />
      <div>
        <p className="font-medium text-sm text-white on-gradient">{label}</p>
        <p className="text-xs mt-0.5 text-white/85 on-gradient">{desc}</p>
      </div>
    </button>
  );
}
