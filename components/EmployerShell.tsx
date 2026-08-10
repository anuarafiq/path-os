"use client";

import { useState } from "react";
import { EmployerSidebar } from "@/components/EmployerSidebar";
import { ChatPanel } from "@/components/ChatPanel";
import { EmployerCoach } from "@/components/EmployerCoach";

export function EmployerShell({
  companyName,
  email,
  employerProfile,
  children,
}: {
  companyName: string;
  email: string;
  employerProfile: { company_name: string } | null;
  children: React.ReactNode;
}) {
  const [coachOpen, setCoachOpen] = useState(false);

  return (
    <div className="relative z-10 flex min-h-screen">
      <EmployerSidebar
        companyName={companyName}
        email={email}
        coachOpen={!!employerProfile && coachOpen}
        onToggleCoach={employerProfile ? () => setCoachOpen((o) => !o) : undefined}
      />
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="h-16 md:hidden" aria-hidden="true" />
        {children}
      </main>
      {employerProfile && (
        <ChatPanel open={coachOpen}>
          <EmployerCoach
            inPanel
            onClose={() => setCoachOpen(false)}
            companyName={employerProfile.company_name}
          />
        </ChatPanel>
      )}
    </div>
  );
}
