begin;

-- Every application table must identify its owner.
do $$
declare
  target_table text;
  records_without_owner bigint;
begin
  foreach target_table in array array['faturas', 'gastos', 'responsaveis']
  loop
    if to_regclass(format('public.%I', target_table)) is null then
      raise exception 'Required table public.% does not exist', target_table;
    end if;

    if not exists (
      select 1
      from information_schema.columns as column_info
      where column_info.table_schema = 'public'
        and column_info.table_name = target_table
        and column_info.column_name = 'user_id'
    ) then
      raise exception 'Required column public.%.user_id does not exist', target_table;
    end if;

    execute format(
      'select count(*) from public.%I where user_id is null',
      target_table
    ) into records_without_owner;

    if records_without_owner > 0 then
      raise exception
        'Table public.% contains % records without user_id. Backfill ownership before applying RLS.',
        target_table,
        records_without_owner;
    end if;
  end loop;
end
$$;

-- Remove previous policies from user-owned tables. PostgreSQL combines
-- permissive policies with OR, so leaving an old broad policy would weaken
-- the isolation policies below.
do $$
declare
  target_table text;
  policy_record record;
begin
  foreach target_table in array array['faturas', 'gastos', 'responsaveis', 'parcelamentos']
  loop
    if to_regclass(format('public.%I', target_table)) is null then
      continue;
    end if;

    if not exists (
      select 1
      from information_schema.columns as column_info
      where column_info.table_schema = 'public'
        and column_info.table_name = target_table
        and column_info.column_name = 'user_id'
    ) then
      raise exception 'Required column public.%.user_id does not exist', target_table;
    end if;

    execute format('alter table public.%I enable row level security', target_table);

    for policy_record in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table
    loop
      execute format(
        'drop policy if exists %I on public.%I',
        policy_record.policyname,
        target_table
      );
    end loop;

    execute format(
      'create policy %I on public.%I for select to authenticated using (auth.uid() = user_id)',
      target_table || '_select_own',
      target_table
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (auth.uid() = user_id)',
      target_table || '_insert_own',
      target_table
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      target_table || '_update_own',
      target_table
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (auth.uid() = user_id)',
      target_table || '_delete_own',
      target_table
    );
  end loop;
end
$$;

-- A gasto can only reference a fatura owned by the same authenticated user.
drop policy if exists gastos_insert_own on public.gastos;
drop policy if exists gastos_update_own on public.gastos;

create policy gastos_insert_own
  on public.gastos
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and (
      fatura_id is null
      or exists (
        select 1
        from public.faturas
        where faturas.id = gastos.fatura_id
          and faturas.user_id = auth.uid()
      )
    )
  );

create policy gastos_update_own
  on public.gastos
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      fatura_id is null
      or exists (
        select 1
        from public.faturas
        where faturas.id = gastos.fatura_id
          and faturas.user_id = auth.uid()
      )
    )
  );

-- A signed-in user may only verify their own email in the allowlist.
do $$
declare
  policy_record record;
begin
  if to_regclass('public.authorized_users') is null then
    raise exception 'Required table public.authorized_users does not exist';
  end if;

  alter table public.authorized_users enable row level security;

  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'authorized_users'
  loop
    execute format(
      'drop policy if exists %I on public.authorized_users',
      policy_record.policyname
    );
  end loop;

  create policy authorized_users_select_self
    on public.authorized_users
    for select
    to authenticated
    using (
      lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    );
end
$$;

commit;
