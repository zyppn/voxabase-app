-- Delivered files move to Backblaze B2 (Supabase keeps the database and sign-in).
-- Files already in Supabase Storage stay there and keep working; new uploads
-- go to B2 once it's configured. Only the server (service role) can point a
-- record at a B2 object, and every B2 byte is counted toward a hard cap.

-- Where each file is stored, and (for B2) the exact version, so deleting it
-- removes it for good rather than hiding it
alter table public.files add column if not exists storage text not null default 'supabase';
alter table public.files add column if not exists storage_version text;
do $$ begin
  alter table public.files add constraint files_storage_check check (storage in ('supabase', 'b2'));
exception when duplicate_object then null; end $$;

-- Small previews of image files (B2 can't resize on the fly). Read only by the
-- server after the same checks as the file itself, so a locked file's preview
-- never reaches the client.
-- (file_id takes the same type as files.id, whatever the original setup used)
do $$ begin
  execute format(
    'create table if not exists public.file_thumbs (file_id %s primary key references public.files(id) on delete cascade, data text not null)',
    (select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.files'::regclass and attname = 'id')
  );
end $$;
alter table public.file_thumbs enable row level security;
revoke all on public.file_thumbs from anon, authenticated;

-- Uploads handed out but not finished yet. Counted toward the cap until they
-- finish or are cleaned up, so many uploads at once can't go over it.
create table if not exists public.pending_uploads (
  key text primary key,
  user_id uuid not null,
  portal_id uuid not null,
  size bigint not null,
  created_at timestamptz not null default now()
);
alter table public.pending_uploads enable row level security;
revoke all on public.pending_uploads from anon, authenticated;

-- B2 objects whose file record is gone (deleted file or portal, replaced
-- file). The server removes them from B2; until then they still count.
create table if not exists public.storage_deletions (
  key text primary key,
  version text,
  size bigint not null default 0,
  queued_at timestamptz not null default now()
);
alter table public.storage_deletions enable row level security;
revoke all on public.storage_deletions from anon, authenticated;

-- Signed-in users still edit their own file records (rename, reorder, delete),
-- but can't create B2 records or change where one points or how big it is:
-- those numbers are what the cap is checked against.
create or replace function public.files_b2_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    if tg_op = 'INSERT' and new.storage = 'b2' then
      raise exception 'B2 files are added by the server';
    end if;
    if tg_op = 'UPDATE' and (old.storage = 'b2' or new.storage = 'b2') and (
      new.storage is distinct from old.storage
      or new.file_path is distinct from old.file_path
      or new.file_size is distinct from old.file_size
      or new.storage_version is distinct from old.storage_version
    ) then
      raise exception 'B2 file locations are changed by the server';
    end if;
  end if;
  -- A B2 object no longer referenced: queue it for removal
  if tg_op = 'DELETE' and old.storage = 'b2' then
    insert into public.storage_deletions (key, version, size)
    values (old.file_path, old.storage_version, coalesce(old.file_size, 0))
    on conflict (key) do nothing;
    return old;
  end if;
  if tg_op = 'UPDATE' and old.storage = 'b2' and new.file_path is distinct from old.file_path then
    insert into public.storage_deletions (key, version, size)
    values (old.file_path, old.storage_version, coalesce(old.file_size, 0))
    on conflict (key) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists files_b2_guard on public.files;
create trigger files_b2_guard
  before insert or update or delete on public.files
  for each row execute function public.files_b2_guard();

-- Everything B2 holds or is about to hold, across all accounts
create or replace function public.b2_storage_bytes()
returns bigint language sql stable security definer set search_path = public as $$
  select (
    (select coalesce(sum(file_size), 0) from public.files where storage = 'b2')
    + (select coalesce(sum(size), 0) from public.pending_uploads)
    + (select coalesce(sum(size), 0) from public.storage_deletions)
  )::bigint
$$;
revoke execute on function public.b2_storage_bytes() from public, anon, authenticated;
grant execute on function public.b2_storage_bytes() to service_role;

-- An account's usage, counting uploads in flight (server-side plan limit check)
create or replace function public.owner_storage_bytes(owner uuid)
returns bigint language sql stable security definer set search_path = public as $$
  select (
    (select coalesce(sum(file_size), 0) from public.files where user_id = owner)
    + (select coalesce(sum(size), 0) from public.pending_uploads where user_id = owner)
  )::bigint
$$;
revoke execute on function public.owner_storage_bytes(uuid) from public, anon, authenticated;
grant execute on function public.owner_storage_bytes(uuid) to service_role;

-- Reserve room for one upload. Checked and recorded in one step under a lock,
-- so uploads started at the same moment can't each squeeze past the cap.
-- Returns 'ok', 'plan_full' (the account's plan limit) or 'cap_full' (B2's free allowance).
create or replace function public.reserve_b2_upload(
  p_key text, p_owner uuid, p_portal uuid, p_size bigint, p_plan_limit bigint, p_cap bigint
) returns text language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext('b2_storage_reserve'));
  if public.owner_storage_bytes(p_owner) + p_size > p_plan_limit then return 'plan_full'; end if;
  if public.b2_storage_bytes() + p_size > p_cap then return 'cap_full'; end if;
  insert into public.pending_uploads (key, user_id, portal_id, size) values (p_key, p_owner, p_portal, p_size);
  return 'ok';
end $$;
revoke execute on function public.reserve_b2_upload(text, uuid, uuid, bigint, bigint, bigint) from public, anon, authenticated;
grant execute on function public.reserve_b2_upload(text, uuid, uuid, bigint, bigint, bigint) to service_role;
