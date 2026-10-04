-- The server's admin key (service_role) was missing table permissions, so
-- server-side reads failed with "permission denied for table portals".
-- service_role is Supabase's built-in admin role used only by your server
-- (it's never sent to browsers); it's normally granted everything.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
-- Tables and functions created later get the same access automatically
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
