import { createClient } from "@/lib/supabase/server";
import { MODEL } from "@/lib/claude/client";
import { streamText, stepCountIs, convertToModelMessages, type UIMessage } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/lib/validate";
import { EMPLOYER_ROUTES } from "@/lib/agent-routes";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.object({
  messages: z.array(z.record(z.string(), z.unknown())).min(1).max(50),
});

export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ok, retryAfter } = rateLimit(`employer-coach:${user.id}`, 30, 60 * 60_000);
  if (!ok) {
    return NextResponse.json(
      { error: "You're sending messages too fast. Try again in a bit." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  const parsed = await parseBody(req, Body);
  if ("error" in parsed) return parsed.error;
  const messages = parsed.data.messages as unknown as UIMessage[];

  const { data: profile } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
  const profileId = profile?.id ?? "";

  const { data: employer } = await supabase
    .from("employer_profiles")
    .select("id, company_name, industry, size, website")
    .eq("profile_id", profileId)
    .single();

  if (!employer) return NextResponse.json({ error: "Complete your company profile first." }, { status: 400 });

  const employerId = employer.id;

  const systemPrompt = `You are an assistant for employers using Path OS, a hiring platform for the Malaysian/APAC job market.

Your user's company:
- Name: ${employer.company_name}
- Industry: ${employer.industry ?? "Not specified"}
- Size: ${employer.size ?? "Not specified"}

Response length rules (strict):
- Simple questions: 1-3 sentences. Stop there.
- Moderate questions: 1 short paragraph or a brief bullet list.
- Never pad with intros like "Great question" or sign-offs. Get to the point immediately.

Format rules:
- Use markdown. Use bullet lists or numbered steps when listing items.
- One blank line between paragraphs or sections.

You are equipped with tools to list this employer's jobs and applicants, post a new job, move an applicant to a different pipeline stage, save a candidate to the talent pool, update the company profile, and navigate the employer to a page.
Always explain when you are running a tool and present the results clearly to the user.
If you post a job, move an applicant, save a candidate, or update the profile, confirm it clearly to the user.
Use navigateTo when the user asks to go/see/open a specific page, or right after an action where showing them the result is the obvious next step (e.g. after posting a job, offer to take them to the jobs list).`;

  const result = streamText({
    model: MODEL,
    system: systemPrompt,
    messages: await convertToModelMessages(messages.slice(-10)),
    maxOutputTokens: 1024,
    stopWhen: stepCountIs(5),
    onError: ({ error }) => {
      console.error("[employer-coach] streamText error:", error);
    },
    tools: {
      listJobs: {
        description: "List this employer's job postings",
        inputSchema: z.object({}),
        execute: async () => {
          const { data, error } = await supabase
            .from("jobs")
            .select("id, title, location, employment_type, status, created_at")
            .eq("employer_id", employerId)
            .order("created_at", { ascending: false });

          if (error) return { error: "Failed to fetch jobs." };
          if (!data || data.length === 0) return { message: "No jobs posted yet." };
          return data;
        },
      },

      listApplicants: {
        description: "List applicants across this employer's jobs, with their current pipeline stage",
        inputSchema: z.object({
          jobTitle: z.string().optional().describe("Filter to applicants for a specific job title, if mentioned"),
        }),
        execute: async ({ jobTitle }) => {
          const { data: jobs } = await supabase
            .from("jobs")
            .select("id, title")
            .eq("employer_id", employerId);

          const matchingJobs = jobTitle
            ? (jobs ?? []).filter((j) => j.title.toLowerCase().includes(jobTitle.toLowerCase()))
            : jobs ?? [];

          if (matchingJobs.length === 0) return { message: "No matching jobs found." };

          const { data: applications, error } = await supabase
            .from("applications")
            .select("id, status, job_id, candidate_profiles(name, job_title)")
            .in("job_id", matchingJobs.map((j) => j.id));

          if (error) return { error: "Failed to fetch applicants." };
          if (!applications || applications.length === 0) return { message: "No applicants found." };

          return applications.map((a) => {
            const candidate = a.candidate_profiles as unknown as { name: string; job_title: string | null } | null;
            return {
              applicationId: a.id,
              candidateName: candidate?.name ?? "Unknown",
              currentRole: candidate?.job_title ?? null,
              jobTitle: matchingJobs.find((j) => j.id === a.job_id)?.title ?? "Unknown",
              status: a.status,
            };
          });
        },
      },

      createJob: {
        description: "Post a new job listing for this employer",
        inputSchema: z.object({
          title: z.string().min(1).describe("Job title"),
          location: z.string().min(1).describe("Job location, e.g. Kuala Lumpur (Remote OK)"),
          employmentType: z.enum(["full_time", "part_time", "internship", "contract"]),
          requiredSkills: z.array(z.string()).default([]).describe("Required skills for the role"),
          salaryMin: z.number().int().nonnegative().optional(),
          salaryMax: z.number().int().nonnegative().optional(),
          description: z.string().optional(),
        }),
        execute: async ({ title, location, employmentType, requiredSkills, salaryMin, salaryMax, description }) => {
          // Deterministic pre-check: required fields must be non-empty before we ever touch the DB.
          if (!title.trim() || !location.trim()) {
            return { error: "Job title and location are required." };
          }

          const { error } = await supabase.from("jobs").insert({
            employer_id: employerId,
            title: title.trim(),
            location: location.trim(),
            employment_type: employmentType,
            required_skills: requiredSkills,
            salary_min: salaryMin ?? null,
            salary_max: salaryMax ?? null,
            description: description?.trim() || null,
            status: "open",
          });

          if (error) return { error: `Failed to post job: ${error.message}` };
          return { success: true, message: `Successfully posted "${title}" at ${location}.` };
        },
      },

      updateApplicationStatus: {
        description: "Move an applicant to a different pipeline stage (applied, reviewed, shortlisted, offered, or rejected). Use listApplicants first to find the applicationId.",
        inputSchema: z.object({
          applicationId: z.string().describe("The UUID of the application"),
          status: z.enum(["applied", "reviewed", "shortlisted", "offered", "rejected"]),
        }),
        execute: async ({ applicationId, status }) => {
          // Deterministic pre-check: the application's job must belong to this employer
          // before we let the model move it — never trust the model to have verified this itself.
          const { data: application, error: fetchError } = await supabase
            .from("applications")
            .select("id, jobs!inner(employer_id, title)")
            .eq("id", applicationId)
            .single();

          if (fetchError || !application) return { error: "Application not found." };

          const job = application.jobs as unknown as { employer_id: string; title: string };
          if (job.employer_id !== employerId) {
            return { error: "This application does not belong to one of your jobs." };
          }

          const { error } = await supabase
            .from("applications")
            .update({ status })
            .eq("id", applicationId);

          if (error) return { error: `Failed to update application: ${error.message}` };
          return { success: true, message: `Moved the applicant for "${job.title}" to ${status}.` };
        },
      },

      saveCandidateToPool: {
        description: "Save a candidate to this employer's talent pool for future outreach",
        inputSchema: z.object({
          candidateId: z.string().describe("The UUID of the candidate"),
        }),
        execute: async ({ candidateId }) => {
          // Deterministic pre-check: look for an existing pool entry before inserting,
          // rather than only relying on the unique-constraint error to catch a duplicate.
          const { data: existing } = await supabase
            .from("talent_pools")
            .select("id")
            .eq("employer_id", employerId)
            .eq("candidate_id", candidateId)
            .maybeSingle();

          if (existing) return { message: "This candidate is already in your talent pool." };

          const { error } = await supabase
            .from("talent_pools")
            .insert({ candidate_id: candidateId, employer_id: employerId, source: "scouted" });

          if (error) return { error: `Failed to save candidate: ${error.message}` };
          return { success: true, message: "Successfully saved candidate to your talent pool." };
        },
      },

      updateEmployerProfile: {
        description: "Update the employer's company profile fields (company name, industry, size, website)",
        inputSchema: z.object({
          companyName: z.string().optional(),
          industry: z.string().optional(),
          size: z.string().optional(),
          website: z.string().optional(),
        }),
        execute: async (updates) => {
          const dbUpdates: Record<string, unknown> = {};
          if (updates.companyName !== undefined) dbUpdates.company_name = updates.companyName;
          if (updates.industry !== undefined) dbUpdates.industry = updates.industry;
          if (updates.size !== undefined) dbUpdates.size = updates.size;
          if (updates.website !== undefined) dbUpdates.website = updates.website;

          if (Object.keys(dbUpdates).length === 0) {
            return { message: "No updates provided." };
          }

          const { error } = await supabase
            .from("employer_profiles")
            .update(dbUpdates)
            .eq("id", employerId);

          if (error) return { error: `Failed to update profile: ${error.message}` };
          return { success: true, message: "Successfully updated company profile." };
        },
      },

      navigateTo: {
        description: "Send the employer to a specific page in the app",
        inputSchema: z.object({
          path: z.enum(EMPLOYER_ROUTES),
        }),
        execute: async ({ path }) => ({ path }),
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
