// Richer demo seed for the expo booth: several candidates, an employer with jobs,
// and applications spread across every pipeline stage so the employer pipeline
// board isn't empty. Reuses the same seed helpers as /api/demo route.
//
// Usage: node --env-file=.env.local scripts/seed-demo.mts
import { createAdminClient } from "../lib/supabase/admin.ts";
import {
  seedCandidate,
  seedEmployer,
  DEFAULT_CANDIDATE,
  DEFAULT_EMPLOYER,
  type CandidateSeed,
} from "../lib/demo-seed.ts";

type Admin = ReturnType<typeof createAdminClient>;

const DEFAULT_CANDIDATE_ACCOUNT = { email: "demo.candidate@careeros.dev", password: "DemoCandidate2026" };
const DEFAULT_EMPLOYER_ACCOUNT = { email: "demo.employer@careeros.dev", password: "DemoEmployer2026" };

const EXTRA_CANDIDATES: { email: string; password: string; data: CandidateSeed }[] = [
  {
    email: "demo.candidate2@careeros.dev",
    password: "DemoCandidate2026",
    data: {
      name: "Farah Aziz",
      location: "Penang",
      bio: "Frontend-leaning full-stack developer with 3 years building e-commerce platforms. Looking for a senior role with more ownership over architecture decisions.",
      github_url: "https://github.com/farahdev",
      linkedin_url: "https://linkedin.com/in/farahdev",
      seeking: "full_time",
      job_title: "Frontend Developer",
      years_exp: 3,
      skills: [
        { name: "TypeScript", category: "Frontend", level: "senior" },
        { name: "React", category: "Frontend", level: "senior" },
        { name: "Next.js", category: "Frontend", level: "mid" },
        { name: "CSS", category: "Frontend", level: "senior" },
        { name: "Node.js", category: "Backend", level: "mid" },
      ],
      qualifications: [
        {
          type: "education",
          institution: "Universiti Sains Malaysia",
          title: "Bachelor of Computer Science",
          start_date: "2018-09-01",
          end_date: "2021-06-01",
          is_current: false,
          grade: "3.6 / 4.00",
        },
      ],
      workExperiences: [
        {
          company: "Fave",
          title: "Frontend Developer",
          location: "Penang",
          start_date: "2021-08-01",
          is_current: true,
          employment_type: "full_time",
          description:
            "Own the merchant-facing dashboard. Migrated legacy jQuery views to Next.js, cut page load time by 45%.",
        },
      ],
      portfolioItems: [
        {
          title: "Merchant Dashboard Redesign",
          description: "Led the redesign of Fave's merchant dashboard from legacy jQuery to Next.js + Tailwind.",
          url: "https://github.com/farahdev/merchant-dashboard-case-study",
          tags: ["Next.js", "Tailwind", "Design Systems"],
          date: "2025-02-01",
        },
      ],
    },
  },
  {
    email: "demo.candidate3@careeros.dev",
    password: "DemoCandidate2026",
    data: {
      name: "Wei Jian Tan",
      location: "Johor Bahru",
      bio: "Fresh graduate in Data Science, strong in Python and SQL. Seeking an entry-level data analyst role.",
      github_url: "https://github.com/weijian-tan",
      seeking: "full_time",
      job_title: "Data Analyst",
      years_exp: 0,
      skills: [
        { name: "Python", category: "Backend", level: "mid" },
        { name: "SQL", category: "Database", level: "mid" },
        { name: "Tableau", category: "Data", level: "beginner" },
        { name: "Excel", category: "Data", level: "senior" },
      ],
      qualifications: [
        {
          type: "education",
          institution: "Universiti Teknologi Malaysia",
          title: "Bachelor of Data Science",
          start_date: "2021-09-01",
          end_date: "2025-06-01",
          is_current: false,
          grade: "3.8 / 4.00",
        },
      ],
      workExperiences: [],
      portfolioItems: [
        {
          title: "Retail Sales Forecasting Model",
          description: "Final-year project: time-series forecasting model for retail sales using Python + Prophet.",
          url: "https://github.com/weijian-tan/retail-forecast",
          tags: ["Python", "Prophet", "Pandas"],
          date: "2025-04-01",
        },
      ],
    },
  },
];

