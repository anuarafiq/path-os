import { redirect } from "next/navigation";
import { createClient, getSessionProfile, getCandidateProfile } from "@/lib/supabase/server";
import Link from "next/link";
import { Route, Bot, DollarSign, FolderKanban, Check, Circle, GraduationCap, Briefcase, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { HighlightGlowCard } from "@/components/HighlightGlowCard";
import { CoachDashboardTile } from "@/components/CoachDashboardTile";
import { DotGrid } from "@/components/DotGrid";

export default async function DashboardPage() {
  const { user, profile: sessionProfile } = await getSessionProfile();
  if (!user) redirect("/login");

  let profile = sessionProfile;
  if (!profile) {
    const supabase = await createClient();
    const { data: newProfile } = await supabase
      .from("profiles")
      .insert({ user_id: user.id, role: "candidate" })
      .select("id, role")
      .single();
    profile = newProfile;
  }

  if (!profile) redirect("/login");

  const candidate = await getCandidateProfile(profile.id);

  if (!candidate) redirect("/onboarding");

  const supabase = await createClient();

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
    { label: "Qualifications", value: qualCount ?? 0, icon: GraduationCap },
    { label: "Work experiences", value: workCount ?? 0, icon: Briefcase },
    { label: "Skills", value: skillCount ?? 0, icon: Sparkles },
  ];

  const quickActions = [
    { href: "/explore", label: "Explore career paths", desc: "See where you can go from here", icon: Route, coach: false },
    { href: "/coach", label: "Chat with AI Coach", desc: "Get personalised career advice", icon: Bot, coach: true },
    { href: "/pay", label: "Check your market rate", desc: "See salary benchmarks for your role", icon: DollarSign, coach: false },
    { href: "/portfolio", label: "View your portfolio", desc: "See how employers see your profile", icon: FolderKanban, coach: false },
  ];

  return (
    <div className="relative px-4 py-6 md:px-8 md:py-8">
      <DotGrid />
      <div className="relative z-10">
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

      {/* Profile completion — purple → pink gradient hero, collapses to a flat strip once complete */}
      {completionScore < 100 ? (
        <div
          className="bg-gradient-hero rounded-xl p-5 mb-8 shadow-hero animate-rise"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-semibold text-sm uppercase tracking-wider text-white/85 on-gradient">Profile strength</h2>
            <span className="tabular font-semibold text-sm text-white on-gradient">{completionScore}%</span>
          </div>
          <div className="h-1.5 bg-white/25 rounded-full mb-4 overflow-hidden">
            <div
              className="h-1.5 w-full bg-white rounded-full origin-left transition-transform duration-500"
              style={{ transform: `scaleX(${completionScore / 100})` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {completionItems.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm">
                {item.done ? (
                  <Check className="w-3.5 h-3.5 text-white shrink-0" aria-hidden="true" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-white/55 shrink-0" aria-hidden="true" />
                )}
                <span className={cn("on-gradient", item.done ? "text-white" : "text-white/70")}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="flex items-center gap-2 mb-8 px-1 text-sm text-muted-foreground animate-rise"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          <Check className="w-4 h-4 text-brand shrink-0" aria-hidden="true" />
          <span>Profile complete — all sections filled in</span>
        </div>
      )}

      {/* Stats row */}
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

      {/* Quick actions */}
      <div
        className="border border-border rounded-xl p-5 animate-rise"
        style={{ "--i": 5 } as React.CSSProperties}
      >
        <h2 className="font-heading font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">
          Quick actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {quickActions.map((action) => {
            if (action.coach) {
              return (
                <HighlightGlowCard key={action.href}>
                  <CoachDashboardTile label={action.label} desc={action.desc} />
                </HighlightGlowCard>
              );
            }
            return (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-start gap-4 rounded-lg p-4 transition-all duration-200 group hover:-translate-y-0.5 active:scale-[0.98] glass border border-transparent hover:border-brand/40 hover:bg-brand-subtle/30"
              >
                <action.icon className="w-5 h-5 mt-0.5 shrink-0 text-brand" aria-hidden="true" />
                <div>
                  <p className="font-medium text-sm text-foreground group-hover:text-brand transition-colors">
                    {action.label}
                  </p>
                  <p className="text-xs mt-0.5 text-muted-foreground">{action.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
}
