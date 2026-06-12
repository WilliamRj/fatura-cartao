-- Executes get_my_access_state() as an authenticated user and rolls back all
-- changes. Replace target_email before running in Supabase SQL Editor.

begin;

create temporary table access_diagnosis_result (
  status text not null,
  sqlstate text,
  message text,
  detail text,
  hint text
) on commit drop;

grant insert, select on access_diagnosis_result to authenticated;

do $$
declare
  target_email constant text := 'SUBSTITUA_PELO_EMAIL_DO_LOGIN';
  target_user auth.users%rowtype;
  returned_rows integer;
  error_state text;
  error_message text;
  error_detail text;
  error_hint text;
begin
  if target_email = 'SUBSTITUA_PELO_EMAIL_DO_LOGIN' then
    raise exception 'Replace target_email before running this script';
  end if;

  select *
  into target_user
  from auth.users
  where lower(email) = lower(target_email);

  if target_user.id is null then
    raise exception 'No auth.users record found for %', target_email;
  end if;

  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', target_user.id,
      'email', target_user.email,
      'role', 'authenticated',
      'user_metadata', coalesce(target_user.raw_user_meta_data, '{}'::jsonb)
    )::text,
    true
  );
  perform set_config('role', 'authenticated', true);

  begin
    perform * from public.get_my_access_state();
    get diagnostics returned_rows = row_count;

    insert into access_diagnosis_result (
      status,
      message,
      detail
    )
    values (
      'OK',
      'get_my_access_state executada com sucesso',
      format('%s linha(s) retornada(s)', returned_rows)
    );
  exception
    when others then
      get stacked diagnostics
        error_state = returned_sqlstate,
        error_message = message_text,
        error_detail = pg_exception_detail,
        error_hint = pg_exception_hint;

      insert into access_diagnosis_result (
        status,
        sqlstate,
        message,
        detail,
        hint
      )
      values (
        'ERRO',
        error_state,
        error_message,
        error_detail,
        error_hint
      );
  end;
end
$$;

reset role;

select
  status,
  sqlstate,
  message,
  detail,
  hint
from access_diagnosis_result;

rollback;
