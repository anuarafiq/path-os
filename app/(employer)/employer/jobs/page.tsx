import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  internship: "Internship",
  contract: "Contract",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function EmployerJobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const { data: employer } = await supabase
    .from("employer_profiles")
    .select("id")
    .eq("profile_id", profile?.id ?? "")
    .single();

  if (!employer) redirect("/employer/setup");

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, location, employment_type, status, created_at")
    .eq("employer_id", employer.id)
    .order("created_at", { ascending: false });

  const jobIds = jobs?.map((j) => j.id) ?? [];

  const { data: applications } =
    jobIds.length > 0
      ? await supabase.from("applications").select("id, job_id").in("job_id", jobIds)
      : { data: [] };

  const appCountByJob: Record<string, number> = {};
  for (const app of applications ?? []) {
    appCountByJob[app.job_id] = (appCountByJob[app.job_id] ?? 0) + 1;
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold mb-1">Jobs</h1>
          <p className="text-muted-foreground text-sm">
            {jobs?.length ?? 0} posting{(jobs?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/employer/jobs/new"
          className="bg-brand text-background px-4 py-2 rounded-md text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          + Post a job
        </Link>
      </div>

      {!jobs?.length ? (
        <div className="glass border border-border rounded-lg px-6 py-10 text-center">
          <p className="text-muted-foreground text-sm mb-4">No jobs posted yet.</p>
          <Link
            href="/employer/jobs/new"
            className="text-sm text-brand hover:underline font-medium"
          >
            Post your first job →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="glass border border-border rounded-lg px-5 py-4 flex items-center justify-between"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{job.title}</p>
                <p className="text-xs text-muted-foreground">
                  {job.location} · {EMPLOYMENT_TYPE_LABELS[job.employment_type] ?? job.employment_type}
                  {appCountByJob[job.id]
                    ? ` · ${appCountByJob[job.id]} applicant${appCountByJob[job.id] !== 1 ? "s" : ""}`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                <Badge
                  variant={job.status === "open" ? "default" : "outline"}
                  className={job.status === "open" ? "bg-brand/20 text-brand border-brand/30" : ""}
                >
                  {job.status}
                </Badge>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatDate(job.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
