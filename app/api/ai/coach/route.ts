import { createClient } from "@/lib/supabase/server";
import { groq, MODEL } from "@/lib/claude/client";
import { streamText, stepCountIs } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";

const Body = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      })
    )
    .min(1)
    .max(50),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await parseBody(req, Body);
  if ("error" in parsed) return parsed.error;
  const { messages } = parsed.data;

  const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
  const profileId = profile?.id ?? "";

  const { data: candidate } = await supabase
    .from("candidate_profiles")
    .select("id, name, job_title, years_exp, location, seeking, bio")
    .eq("profile_id", profileId)
    .single();

  const candidateId = candidate?.id ?? "";

  const { data: skills } = await supabase
    .from("candidate_skills")
    .select("level, skills(name, category)")
    .eq("candidate_id", candidateId);

  const { data: quals } = await supabase
    .from("qualifications")
    .select("type, institution, title, grade")
    .eq("candidate_id", candidateId);

  const skillSummary = skills
    ?.map((s) => {
      const skill = (s.skills as unknown) as { name: string; category: string } | null;
      return skill ? `${skill.name} (${s.level})` : null;
    })
    .filter(Boolean)
    .join(", ");

  const qualSummary = quals
    ?.map((q) => `${q.title} at ${q.institution}${q.grade ? ` (${q.grade})` : ""}`)
    .join("; ");

  const systemPrompt = `You are an expert career coach for Path OS, a career navigation platform for professionals in Asia (primarily Malaysia).

Your user's profile:
- Name: ${candidate?.name ?? "Unknown"}
- Seeking: ${candidate?.seeking === "internship" ? "an internship" : "a full-time role"}
- Current role: ${candidate?.job_title ?? "Not specified (may be a fresh grad or intern seeker)"}
- Years of experience: ${candidate?.years_exp ?? "Not specified"}
- Location: ${candidate?.location ?? "Not specified"}
- Bio: ${candidate?.bio ?? "Not provided"}
- Skills: ${skillSummary || "Not specified"}
- Qualifications: ${qualSummary || "Not specified"}

Response length rules (strict):
- Simple questions (yes/no, definitions, quick facts): 1-3 sentences. Stop there.
- Moderate questions (how-to, comparisons): 1 short paragraph or a brief bullet list. No preamble.
- Complex questions (career planning, strategy, analysis): max 3 short paragraphs or a structured list. Never exceed this.
- Never pad with intros like "Great question" or sign-offs like "Good luck!". Get to the point immediately.

Format rules:
- Use markdown. Use bullet lists or numbered steps when listing items — never run them together in a sentence.
- Bold key terms or action items when helpful.
- One blank line between paragraphs or sections. No walls of text.

Content rules:
- Give concrete, actionable advice tailored to the Malaysian/APAC job market
- Reference specific skills, roles, or paths when relevant
- Never claim to predict the future — frame everything as realistic options and trade-offs
- For intern seekers: focus on internship hunting strategies, portfolio building, and entry-level transitions
- For job seekers: focus on career progression, salary negotiation, and skill gaps to target roles
- You can mention salary ranges in MYR when relevant (e.g., "Senior Software Engineers in KL typically earn RM 9,000–15,000/month")
- Do not repeat the user's profile back to them unless relevant

You are equipped with tools to query open jobs, fetch salary benchmarks, and update the user's profile.
Always explain when you are running a tool and present the results clearly to the user.
If you add a skill, confirm it to the user.`;

  const encoder = new TextEncoder();

  const result = streamText({
    model: groq(MODEL),
    system: systemPrompt,
    messages: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    maxOutputTokens: 1024,
    stopWhen: stepCountIs(5),
    tools: {
      findMatchingJobs: {
        description: "Search open jobs in the system matching location or skills",
        inputSchema: z.object({
          skills: z.array(z.string()).optional().describe("Skills to search for"),
          location: z.string().optional().describe("Location limit (e.g. Kuala Lumpur, Penang)"),
        }),
        execute: async ({ skills, location }) => {
          let query = supabase
            .from("jobs")
            .select("id, title, location, salary_min, salary_max, required_skills")
            .eq("status", "open");
          
          if (location) {
            query = query.ilike("location", `%${location}%`);
          }
          
          const { data: jobs, error } = await query;
          if (error || !jobs) return { error: "Failed to fetch jobs" };

          if (skills && skills.length > 0) {
            const lowerSkills = skills.map((s: string) => s.toLowerCase());
            return jobs.filter((job) =>
              job.required_skills?.some((reqSkill: string) => lowerSkills.includes(reqSkill.toLowerCase()))
            );
          }

          return jobs;
        }
      },

      getSalaryBenchmarks: {
        description: "Fetch salary bands (p25, p50, p75 in MYR) for a given role in Malaysia",
        inputSchema: z.object({
          role: z.string().describe("Name of the job role (e.g., Software Engineer, Product Manager)"),
        }),
        execute: async ({ role }) => {
          const { data, error } = await supabase
            .from("salary_data")
            .select("role, location, experience_band, p25, p50, p75")
            .ilike("role", `%${role}%`);

          if (error || !data || data.length === 0) {
            return { message: `No specific salary benchmark data found for ${role}.` };
          }
          return data;
        }
      },

      addSkillToProfile: {
        description: "Add a skill to the logged-in candidate's profile",
        inputSchema: z.object({
          skillName: z.string().describe("The name of the skill (e.g., TypeScript, Next.js, React Flow)"),
          level: z.enum(["beginner", "mid", "senior"]).default("beginner").describe("Experience level for this skill"),
        }),
        execute: async ({ skillName, level }) => {
          if (!candidateId) return { error: "Candidate profile not found." };

          let { data: skill } = await supabase
            .from("skills")
            .select("id")
            .ilike("name", skillName)
            .maybeSingle();

          if (!skill) {
            const { data: newSkill, error: createError } = await supabase
              .from("skills")
              .insert({ name: skillName, category: "technical" })
              .select("id")
              .single();
            
            if (createError || !newSkill) {
              return { error: `Failed to register skill ${skillName}` };
            }
            skill = newSkill;
          }

          const { error: assocError } = await supabase
            .from("candidate_skills")
            .insert({
              candidate_id: candidateId,
              skill_id: skill.id,
              level: level,
              verified: false
            });

          if (assocError) {
            if (assocError.code === "23505") {
              return { message: `Skill ${skillName} is already on your profile.` };
            }
            return { error: `Failed to link skill to profile: ${assocError.message}` };
          }

          return { success: true, message: `Successfully added ${skillName} (${level}) to your profile.` };
        }
      }
    }
  });

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const text of result.textStream) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        console.error("[coach] stream error:", err);
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

