-- White-label portal domains (Agency).
-- One custom domain per account (e.g. files.harborcoffee.com). Rows are written
-- only by the server (service role) after the domain is added to Vercel; a
-- domain goes live once Vercel confirms its DNS, and stops if the owner leaves Agency.

create table if not exists public.custom_domains (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  domain text not null unique,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

alter table public.custom_domains enable row level security;

drop policy if exists "domains: owner reads" on public.custom_domains;
create policy "domains: owner reads" on public.custom_domains for select using (owner_id = auth.uid());

-- Teammates see the domain so their share links use it (needs the team seats migration).
drop policy if exists "domains: team reads" on public.custom_domains;
create policy "domains: team reads" on public.custom_domains for select using (public.is_team_member_of(owner_id));

-- Used by the app's router for every request on a custom domain: which
-- username's portals does this domain serve? Returns only the username.
create or replace function public.portal_username_for_domain(d text)
returns text language sql stable security definer set search_path = public as $$
  select cd.username
  from public.custom_domains cd
  join public.profiles p on p.id = cd.owner_id
  where cd.domain = lower(d) and cd.verified and p.plan = 'agency'
$$;
grant execute on function public.portal_username_for_domain(text) to anon, authenticated;
