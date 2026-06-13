begin;

alter table public.responsaveis
  add column if not exists archived_at timestamptz;

alter table public.gastos
  add column if not exists responsavel_id uuid,
  add column if not exists responsavel_nome_snapshot text;

update public.gastos as gastos
set
  responsavel_id = responsaveis.id,
  responsavel_nome_snapshot = coalesce(
    gastos.responsavel_nome_snapshot,
    nullif(trim(gastos.responsavel), ''),
    responsaveis.nome
  )
from public.responsaveis
where responsaveis.user_id = gastos.user_id
  and lower(responsaveis.nome) = lower(gastos.responsavel)
  and gastos.responsavel_id is null;

update public.gastos
set responsavel_nome_snapshot = coalesce(
  responsavel_nome_snapshot,
  nullif(trim(responsavel), ''),
  'Não definido'
);

do $$
begin
  if exists (
    select 1
    from public.gastos
    where responsavel_id is null
  ) then
    raise exception
      'Cannot migrate expenses: at least one legacy responsible name has no matching responsible record';
  end if;
end;
$$;

alter table public.gastos
  drop constraint if exists gastos_responsavel_owner_fkey,
  alter column responsavel_id set not null,
  alter column responsavel_nome_snapshot set not null;

create unique index if not exists responsaveis_user_id_id_key
  on public.responsaveis (user_id, id);

alter table public.gastos
  add constraint gastos_responsavel_owner_fkey
  foreign key (user_id, responsavel_id)
  references public.responsaveis (user_id, id)
  on update cascade
  on delete restrict;

-- Convert legacy division names into stable IDs while preserving the displayed
-- name from the moment the expense was created.
update public.gastos as gastos
set divisoes = (
  select jsonb_agg(
    jsonb_build_object(
      'valor', division -> 'valor',
      'responsavel_id', responsaveis.id,
      'responsavel_nome_snapshot', coalesce(
        division ->> 'responsavel_nome_snapshot',
        division ->> 'responsavel',
        responsaveis.nome,
        'Não definido'
      )
    )
    order by division_position
  )
  from jsonb_array_elements(gastos.divisoes) with ordinality
    as divisions(division, division_position)
  left join public.responsaveis
    on responsaveis.user_id = gastos.user_id
    and (
      responsaveis.id::text = division ->> 'responsavel_id'
      or lower(responsaveis.nome) = lower(division ->> 'responsavel')
    )
)
where gastos.divisoes is not null
  and jsonb_typeof(gastos.divisoes) = 'array';

do $$
begin
  if exists (
    select 1
    from public.gastos
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(gastos.divisoes) = 'array' then gastos.divisoes
        else '[]'::jsonb
      end
    ) as division
    where nullif(division ->> 'responsavel_id', '') is null
  ) then
    raise exception
      'Cannot migrate divisions: at least one legacy responsible name has no matching responsible record';
  end if;
end;
$$;

drop function if exists public.rename_responsavel(uuid, text);
drop function if exists public.import_fatura_atomically(
  text,
  numeric,
  timestamptz,
  text,
  jsonb,
  text,
  text
);

alter table public.gastos
  drop column responsavel;

create index if not exists gastos_responsavel_id_idx
  on public.gastos (responsavel_id);

create index if not exists responsaveis_active_user_name_idx
  on public.responsaveis (user_id, lower(nome))
  where archived_at is null;

drop index if exists public.responsaveis_user_nome_lower_key;
create unique index responsaveis_active_user_nome_lower_key
  on public.responsaveis (user_id, lower(nome))
  where archived_at is null;

