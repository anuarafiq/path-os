import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import { computeJobFit } from "@/lib/ai/candidate-fit";

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
    .select("title, required_skills, location, employment_type, salary_min, salary_max")
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
    .select("years_exp, candidate_skills(skills(name))")
    .eq("profile_id", profile.id)
    .single();

  if (!candidate) return NextResponse.json({ error: "No candidate profile" }, { status: 404 });

  const candidateSkillNames = (candidate.candidate_skills as unknown as { skills: { name: string } | null }[])
    ?.map((s) => s.skills?.name)
    .filter((n): n is string => Boolean(n)) ?? [];

  const { score, summary } = computeJobFit(
    job.title,
    job.required_skills ?? [],
    candidateSkillNames,
    candidate.years_exp,
  );

  return NextResponse.json({ score, summary });
}
