import { NextResponse } from "next/server";
import { z } from "zod";
import { generateText } from "ai";
import { createClient } from "@/lib/supabase/server";
import { MODEL } from "@/lib/claude/client";
import { google, GOOGLE_MODEL } from "@/lib/claude/google-client";
import { parseBody } from "@/lib/validate";

const Body = z.object({
  resumeMode: z.enum(["stored", "paste"]),
  resumeText: z.string().optional(),
  jobMode: z.enum(["existing", "paste"]),
  jobId: z.string().uuid().optional(),
  jobDescriptionText: z.string().optional(),
});

type AtsResult = {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  formatIssues: string[];
  summary: string;
};

function buildPrompt(jdText: string, resumeText: string | null, hasFile: boolean) {
  return `You are an ATS (Applicant Tracking System) resume checker. Compare the resume against the job description and return ONLY a JSON object with this exact shape — no explanation, no markdown, no code fences:

{
  "score": 0,
  "matchedKeywords": ["keyword1", "keyword2"],
  "missingKeywords": ["keyword3"],
  "formatIssues": ["issue1"],
  "summary": "1-2 sentence summary of overall fit"
}

Rules:
- score is 0-100, how well the resume's content matches the job description's required skills/keywords
- matchedKeywords: specific skills/technologies/keywords from the job description that appear in the resume
- missingKeywords: specific skills/technologies/keywords from the job description that do NOT appear in the resume
- formatIssues: ${hasFile ? "list concrete formatting problems that would confuse an ATS parser (multi-column layout, tables, text embedded in images, non-standard section headers, contact info in a header/footer). Empty array if the layout is clean." : "always return an empty array — no file was provided to check formatting"}
- keep keyword lists to the most relevant 5-15 items each, not exhaustive

JOB DESCRIPTION:
${jdText}
${hasFile ? "\nThe attached PDF file is the candidate's resume." : `\nRESUME TEXT:\n${resumeText}`}`;
}

function parseResult(text: string): AtsResult | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
  const p = parsed as Record<string, unknown>;
  return {
    score: typeof p.score === "number" ? p.score : 0,
    matchedKeywords: Array.isArray(p.matchedKeywords) ? (p.matchedKeywords as string[]) : [],
    missingKeywords: Array.isArray(p.missingKeywords) ? (p.missingKeywords as string[]) : [],
    formatIssues: Array.isArray(p.formatIssues) ? (p.formatIssues as string[]) : [],
    summary: typeof p.summary === "string" ? p.summary : "",
  };
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseBody(req, Body);
  if ("error" in parsed) return parsed.error;
  const { resumeMode, jobMode, jobId, jobDescriptionText } = parsed.data;
  let { resumeText } = parsed.data;

  if (resumeMode === "paste" && !resumeText?.trim()) {
    return NextResponse.json({ error: "resumeText is required" }, { status: 400 });
  }
  if (jobMode === "existing" && !jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }
  if (jobMode === "paste" && !jobDescriptionText?.trim()) {
    return NextResponse.json({ error: "jobDescriptionText is required" }, { status: 400 });
  }

  // Resolve job description text
  let jdText: string;
  if (jobMode === "existing") {
    const { data: job } = await supabase
      .from("jobs")
      .select("title, description, required_skills")
      .eq("id", jobId!)
      .single();
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    jdText = `${job.title}\n\n${job.description ?? ""}\n\nRequired skills: ${(job.required_skills ?? []).join(", ")}`;
  } else {
    jdText = jobDescriptionText!.slice(0, 8000);
  }

  // Resolve resume
  let filePart: { data: string; mediaType: string } | null = null;
  if (resumeMode === "stored") {
    const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
    const { data: candidate } = profile
      ? await supabase.from("candidate_profiles").select("resume_url").eq("profile_id", profile.id).single()
      : { data: null };

    if (!candidate?.resume_url) {
      return NextResponse.json({ error: "No resume on file — upload one in your profile or paste resume text instead." }, { status: 400 });
    }
    const ext = candidate.resume_url.split(".").pop()?.toLowerCase();
    if (ext !== "pdf") {
      return NextResponse.json({ error: "Formatting checks only support PDF resumes — paste your resume text instead." }, { status: 400 });
    }

    const { data: file, error: downloadErr } = await supabase.storage.from("resumes").download(candidate.resume_url);
    if (downloadErr || !file) {
      return NextResponse.json({ error: "Couldn't read your resume file — try re-uploading it." }, { status: 500 });
    }
    const bytes = await file.arrayBuffer();
    filePart = { data: Buffer.from(bytes).toString("base64"), mediaType: "application/pdf" };
  } else {
    resumeText = resumeText!.slice(0, 20000);
  }

  const prompt = buildPrompt(jdText, resumeText ?? null, !!filePart);

  try {
    const { text } = filePart
      ? await generateText({
          model: google(GOOGLE_MODEL),
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "file", data: filePart.data, mediaType: filePart.mediaType },
              ],
            },
          ],
          maxOutputTokens: 1024,
        })
      : await generateText({
          model: MODEL,
          prompt,
          maxOutputTokens: 1024,
        });

    const result = parseResult(text);
    if (!result) return NextResponse.json({ error: "Failed to parse ATS check result" }, { status: 422 });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: filePart ? "Resume file check failed — is GOOGLE_GENERATIVE_AI_API_KEY configured?" : "AI check failed" },
      { status: 500 }
    );
  }
}
