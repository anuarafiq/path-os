import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

type Props = { params: Promise<{ candidateId: string }> };

// Shape returned by the get_public_portfolio RPC (security-definer, is_public-gated).
type PortfolioData = {
  candidate: {
    id: string; name: string; location: string | null; bio: string | null;
    github_url: string | null; linkedin_url: string | null; seeking: string;
    job_title: string | null; years_exp: number | null;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  qualifications: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  work_experiences: any[];
  skills: { level: string; skills: { name: string; category: string } | null }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  portfolio_items: any[];
};

async function fetchPortfolio(candidateId: string): Promise<PortfolioData | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_portfolio", { p_id: candidateId });
  return (data as PortfolioData | null) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { candidateId } = await params;
  const data = await fetchPortfolio(candidateId);
  if (!data) return { title: "Portfolio — Path OS" };
  const { name, bio } = data.candidate;
  return {
    title: `${name} — Path OS Portfolio`,
    description: bio ?? `View ${name}'s professional portfolio on Path OS.`,
  };
}

export default async function PublicPortfolioPage({ params }: Props) {
  const { candidateId } = await params;

  const data = await fetchPortfolio(candidateId);
  if (!data) notFound();

  const candidate = data.candidate;
  const quals = data.qualifications;
  const work = data.work_experiences;
  const skills = data.skills;
  const portfolio = data.portfolio_items;

  const skillsByCategory = (skills ?? []).reduce<Record<string, { name: string; level: string }[]>>((acc, s) => {
    const skill = (s.skills as unknown) as { name: string; category: string } | null;
    if (!skill) return acc;
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push({ name: skill.name, level: s.level });
    return acc;
  }, {});

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      {/* Minimal nav */}
      <header className="border-b" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-4">
          <a href="/" className="font-heading font-bold text-sm" style={{ color: "var(--brand)" }}>
            Path OS
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-heading text-3xl font-bold mb-1" style={{ color: "var(--foreground)" }}>
              {candidate.name}
            </h1>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              {candidate.seeking === "internship" ? "Seeking internship" : candidate.job_title ?? "Open to opportunities"}
              {candidate.location ? ` · ${candidate.location}` : ""}
            </p>
            <div className="flex items-center gap-4 mt-2">
              {candidate.github_url && (
                <a
                  href={`https://${candidate.github_url.replace(/^https?:\/\//, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs hover:opacity-80"
                  style={{ color: "var(--brand)" }}
                >
                  GitHub ↗
                </a>
              )}
              {candidate.linkedin_url && (
                <a
                  href={`https://${candidate.linkedin_url.replace(/^https?:\/\//, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs hover:opacity-80"
                  style={{ color: "var(--brand)" }}
                >
                  LinkedIn ↗
                </a>
              )}
            </div>
          </div>
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold font-heading shrink-0"
            style={{ background: "var(--brand-subtle)", color: "var(--brand)" }}
          >
            {candidate.name.charAt(0).toUpperCase()}
          </div>
        </div>

        {candidate.bio && (
          <p className="leading-relaxed mb-8 max-w-prose" style={{ color: "var(--foreground)" }}>
            {candidate.bio}
          </p>
        )}

        {/* Education */}
        {(quals ?? []).filter((q) => q.type === "education").length > 0 && (
          <section className="mb-8">
            <h2 className="font-heading font-semibold text-xs uppercase tracking-wider mb-4" style={{ color: "var(--muted-foreground)" }}>
              Education
            </h2>
            <div className="flex flex-col gap-3">
              {quals!.filter((q) => q.type === "education").map((q) => (
                <div key={q.id} className="flex items-start justify-between py-3 border-b" style={{ borderColor: "var(--border)" }}>
                  <div>
                    <p className="font-medium text-sm" style={{ color: "var(--foreground)" }}>{q.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                      {q.institution}{q.field_of_study ? ` · ${q.field_of_study}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-xs tabular-nums" style={{ color: "var(--muted-foreground)" }}>
                      {q.start_date ? new Date(q.start_date).getFullYear() : ""}
                      {q.is_current ? "–Present" : q.end_date ? `–${new Date(q.end_date).getFullYear()}` : ""}
                    </p>
                    {q.grade && (
                      <p className="text-xs font-medium mt-0.5 tabular-nums" style={{ color: "var(--brand)" }}>{q.grade}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Certificates */}
        {(quals ?? []).filter((q) => q.type === "certificate").length > 0 && (
          <section className="mb-8">
            <h2 className="font-heading font-semibold text-xs uppercase tracking-wider mb-4" style={{ color: "var(--muted-foreground)" }}>
              Certificates
            </h2>
            <div className="flex flex-col gap-3">
              {quals!.filter((q) => q.type === "certificate").map((q) => {
                const isRecent = q.end_date && Date.now() - new Date(q.end_date).getTime() < 90 * 24 * 60 * 60 * 1000;
                return (
                  <div key={q.id} className="flex items-start justify-between py-3 border-b" style={{ borderColor: "var(--border)" }}>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm" style={{ color: "var(--foreground)" }}>{q.title}</p>
                        {isRecent && (
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--brand-subtle)", color: "var(--brand)" }}>
                            Recent
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{q.institution}</p>
                        {q.credential_url && (
                          <>
                            <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: "var(--brand-subtle)", color: "var(--brand)" }}>
                              Coursera
                            </span>
                            <a href={q.credential_url} target="_blank" rel="noopener noreferrer" className="text-xs hover:opacity-80" style={{ color: "var(--brand)" }}>
                              Verify ↗
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      {q.end_date && (
                        <p className="text-xs tabular-nums" style={{ color: "var(--muted-foreground)" }}>
                          {new Date(q.end_date).getFullYear()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Work Experience */}
        {(work ?? []).length > 0 && (
          <section className="mb-8">
            <h2 className="font-heading font-semibold text-xs uppercase tracking-wider mb-4" style={{ color: "var(--muted-foreground)" }}>
              Work Experience
            </h2>
            <div className="flex flex-col gap-4">
              {work!.map((w) => (
                <div key={w.id} className="py-3 border-b" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <p className="font-medium text-sm" style={{ color: "var(--foreground)" }}>{w.title}</p>
                      <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                        {w.company}{w.location ? ` · ${w.location}` : ""}{" · "}
                        <span className="capitalize">{w.employment_type.replace("_", "-")}</span>
                      </p>
                    </div>
                    <p className="text-xs tabular-nums shrink-0 ml-4" style={{ color: "var(--muted-foreground)" }}>
                      {new Date(w.start_date).toLocaleDateString("en-MY", { month: "short", year: "numeric" })}
                      {" – "}
                      {w.is_current ? "Present" : w.end_date ? new Date(w.end_date).toLocaleDateString("en-MY", { month: "short", year: "numeric" }) : ""}
                    </p>
                  </div>
                  {w.description && (
                    <p className="text-sm leading-relaxed mt-1.5 max-w-prose" style={{ color: "var(--muted-foreground)" }}>
                      {w.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Skills */}
        {Object.keys(skillsByCategory).length > 0 && (
          <section className="mb-8">
            <h2 className="font-heading font-semibold text-xs uppercase tracking-wider mb-4" style={{ color: "var(--muted-foreground)" }}>
              Skills
            </h2>
            <div className="flex flex-col gap-4">
              {Object.entries(skillsByCategory).map(([category, categorySkills]) => (
                <div key={category}>
                  <p className="text-xs font-medium mb-2" style={{ color: "var(--muted-foreground)" }}>{category}</p>
                  <div className="flex flex-wrap gap-2">
                    {categorySkills.map((skill) => (
                      <span
                        key={skill.name}
                        className="text-xs px-2.5 py-1 rounded-full border"
                        style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
                      >
                        {skill.name}
                        <span style={{ color: "var(--muted-foreground)" }} className="ml-1">· {skill.level}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        {(portfolio ?? []).length > 0 && (
          <section className="mb-8">
            <h2 className="font-heading font-semibold text-xs uppercase tracking-wider mb-4" style={{ color: "var(--muted-foreground)" }}>
              Projects
            </h2>
            <div className="flex flex-col gap-3">
              {portfolio!.map((item) => (
                <div key={item.id} className="py-3 border-b" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-medium text-sm" style={{ color: "var(--foreground)" }}>{item.title}</p>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs hover:opacity-80 shrink-0 ml-4"
                        style={{ color: "var(--brand)" }}
                      >
                        View ↗
                      </a>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>{item.description}</p>
                  )}
                  {(item.tags ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(item.tags as string[]).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 rounded"
                          style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t py-6" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-3xl mx-auto px-4 md:px-8 flex items-center justify-between">
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            Powered by{" "}
            <a href="/" className="hover:opacity-80" style={{ color: "var(--brand)" }}>Path OS</a>
          </p>
          <a href="/signup" className="text-xs hover:opacity-80" style={{ color: "var(--brand)" }}>
            Build your profile →
          </a>
        </div>
      </footer>
    </div>
  );
}
