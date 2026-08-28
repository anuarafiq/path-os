import { createClient } from "@/lib/supabase/server";
import { MODEL } from "@/lib/claude/client";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import {
  buildCandidateSummaries,
  buildMatchPrompt,
  parseMatchResults,
  type CandidateWithSkills,
} from "@/lib/ai/employer-match";

const Body = z.object({ jobDescription: z.string().min(1).max(5000) });

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseBody(req, Body);
  if ("error" in parsed) return parsed.error;
  const { jobDescription } = parsed.data;

  // Fetch candidates with their skills
  const { data: candidates } = await supabase
    .from("candidate_profiles")
    .select("id, name, job_title, years_exp, location, bio, seeking, candidate_skills(level, skills(name))")
    .limit(50);

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ results: [], message: "No candidates in pool yet." });
  }

  const candidateSummaries = buildCandidateSummaries(candidates as unknown as CandidateWithSkills[]);

  const { text } = await generateText({
    model: MODEL,
    prompt: buildMatchPrompt(jobDescription, candidateSummaries),
    maxOutputTokens: 1024,
  });

  return NextResponse.json({ results: parseMatchResults(text) });
}
