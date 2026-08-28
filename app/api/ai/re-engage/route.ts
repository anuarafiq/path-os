import { createClient } from "@/lib/supabase/server";
import { MODEL } from "@/lib/claude/client";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import {
  buildJobSummaries,
  buildPoolCandidateSummaries,
  buildReEngagePrompt,
  parseSuggestions,
  type ReEngageJob,
  type PoolEntry,
} from "@/lib/ai/employer-match";

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

  const jobSummaries = buildJobSummaries(jobs as unknown as ReEngageJob[]);
  const candidateSummaries = buildPoolCandidateSummaries(eligiblePoolEntries as unknown as PoolEntry[]);

  let suggestions: unknown[] = [];
  try {
    const { text } = await generateText({
      model: MODEL,
      prompt: buildReEngagePrompt(employer.company_name, jobSummaries, candidateSummaries),
      maxOutputTokens: 1024,
    });
    suggestions = parseSuggestions(text);
  } catch (err) {
    console.error("[re-engage] generation failed:", err);
    suggestions = [];
  }

  return NextResponse.json({ suggestions });
}
