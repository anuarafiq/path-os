import { createClient } from "@/lib/supabase/server";
import { groq, MODEL } from "@/lib/claude/client";
import { streamText, stepCountIs } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import { findShortestPath } from "@/lib/career-path";
import type { Database } from "@/types/database";

type CareerNode = Database["public"]["Tables"]["career_nodes"]["Row"];
type CareerEdge = Database["public"]["Tables"]["career_edges"]["Row"];

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

You are equipped with tools to query open jobs, fetch salary benchmarks, add skills, remove skills, update the candidate's profile fields, apply to jobs directly on their behalf, look up career path options toward a target role, and check the status of the user's job applications.
Always explain when you are running a tool and present the results clearly to the user.
If you add or remove a skill, or update the profile, or apply for a job, confirm it clearly to the user.`;

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
      },

      getCareerPathOptions: {
        description: "Find possible next career moves from the candidate's current role, or the path toward a specific target role",
        inputSchema: z.object({
          targetRole: z.string().optional().describe("The role the candidate wants to move toward, if mentioned"),
        }),
        execute: async ({ targetRole }) => {
          if (!candidate?.job_title) return { error: "No current role set on profile." };

          const [{ data: nodes }, { data: edges }] = await Promise.all([
            supabase.from("career_nodes").select("*"),
            supabase.from("career_edges").select("*"),
          ]);
          const careerNodes = (nodes ?? []) as unknown as CareerNode[];
          const careerEdges = (edges ?? []) as unknown as CareerEdge[];

          const currentNode = careerNodes.find(
            (n) => n.title.toLowerCase() === candidate.job_title!.toLowerCase()
          );
          if (!currentNode) return { message: "Current role not found in career graph." };

          if (targetRole) {
            const targetNode = careerNodes.find((n) => n.title.toLowerCase() === targetRole.toLowerCase());
            if (!targetNode) return { message: `Target role "${targetRole}" not found in career graph.` };

            const path = findShortestPath(careerNodes, careerEdges, currentNode.id, targetNode.id);
            if (!path) return { message: `No known path from ${currentNode.title} to ${targetNode.title}.` };

            const pathTitles = path.nodeIds.map((id) => careerNodes.find((n) => n.id === id)?.title ?? id);
            const skillGaps = Array.from(
              new Set(path.edgeIds.flatMap((id) => careerEdges.find((e) => e.id === id)?.skill_gaps ?? []))
            );

            return { path: pathTitles, totalMonths: path.totalMonths, skillGaps };
          }

          const nextHops = careerEdges
            .filter((e) => e.from_node_id === currentNode.id)
            .map((e) => ({
              role: careerNodes.find((n) => n.id === e.to_node_id)?.title ?? "Unknown",
              avgTransitionMonths: e.avg_transition_months,
              skillGaps: e.skill_gaps,
            }));

          if (nextHops.length === 0) return { message: `No outgoing career paths found from ${currentNode.title}.` };
          return nextHops;
        }
      },

      getApplicationStatus: {
        description: "Get the candidate's job applications and their current status",
        inputSchema: z.object({}),
        execute: async () => {
          if (!candidateId) return { error: "Candidate profile not found." };

          const { data, error } = await supabase
            .from("applications")
            .select(`id, status, applied_at, jobs ( title, location, employment_type, employer_profiles ( company_name ) )`)
            .eq("candidate_id", candidateId)
            .order("applied_at", { ascending: false });

          if (error) return { error: "Failed to fetch applications." };
          if (!data || data.length === 0) return { message: "No applications found." };

          return (
            data as unknown as {
              id: string;
              status: string;
              applied_at: string;
              jobs: {
                title: string;
                location: string;
                employment_type: string;
                employer_profiles: { company_name: string } | null;
              } | null;
            }[]
          ).map((a) => ({
            jobTitle: a.jobs?.title ?? "Unknown",
            company: a.jobs?.employer_profiles?.company_name ?? "Unknown",
            location: a.jobs?.location,
            status: a.status,
            appliedAt: a.applied_at,
          }));
        }
      },

      updateProfile: {
        description: "Update fields on the candidate's profile (e.g., location, bio, seeking status, job title, years of experience, github_url, linkedin_url)",
        inputSchema: z.object({
          location: z.string().optional().describe("Candidate's city/state/country"),
          bio: z.string().optional().describe("A brief summary/bio of the candidate"),
          seeking: z.enum(["internship", "full_time"]).optional().describe("Type of role seeking"),
          jobTitle: z.string().optional().describe("Current job title or target role"),
          yearsExp: z.number().int().nonnegative().optional().describe("Years of experience"),
          githubUrl: z.string().optional().describe("GitHub profile link"),
          linkedinUrl: z.string().optional().describe("LinkedIn profile link"),
        }),
        execute: async (updates) => {
          if (!candidateId) return { error: "Candidate profile not found." };

          const dbUpdates: Record<string, unknown> = {};
          if (updates.location !== undefined) dbUpdates.location = updates.location;
          if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
          if (updates.seeking !== undefined) dbUpdates.seeking = updates.seeking;
          if (updates.jobTitle !== undefined) dbUpdates.job_title = updates.jobTitle;
          if (updates.yearsExp !== undefined) dbUpdates.years_exp = updates.yearsExp;
          if (updates.githubUrl !== undefined) dbUpdates.github_url = updates.githubUrl;
          if (updates.linkedinUrl !== undefined) dbUpdates.linkedin_url = updates.linkedinUrl;

          if (Object.keys(dbUpdates).length === 0) {
            return { message: "No updates provided." };
          }

          const { error } = await supabase
            .from("candidate_profiles")
            .update(dbUpdates)
            .eq("id", candidateId);

          if (error) {
            return { error: `Failed to update profile: ${error.message}` };
          }

          return { success: true, message: "Successfully updated profile fields." };
        }
      },

      applyToJob: {
        description: "Submit a job application for the candidate using a Job ID. You should explain the role first, or if the user asks to apply to a job, search for it first, get the ID, and then call this tool.",
        inputSchema: z.object({
          jobId: z.string().describe("The UUID of the job to apply for"),
          notes: z.string().optional().describe("An optional personalized cover note/message for the employer (highly recommended to generate based on profile & job requirements)"),
        }),
        execute: async ({ jobId, notes }) => {
          if (!candidateId) return { error: "Candidate profile not found." };

          // Verify job exists
          const { data: job, error: jobError } = await supabase
            .from("jobs")
            .select("title, status, employer_profiles(company_name)")
            .eq("id", jobId)
            .single();

          if (jobError || !job) {
            return { error: "Job not found." };
          }

          if (job.status !== "open") {
            return { error: `This job is currently ${job.status} and not accepting applications.` };
          }

          const employerProfiles = job.employer_profiles as unknown as
            | { company_name: string }
            | { company_name: string }[]
            | null;
          const companyName =
            (Array.isArray(employerProfiles)
              ? employerProfiles[0]?.company_name
              : employerProfiles?.company_name) ?? "Unknown Company";

          // Insert application
          const { error: applyError } = await supabase
            .from("applications")
            .insert({
              job_id: jobId,
              candidate_id: candidateId,
              status: "applied",
              notes: notes || null
            });

          if (applyError) {
            if (applyError.code === "23505") {
              return { message: `You have already applied to the ${job.title} position at ${companyName}.` };
            }
            return { error: `Failed to submit application: ${applyError.message}` };
          }

          return {
            success: true,
            message: `Successfully applied to ${job.title} at ${companyName}.`
          };
        }
      },

      removeSkillFromProfile: {
        description: "Remove a skill from the candidate's profile",
        inputSchema: z.object({
          skillName: z.string().describe("The name of the skill to remove (e.g., Python, TypeScript)"),
        }),
        execute: async ({ skillName }) => {
          if (!candidateId) return { error: "Candidate profile not found." };

          const { data: skill, error: skillError } = await supabase
            .from("skills")
            .select("id")
            .ilike("name", skillName)
            .maybeSingle();

          if (skillError || !skill) {
            return { error: `Skill "${skillName}" not found in database.` };
          }

          const { data, error: deleteError } = await supabase
            .from("candidate_skills")
            .delete()
            .eq("candidate_id", candidateId)
            .eq("skill_id", skill.id)
            .select();

          if (deleteError) {
            return { error: `Failed to remove skill: ${deleteError.message}` };
          }

          if (!data || data.length === 0) {
            return { message: `Skill "${skillName}" is not on your profile.` };
          }

          return { success: true, message: `Successfully removed "${skillName}" from your profile.` };
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

