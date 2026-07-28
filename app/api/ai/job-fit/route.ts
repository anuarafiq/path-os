import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";

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
  const candidateSkillsLower = candidateSkillNames.map((s) => s.toLowerCase());

  const requiredSkills: string[] = job.required_skills ?? [];

  if (requiredSkills.length === 0) {
    return NextResponse.json({
      score: 50,
      summary: `${job.title} doesn't list specific required skills, so fit can't be scored on skills.`,
    });
  }

  const matched = requiredSkills.filter((rs) => candidateSkillsLower.includes(rs.toLowerCase()));
  const missing = requiredSkills.filter((rs) => !candidateSkillsLower.includes(rs.toLowerCase()));
  const score = Math.round((matched.length / requiredSkills.length) * 100);

  const expClause = candidate.years_exp
    ? ` with ${candidate.years_exp} year${candidate.years_exp === 1 ? "" : "s"} of experience`
    : "";

  let summary: string;
  if (candidateSkillNames.length === 0) {
    summary = `No skills on file to compare against ${job.title}'s required skills (${requiredSkills.join(", ")}).`;
  } else if (matched.length === 0) {
    summary = `None of the candidate's skills match ${job.title}'s required skills (${requiredSkills.join(", ")}).`;
  } else if (missing.length === 0) {
    summary = `Strong fit, has all required skills (${matched.join(", ")})${expClause}.`;
  } else {
    summary = `Matches ${matched.length} of ${requiredSkills.length} required skills (${matched.join(", ")}); missing ${missing.join(", ")}${expClause}.`;
  }

  return NextResponse.json({ score, summary });
}
