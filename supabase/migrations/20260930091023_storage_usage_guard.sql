-- get_user_storage_bytes ran with full privileges and answered for any user id,
-- so anyone could look up another account's storage usage. Now it only answers
-- for your own account or an Agency team you belong to (others get 0).
create or replace function public.get_user_storage_bytes(user_uuid uuid)
returns bigint language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() = user_uuid or public.is_team_member_of(user_uuid)
      then (select coalesce(sum(file_size), 0)::bigint from public.files where user_id = user_uuid)
    else 0::bigint
  end
$$;
revoke execute on function public.get_user_storage_bytes(uuid) from anon;
