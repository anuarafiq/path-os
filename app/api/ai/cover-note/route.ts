import { createClient } from "@/lib/supabase/server";
import { MODEL } from "@/lib/claude/client";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import { buildCoverNotePrompt, type CoverNoteJob, type CoverNoteCandidate } from "@/lib/ai/candidate-fit";

const Body = z.object({ jobId: z.string().uuid() });

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseBody(req, Body);
  if ("error" in parsed) return parsed.error;
  const { jobId } = parsed.data;

  const { data: job } = await supabase
    .from("jobs")
    .select("title, description, required_skills, location, employment_type, employer_profiles(company_name)")
    .eq("id", jobId)
    .single();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const { data: candidate } = await supabase
    .from("candidate_profiles")
    .select("name, bio, seeking, years_exp, job_title, candidate_skills(skills(name)), work_experiences(role, company, description)")
    .eq("profile_id", profile.id)
    .single();

  if (!candidate) return NextResponse.json({ error: "No candidate profile" }, { status: 404 });

  const prompt = buildCoverNotePrompt(
    job as unknown as CoverNoteJob,
    candidate as unknown as CoverNoteCandidate,
  );

  const { text } = await generateText({
    model: MODEL,
    prompt,
    maxOutputTokens: 512,
  });

  return NextResponse.json({ note: text.trim() });
}
