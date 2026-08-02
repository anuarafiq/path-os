import { redirect } from "next/navigation";
import { createClient, getSessionProfile, getEmployerProfile } from "@/lib/supabase/server";
import Link from "next/link";
import { UserSearch, KanbanSquare, RefreshCw, Briefcase, Users, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { HighlightGlowCard } from "@/components/HighlightGlowCard";
import { DotGrid } from "@/components/DotGrid";

export default async function EmployerDashboard() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");

  const employer = profile ? await getEmployerProfile(profile.id) : null;

  if (!employer) {
    return (
      <div className="px-4 py-6 md:px-8 md:py-8">
        <h1 className="font-heading text-2xl font-bold mb-4">Complete your company profile</h1>
        <p className="text-muted-foreground text-sm mb-6">Set up your employer profile to start finding talent.</p>
        <Link href="/employer/setup" className="bg-primary text-primary-foreground px-6 py-2.5 rounded-md text-sm font-medium hover:opacity-90 transition-opacity">
          Set up profile
        </Link>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ count: jobCount }, { data: employerJobs }, { count: poolCount }] = await Promise.all([
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("employer_id", employer.id).eq("status", "open"),
    supabase.from("jobs").select("id").eq("employer_id", employer.id),
    supabase.from("talent_pools").select("id", { count: "exact", head: true }).eq("employer_id", employer.id),
  ]);

  const { count: appCount } = await supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .in("job_id", (employerJobs ?? []).map((j) => j.id));

  const stats = [
    { label: "Open jobs", value: jobCount ?? 0, icon: Briefcase },
    { label: "Total applications", value: appCount ?? 0, icon: Users },
    { label: "Talent pool", value: poolCount ?? 0, icon: Database },
  ];

  const actions = [
    { href: "/employer/search", label: "Find talent", desc: "AI-powered candidate matching", icon: UserSearch, highlight: true },
    { href: "/employer/pipeline", label: "Review pipeline", desc: "Manage applicants by role", icon: KanbanSquare, highlight: false },
    { href: "/employer/re-engage", label: "Re-engage talent", desc: "Surface past candidates for new roles", icon: RefreshCw, highlight: false },
  ];

  return (
    <div className="relative px-4 py-6 md:px-8 md:py-8">
      <DotGrid />
      <div className="relative z-10">
      {/* Welcome — mirrors the candidate dashboard's greeting */}
      <div className="mb-8 animate-rise" style={{ "--i": 0 } as React.CSSProperties}>
        <h1 className="font-heading text-4xl font-bold mb-1">Welcome back</h1>
        <p className="text-muted-foreground text-sm">{employer.company_name}</p>
      </div>

      {/* Hiring snapshot — purple → pink gradient hero, mirrors the candidate dashboard's hero card */}
      <div
        className="bg-gradient-hero rounded-xl p-5 mb-8 shadow-hero animate-rise"
        style={{ "--i": 1 } as React.CSSProperties}
      >
        <h2 className="font-heading font-semibold text-sm uppercase tracking-wider text-white/85 on-gradient mb-2">Hiring snapshot</h2>
        <p className="text-sm text-white/85 on-gradient">
          {jobCount ?? 0} open role{(jobCount ?? 0) === 1 ? "" : "s"} · {appCount ?? 0} applicant{(appCount ?? 0) === 1 ? "" : "s"} so far
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="glass border border-border rounded-lg px-5 py-4 animate-rise"
            style={{ "--i": 2 + i } as React.CSSProperties}
          >
            <div className="w-8 h-8 rounded-md bg-brand-subtle flex items-center justify-center mb-3">
              <stat.icon className="w-4 h-4 text-brand" aria-hidden="true" />
            </div>
            <p className="tabular text-2xl font-bold font-heading mb-0.5 text-brand">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div
        className="border border-border rounded-xl p-5 animate-rise"
        style={{ "--i": 5 } as React.CSSProperties}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-semibold text-sm uppercase tracking-wider text-muted-foreground">Actions</h2>
          <Link href="/employer/jobs/new" className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold hover:opacity-90 transition-opacity">
            + Post a job
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map((a) => {
            const tile = (
              <Link
                key={a.href}
                href={a.href}
                className={cn(
                  "flex items-start gap-4 rounded-lg p-4 transition-all duration-200 group hover:-translate-y-0.5 active:scale-[0.98]",
                  a.highlight
                    ? "bg-gradient-coach shadow-card hover:brightness-105"
                    : "glass border border-transparent hover:border-brand/40 hover:bg-brand-subtle/30"
                )}
              >
                <a.icon
                  className={cn("w-5 h-5 mt-0.5 shrink-0", a.highlight ? "text-white" : "text-brand")}
                  aria-hidden="true"
                />
                <div>
                  <p className={cn("font-medium text-sm", a.highlight ? "text-white on-gradient" : "text-foreground group-hover:text-brand transition-colors")}>
                    {a.label}
                  </p>
                  <p className={cn("text-xs mt-0.5", a.highlight ? "text-white/85 on-gradient" : "text-muted-foreground")}>
                    {a.desc}
                  </p>
                </div>
              </Link>
            );
            return a.highlight ? (
              <HighlightGlowCard key={a.href}>{tile}</HighlightGlowCard>
            ) : (
              tile
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
}
