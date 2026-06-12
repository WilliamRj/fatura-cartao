-- Runs after the existing 2026-06-12 hardening and import-job migrations.
begin;

create table if not exists public.app_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  access_status text not null default 'pending'
    check (access_status in ('pending', 'approved', 'rejected', 'suspended', 'withdrawn')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  decision_reason text,
  request_count integer not null default 1 check (request_count > 0),
  last_request_at timestamptz not null default now(),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists app_users_email_lower_key
  on public.app_users (lower(email));

create index if not exists app_users_access_status_requested_at_idx
  on public.app_users (access_status, requested_at desc);

create table if not exists public.system_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists public.access_audit_log (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null
    check (
      action in (
        'requested',
        'requested_again',
        'approved',
        'rejected',
        'suspended',
        'reactivated',
        'withdrawn'
      )
    ),
  previous_status text,
  new_status text not null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists access_audit_log_target_created_at_idx
  on public.access_audit_log (target_user_id, created_at desc);

-- Migrate users who already authenticated and were present in the legacy allowlist.
insert into public.app_users (
  user_id,
  email,
  display_name,
  avatar_url,
  access_status,
  reviewed_at,
  request_count,
  last_request_at
)
select
  users.id,
  users.email,
  coalesce(
    users.raw_user_meta_data ->> 'full_name',
    users.raw_user_meta_data ->> 'name'
  ),
  coalesce(
    users.raw_user_meta_data ->> 'avatar_url',
    users.raw_user_meta_data ->> 'picture'
  ),
  'approved',
  now(),
  1,
  now()
from auth.users as users
join public.authorized_users as authorized
  on lower(authorized.email) = lower(users.email)
where users.email is not null
on conflict (user_id) do update
set
  email = excluded.email,
  display_name = coalesce(excluded.display_name, public.app_users.display_name),
  avatar_url = coalesce(excluded.avatar_url, public.app_users.avatar_url),
  access_status = case
    when public.app_users.access_status = 'pending' then 'approved'
    else public.app_users.access_status
  end,
  updated_at = now();

create or replace function public.is_system_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.system_admins
    where system_admins.user_id = (select auth.uid())
  );
$$;

create or replace function public.has_app_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.app_users
    where app_users.user_id = (select auth.uid())
      and app_users.access_status = 'approved'
  )
  or public.is_system_admin();
$$;

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

create or replace function public.renew_my_access_request()
returns table (
  access_status text,
  last_request_at timestamptz,
  request_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  previous_status text;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required';
  end if;

  select app_users.access_status
  into previous_status
  from public.app_users
  where app_users.user_id = current_user_id
  for update;

  if previous_status not in ('rejected', 'withdrawn') then
    raise exception 'Only rejected or withdrawn requests may be renewed';
  end if;

  update public.app_users
  set
    access_status = 'pending',
    decision_reason = null,
    reviewed_at = null,
    reviewed_by = null,
    request_count = app_users.request_count + 1,
    last_request_at = now(),
    updated_at = now()
  where app_users.user_id = current_user_id;

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
    'requested_again',
    previous_status,
    'pending'
  );

  return query
  select
    app_users.access_status,
    app_users.last_request_at,
    app_users.request_count
  from public.app_users
  where app_users.user_id = current_user_id;
end;
$$;

create or replace function public.withdraw_my_access_request()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authenticated user required';
  end if;

  update public.app_users
  set
    access_status = 'withdrawn',
    updated_at = now()
  where app_users.user_id = current_user_id
    and app_users.access_status = 'pending';

  if not found then
    raise exception 'Only pending requests may be withdrawn';
  end if;

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
    'withdrawn',
    'pending',
    'withdrawn'
  );

  return 'withdrawn';
end;
$$;

create or replace function public.admin_list_access_requests(
  p_requested_status text default null
)
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
  last_login_at timestamptz,
  request_count integer,
  is_admin boolean
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_system_admin() then
    raise exception 'Administrator access required';
  end if;

  if p_requested_status is not null
    and p_requested_status not in ('pending', 'approved', 'rejected', 'suspended', 'withdrawn') then
    raise exception 'Invalid access status';
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
    app_users.last_login_at,
    app_users.request_count,
    exists (
      select 1
      from public.system_admins
      where system_admins.user_id = app_users.user_id
    )
  from public.app_users
  where p_requested_status is null
    or app_users.access_status = p_requested_status
  order by
    case app_users.access_status
      when 'pending' then 0
      when 'rejected' then 1
      when 'suspended' then 2
      when 'approved' then 3
      else 4
    end,
    app_users.last_request_at desc;
end;
$$;

