// Shared candidate-coaching logic, used by both the standalone one-shot routes
// (app/api/ai/job-fit, cover-note, skill-gap) and the candidate coach's agent tools
// (app/api/ai/coach). Single source of truth so a prompt/scoring tweak lands in both.

// --- Job fit (deterministic skill-overlap scoring, no LLM) ---

export function computeJobFit(
  jobTitle: string,
  requiredSkills: string[],
  candidateSkillNames: string[],
  yearsExp: number | null,
): { score: number; summary: string } {
  if (requiredSkills.length === 0) {
    return {
      score: 50,
      summary: `${jobTitle} doesn't list specific required skills, so fit can't be scored on skills.`,
    };
  }

  const candidateSkillsLower = candidateSkillNames.map((s) => s.toLowerCase());
  const matched = requiredSkills.filter((rs) => candidateSkillsLower.includes(rs.toLowerCase()));
  const missing = requiredSkills.filter((rs) => !candidateSkillsLower.includes(rs.toLowerCase()));
  const score = Math.round((matched.length / requiredSkills.length) * 100);

  const expClause = yearsExp
    ? ` with ${yearsExp} year${yearsExp === 1 ? "" : "s"} of experience`
    : "";

  let summary: string;
  if (candidateSkillNames.length === 0) {
    summary = `No skills on file to compare against ${jobTitle}'s required skills (${requiredSkills.join(", ")}).`;
  } else if (matched.length === 0) {
    summary = `None of the candidate's skills match ${jobTitle}'s required skills (${requiredSkills.join(", ")}).`;
  } else if (missing.length === 0) {
    summary = `Strong fit, has all required skills (${matched.join(", ")})${expClause}.`;
  } else {
    summary = `Matches ${matched.length} of ${requiredSkills.length} required skills (${matched.join(", ")}); missing ${missing.join(", ")}${expClause}.`;
  }

  return { score, summary };
}

// --- Cover note ---

type EmployerProfiles = { company_name: string } | { company_name: string }[] | null;

export type CoverNoteJob = {
  title: string;
  description: string | null;
  required_skills: string[] | null;
  location: string;
  employment_type: string;
  employer_profiles: EmployerProfiles;
};

export type CoverNoteCandidate = {
  name: string;
  bio: string | null;
  years_exp: number | null;
  job_title: string | null;
  candidate_skills: { skills: { name: string } | null }[] | null;
  work_experiences: { role: string; company: string; description: string | null }[] | null;
};

export function buildCoverNotePrompt(job: CoverNoteJob, candidate: CoverNoteCandidate): string {
  const skills = candidate.candidate_skills
    ?.map((s) => s.skills?.name)
    .filter(Boolean)
    .join(", ") || "Not specified";

  const workExp = candidate.work_experiences
    ?.slice(0, 3)
    .map((w) => `${w.role} at ${w.company}${w.description ? `: ${w.description.slice(0, 100)}` : ""}`)
    .join("\n") || "Not specified";

  const ep = job.employer_profiles;
  const employer = (Array.isArray(ep) ? ep[0]?.company_name : ep?.company_name) ?? "the company";

  return `Write a concise, professional cover note for a job application. 3 short paragraphs max. Sound human and specific — no generic filler, no "I am writing to express my interest". Address it to the hiring team at ${employer}.

Job: ${job.title} at ${employer}
Location: ${job.location}
Type: ${job.employment_type.replace("_", " ")}
Required skills: ${(job.required_skills ?? []).join(", ") || "Not specified"}
${job.description ? `Job description: ${job.description.slice(0, 400)}` : ""}

Candidate name: ${candidate.name}
Current role/title: ${candidate.job_title ?? "Not specified"}
Years of experience: ${candidate.years_exp ?? 0}
Bio: ${candidate.bio ?? "Not provided"}
Skills: ${skills}
Work experience:
${workExp}

Return only the cover note text. No subject line, no "Dear Hiring Manager", no sign-off.`;
}

// --- Skill gap roadmap ---

export type Roadmap = {
  summary: string;
  steps: { skill: string; action: string; resource: string }[];
  estimatedMonths: number;
};

export function buildSkillGapPrompt(
  currentRole: string,
  targetRole: string,
  missingSkills: string[],
): string {
  return `You are a career development advisor for professionals in Malaysia and Southeast Asia.

A candidate ${currentRole ? `currently working as ${currentRole}` : "early in their career"} wants to transition to ${targetRole}.

They need to develop these specific skills to make this transition:
${missingSkills.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Create a focused learning roadmap. Return ONLY a JSON object (no markdown, no explanation) in this exact format:
{
  "summary": "1-2 sentence overview of the transition and what it takes",
  "steps": [
    {
      "skill": "exact skill name from the list above",
      "action": "concrete learning action (e.g. 'Complete a project using X', 'Study Y fundamentals')",
      "resource": "specific resource recommendation (course name, platform, book title, or practice site)"
    }
  ],
  "estimatedMonths": 6
}

Rules:
- One step per missing skill exactly — do not add extra steps or merge skills
- Resources must be concrete and real (Coursera, LeetCode, official docs, specific book titles)
- estimatedMonths is an integer reflecting realistic self-study pace alongside a full-time role
- Tailor advice for the Malaysian/APAC tech job market where relevant
- summary must be under 40 words`;
}

// ponytail: JSON.parse first, regex-extract a { ... } block as fallback — mirrors the model's
// occasional markdown-fenced output. Returns null if neither parses.
export function parseRoadmap(text: string): Roadmap | null {
  try {
    return JSON.parse(text) as Roadmap;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as Roadmap;
      } catch {
        return null;
      }
    }
    return null;
  }
}
