-- Run in the Supabase SQL editor as an administrative user.
-- The test needs at least two existing auth.users and always rolls back.

begin;

do $$
declare
  user_ids uuid[];
  user_emails text[];
begin
  select
    array_agg(users.id order by users.created_at),
    array_agg(users.email order by users.created_at)
  into user_ids, user_emails
  from (
    select id, email, created_at
    from auth.users
    where email is not null
    order by created_at
    limit 2
  ) as users;

  if coalesce(array_length(user_ids, 1), 0) < 2 then
    raise exception 'This test requires at least two auth.users with email';
  end if;

  perform set_config('test.user_a', user_ids[1]::text, true);
  perform set_config('test.user_b', user_ids[2]::text, true);
  perform set_config('test.email_a', user_emails[1], true);
  perform set_config('test.email_b', user_emails[2], true);
end
$$;

insert into public.authorized_users (email)
values
  (current_setting('test.email_a')),
  (current_setting('test.email_b'))
on conflict (email) do nothing;

insert into public.faturas (
  id,
  user_id,
  mes_referencia,
  valor_total,
  quantidade_lancamentos,
  data_importacao
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    current_setting('test.user_a')::uuid,
    'Teste RLS A',
    100,
    1,
    now()
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    current_setting('test.user_b')::uuid,
    'Teste RLS B',
    200,
    1,
    now()
  );

insert into public.responsaveis (id, user_id, nome, cor)
values
  (
    '10000000-0000-4000-8000-000000000101',
    current_setting('test.user_a')::uuid,
    'Teste RLS A',
    null
  ),
  (
    '20000000-0000-4000-8000-000000000202',
    current_setting('test.user_b')::uuid,
    'Teste RLS B',
    null
  );

insert into public.gastos (
  id,
  user_id,
  fatura_id,
  data,
  estabelecimento,
  valor,
  categoria,
  responsavel_id,
  responsavel_nome_snapshot
)
values
  (
    '10000000-0000-4000-8000-000000000011',
    current_setting('test.user_a')::uuid,
    '10000000-0000-4000-8000-000000000001',
    current_date,
    'Teste RLS A',
    100,
    'Outros',
    '10000000-0000-4000-8000-000000000101',
    'Teste RLS A'
  ),
  (
    '20000000-0000-4000-8000-000000000022',
    current_setting('test.user_b')::uuid,
    '20000000-0000-4000-8000-000000000002',
    current_date,
    'Teste RLS B',
    200,
    'Outros',
    '20000000-0000-4000-8000-000000000202',
    'Teste RLS B'
  );

do $$
declare
  target_table text;
  rls_forced boolean;
begin
  foreach target_table in array array[
    'faturas',
    'gastos',
    'responsaveis',
    'authorized_users'
  ]
  loop
    select relforcerowsecurity
    into rls_forced
    from pg_class
    where oid = format('public.%I', target_table)::regclass;

    if not rls_forced then
      raise exception 'FORCE RLS is not enabled on public.%', target_table;
    end if;

    if has_table_privilege('anon', format('public.%I', target_table), 'SELECT')
      or has_table_privilege('anon', format('public.%I', target_table), 'INSERT')
      or has_table_privilege('anon', format('public.%I', target_table), 'UPDATE')
      or has_table_privilege('anon', format('public.%I', target_table), 'DELETE') then
      raise exception 'anon still has privileges on public.%', target_table;
    end if;
  end loop;

  if has_function_privilege(
    'anon',
    'public.delete_fatura_atomically(uuid)',
    'EXECUTE'
  ) then
    raise exception 'anon can execute delete_fatura_atomically';
  end if;

  if has_function_privilege(
    'anon',
    'public.import_fatura_atomically(text,numeric,timestamptz,text,jsonb,text,text)',
    'EXECUTE'
  ) then
    raise exception 'anon can execute import_fatura_atomically';
  end if;

  if to_regclass('public.parcelamentos') is not null then
    select relforcerowsecurity
    into rls_forced
    from pg_class
    where oid = 'public.parcelamentos'::regclass;

    if not rls_forced then
      raise exception 'FORCE RLS is not enabled on public.parcelamentos';
    end if;

    if has_table_privilege('anon', 'public.parcelamentos', 'SELECT')
      or has_table_privilege('anon', 'public.parcelamentos', 'INSERT')
      or has_table_privilege('anon', 'public.parcelamentos', 'UPDATE')
      or has_table_privilege('anon', 'public.parcelamentos', 'DELETE') then
      raise exception 'anon still has privileges on public.parcelamentos';
    end if;
  end if;
