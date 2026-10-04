-- Team presence and names.
-- 1. profiles.last_seen_at: the app checks in about once a minute while open.
-- 2. touch_presence(): records "I'm here" for the signed-in user only.
-- 3. team_roster(owner): the owner plus every teammate, with display names and
--    last-seen times. Only the owner and that team's active members can call it,
--    and it returns names, emails and status only (no invite links, no billing).

alter table public.profiles add column if not exists last_seen_at timestamptz;

create or replace function public.touch_presence()
returns void language sql volatile security definer set search_path = public as $$
  update public.profiles set last_seen_at = now()
  where id = auth.uid() and (last_seen_at is null or last_seen_at < now() - interval '30 seconds')
$$;

create or replace function public.team_roster(p_owner uuid)
returns table (
  member_id uuid, email text, status text, is_owner boolean,
  business_name text, full_name text, last_seen_at timestamptz
) language sql stable security definer set search_path = public as $$
  select p.id, u.email::text, 'active', true, p.business_name, p.full_name, p.last_seen_at
  from public.profiles p join auth.users u on u.id = p.id
  where p.id = p_owner
    and (auth.uid() = p_owner or public.is_team_member_of(p_owner))
  union all
  select tm.member_id, tm.email, tm.status, false, mp.business_name, mp.full_name, mp.last_seen_at
  from public.team_members tm left join public.profiles mp on mp.id = tm.member_id
  where tm.owner_id = p_owner
    and (auth.uid() = p_owner or public.is_team_member_of(p_owner))
$$;

revoke execute on function public.touch_presence() from anon;
revoke execute on function public.team_roster(uuid) from anon;
grant execute on function public.touch_presence() to authenticated;
grant execute on function public.team_roster(uuid) to authenticated;
