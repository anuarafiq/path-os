// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

export function assertData<T>(data: T | null, error: unknown, label: string): T {
  if (error) throw new Error(`[demo-seed] ${label}: ${JSON.stringify(error)}`);
  if (!data) throw new Error(`[demo-seed] ${label}: returned null`);
  return data;
}

export type CandidateSeed = {
  name: string;
  location: string;
  bio: string;
  github_url?: string;
  linkedin_url?: string;
  seeking: "internship" | "full_time";
  job_title: string;
  years_exp: number;
  skills: { name: string; category: string; level: "beginner" | "mid" | "senior" }[];
  qualifications: {
    type: "education" | "certificate";
    institution: string;
    title: string;
    field_of_study?: string;
    start_date: string;
    end_date?: string;
    is_current?: boolean;
    grade?: string;
    credential_url?: string;
  }[];
  workExperiences: {
    company: string;
    title: string;
    location: string;
    start_date: string;
    end_date?: string;
    is_current?: boolean;
    employment_type: "full_time" | "part_time" | "internship" | "contract";
    description: string;
  }[];
  portfolioItems: { title: string; description: string; url: string; tags: string[]; date: string }[];
};

export type EmployerSeed = {
  company_name: string;
  industry: string;
  size: string;
  website: string;
  jobs: {
    title: string;
    location: string;
    salary_min: number;
    salary_max: number;
    required_skills: string[];
    description: string;
    employment_type: "full_time" | "part_time" | "internship" | "contract";
    status?: "open" | "closed" | "draft";
  }[];
};

export const DEFAULT_CANDIDATE: CandidateSeed = {
  name: "Ahmad Chicken",
  location: "Kuala Lumpur",
  bio: "Final-year Computer Science student at UTM. I build web apps and enjoy solving algorithmic problems. Actively seeking a software engineering internship to bridge academic theory with industry practice.",
  github_url: "https://github.com/ahmadchicken",
  linkedin_url: "https://linkedin.com/in/ahmadchicken",
  seeking: "internship",
  job_title: "Software Engineering Intern",
  years_exp: 1,
  skills: [
    { name: "Python", category: "Backend", level: "mid" },
    { name: "JavaScript", category: "Frontend", level: "mid" },
    { name: "React", category: "Frontend", level: "beginner" },
    { name: "SQL", category: "Database", level: "beginner" },
    { name: "Git", category: "Tools", level: "mid" },
  ],
  qualifications: [
    {
      type: "education",
      institution: "Universiti Teknologi Malaysia",
      title: "Bachelor of Computer Science",
      field_of_study: "Software Engineering",
      start_date: "2022-09-01",
      end_date: "2026-06-01",
      is_current: true,
      grade: "3.75 / 4.00",
    },
    {
      type: "certificate",
      institution: "Meta",
      title: "Meta Front-End Developer Certificate",
      start_date: "2024-01-01",
      end_date: "2024-03-01",
      credential_url: "https://www.coursera.org/account/accomplishments/verify/META2024DEMO",
    },
    {
      type: "certificate",
      institution: "DeepLearning.AI",
      title: "Machine Learning Specialization",
      start_date: "2024-06-01",
      end_date: "2024-09-01",
      credential_url: "https://www.coursera.org/account/accomplishments/verify/DL2024DEMO",
    },
  ],
  workExperiences: [
    {
      company: "Grab",
      title: "Software Engineering Intern",
      location: "Kuala Lumpur",
      start_date: "2024-07-01",
      end_date: "2024-09-30",
      is_current: false,
      employment_type: "internship",
      description:
        "Worked on the driver incentives dashboard. Built React components, wrote Python ETL scripts to process ride data, and improved dashboard load time by 30% through query optimisation.",
    },
  ],
  portfolioItems: [
    {
      title: "StudyBuddy — Peer Matching App",
      description:
        "A web app that matches UTM students by course and study schedule. Built with Next.js + Supabase. 200+ active users within the first month.",
      url: "https://github.com/ahmadchicken/studybuddy",
      tags: ["Next.js", "Supabase", "TypeScript"],
      date: "2024-11-01",
    },
    {
      title: "Expense Tracker CLI",
      description:
        "Command-line expense tracker with SQLite storage and category analytics. Built in Python as a learning project.",
      url: "https://github.com/ahmadchicken/expense-cli",
      tags: ["Python", "SQLite", "CLI"],
      date: "2024-05-01",
    },
  ],
};

