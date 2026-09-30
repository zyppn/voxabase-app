-- Team member seats (Agency).
-- An Agency owner invites up to 4 teammates. A teammate works inside the
-- owner's workspace: they can see, create and edit the owner's portals and
-- files, but can't delete portals or touch billing, Stripe, branding or the team.
-- Every policy below is additive: existing owner access is unchanged.
-- Access switches off by itself if the owner leaves the Agency plan.

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  owner_username text not null,
  owner_label text,
  member_id uuid references auth.users(id) on delete cascade,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'active')),
  token text not null unique,
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  unique (owner_id, email)
);
create index if not exists team_members_member_idx on public.team_members (member_id);

alter table public.team_members enable row level security;

-- Invites and joins go through server routes; people can only read and remove.
drop policy if exists "team: owner reads" on public.team_members;
create policy "team: owner reads" on public.team_members for select using (owner_id = auth.uid());
drop policy if exists "team: member reads own" on public.team_members;
create policy "team: member reads own" on public.team_members for select using (member_id = auth.uid());
drop policy if exists "team: owner removes" on public.team_members;
create policy "team: owner removes" on public.team_members for delete using (owner_id = auth.uid());
drop policy if exists "team: member leaves" on public.team_members;
create policy "team: member leaves" on public.team_members for delete using (member_id = auth.uid());

-- True when the signed-in user is an active teammate of an Agency owner.
create or replace function public.is_team_member_of(owner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.team_members tm
    join public.profiles p on p.id = tm.owner_id
    where tm.owner_id = owner and tm.member_id = auth.uid()
      and tm.status = 'active' and p.plan = 'agency'
  )
$$;

-- Same check for a storage path whose first folder is the owner's id.
create or replace function public.is_team_member_of_folder(folder text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.team_members tm
    join public.profiles p on p.id = tm.owner_id
    where tm.owner_id::text = folder and tm.member_id = auth.uid()
      and tm.status = 'active' and p.plan = 'agency'
  )
$$;

-- Owner's profile (name, plan, username, brand) is readable by the team.
drop policy if exists "team: read owner profile" on public.profiles;
create policy "team: read owner profile" on public.profiles for select using (public.is_team_member_of(id));

-- Portals: read, create and edit. Deleting a portal stays owner-only.
drop policy if exists "team: read portals" on public.portals;
create policy "team: read portals" on public.portals for select using (public.is_team_member_of(user_id));
drop policy if exists "team: create portals" on public.portals;
create policy "team: create portals" on public.portals for insert with check (public.is_team_member_of(user_id));
drop policy if exists "team: edit portals" on public.portals;
create policy "team: edit portals" on public.portals for update using (public.is_team_member_of(user_id)) with check (public.is_team_member_of(user_id));

-- Files: full access within the owner's portals.
drop policy if exists "team: read files" on public.files;
create policy "team: read files" on public.files for select using (public.is_team_member_of(user_id));
drop policy if exists "team: add files" on public.files;
create policy "team: add files" on public.files for insert with check (public.is_team_member_of(user_id));
drop policy if exists "team: edit files" on public.files;
create policy "team: edit files" on public.files for update using (public.is_team_member_of(user_id)) with check (public.is_team_member_of(user_id));
drop policy if exists "team: remove files" on public.files;
create policy "team: remove files" on public.files for delete using (public.is_team_member_of(user_id));

-- View counts on the owner's portals.
drop policy if exists "team: read portal views" on public.portal_views;
create policy "team: read portal views" on public.portal_views for select using (
  exists (select 1 from public.portals po where po.id = portal_views.portal_id and public.is_team_member_of(po.user_id))
);

-- Uploaded deliverables live under "<owner id>/<portal id>/…".
drop policy if exists "team: read deliverables" on storage.objects;
create policy "team: read deliverables" on storage.objects for select
  using (bucket_id = 'deliverables' and public.is_team_member_of_folder((storage.foldername(name))[1]));
drop policy if exists "team: upload deliverables" on storage.objects;
create policy "team: upload deliverables" on storage.objects for insert
  with check (bucket_id = 'deliverables' and public.is_team_member_of_folder((storage.foldername(name))[1]));
drop policy if exists "team: update deliverables" on storage.objects;
create policy "team: update deliverables" on storage.objects for update
  using (bucket_id = 'deliverables' and public.is_team_member_of_folder((storage.foldername(name))[1]));
drop policy if exists "team: remove deliverables" on storage.objects;
create policy "team: remove deliverables" on storage.objects for delete
  using (bucket_id = 'deliverables' and public.is_team_member_of_folder((storage.foldername(name))[1]));
