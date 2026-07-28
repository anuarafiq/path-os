-- Bug fix: employer_profiles had no public-read policy, only "own" access for the
-- owning employer. Candidates querying jobs with an embedded
-- employer_profiles(company_name) always got null back from PostgREST (RLS blocks
-- the embedded resource), so the Jobs tab silently fell back to the literal text
-- "Company" for every listing regardless of which employer posted it.
--
-- Fix: allow reading an employer_profiles row only when that employer has at
-- least one open job - mirrors "jobs: public read open" and keeps the same
-- least-privilege shape as the candidate is_public gate (005), rather than a
-- blanket public grant on the whole table.

create policy "employer_profiles: public read when hiring" on employer_profiles
  for select using (
    exists (
      select 1 from jobs
      where jobs.employer_id = employer_profiles.id
        and jobs.status = 'open'
    )
  );
