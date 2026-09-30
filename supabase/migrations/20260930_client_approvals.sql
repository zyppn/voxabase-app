-- Client approval workflows (Agency plan).
-- Run once in Supabase > SQL Editor. Safe to run again.
alter table public.portals
  add column if not exists approval_required boolean not null default false,
  add column if not exists approval_status text,
  add column if not exists approval_note text,
  add column if not exists approval_name text,
  add column if not exists approval_at timestamptz;

alter table public.portals drop constraint if exists portals_approval_status_check;
alter table public.portals add constraint portals_approval_status_check
  check (approval_status is null or approval_status in ('approved', 'changes_requested'));
