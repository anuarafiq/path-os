-- Bug fix: migration 007 ("employer_profiles: public read when hiring") caused
-- infinite recursion (Postgres 42P17) with the existing "jobs: employer manage"
-- policy. That jobs policy subqueries employer_profiles; the new employer_profiles
-- policy subqueries jobs - any select touching both (e.g. the Jobs page embedding
-- employer_profiles(company_name)) now cycles jobs -> employer_profiles -> jobs
-- forever, errors out, and the query returns nothing. Every candidate saw
-- "No open jobs yet" instead of the intended company-name fix.
--
-- Fix: move the "does this employer have an open job" check into a SECURITY
-- DEFINER function (same pattern as get_public_portfolio, migration 005). The
-- function runs as its owner and bypasses RLS internally, so the policy no
-- longer re-triggers jobs' RLS - breaking the cycle while keeping the same
-- least-privilege shape (only rows for actively-hiring employers are exposed).

drop policy "employer_profiles: public read when hiring" on employer_profiles;

create or replace function employer_is_hiring(p_employer_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from jobs
    where jobs.employer_id = p_employer_id
      and jobs.status = 'open'
  );
$$;

revoke all on function employer_is_hiring(uuid) from public;
grant execute on function employer_is_hiring(uuid) to anon, authenticated;

create policy "employer_profiles: public read when hiring" on employer_profiles
  for select using (employer_is_hiring(id));
