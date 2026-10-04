-- Signed-in users (the "authenticated" role) had no table permission on the
-- tables added today, so every read from the browser failed quietly: the Team
-- card looked empty, teammates never saw the workspace switcher, and portal
-- passwords couldn't be loaded or saved from the editor.
-- Row Level Security on each table still decides WHICH rows a person can touch;
-- these grants only let the requests reach those rules. Signed-out visitors
-- (anon) get nothing.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.team_members to authenticated;
grant select, insert, update, delete on public.custom_domains to authenticated;
grant select, insert, update, delete on public.portal_passwords to authenticated;
-- The helper functions the access rules call
grant execute on function public.is_team_member_of(uuid) to authenticated;
grant execute on function public.is_team_member_of_folder(text) to authenticated;
grant execute on function public.get_user_storage_bytes(uuid) to authenticated;
