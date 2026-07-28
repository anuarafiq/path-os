"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type Qualification = Database["public"]["Tables"]["qualifications"]["Row"];
type CareerNode = Pick<Database["public"]["Tables"]["career_nodes"]["Row"], "id" | "title" | "category" | "level">;
type CareerEdge = Pick<Database["public"]["Tables"]["career_edges"]["Row"], "to_node_id" | "skill_gaps">;

type Phase = "idle" | "fetching" | "confirm" | "saving" | "skill-suggest";

interface Props {
  certs: Qualification[];
  candidateId: string;
  existingSkillNames: string[];
  careerNodes: CareerNode[];
  careerEdges: CareerEdge[];
}

export function CertificatesClient({ certs: initialCerts, candidateId, existingSkillNames, careerNodes, careerEdges }: Props) {
  const [certs, setCerts] = useState(initialCerts);
  const [phase, setPhase] = useState<Phase>("idle");
  const [urlInput, setUrlInput] = useState("");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<{ credential_url: string; extracted: boolean } | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formInstitution, setFormInstitution] = useState("");
  const [formDate, setFormDate] = useState("");
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [addingSkills, setAddingSkills] = useState(false);
  const [careerMatches, setCareerMatches] = useState<string[]>([]);

  const supabase = createClient();

  function getCareerMatches(skills: string[]): string[] {
    const skillSet = new Set(skills.map((s) => s.toLowerCase()));
    const matchedNodeIds = new Set<string>();
    for (const edge of careerEdges) {
      if (edge.skill_gaps.some((g) => skillSet.has(g.toLowerCase()))) {
        matchedNodeIds.add(edge.to_node_id);
      }
    }
    return careerNodes
      .filter((n) => matchedNodeIds.has(n.id))
      .slice(0, 3)
      .map((n) => n.title);
  }

  async function handleFetch() {
    if (!urlInput.trim()) return;
    setPhase("fetching");
    setFetchError(null);

    try {
      const res = await fetch("/api/certificates/coursera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFetchError(data.error ?? "Failed to fetch certificate details.");
        setPhase("idle");
        return;
      }
      setExtracted({ credential_url: data.credential_url, extracted: data.extracted });
      setFormTitle(data.title ?? "");
      setFormInstitution(data.institution ?? "");
      setFormDate("");
      setPhase("confirm");
    } catch {
      setFetchError("Network error. Check your connection.");
      setPhase("idle");
    }
  }

  async function handleSave() {
    if (!formTitle.trim() || !formInstitution.trim()) return;
    setPhase("saving");

    const { data: newCert, error } = await supabase
      .from("qualifications")
      .insert({
        candidate_id: candidateId,
        type: "certificate",
        institution: formInstitution.trim(),
        title: formTitle.trim(),
        end_date: formDate ? `${formDate}-01` : null,
        credential_url: extracted?.credential_url ?? null,
        is_current: false,
      })
      .select()
      .single();

    if (error || !newCert) {
      setFetchError("Failed to save certificate. Try again.");
      setPhase("confirm");
      return;
    }

    setCerts((prev) => [newCert, ...prev]);

    try {
      const res = await fetch("/api/certificates/skills-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: formTitle.trim(), institution: formInstitution.trim() }),
      });
      if (res.ok) {
        const { skills } = await res.json() as { skills: string[] };
        if (Array.isArray(skills) && skills.length > 0) {
          setSuggestedSkills(skills);
          setCareerMatches(getCareerMatches(skills));
          setPhase("skill-suggest");
          return;
        }
      }
    } catch {
      // non-critical
    }

    resetForm();
  }

  async function handleAddSkills() {
    if (selectedSkills.size === 0) {
      resetForm();
      return;
    }
    setAddingSkills(true);

    for (const skillName of selectedSkills) {
      const { data: skill } = await supabase
        .from("skills")
        .upsert({ name: skillName, category: "General" }, { onConflict: "name" })
        .select("id")
        .single();

      if (skill) {
        await supabase
          .from("candidate_skills")
          .upsert(
            { candidate_id: candidateId, skill_id: skill.id, level: "beginner", verified: false },
            { onConflict: "candidate_id,skill_id" }
          );
      }
    }

    setAddingSkills(false);
    resetForm();
  }

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(skill)) next.delete(skill);
      else next.add(skill);
      return next;
    });
  }

  async function handleDelete(id: string) {
    await supabase.from("qualifications").delete().eq("id", id);
    setCerts((prev) => prev.filter((c) => c.id !== id));
  }

  function resetForm() {
    setPhase("idle");
    setUrlInput("");
    setExtracted(null);
    setFormTitle("");
    setFormInstitution("");
    setFormDate("");
    setFetchError(null);
    setSuggestedSkills([]);
    setSelectedSkills(new Set());
    setCareerMatches([]);
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl mx-auto">
      <h1 className="font-heading text-2xl font-bold mb-1">Certificates</h1>
      <p className="text-muted-foreground text-sm mb-8">
        Add Coursera certificates. They appear on your portfolio with a verification link, and we&apos;ll suggest related skills to add to your profile.
      </p>

      {/* Existing certs list */}
      {certs.length > 0 && (
        <div className="mb-8">
          <div className="flex flex-col">
            {certs.map((cert) => (
              <div key={cert.id} className="flex items-start justify-between py-3 border-b border-border">
                <div>
                  <p className="font-medium text-sm text-foreground">{cert.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">{cert.institution}</span>
                    {cert.end_date && (
                      <span className="text-xs text-muted-foreground tabular">
                        · {new Date(cert.end_date).getFullYear()}
                      </span>
                    )}
                    {cert.credential_url && (
                      <a
                        href={cert.credential_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand hover:opacity-80"
                      >
                        Verify ↗
                      </a>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(cert.id)}
                  className="text-xs text-muted-foreground hover:text-danger transition-colors ml-4 shrink-0 mt-0.5"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {certs.length === 0 && phase === "idle" && (
        <p className="text-sm text-muted-foreground mb-6">No certificates yet.</p>
      )}

      {/* Phase: idle — URL input */}
      {phase === "idle" && (
        <div>
          <p className="text-sm font-medium text-foreground mb-3">Add from Coursera</p>
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFetch()}
              placeholder="https://www.coursera.org/account/accomplishments/verify/..."
              className="flex-1 bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand min-w-0"
            />
            <button
              type="button"
              onClick={handleFetch}
              disabled={!urlInput.trim()}
              className="px-4 py-2 bg-brand text-primary-foreground text-sm rounded-md hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
            >
              Fetch Details
            </button>
          </div>
          {fetchError && <p className="text-xs text-danger mt-2">{fetchError}</p>}
        </div>
      )}

      {/* Phase: fetching */}
      {phase === "fetching" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <span className="inline-block w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          Fetching certificate details...
        </div>
      )}

      {/* Phase: confirm */}
      {phase === "confirm" && extracted && (
        <div className="border border-border rounded-lg p-5">
          <p className="text-sm font-medium text-foreground mb-4">Confirm certificate details</p>
          {!extracted.extracted && (
            <p className="text-xs text-brand mb-3 bg-brand-subtle px-3 py-2 rounded-md">
              Couldn&apos;t auto-detect all details — fill in below.
            </p>
          )}
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Certificate name *</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Issued by *</label>
              <input
                type="text"
                value={formInstitution}
                onChange={(e) => setFormInstitution(e.target.value)}
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Completion date</label>
              <input
                type="month"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Credential URL</label>
              <p className="text-xs text-muted-foreground bg-secondary border border-border rounded-md px-3 py-2 truncate">
                {extracted.credential_url}
              </p>
            </div>
          </div>
          {fetchError && <p className="text-xs text-danger mt-3">{fetchError}</p>}
          <div className="flex gap-3 mt-5">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-md hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!formTitle.trim() || !formInstitution.trim()}
              className="px-4 py-2 bg-brand text-primary-foreground text-sm rounded-md hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              Save Certificate
            </button>
          </div>
        </div>
      )}

      {/* Phase: saving */}
      {phase === "saving" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <span className="inline-block w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          Saving...
        </div>
      )}

      {/* Phase: skill-suggest */}
      {phase === "skill-suggest" && (
        <div className="border border-border rounded-lg p-5">
          <p className="text-sm font-medium text-foreground mb-1">Skills this certificate validates</p>
          <p className="text-xs text-muted-foreground mb-4">Select skills to add to your profile.</p>

          <div className="flex flex-wrap gap-2 mb-5">
            {suggestedSkills.map((skill) => {
              const alreadyOwned = existingSkillNames.some((s) => s.toLowerCase() === skill.toLowerCase());
              const isSelected = selectedSkills.has(skill);
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => !alreadyOwned && toggleSkill(skill)}
                  disabled={alreadyOwned}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full border transition-all",
                    alreadyOwned
                      ? "border-border text-muted-foreground opacity-50 cursor-default"
                      : isSelected
                      ? "bg-brand text-primary-foreground border-brand"
                      : "border-border text-foreground hover:border-brand/60 cursor-pointer"
                  )}
                >
                  {skill}
                  {alreadyOwned && <span className="ml-1 opacity-70">· in profile</span>}
                </button>
              );
            })}
          </div>

          {careerMatches.length > 0 && (
            <div className="mb-5 p-3 bg-secondary rounded-md">
              <p className="text-xs text-muted-foreground mb-2">This certificate moves you closer to:</p>
              <div className="flex flex-wrap gap-2">
                {careerMatches.map((role) => (
                  <span key={role} className="text-xs bg-brand-subtle text-brand px-2.5 py-1 rounded-full">
                    {role}
                  </span>
                ))}
              </div>
              <a href="/explore" className="text-xs text-brand hover:opacity-80 mt-2 inline-block">
                View in Career Explorer ↗
              </a>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-md hover:text-foreground transition-colors"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={handleAddSkills}
              disabled={selectedSkills.size === 0 || addingSkills}
              className="px-4 py-2 bg-brand text-primary-foreground text-sm rounded-md hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {addingSkills
                ? "Adding..."
                : selectedSkills.size > 0
                ? `Add ${selectedSkills.size} skill${selectedSkills.size !== 1 ? "s" : ""}`
                : "Add skills"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
