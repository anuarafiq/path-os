import { createClient } from "@/lib/supabase/server";
import { MODEL } from "@/lib/claude/client";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import { buildJobDescriptionPrompt } from "@/lib/ai/employer-match";

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

  const { text } = await generateText({
    model: MODEL,
    prompt: buildJobDescriptionPrompt({ title, location, employmentType, skills, roughNotes }),
    maxOutputTokens: 800,
  });

  return NextResponse.json({ description: text.trim() });
}
