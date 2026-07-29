-- skills had select-only RLS (migration 001), so any authenticated insert of a
-- new skill name (candidate skill-add, certificate skill-suggest) silently failed.
create policy "skills: authenticated insert" on skills
  for insert to authenticated with check (true);
