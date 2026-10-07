-- Portal passwords hashed, guessing limits that hold across servers, honest
-- view counts, and plan features checked by the database.

create extension if not exists pgcrypto with schema extensions;

-- 1. Portal passwords are stored as bcrypt hashes. Nobody can read one back
--    (the editor offers "change" or "remove"); the server sets and checks
--    them through the two functions below.
update public.portal_passwords
  set password = extensions.crypt(password, extensions.gen_salt('bf', 10))
  where password !~ '^\$2[abxy]\$';

revoke select, insert, update, delete on public.portal_passwords from anon, authenticated;

create or replace function public.set_portal_password(p_portal uuid, p_password text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  owner uuid;
begin
  select user_id into owner from public.portals where id = p_portal;
  if owner is null then raise exception 'Portal not found'; end if;
  if coalesce(p_password, '') = '' then
    delete from public.portal_passwords where portal_id = p_portal;
    update public.portals set password_protected = false where id = p_portal;
  else
    insert into public.portal_passwords (portal_id, user_id, password)
    values (p_portal, owner, extensions.crypt(p_password, extensions.gen_salt('bf', 10)))
    on conflict (portal_id) do update set password = excluded.password, user_id = excluded.user_id;
    update public.portals set password_protected = true where id = p_portal;
  end if;
end
$$;

create or replace function public.check_portal_password(p_portal uuid, p_password text)
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select exists (
    select 1 from public.portal_passwords
    where portal_id = p_portal and password = extensions.crypt(p_password, password)
  )
$$;

revoke execute on function public.set_portal_password(uuid, text) from public, anon, authenticated;
revoke execute on function public.check_portal_password(uuid, text) from public, anon, authenticated;
grant execute on function public.set_portal_password(uuid, text) to service_role;
grant execute on function public.check_portal_password(uuid, text) to service_role;

-- 2. Counters for rate limits (password guesses, view counting). Shared by
--    every server instance, unlike the old in-memory count. Server-only.
create table if not exists public.rate_limits (
  key text primary key,
  hits int not null,
  reset_at timestamptz not null
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- Counts one hit and says whether it's within p_max for the current window
create or replace function public.rate_limit_hit(p_key text, p_max int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  insert into public.rate_limits as r (key, hits, reset_at)
  values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update set
    hits = case when r.reset_at <= now() then 1 else r.hits + 1 end,
    reset_at = case when r.reset_at <= now() then now() + make_interval(secs => p_window_seconds) else r.reset_at end
  returning hits into n;
  -- Now and then, drop long-expired counters
  if random() < 0.01 then
    delete from public.rate_limits where reset_at < now() - interval '1 day';
  end if;
  return n <= p_max;
end
$$;

create or replace function public.rate_limit_clear(p_key text)
returns void language sql security definer set search_path = public as $$
  delete from public.rate_limits where key = p_key
$$;

revoke execute on function public.rate_limit_hit(text, int, int) from public, anon, authenticated;
revoke execute on function public.rate_limit_clear(text) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;
grant execute on function public.rate_limit_clear(text) to service_role;

-- 3. Plan rules on portals, for writes from the browser (extends the guard
--    from 20261007140000_ownership_guards.sql):
--    - password protection is switched only by the server (it checks the plan);
--    - on Free, the link ends in a random code the server picks (custom links
--      are a Pro feature).
create or replace function public.portals_ownership_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uname text;
  uplan text;
begin
  if coalesce(auth.role(), '') not in ('anon', 'authenticated') then return new; end if;
  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id or new.owner_username is distinct from old.owner_username then
      raise exception 'Portals change owner through Move only.' using errcode = '42501';
    end if;
    if new.password_protected is distinct from old.password_protected then
      raise exception 'Portal passwords are set through Voxabase.' using errcode = '42501';
    end if;
    if new.slug is distinct from old.slug then
      raise exception 'A portal''s link can''t be changed here.' using errcode = '42501';
    end if;
    return new;
  end if;
  select username, plan into uname, uplan from public.profiles where id = new.user_id;
  if uname is null or new.owner_username is distinct from uname then
    raise exception 'A portal''s address must use its owner''s username.' using errcode = '42501';
  end if;
  if coalesce(new.password_protected, false) then
    raise exception 'Portal passwords are set through Voxabase.' using errcode = '42501';
  end if;
  if coalesce(uplan, 'free') not in ('pro', 'agency') then
    new.slug := regexp_replace(coalesce(new.slug, ''), '-[a-z0-9]{0,5}$', '') || '-' || substr(md5(gen_random_uuid()::text), 1, 5);
  end if;
  return new;
end
$$;
