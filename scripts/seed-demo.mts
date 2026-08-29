// Richer demo seed for the expo booth: several candidates, several companies with
// jobs, and applications spread across every pipeline stage so the employer
// pipeline board isn't empty. Reuses the same seed helpers as /api/demo route.
//
// Usage: node --env-file=.env.local scripts/seed-demo.mts
import { createAdminClient } from "../lib/supabase/admin.ts";
import {
  seedCandidate,
  seedEmployer,
  DEFAULT_CANDIDATE,
  DEFAULT_EMPLOYER,
  type CandidateSeed,
  type EmployerSeed,
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
  {
    email: "demo.candidate4@careeros.dev",
    password: "DemoCandidate2026",
    data: {
      name: "Ravi Kumaran",
      location: "Kuala Lumpur",
      bio: "Machine learning engineer with 4 years shipping models to production. Comfortable across the full pipeline, from data prep to deployment and monitoring.",
      github_url: "https://github.com/ravikumaran",
      linkedin_url: "https://linkedin.com/in/ravikumaran",
      seeking: "full_time",
      job_title: "Machine Learning Engineer",
      years_exp: 4,
      skills: [
        { name: "Python", category: "Backend", level: "senior" },
        { name: "Machine Learning", category: "AI/ML", level: "senior" },
        { name: "Docker", category: "DevOps", level: "mid" },
        { name: "AWS", category: "Cloud", level: "mid" },
        { name: "SQL", category: "Database", level: "mid" },
      ],
      qualifications: [
        {
          type: "education",
          institution: "Universiti Malaya",
          title: "Bachelor of Computer Science",
          start_date: "2016-09-01",
          end_date: "2020-06-01",
          is_current: false,
          grade: "3.7 / 4.00",
        },
      ],
      workExperiences: [
        {
          company: "Carsome",
          title: "Machine Learning Engineer",
          location: "Kuala Lumpur",
          start_date: "2021-03-01",
          is_current: true,
          employment_type: "full_time",
          description:
            "Built and deployed a real-time fraud detection model for used-vehicle listings, cutting false positives by 35%.",
        },
      ],
      portfolioItems: [
        {
          title: "Fraud Detection Pipeline",
          description: "End-to-end ML pipeline: feature store, training, and a monitored production API serving real-time scores.",
          url: "https://github.com/ravikumaran/fraud-detection-pipeline",
          tags: ["Python", "Docker", "MLOps"],
          date: "2024-08-01",
        },
      ],
    },
  },
  {
    email: "demo.candidate5@careeros.dev",
    password: "DemoCandidate2026",
    data: {
      name: "Priya Nair",
      location: "Kuala Lumpur",
      bio: "Product manager with 5 years launching consumer and B2B features. Strong on user research and cross-functional execution.",
      github_url: "https://github.com/priyanair",
      linkedin_url: "https://linkedin.com/in/priyanair",
      seeking: "full_time",
      job_title: "Product Manager",
      years_exp: 5,
      skills: [
        { name: "Product Management", category: "Product", level: "senior" },
        { name: "SQL", category: "Database", level: "mid" },
        { name: "Agile/Scrum", category: "Process", level: "senior" },
        { name: "Communication", category: "Soft Skills", level: "senior" },
      ],
      qualifications: [
        {
          type: "education",
          institution: "Universiti Teknologi Malaysia",
          title: "Bachelor of Business Administration",
          start_date: "2015-09-01",
          end_date: "2019-06-01",
          is_current: false,
          grade: "3.65 / 4.00",
        },
      ],
      workExperiences: [
        {
          company: "Lazada",
          title: "Product Manager",
          location: "Kuala Lumpur",
          start_date: "2020-06-01",
          is_current: true,
          employment_type: "full_time",
          description: "Owns the checkout experience across 3 markets. Led a redesign that lifted conversion by 8%.",
        },
      ],
      portfolioItems: [
        {
          title: "Checkout Redesign Case Study",
          description: "How we redesigned checkout across 3 markets, from research through rollout and measured impact.",
          url: "https://github.com/priyanair/checkout-redesign-case-study",
          tags: ["Product Strategy", "A/B Testing"],
          date: "2025-01-01",
        },
      ],
    },
  },
  {
    email: "demo.candidate6@careeros.dev",
    password: "DemoCandidate2026",
    data: {
      name: "Amir Hakim",
      location: "Petaling Jaya",
      bio: "Product designer focused on design systems and accessible interfaces. 3 years designing for fintech and e-commerce products.",
      github_url: "https://github.com/amirhakim",
      linkedin_url: "https://linkedin.com/in/amirhakim",
      seeking: "full_time",
      job_title: "UI/UX Designer",
      years_exp: 3,
      skills: [
        { name: "Figma", category: "Design", level: "senior" },
        { name: "UI/UX Design", category: "Design", level: "senior" },
        { name: "Communication", category: "Soft Skills", level: "mid" },
      ],
      qualifications: [
        {
          type: "education",
          institution: "Universiti Sains Malaysia",
          title: "Bachelor of Design",
          start_date: "2019-09-01",
          end_date: "2023-06-01",
          is_current: false,
          grade: "3.8 / 4.00",
        },
      ],
      workExperiences: [
        {
          company: "Touch 'n Go eWallet",
          title: "Product Designer",
          location: "Petaling Jaya",
          start_date: "2023-07-01",
          is_current: true,
          employment_type: "full_time",
          description: "Owns the design system used across the wallet app's 5 squads, improving design-to-dev handoff time.",
        },
      ],
      portfolioItems: [
        {
          title: "Design System for eWallet App",
          description: "A component library and token system adopted across 5 product squads.",
          url: "https://github.com/amirhakim/ewallet-design-system",
          tags: ["Figma", "Design Systems"],
          date: "2024-11-01",
        },
      ],
    },
  },
  {
    email: "demo.candidate7@careeros.dev",
    password: "DemoCandidate2026",
    data: {
      name: "Nur Athirah",
      location: "Kuala Lumpur",
      bio: "Marketing executive with a background in business analysis. Enjoys translating data into campaign strategy.",
      github_url: "https://github.com/nurathirah",
      linkedin_url: "https://linkedin.com/in/nurathirah",
      seeking: "full_time",
      job_title: "Marketing Executive",
      years_exp: 2,
      skills: [
        { name: "Digital Marketing", category: "Marketing", level: "mid" },
        { name: "SEO", category: "Marketing", level: "mid" },
        { name: "Data Analysis", category: "Data", level: "beginner" },
        { name: "Communication", category: "Soft Skills", level: "senior" },
      ],
      qualifications: [
        {
          type: "education",
          institution: "Universiti Teknologi MARA",
          title: "Bachelor of Business Administration",
          field_of_study: "Marketing",
          start_date: "2019-09-01",
          end_date: "2023-06-01",
          is_current: false,
          grade: "3.5 / 4.00",
        },
      ],
      workExperiences: [
        {
          company: "Zalora",
          title: "Marketing Executive",
          location: "Kuala Lumpur",
          start_date: "2023-08-01",
          is_current: true,
          employment_type: "full_time",
          description: "Runs paid social and SEO campaigns for the fashion category, reporting weekly performance to leadership.",
        },
      ],
      portfolioItems: [
        {
          title: "Campaign Performance Dashboard",
          description: "Self-built dashboard tracking campaign spend, CAC, and ROAS across channels.",
          url: "https://github.com/nurathirah/campaign-dashboard",
          tags: ["Marketing Analytics", "Dashboards"],
          date: "2025-03-01",
        },
      ],
    },
  },
  {
    email: "demo.candidate8@careeros.dev",
    password: "DemoCandidate2026",
    data: {
      name: "Daniel Wong",
      location: "Kuala Lumpur",
      bio: "Senior backend engineer with 7 years building scalable systems. Enjoys mentoring and architecture design.",
      github_url: "https://github.com/danielwong",
      linkedin_url: "https://linkedin.com/in/danielwong",
      seeking: "full_time",
      job_title: "Senior Software Engineer",
      years_exp: 7,
      skills: [
        { name: "Java", category: "Programming", level: "senior" },
        { name: "Go", category: "Programming", level: "mid" },
        { name: "AWS", category: "Cloud", level: "senior" },
        { name: "PostgreSQL", category: "Database", level: "senior" },
        { name: "Leadership", category: "Soft Skills", level: "mid" },
      ],
      qualifications: [
        {
          type: "education",
          institution: "Universiti Teknologi Malaysia",
          title: "Bachelor of Computer Science",
          start_date: "2013-09-01",
          end_date: "2017-06-01",
          is_current: false,
          grade: "3.6 / 4.00",
        },
      ],
      workExperiences: [
        {
          company: "Maybank",
          title: "Senior Software Engineer",
          location: "Kuala Lumpur",
          start_date: "2019-04-01",
          is_current: true,
          employment_type: "full_time",
          description: "Led the migration of the core payments platform to a microservices architecture, cutting deploy time from days to hours.",
        },
      ],
      portfolioItems: [
        {
          title: "Payments Platform Migration",
          description: "Case study on migrating a monolithic payments system to microservices with zero downtime.",
          url: "https://github.com/danielwong/payments-migration-case-study",
          tags: ["Java", "Microservices", "AWS"],
          date: "2024-06-01",
        },
      ],
    },
  },
  {
    email: "demo.candidate9@careeros.dev",
    password: "DemoCandidate2026",
    data: {
      name: "Kavitha Selvam",
      location: "Kuala Lumpur",
      bio: "Final-year student in Business Analytics. Seeking a data analyst internship to apply coursework in a real business setting.",
      github_url: "https://github.com/kavithaselvam",
      seeking: "internship",
      job_title: "Data Analyst Intern",
      years_exp: 0,
      skills: [
        { name: "SQL", category: "Database", level: "beginner" },
        { name: "Excel", category: "Data", level: "mid" },
        { name: "Data Analysis", category: "Data", level: "beginner" },
      ],
      qualifications: [
        {
          type: "education",
          institution: "Sunway University",
          title: "Bachelor of Business Analytics",
          start_date: "2022-09-01",
          end_date: "2026-06-01",
          is_current: true,
          grade: "3.7 / 4.00",
        },
      ],
      workExperiences: [],
      portfolioItems: [
        {
          title: "Customer Churn Analysis",
          description: "Coursework project predicting telco customer churn from usage data using logistic regression.",
          url: "https://github.com/kavithaselvam/churn-analysis",
          tags: ["Python", "Pandas", "scikit-learn"],
          date: "2025-05-01",
        },
      ],
    },
  },
];

