import { redirect } from "next/navigation";
import { createClient, getSessionProfile, getCandidateProfile } from "@/lib/supabase/server";
import JobsClientView from "./JobsClientView";

export default async function JobsPage() {
  const supabase = await createClient();

  const [{ data: jobs }, { user, profile }] = await Promise.all([
    supabase
      .from("jobs")
      .select("*, employer_profiles(company_name)")
      .eq("status", "open")
      .order("created_at", { ascending: false }),
    getSessionProfile(),
  ]);

  if (!user) redirect("/login");

  const candidateProfile = profile ? await getCandidateProfile(profile.id) : null;

  const { data: existingApplications } = candidateProfile
    ? await supabase
        .from("applications")
        .select("job_id")
        .eq("candidate_id", candidateProfile.id)
    : { data: [] };

  const appliedJobIds = new Set((existingApplications ?? []).map((a) => a.job_id));

  const allJobs = jobs ?? [];
  const allSkills = [...new Set(allJobs.flatMap((j) => j.required_skills ?? []))].sort();

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <h1 className="font-heading text-3xl font-bold mb-1">Job Board</h1>
      <p className="text-muted-foreground text-sm mb-6">Open opportunities matched to your profile.</p>

      {allJobs.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground text-sm">No open jobs yet — check back soon.</p>
        </div>
      ) : (
        <JobsClientView
          jobs={allJobs as any}
          appliedJobIds={appliedJobIds}
          candidateProfileId={candidateProfile?.id ?? null}
          allSkills={allSkills}
        />
      )}
    </div>
  );
}
