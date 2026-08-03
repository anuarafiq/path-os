"use client";

import { useState } from "react";
import { CandidateSidebar } from "@/components/CandidateSidebar";
import { ChatPanel } from "@/components/ChatPanel";
import { CoachChat } from "@/components/CoachChat";
import { CoachPanelContext } from "@/components/CoachPanelContext";

export function CandidateShell({
  name,
  email,
  candidateProfile,
  children,
}: {
  name: string;
  email: string;
  candidateProfile: { name: string; seeking: string; job_title: string | null } | null;
  children: React.ReactNode;
}) {
  const [coachOpen, setCoachOpen] = useState(false);

  return (
    <div className="relative z-10 flex min-h-screen">
      <CandidateSidebar
        name={name}
        email={email}
        coachOpen={!!candidateProfile && coachOpen}
        onToggleCoach={candidateProfile ? () => setCoachOpen((o) => !o) : undefined}
      />
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="h-12 md:hidden" aria-hidden="true" />
        <CoachPanelContext.Provider value={candidateProfile ? () => setCoachOpen(true) : null}>
          {children}
        </CoachPanelContext.Provider>
      </main>
      {candidateProfile && (
        <ChatPanel open={coachOpen}>
          <CoachChat
            inPanel
            onClose={() => setCoachOpen(false)}
            candidateName={candidateProfile.name}
            seeking={candidateProfile.seeking}
            currentRole={candidateProfile.job_title}
          />
        </ChatPanel>
      )}
    </div>
  );
}