create function public.import_fatura_atomically(
  p_mes_referencia text,
  p_valor_total numeric,
  p_data_importacao timestamptz,
  p_responsavel_id uuid,
  p_lancamentos jsonb,
  p_arquivo_url text,
  p_arquivo_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  authenticated_user_id uuid := auth.uid();
  responsible_name text;
  created_fatura public.faturas%rowtype;
begin
  if authenticated_user_id is null then
    raise exception 'Authentication is required';
  end if;

  select responsaveis.nome
  into responsible_name
  from public.responsaveis
  where responsaveis.id = p_responsavel_id
    and responsaveis.user_id = authenticated_user_id
    and responsaveis.archived_at is null;

  if responsible_name is null then
    raise exception 'Active responsible not found';
  end if;

  if p_lancamentos is null
    or jsonb_typeof(p_lancamentos) <> 'array'
    or jsonb_array_length(p_lancamentos) = 0
    or jsonb_array_length(p_lancamentos) > 5000 then
    raise exception 'Lancamentos must contain between 1 and 5000 items';
  end if;

  if p_arquivo_url is null
    or p_arquivo_url !~ (
      '^'
      || authenticated_user_id::text
      || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$'
    ) then
    raise exception 'Invalid invoice PDF path';
  end if;

  if p_arquivo_hash is null
    or p_arquivo_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid invoice PDF SHA-256 hash';
  end if;

  insert into public.faturas (
    user_id,
    mes_referencia,
    valor_total,
    quantidade_lancamentos,
    data_importacao,
    arquivo_url,
    arquivo_hash
  )
  values (
    authenticated_user_id,
    p_mes_referencia,
    p_valor_total,
    jsonb_array_length(p_lancamentos),
    p_data_importacao,
    p_arquivo_url,
    p_arquivo_hash
  )
  returning * into created_fatura;

  insert into public.gastos (
    user_id,
    fatura_id,
    data,
    estabelecimento,
    valor,
    parcela,
    categoria,
    responsavel_id,
    responsavel_nome_snapshot
  )
  select
    authenticated_user_id,
    created_fatura.id,
    lancamento.data,
    lancamento.estabelecimento,
    lancamento.valor,
    lancamento.parcela,
    lancamento.categoria,
    p_responsavel_id,
    responsible_name
  from jsonb_to_recordset(p_lancamentos) as lancamento(
    data date,
    estabelecimento text,
    valor numeric,
    parcela text,
    categoria text
  );

  return to_jsonb(created_fatura);
end;
$$;

revoke all on function public.import_fatura_atomically(
  text,
  numeric,
  timestamptz,
  uuid,
  jsonb,
  text,
  text
) from public;

grant execute on function public.import_fatura_atomically(
  text,
  numeric,
  timestamptz,
  uuid,
  jsonb,
  text,
  text
) to authenticated;

create or replace function public.rename_responsavel(
  p_responsavel_id uuid,
  p_new_name text
)
returns public.responsaveis
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_name text := trim(p_new_name);
  renamed_responsible public.responsaveis%rowtype;
begin
  if current_user_id is null or not public.has_app_access() then
    raise exception 'Approved application access required';
  end if;

  if normalized_name is null
    or length(normalized_name) < 1
    or length(normalized_name) > 80 then
    raise exception 'Responsible name must contain between 1 and 80 characters';
  end if;

  if exists (
    select 1
    from public.responsaveis
    where responsaveis.user_id = current_user_id
      and responsaveis.id <> p_responsavel_id
      and responsaveis.archived_at is null
      and lower(responsaveis.nome) = lower(normalized_name)
  ) then
    raise exception 'A responsible with this name already exists';
  end if;

  update public.responsaveis
  set nome = normalized_name
  where responsaveis.id = p_responsavel_id
    and responsaveis.user_id = current_user_id
    and responsaveis.archived_at is null
  returning * into renamed_responsible;

  if renamed_responsible.id is null then
    raise exception 'Active responsible not found';
  end if;

  return renamed_responsible;
end;
$$;

create or replace function public.archive_or_delete_responsavel(
  p_responsavel_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target public.responsaveis%rowtype;
  has_history boolean;
begin
  if current_user_id is null or not public.has_app_access() then
    raise exception 'Approved application access required';
  end if;

  select *
  into target
  from public.responsaveis
  where responsaveis.id = p_responsavel_id
    and responsaveis.user_id = current_user_id
  for update;

  if target.id is null then
    raise exception 'Responsible not found';
  end if;

  if target.is_owner then
    raise exception 'The account owner cannot be archived';
  end if;

  select exists (
    select 1
    from public.gastos
    where gastos.user_id = current_user_id
      and (
        gastos.responsavel_id = p_responsavel_id
        or exists (
          select 1
          from jsonb_array_elements(
            case
              when jsonb_typeof(gastos.divisoes) = 'array' then gastos.divisoes
              else '[]'::jsonb
            end
          )
            as division
          where division ->> 'responsavel_id' = p_responsavel_id::text
        )
      )
  ) into has_history;

  if has_history then
    update public.responsaveis
    set archived_at = coalesce(archived_at, now())
    where id = p_responsavel_id;
    return 'archived';
  end if;

  delete from public.responsaveis
  where id = p_responsavel_id;
  return 'deleted';
end;
$$;

alter table public.app_users
  add column if not exists access_expires_at timestamptz;

alter table public.access_audit_log
  add column if not exists access_expires_at timestamptz,
  add column if not exists email_status text
    check (email_status in ('pending', 'sent', 'failed', 'skipped')),
  add column if not exists email_error text;

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
      and (
        app_users.access_expires_at is null
        or app_users.access_expires_at > now()
      )
  )
  or public.is_system_admin();
$$;

drop function if exists public.get_my_access_state();
create function public.get_my_access_state()
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
  access_expires_at timestamptz,
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

  select public.is_system_admin() into admin_user;
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
    access_expires_at = case
      when admin_user then null
      else public.app_users.access_expires_at
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
    case
      when app_users.access_status = 'approved'
        and app_users.access_expires_at is not null
        and app_users.access_expires_at <= now()
        and not admin_user
      then 'suspended'
      else app_users.access_status
    end,
    case
      when app_users.access_status = 'approved'
        and app_users.access_expires_at is not null
        and app_users.access_expires_at <= now()
        and not admin_user
      then 'Seu acesso temporário expirou.'
      else app_users.decision_reason
    end,
    app_users.requested_at,
    app_users.reviewed_at,
    app_users.last_request_at,
    app_users.request_count,
    app_users.access_expires_at,
    admin_user
  from public.app_users
  where app_users.user_id = current_user_id;
end;
$$;

drop function if exists public.admin_list_access_requests(text);
create function public.admin_list_access_requests(
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
  access_expires_at timestamptz,
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

  return query
  select
    app_users.user_id,
    app_users.email,
    app_users.display_name,
    app_users.avatar_url,
    case
      when app_users.access_status = 'approved'
        and app_users.access_expires_at is not null
        and app_users.access_expires_at <= now()
      then 'suspended'
      else app_users.access_status
    end,
    app_users.decision_reason,
    app_users.requested_at,
    app_users.reviewed_at,
    app_users.last_request_at,
    app_users.last_login_at,
    app_users.request_count,
    app_users.access_expires_at,
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

drop function if exists public.admin_set_access_status(uuid, text, text);
create function public.admin_set_access_status(
  p_target_user_id uuid,
  p_new_status text,
  p_reason text default null,
  p_access_expires_at timestamptz default null
)
returns table (
  access_status text,
  audit_id uuid,
  target_email text,
  target_display_name text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  previous_status text;
  action_name text;
  target public.app_users%rowtype;
  created_audit_id uuid;
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

  if p_new_status <> 'approved' and p_access_expires_at is not null then
    raise exception 'Only approved access may expire';
  end if;

  if p_access_expires_at is not null and p_access_expires_at <= now() then
    raise exception 'Access expiration must be in the future';
  end if;

  if p_new_status in ('rejected', 'suspended')
    and length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'A reason is required';
  end if;

  select *
  into target
  from public.app_users
  where app_users.user_id = p_target_user_id
  for update;

  if target.user_id is null then
    raise exception 'User not found';
  end if;

  previous_status := target.access_status;
  action_name := case
    when p_new_status = 'approved' and previous_status = 'suspended' then 'reactivated'
    when p_new_status = 'approved' then 'approved'
    when p_new_status = 'rejected' then 'rejected'
    else 'suspended'
  end;

  update public.app_users
  set
    access_status = p_new_status,
    access_expires_at = case
      when p_new_status = 'approved' then p_access_expires_at
      else null
    end,
    decision_reason = nullif(trim(coalesce(p_reason, '')), ''),
    reviewed_at = now(),
    reviewed_by = actor_user_id,
    updated_at = now()
  where app_users.user_id = p_target_user_id;

  if p_new_status = 'approved' then
    insert into public.authorized_users (email)
    values (target.email)
    on conflict (email) do nothing;
  else
    delete from public.authorized_users
    where lower(authorized_users.email) = lower(target.email);
  end if;

  insert into public.access_audit_log (
    target_user_id,
    actor_user_id,
    action,
    previous_status,
    new_status,
    reason,
    access_expires_at,
    email_status
  )
  values (
    p_target_user_id,
    actor_user_id,
    action_name,
    previous_status,
    p_new_status,
    nullif(trim(coalesce(p_reason, '')), ''),
    case when p_new_status = 'approved' then p_access_expires_at else null end,
    'pending'
  )
  returning id into created_audit_id;

  return query
  select p_new_status, created_audit_id, target.email, target.display_name;
end;
$$;

create or replace function public.admin_record_access_email_result(
  p_audit_id uuid,
  p_status text,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_system_admin() then
    raise exception 'Administrator access required';
  end if;

  if p_status not in ('sent', 'failed', 'skipped') then
    raise exception 'Invalid email status';
  end if;

  update public.access_audit_log
  set
    email_status = p_status,
    email_error = nullif(left(coalesce(p_error, ''), 500), '')
  where id = p_audit_id;
end;
$$;

create or replace function public.admin_export_access_audit()
returns table (
  created_at timestamptz,
  target_email text,
  target_display_name text,
  action text,
  previous_status text,
  new_status text,
  reason text,
  access_expires_at timestamptz,
  actor_email text,
  email_status text,
  email_error text
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
    audit.created_at,
    target.email,
    target.display_name,
    audit.action,
    audit.previous_status,
    audit.new_status,
    audit.reason,
    audit.access_expires_at,
    actor.email::text,
    audit.email_status,
    audit.email_error
  from public.access_audit_log as audit
  join public.app_users as target
    on target.user_id = audit.target_user_id
  left join auth.users as actor
    on actor.id = audit.actor_user_id
  order by audit.created_at desc;
end;
$$;

drop function if exists public.admin_get_access_audit(uuid);
create function public.admin_get_access_audit(
  p_target_user_id uuid
)
returns table (
  id uuid,
  action text,
  previous_status text,
  new_status text,
  reason text,
  access_expires_at timestamptz,
  actor_email text,
  email_status text,
  email_error text,
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
    audit.access_expires_at,
    actor.email::text,
    audit.email_status,
    audit.email_error,
    audit.created_at
  from public.access_audit_log as audit
  left join auth.users as actor
    on actor.id = audit.actor_user_id
  where audit.target_user_id = p_target_user_id
  order by audit.created_at desc;
end;
$$;

revoke execute on function public.archive_or_delete_responsavel(uuid) from public, anon;
revoke execute on function public.admin_set_access_status(uuid, text, text, timestamptz) from public, anon;
revoke execute on function public.admin_record_access_email_result(uuid, text, text) from public, anon;
revoke execute on function public.admin_export_access_audit() from public, anon;
revoke delete on table public.responsaveis from authenticated;

grant execute on function public.archive_or_delete_responsavel(uuid) to authenticated;
grant execute on function public.get_my_access_state() to authenticated;
grant execute on function public.admin_list_access_requests(text) to authenticated;
grant execute on function public.admin_set_access_status(uuid, text, text, timestamptz) to authenticated;
grant execute on function public.admin_record_access_email_result(uuid, text, text) to authenticated;
grant execute on function public.admin_export_access_audit() to authenticated;
grant execute on function public.admin_get_access_audit(uuid) to authenticated;

comment on column public.gastos.responsavel_id is
  'Stable reference to the responsible; display history lives in responsavel_nome_snapshot.';
comment on column public.gastos.responsavel_nome_snapshot is
  'Responsible name displayed when the expense was created or last reassigned.';
comment on column public.responsaveis.archived_at is
  'Archived secondary responsibles remain available to historical expenses.';

commit;
