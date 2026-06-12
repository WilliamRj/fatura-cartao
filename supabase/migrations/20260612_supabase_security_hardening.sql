begin;

-- Stop instead of guessing ownership when legacy data is inconsistent.
do $$
declare
  target_table text;
  records_without_owner bigint;
  cross_owner_expenses bigint;
begin
  foreach target_table in array array['faturas', 'gastos', 'responsaveis']
  loop
    if to_regclass(format('public.%I', target_table)) is null then
      raise exception 'Required table public.% does not exist', target_table;
    end if;

    execute format(
      'select count(*) from public.%I where user_id is null',
      target_table
    ) into records_without_owner;

    if records_without_owner > 0 then
      raise exception
        'Table public.% contains % records without an owner',
        target_table,
        records_without_owner;
    end if;
  end loop;

  select count(*)
  into cross_owner_expenses
  from public.gastos
  join public.faturas
    on faturas.id = gastos.fatura_id
  where gastos.user_id <> faturas.user_id;

  if cross_owner_expenses > 0 then
    raise exception
      'public.gastos contains % records linked to an invoice owned by another user',
      cross_owner_expenses;
  end if;

  if to_regclass('public.parcelamentos') is not null then
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'parcelamentos'
        and column_name = 'user_id'
    ) then
      raise exception 'Legacy table public.parcelamentos exists without user_id';
    end if;

    select count(*)
    into records_without_owner
    from public.parcelamentos
    where user_id is null;

    if records_without_owner > 0 then
      raise exception
        'Table public.parcelamentos contains % records without an owner',
        records_without_owner;
    end if;
  end if;
end
$$;

alter table public.faturas
  alter column user_id set not null;

alter table public.gastos
  alter column user_id set not null;

alter table public.responsaveis
  alter column user_id set not null;

do $$
begin
  if to_regclass('public.parcelamentos') is not null then
    alter table public.parcelamentos
      alter column user_id set not null;
  end if;
end
$$;

-- The composite key makes cross-owner invoice links impossible even for
-- privileged integrations that bypass RLS.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.faturas'::regclass
      and conname = 'faturas_id_user_id_key'
  ) then
    alter table public.faturas
      add constraint faturas_id_user_id_key unique (id, user_id);
  end if;
end
$$;

do $$
declare
  foreign_key record;
begin
  for foreign_key in
    select constraint_info.conname
    from pg_constraint as constraint_info
    where constraint_info.contype = 'f'
      and constraint_info.conrelid = 'public.gastos'::regclass
      and (
        select column_info.attnum
        from pg_attribute as column_info
        where column_info.attrelid = 'public.gastos'::regclass
          and column_info.attname = 'fatura_id'
      ) = any(constraint_info.conkey)
  loop
    execute format(
      'alter table public.gastos drop constraint %I',
      foreign_key.conname
    );
  end loop;
end
$$;

alter table public.gastos
  add constraint gastos_fatura_owner_fkey
  foreign key (fatura_id, user_id)
  references public.faturas(id, user_id)
  on delete cascade;

do $$
declare
  foreign_key record;
  cross_owner_installments bigint;
begin
  if to_regclass('public.parcelamentos') is null
    or not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'parcelamentos'
        and column_name = 'fatura_id'
    ) then
    return;
  end if;

  execute '
    select count(*)
    from public.parcelamentos
    join public.faturas
      on faturas.id = parcelamentos.fatura_id
    where parcelamentos.user_id <> faturas.user_id
  ' into cross_owner_installments;

  if cross_owner_installments > 0 then
    raise exception
      'public.parcelamentos contains % cross-owner invoice links',
      cross_owner_installments;
  end if;

  for foreign_key in
    select constraint_info.conname
    from pg_constraint as constraint_info
    where constraint_info.contype = 'f'
      and constraint_info.conrelid = 'public.parcelamentos'::regclass
      and (
        select column_info.attnum
        from pg_attribute as column_info
        where column_info.attrelid = 'public.parcelamentos'::regclass
          and column_info.attname = 'fatura_id'
      ) = any(constraint_info.conkey)
  loop
    execute format(
      'alter table public.parcelamentos drop constraint %I',
      foreign_key.conname
    );
  end loop;

  alter table public.parcelamentos
    add constraint parcelamentos_fatura_owner_fkey
    foreign key (fatura_id, user_id)
    references public.faturas(id, user_id)
    on delete cascade;
end
$$;

-- Stored PDF paths must remain inside the owner's folder.
alter table public.faturas
  drop constraint if exists faturas_arquivo_url_owner_path;

alter table public.faturas
  add constraint faturas_arquivo_url_owner_path
  check (
    arquivo_url is null
    or arquivo_url ~ (
      '^'
      || user_id::text
      || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$'
    )
  );