end
$$;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', current_setting('test.user_a'),
    'email', current_setting('test.email_a'),
    'role', 'authenticated'
  )::text,
  true
);

do $$
declare
  visible_count bigint;
  affected_count bigint;
begin
  select count(*) into visible_count
  from public.faturas
  where id in (
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002'
  );
  if visible_count <> 1 then
    raise exception 'RLS SELECT failed for faturas: expected 1, got %', visible_count;
  end if;

  select count(*) into visible_count
  from public.gastos
  where id in (
    '10000000-0000-4000-8000-000000000011',
    '20000000-0000-4000-8000-000000000022'
  );
  if visible_count <> 1 then
    raise exception 'RLS SELECT failed for gastos: expected 1, got %', visible_count;
  end if;

  select count(*) into visible_count
  from public.responsaveis
  where id in (
    '10000000-0000-4000-8000-000000000101',
    '20000000-0000-4000-8000-000000000202'
  );
  if visible_count <> 1 then
    raise exception 'RLS SELECT failed for responsaveis: expected 1, got %', visible_count;
  end if;

  select count(*) into visible_count
  from public.authorized_users
  where email in (
    current_setting('test.email_a'),
    current_setting('test.email_b')
  );
  if visible_count <> 1 then
    raise exception 'authorized_users leaked another email';
  end if;

  update public.faturas
  set mes_referencia = 'Ataque bloqueado'
  where id = '20000000-0000-4000-8000-000000000002';
  get diagnostics affected_count = row_count;
  if affected_count <> 0 then
    raise exception 'Cross-user UPDATE was allowed';
  end if;

  delete from public.gastos
  where id = '20000000-0000-4000-8000-000000000022';
  get diagnostics affected_count = row_count;
  if affected_count <> 0 then
    raise exception 'Cross-user DELETE was allowed';
  end if;
end
$$;

do $$
begin
  begin
    insert into public.responsaveis (user_id, nome)
    values (current_setting('test.user_b')::uuid, 'Ataque RLS');
    raise exception 'Cross-user INSERT was allowed';
  exception
    when insufficient_privilege or check_violation then
      null;
  end;

  begin
    insert into public.gastos (
      user_id,
      fatura_id,
      data,
      estabelecimento,
      valor,
      categoria,
      responsavel_id,
      responsavel_nome_snapshot
    )
    values (
      current_setting('test.user_a')::uuid,
      '20000000-0000-4000-8000-000000000002',
      current_date,
      'Ataque por fatura cruzada',
      1,
      'Outros',
      '10000000-0000-4000-8000-000000000101',
      'Teste RLS A'
    );
    raise exception 'Cross-owner invoice link was allowed';
  exception
    when insufficient_privilege or check_violation or foreign_key_violation then
      null;
  end;
end
$$;

reset role;

do $$
declare
  unchanged_count bigint;
begin
  select count(*) into unchanged_count
  from public.faturas
  where id = '20000000-0000-4000-8000-000000000002'
    and mes_referencia = 'Teste RLS B';
  if unchanged_count <> 1 then
    raise exception 'User B invoice was changed by user A';
  end if;

  select count(*) into unchanged_count
  from public.gastos
  where id = '20000000-0000-4000-8000-000000000022';
  if unchanged_count <> 1 then
    raise exception 'User B expense was deleted by user A';
  end if;
end
$$;

rollback;

select 'RLS isolation tests passed; all fixtures were rolled back.' as result;
