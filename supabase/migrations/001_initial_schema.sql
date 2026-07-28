-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── Shared ──────────────────────────────────────────────────────────────────

create table profiles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null unique,
  role       text not null check (role in ('candidate', 'employer')),
  created_at timestamptz default now()
);

-- ── Candidate ────────────────────────────────────────────────────────────────

create table candidate_profiles (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid references profiles(id) on delete cascade not null unique,
  name         text not null,
  location     text,
  bio          text,
  github_url   text,
  linkedin_url text,
  seeking      text not null check (seeking in ('internship', 'full_time')),
  job_title text,
  years_exp    int check (years_exp >= 0),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create table skills (
  id       uuid primary key default gen_random_uuid(),
  name     text not null unique,
  category text not null
);

create table candidate_skills (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidate_profiles(id) on delete cascade,
  skill_id     uuid references skills(id) on delete cascade,
  level        text not null check (level in ('beginner', 'mid', 'senior')),
  verified     boolean default false,
  unique (candidate_id, skill_id)
);

create table qualifications (
  id             uuid primary key default gen_random_uuid(),
  candidate_id   uuid references candidate_profiles(id) on delete cascade,
  type           text not null check (type in ('education', 'certificate')),
  institution    text not null,
  title          text not null,
  field_of_study text,
  start_date     date,
  end_date       date,
  is_current     boolean default false,
  grade          text,
  document_url   text,
  created_at     timestamptz default now()
);

create table work_experiences (
  id              uuid primary key default gen_random_uuid(),
  candidate_id    uuid references candidate_profiles(id) on delete cascade,
  company         text not null,
  title           text not null,
  location        text,
  start_date      date not null,
  end_date        date,
  is_current      boolean default false,
  description     text,
  employment_type text not null check (employment_type in ('full_time', 'part_time', 'internship', 'contract')),
  document_url    text,
  created_at      timestamptz default now()
);

create table portfolio_items (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidate_profiles(id) on delete cascade,
  title        text not null,
  description  text,
  url          text,
  tags         text[] default '{}',
  date         date,
  created_at   timestamptz default now()
);

create table coach_sessions (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidate_profiles(id) on delete cascade,
  messages     jsonb[] default '{}',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ── Career Graph ─────────────────────────────────────────────────────────────

create table career_nodes (
  id                    uuid primary key default gen_random_uuid(),
  title                 text not null unique,
  level                 text not null check (level in ('entry', 'mid', 'senior', 'lead', 'executive')),
  avg_salary_myr_min    int not null,
  avg_salary_myr_max    int not null,
  typical_years_in_role int not null default 2,
  category              text not null,
  description           text
);

create table career_edges (
  id                    uuid primary key default gen_random_uuid(),
  from_node_id          uuid references career_nodes(id) on delete cascade,
  to_node_id            uuid references career_nodes(id) on delete cascade,
  avg_transition_months int not null default 12,
  skill_gaps            text[] default '{}',
  unique (from_node_id, to_node_id)
);

-- ── Pay Benchmarks ────────────────────────────────────────────────────────────

create table salary_data (
  id              uuid primary key default gen_random_uuid(),
  role            text not null,
  location        text not null,
  experience_band text not null,
  p25             int not null,
  p50             int not null,
  p75             int not null,
  source          text not null default 'Path OS estimate',
  year            int not null default 2025
);

-- ── Employer ─────────────────────────────────────────────────────────────────

create table employer_profiles (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid references profiles(id) on delete cascade not null unique,
  company_name text not null,
  industry     text,
  size         text,
  website      text,
  created_at   timestamptz default now()
);

create table jobs (
  id              uuid primary key default gen_random_uuid(),
  employer_id     uuid references employer_profiles(id) on delete cascade,
  title           text not null,
  location        text not null,
  salary_min      int,
  salary_max      int,
  required_skills text[] default '{}',
  description     text,
  employment_type text not null check (employment_type in ('full_time', 'part_time', 'internship', 'contract')),
  status          text not null default 'open' check (status in ('open', 'closed', 'draft')),
  created_at      timestamptz default now()
);

create table applications (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid references jobs(id) on delete cascade,
  candidate_id uuid references candidate_profiles(id) on delete cascade,
  status       text not null default 'applied' check (status in ('applied', 'reviewed', 'shortlisted', 'offered', 'rejected')),
  applied_at   timestamptz default now(),
  notes        text,
  unique (job_id, candidate_id)
);

create table talent_pools (
  id           uuid primary key default gen_random_uuid(),
  employer_id  uuid references employer_profiles(id) on delete cascade,
  candidate_id uuid references candidate_profiles(id) on delete cascade,
  source       text not null check (source in ('applied', 'scouted', 'alumni')),
  added_at     timestamptz default now(),
  unique (employer_id, candidate_id)
);

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table profiles enable row level security;
alter table candidate_profiles enable row level security;
alter table candidate_skills enable row level security;
alter table qualifications enable row level security;
alter table work_experiences enable row level security;
alter table portfolio_items enable row level security;
alter table coach_sessions enable row level security;
alter table employer_profiles enable row level security;
alter table jobs enable row level security;
alter table applications enable row level security;
alter table talent_pools enable row level security;
alter table career_nodes enable row level security;
alter table career_edges enable row level security;
alter table salary_data enable row level security;
alter table skills enable row level security;

-- Profiles: users can only see/edit their own
create policy "profiles: own" on profiles
  for all using (user_id = auth.uid());

-- Candidate profiles: own full access; employers can read for matching
create policy "candidate_profiles: own" on candidate_profiles
  for all using (
    profile_id in (select id from profiles where user_id = auth.uid())
  );

create policy "candidate_profiles: employer read" on candidate_profiles
  for select using (true);

-- Qualifications / work exp / skills / portfolio: own access + employer read
create policy "qualifications: own" on qualifications
  for all using (
    candidate_id in (
      select cp.id from candidate_profiles cp
      join profiles p on p.id = cp.profile_id
      where p.user_id = auth.uid()
    )
  );

create policy "work_experiences: own" on work_experiences
  for all using (
    candidate_id in (
      select cp.id from candidate_profiles cp
      join profiles p on p.id = cp.profile_id
      where p.user_id = auth.uid()
    )
  );

create policy "candidate_skills: own" on candidate_skills
  for all using (
    candidate_id in (
      select cp.id from candidate_profiles cp
      join profiles p on p.id = cp.profile_id
      where p.user_id = auth.uid()
    )
  );

create policy "portfolio_items: own" on portfolio_items
  for all using (
    candidate_id in (
      select cp.id from candidate_profiles cp
      join profiles p on p.id = cp.profile_id
      where p.user_id = auth.uid()
    )
  );

create policy "coach_sessions: own" on coach_sessions
  for all using (
    candidate_id in (
      select cp.id from candidate_profiles cp
      join profiles p on p.id = cp.profile_id
      where p.user_id = auth.uid()
    )
  );

-- Career graph: public read
create policy "career_nodes: public read" on career_nodes
  for select using (true);

create policy "career_edges: public read" on career_edges
  for select using (true);

-- Salary data: public read
create policy "salary_data: public read" on salary_data
  for select using (true);

-- Skills: public read
create policy "skills: public read" on skills
  for select using (true);

-- Employer profiles: own access
create policy "employer_profiles: own" on employer_profiles
  for all using (
    profile_id in (select id from profiles where user_id = auth.uid())
  );

-- Jobs: employers manage own; anyone can read open jobs
create policy "jobs: employer manage" on jobs
  for all using (
    employer_id in (
      select ep.id from employer_profiles ep
      join profiles p on p.id = ep.profile_id
      where p.user_id = auth.uid()
    )
  );

create policy "jobs: public read open" on jobs
  for select using (status = 'open');

-- Applications: candidate or employer can manage
create policy "applications: candidate" on applications
  for all using (
    candidate_id in (
      select cp.id from candidate_profiles cp
      join profiles p on p.id = cp.profile_id
      where p.user_id = auth.uid()
    )
  );

create policy "applications: employer" on applications
  for all using (
    job_id in (
      select j.id from jobs j
      join employer_profiles ep on ep.id = j.employer_id
      join profiles p on p.id = ep.profile_id
      where p.user_id = auth.uid()
    )
  );

-- Talent pools: employer manages own
create policy "talent_pools: employer" on talent_pools
  for all using (
    employer_id in (
      select ep.id from employer_profiles ep
      join profiles p on p.id = ep.profile_id
      where p.user_id = auth.uid()
    )
  );

-- ── Helper: updated_at trigger ────────────────────────────────────────────────

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger candidate_profiles_updated_at
  before update on candidate_profiles
  for each row execute function update_updated_at();

create trigger coach_sessions_updated_at
  before update on coach_sessions
  for each row execute function update_updated_at();
