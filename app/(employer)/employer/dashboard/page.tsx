import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { UserSearch, KanbanSquare, RefreshCw } from "lucide-react";

export default async function EmployerDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
  const { data: employer } = await supabase.from("employer_profiles").select("id, company_name").eq("profile_id", profile?.id ?? "").single();

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

  const [{ count: jobCount }, { count: appCount }, { count: poolCount }] = await Promise.all([
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("employer_id", employer.id).eq("status", "open"),
    supabase.from("applications").select("id", { count: "exact", head: true }).in("job_id",
      (await supabase.from("jobs").select("id").eq("employer_id", employer.id)).data?.map((j) => j.id) ?? []
    ),
    supabase.from("talent_pools").select("id", { count: "exact", head: true }).eq("employer_id", employer.id),
  ]);

  const actions = [
    { href: "/employer/search", label: "Find talent", desc: "AI-powered candidate matching", icon: UserSearch },
    { href: "/employer/pipeline", label: "Review pipeline", desc: "Manage applicants by role", icon: KanbanSquare },
    { href: "/employer/re-engage", label: "Re-engage talent", desc: "Surface past candidates for new roles", icon: RefreshCw },
  ];

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <h1 className="font-heading text-3xl font-bold mb-1">{employer.company_name}</h1>
      <p className="text-muted-foreground text-sm mb-8">Employer dashboard</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Open jobs", value: jobCount ?? 0 },
          { label: "Total applications", value: appCount ?? 0 },
          { label: "Talent pool", value: poolCount ?? 0 },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-lg px-5 py-4">
            <p className="text-brand tabular text-2xl font-bold font-heading mb-0.5">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-heading font-semibold text-sm uppercase tracking-wider text-muted-foreground">Actions</h2>
        <Link href="/employer/jobs/new" className="bg-brand text-background px-4 py-2 rounded-md text-sm font-semibold hover:opacity-90 transition-opacity">
          + Post a job
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {actions.map((a) => (
          <Link key={a.href} href={a.href} className="flex items-start gap-4 bg-card border border-border rounded-lg p-4 hover:border-brand/40 hover:bg-brand-subtle/30 transition-all group">
            <a.icon className="w-5 h-5 text-brand mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-medium text-sm text-foreground group-hover:text-brand transition-colors">{a.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