-- FORCE RLS also protects operations performed by a table owner that does
-- not have BYPASSRLS. Explicit grants make RLS the second security gate.
alter table public.faturas enable row level security;
alter table public.faturas force row level security;
alter table public.gastos enable row level security;
alter table public.gastos force row level security;
alter table public.responsaveis enable row level security;
alter table public.responsaveis force row level security;
alter table public.authorized_users enable row level security;
alter table public.authorized_users force row level security;

do $$
declare
  target_table text;
  policy_record record;
begin
  foreach target_table in array array[
    'faturas',
    'gastos',
    'responsaveis',
    'parcelamentos'
  ]
  loop
    if to_regclass(format('public.%I', target_table)) is null then
      continue;
    end if;

    execute format(
      'alter table public.%I enable row level security',
      target_table
    );
    execute format(
      'alter table public.%I force row level security',
      target_table
    );

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
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      target_table || '_select_own',
      target_table
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      target_table || '_insert_own',
      target_table
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      target_table || '_update_own',
      target_table
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      target_table || '_delete_own',
      target_table
    );
  end loop;
end
$$;

-- A gasto must reference an invoice visible to and owned by the same user.
drop policy if exists gastos_insert_own on public.gastos;
drop policy if exists gastos_update_own on public.gastos;

create policy gastos_insert_own
  on public.gastos
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      fatura_id is null
      or exists (
        select 1
        from public.faturas
        where faturas.id = gastos.fatura_id
          and faturas.user_id = (select auth.uid())
      )
    )
  );

create policy gastos_update_own
  on public.gastos
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      fatura_id is null
      or exists (
        select 1
        from public.faturas
        where faturas.id = gastos.fatura_id
          and faturas.user_id = (select auth.uid())
      )
    )
  );

do $$
declare
  policy_record record;
begin
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
end
$$;

create policy authorized_users_select_self
  on public.authorized_users
  for select
  to authenticated
  using (
    lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );

-- Remove implicit API privileges and grant only what the application uses.
revoke all on table public.faturas from public, anon;
revoke all on table public.gastos from public, anon;
revoke all on table public.responsaveis from public, anon;
revoke all on table public.authorized_users from public, anon;

revoke all on table public.faturas from authenticated;
revoke all on table public.gastos from authenticated;
revoke all on table public.responsaveis from authenticated;
revoke all on table public.authorized_users from authenticated;

grant select, insert, update, delete on table public.faturas to authenticated;
grant select, insert, update, delete on table public.gastos to authenticated;
grant select, insert, update, delete on table public.responsaveis to authenticated;
grant select on table public.authorized_users to authenticated;

do $$
begin
  if to_regclass('public.parcelamentos') is not null then
    revoke all on table public.parcelamentos from public, anon;
    revoke all on table public.parcelamentos from authenticated;
    grant select, insert, update, delete
      on table public.parcelamentos
      to authenticated;
  end if;
end
$$;

revoke create on schema public from anon;
revoke create on schema public from authenticated;

-- RPCs are callable only by signed-in users.
revoke execute on function public.import_fatura_atomically(
  text,
  numeric,
  timestamptz,
  text,
  jsonb,
  text,
  text
) from public, anon;

grant execute on function public.import_fatura_atomically(
  text,
  numeric,
  timestamptz,
  text,
  jsonb,
  text,
  text
) to authenticated;

revoke execute on function public.delete_fatura_atomically(uuid)
  from public, anon;

grant execute on function public.delete_fatura_atomically(uuid)
  to authenticated;

-- Recreate the application bucket policies so old policies with the same
-- names cannot retain broader predicates.
drop policy if exists faturas_pdf_select_own on storage.objects;
drop policy if exists faturas_pdf_insert_own on storage.objects;
drop policy if exists faturas_pdf_update_own on storage.objects;
drop policy if exists faturas_pdf_delete_own on storage.objects;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname, cmd, qual, with_check
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and roles && array['public', 'anon', 'authenticated']::name[]
  loop
    if coalesce(policy_record.qual, '') ilike '%faturas%'
      or coalesce(policy_record.with_check, '') ilike '%faturas%' then
      execute format(
        'drop policy if exists %I on storage.objects',
        policy_record.policyname
      );
    elsif (
        policy_record.cmd in ('SELECT', 'DELETE', 'UPDATE', 'ALL')
        and coalesce(policy_record.qual, '') not ilike '%bucket_id%'
      )
      or (
        policy_record.cmd in ('INSERT', 'UPDATE', 'ALL')
        and coalesce(policy_record.with_check, '') not ilike '%bucket_id%'
      ) then
      raise exception
        'Review broad or competing storage.objects policy before continuing: %',
        policy_record.policyname;
    end if;
  end loop;
end
$$;

create policy faturas_pdf_select_own
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'faturas'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy faturas_pdf_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'faturas'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy faturas_pdf_delete_own
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'faturas'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

commit;
