import { createClient } from "@/lib/supabase/server";
import { MODEL } from "@/lib/claude/client";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";

const Body = z.object({
  title: z.string().trim().min(1).max(200),
  location: z.string().max(200).optional().default(""),
  employmentType: z.string().max(50).optional().default(""),
  skills: z.array(z.string().max(100)).max(50).optional().default([]),
  roughNotes: z.string().trim().min(1).max(5000),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseBody(req, Body);
  if ("error" in parsed) return parsed.error;
  const { title, location, employmentType, skills, roughNotes } = parsed.data;

  const prompt = `You are a professional technical recruiter. Write a polished job description based on the employer's rough notes below.

Role: ${title}
Location: ${location || "Not specified"}
Employment type: ${employmentType?.replace("_", " ") || "Not specified"}
Required skills: ${skills?.length ? skills.join(", ") : "Not specified"}

Employer's rough notes:
${roughNotes}

Write 3-4 paragraphs covering: role overview, key responsibilities, requirements, and what the company offers. Plain text only — no markdown headers, no bullet points. Sound direct and specific. Return only the job description text.`;

  const { text } = await generateText({
    model: MODEL,
    prompt,
    maxOutputTokens: 800,
  });

  return NextResponse.json({ description: text.trim() });
}
