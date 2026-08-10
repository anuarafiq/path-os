import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MODEL } from "@/lib/claude/client";
import { generateText } from "ai";
import { z } from "zod";
import { parseBody } from "@/lib/validate";

const Body = z.object({
  title: z.string().min(1).max(300),
  institution: z.string().max(300).optional(),
});

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchSkillsInText(text: string, canonicalSkills: { name: string }[]): string[] {
  return canonicalSkills
    .filter((skill) => new RegExp(`(?<![a-z0-9])${escapeRegex(skill.name)}(?![a-z0-9])`, "i").test(text))
    .map((skill) => skill.name);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseBody(req, Body);
  if ("error" in parsed) return parsed.error;
  const { title, institution } = parsed.data;

  const { data: canonicalSkills } = await supabase.from("skills").select("name");
  const keywordMatches = matchSkillsInText(`${title} ${institution ?? ""}`, canonicalSkills ?? []);

  if (keywordMatches.length > 0) {
    return NextResponse.json({ skills: keywordMatches.slice(0, 6) });
  }

  const prompt = `Given the certificate "${title}"${institution ? ` from "${institution}"` : ""}, list up to 6 specific technical skills this course teaches. Return ONLY a JSON array of skill name strings. Example: ["React", "TypeScript", "CSS"]. No explanation, no markdown, just the array.`;

  try {
    const { text } = await generateText({
      model: MODEL,
      prompt,
      maxOutputTokens: 100,
    });

    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) return NextResponse.json({ skills: [] });

    const skills: unknown = JSON.parse(match[0]);
    if (!Array.isArray(skills)) return NextResponse.json({ skills: [] });

    const filtered = skills.filter((s): s is string => typeof s === "string").slice(0, 6);
    return NextResponse.json({ skills: filtered });
  } catch {
    return NextResponse.json({ skills: [] });
  }
}
