import { createClient } from "@/lib/supabase/server";
import { groq, MODEL } from "@/lib/claude/client";
import { generateText } from "ai";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const { data: employer } = await supabase
    .from("employer_profiles")
    .select("id, company_name")
    .eq("profile_id", profile.id)
    .single();

  if (!employer) return NextResponse.json({ error: "Employer profile not found" }, { status: 404 });

  const [{ data: jobs }, { data: poolEntries }] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, title, location, employment_type, required_skills, description")
      .eq("employer_id", employer.id)
      .eq("status", "open"),
    supabase
      .from("talent_pools")
      .select("candidate_id, source, candidate_profiles(id, name, job_title, years_exp, location, seeking, bio, candidate_skills(level, skills(name)))")
      .eq("employer_id", employer.id),
  ]);

  if (!jobs || jobs.length === 0 || !poolEntries || poolEntries.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  // Exclude candidates who've already engaged with a current opening — re-engagement
  // targets the talent pool that hasn't applied yet, and this is checked deterministically
  // rather than left to the model, since prompting an LLM to "always check before including"
  // isn't reliably followed (see .claude/CLAUDE.md gotcha on Groq/Llama tool-call reliability).
  const { data: existingApplications } = await supabase
    .from("applications")
    .select("candidate_id")
    .in("job_id", jobs.map((j) => j.id));

  const alreadyEngagedIds = new Set((existingApplications ?? []).map((a) => a.candidate_id));
  const eligiblePoolEntries = poolEntries.filter((entry) => !alreadyEngagedIds.has(entry.candidate_id));

  if (eligiblePoolEntries.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  const jobSummaries = jobs.map((j) =>
    `Job ID: ${j.id}
Title: ${j.title}
Location: ${j.location}
Type: ${j.employment_type}
Required Skills: ${j.required_skills?.join(", ") || "Not specified"}
Description: ${j.description ?? "Not provided"}`
  ).join("\n\n---\n\n");

  const candidateSummaries = eligiblePoolEntries.map((entry) => {
    const c = entry.candidate_profiles as unknown as {
      id: string; name: string; job_title: string | null; years_exp: number | null;
      location: string | null; seeking: string; bio: string | null;
      candidate_skills: { level: string; skills: { name: string } | null }[];
    };
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
  }).filter(Boolean).join("\n\n---\n\n");

  const prompt = `You are a recruiter assistant for ${employer.company_name}. Given a list of open jobs and a talent pool of candidates who haven't yet applied to any of them, identify up to 5 candidates who are a strong fit for one of the open roles.

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

  let suggestions: unknown[] = [];
  try {
    const { text } = await generateText({
      model: groq(MODEL),
      prompt,
      maxOutputTokens: 1024,
    });

    try {
      suggestions = JSON.parse(text);
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        try { suggestions = JSON.parse(match[0]); } catch { suggestions = []; }
      }
    }
  } catch (err) {
    console.error("[re-engage] generation failed:", err);
    suggestions = [];
  }

  return NextResponse.json({ suggestions });
}
