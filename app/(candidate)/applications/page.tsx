import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type ApplicationStatus = "applied" | "reviewed" | "shortlisted" | "offered" | "rejected";

type ApplicationRow = {
  id: string;
  status: ApplicationStatus;
  applied_at: string;
  jobs: {
    title: string;
    location: string;
    employment_type: string;
    employer_profiles: { company_name: string } | null;
  } | null;
};

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; className: string }> = {
  applied:     { label: "Applied",     className: "bg-brand-subtle text-brand" },
  reviewed:    { label: "Reviewed",    className: "bg-muted text-muted-foreground" },
  shortlisted: { label: "Shortlisted", className: "bg-success/10 text-success" },
  offered:     { label: "Offered",     className: "bg-success/20 text-success font-semibold" },
  rejected:    { label: "Rejected",    className: "bg-destructive/10 text-destructive" },
};

function formatDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (diff < 3_600_000)      return rtf.format(-Math.floor(diff / 60_000), "minute");
  if (diff < 86_400_000)     return rtf.format(-Math.floor(diff / 3_600_000), "hour");
  if (diff < 7 * 86_400_000) return rtf.format(-Math.floor(diff / 86_400_000), "day");
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

export default async function ApplicationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
  if (!profile) redirect("/login");

  const { data: candidate } = await supabase
    .from("candidate_profiles")
    .select("id")
    .eq("profile_id", profile.id)
    .single();

  if (!candidate) redirect("/onboarding");

  const { data: applications } = await supabase
    .from("applications")
    .select(`
      id,
      status,
      applied_at,
      jobs (
        title,
        location,
        employment_type,
        employer_profiles ( company_name )
      )
    `)
    .eq("candidate_id", candidate.id)
    .order("applied_at", { ascending: false });

  const rows = (applications ?? []) as unknown as ApplicationRow[];

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="font-heading text-2xl font-semibold text-foreground mb-6">My Applications</h1>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
          <p className="text-muted-foreground">No applications yet.</p>
          <Link href="/jobs" className="text-brand text-sm hover:text-brand-dim transition-colors">
            Browse open jobs →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => {
            const job = row.jobs;
            const badge = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.applied;
            return (
              <div
                key={row.id}
                className="rounded-lg border border-[--border-subtle] glass p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="font-medium text-foreground leading-snug">
                    {job?.title ?? "Unknown position"}
                  </p>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded font-medium ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 mt-1.5">
                  <p className="text-sm text-muted-foreground">
                    {job?.employer_profiles?.company_name ?? "—"}
                    {job?.location ? ` · ${job.location}` : ""}
                    {job?.employment_type
                      ? ` · ${job.employment_type.replace(/_/g, " ")}`
                      : ""}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums shrink-0">
                    {formatDate(row.applied_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
