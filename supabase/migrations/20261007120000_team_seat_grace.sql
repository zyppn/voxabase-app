-- Seat limits after a downgrade.
-- Teammates beyond the owner's plan (Pro 1, Agency 4) used to keep access
-- forever after a downgrade. Now, when a plan change leaves an owner with more
-- active teammates than seats, everyone keeps access for 7 days. After that,
-- only the earliest-joined teammates (up to the seat limit) can open the Team
-- workspace; the rest are paused, not removed, and get access back as soon as
-- the owner removes someone or upgrades. Free still pauses the whole team at once.

-- Only the server writes this (via the trigger below); owners can read their own.
create table if not exists public.team_seat_grace (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  until timestamptz not null
);
alter table public.team_seat_grace enable row level security;
drop policy if exists "team grace: owner reads" on public.team_seat_grace;
create policy "team grace: owner reads" on public.team_seat_grace for select using (owner_id = auth.uid());
grant select on public.team_seat_grace to authenticated;

create or replace function public.team_seat_limit(p_plan text)
returns int language sql immutable as $$
  select case p_plan when 'agency' then 4 when 'pro' then 1 else 0 end
$$;

-- Whether this member holds one of the owner's seats right now.
create or replace function public.team_seat_ok(p_owner uuid, p_member uuid)
returns boolean language sql stable security definer set search_path = public as $$
  with me as (
    select tm.joined_at, tm.id from public.team_members tm
    where tm.owner_id = p_owner and tm.member_id = p_member and tm.status = 'active'
  ), owner as (
    select public.team_seat_limit(p.plan) as seats from public.profiles p where p.id = p_owner
  )
  select exists (select 1 from me) and coalesce((select seats from owner), 0) > 0 and (
    exists (select 1 from public.team_seat_grace g where g.owner_id = p_owner and g.until > now())
    or (
      select count(*) from public.team_members o, me
      where o.owner_id = p_owner and o.status = 'active'
        and (coalesce(o.joined_at, 'epoch'), o.id) < (coalesce(me.joined_at, 'epoch'), me.id)
    ) < (select seats from owner)
  )
$$;
revoke execute on function public.team_seat_ok(uuid, uuid) from public, anon, authenticated;
grant execute on function public.team_seat_ok(uuid, uuid) to service_role;

create or replace function public.is_team_member_of(owner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.team_seat_ok(owner, auth.uid())
$$;

create or replace function public.is_team_member_of_folder(folder text)
returns boolean language sql stable security definer set search_path = public as $$
  select folder ~ '^[0-9a-f-]{36}$' and public.team_seat_ok(folder::uuid, auth.uid())
$$;

-- Start (or clear) the 7 days whenever the plan changes.
create or replace function public.team_seat_grace_on_plan()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  seats int := public.team_seat_limit(new.plan);
  active int;
begin
  if new.plan is not distinct from old.plan then return new; end if;
  select count(*) into active from public.team_members where owner_id = new.id and status = 'active';
  if seats > 0 and active > seats then
    insert into public.team_seat_grace (owner_id, until) values (new.id, now() + interval '7 days')
    on conflict (owner_id) do update set until = excluded.until;
  else
    delete from public.team_seat_grace where owner_id = new.id;
  end if;
  return new;
end
$$;
drop trigger if exists team_seat_grace_on_plan on public.profiles;
create trigger team_seat_grace_on_plan after update of plan on public.profiles
  for each row execute function public.team_seat_grace_on_plan();

-- Owners already over their seats get the same 7 days from today.
insert into public.team_seat_grace (owner_id, until)
select p.id, now() + interval '7 days' from public.profiles p
where public.team_seat_limit(p.plan) > 0
  and (select count(*) from public.team_members tm where tm.owner_id = p.id and tm.status = 'active') > public.team_seat_limit(p.plan)
on conflict (owner_id) do nothing;
