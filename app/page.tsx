import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import DemoLogin from "@/components/DemoLogin";
import { DotGrid } from "@/components/DotGrid";
import Prism from "@/components/Prism";
import { Route, Bot, DollarSign, FolderKanban, UserSearch, RefreshCw } from "lucide-react";

export default function Home() {
  return (
    <main className="relative z-10 min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-4 md:px-8 py-5 border-b border-border">
        <Logo size={112} className="rounded-sm" />
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 transition-opacity font-medium"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden isolate flex-1 flex flex-col items-center justify-center px-4 md:px-8 py-24 text-center">
        <DotGrid />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_55%_45%_at_50%_0%,var(--brand-subtle),transparent_70%)]"
        />
        <div aria-hidden className="absolute inset-0 -z-10 pointer-events-none">
          <Prism
            animationType="rotate"
            timeScale={0.35}
            height={3.2}
            baseWidth={5}
            scale={3.2}
            hueShift={1.65}
            colorFrequency={0.8}
            noise={0.2}
            glow={0.5}
            transparent
          />
        </div>
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_62%_82%_at_50%_46%,var(--background)_0%,var(--background)_45%,transparent_82%)] opacity-95"
        />
        <div
          className="animate-rise inline-flex items-center gap-2 text-xs font-medium text-brand bg-brand-subtle px-3 py-1.5 rounded-full mb-8 tracking-wide uppercase"
          style={{ "--i": 0 } as React.CSSProperties}
        >
          Path OS
        </div>

        <h1
          className="animate-rise hero-text-shadow font-heading text-5xl md:text-7xl font-bold tracking-tight leading-[1.08] max-w-4xl mb-6"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          Navigate your career.{" "}
          <br />
          <span className="text-brand">See where you can go.</span>
        </h1>

        <p
          className="animate-rise hero-text-shadow text-foreground/80 text-lg md:text-xl max-w-2xl leading-relaxed mb-12"
          style={{ "--i": 2 } as React.CSSProperties}
        >
          Realistic career paths, salary benchmarks, and an AI coach that knows
          your profile — built for talent across Asia.
        </p>

        <DemoLogin />

        <p className="hero-text-shadow text-xs text-foreground/70 mt-5">
          Building your own profile?{" "}
          <Link
            href="/signup?role=candidate"
            className="text-brand hover:text-brand-dim underline-offset-2 hover:underline transition-colors"
          >
            Sign up as candidate
          </Link>
          {" · "}
          <Link
            href="/signup?role=employer"
            className="text-brand hover:text-brand-dim underline-offset-2 hover:underline transition-colors"
          >
            or as employer
          </Link>
        </p>
      </section>

      {/* Demo Walkthrough */}
      <section className="px-4 md:px-8 pb-16">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-medium text-brand bg-brand-subtle px-3 py-1.5 rounded-full uppercase tracking-wide inline-flex mb-6">
            2-minute walkthrough
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass border border-border rounded-lg p-6 flex flex-col gap-5">
              <div>
                <p className="text-xs font-medium text-brand uppercase tracking-widest mb-1">Candidate</p>
                <h3 className="font-heading font-semibold text-foreground text-lg">Ahmad Chicken</h3>
                <p className="text-sm text-muted-foreground mt-1">UTM CS student · Grab intern · 5 skills · Coursera cert</p>
              </div>
              <ol className="flex flex-col gap-4">
                {candidateSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-brand-subtle text-brand text-xs font-semibold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{step.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="glass border border-border rounded-lg p-6 flex flex-col gap-5">
              <div>
                <p className="text-xs font-medium text-brand uppercase tracking-widest mb-1">Employer</p>
                <h3 className="font-heading font-semibold text-foreground text-lg">TechCorp Malaysia</h3>
                <p className="text-sm text-muted-foreground mt-1">3 open roles · 1 candidate in pipeline · talent pool seeded</p>
              </div>
              <ol className="flex flex-col gap-4">
                {employerSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-brand-subtle text-brand text-xs font-semibold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{step.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="px-4 md:px-8 pb-24">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="glass border border-border rounded-lg p-6"
            >
              <f.icon className="w-6 h-6 text-brand mb-3" aria-hidden="true" />
              <h3 className="font-heading font-semibold text-foreground mb-1.5">
                {f.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-4 md:px-8 py-6 text-center text-xs text-muted-foreground">
        Path OS
      </footer>
    </main>
  );
}

const features = [
  {
    icon: Route,
    title: "Career Path Navigator",
    desc: "See realistic role-to-role transitions, skill gaps, and salary deltas — across 30+ APAC career paths.",
  },
  {
    icon: Bot,
    title: "AI Career Coach",
    desc: "A coach that reads your full profile and gives context-aware next steps, not generic advice.",
  },
  {
    icon: DollarSign,
    title: "Fair Pay Engine",
    desc: "Know your market value. P25/P50/P75 salary benchmarks by role, location, and experience band.",
  },
  {
    icon: FolderKanban,
    title: "Living Portfolio",
    desc: "A dynamic profile that evolves with your skills, qualifications, and projects — shareable as a public page.",
  },
  {
    icon: UserSearch,
    title: "Smart Talent Matching",
    desc: "For employers: describe a role in plain language, get an AI-ranked shortlist with fit explanations.",
  },
  {
    icon: RefreshCw,
    title: "Talent Re-Engagement",
    desc: "Surface past applicants and alumni who are now a strong fit for new open roles.",
  },
];

const candidateSteps = [
  {
    label: "Explore Paths",
    desc: "Career Path Navigator — see role transitions from Junior Dev to Senior or PM, with skill gaps and salary deltas.",
  },
  {
    label: "Check Fair Pay",
    desc: "Fair Pay Engine — view P25/P50/P75 benchmarks for your current role by location and experience band.",
  },
  {
    label: "Chat with your Coach",
    desc: 'AI Career Coach — ask "What should I learn next?" The coach reads Ahmad\'s actual profile, not a template.',
  },
  {
    label: "Browse & Track",
    desc: "Jobs — browse open roles and apply. My Applications — see the status of an existing application.",
  },
];

const employerSteps = [
  {
    label: "Find Talent",
    desc: "Smart search — describe a role in plain language, get an AI-ranked shortlist with per-candidate fit notes.",
  },
  {
    label: "Work the Pipeline",
    desc: "Pipeline — move Ahmad's application through Applied → Reviewed → Shortlisted using the kanban board.",
  },
  {
    label: "Re-Engage past candidates",
    desc: "Re-Engage — AI surfaces talent pool members who now match your open roles, with a ready outreach draft.",
  },
  {
    label: "Manage Jobs",
    desc: "Jobs — view TechCorp's 3 posted roles and see which have active applicants.",
  },
];
