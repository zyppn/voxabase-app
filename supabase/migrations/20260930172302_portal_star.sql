-- Starred portals stay at the top of the dashboard list.
-- Existing update policies on portals already cover who can change it
-- (the owner, and teammates on Team portals).
alter table public.portals add column if not exists starred boolean not null default false;
