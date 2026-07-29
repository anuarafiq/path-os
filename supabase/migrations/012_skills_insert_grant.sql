-- 011 added the RLS policy but RLS is a second gate on top of table grants,
-- not a replacement for them - authenticated never had base INSERT/UPDATE
-- privilege on skills, so the policy alone still 42501'd.
grant insert, update on public.skills to authenticated;
