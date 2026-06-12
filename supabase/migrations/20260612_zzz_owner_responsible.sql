begin;

alter table public.responsaveis
  add column if not exists is_owner boolean not null default false;

-- Stop before creating the case-insensitive unique index if legacy names
-- differ only by capitalization.
do $$
declare
  duplicate_names text;
begin
  select string_agg(
    format('%s: %s', user_id, normalized_name),
    ', '
  )
  into duplicate_names
  from (
    select user_id, lower(nome) as normalized_name
    from public.responsaveis
    group by user_id, lower(nome)
    having count(*) > 1
  ) as duplicate_groups;

  if duplicate_names is not null then
    raise exception
      'Resolve duplicate responsible names before continuing: %',
      duplicate_names;
  end if;
end
$$;

-- Preserve the responsible previously marked as principal for existing users.
with ranked_principals as (
  select
    id,
    row_number() over (
      partition by user_id
      order by created_at nulls last, id
    ) as position
  from public.responsaveis
  where cor = 'pessoal'
)
update public.responsaveis
set is_owner = true
from ranked_principals
where responsaveis.id = ranked_principals.id
  and ranked_principals.position = 1;

update public.responsaveis
set cor = null
where cor = 'pessoal'
  and not is_owner;

update public.responsaveis
set cor = 'pessoal'
where is_owner;

alter table public.responsaveis
  drop constraint if exists responsaveis_owner_role_check;

alter table public.responsaveis
  add constraint responsaveis_owner_role_check
  check (
    (is_owner and cor = 'pessoal')
    or (not is_owner and cor is distinct from 'pessoal')
  );

alter table public.responsaveis
  drop constraint if exists responsaveis_nome_not_blank;

alter table public.responsaveis
  add constraint responsaveis_nome_not_blank
  check (
    length(trim(nome)) between 1 and 80
    and nome = trim(nome)
  );

create unique index if not exists responsaveis_one_owner_per_user
  on public.responsaveis (user_id)
  where is_owner;

create unique index if not exists responsaveis_user_nome_lower_key
  on public.responsaveis (user_id, lower(nome));

create or replace function public.ensure_owner_responsavel()
returns public.responsaveis
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  preferred_name text;
  candidate_name text;
  suffix integer := 1;
  owner_responsible public.responsaveis%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required';
  end if;

  if not public.has_app_access() then
    raise exception 'Approved application access required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text, 0)
  );

  select *
  into owner_responsible
  from public.responsaveis
  where responsaveis.user_id = current_user_id
    and responsaveis.is_owner
  limit 1;

  if found then
    return owner_responsible;
  end if;

  preferred_name := trim(coalesce(
    (select auth.jwt() -> 'user_metadata' ->> 'full_name'),
    (select auth.jwt() -> 'user_metadata' ->> 'name'),
    split_part(coalesce((select auth.jwt() ->> 'email'), ''), '@', 1),
    'Titular'
  ));

  if preferred_name = '' then
    preferred_name := 'Titular';
  end if;

  candidate_name := left(preferred_name, 80);
  while exists (
    select 1
    from public.responsaveis
    where responsaveis.user_id = current_user_id
      and lower(responsaveis.nome) = lower(candidate_name)
  )
  loop
    candidate_name := left(
      preferred_name,
      greatest(1, 80 - length(format(' (Titular %s)', suffix)))
    ) || format(' (Titular %s)', suffix);
    suffix := suffix + 1;
  end loop;

  insert into public.responsaveis (
    user_id,
    nome,
    cor,
    is_owner
  )
  values (
    current_user_id,
    candidate_name,
    'pessoal',
    true
  )
  returning * into owner_responsible;

  return owner_responsible;
end;
$$;

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
  old_name text;
  normalized_name text := trim(p_new_name);
  renamed_responsible public.responsaveis%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authenticated user required';
  end if;

  if not public.has_app_access() then
    raise exception 'Approved application access required';
  end if;

  if normalized_name is null
    or length(normalized_name) < 1
    or length(normalized_name) > 80 then
    raise exception 'Responsible name must contain between 1 and 80 characters';
  end if;

  select responsaveis.nome
  into old_name
  from public.responsaveis
  where responsaveis.id = p_responsavel_id
    and responsaveis.user_id = current_user_id
  for update;

  if old_name is null then
    raise exception 'Responsible not found';
  end if;

  if exists (
    select 1
    from public.responsaveis
    where responsaveis.user_id = current_user_id
      and responsaveis.id <> p_responsavel_id
      and lower(responsaveis.nome) = lower(normalized_name)
  ) then
    raise exception 'A responsible with this name already exists';
  end if;

  if old_name = normalized_name then
    select *
    into renamed_responsible
    from public.responsaveis
    where responsaveis.id = p_responsavel_id;
    return renamed_responsible;
  end if;

  update public.responsaveis
  set nome = normalized_name
  where responsaveis.id = p_responsavel_id
    and responsaveis.user_id = current_user_id
  returning * into renamed_responsible;

  update public.gastos
  set responsavel = normalized_name
  where gastos.user_id = current_user_id
    and gastos.responsavel = old_name;

  update public.gastos
  set divisoes = (
    select jsonb_agg(
      case
        when division ->> 'responsavel' = old_name
          then jsonb_set(
            division,
            '{responsavel}',
            to_jsonb(normalized_name),
            false
          )
        else division
      end
      order by division_position
    )
    from jsonb_array_elements(gastos.divisoes) with ordinality
      as divisions(division, division_position)
  )
  where gastos.user_id = current_user_id
    and gastos.divisoes is not null
    and jsonb_typeof(gastos.divisoes) = 'array'
    and exists (
      select 1
      from jsonb_array_elements(gastos.divisoes) as division
      where division ->> 'responsavel' = old_name
    );

  return renamed_responsible;
end;
$$;

drop policy if exists responsaveis_delete_non_owner on public.responsaveis;
create policy responsaveis_delete_non_owner
  on public.responsaveis
  as restrictive
  for delete
  to authenticated
  using (not is_owner);

revoke insert, update on table public.responsaveis from authenticated;
grant insert (user_id, nome) on table public.responsaveis to authenticated;

revoke execute on function public.ensure_owner_responsavel() from public, anon;
revoke execute on function public.rename_responsavel(uuid, text) from public, anon;

grant execute on function public.ensure_owner_responsavel() to authenticated;
grant execute on function public.rename_responsavel(uuid, text) to authenticated;

commit;
