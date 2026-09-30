-- Portal privacy, step 2 of 2. Run AFTER the new code is deployed on Vercel.
-- Portal pages, file downloads and payments now go through the server, which
-- checks the password first. So the public no longer needs direct read access
-- to portals, files, or the stored files themselves.

-- 1. Catch any password changed in the gap between step 1 and the deploy, then drop the old column
insert into public.portal_passwords (portal_id, user_id, password)
  select id, user_id, portal_password from public.portals
  where portal_password is not null and portal_password <> ''
on conflict (portal_id) do update set password = excluded.password;
update public.portals set password_protected = true where portal_password is not null and portal_password <> '';
alter table public.portals drop column if exists portal_password;

-- 2. Portals: only owners (and their team) read them directly
drop policy if exists "Anyone can view active portals" on public.portals;
drop policy if exists "Public can view active portals" on public.portals;

-- 3. Files: make sure owners can read their own, then remove any public read rule
drop policy if exists "owners read own files" on public.files;
create policy "owners read own files" on public.files for select using (auth.uid() = user_id);
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'files' and cmd = 'SELECT'
      and policyname not in ('owners read own files', 'team: read files')
      and coalesce(qual, '') not like '%auth.uid()%'
      and coalesce(qual, '') not like '%is_team_member_of%'
  loop
    execute format('drop policy %I on public.files', p.policyname);
    raise notice 'Removed public policy on files: %', p.policyname;
  end loop;
end $$;

-- 4. Stored files: no more public links; downloads use short-lived signed links
update storage.buckets set public = false where id = 'deliverables';
