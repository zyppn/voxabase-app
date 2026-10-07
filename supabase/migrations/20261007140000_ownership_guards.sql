-- Ownership can't be forged from the browser.
-- Portals, files and portal passwords are written by signed-in users directly,
-- and the row rules only check that the user owns (or is on the team of) the
-- user_id they write. Nothing tied the other columns to it, so a user could:
--  - create a portal under someone else's username (it would show their name
--    and logo at /their-username/… while the invoice paid the creator);
--  - take a team portal over by changing its user_id (payments follow it);
--  - add a file record pointing at another account's stored file, which the
--    server would then hand out;
--  - attach a password row to someone else's portal.
-- These checks apply to signed-in and anonymous requests only. The server
-- (service key: moving portals, B2 uploads), the SQL editor and migrations
-- are unaffected.

create or replace function public.portals_ownership_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uname text;
begin
  if coalesce(auth.role(), '') not in ('anon', 'authenticated') then return new; end if;
  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id or new.owner_username is distinct from old.owner_username then
      raise exception 'Portals change owner through Move only.' using errcode = '42501';
    end if;
    return new;
  end if;
  select username into uname from public.profiles where id = new.user_id;
  if uname is null or new.owner_username is distinct from uname then
    raise exception 'A portal''s address must use its owner''s username.' using errcode = '42501';
  end if;
  return new;
end
$$;
drop trigger if exists portals_ownership_guard on public.portals;
create trigger portals_ownership_guard before insert or update on public.portals
  for each row execute function public.portals_ownership_guard();

create or replace function public.files_ownership_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') not in ('anon', 'authenticated') then return new; end if;
  -- Renames and reordering leave these alone (older files may predate the folder layout)
  if tg_op = 'UPDATE' and new.portal_id is not distinct from old.portal_id
    and new.user_id is not distinct from old.user_id and new.file_path is not distinct from old.file_path then
    return new;
  end if;
  if not exists (select 1 from public.portals p where p.id = new.portal_id and p.user_id = new.user_id) then
    raise exception 'A file belongs to its portal''s owner.' using errcode = '42501';
  end if;
  -- Files in Supabase Storage live under "<owner>/<portal>/…" (B2 records are
  -- server-only, see files_b2_guard)
  if coalesce(new.storage, 'supabase') <> 'b2'
    and (left(new.file_path, length(new.user_id::text || '/' || new.portal_id::text || '/')) <> new.user_id::text || '/' || new.portal_id::text || '/'
         or position('..' in new.file_path) > 0) then
    raise exception 'A file must be stored in its own portal''s folder.' using errcode = '42501';
  end if;
  return new;
end
$$;
drop trigger if exists files_ownership_guard on public.files;
create trigger files_ownership_guard before insert or update on public.files
  for each row execute function public.files_ownership_guard();

create or replace function public.portal_passwords_ownership_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') not in ('anon', 'authenticated') then return new; end if;
  if not exists (select 1 from public.portals p where p.id = new.portal_id and p.user_id = new.user_id) then
    raise exception 'A portal password belongs to the portal''s owner.' using errcode = '42501';
  end if;
  return new;
end
$$;
drop trigger if exists portal_passwords_ownership_guard on public.portal_passwords;
create trigger portal_passwords_ownership_guard before insert or update on public.portal_passwords
  for each row execute function public.portal_passwords_ownership_guard();
