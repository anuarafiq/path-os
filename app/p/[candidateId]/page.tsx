import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import type { CSSProperties } from "react";

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

// ── Career timeline ───────────────────────────────────────────────────────
// Education, certificates and work experience are one chronology, so they
// render as one list rather than three. Kind survives the merge as a label and
// a node shape, never as a colour (see .impeccable.md, Design Principle 3).

type TimelineKind = "work" | "education" | "certificate";

type TimelineEntry = {
  id: string;
  kind: TimelineKind;
  title: string;
  org: string;
  meta: string | null;
  description: string | null;
  start: Date | null;
  end: Date | null;
  isCurrent: boolean;
  grade: string | null;
  credentialUrl: string | null;
  isRecent: boolean;
};

const KIND_LABEL: Record<TimelineKind, string> = {
  work: "Work",
  education: "Education",
  certificate: "Certificate",
};

const RECENT_MS = 90 * 24 * 60 * 60 * 1000;

const toDate = (v: string | null | undefined) => (v ? new Date(v) : null);

function buildTimeline(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  quals: any[] | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  work: any[] | null,
): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    ...(quals ?? []).map(
      (q): TimelineEntry => ({
        id: q.id,
        kind: q.type === "certificate" ? "certificate" : "education",
        title: q.title,
        org: q.institution,
        meta: q.field_of_study ?? null,
        description: null,
        start: toDate(q.start_date),
        end: toDate(q.end_date),
        isCurrent: Boolean(q.is_current),
        grade: q.grade ?? null,
        credentialUrl: q.credential_url ?? null,
        isRecent: Boolean(q.end_date && Date.now() - new Date(q.end_date).getTime() < RECENT_MS),
      }),
    ),
    ...(work ?? []).map((w): TimelineEntry => {
      const employment: string | null = w.employment_type
        ? w.employment_type.replace("_", "-").replace(/^./, (c: string) => c.toUpperCase())
        : null;
      return {
        id: w.id,
        kind: "work",
        title: w.title,
        org: w.company,
        meta: [w.location, employment].filter(Boolean).join(" · ") || null,
        description: w.description ?? null,
        start: toDate(w.start_date),
        end: toDate(w.end_date),
        isCurrent: Boolean(w.is_current),
        grade: null,
        credentialUrl: null,
        isRecent: false,
      };
    }),
  ];

  // Résumé ordering: most recently ended first, current roles pinned to the top,
  // ties broken by start date.
  const endKey = (e: TimelineEntry) => (e.isCurrent ? Infinity : (e.end ?? e.start)?.getTime() ?? 0);
  const startKey = (e: TimelineEntry) => (e.start ?? e.end)?.getTime() ?? 0;
  return entries.sort((a, b) => endKey(b) - endKey(a) || startKey(b) - startKey(a));
}

// Month precision for roles, year precision for study and credentials — each
// type keeps the precision it was actually recorded at.
function formatRange(e: TimelineEntry): string {
  const fmt = (d: Date) =>
    e.kind === "work"
      ? d.toLocaleDateString("en-MY", { month: "short", year: "numeric" })
      : String(d.getFullYear());

  if (e.kind === "certificate") return e.end ? fmt(e.end) : "";

  const from = e.start ? fmt(e.start) : "";
  const to = e.isCurrent ? "Present" : e.end ? fmt(e.end) : "";
  return from && to ? `${from} – ${to}` : from || to;
}

// The gutter is an axis, so its label has to descend monotonically. It reads the
// same key the list is sorted on, not the start date.
function axisLabel(e: TimelineEntry): string {
  if (e.isCurrent) return "Now";
  const d = e.end ?? e.start;
  // An undated entry gets no tick rather than a placeholder glyph. Undated rows
  // share the empty label, so the dedup below collapses them into one blank.
  return d ? String(d.getFullYear()) : "";
}

const LEVEL_ORDER: Record<string, number> = { senior: 0, mid: 1, beginner: 2 };

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

  const timeline = buildTimeline(quals, work);

  const skillsByCategory = (skills ?? []).reduce<Record<string, { name: string; level: string }[]>>((acc, s) => {
    const skill = (s.skills as unknown) as { name: string; category: string } | null;
    if (!skill) return acc;
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push({ name: skill.name, level: s.level });
    return acc;
  }, {});

  // Seniority first — that is the order a recruiter scans a skill list in.
  for (const list of Object.values(skillsByCategory)) {
    list.sort(
      (a, b) => (LEVEL_ORDER[a.level] ?? 9) - (LEVEL_ORDER[b.level] ?? 9) || a.name.localeCompare(b.name),
    );
  }

  return (
    <div className="relative z-10 min-h-screen">
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
        <div className="animate-rise flex items-start justify-between mb-8">
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
          <p className="animate-rise leading-relaxed mb-8 max-w-prose" style={{ color: "var(--foreground)", "--i": 1 } as CSSProperties}>
            {candidate.bio}
          </p>
        )}

        {/* Career — education, certificates and work as one chronology. The spine
            between the year axis and the entries draws itself on scroll; see the
            "Career spine" block in globals.css. */}
        {timeline.length > 0 && (
          <section className="mb-10">
            <h2 className="font-heading font-semibold text-xs uppercase tracking-wider mb-4" style={{ color: "var(--muted-foreground)" }}>
              Career
            </h2>
            <ol className="spine">
              {timeline.map((e, i) => {
                const label = axisLabel(e);
                const showLabel = i === 0 || axisLabel(timeline[i - 1]) !== label;
                const range = formatRange(e);
                return (
                  <li key={e.id} className="spine-item" style={{ "--i": i } as CSSProperties}>
                    <span className="spine-year text-xs leading-4" style={{ color: "var(--muted-foreground)" }}>
                      {showLabel ? label : ""}
                    </span>
                    <span className={`spine-node spine-node-${e.kind}`} aria-hidden="true" />
                    <span className="spine-seg" aria-hidden="true" />

                    <div className="spine-body">
                      <p className="text-[10px] leading-4 uppercase tracking-[0.12em] font-medium" style={{ color: "var(--muted-foreground)" }}>
                        {KIND_LABEL[e.kind]}
                      </p>

                      {/* Below sm the date drops under the title — the two share a
                          row only when there is width for both. */}
                      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-x-4 mt-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm" style={{ color: "var(--foreground)" }}>{e.title}</p>
                          {e.isRecent && e.kind === "certificate" && (
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--brand-subtle)", color: "var(--brand)" }}>
                              Recent
                            </span>
                          )}
                        </div>
                        {range && (
                          <p className="text-xs tabular-nums shrink-0" style={{ color: "var(--muted-foreground)" }}>{range}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                          {e.org}{e.meta ? ` · ${e.meta}` : ""}
                        </p>
                        {e.grade && (
                          <span className="text-xs font-medium tabular-nums" style={{ color: "var(--brand)" }}>{e.grade}</span>
                        )}
                        {e.credentialUrl && (
                          <>
                            <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: "var(--brand-subtle)", color: "var(--brand)" }}>
                              Coursera
                            </span>
                            <a href={e.credentialUrl} target="_blank" rel="noopener noreferrer" className="text-xs hover:opacity-80" style={{ color: "var(--brand)" }}>
                              Verify ↗
                            </a>
                          </>
                        )}
                      </div>

                      {e.description && (
                        <p className="text-sm leading-relaxed mt-1.5 max-w-prose" style={{ color: "var(--muted-foreground)" }}>
                          {e.description}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
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
