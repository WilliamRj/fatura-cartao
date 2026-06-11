begin;

create or replace function public.import_fatura_atomically(
  p_mes_referencia text,
  p_valor_total numeric,
  p_data_importacao timestamptz,
  p_responsavel text,
  p_lancamentos jsonb
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

  insert into public.faturas (
    user_id,
    mes_referencia,
    valor_total,
    quantidade_lancamentos,
    data_importacao
  )
  values (
    authenticated_user_id,
    p_mes_referencia,
    p_valor_total,
    jsonb_array_length(p_lancamentos),
    p_data_importacao
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
  jsonb
) from public;

grant execute on function public.import_fatura_atomically(
  text,
  numeric,
  timestamptz,
  text,
  jsonb
) to authenticated;

commit;