async function findOrCreateUser(admin: Admin, email: string, password: string): Promise<string> {
  const { data: listData } = await admin.auth.admin.listUsers();
  const existing = listData?.users.find((u) => u.email === email)?.id;
  if (existing) return existing;

  const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !created.user) throw new Error(`create user ${email}: ${error?.message}`);
  return created.user.id;
}

async function getOrSeedCandidateId(admin: Admin, userId: string, data: CandidateSeed): Promise<string> {
  const { data: profile } = await admin.from("profiles").select("id").eq("user_id", userId).single();
  if (profile) {
    const { data: candidate } = await admin
      .from("candidate_profiles")
      .select("id")
      .eq("profile_id", profile.id)
      .single();
    if (candidate) return candidate.id as string;
  }
  return seedCandidate(admin, userId, data);
}

async function getOrSeedEmployer(admin: Admin, userId: string): Promise<{ employerId: string; jobIds: string[] }> {
  const { data: profile } = await admin.from("profiles").select("id").eq("user_id", userId).single();
  if (profile) {
    const { data: employer } = await admin
      .from("employer_profiles")
      .select("id")
      .eq("profile_id", profile.id)
      .single();
    if (employer) {
      const { data: jobs } = await admin.from("jobs").select("id").eq("employer_id", employer.id);
      return { employerId: employer.id as string, jobIds: (jobs ?? []).map((j: { id: string }) => j.id) };
    }
  }
  return seedEmployer(admin, userId, DEFAULT_EMPLOYER);
}

async function main() {
  const admin = createAdminClient();

  const defaultCandidateUserId = await findOrCreateUser(
    admin,
    DEFAULT_CANDIDATE_ACCOUNT.email,
    DEFAULT_CANDIDATE_ACCOUNT.password
  );
  const defaultEmployerUserId = await findOrCreateUser(
    admin,
    DEFAULT_EMPLOYER_ACCOUNT.email,
    DEFAULT_EMPLOYER_ACCOUNT.password
  );

  const candidateId = await getOrSeedCandidateId(admin, defaultCandidateUserId, DEFAULT_CANDIDATE);
  const { employerId, jobIds } = await getOrSeedEmployer(admin, defaultEmployerUserId);

  const extraCandidateIds: string[] = [];
  for (const c of EXTRA_CANDIDATES) {
    const userId = await findOrCreateUser(admin, c.email, c.password);
    extraCandidateIds.push(await getOrSeedCandidateId(admin, userId, c.data));
  }

  const allCandidateIds = [candidateId, ...extraCandidateIds];

  // Explicit (candidate, job) pairs so every pipeline stage gets its own distinct
  // application row instead of colliding on the (job_id, candidate_id) unique key.
  const pipelinePlan: { candidateIdx: number; jobIdx: number; status: string }[] = [
    { candidateIdx: 0, jobIdx: 0, status: "applied" },
    { candidateIdx: 1, jobIdx: 0, status: "reviewed" },
    { candidateIdx: 2, jobIdx: 1, status: "shortlisted" },
    { candidateIdx: 0, jobIdx: 1, status: "offered" },
    { candidateIdx: 1, jobIdx: 2, status: "rejected" },
  ];

  if (jobIds.length > 0) {
    for (const { candidateIdx, jobIdx, status } of pipelinePlan) {
      if (candidateIdx >= allCandidateIds.length) continue;
      await admin.from("applications").upsert(
        {
          job_id: jobIds[jobIdx % jobIds.length],
          candidate_id: allCandidateIds[candidateIdx],
          status,
        },
        { onConflict: "job_id,candidate_id" }
      );
    }
  }

  await admin.from("talent_pools").upsert(
    allCandidateIds.map((candidateForApp) => ({
      employer_id: employerId,
      candidate_id: candidateForApp,
      source: "applied" as const,
    })),
    { onConflict: "employer_id,candidate_id" }
  );

  console.log(
    `Seeded ${allCandidateIds.length} candidates, employer ${employerId} with ${jobIds.length} jobs, applications across ${pipelinePlan.length} pipeline stages.`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
