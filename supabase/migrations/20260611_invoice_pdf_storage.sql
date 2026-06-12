begin;

alter table public.faturas
  add column if not exists arquivo_url text;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'faturas',
  'faturas',
  false,
  20971520,
  array['application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists faturas_pdf_select_own on storage.objects;
drop policy if exists faturas_pdf_insert_own on storage.objects;
drop policy if exists faturas_pdf_delete_own on storage.objects;

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

drop function if exists public.import_fatura_atomically(
  text,
  numeric,
  timestamptz,
  text,
  jsonb
);

drop function if exists public.import_fatura_atomically(
  text,
  numeric,
  timestamptz,
  text,
  jsonb,
  text
);

create function public.import_fatura_atomically(
  p_mes_referencia text,
  p_valor_total numeric,
  p_data_importacao timestamptz,
  p_responsavel text,
  p_lancamentos jsonb,
  p_arquivo_url text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  authenticated_user_id uuid := auth.uid();
  created_fatura public.faturas%rowtype;
begin
  if authenticated_user_id is null then
    raise exception 'Authentication is required';
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

  insert into public.faturas (
    user_id,
    mes_referencia,
    valor_total,
    quantidade_lancamentos,
    data_importacao,
    arquivo_url
  )
  values (
    authenticated_user_id,
    p_mes_referencia,
    p_valor_total,
    jsonb_array_length(p_lancamentos),
    p_data_importacao,
    p_arquivo_url
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
    responsavel
  )
  select
    authenticated_user_id,
    created_fatura.id,
    lancamento.data,
    lancamento.estabelecimento,
    lancamento.valor,
    lancamento.parcela,
    lancamento.categoria,
    p_responsavel
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
  text,
  jsonb,
  text
) from public;

grant execute on function public.import_fatura_atomically(
  text,
  numeric,
  timestamptz,
  text,
  jsonb,
  text
) to authenticated;

commit;
