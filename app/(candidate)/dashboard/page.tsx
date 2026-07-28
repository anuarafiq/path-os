import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Route, Bot, DollarSign, FolderKanban } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    const { data: newProfile } = await supabase
      .from("profiles")
      .insert({ user_id: user.id, role: "candidate" })
      .select("id")
      .single();
    profile = newProfile;
  }

  if (!profile) redirect("/login");

  const { data: candidate } = await supabase
    .from("candidate_profiles")
    .select("id, name, seeking, job_title, years_exp, location")
    .eq("profile_id", profile.id)
    .single();

  if (!candidate) redirect("/onboarding");

  const [
    { count: qualCount },
    { count: workCount },
    { count: skillCount },
  ] = await Promise.all([
    supabase.from("qualifications").select("id", { count: "exact", head: true }).eq("candidate_id", candidate.id),
    supabase.from("work_experiences").select("id", { count: "exact", head: true }).eq("candidate_id", candidate.id),
    supabase.from("candidate_skills").select("id", { count: "exact", head: true }).eq("candidate_id", candidate.id),
  ]);

  const completionItems = [
    { label: "Profile info", done: !!(candidate.name && candidate.location) },
    { label: "Qualifications", done: (qualCount ?? 0) > 0 },
    { label: "Work experience", done: (workCount ?? 0) > 0 },
    { label: "Skills added", done: (skillCount ?? 0) > 0 },
  ];
  const completionScore = Math.round((completionItems.filter((i) => i.done).length / completionItems.length) * 100);

  const quickActions = [
    { href: "/explore", label: "Explore career paths", desc: "See where you can go from here", icon: Route },
    { href: "/coach", label: "Chat with AI Coach", desc: "Get personalised career advice", icon: Bot },
    { href: "/pay", label: "Check your market rate", desc: "See salary benchmarks for your role", icon: DollarSign },
    { href: "/portfolio", label: "View your portfolio", desc: "See how employers see your profile", icon: FolderKanban },
  ];

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold mb-1">
          Welcome back, {candidate.name.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground text-sm">
          {candidate.seeking === "internship" ? "Internship seeker" : "Looking for a full-time role"}
          {candidate.job_title ? ` · ${candidate.job_title}` : ""}
          {candidate.location ? ` · ${candidate.location}` : ""}
        </p>
      </div>

      {/* Profile completion */}
      <div className="bg-card border border-border rounded-lg p-5 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-semibold text-sm uppercase tracking-wider text-muted-foreground">Profile strength</h2>
          <span className="text-brand tabular font-semibold text-sm">{completionScore}%</span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full mb-4">
          <div
            className="h-1.5 bg-brand rounded-full transition-all"
            style={{ width: `${completionScore}%` }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {completionItems.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm">
              <span className={item.done ? "text-success" : "text-muted-foreground"}>
                {item.done ? "✓" : "○"}
              </span>
              <span className={item.done ? "text-foreground" : "text-muted-foreground"}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Qualifications", value: qualCount ?? 0 },
          { label: "Work experiences", value: workCount ?? 0 },
          { label: "Skills", value: skillCount ?? 0 },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-lg px-5 py-4">
            <p className="text-brand tabular text-2xl font-bold font-heading mb-0.5">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <h2 className="font-heading font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">
        Quick actions
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-start gap-4 bg-card border border-border rounded-lg p-4 hover:border-brand/40 hover:bg-brand-subtle/30 transition-all group"
          >
            <action.icon className="w-5 h-5 text-brand mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-medium text-sm text-foreground group-hover:text-brand transition-colors">{action.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{action.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
