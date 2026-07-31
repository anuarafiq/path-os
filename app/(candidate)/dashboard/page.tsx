import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Route, Bot, DollarSign, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const stats = [
    { label: "Qualifications", value: qualCount ?? 0, accent: "text-brand" },
    { label: "Work experiences", value: workCount ?? 0, accent: "text-accent-purple" },
    { label: "Skills", value: skillCount ?? 0, accent: "text-accent-pink" },
  ];

  const quickActions = [
    { href: "/explore", label: "Explore career paths", desc: "See where you can go from here", icon: Route, coach: false },
    { href: "/coach", label: "Chat with AI Coach", desc: "Get personalised career advice", icon: Bot, coach: true },
    { href: "/pay", label: "Check your market rate", desc: "See salary benchmarks for your role", icon: DollarSign, coach: false },
    { href: "/portfolio", label: "View your portfolio", desc: "See how employers see your profile", icon: FolderKanban, coach: false },
  ];

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      {/* Welcome */}
      <div className="mb-8 animate-rise" style={{ "--i": 0 } as React.CSSProperties}>
        <h1 className="font-heading text-4xl font-bold mb-1">
          Welcome back, {candidate.name.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground text-sm">
          {candidate.seeking === "internship" ? "Internship seeker" : "Looking for a full-time role"}
          {candidate.job_title ? ` · ${candidate.job_title}` : ""}
          {candidate.location ? ` · ${candidate.location}` : ""}
        </p>
      </div>

      {/* Profile completion — purple → pink gradient hero */}
      <div
        className="bg-gradient-hero rounded-xl p-5 mb-8 shadow-hero animate-rise"
        style={{ "--i": 1 } as React.CSSProperties}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-semibold text-sm uppercase tracking-wider text-white/85 on-gradient">Profile strength</h2>
          <span className="tabular font-semibold text-sm text-white on-gradient">{completionScore}%</span>
        </div>
        <div className="h-1.5 bg-white/25 rounded-full mb-4">
          <div
            className="h-1.5 bg-white rounded-full transition-all"
            style={{ width: `${completionScore}%` }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {completionItems.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-sm">
              <span className={item.done ? "text-white" : "text-white/55"}>
                {item.done ? "✓" : "○"}
              </span>
              <span className={cn("on-gradient", item.done ? "text-white" : "text-white/70")}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="bg-card border border-border rounded-lg px-5 py-4 shadow-card animate-rise"
            style={{ "--i": 2 + i } as React.CSSProperties}
          >
            <p className={cn("tabular text-2xl font-bold font-heading mb-0.5", stat.accent)}>{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div
        className="border border-border rounded-xl p-5 animate-rise"
        style={{ "--i": 5 } as React.CSSProperties}
      >
        <h2 className="font-heading font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">
          Quick actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                "flex items-start gap-4 rounded-lg p-4 transition-all duration-200 group hover:-translate-y-0.5 active:scale-[0.98]",
                action.coach
                  ? "bg-gradient-coach shadow-card hover:brightness-105"
                  : "bg-accent-amber-subtle border border-transparent hover:border-accent-amber/50"
              )}
            >
              <action.icon
                className={cn("w-5 h-5 mt-0.5 shrink-0", action.coach ? "text-white" : "text-accent-amber-ink")}
                aria-hidden="true"
              />
              <div>
                <p className={cn("font-medium text-sm", action.coach ? "text-white on-gradient" : "text-foreground")}>
                  {action.label}
                </p>
                <p className={cn("text-xs mt-0.5", action.coach ? "text-white/85 on-gradient" : "text-muted-foreground")}>
                  {action.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