// Extra companies, data-only: no one-click demo login is exposed for these, they
// exist purely so the candidate-facing Jobs tab shows listings from more than one
// company. The schema still requires an auth user + profile underneath each one.
const EXTRA_EMPLOYERS: { email: string; password: string; data: EmployerSeed }[] = [
  {
    email: "demo.employer2@careeros.dev",
    password: "DemoEmployer2026",
    data: {
      company_name: "Kenari Fintech",
      industry: "Fintech",
      size: "11-50",
      website: "https://kenarifintech.my",
      jobs: [
        {
          title: "Backend Engineer",
          location: "Kuala Lumpur",
          salary_min: 6000,
          salary_max: 10000,
          required_skills: ["Node.js", "PostgreSQL", "AWS"],
          description: "Build the ledger and payments APIs powering our merchant platform. Own services end to end.",
          employment_type: "full_time",
        },
        {
          title: "Product Analyst",
          location: "Kuala Lumpur",
          salary_min: 5000,
          salary_max: 8000,
          required_skills: ["SQL", "Data Analysis", "Product Management"],
          description: "Turn transaction data into product decisions. Partner closely with PMs on roadmap prioritisation.",
          employment_type: "full_time",
        },
        {
          title: "UI/UX Designer",
          location: "Kuala Lumpur",
          salary_min: 5000,
          salary_max: 9000,
          required_skills: ["Figma", "UI/UX Design"],
          description: "Design trustworthy, accessible interfaces for a product handling people's money every day.",
          employment_type: "full_time",
        },
      ],
    },
  },
  {
    email: "demo.employer3@careeros.dev",
    password: "DemoEmployer2026",
    data: {
      company_name: "Rimba Logistics",
      industry: "Logistics",
      size: "201-500",
      website: "https://rimbalogistics.my",
      jobs: [
        {
          title: "Data Scientist",
          location: "Kuala Lumpur",
          salary_min: 8000,
          salary_max: 14000,
          required_skills: ["Python", "Machine Learning", "SQL"],
          description: "Build route-optimisation and demand-forecasting models across our regional fleet.",
          employment_type: "full_time",
        },
        {
          title: "Business Analyst",
          location: "Kuala Lumpur",
          salary_min: 4500,
          salary_max: 7500,
          required_skills: ["SQL", "Data Analysis", "Communication"],
          description: "Analyse warehouse and delivery operations, and present findings to regional ops leads.",
          employment_type: "full_time",
        },
        {
          title: "Software Engineer",
          location: "Kuala Lumpur",
          salary_min: 6000,
          salary_max: 10000,
          required_skills: ["Java", "PostgreSQL", "Docker"],
          description: "Build the dispatch and tracking systems used by thousands of drivers daily.",
          employment_type: "full_time",
        },
      ],
    },
  },
  {
    email: "demo.employer4@careeros.dev",
    password: "DemoEmployer2026",
    data: {
      company_name: "Anggerik Health",
      industry: "Healthtech",
      size: "51-200",
      website: "https://anggerikhealth.my",
      jobs: [
        {
          title: "Data Analyst",
          location: "Kuala Lumpur",
          salary_min: 4000,
          salary_max: 7000,
          required_skills: ["SQL", "Tableau", "Data Analysis"],
          description: "Support clinical operations teams with reporting and dashboards.",
          employment_type: "full_time",
        },
        {
          title: "Product Manager",
          location: "Kuala Lumpur",
          salary_min: 7000,
          salary_max: 12000,
          required_skills: ["Product Management", "Agile/Scrum"],
          description: "Own the patient booking product, working closely with clinics and engineering.",
          employment_type: "full_time",
        },
        {
          title: "Machine Learning Engineer",
          location: "Kuala Lumpur",
          salary_min: 9000,
          salary_max: 15000,
          required_skills: ["Python", "Machine Learning", "Docker"],
          description: "Build triage and appointment-recommendation models used across our clinic network.",
          employment_type: "full_time",
        },
      ],
    },
  },
  {
    email: "demo.employer5@careeros.dev",
    password: "DemoEmployer2026",
    data: {
      company_name: "Selasih Retail",
      industry: "Retail / E-commerce",
      size: "201-500",
      website: "https://selasihretail.my",
      jobs: [
        {
          title: "Frontend Developer",
          location: "Kuala Lumpur",
          salary_min: 5000,
          salary_max: 8500,
          required_skills: ["React", "TypeScript", "CSS"],
          description: "Build storefront experiences used by millions of shoppers during campaign peaks.",
          employment_type: "full_time",
        },
        {
          title: "Marketing Executive",
          location: "Kuala Lumpur",
          salary_min: 3200,
          salary_max: 5500,
          required_skills: ["Digital Marketing", "SEO"],
          description: "Plan and run seasonal campaigns across paid social and search.",
          employment_type: "full_time",
        },
        {
          title: "Software Engineering Intern",
          location: "Kuala Lumpur",
          salary_min: 1200,
          salary_max: 2000,
          required_skills: ["JavaScript", "React"],
          description: "Join the storefront team for a hands-on internship building real shopper-facing features.",
          employment_type: "internship",
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

async function getOrSeedEmployer(
  admin: Admin,
  userId: string,
  data: EmployerSeed
): Promise<{ employerId: string; jobIds: string[] }> {
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
  return seedEmployer(admin, userId, data);
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
  const { employerId, jobIds } = await getOrSeedEmployer(admin, defaultEmployerUserId, DEFAULT_EMPLOYER);

  const extraCandidateIds: string[] = [];
  for (const c of EXTRA_CANDIDATES) {
    const userId = await findOrCreateUser(admin, c.email, c.password);
    extraCandidateIds.push(await getOrSeedCandidateId(admin, userId, c.data));
  }

  const allCandidateIds = [candidateId, ...extraCandidateIds];

  // TechCorp is the only login-able employer, so it gets the richest pipeline:
  // explicit (candidate, job) pairs so every stage gets its own distinct
  // application row instead of colliding on the (job_id, candidate_id) unique key.
  const techCorpPipelinePlan: { candidateIdx: number; jobIdx: number; status: string }[] = [
    { candidateIdx: 0, jobIdx: 0, status: "applied" },
    { candidateIdx: 1, jobIdx: 0, status: "reviewed" },
    { candidateIdx: 0, jobIdx: 1, status: "offered" },
    { candidateIdx: 1, jobIdx: 2, status: "rejected" },
    { candidateIdx: 3, jobIdx: 2, status: "applied" },
    { candidateIdx: 4, jobIdx: 0, status: "shortlisted" },
    { candidateIdx: 7, jobIdx: 1, status: "reviewed" },
  ];

  if (jobIds.length > 0) {
    for (const { candidateIdx, jobIdx, status } of techCorpPipelinePlan) {
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

  // Pool most of the candidates against TechCorp for Find Talent / Re-Engage to have
  // real breadth to work with.
  await admin.from("talent_pools").upsert(
    allCandidateIds.map((candidateForApp) => ({
      employer_id: employerId,
      candidate_id: candidateForApp,
      source: "applied" as const,
    })),
    { onConflict: "employer_id,candidate_id" }
  );

  // Extra companies: data-only, no demo login exposed. Just enough applications
  // (one per company) so the Jobs tab + basic realism hold up.
  let jobsCreated = jobIds.length;
  for (let i = 0; i < EXTRA_EMPLOYERS.length; i++) {
    const company = EXTRA_EMPLOYERS[i];
    const userId = await findOrCreateUser(admin, company.email, company.password);
    const { employerId: extraEmployerId, jobIds: extraJobIds } = await getOrSeedEmployer(admin, userId, company.data);
    jobsCreated += extraJobIds.length;

    if (extraJobIds.length > 0) {
      const candidateForApp = allCandidateIds[i % allCandidateIds.length];
      await admin.from("applications").upsert(
        { job_id: extraJobIds[0], candidate_id: candidateForApp, status: "applied" },
        { onConflict: "job_id,candidate_id" }
      );
      await admin.from("talent_pools").upsert(
        { employer_id: extraEmployerId, candidate_id: candidateForApp, source: "applied" as const },
        { onConflict: "employer_id,candidate_id" }
      );
    }
  }

  console.log(
    `Seeded ${allCandidateIds.length} candidates, ${1 + EXTRA_EMPLOYERS.length} companies with ${jobsCreated} jobs total, TechCorp applications across ${techCorpPipelinePlan.length} entries spanning all 5 pipeline stages.`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
