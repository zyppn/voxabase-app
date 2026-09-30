-- Personal and Team workspaces for Agency owners.
-- Every portal is either personal (only its owner) or shared with the owner's
-- team. Existing portals start personal. Teammates can only ever reach portals
-- that are shared, and the files inside them. The owner's access is unchanged.

alter table public.portals add column if not exists team_shared boolean not null default false;

-- Is this portal shared with a team the signed-in user belongs to?
create or replace function public.is_team_portal(p_portal uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.portals po
    where po.id = p_portal and po.team_shared and public.is_team_member_of(po.user_id)
  )
$$;

-- Stored files live at "<owner id>/<portal id>/<file>"
create or replace function public.is_team_object(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((storage.foldername(p_name))[2] ~ '^[0-9a-f-]{36}$', false)
     and public.is_team_member_of_folder((storage.foldername(p_name))[1])
     and public.is_team_portal(((storage.foldername(p_name))[2])::uuid)
$$;

grant execute on function public.is_team_portal(uuid) to authenticated;
grant execute on function public.is_team_object(text) to authenticated;

-- Portals: teammates see, create and edit shared ones only
drop policy if exists "team: read portals" on public.portals;
create policy "team: read portals" on public.portals for select
  using (team_shared and public.is_team_member_of(user_id));
drop policy if exists "team: create portals" on public.portals;
create policy "team: create portals" on public.portals for insert
  with check (team_shared and public.is_team_member_of(user_id));
drop policy if exists "team: edit portals" on public.portals;
create policy "team: edit portals" on public.portals for update
  using (team_shared and public.is_team_member_of(user_id))
  with check (team_shared and public.is_team_member_of(user_id));

-- Files inside shared portals
drop policy if exists "team: read files" on public.files;
create policy "team: read files" on public.files for select using (public.is_team_portal(portal_id));
drop policy if exists "team: add files" on public.files;
create policy "team: add files" on public.files for insert with check (public.is_team_portal(portal_id));
drop policy if exists "team: edit files" on public.files;
create policy "team: edit files" on public.files for update using (public.is_team_portal(portal_id)) with check (public.is_team_portal(portal_id));
drop policy if exists "team: remove files" on public.files;
create policy "team: remove files" on public.files for delete using (public.is_team_portal(portal_id));

-- View counts and passwords of shared portals
drop policy if exists "team: read portal views" on public.portal_views;
create policy "team: read portal views" on public.portal_views for select using (public.is_team_portal(portal_id));
drop policy if exists "passwords: team" on public.portal_passwords;
create policy "passwords: team" on public.portal_passwords for all
  using (public.is_team_portal(portal_id)) with check (public.is_team_portal(portal_id));

-- Stored files of shared portals
drop policy if exists "team: read deliverables" on storage.objects;
create policy "team: read deliverables" on storage.objects for select
  using (bucket_id = 'deliverables' and public.is_team_object(name));
drop policy if exists "team: upload deliverables" on storage.objects;
create policy "team: upload deliverables" on storage.objects for insert
  with check (bucket_id = 'deliverables' and public.is_team_object(name));
drop policy if exists "team: update deliverables" on storage.objects;
create policy "team: update deliverables" on storage.objects for update
  using (bucket_id = 'deliverables' and public.is_team_object(name));
drop policy if exists "team: remove deliverables" on storage.objects;
create policy "team: remove deliverables" on storage.objects for delete
  using (bucket_id = 'deliverables' and public.is_team_object(name));
