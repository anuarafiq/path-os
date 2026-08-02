import { redirect } from "next/navigation";
import { createClient, getSessionProfile, getEmployerProfile } from "@/lib/supabase/server";
import PipelineBoard from "./PipelineBoard";

export default async function PipelinePage() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");

  const employer = profile ? await getEmployerProfile(profile.id) : null;

  if (!employer) redirect("/employer/dashboard");

  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title")
    .eq("employer_id", employer.id)
    .eq("status", "open");

  const { data: applications } = await supabase
    .from("applications")
    .select("id, status, job_id, candidate_profiles(name, job_title)")
    .in("job_id", (jobs ?? []).map((j) => j.id));

  const serializedApps = (applications ?? []).map((a) => ({
    id: a.id,
    status: a.status,
    job_id: a.job_id,
    candidate: (a.candidate_profiles as unknown as { name: string; job_title: string | null } | null),
  }));

  const serializedJobs = (jobs ?? []).map((j) => ({ id: j.id, title: j.title }));

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <h1 className="font-heading text-3xl font-bold mb-1">Pipeline</h1>
      <p className="text-muted-foreground text-sm mb-8">
        {serializedApps.length} application{serializedApps.length !== 1 ? "s" : ""} across {serializedJobs.length} open role{serializedJobs.length !== 1 ? "s" : ""}
      </p>

      {serializedApps.length === 0 ? (
        <div className="glass border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground text-sm">No applications yet — candidates will appear here once they apply.</p>
        </div>
      ) : (
        <PipelineBoard initialApps={serializedApps} jobs={serializedJobs} />
      )}
    </div>
  );
}
