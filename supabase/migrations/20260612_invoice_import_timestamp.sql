begin;

do $$
declare
  import_timestamp_type text;
begin
  select columns.data_type
  into import_timestamp_type
  from information_schema.columns
  where columns.table_schema = 'public'
    and columns.table_name = 'faturas'
    and columns.column_name = 'data_importacao';

  if import_timestamp_type is null then
    raise exception 'Required column public.faturas.data_importacao does not exist';
  end if;

  alter table public.faturas
    alter column data_importacao drop default;

  if import_timestamp_type = 'date' then
    alter table public.faturas
      alter column data_importacao type timestamptz
      using (
        data_importacao::timestamp
        at time zone 'America/Sao_Paulo'
      );
  elsif import_timestamp_type = 'timestamp without time zone' then
    alter table public.faturas
      alter column data_importacao type timestamptz
      using data_importacao at time zone 'UTC';
  elsif import_timestamp_type <> 'timestamp with time zone' then
    raise exception
      'Unexpected type for public.faturas.data_importacao: %',
      import_timestamp_type;
  end if;
end
$$;

update public.faturas
set data_importacao = now()
where data_importacao is null;

alter table public.faturas
  alter column data_importacao set default now(),
  alter column data_importacao set not null;

commit;
