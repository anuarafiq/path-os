import { redirect } from "next/navigation";
import { getSessionProfile, getCandidateProfile } from "@/lib/supabase/server";
import { CandidateSidebar } from "@/components/CandidateSidebar";

export default async function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");

  if (profile?.role === "employer") redirect("/employer/dashboard");

  const candidateProfile = profile ? await getCandidateProfile(profile.id) : null;

  return (
    <div className="flex min-h-screen bg-background">
      <CandidateSidebar
        name={candidateProfile?.name ?? user.email ?? ""}
        email={user.email ?? ""}
      />
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="h-12 md:hidden" aria-hidden="true" />
        {children}
      </main>
    </div>
  );
}
