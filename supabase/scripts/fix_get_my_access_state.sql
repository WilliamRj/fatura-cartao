-- Repairs SQLSTATE 42702 in get_my_access_state() after the access workflow
-- migration has already been applied.

begin;

create or replace function public.get_my_access_state()
returns table (
  user_id uuid,
  email text,
  display_name text,
  avatar_url text,
  access_status text,
  decision_reason text,
  requested_at timestamptz,
  reviewed_at timestamptz,
  last_request_at timestamptz,
  request_count integer,
  is_admin boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_email text := lower(coalesce((select auth.jwt() ->> 'email'), ''));
  current_name text := coalesce(
    (select auth.jwt() -> 'user_metadata' ->> 'full_name'),
    (select auth.jwt() -> 'user_metadata' ->> 'name')
  );
  current_avatar text := coalesce(
    (select auth.jwt() -> 'user_metadata' ->> 'avatar_url'),
    (select auth.jwt() -> 'user_metadata' ->> 'picture')
  );
  admin_user boolean;
  initial_status text;
begin
  if current_user_id is null or current_email = '' then
    raise exception 'Authenticated user with email required';
  end if;

  select exists (
    select 1
    from public.system_admins
    where system_admins.user_id = current_user_id
  ) into admin_user;

  initial_status := case
    when admin_user then 'approved'
    when exists (
      select 1
      from public.authorized_users
      where lower(authorized_users.email) = current_email
    ) then 'approved'
    else 'pending'
  end;

  insert into public.app_users (
    user_id,
    email,
    display_name,
    avatar_url,
    access_status,
    last_login_at
  )
  values (
    current_user_id,
    current_email,
    current_name,
    current_avatar,
    initial_status,
    now()
  )
  on conflict on constraint app_users_pkey do update
  set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.app_users.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.app_users.avatar_url),
    access_status = case
      when admin_user then 'approved'
      else public.app_users.access_status
    end,
    last_login_at = now(),
    updated_at = now();

  if not exists (
    select 1
    from public.access_audit_log
    where access_audit_log.target_user_id = current_user_id
  ) then
    insert into public.access_audit_log (
      target_user_id,
      actor_user_id,
      action,
      previous_status,
      new_status
    )
    values (
      current_user_id,
      current_user_id,
      'requested',
      null,
      initial_status
    );
  end if;

  return query
  select
    app_users.user_id,
    app_users.email,
    app_users.display_name,
    app_users.avatar_url,
    app_users.access_status,
    app_users.decision_reason,
    app_users.requested_at,
    app_users.reviewed_at,
    app_users.last_request_at,
    app_users.request_count,
    admin_user
  from public.app_users
  where app_users.user_id = current_user_id;
end;
$$;

revoke execute on function public.get_my_access_state() from public, anon;
grant execute on function public.get_my_access_state() to authenticated;

select pg_notify('pgrst', 'reload schema');

commit;
