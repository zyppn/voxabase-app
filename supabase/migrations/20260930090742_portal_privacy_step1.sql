-- Portal privacy, step 1 of 2. Run BEFORE pushing the code.
-- Moves portal passwords out of the publicly readable portals table into a
-- private table only the owner (and their Agency team) can read. Old code keeps
-- working until the new code is live; step 2 then removes the old copy.

create table if not exists public.portal_passwords (
  portal_id uuid primary key references public.portals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  password text not null
);
alter table public.portal_passwords enable row level security;

drop policy if exists "passwords: owner" on public.portal_passwords;
create policy "passwords: owner" on public.portal_passwords for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "passwords: team" on public.portal_passwords;
create policy "passwords: team" on public.portal_passwords for all
  using (public.is_team_member_of(user_id)) with check (public.is_team_member_of(user_id));

-- Public flag: "this portal asks for a password" (the password itself stays private)
alter table public.portals add column if not exists password_protected boolean not null default false;

insert into public.portal_passwords (portal_id, user_id, password)
  select id, user_id, portal_password from public.portals
  where portal_password is not null and portal_password <> ''
on conflict (portal_id) do update set password = excluded.password;

update public.portals set password_protected = (portal_password is not null and portal_password <> '');