create or replace function public.admin_set_access_status(
  p_target_user_id uuid,
  p_new_status text,
  p_reason text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  previous_status text;
  action_name text;
  target_email text;
begin
  if not public.is_system_admin() then
    raise exception 'Administrator access required';
  end if;

  if p_new_status not in ('approved', 'rejected', 'suspended') then
    raise exception 'Invalid administrative status';
  end if;

  if p_target_user_id = actor_user_id and p_new_status <> 'approved' then
    raise exception 'An administrator cannot block their own access';
  end if;

  if exists (
    select 1
    from public.system_admins
    where system_admins.user_id = p_target_user_id
  ) and p_new_status <> 'approved' then
    raise exception 'System administrators must be managed by script';
  end if;

  if p_new_status in ('rejected', 'suspended')
    and length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'A reason is required';
  end if;

  select app_users.access_status, app_users.email
  into previous_status, target_email
  from public.app_users
  where app_users.user_id = p_target_user_id
  for update;

  if previous_status is null then
    raise exception 'User not found';
  end if;

  action_name := case
    when p_new_status = 'approved' and previous_status = 'suspended' then 'reactivated'
    when p_new_status = 'approved' then 'approved'
    when p_new_status = 'rejected' then 'rejected'
    else 'suspended'
  end;

  update public.app_users
  set
    access_status = p_new_status,
    decision_reason = nullif(trim(coalesce(p_reason, '')), ''),
    reviewed_at = now(),
    reviewed_by = actor_user_id,
    updated_at = now()
  where app_users.user_id = p_target_user_id;

  if p_new_status = 'approved' then
    insert into public.authorized_users (email)
    values (target_email)
    on conflict (email) do nothing;
  else
    delete from public.authorized_users
    where lower(authorized_users.email) = lower(target_email);
  end if;

  insert into public.access_audit_log (
    target_user_id,
    actor_user_id,
    action,
    previous_status,
    new_status,
    reason
  )
  values (
    p_target_user_id,
    actor_user_id,
    action_name,
    previous_status,
    p_new_status,
    nullif(trim(coalesce(p_reason, '')), '')
  );

  return p_new_status;
end;
$$;

create or replace function public.admin_get_access_audit(
  p_target_user_id uuid
)
returns table (
  id uuid,
  action text,
  previous_status text,
  new_status text,
  reason text,
  actor_email text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_system_admin() then
    raise exception 'Administrator access required';
  end if;

  return query
  select
    audit.id,
    audit.action,
    audit.previous_status,
    audit.new_status,
    audit.reason,
    actor.email::text,
    audit.created_at
  from public.access_audit_log as audit
  left join auth.users as actor
    on actor.id = audit.actor_user_id
  where audit.target_user_id = p_target_user_id
  order by audit.created_at desc;
end;
$$;

alter table public.app_users enable row level security;
alter table public.app_users force row level security;
alter table public.system_admins enable row level security;
alter table public.system_admins force row level security;
alter table public.access_audit_log enable row level security;
alter table public.access_audit_log force row level security;

-- Restrictive policies make suspension effective for existing sessions and
-- direct Supabase calls, while preserving the ownership policies already in use.
do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'faturas',
    'gastos',
    'responsaveis',
    'import_jobs',
    'parcelamentos'
  ]
  loop
    if to_regclass(format('public.%I', target_table)) is null then
      continue;
    end if;

    execute format(
      'drop policy if exists app_access_status_gate on public.%I',
      target_table
    );
    execute format(
      'create policy app_access_status_gate on public.%I as restrictive for all to authenticated using (public.has_app_access()) with check (public.has_app_access())',
      target_table
    );
  end loop;
end
$$;

drop policy if exists app_users_select_self on public.app_users;
create policy app_users_select_self
  on public.app_users
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists system_admins_select_self on public.system_admins;
create policy system_admins_select_self
  on public.system_admins
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists access_audit_log_select_self on public.access_audit_log;
create policy access_audit_log_select_self
  on public.access_audit_log
  for select
  to authenticated
  using ((select auth.uid()) = target_user_id);

drop policy if exists faturas_app_access_status_gate on storage.objects;
create policy faturas_app_access_status_gate
  on storage.objects
  as restrictive
  for all
  to authenticated
  using (
    bucket_id <> 'faturas'
    or public.has_app_access()
  )
  with check (
    bucket_id <> 'faturas'
    or public.has_app_access()
  );

revoke all on table public.app_users from public, anon, authenticated;
revoke all on table public.system_admins from public, anon, authenticated;
revoke all on table public.access_audit_log from public, anon, authenticated;

grant select on table public.app_users to authenticated;
grant select on table public.system_admins to authenticated;
grant select on table public.access_audit_log to authenticated;

revoke execute on function public.is_system_admin() from public, anon;
revoke execute on function public.has_app_access() from public, anon;
revoke execute on function public.get_my_access_state() from public, anon;
revoke execute on function public.renew_my_access_request() from public, anon;
revoke execute on function public.withdraw_my_access_request() from public, anon;
revoke execute on function public.admin_list_access_requests(text) from public, anon;
revoke execute on function public.admin_set_access_status(uuid, text, text) from public, anon;
revoke execute on function public.admin_get_access_audit(uuid) from public, anon;

grant execute on function public.is_system_admin() to authenticated;
grant execute on function public.has_app_access() to authenticated;
grant execute on function public.get_my_access_state() to authenticated;
grant execute on function public.renew_my_access_request() to authenticated;
grant execute on function public.withdraw_my_access_request() to authenticated;
grant execute on function public.admin_list_access_requests(text) to authenticated;
grant execute on function public.admin_set_access_status(uuid, text, text) to authenticated;
grant execute on function public.admin_get_access_audit(uuid) to authenticated;

comment on table public.system_admins is
  'Administrators must be inserted or removed only through trusted SQL scripts.';

commit;
