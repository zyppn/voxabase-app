-- Pro gets a Team workspace with 1 teammate (Agency keeps up to 4).
-- Team access now works for owners on Pro or Agency. Seat limits are enforced
-- when inviting; anyone already on a team keeps access after a downgrade to Pro.
-- Custom domains and client approvals stay Agency-only.

create or replace function public.is_team_member_of(owner uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.team_members tm
    join public.profiles p on p.id = tm.owner_id
    where tm.owner_id = owner and tm.member_id = auth.uid()
      and tm.status = 'active' and p.plan in ('pro', 'agency')
  )
$$;

create or replace function public.is_team_member_of_folder(folder text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.team_members tm
    join public.profiles p on p.id = tm.owner_id
    where tm.owner_id::text = folder and tm.member_id = auth.uid()
      and tm.status = 'active' and p.plan in ('pro', 'agency')
  )
$$;
