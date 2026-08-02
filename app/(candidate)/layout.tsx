import { redirect } from "next/navigation";
import { getSessionProfile, getCandidateProfile } from "@/lib/supabase/server";
import { CandidateShell } from "@/components/CandidateShell";

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
    <CandidateShell
      name={candidateProfile?.name ?? user.email ?? ""}
      email={user.email ?? ""}
      candidateProfile={candidateProfile}
    >
      {children}
    </CandidateShell>
  );
}
