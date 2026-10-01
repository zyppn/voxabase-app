-- Lock down direct access to delivered files and portal rows.
--
-- Clients never need direct database or storage access: the portal page,
-- file views/downloads, "Download all", payments and approvals all go through
-- the server, which uses the service role (not subject to these policies) and
-- checks the password and "lock files until paid" first.
--
-- These policies are RESTRICTIVE: Postgres ANDs them with every other policy
-- on the table. So even if an older rule made in the Supabase dashboard allows
-- more (say, "anyone can read the deliverables bucket"), only the owner and
-- their team get through. Owners and teammates keep every access they have
-- today; other buckets (like logos) are untouched.

-- 1. Stored files in the deliverables bucket ("<owner id>/<portal id>/<file>")
drop policy if exists "lockdown: deliverables owner or team" on storage.objects;
create policy "lockdown: deliverables owner or team" on storage.objects
  as restrictive for all to public
  using (
    bucket_id <> 'deliverables'
    or (storage.foldername(name))[1] = auth.uid()::text
    or public.is_team_member_of_folder((storage.foldername(name))[1])
  )
  with check (
    bucket_id <> 'deliverables'
    or (storage.foldername(name))[1] = auth.uid()::text
    or public.is_team_member_of_folder((storage.foldername(name))[1])
  );

-- 2. File records (they hold each file's storage path)
drop policy if exists "lockdown: files owner or team" on public.files;
create policy "lockdown: files owner or team" on public.files
  as restrictive for all to public
  using (auth.uid() = user_id or public.is_team_member_of(user_id))
  with check (auth.uid() = user_id or public.is_team_member_of(user_id));

-- 3. Portals (invoice_paid, lock_until_paid): nobody else can read or change them
drop policy if exists "lockdown: portals owner or team" on public.portals;
create policy "lockdown: portals owner or team" on public.portals
  as restrictive for all to public
  using (auth.uid() = user_id or public.is_team_member_of(user_id))
  with check (auth.uid() = user_id or public.is_team_member_of(user_id));