export const DEFAULT_EMPLOYER: EmployerSeed = {
  company_name: "TechCorp Malaysia",
  industry: "Technology",
  size: "51-200",
  website: "https://techcorp.my",
  jobs: [
    {
      title: "Software Engineering Intern",
      location: "Kuala Lumpur",
      salary_min: 1800,
      salary_max: 2500,
      required_skills: ["Python", "JavaScript", "React"],
      description:
        "Join our product team to build features used by thousands of users. You'll work across the stack — React frontend, Python APIs, and Postgres. Great mentorship, real ownership from day one.",
      employment_type: "internship",
      status: "open",
    },
    {
      title: "Frontend Developer",
      location: "Kuala Lumpur",
      salary_min: 5000,
      salary_max: 8000,
      required_skills: ["React", "TypeScript", "CSS"],
      description:
        "We're building a design-forward fintech product and need a frontend engineer who cares deeply about UI quality, performance, and accessibility.",
      employment_type: "full_time",
      status: "open",
    },
    {
      title: "Data Analyst",
      location: "Kuala Lumpur",
      salary_min: 4500,
      salary_max: 7000,
      required_skills: ["SQL", "Python", "Tableau"],
      description:
        "Work with our data team to surface insights from user behaviour and operational metrics. Own dashboards, write complex SQL, and present findings to leadership.",
      employment_type: "full_time",
      status: "open",
    },
  ],
};

/** Seeds one candidate's full profile tree. Returns the candidate_profiles.id. */
export async function seedCandidate(
  admin: AdminClient,
  userId: string,
  data: CandidateSeed = DEFAULT_CANDIDATE
): Promise<string> {
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .insert({ user_id: userId, role: "candidate" })
    .select("id")
    .single();
  assertData(profile, profileErr, "insert profiles");

  const { data: candidate, error: candidateErr } = await admin
    .from("candidate_profiles")
    .insert({
      profile_id: profile.id,
      name: data.name,
      location: data.location,
      bio: data.bio,
      github_url: data.github_url,
      linkedin_url: data.linkedin_url,
      seeking: data.seeking,
      job_title: data.job_title,
      years_exp: data.years_exp,
    })
    .select("id")
    .single();
  assertData(candidate, candidateErr, "insert candidate_profiles");

  const candidateId = candidate.id as string;

  for (const s of data.skills) {
    const { data: skill, error: skillErr } = await admin
      .from("skills")
      .upsert({ name: s.name, category: s.category }, { onConflict: "name" })
      .select("id")
      .single();
    assertData(skill, skillErr, `upsert skill ${s.name}`);

    await admin
      .from("candidate_skills")
      .upsert(
        { candidate_id: candidateId, skill_id: skill.id, level: s.level },
        { onConflict: "candidate_id,skill_id" }
      );
  }

  if (data.qualifications.length) {
    await admin
      .from("qualifications")
      .insert(data.qualifications.map((q) => ({ candidate_id: candidateId, ...q })));
  }

  if (data.workExperiences.length) {
    await admin
      .from("work_experiences")
      .insert(data.workExperiences.map((w) => ({ candidate_id: candidateId, ...w })));
  }

  if (data.portfolioItems.length) {
    await admin
      .from("portfolio_items")
      .insert(data.portfolioItems.map((p) => ({ candidate_id: candidateId, ...p })));
  }

  return candidateId;
}

/** Seeds one employer's profile + job postings. Returns the employer_profiles.id and created job ids. */
export async function seedEmployer(
  admin: AdminClient,
  userId: string,
  data: EmployerSeed = DEFAULT_EMPLOYER
): Promise<{ employerId: string; jobIds: string[] }> {
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .insert({ user_id: userId, role: "employer" })
    .select("id")
    .single();
  assertData(profile, profileErr, "insert profiles");

  const { data: employer, error: employerErr } = await admin
    .from("employer_profiles")
    .insert({
      profile_id: profile.id,
      company_name: data.company_name,
      industry: data.industry,
      size: data.size,
      website: data.website,
    })
    .select("id")
    .single();
  assertData(employer, employerErr, "insert employer_profiles");

  const employerId = employer.id as string;

  const { data: jobs, error: jobsErr } = await admin
    .from("jobs")
    .insert(
      data.jobs.map((j) => ({
        employer_id: employerId,
        status: "open",
        ...j,
      }))
    )
    .select("id");
  assertData(jobs, jobsErr, "insert jobs");

  return { employerId, jobIds: (jobs as { id: string }[]).map((j) => j.id) };
}
