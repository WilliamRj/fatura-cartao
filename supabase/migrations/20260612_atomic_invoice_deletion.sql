begin;

do $$
declare
  foreign_key record;
begin
  if to_regclass('public.gastos') is null then
    raise exception 'Required table public.gastos does not exist';
  end if;

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

  alter table public.gastos
    add constraint gastos_fatura_id_fkey
    foreign key (fatura_id)
    references public.faturas(id)
    on delete cascade;

  if to_regclass('public.parcelamentos') is not null
    and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'parcelamentos'
        and column_name = 'fatura_id'
    ) then
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

    execute '
      alter table public.parcelamentos
        add constraint parcelamentos_fatura_id_fkey
        foreign key (fatura_id)
        references public.faturas(id)
        on delete cascade
    ';
  end if;
end
$$;

create or replace function public.delete_fatura_atomically(
  p_fatura_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  authenticated_user_id uuid := auth.uid();
  invoice_pdf_path text;
  deleted_expenses_count bigint;
  deleted_installments_count bigint := 0;
begin
  if authenticated_user_id is null then
    raise exception 'Authentication is required';
  end if;

  select faturas.arquivo_url
  into invoice_pdf_path
  from public.faturas
  where faturas.id = p_fatura_id
    and faturas.user_id = authenticated_user_id
  for update;

  if not found then
    raise exception 'Invoice not found'
      using errcode = 'P0002';
  end if;

  select count(*)
  into deleted_expenses_count
  from public.gastos
  where gastos.fatura_id = p_fatura_id
    and gastos.user_id = authenticated_user_id;

  if to_regclass('public.parcelamentos') is not null
    and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'parcelamentos'
        and column_name = 'fatura_id'
    ) then
    execute
      'select count(*) from public.parcelamentos where fatura_id = $1'
      into deleted_installments_count
      using p_fatura_id;
  end if;

  delete from public.faturas
  where faturas.id = p_fatura_id
    and faturas.user_id = authenticated_user_id;

  return jsonb_build_object(
    'arquivo_url', invoice_pdf_path,
    'gastos_removidos', deleted_expenses_count,
    'parcelamentos_removidos', deleted_installments_count
  );
end;
$$;

revoke all on function public.delete_fatura_atomically(uuid) from public;
grant execute on function public.delete_fatura_atomically(uuid) to authenticated;

commit;
