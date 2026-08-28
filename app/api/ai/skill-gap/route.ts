import { createClient } from "@/lib/supabase/server";
import { MODEL } from "@/lib/claude/client";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import { buildSkillGapPrompt, parseRoadmap } from "@/lib/ai/candidate-fit";

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

  const prompt = buildSkillGapPrompt(currentRole, targetRole, missingSkills);

  const { text } = await generateText({
    model: MODEL,
    prompt,
    maxOutputTokens: 800,
  });

  const roadmap = parseRoadmap(text);

  if (!roadmap) {
    return NextResponse.json({ error: "Failed to generate roadmap" }, { status: 500 });
  }

  return NextResponse.json({ roadmap });
}
