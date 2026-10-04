-- Portal style: how an owner's client portals look to their clients, Dark or
-- Light (Custom branding, Pro and Agency). Separate from the app's own
-- Appearance, which is a per-browser setting and never stored here.
alter table public.profiles
  add column if not exists portal_style text not null default 'dark'
  check (portal_style in ('dark', 'light'));
