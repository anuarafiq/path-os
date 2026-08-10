import { createClient } from "@/lib/supabase/server";
import { MODEL } from "@/lib/claude/client";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";

const Body = z.object({
  currentRole: z.string().max(200).optional().default(""),
  targetRole: z.string().min(1).max(200),
  missingSkills: z.array(z.string().max(100)).min(1).max(50),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseBody(req, Body);
  if ("error" in parsed) return parsed.error;
  const { currentRole, targetRole, missingSkills } = parsed.data;

  const prompt = `You are a career development advisor for professionals in Malaysia and Southeast Asia.

A candidate ${currentRole ? `currently working as ${currentRole}` : "early in their career"} wants to transition to ${targetRole}.

They need to develop these specific skills to make this transition:
${missingSkills.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Create a focused learning roadmap. Return ONLY a JSON object (no markdown, no explanation) in this exact format:
{
  "summary": "1-2 sentence overview of the transition and what it takes",
  "steps": [
    {
      "skill": "exact skill name from the list above",
      "action": "concrete learning action (e.g. 'Complete a project using X', 'Study Y fundamentals')",
      "resource": "specific resource recommendation (course name, platform, book title, or practice site)"
    }
  ],
  "estimatedMonths": 6
}

Rules:
- One step per missing skill exactly — do not add extra steps or merge skills
- Resources must be concrete and real (Coursera, LeetCode, official docs, specific book titles)
- estimatedMonths is an integer reflecting realistic self-study pace alongside a full-time role
- Tailor advice for the Malaysian/APAC tech job market where relevant
- summary must be under 40 words`;

  const { text } = await generateText({
    model: MODEL,
    prompt,
    maxOutputTokens: 800,
  });

  let roadmap = null;
  try {
    roadmap = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        roadmap = JSON.parse(match[0]);
      } catch {
        roadmap = null;
      }
    }
  }

  if (!roadmap) {
    return NextResponse.json({ error: "Failed to generate roadmap" }, { status: 500 });
  }

  return NextResponse.json({ roadmap });
}
