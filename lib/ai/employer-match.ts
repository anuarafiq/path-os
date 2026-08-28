// Shared employer-matching logic, used by both the standalone one-shot routes
// (app/api/ai/jd-writer, match, re-engage) and the employer coach's agent tools
// (app/api/ai/employer-coach). Single source of truth so a prompt/parse tweak lands in both.

// --- Job description writer ---

export function buildJobDescriptionPrompt({
  title,
  location,
  employmentType,
  skills,
  roughNotes,
}: {
  title: string;
  location?: string;
  employmentType?: string;
  skills?: string[];
  roughNotes: string;
}): string {
  return `You are a professional technical recruiter. Write a polished job description based on the employer's rough notes below.

Role: ${title}
Location: ${location || "Not specified"}
Employment type: ${employmentType?.replace("_", " ") || "Not specified"}
Required skills: ${skills?.length ? skills.join(", ") : "Not specified"}

Employer's rough notes:
${roughNotes}

Write 3-4 paragraphs covering: role overview, key responsibilities, requirements, and what the company offers. Plain text only — no markdown headers, no bullet points. Sound direct and specific. Return only the job description text.`;
}

// --- Candidate matching ---

export type CandidateWithSkills = {
  id: string;
  name: string;
  job_title: string | null;
  years_exp: number | null;
  location: string | null;
  seeking: string;
  bio: string | null;
  candidate_skills: { level: string; skills: { name: string } | null }[] | null;
};

export function buildCandidateSummaries(candidates: CandidateWithSkills[]): string {
  return candidates
    .map((c) => {
      const skills = (c.candidate_skills as unknown as { level: string; skills: { name: string } | null }[])
        ?.map((s) => s.skills?.name)
        .filter(Boolean)
        .join(", ");
      return `ID: ${c.id}
Name: ${c.name}
Role: ${c.job_title ?? "No current role (intern/fresh grad)"}
Experience: ${c.years_exp ?? 0} years
Location: ${c.location ?? "Not specified"}
Seeking: ${c.seeking}
Skills: ${skills || "Not specified"}
Bio: ${c.bio ?? "Not provided"}`;
    })
    .join("\n\n---\n\n");
}

export function buildMatchPrompt(jobDescription: string, candidateSummaries: string): string {
  return `You are a talent matching expert. Given a job description and a list of candidates, rank the top 5 most suitable candidates.

JOB DESCRIPTION:
${jobDescription}

CANDIDATES:
${candidateSummaries}

Return ONLY a JSON array (no markdown, no explanation) in this exact format:
[
  {
    "candidateId": "uuid-here",
    "name": "Full Name",
    "score": 87,
    "summary": "2-3 sentence fit explanation mentioning specific skills and relevant experience"
  }
]

Score from 0-100. Only include candidates with score >= 40. Sort by score descending. Return max 5.`;
}

// ponytail: JSON.parse first, regex-extract a [ ... ] block as fallback — mirrors the model's
// occasional markdown-fenced output. Returns [] if neither parses.
export function parseMatchResults(text: string): unknown[] {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return [];
      }
    }
    return [];
  }
}

// --- Talent-pool re-engagement ---

export type ReEngageJob = {
  id: string;
  title: string;
  location: string;
  employment_type: string;
  required_skills: string[] | null;
  description: string | null;
};

export type PoolEntry = {
  candidate_id: string;
  source?: string;
  candidate_profiles: CandidateWithSkills | null;
};

export function buildJobSummaries(jobs: ReEngageJob[]): string {
  return jobs
    .map(
      (j) =>
        `Job ID: ${j.id}
Title: ${j.title}
Location: ${j.location}
Type: ${j.employment_type}
Required Skills: ${j.required_skills?.join(", ") || "Not specified"}
Description: ${j.description ?? "Not provided"}`
    )
    .join("\n\n---\n\n");
}

export function buildPoolCandidateSummaries(entries: PoolEntry[]): string {
  return entries
    .map((entry) => {
      const c = entry.candidate_profiles as unknown as CandidateWithSkills;
      if (!c) return null;
      const skills = c.candidate_skills
        ?.map((s) => s.skills?.name)
        .filter(Boolean)
        .join(", ");
      return `Candidate ID: ${c.id}
Name: ${c.name}
Role: ${c.job_title ?? "No current role (intern/fresh grad)"}
Experience: ${c.years_exp ?? 0} years
Location: ${c.location ?? "Not specified"}
Seeking: ${c.seeking}
Skills: ${skills || "Not specified"}
Bio: ${c.bio ?? "Not provided"}`;
    })
    .filter(Boolean)
    .join("\n\n---\n\n");
}

export function buildReEngagePrompt(
  companyName: string,
  jobSummaries: string,
  candidateSummaries: string,
): string {
  return `You are a recruiter assistant for ${companyName}. Given a list of open jobs and a talent pool of candidates who haven't yet applied to any of them, identify up to 5 candidates who are a strong fit for one of the open roles.

OPEN JOBS:
${jobSummaries}

TALENT POOL:
${candidateSummaries}

Only include candidates with clear skill overlap for a specific role. Sort by fit strength. Return max 5. If no strong matches exist, return an empty array [].

Return ONLY a JSON array (no markdown, no explanation) in this exact format:
[
  {
    "candidateId": "uuid-here",
    "name": "Full Name",
    "jobTitle": "Exact job title from the open jobs list",
    "fitNote": "1-2 sentences explaining why this candidate fits this specific role, referencing their skills or experience",
    "outreachDraft": "A short personalised message to send the candidate — mention the specific role and one relevant skill or experience they have. Keep it under 3 sentences."
  }
]`;
}

// ponytail: same JSON-then-regex fallback as parseMatchResults, kept separate so the two
// callers can diverge later without coupling.
export function parseSuggestions(text: string): unknown[] {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return [];
      }
    }
    return [];
  }
}
