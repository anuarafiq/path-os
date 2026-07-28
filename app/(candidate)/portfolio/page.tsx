import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ShareButton from "@/components/ShareButton";

export default async function PortfolioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
  const { data: candidate } = await supabase
    .from("candidate_profiles")
    .select("id, name, location, bio, github_url, linkedin_url, seeking, job_title, years_exp")
    .eq("profile_id", profile?.id ?? "")
    .single();

  if (!candidate) redirect("/onboarding");

  const [{ data: quals }, { data: work }, { data: skills }, { data: portfolio }] = await Promise.all([
    supabase.from("qualifications").select("*").eq("candidate_id", candidate.id).order("start_date", { ascending: false }),
    supabase.from("work_experiences").select("*").eq("candidate_id", candidate.id).order("start_date", { ascending: false }),
    supabase.from("candidate_skills").select("level, skills(name, category)").eq("candidate_id", candidate.id),
    supabase.from("portfolio_items").select("*").eq("candidate_id", candidate.id).order("created_at", { ascending: false }),
  ]);

  const skillsByCategory = (skills ?? []).reduce<Record<string, { name: string; level: string }[]>>((acc, s) => {
    const skill = (s.skills as unknown) as { name: string; category: string } | null;
    if (!skill) return acc;
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push({ name: skill.name, level: s.level });
    return acc;
  }, {});

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold mb-1">{candidate.name}</h1>
          <p className="text-muted-foreground text-sm">
            {candidate.seeking === "internship" ? "Seeking internship" : candidate.job_title ?? "Open to opportunities"}
            {candidate.location ? ` · ${candidate.location}` : ""}
          </p>
          <div className="flex items-center gap-4 mt-2">
            {candidate.github_url && (
              <a href={`https://${candidate.github_url.replace(/^https?:\/\//, "")}`} target="_blank" rel="noopener noreferrer" className="text-xs text-brand hover:opacity-80">
                GitHub ↗
              </a>
            )}
            {candidate.linkedin_url && (
              <a href={`https://${candidate.linkedin_url.replace(/^https?:\/\//, "")}`} target="_blank" rel="noopener noreferrer" className="text-xs text-brand hover:opacity-80">
                LinkedIn ↗
              </a>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
          <div className="w-12 h-12 rounded-full bg-brand-subtle flex items-center justify-center text-brand text-xl font-bold font-heading">
            {candidate.name.charAt(0).toUpperCase()}
          </div>
          <ShareButton candidateId={candidate.id} />
        </div>
      </div>

      {candidate.bio && (
        <p className="text-foreground leading-relaxed mb-8 max-w-prose">{candidate.bio}</p>
      )}

      {/* Education */}
      {(quals ?? []).filter((q) => q.type === "education").length > 0 && (
        <section className="mb-8">
          <h2 className="font-heading font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
            Education
          </h2>
          <div className="flex flex-col gap-3">
            {quals!.filter((q) => q.type === "education").map((q) => (
              <div key={q.id} className="flex items-start justify-between py-3 border-b border-border">
                <div>
                  <p className="font-medium text-sm text-foreground">{q.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {q.institution}
                    {q.field_of_study ? ` · ${q.field_of_study}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-xs text-muted-foreground tabular">
                    {q.start_date ? new Date(q.start_date).getFullYear() : ""}
                    {q.is_current ? "–Present" : q.end_date ? `–${new Date(q.end_date).getFullYear()}` : ""}
                  </p>
                  {q.grade && <p className="text-xs text-brand tabular font-medium mt-0.5">{q.grade}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Certificates */}
      {(quals ?? []).filter((q) => q.type === "certificate").length > 0 && (
        <section className="mb-8">
          <h2 className="font-heading font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
            Certificates
          </h2>
          <div className="flex flex-col gap-3">
            {quals!.filter((q) => q.type === "certificate").map((q) => {
              const isRecent =
                q.end_date &&
                Date.now() - new Date(q.end_date).getTime() < 90 * 24 * 60 * 60 * 1000;
              return (
                <div key={q.id} className="flex items-start justify-between py-3 border-b border-border">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-foreground">{q.title}</p>
                      {isRecent && (
                        <span className="text-xs bg-brand-subtle text-brand px-1.5 py-0.5 rounded">Recent</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-xs text-muted-foreground">{q.institution}</p>
                      {q.credential_url && (
                        <>
                          <span className="text-xs bg-brand-subtle text-brand px-2 py-0.5 rounded-md">Coursera</span>
                          <a
                            href={q.credential_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-brand hover:opacity-80"
                          >
                            Verify ↗
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    {q.end_date && (
                      <p className="text-xs text-muted-foreground tabular">
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

      {/* Work experience */}
      {(work ?? []).length > 0 && (
        <section className="mb-8">
          <h2 className="font-heading font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
            Work Experience
          </h2>
          <div className="flex flex-col gap-4">
            {work!.map((w) => (
              <div key={w.id} className="py-3 border-b border-border">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="font-medium text-sm text-foreground">{w.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {w.company}
                      {w.location ? ` · ${w.location}` : ""}
                      {" · "}
                      <span className="capitalize">{w.employment_type.replace("_", "-")}</span>
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground tabular shrink-0 ml-4">
                    {new Date(w.start_date).toLocaleDateString("en-MY", { month: "short", year: "numeric" })}
                    {" – "}
                    {w.is_current ? "Present" : w.end_date ? new Date(w.end_date).toLocaleDateString("en-MY", { month: "short", year: "numeric" }) : ""}
                  </p>
                </div>
                {w.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed mt-1.5 max-w-prose">{w.description}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {Object.keys(skillsByCategory).length > 0 && (
        <section className="mb-8">
          <h2 className="font-heading font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
            Skills
          </h2>
          <div className="flex flex-col gap-4">
            {Object.entries(skillsByCategory).map(([category, categorySkills]) => (
              <div key={category}>
                <p className="text-xs text-muted-foreground font-medium mb-2">{category}</p>
                <div className="flex flex-wrap gap-2">
                  {categorySkills.map((skill) => (
                    <span
                      key={skill.name}
                      className="text-xs bg-secondary border border-border px-2.5 py-1 rounded-full text-foreground"
                    >
                      {skill.name}
                      <span className="text-muted-foreground ml-1">· {skill.level}</span>
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
          <h2 className="font-heading font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
            Projects
          </h2>
          <div className="flex flex-col gap-3">
            {portfolio!.map((item) => (
              <div key={item.id} className="py-3 border-b border-border">
                <div className="flex items-start justify-between mb-1">
                  <p className="font-medium text-sm text-foreground">{item.title}</p>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand hover:opacity-80 shrink-0 ml-4"
                    >
                      View ↗
                    </a>
                  )}
                </div>
                {item.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-prose">{item.description}</p>
                )}
                {(item.tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(item.tags as string[]).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-secondary border border-border px-2 py-0.5 rounded text-muted-foreground"
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
    </div>
  );
}
