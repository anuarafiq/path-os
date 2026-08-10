import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MODEL } from "@/lib/claude/client";
import { generateText } from "ai";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { cvText?: string };
  if (!body.cvText || typeof body.cvText !== "string" || !body.cvText.trim()) {
    return NextResponse.json({ error: "cvText is required" }, { status: 400 });
  }
  const cvText = body.cvText.slice(0, 20000);

  const prompt = `Extract structured resume data from the CV text below and return ONLY a JSON object with this exact shape — no explanation, no markdown, no code fences:

{
  "name": "Full name",
  "location": "City, Country",
  "bio": "1-2 sentence professional summary written in first person",
  "github_url": "github.com/username or empty string",
  "linkedin_url": "linkedin.com/in/username or empty string",
  "seeking": "internship or full_time",
  "job_title": "Most recent or current job title, or empty string",
  "years_exp": 0,
  "qualifications": [
    {
      "type": "education or certificate",
      "institution": "Institution name",
      "title": "Degree name or certificate name",
      "field_of_study": "Field or empty string",
      "start_date": "YYYY-MM or empty string",
      "end_date": "YYYY-MM or empty string",
      "is_current": false,
      "grade": "GPA/CGPA or empty string"
    }
  ],
  "work_experiences": [
    {
      "company": "Company name",
      "title": "Job title",
      "location": "City or empty string",
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM or empty string",
      "is_current": false,
      "employment_type": "full_time, part_time, internship, or contract",
      "description": "Brief description of responsibilities or empty string"
    }
  ],
  "skills": ["SkillName1", "SkillName2"]
}

Rules:
- seeking must be exactly "internship" or "full_time" — use "internship" for students/fresh grads, "full_time" otherwise
- employment_type must be exactly one of: full_time, part_time, internship, contract
- dates must be in YYYY-MM format (e.g. "2022-06") or empty string if unknown
- skills should be specific technical/professional skills only (e.g. "React", "Python", "Figma"), not soft skills
- return empty string for any missing text fields, false for missing booleans, 0 for missing numbers, empty array for missing arrays

CV TEXT:
${cvText}`;

  try {
    const { text } = await generateText({
      model: MODEL,
      prompt,
      maxOutputTokens: 2048,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return NextResponse.json({ error: "Failed to parse CV" }, { status: 422 });
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        return NextResponse.json({ error: "Failed to parse CV" }, { status: 422 });
      }
    }

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "AI extraction failed" }, { status: 500 });
  }
}
