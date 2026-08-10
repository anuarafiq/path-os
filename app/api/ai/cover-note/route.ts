import { createClient } from "@/lib/supabase/server";
import { MODEL } from "@/lib/claude/client";
import { generateText } from "ai";
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

  const skills = (candidate.candidate_skills as unknown as { skills: { name: string } | null }[])
    ?.map((s) => s.skills?.name)
    .filter(Boolean)
    .join(", ") || "Not specified";

  const workExp = (candidate.work_experiences as unknown as { role: string; company: string; description: string | null }[] | null)
    ?.slice(0, 3)
    .map((w) => `${w.role} at ${w.company}${w.description ? `: ${w.description.slice(0, 100)}` : ""}`)
    .join("\n") || "Not specified";

  const employer = (job.employer_profiles as unknown as { company_name: string } | null)?.company_name ?? "the company";

  const prompt = `Write a concise, professional cover note for a job application. 3 short paragraphs max. Sound human and specific — no generic filler, no "I am writing to express my interest". Address it to the hiring team at ${employer}.

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

  const { text } = await generateText({
    model: MODEL,
    prompt,
    maxOutputTokens: 512,
  });

  return NextResponse.json({ note: text.trim() });
}
